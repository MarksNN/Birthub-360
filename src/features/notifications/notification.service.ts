import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import type { NotificationKind } from '../../shared/contracts/notification.contract.js';

export type { NotificationKind };

export interface CreateNotificationInput {
  organizationId: string;
  title: string;
  body?: string | null;
  kind?: NotificationKind;
  entity?: string | null;
  entityId?: string | null;
  /** `null`/ausente entrega para toda a organização. */
  userId?: string | null;
  automationId?: string | null;
}

/** Teto de itens devolvidos numa listagem — o sino não pagina. */
const LIST_LIMIT = 50;
const BROADCAST_READS_SETTING_KEY = 'notifications.broadcastReads';

export class NotificationService {
  private readonly broadcastReadsCache = new Map<string, Map<string, Date>>();

  private cacheKey(organizationId: string, userId: string): string {
    return `${organizationId}:${userId}`;
  }

  private async loadBroadcastReads(
    organizationId: string,
    userId: string,
  ): Promise<Map<string, Date>> {
    const key = this.cacheKey(organizationId, userId);
    const cached = this.broadcastReadsCache.get(key) ?? new Map<string, Date>();

    const settingDelegate = (prisma as unknown as { setting?: Record<string, any> }).setting;
    if (typeof settingDelegate?.findFirst === 'function') {
      try {
        const row = await settingDelegate.findFirst({
          where: { organizationId, userId, key: BROADCAST_READS_SETTING_KEY },
          select: { value: true },
        });
        if (row?.value && typeof row.value === 'object' && !Array.isArray(row.value)) {
          for (const [notifId, isoDate] of Object.entries(row.value as Record<string, unknown>)) {
            if (typeof isoDate === 'string') {
              const parsed = new Date(isoDate);
              if (!Number.isNaN(parsed.getTime())) {
                cached.set(notifId, parsed);
              }
            }
          }
        }
      } catch {
        // Fallback em memória quando Setting não estiver acessível no contexto de teste
      }
    }

    this.broadcastReadsCache.set(key, cached);
    return cached;
  }

  private async saveBroadcastReads(
    organizationId: string,
    userId: string,
    notificationIds: string[],
    readAt: Date,
  ): Promise<number> {
    if (notificationIds.length === 0) return 0;
    const map = await this.loadBroadcastReads(organizationId, userId);
    let newlyMarked = 0;
    for (const id of notificationIds) {
      if (!map.has(id)) {
        map.set(id, readAt);
        newlyMarked++;
      }
    }
    this.broadcastReadsCache.set(this.cacheKey(organizationId, userId), map);

    const settingDelegate = (prisma as unknown as { setting?: Record<string, any> }).setting;
    if (newlyMarked > 0 && typeof settingDelegate?.findFirst === 'function') {
      try {
        const serialized: Record<string, string> = {};
        for (const [k, v] of map.entries()) {
          serialized[k] = v.toISOString();
        }
        const existing = await settingDelegate.findFirst({
          where: { organizationId, userId, key: BROADCAST_READS_SETTING_KEY },
          select: { id: true },
        });
        if (existing?.id && typeof settingDelegate.update === 'function') {
          await settingDelegate.update({
            where: { id: existing.id },
            data: { value: serialized },
          });
        } else if (typeof settingDelegate.create === 'function') {
          await settingDelegate.create({
            data: {
              organizationId,
              userId,
              key: BROADCAST_READS_SETTING_KEY,
              value: serialized,
            },
          });
        }
      } catch {
        // Mantém estado em memória caso a persistência auxiliar falhe
      }
    }

    return newlyMarked;
  }

  /** Limpa o cache em memória de leituras broadcast (útil em testes). */
  clearBroadcastReadsCache(): void {
    this.broadcastReadsCache.clear();
  }

  /**
   * Cria uma notificação.
   *
   * Nunca lança: notificação é efeito colateral. Se a criação falhar (banco fora, tabela ainda
   * não migrada), quem disparou a ação principal — salvar um lead, concluir uma atividade — não
   * pode receber um erro por causa disso.
   */
  async create(input: CreateNotificationInput): Promise<{ id: string } | null> {
    try {
      return await prisma.notification.create({
        data: {
          organizationId: input.organizationId,
          title: input.title,
          body: input.body ?? null,
          kind: input.kind ?? 'Info',
          entity: input.entity ?? null,
          entityId: input.entityId ?? null,
          userId: input.userId ?? null,
          automationId: input.automationId ?? null,
        },
        select: { id: true },
      });
    } catch (err: any) {
      logger.error({ err, title: input.title }, 'Falha ao criar notificação');
      return null;
    }
  }

