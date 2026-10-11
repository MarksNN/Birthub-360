import type { prisma } from '../../../lib/prisma.js';
import type { getTenantPrisma } from '../../../lib/tenant-prisma.js';

export type SalesOrchestrationDb = typeof prisma | ReturnType<typeof getTenantPrisma>;

/**
 * P0 #693 — API de orquestração honesta.
 *
 * Regras:
 * - Nada de seed/template quando o banco está vazio: listas vazias + `meta.source: 'none'`.
 * - Nenhuma métrica fabricada: o que não tem cálculo real vem `null` e é listado em
 *   `meta.unavailableMetrics` para a UI mostrar "indisponível" (nunca 0 falso).
 * - Toda query filtra por `organizationId` (multi-tenant).
 */

export type PlaybookInsightStatusValue = 'SUGGESTED' | 'BROADCAST' | 'DISMISSED';
export type PlaybookStatusLabel = 'Ativo' | 'Em Revisão' | 'Rascunho' | 'Descartado';

export interface SalesOrchestrationPlaybookDto {
  id: string;
  title: string;
  description: string;
  /** PlaybookInsight.segment (real). */
  segment: string;
  /** PlaybookInsight.evidenceCount (real). */
  evidenceCount: number;
  /** Status bruto do PlaybookInsight. */
  insightStatus: PlaybookInsightStatusValue;
  /** Rótulo pt-BR derivado 1:1 do status real (BROADCAST→Ativo, SUGGESTED→Em Revisão, DISMISSED→Descartado). */
  status: PlaybookStatusLabel;
  /** ISO 8601 de PlaybookInsight.updatedAt. */
  updatedAt: string;
  /** dd/mm/aaaa (America/Sao_Paulo) de PlaybookInsight.updatedAt. */
  lastUpdated: string;
  /** Sem fonte real hoje — sempre null (antes era derivado do índice). */
  category: null;
  /** Sem fonte real hoje — sempre null. */
  targetRole: null;
  /** Sem fonte real hoje — sempre null. */
  stagesCount: null;
  /** Sem cálculo real de aderência — sempre null (antes 88 + idx % 10). */
  complianceRate: null;
}

export type SalesOrchestrationSource = 'real' | 'none';

export interface SalesOrchestrationMeta {
  source: SalesOrchestrationSource;
  /** Chaves de métricas sem cálculo real (vêm null no payload). */
  unavailableMetrics: string[];
  /** Seções que ainda não têm fonte real e por isso vêm vazias. */
  emptySections: Array<'jornadas' | 'processos' | 'roteiros'>;
}

export interface SalesOrchestrationOverviewDto {
  kpis: {
    playbooksAtivos: number;
    aderenciaPlaybook: number | null;
    speedToLeadMin: number | null;
    cadenciasAtivas: number;
  };
  playbooks: SalesOrchestrationPlaybookDto[];
  /** Sem modelo real ainda — sempre []. */
  jornadas: never[];
  /** Sem modelo real ainda — sempre []. */
  processos: never[];
  /** Sem modelo real ainda — sempre []. */
  roteiros: never[];
  meta: SalesOrchestrationMeta;
}

export const UNAVAILABLE_METRICS = [
  'kpis.aderenciaPlaybook',
  'kpis.speedToLeadMin',
  'playbooks.complianceRate',
  'playbooks.stagesCount',
  'playbooks.category',
  'playbooks.targetRole',
] as const;

const STATUS_LABEL: Record<PlaybookInsightStatusValue, PlaybookStatusLabel> = {
  BROADCAST: 'Ativo',
  SUGGESTED: 'Em Revisão',
  DISMISSED: 'Descartado',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export class SalesOrchestrationService {
  constructor(
    private readonly db: SalesOrchestrationDb,
    private readonly organizationId: string,
  ) {}

  private get client(): typeof prisma {
    return this.db as typeof prisma;
  }

  async getOverview(): Promise<SalesOrchestrationOverviewDto> {
    const organizationId = this.organizationId;

    const [playbookInsights, playbooksAtivos, cadenciasAtivas] = await Promise.all([
      // Playbooks reais (insights gerados a partir de evidências reais).
      this.client.playbookInsight.findMany({
        where: { organizationId },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          patternTitle: true,
          patternDescription: true,
          segment: true,
          status: true,
          evidenceCount: true,
          updatedAt: true,
        },
      }),
      // Playbooks "ativos" = anunciados ao time (BROADCAST).
      this.client.playbookInsight.count({
        where: { organizationId, status: 'BROADCAST' },
      }),
      // Cadências ativas reais — sem fallback.
      this.client.cadenceSequence.count({
        where: { organizationId, active: true, deletedAt: null },
      }),
    ]);

    const playbooks: SalesOrchestrationPlaybookDto[] = playbookInsights.map((p) => {
      const updatedAt = new Date(p.updatedAt);
      const insightStatus = p.status as PlaybookInsightStatusValue;
      return {
        id: p.id,
        title: p.patternTitle,
        description: p.patternDescription ?? '',
        segment: p.segment,
        evidenceCount: p.evidenceCount,
        insightStatus,
        status: STATUS_LABEL[insightStatus] ?? 'Em Revisão',
        updatedAt: updatedAt.toISOString(),
        lastUpdated: dateFormatter.format(updatedAt),
        category: null,
        targetRole: null,
        stagesCount: null,
        complianceRate: null,
      };
    });

    const hasRealData = playbooks.length > 0 || cadenciasAtivas > 0;

    return {
      kpis: {
        playbooksAtivos,
        aderenciaPlaybook: null,
        speedToLeadMin: null,
        cadenciasAtivas,
      },
      playbooks,
      jornadas: [],
      processos: [],
      roteiros: [],
      meta: {
        source: hasRealData ? 'real' : 'none',
        unavailableMetrics: [...UNAVAILABLE_METRICS],
        emptySections: ['jornadas', 'processos', 'roteiros'],
      },
    };
  }
}
