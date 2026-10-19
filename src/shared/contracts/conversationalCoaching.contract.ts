/**
 * Contrato Canônico de Inteligência Conversacional e Coaching Comercial
 * Onda 05 — Eixo 13 (Comunicação Comercial Objetiva, Talk-to-Listen e Metodologia)
 * Dono: Agente 18 — Contratos e API
 * Especialistas: Agente 12 (Voz e Telefonia) & Agente 07 (IA e Automações) & Agente 04 (CRM e BI)
 * 
 * DIRETRIZES ÉTICAS E DE SEGURANÇA MANDATÓRIAS (AGENTS.md / Seção 2):
 * 1. Proibição estrita de inferências médicas, psicológicas, de estresse ou burnout.
 * 2. Proibição de scores de personalidade, ansiedade ou julgamento de características vocais/sotaque.
 * 3. Baseado estritamente em evidências conversacionais objetivas, transparentes e verificáveis.
 * 4. Isolamento multi-tenant irrestrito por organizationId.
 */

export interface SpeakerTurn {
  turnId: string;
  speaker: 'seller' | 'customer' | 'third_party';
  speakerLabel?: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  text: string;
  isQuestion?: boolean;
  questionType?: 'open' | 'closed' | 'none';
  detectedObjection?: {
    category: 'price' | 'timing' | 'competition' | 'authority' | 'integration' | 'security' | 'priority';
    confidence: number;
    quote: string;
  };
}

export interface ConversationalDynamicMetrics {
  totalDurationSeconds: number;
  sellerTalkTimeSeconds: number;
  customerTalkTimeSeconds: number;
  silenceTimeSeconds: number;
  overlapTimeSeconds: number;
  /** Proporção do vendedor [0.0 a 1.0]. Ex: 0.58 = 58% */
  sellerTalkRatio: number;
  /** Proporção do cliente [0.0 a 1.0]. Ex: 0.42 = 42% */
  customerTalkRatio: number;
  totalTurns: number;
  averageTurnDurationSeconds: number;
  paceWordsPerMinute?: number;
  isEstimate: boolean;
  diarizationQualityConfidence: number; // 0.0 a 1.0
}

export interface QuestionAnalysis {
  totalQuestionsAskedBySeller: number;
  openQuestionsCount: number;
  closedQuestionsCount: number;
  openQuestionRatio: number;
  sampleOpenQuestions: string[];
}

export interface ExplicitObjectionItem {
  objectionId: string;
  category: 'price' | 'timing' | 'competition' | 'authority' | 'integration' | 'security' | 'priority';
  explicitQuote: string;
  timestampSeconds: number;
  playbookReferenceId?: string;
  suggestedRebuttalSummary?: string;
  wasAddressedBySeller: boolean;
}

export interface MethodologyAdherence {
  framework: 'SPIN' | 'CHALLENGER' | 'BANT' | 'MEDDPICC' | 'CONSULTATIVE';
  adherenceScore: number; // 0 a 100
  criteriaChecked: {
    criterion: string;
    verified: boolean;
    evidenceSnippet?: string;
  }[];
}

export interface NextStepCommitment {
  commitmentType: 'meeting_scheduled' | 'proposal_to_send' | 'technical_validation' | 'pricing_review' | 'other';
  description: string;
  agreedDateOrDeadline?: string;
  explicitlyConfirmed: boolean;
  evidenceQuote: string;
}

export interface PostCallCoachingReport {
  reportId: string;
  organizationId: string;
  callId: string;
  sellerId: string;
  callGoal?: string;
  dynamics: ConversationalDynamicMetrics;
  questions: QuestionAnalysis;
  objections: ExplicitObjectionItem[];
  methodology: MethodologyAdherence;
  commitments: NextStepCommitment[];
  pedagogicalRecommendations: {
    title: string;
    description: string;
    category: 'active_listening' | 'discovery_questions' | 'objection_handling' | 'next_step_closing' | 'proposal_clarity';
    recommendedRoleplayExercise?: {
      scenarioId: string;
      framework: string;
      targetFocus: string;
    };
  }[];
  sourcesAndLimitations: string[];
  generatedAt: string; // ISO 8601
}

export interface RealtimeCoachingHint {
  hintId: string;
  organizationId: string;
  callId: string;
  category: 'objection_unanswered' | 'open_question_opportunity' | 'confirm_next_steps' | 'listen_more';
  message: string;
  priority: 'low' | 'medium';
  timestampSeconds: number;
}
