/**
 * Contrato Canônico para o Simulador de Roleplay Multimodal Avançado (C3)
 * Onda 05 — Evolução 17
 * Responsável: Agente 18 (Contratos) / Agente 13 (Roleplay / Swarm)
 */

export type SalesMethodologyFramework = 'SPIN' | 'CHALLENGER' | 'GAP_SELLING' | 'BANT' | 'MEDDPICC';

export type BuyerPersonaArchetype =
  | 'cfo_skeptical'
  | 'cto_pragmatic'
  | 'coo_efficiency_obsessed'
  | 'procurement_aggressive';

export interface BuyerPersona {
  id: string;
  name: string;
  title: string;
  archetype: BuyerPersonaArchetype;
  companySize: string;
  primaryPainPoint: string;
  hiddenObjection: string;
  decisionCriteria: string[];
}

export interface RoleplayTurn {
  turnNumber: number;
  speaker: 'seller' | 'buyer';
  content: string;
  timestamp: string;
  detectedObjection?: string;
  methodologyTechniqueUsed?: string;
  talkDurationSeconds: number;
}

export interface RoleplayEvaluationScore {
  framework: SalesMethodologyFramework;
  needDiscoveryScore: number; // 0 a 100
  activeListeningScore: number; // 0 a 100
  objectionHandlingScore: number; // 0 a 100
  valueArticulationScore: number; // 0 a 100
  nextStepAlignmentScore: number; // 0 a 100
  compositeScore: number; // Média ponderada (0 a 100)
  talkListenRatio: number; // Ex: 0.45 = vendedor falou 45% do tempo
  awardedXp: number;
  feedbackSummary: string;
  actionableTips: string[];
}

export interface MultimodalRoleplaySession {
  sessionId: string;
  organizationId: string;
  sellerId: string;
  persona: BuyerPersona;
  framework: SalesMethodologyFramework;
  status: 'active' | 'evaluating' | 'completed' | 'abandoned';
  turns: RoleplayTurn[];
  evaluation?: RoleplayEvaluationScore;
  startedAt: string;
  completedAt?: string;
}

export interface IMultimodalRoleplayPort {
  startSession(params: {
    organizationId: string;
    sellerId: string;
    framework: SalesMethodologyFramework;
    personaArchetype: BuyerPersonaArchetype;
    industry?: string;
  }): Promise<MultimodalRoleplaySession>;

  submitTurn(params: {
    organizationId: string;
    sessionId: string;
    sellerMessage: string;
    talkDurationSeconds: number;
  }): Promise<{ session: MultimodalRoleplaySession; buyerReply: string }>;

  evaluateSession(params: {
    organizationId: string;
    sessionId: string;
  }): Promise<RoleplayEvaluationScore>;

  getSession(organizationId: string, sessionId: string): Promise<MultimodalRoleplaySession | null>;
}
