/**
 * Contrato Canônico de Digital Twins Metodológicos — Birth Hub 360°
 * Onda 04: Experiência Comercial Avançada (Eixo 8)
 * Dono: Agente 18 — Contratos e API
 * Especialistas do Domínio: Agente 07 (IA e Automações) & Agente 13 (Swarm Autônomo)
 */

export type CommercialMethodologyCategory =
  | 'spin_questioning'
  | 'objection_handling'
  | 'value_anchoring'
  | 'talk_listen_ratio'
  | 'closing_confirmation';

export interface CommercialTechniquePattern {
  techniqueId: string;
  name: string;
  category: CommercialMethodologyCategory;
  description: string;
  triggerContext: string;
  exampleSyntheticSnippet: string;
  evaluationChecklist: string[];
  recommendedTalkRatioTarget: number; // Ex: 0.40 (40% fala / 60% escuta)
}

export interface MethodologicalMentorProfile {
  mentorId: string;
  organizationId: string;
  syntheticPersonaName: string;
  targetMethodology: string;
  curatedBy: string;
  isSyntheticCoach: true; // Garantia explícita: não é clone de pessoa real
  allowedTechniques: string[];
  updatedAt: string;
}

export interface MentorshipExercise {
  exerciseId: string;
  organizationId: string;
  sellerId: string;
  techniqueId: string;
  scenarioDescription: string;
  buyerObjection: string;
  expectedBehaviors: string[];
}

export interface MentorshipEvaluation {
  exerciseId: string;
  sellerId: string;
  scorePercent: number; // 0 a 100
  spinAdherencePercent: number;
  talkRatioPercent: number;
  strengths: string[];
  improvementAreas: string[];
  pedagogicalFeedback: string;
  nextRecommendedExercise?: string;
  evaluatedAt: string;
}

export interface IMethodologicalDigitalTwinPort {
  registerTechniquePattern(params: {
    organizationId: string;
    technique: Omit<CommercialTechniquePattern, 'techniqueId'>;
  }): Promise<CommercialTechniquePattern>;
  listAvailableTechniques(organizationId: string): Promise<CommercialTechniquePattern[]>;
  createMentorProfile(params: {
    organizationId: string;
    syntheticPersonaName: string;
    targetMethodology: string;
    curatedBy: string;
    techniqueIds: string[];
  }): Promise<MethodologicalMentorProfile>;
  startMentorshipExercise(params: {
    organizationId: string;
    sellerId: string;
    techniqueId: string;
  }): Promise<MentorshipExercise>;
  evaluateSellerResponse(params: {
    organizationId: string;
    exerciseId: string;
    sellerId: string;
    responseText: string;
    recordedDurationSeconds: number;
  }): Promise<MentorshipEvaluation>;
}
