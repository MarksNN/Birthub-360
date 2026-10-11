import { api } from '../../lib/api.js';

/**
 * P0 #693 — contrato honesto da orquestração comercial.
 * Sem fallback silencioso: falha da API propaga erro para a UI mostrar estado de erro.
 * Métricas sem cálculo real chegam `null` (listadas em `meta.unavailableMetrics`).
 *
 * Nota (parecer 24): `apiFetch` já desembrulha `{ success, data }` → devolve `data`
 * (ou `{ data, meta }` se `meta` vier no envelope). NÃO re-checar `success`.
 */

export type PlaybookInsightStatusValue = 'SUGGESTED' | 'BROADCAST' | 'DISMISSED';

export interface PlaybookItem {
  id: string;
  title: string;
  description: string;
  segment: string;
  evidenceCount: number;
  insightStatus: PlaybookInsightStatusValue;
  status: 'Ativo' | 'Em Revisão' | 'Rascunho' | 'Descartado';
  /** ISO 8601 */
  updatedAt: string;
  /** dd/mm/aaaa */
  lastUpdated: string;
  category: 'Inbound' | 'Outbound' | 'Enterprise' | 'Expansão' | 'Parcerias' | null;
  targetRole: 'SDR' | 'BDR' | 'Closer' | 'Account Executive' | null;
  stagesCount: number | null;
  complianceRate: number | null;
}

export interface JornadaEtapa {
  id: string;
  name: string;
  personaStage: string;
  touchpoints: string[];
  ownerRole: string;
  slaHours: number;
  avgTimeDays: number;
  /** Sem cálculo real hoje → null. */
  conversionRate: number | null;
}

export interface ProcessoVendaItem {
  id: string;
  codigo: string;
  nome: string;
  categoria: 'Passagem de Bastão' | 'Qualificação' | 'SLA Operacional' | 'Distribuição';
  gatilho: string;
  slaMaximo: string;
  responsavel: string;
  status: 'Obrigatório' | 'Recomendado';
}

export interface RoteiroItem {
  id: string;
  titulo: string;
  canal: 'Telefone' | 'WhatsApp' | 'E-mail' | 'Reunião';
  fase: 'Abertura' | 'Qualificação' | 'Pitch' | 'Contorno de Objeção' | 'Fechamento';
  /** Sem cálculo real hoje → null. */
  taxaSucesso: number | null;
  corpoTexto: string;
  variaveis: string[];
}

/** Contrato do Agente 04 (#696 / agente/04-p0-693-orquestracao-honesta). */
export type SalesOrchestrationSource = 'real' | 'none';

export interface SalesOrchestrationMeta {
  /** 'real' = há PlaybookInsight/cadência real; 'none' = organização sem dados reais (listas vazias). */
  source: SalesOrchestrationSource;
  unavailableMetrics: string[];
  emptySections?: Array<'jornadas' | 'processos' | 'roteiros'>;
}

export interface SalesOrchestrationOverview {
  kpis: {
    playbooksAtivos: number;
    aderenciaPlaybook: number | null;
    speedToLeadMin: number | null;
    cadenciasAtivas: number;
  };
  playbooks: PlaybookItem[];
  jornadas: JornadaEtapa[];
  processos: ProcessoVendaItem[];
  roteiros: RoteiroItem[];
  meta: SalesOrchestrationMeta;
}

export class SalesOrchestrationApiError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SalesOrchestrationApiError';
  }
}

function isOverview(value: unknown): value is SalesOrchestrationOverview {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.playbooks) &&
    Array.isArray(v.jornadas) &&
    Array.isArray(v.processos) &&
    Array.isArray(v.roteiros) &&
    !!v.kpis &&
    typeof v.kpis === 'object' &&
    !!v.meta &&
    typeof v.meta === 'object' &&
    (v.meta as SalesOrchestrationMeta).source !== undefined
  );
}

/** Normaliza o valor já desembrulhado por `apiFetch`. */
export function normalizeOrchestrationOverview(res: unknown): SalesOrchestrationOverview {
  if (isOverview(res)) return res;

  // Envelope residual `{ data, meta }` quando apiFetch preserva meta no topo
  if (res && typeof res === 'object' && 'data' in res) {
    const wrapped = res as { data: unknown; meta?: SalesOrchestrationMeta };
    if (isOverview(wrapped.data)) {
      return wrapped.meta ? { ...wrapped.data, meta: wrapped.meta } : wrapped.data;
    }
  }

  throw new SalesOrchestrationApiError('Resposta inválida da orquestração comercial.');
}

export const orchestrationApi = {
  /** Lança `SalesOrchestrationApiError` em falha — nunca devolve dados de exemplo. */
  getOverview: async (): Promise<SalesOrchestrationOverview> => {
    try {
      // apiFetch já remove `{ success, data }` → tipar o valor útil, não o envelope HTTP
      const res = await api.get<SalesOrchestrationOverview | { data: SalesOrchestrationOverview; meta?: SalesOrchestrationMeta }>(
        '/api/sales-orchestration/overview',
      );
      return normalizeOrchestrationOverview(res);
    } catch (err) {
      if (err instanceof SalesOrchestrationApiError) throw err;
      throw new SalesOrchestrationApiError('Falha ao carregar a orquestração comercial.', err);
    }
  },
};
