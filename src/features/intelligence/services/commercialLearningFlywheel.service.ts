import { randomUUID } from 'node:crypto';
import { logger } from '../../../lib/logger.js';
import type { FewShotCopyItem } from '../../../shared/contracts/dataFlywheel.contract.js';

/**
 * REMED-06 / Ajuste 1 — expurgo durável do Flywheel ao revogar consentimento.
 * Delegates estruturais dos models `FlywheelApproachRecord` e `FlywheelFewShotExample`
 * (ainda inexistentes no schema — handoff ao Agente 01). Exclusão física (deleteMany),
 * nunca soft-delete: o texto da abordagem é dado pessoal derivado do titular.
 */
export interface FlywheelPersistencePurger {
  $transaction<T>(fn: (tx: FlywheelPurgeTx) => Promise<T>): Promise<T>;
}
export interface FlywheelPurgeTx {
  /** Opcional: seta app.current_tenant_id (RLS tenant_isolation do PR #35) na transação. */
  $executeRaw?(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
  flywheelFewShotExample: {
    deleteMany(args: {
      where: { organizationId: string; leadId: string };
    }): Promise<{ count: number }>;
    create(args: { data: FlywheelFewShotRow }): Promise<unknown>;
    findMany(args: {
      where: { organizationId: string; channel: string; isActive: boolean };
    }): Promise<FlywheelFewShotRow[]>;
  };
  flywheelApproachRecord: {
    deleteMany(args: {
      where: { organizationId: string; leadId: string };
    }): Promise<{ count: number }>;
    create(args: { data: FlywheelApproachRow }): Promise<unknown>;
    findMany(args: {
      where: { organizationId: string; leadId: string };
      orderBy: { sentAt: 'desc' };
      take: number;
    }): Promise<FlywheelApproachRow[]>;
  };
}

/** Linha de FlywheelApproachRecord usada pelo serviço (colunas de gestão ficam com defaults). */
export interface FlywheelApproachRow {
  id: string;
  organizationId: string;
  leadId: string;
  agentSlug: string | null;
  channel: string;
  segment: string;
  approachText: string;
  sentAt: Date;
}

/** Linha de FlywheelFewShotExample usada pelo serviço. */
export interface FlywheelFewShotRow {
  id: string;
  organizationId: string;
  leadId: string;
  dealId: string | null;
  agentSlug: string | null;
  channel: string;
  segment: string;
  approachText: string;
  outcomeStatus: string;
  attributionEvidence: unknown;
  confidence: number;
  isActive: boolean;
  promotedAt: Date;
}

export interface FlywheelPurgeResult {
  approachesPurged: number;
  fewShotPurged: number;
  persistedApproachesPurged: number;
  persistedFewShotPurged: number;
}

export interface ApproachRecord {
  id: string;
  organizationId: string;
  leadId: string;
  agentSlug?: string;
  channel: 'LINKEDIN' | 'WHATSAPP' | 'EMAIL';
  segment: string;
  approachText: string;
  sentAt: string;
}

export class CommercialLearningFlywheelService {
  private approaches: Map<string, ApproachRecord> = new Map();
  private curatedFewShotLibrary: Map<string, FewShotCopyItem> = new Map();
  private static ATTRIBUTION_WINDOW_DAYS = 30;

  constructor(private persistence?: FlywheelPersistencePurger) {}

  /** Wiring de produção: liga o expurgo durável quando os models do Agente 01 existirem. */
  private runTx?: <T>(
    fn: (tx: never) => Promise<T>,
    opts: { organizationId: string },
  ) => Promise<T>;

  setPersistence(
    persistence: FlywheelPersistencePurger | undefined,
    runTx?: <T>(fn: (tx: never) => Promise<T>, opts: { organizationId: string }) => Promise<T>,
  ): void {
    this.persistence = persistence;
    this.runTx = runTx;
  }

  /**
   * Executa `body` numa transação com o tenant da sessão setado (RLS tenant_isolation), na
   * mesma conexão do set_config (#40). Falhas propagam: persistência não falha em silêncio.
   */
  private async withTenantTx<T>(
    organizationId: string,
    body: (tx: FlywheelPurgeTx) => Promise<T>,
  ): Promise<T> {
    const run = async (tx: FlywheelPurgeTx) => {
      if (tx.$executeRaw) {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${organizationId}, TRUE)`;
      }
      return body(tx);
    };
    if (this.runTx) {
      return this.runTx(run as (tx: never) => Promise<T>, { organizationId });
    }
    return (this.persistence as FlywheelPersistencePurger).$transaction(run);
  }

  /**
   * Retração com expurgo real (Ajuste 1): remove abordagens e exemplos few-shot do titular
   * na memória e, se houver persistência configurada, no PostgreSQL (mesma transação).
   */
  /** leadIds com estado em memória no tenant (para casamento por pseudônimo no pub/sub). */
  localSubjectRefs(organizationId: string): string[] {
    const out = new Set<string>();
    for (const a of this.approaches.values()) {
      if (a.organizationId === organizationId && a.leadId) out.add(a.leadId);
    }
    for (const f of this.curatedFewShotLibrary.values()) {
      const l = f.attributionEvidence?.leadId;
      if (f.organizationId === organizationId && l) out.add(l);
    }
    return [...out];
  }

  async purgeSubject(organizationId: string, leadId: string): Promise<FlywheelPurgeResult> {
    if (!organizationId || !leadId) {
      throw new Error('Tenancy violation: purgeSubject exige organizationId e leadId');
    }
    let persistedApproachesPurged = 0;
    let persistedFewShotPurged = 0;
    if (this.persistence) {
      const where = { organizationId, leadId };
      const body = async (tx: FlywheelPurgeTx) => {
        if (tx.$executeRaw) {
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${organizationId}, TRUE)`;
        }
        const fs = await tx.flywheelFewShotExample.deleteMany({ where });
        const ap = await tx.flywheelApproachRecord.deleteMany({ where });
        return { fs: fs.count, ap: ap.count };
      };
      // #40: runInTransaction mantém set_config e deleteMany na MESMA conexão do client estendido.
      const res = this.runTx
        ? await this.runTx(body as (tx: never) => Promise<{ fs: number; ap: number }>, {
            organizationId,
          })
        : await this.persistence.$transaction(body);
      persistedApproachesPurged = res.ap;
      persistedFewShotPurged = res.fs;
    }

