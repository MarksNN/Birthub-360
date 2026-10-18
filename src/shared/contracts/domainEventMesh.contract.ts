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
  | 'KNOWLEDGE_DOCUMENT_REVOKED';

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
  publish<T = Record<string, unknown>>(event: Omit<DomainEventEnvelope<T>, 'eventId' | 'occurredAt'>): Promise<DomainEventEnvelope<T>>;
  subscribe(eventType: DomainEventType, handler: (event: DomainEventEnvelope) => Promise<void>): void;
}
