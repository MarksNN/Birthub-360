import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { notificationService } from '@/features/notifications/notification.service';

const notif = prisma.notification as unknown as Record<string, ReturnType<typeof vi.fn>>;
const ORG = 'org-1';
const USER = 'user-1';
const USER_B = 'user-2';

beforeEach(() => {
  vi.clearAllMocks();
  notificationService.clearBroadcastReadsCache();
});

describe('NotificationService.create', () => {
  it('aplica os padrões: kind Info e destinatário para toda a organização', async () => {
    notif.create.mockResolvedValue({ id: 'n1' });
    await notificationService.create({ organizationId: ORG, title: 'Olá' });

    const { data } = notif.create.mock.calls[0][0];
    expect(data.kind).toBe('Info');
    expect(data.userId).toBeNull();
    expect(data.body).toBeNull();
  });

  it('NUNCA lança: notificação é efeito colateral e não pode derrubar a ação que a originou', async () => {
    notif.create.mockRejectedValue(new Error('tabela ainda não migrada'));

    await expect(
      notificationService.create({ organizationId: ORG, title: 'x' }),
    ).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('NotificationService.list', () => {
  it('traz as do usuário e as endereçadas à organização inteira', async () => {
    notif.findMany.mockResolvedValue([]);
    await notificationService.list(ORG, USER);

    const { where } = notif.findMany.mock.calls[0][0];
    expect(where.organizationId).toBe(ORG);
    expect(where.OR).toEqual([{ userId: USER }, { userId: null }]);
    // Sem filtro de leitura quando não se pede só as não lidas.
    expect(where.readAt).toBeUndefined();
  });

  it('filtra por não lidas quando pedido', async () => {
    notif.findMany.mockResolvedValue([]);
    await notificationService.list(ORG, USER, true);
    expect(notif.findMany.mock.calls[0][0].where.readAt).toBeNull();
  });

  it('limita o tamanho da lista — o sino não pagina', async () => {
    notif.findMany.mockResolvedValue([]);
    await notificationService.list(ORG, USER);
    expect(notif.findMany.mock.calls[0][0].take).toBe(50);
  });
});

describe('NotificationService.markRead', () => {
  it('devolve false quando o id não é do tenant, sem alterar nada', async () => {
    notif.updateMany.mockResolvedValue({ count: 0 });
    notif.findMany.mockResolvedValue([]);
    expect(await notificationService.markRead(ORG, 'de-outro-tenant', USER)).toBe(false);
  });

  it('escopa a atualização direta por organização e só altera no banco notificações pessoais do próprio usuário', async () => {
    notif.updateMany.mockResolvedValue({ count: 1 });
    expect(await notificationService.markRead(ORG, 'n1', USER)).toBe(true);

    const { where } = notif.updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: 'n1', organizationId: ORG, readAt: null, userId: USER });
  });

  it('DEBT-NOT-001: quando Usuário A lê uma notificação broadcast (userId: null), Usuário B continua vendo-a como não lida até lê-la', async () => {
    const broadcastItem = {
      id: 'bcast-1',
      title: 'Alerta de Equipe',
      body: 'Importação concluída',
      kind: 'Info',
      entity: null,
      entityId: null,
      userId: null,
      readAt: null,
      createdAt: new Date('2026-10-15T10:00:00Z'),
      automation: null,
    };

    // updateMany pessoal retorna 0 (é broadcast), findMany confirma que broadcast existe no tenant
    notif.updateMany.mockResolvedValue({ count: 0 });
    notif.findMany.mockResolvedValueOnce([{ id: 'bcast-1' }]);

    expect(await notificationService.markRead(ORG, 'bcast-1', USER)).toBe(true);

    // Listagem onlyUnread para Usuário A -> vazia (já leu)
    notif.findMany.mockResolvedValueOnce([broadcastItem]);
    const unreadForA = await notificationService.list(ORG, USER, true);
    expect(unreadForA).toHaveLength(0);

    // Listagem onlyUnread para Usuário B -> continua contendo o broadcast não lido!
    notif.findMany.mockResolvedValueOnce([broadcastItem]);
    const unreadForB = await notificationService.list(ORG, USER_B, true);
    expect(unreadForB).toHaveLength(1);
    expect(unreadForB[0]?.id).toBe('bcast-1');
    expect(unreadForB[0]?.readAt).toBeNull();
  });

  it('markAllRead devolve quantas foram marcadas (pessoais + broadcasts não lidos pelo usuário)', async () => {
    notif.updateMany.mockResolvedValue({ count: 3 });
    notif.findMany.mockResolvedValue([{ id: 'bcast-2' }]);
    expect(await notificationService.markAllRead(ORG, USER)).toBe(4);
  });
});

describe('NotificationService.remove', () => {
  it('não apaga notificação de outro tenant', async () => {
    notif.deleteMany.mockResolvedValue({ count: 0 });
    expect(await notificationService.remove(ORG, 'alheia', USER, false)).toBe(false);
    expect(notif.deleteMany.mock.calls[0][0].where).toMatchObject({ organizationId: ORG });
  });

  it('não apaga notificação pessoal de outro usuário da mesma organização', async () => {
    notif.deleteMany.mockResolvedValue({ count: 0 });
    expect(await notificationService.remove(ORG, 'n-de-outro-usuario', USER, false)).toBe(false);
    expect(notif.deleteMany.mock.calls[0][0].where.OR).toEqual([{ userId: USER }]);
  });

  // Achado real do Piloto 021: userId: null = "para toda a organização", mas sem tabela de
  // leitura por-destinatário, tratar broadcast como "todo mundo é dono" deixava qualquer usuário
  // apagar um alerta de equipe antes dos outros verem.
  it('sem canManageBroadcast, o OR nunca inclui userId:null — não alcança notificação da organização inteira', async () => {
    notif.deleteMany.mockResolvedValue({ count: 0 });
    await notificationService.remove(ORG, 'broadcast-1', USER, false);
    expect(notif.deleteMany.mock.calls[0][0].where.OR).toEqual([{ userId: USER }]);
  });

  it('com canManageBroadcast (ADMIN/GESTOR), o OR inclui userId:null — pode apagar notificação da organização inteira', async () => {
    notif.deleteMany.mockResolvedValue({ count: 1 });
    expect(await notificationService.remove(ORG, 'broadcast-1', USER, true)).toBe(true);
    expect(notif.deleteMany.mock.calls[0][0].where.OR).toEqual([
      { userId: USER },
      { userId: null },
    ]);
  });
});
