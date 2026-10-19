/**
 * Contrato Canônico do DomainEventMesh — Birth Hub 360°
 * Onda 01: Fundação da Inteligência Autônoma
 * Dono: Agente 18 — Contratos e API
 */

export type DomainEventType =
  | 'MOBILE_MEETING_AUDIO_SYNCED'
  | 'VOICE_CALL_COMPLETED'
  | 'TRANSCRIPTION_COMPLETED'
  | 'COMMERCIAL_OBJECTION_DETECTED'
  | 'COMMERCIAL_OBJECTION_PROMOTED'
  | 'DEAL_RISK_SPIKED'
  | 'ROLEPLAY_SESSION_MASTERED'
  | 'SOCIAL_APPROACH_SENT'
  | 'CRM_MEETING_SCHEDULED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'KNOWLEDGE_DOCUMENT_REVOKED'
  | 'MARKET_SIGNAL_DETECTED'
  | 'PROMISE_COMMITMENT_DETECTED'
  | 'DEVILS_ADVOCATE_ALERT'
  | 'WIN_LOSS_AUTOPSY_COMPLETED'
  | 'GRAPH_RELATIONSHIP_UPDATED'
  | 'SDR_CALL_COMPLETED'
  | 'MEETING_SCHEDULED_CALENDAR'
  | 'CROSS_CHANNEL_OPTOUT_ENFORCED'
  | 'COMMERCIAL_PROPOSAL_DRAFTED'
  | 'AUTONOMY_LIMIT_EXCEEDED'
  | 'COMMERCIAL_BOTTLENECK_DETECTED'
  | 'ADAPTIVE_MISSION_SUGGESTED'
  | 'ADAPTIVE_MISSION_COMPLETED'
  | 'SELLER_XP_REWARDED'
  | 'LEAD_STAGNATED'
  | 'ENGAGEMENT_SIGNAL_RECEIVED'
  | 'CADENCE_RECOMMENDATION_CREATED'
  | 'CADENCE_CHANGE_APPROVED'
  | 'LEAD_REACTIVATION_SUGGESTED'
  | 'LEAD_REACTIVATED'
  | 'VALUE_REALIZATION_MEASURED'
  | 'REVENUE_FORECAST_PROJECTED'
  | 'WHAT_IF_SCENARIO_SIMULATED'
  | 'ACCOUNT_ALLOCATION_RECOMMENDED';

export interface DomainEventEnvelope<T = Record<string, unknown>> {
  eventId: string;
  eventType: DomainEventType;
  eventVersion: string;
  organizationId: string;
  correlationId: string;
  causationId?: string;
  occurredAt: string; // ISO 8601
  producer: string;
  aggregateId: string;
  payload: T;
  traceContext?: {
    userId?: string;
    spanId?: string;
  };
}

export interface DomainEventSubscription {
  eventType: DomainEventType;
  handler: (event: DomainEventEnvelope) => Promise<void>;
  consumerGroup?: string;
}

export interface IDomainEventMeshPort {
  publish<T = Record<string, unknown>>(
    event: Omit<DomainEventEnvelope<T>, 'eventId' | 'occurredAt'>,
  ): Promise<DomainEventEnvelope<T>>;
  subscribe(
    eventType: DomainEventType,
    handler: (event: DomainEventEnvelope) => Promise<void>,
  ): void;
}
