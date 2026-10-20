/**
 * Contrato Canônico de Bem-Estar Operacional, Otimização de Carga e Microtreinamentos
 * Onda 05 — Eixo 18 (Gestão Voluntária de Agenda, Pausas e Preparação)
 * Dono: Agente 18 — Contratos e API
 * Especialistas: Agente 02 (Produto e UX), Agente 04 (CRM e BI), Agente 07 (IA e Automações), Agente 13 (Swarm)
 * Revisão de Governança: Agente 15 (Segurança) & Agente 21 (LGPD e Relações de Trabalho)
 *
 * DIRETRIZES ÉTICAS E DE SEGURANÇA MANDATÓRIAS (AGENTS.md / Seção 2):
 * 1. Proibição categórica de vigilância emocional, inferência de burnout ou classificação clínica/psicológica.
 * 2. As recomendações de pausa e organização de agenda são 100% voluntárias e acionáveis pelo próprio vendedor.
 * 3. Proibição de relatórios individuais de "saúde/fadiga" compartilhados com gestores (anti-punição).
 * 4. Microtreinamentos pré-reunião estritamente pedagógicos e rápidos (alvo de 3 minutos).
 * 5. Rebalanceamento de carteira e agenda sempre supervisionado por humanos.
 */

export interface WorkloadPreferences {
  sellerId: string;
  organizationId: string;
  enableBreakSuggestions: boolean;
  minBreakDurationMinutes: number; // Ex: 10 ou 15 min
  preferredPrepTimeMinutes: number; // Ex: 10 ou 15 min
  dailyMeetingHoursLimit: number; // Ex: 5 horas
  quietHoursStart?: string; // Ex: "18:00"
  quietHoursEnd?: string; // Ex: "08:30"
  optOutWellbeingFeatures: boolean;
  notificationsEnabled: boolean;
  updatedAt: string; // ISO 8601
}

export interface WorkloadObjectiveMetrics {
  sellerId: string;
  organizationId: string;
  date: string; // YYYY-MM-DD
  totalMeetingsCount: number;
  totalMeetingMinutes: number;
  backToBackMeetingsCount: number;
  maxConsecutiveMeetingMinutes: number;
  availablePrepMinutesBeforeKeyMeetings: number;
  pendingTasksCount: number;
  urgentTasksCount: number;
  isOverloadedThresholdMet: boolean;
}

export type WorkloadRecommendationType =
  | 'SUGGEST_BREAK'
  | 'PRE_MEETING_PREPARATION'
  | 'ORGANIZE_PENDING_TASKS'
  | 'BUFFER_CALENDAR_BLOCK'
  | 'MICRO_TRAINING_PROPOSAL';

export interface WorkloadRecommendation {
  id: string;
  organizationId: string;
  sellerId: string;
  type: WorkloadRecommendationType;
  title: string;
  explanation: string;
  targetTime?: string; // ISO 8601
  durationMinutes?: number;
  isVoluntary: true;
  dismissed: boolean;
  accepted: boolean;
  relatedMeetingId?: string;
  relatedMicroTrainingId?: string;
  suggestedActionPayload?: Record<string, unknown>;
  createdAt: string; // ISO 8601
}

export interface MicroTrainingSession {
  trainingId: string;
  organizationId: string;
  sellerId: string;
  title: string;
  objective: string;
  targetDurationMinutes: number; // Alvo: 3 minutos
  exerciseType:
    | 'PRE_MEETING_CHECKLIST'
    | 'PRICE_OBJECTION_REHEARSAL'
    | 'DISCOVERY_QUESTION_WARMUP'
    | 'CLOSING_NEXT_STEPS_PRACTICE'
    | 'VALUE_PROPOSITION_ALIGNMENT';
  prompts: string[];
  suggestedRoleplayScenarioId?: string;
  isCompleted: boolean;
  completedAt?: string;
  sellerRating?: number; // 1 a 5 feedback do vendedor
}

export interface CollectiveAggregatedWorkload {
  organizationId: string;
  teamId?: string;
  periodStart: string;
  periodEnd: string;
  anonymizedSampleCount: number; // Mínimo seguro de participantes para evitar reidentificação (>= 5)
  averageDailyMeetingMinutes: number;
  averageBackToBackOccurrences: number;
  collectivePrepTimeAvailabilityPercent: number;
  /** Sem scores individuais nem identificação pessoal */
}