  /**
   * Lista as notificações visíveis para o usuário: as dele e as endereçadas à organização
   * inteira (`userId` nulo). Para broadcasts (`userId: null`), o estado `readAt` é resolvido
   * individualmente por usuário (DEBT-NOT-001).
   */
  async list(organizationId: string, userId: string, onlyUnread = false) {
    const [rows, broadcastReads] = await Promise.all([
      prisma.notification.findMany({
        where: {
          organizationId,
          OR: [{ userId }, { userId: null }],
          ...(onlyUnread ? { readAt: null } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
        select: {
          id: true,
          title: true,
          body: true,
          kind: true,
          entity: true,
          entityId: true,
          // `userId: null` = broadcast pra organização inteira — a UI precisa saber disso pra só
          // oferecer excluir a quem tem permissão (achado do Piloto 021, ver `remove` abaixo).
          userId: true,
          readAt: true,
          createdAt: true,
          automation: { select: { id: true, name: true } },
        },
      }),
      this.loadBroadcastReads(organizationId, userId),
    ]);

    if (!Array.isArray(rows)) return [];

    const hydrated = rows.map((row) => {
      if (row.userId === null && row.readAt === null) {
        const userReadAt = broadcastReads.get(row.id) ?? null;
        if (userReadAt) {
          return { ...row, readAt: userReadAt };
        }
      }
      return row;
    });

    return onlyUnread ? hydrated.filter((row) => row.readAt === null) : hydrated;
  }

  async unreadCount(organizationId: string, userId: string): Promise<number> {
    const broadcastReads = await this.loadBroadcastReads(organizationId, userId);
    const readBroadcastIds = [...broadcastReads.keys()];
    return prisma.notification.count({
      where: {
        organizationId,
        readAt: null,
        ...(readBroadcastIds.length > 0 ? { id: { notIn: readBroadcastIds } } : {}),
        OR: [{ userId }, { userId: null }],
      },
    });
  }

  /**
   * Marca uma notificação como lida para o usuário solicitante.
   * - Notificações pessoais (`userId === userId`) têm `readAt` atualizado no registro.
   * - Notificações broadcast (`userId === null`) têm a leitura registrada por usuário sem
   *   modificar `Notification.readAt` globalmente, preservando o estado unread para colegas
   *   da mesma organização (DEBT-NOT-001).
   */
  async markRead(organizationId: string, id: string, userId: string): Promise<boolean> {
    const now = new Date();
    const { count } = await prisma.notification.updateMany({
      where: { id, organizationId, readAt: null, userId },
      data: { readAt: now },
    });
    if (count > 0) {
      return true;
    }

    // Verifica se o ID corresponde a um broadcast válido desta organização
    const notifDelegate = prisma.notification as unknown as Record<string, any>;
    let isBroadcast = false;
    if (typeof notifDelegate.findFirst === 'function') {
      const broadcastRow = await notifDelegate.findFirst({
        where: { id, organizationId, userId: null },
        select: { id: true },
      });
      isBroadcast = Boolean(broadcastRow);
    } else if (typeof notifDelegate.findMany === 'function') {
      const broadcastRows = await notifDelegate.findMany({
        where: { id, organizationId, userId: null },
        select: { id: true },
        take: 1,
      });
      isBroadcast = Array.isArray(broadcastRows) && broadcastRows.length > 0;
    }

    if (!isBroadcast) {
      return false;
    }

    const newlyMarked = await this.saveBroadcastReads(organizationId, userId, [id], now);
    return newlyMarked > 0;
  }

  async markAllRead(organizationId: string, userId: string): Promise<number> {
    const now = new Date();
    const { count: personalCount } = await prisma.notification.updateMany({
      where: { organizationId, readAt: null, userId },
      data: { readAt: now },
    });

    let broadcastCount = 0;
    const notifDelegate = prisma.notification as unknown as Record<string, any>;
    if (typeof notifDelegate.findMany === 'function') {
      const unreadBroadcasts = await notifDelegate.findMany({
        where: { organizationId, userId: null, readAt: null },
        select: { id: true },
      });
      if (Array.isArray(unreadBroadcasts) && unreadBroadcasts.length > 0) {
        const ids = unreadBroadcasts.map((b: { id: string }) => b.id);
        broadcastCount = await this.saveBroadcastReads(organizationId, userId, ids, now);
      }
    }

    return personalCount + broadcastCount;
  }

  /**
   * ACHADO REAL (Piloto 021): diferente de `markRead` (marcar como lida não destrói nada — o pior
   * caso é o dono real ver "já lida" sem ter aberto), excluir é irreversível. Como
   * `Notification.userId: null` significa "para toda a organização" e não existe tabela de leitura
   * por-destinatário, tratar broadcast como "todo mundo é dono" aqui significava que qualquer
   * usuário conseguia apagar um alerta de equipe (ex.: bloqueio de importação Bitrix, alerta
   * crítico de IA) antes dos outros verem — a própria notificação criada para avisar todo mundo
   * podia ser silenciada por qualquer um deles com um clique. `canManageBroadcast` (ADMIN/GESTOR)
   * é quem pode excluir uma notificação da organização inteira; notificação pessoal continua sendo
   * removível só pelo próprio dono, qualquer papel.
   */
  async remove(
    organizationId: string,
    id: string,
    userId: string,
    canManageBroadcast: boolean,
  ): Promise<boolean> {
    const { count } = await prisma.notification.deleteMany({
      where: {
        id,
        organizationId,
        OR: canManageBroadcast ? [{ userId }, { userId: null }] : [{ userId }],
      },
    });
    return count > 0;
  }
}

export const notificationService = new NotificationService();
