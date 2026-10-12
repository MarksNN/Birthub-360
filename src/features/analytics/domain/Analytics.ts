import type { OverviewMetrics } from '../../../shared/contracts/analytics.contract.js';

export type { OverviewMetrics };

/** Ordem real do funil comercial — usada para o gráfico e para a conversão etapa a etapa. */
export const FUNNEL_STAGES = [
  'Lead_Recebido',
  'Cadencia_Iniciada',
  'Qualificacao_SDR',
  'Reuniao_Agendada',
  'Nova_Oportunidade',
  'Proposta_Enviada',
  'Call_Visita_Agendada',
] as const;

export const WON = 'Negocios_Ganhos';
export const LOST = 'Negocios_Perdidos';
const DESQUALIFICADO = 'Lead_Desqualificado';

export const CLOSED_LOST_STATUSES = [
  LOST,
  DESQUALIFICADO,
  'Piloto_Birthub360_Profile_Cancelado',
  'Piloto_Logistico_Cancelado',
] as const;

/** Todo status que representa fechamento, ganho ou sem venda — usado para excluir do "pipeline aberto". */
export const CLOSED_STATUSES = [WON, ...CLOSED_LOST_STATUSES] as const;

export interface DistributionSlice {
  label: string;
  count: number;
}

export interface FunnelStage extends DistributionSlice {
  /** Conversão desta etapa em relação à etapa anterior, em %. `null` na primeira etapa. */
  conversionFromPrevious: number | null;
  /** Volume financeiro acumulado nesta etapa em R$ (soma de `Lead.amount`). */
  amount?: number;
  /** Conversão financeira acumulada desta etapa em relação à etapa anterior, em %. */
  conversionFromPreviousAmount?: number | null;
}

export interface MonthlyPoint {
  /** Mês no formato YYYY-MM, para o frontend formatar como preferir. */
  month: string;
  created: number;
  won: number;
  lost: number;
}

export interface PerformanceAgentRow {
  agent: string;
  isAi: boolean;
  leadsAssigned: number;
  leadsQualified: number;
  conversionRate: number;
  wonAmount?: number;
}

export interface SalesSummaryMetrics {
  totalWonDeals: number;
  totalWonRevenue: number;
  averageTicket: number | null;
  salesVelocityDays: number | null;
}

export interface AnalyticsDashboard {
  overview: OverviewMetrics;
  funnel: FunnelStage[];
  byTemperature: DistributionSlice[];
  bySource: DistributionSlice[];
  byOwner: Array<DistributionSlice & { won: number; wonAmount?: number }>;
  activitiesByType: DistributionSlice[];
  activitiesByStatus: DistributionSlice[];
  monthly: MonthlyPoint[];
  /** Tempo Médio de Qualificação (TMQ) em dias a partir de transições reais ou `null` quando não mensurado. */
  tmqMetric: number | null;
  lostReasons: DistributionSlice[];
  callHeatmap: { dayOfWeek: number; hour: number; count: number }[];
  performanceReport: PerformanceAgentRow[];
  salesSummary?: SalesSummaryMetrics;
  /** `true` quando a organização ainda não tem nenhum dado — o frontend mostra o estado vazio. */
  isEmpty: boolean;
}

export interface GroupCount {
  value: string | null | undefined;
  count: number;
}

export interface ClosedLead {
  closedAt: Date;
  status: string;
}

export interface CohortLeadRow {
  createdAt: Date;
  closedAt: Date | null;
  status: string;
}

export interface CohortRow {
  month: string;
  total: number;
  won30d: number;
  won60d: number;
}

export interface FunnelStageData {
  status: string;
  count: number;
  amount: number;
}

export interface AnalyticsRepository {
  countCompanies(organizationId: string): Promise<number>;
  countContacts(organizationId: string): Promise<number>;
  countOpenLeads(organizationId: string): Promise<number>;
  countAllLeads(organizationId: string): Promise<number>;
  countActivities(organizationId: string): Promise<number>;
  countPendingActivities(organizationId: string): Promise<number>;
  countOverdueActivities(organizationId: string, now: Date): Promise<number>;
  countLeadsByStatusSince(organizationId: string, status: string, since: Date): Promise<number>;
  countLeadsByStatus(organizationId: string, status: string): Promise<number>;
  averageOpenLeadScore(organizationId: string): Promise<number | null>;
  sumOpenPipelineValue(organizationId: string): Promise<{ total: number; count: number }>;
  sumWonRevenueSince(
    organizationId: string,
    since: Date,
  ): Promise<{ total: number; count: number }>;
  sumAllWonRevenue(organizationId: string): Promise<{ total: number; count: number }>;
  groupLeadsByStatus(organizationId: string): Promise<GroupCount[]>;
  groupFunnelWithAmounts(organizationId: string): Promise<FunnelStageData[]>;
  findLeadsCreatedSince(organizationId: string, since: Date): Promise<Array<{ createdAt: Date }>>;
  findLeadsClosedSince(organizationId: string, since: Date): Promise<ClosedLead[]>;
  groupLeadsByTemperature(organizationId: string): Promise<GroupCount[]>;
  groupLeadsBySource(organizationId: string): Promise<GroupCount[]>;
  groupLeadsByOwner(organizationId: string, status?: string): Promise<GroupCount[]>;
  groupWonAmountByOwner(organizationId: string): Promise<GroupCount[]>;
  groupActivitiesByType(organizationId: string): Promise<GroupCount[]>;
  groupActivitiesByStatus(organizationId: string): Promise<GroupCount[]>;
  groupQualifiedLeadsByOwner(organizationId: string): Promise<GroupCount[]>;
  groupLostLeadsByReason(organizationId: string): Promise<GroupCount[]>;
  findCallActivityTimestamps(organizationId: string): Promise<Date[]>;
  findLeadsForCohort(organizationId: string, since: Date): Promise<CohortLeadRow[]>;
  calculateRealTmq(organizationId: string): Promise<number | null>;
}
