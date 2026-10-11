import { api } from '../../lib/api.js';

/**
 * P0 #693 — contrato honesto da orquestração comercial.
 * Sem fallback silencioso: falha da API propaga erro para a UI mostrar estado de erro.
 * Métricas sem cálculo real chegam `null` (listadas em `meta.unavailableMetrics`).
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
  conversionRate: number;
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
  taxaSucesso: number;
  corpoTexto: string;
  variaveis: string[];
}

export interface SalesOrchestrationMeta {
  source: 'real' | 'none';
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
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SalesOrchestrationApiError';
  }
}

export const orchestrationApi = {
  /** Lança `SalesOrchestrationApiError` em falha — nunca devolve dados de exemplo. */
  getOverview: async (): Promise<SalesOrchestrationOverview> => {
    let res: { success: boolean; data: SalesOrchestrationOverview } | undefined;
    try {
      res = await api.get<{ success: boolean; data: SalesOrchestrationOverview }>(
        '/api/sales-orchestration/overview',
      );
    } catch (err) {
      throw new SalesOrchestrationApiError('Falha ao carregar a orquestração comercial.', err);
    }
    if (!res?.success || !res.data) {
      throw new SalesOrchestrationApiError('Resposta inválida da orquestração comercial.');
    }
    return res.data;
  },
};