    let approachesPurged = 0;
    for (const [id, a] of this.approaches) {
      if (a.organizationId === organizationId && a.leadId === leadId) {
        this.approaches.delete(id);
        approachesPurged++;
      }
    }
    let fewShotPurged = 0;
    for (const [id, f] of this.curatedFewShotLibrary) {
      if (f.organizationId === organizationId && f.attributionEvidence?.leadId === leadId) {
        this.curatedFewShotLibrary.delete(id);
        fewShotPurged++;
      }
    }

    logger.warn(
      {
        organizationId,
        approachesPurged,
        fewShotPurged,
        persistedApproachesPurged,
        persistedFewShotPurged,
      },
      'CommercialLearningFlywheel: expurgo do titular concluído (retração Ajuste 1)',
    );
    return { approachesPurged, fewShotPurged, persistedApproachesPurged, persistedFewShotPurged };
  }

  /**
   * Registra uma abordagem comercial gerada e enviada para um lead com autorização.
   * Com persistência configurada grava no PostgreSQL (sobrevive a restart/multi-instância);
   * sem ela, mantém o estado em memória.
   */
  async recordApproachSent(approach: {
    organizationId: string;
    leadId: string;
    agentSlug?: string;
    channel: 'LINKEDIN' | 'WHATSAPP' | 'EMAIL';
    segment: string;
    approachText: string;
  }): Promise<ApproachRecord> {
    if (!approach.organizationId) {
      throw new Error('Tenancy violation: organizationId é obrigatório para registrar abordagem');
    }

    const id = `appr-${randomUUID()}`;
    const record: ApproachRecord = {
      ...approach,
      id,
      sentAt: new Date().toISOString(),
    };

    if (this.persistence) {
      await this.withTenantTx(record.organizationId, (tx) =>
        tx.flywheelApproachRecord.create({
          data: {
            id,
            organizationId: record.organizationId,
            leadId: record.leadId,
            agentSlug: record.agentSlug ?? null,
            channel: record.channel,
            segment: record.segment,
            approachText: record.approachText,
            sentAt: new Date(record.sentAt),
          },
        }),
      );
    } else {
      this.approaches.set(id, record);
    }

    logger.info(
      { id, organizationId: record.organizationId, leadId: record.leadId, channel: record.channel },
      'CommercialLearningFlywheel: Abordagem registrada para acompanhamento de atribuição',
    );

    return record;
  }

  /**
   * Avalia um resultado comercial real (Reunião Agendada ou Negócio Ganho)
   * e valida a atribuição causal com a abordagem enviada.
   */
  async evaluateCommercialOutcome(outcome: {
    organizationId: string;
    leadId: string;
    dealId?: string;
    outcomeType: 'MEETING_SCHEDULED' | 'DEAL_WON';
    occurredAt?: string;
  }): Promise<FewShotCopyItem | null> {
    const outcomeDate = outcome.occurredAt ? new Date(outcome.occurredAt) : new Date();

    // Localiza a abordagem mais recente para este lead no mesmo tenant
    let matched: ApproachRecord | undefined;
    if (this.persistence) {
      const rows = await this.withTenantTx(outcome.organizationId, (tx) =>
        tx.flywheelApproachRecord.findMany({
          where: { organizationId: outcome.organizationId, leadId: outcome.leadId },
          orderBy: { sentAt: 'desc' },
          take: 1,
        }),
      );
      const row = rows[0];
      if (row) {
        matched = {
          id: row.id,
          organizationId: row.organizationId,
          leadId: row.leadId,
          agentSlug: row.agentSlug ?? undefined,
          channel: row.channel as ApproachRecord['channel'],
          segment: row.segment,
          approachText: row.approachText,
          sentAt: row.sentAt.toISOString(),
        };
      }
    } else {
      const candidateApproaches = Array.from(this.approaches.values()).filter(
        (a) => a.organizationId === outcome.organizationId && a.leadId === outcome.leadId,
      );
      // Ordena da mais recente para a mais antiga
      candidateApproaches.sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      );
      matched = candidateApproaches[0];
    }

    if (!matched) {
      logger.info(
        { leadId: outcome.leadId, organizationId: outcome.organizationId },
        'CommercialLearningFlywheel: Nenhuma abordagem prévia rastreada para atribuição',
      );
      return null;
    }

    const diffDays =
      (outcomeDate.getTime() - new Date(matched.sentAt).getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0 || diffDays > CommercialLearningFlywheelService.ATTRIBUTION_WINDOW_DAYS) {
      logger.warn(
        {
          leadId: outcome.leadId,
          diffDays,
          windowLimit: CommercialLearningFlywheelService.ATTRIBUTION_WINDOW_DAYS,
        },
        'CommercialLearningFlywheel: Resultado fora da janela de atribuição causal. Não promovido.',
      );
      return null;
    }

    // Qualificação da abordagem vencedora para a biblioteca few-shot
    const fewShotId = `fewshot-${randomUUID()}`;
    const fewShotItem: FewShotCopyItem = {
      id: fewShotId,
      organizationId: outcome.organizationId,
      channel: matched.channel,
      segment: matched.segment,
      approachText: matched.approachText,
      outcomeStatus: outcome.outcomeType,
      attributionEvidence: {
        leadId: outcome.leadId,
        dealId: outcome.dealId,
        conversionWindowDays: Math.round(diffDays),
        metrics: {
          occurredAt: outcomeDate.toISOString(),
          sentAt: matched.sentAt,
        },
      },
      confidence: outcome.outcomeType === 'DEAL_WON' ? 0.98 : 0.88,
      promotedAt: new Date().toISOString(),
      isActive: true,
    };

    if (this.persistence) {
      await this.withTenantTx(outcome.organizationId, (tx) =>
        tx.flywheelFewShotExample.create({
          data: {
            id: fewShotId,
            organizationId: fewShotItem.organizationId,
            leadId: outcome.leadId,
            dealId: outcome.dealId ?? null,
            agentSlug: matched.agentSlug ?? null,
            channel: fewShotItem.channel,
            segment: fewShotItem.segment,
            approachText: fewShotItem.approachText,
            outcomeStatus: fewShotItem.outcomeStatus,
            attributionEvidence: fewShotItem.attributionEvidence,
            confidence: fewShotItem.confidence,
            isActive: true,
            promotedAt: new Date(fewShotItem.promotedAt),
          },
        }),
      );
    } else {
      this.curatedFewShotLibrary.set(fewShotId, fewShotItem);
    }

    logger.info(
      {
        fewShotId,
        organizationId: outcome.organizationId,
        channel: fewShotItem.channel,
        outcome: fewShotItem.outcomeStatus,
        conversionDays: Math.round(diffDays),
      },
      'CommercialLearningFlywheel: Abordagem qualificada e promovida à biblioteca Few-Shot com evidência comprovada',
    );

    return fewShotItem;
  }

  /**
   * Recupera exemplos few-shot qualificados para alimentar prompts do AI Gateway.
   * Isolamento estrito por tenant e canal.
   */
  async getFewShotExamples(
    organizationId: string,
    channel: 'LINKEDIN' | 'WHATSAPP' | 'EMAIL',
    segment?: string,
    limit: number = 3,
  ): Promise<FewShotCopyItem[]> {
    let source: FewShotCopyItem[];
    if (this.persistence) {
      const rows = await this.withTenantTx(organizationId, (tx) =>
        tx.flywheelFewShotExample.findMany({
          where: { organizationId, channel, isActive: true },
        }),
      );
      source = rows.map((r) => ({
        id: r.id,
        organizationId: r.organizationId,
        channel: r.channel as FewShotCopyItem['channel'],
        segment: r.segment,
        approachText: r.approachText,
        outcomeStatus: r.outcomeStatus as FewShotCopyItem['outcomeStatus'],
        attributionEvidence: r.attributionEvidence as FewShotCopyItem['attributionEvidence'],
        confidence: r.confidence,
        promotedAt: r.promotedAt.toISOString(),
        isActive: r.isActive,
      }));
    } else {
      source = Array.from(this.curatedFewShotLibrary.values());
    }

    const list = source.filter(
      (item) =>
        item.organizationId === organizationId &&
        item.channel === channel &&
        item.isActive &&
        (!segment || item.segment.toLowerCase() === segment.toLowerCase()),
    );

    // Prioriza negociações ganhas (DEAL_WON)
    list.sort((a, b) => {
      if (a.outcomeStatus === 'DEAL_WON' && b.outcomeStatus !== 'DEAL_WON') return -1;
      if (b.outcomeStatus === 'DEAL_WON' && a.outcomeStatus !== 'DEAL_WON') return 1;
      return b.confidence - a.confidence;
    });

    return list.slice(0, limit);
  }

  clear(): void {
    this.approaches.clear();
    this.curatedFewShotLibrary.clear();
  }
}

export const commercialLearningFlywheel = new CommercialLearningFlywheelService();
