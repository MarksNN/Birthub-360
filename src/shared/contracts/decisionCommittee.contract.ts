/**
 * Contrato canônico para o subsistema de Comitê de Decisão e Grafo de Influência B2B.
 * Onda 02 — Evolução 06
 */

export type CommitteeBuyingRole =
  | 'Decisor Econômico'
  | 'Decisor Operacional'
  | 'Influenciador Técnico'
  | 'Usuário Final'
  | 'Bloqueador Potencial';

export interface CommitteeContactInput {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  department?: string;
}

export interface CommitteeMember {
  name: string;
  role: string;
  buyingRole: CommitteeBuyingRole;
  approachStrategy: string;
  urgencyLevel: 'Alta' | 'Média' | 'Baixa';
  influenceScore?: number; // 1 a 10
  isChampion?: boolean;
  isBlocker?: boolean;
}

export interface CommitteeAnalysis {
  companyContext?: string;
  members: CommitteeMember[];
  primaryTarget: string;
  recommendations: string[];
  completenessScore: number; // 0 a 100
  hasEconomicBuyer: boolean;
  hasChampion: boolean;
  hasIdentifiedBlocker: boolean;
}

export interface IDecisionCommitteePort {
  mapCommittee(
    contacts: CommitteeContactInput[],
    companyContext?: string,
  ): Promise<CommitteeAnalysis>;
  assessCompleteness(members: CommitteeMember[]): number;
}
