/**
 * Canal próprio para eventos de segurança GLOBAIS (sem tenant).
 *
 * Por que não usar o domainEventMesh/outbox:
 * - A outbox transacional (REMED-05, PRs #32/#34) tem FK `organizationId -> Organization`
 *   e RLS por `app.current_tenant_id`. Um evento global com organizationId sentinela
 *   ('global-security-governance') viola a FK no modo prisma.
 * - Criar uma "org de sistema" por seed abriria um tenant falso: bypass implícito de RLS
 *   e poluição de queries/relatórios por tenant. Rejeitado.
 *
 * Regra: eventos que afetam UM tenant continuam indo pelo domainEventMesh com o
 * organizationId real do tenant. Eventos de plataforma (varredura de dependências,
 * SBOM, waivers) vão por este port.
 */
export type GlobalSecurityEventType = 'SECURITY_AUDIT_SWEEP_COMPLETED';

export interface GlobalSecurityEvent {
  eventId: string;
  eventType: GlobalSecurityEventType;
  eventVersion: string;
  occurredAt: string;
  correlationId: string;
  producer: string;
  aggregateId: string;
  /** Sem PII e sem dados de tenant. */
  payload: Record<string, string | number | boolean | null>;
}

export interface IGlobalSecurityEventSink {
  emit(event: GlobalSecurityEvent): Promise<void>;
}
