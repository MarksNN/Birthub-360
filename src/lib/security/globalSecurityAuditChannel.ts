/**
 * Canal Global de Auditoria de Segurança (Passo 22 / Agente 15)
 * Isolado de outbox de tenant individual para registro imutável de eventos de auditoria.
 */

import { logger } from '../logger.js';

export interface SecurityAuditEvent {
  eventId: string;
  eventType:
    | 'AUTH_FAILURE'
    | 'PRIVILEGE_ESCALATION'
    | 'CROSS_TENANT_ACCESS_DENIED'
    | 'SECRET_ACCESSED';
  organizationId?: string;
  userId?: string;
  ipAddress?: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export class GlobalSecurityAuditChannel {
  private events: SecurityAuditEvent[] = [];

  public emitAuditEvent(
    event: Omit<SecurityAuditEvent, 'eventId' | 'timestamp'>,
  ): SecurityAuditEvent {
    const record: SecurityAuditEvent = {
      ...event,
      eventId: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    this.events.push(record);
    logger.warn({ auditEvent: record }, 'Evento crítico de segurança registrado no canal global');
    return record;
  }

  public getEvents(): SecurityAuditEvent[] {
    return [...this.events];
  }
}

export const globalSecurityAudit = new GlobalSecurityAuditChannel();
