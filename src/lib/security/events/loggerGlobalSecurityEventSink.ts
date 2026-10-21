import { logger } from '../../logger.js';
import type { GlobalSecurityEvent, IGlobalSecurityEventSink } from './globalSecurityEvent.port.js';

/**
 * Implementação padrão: log estruturado (pino -> stdout/Loki), sem FK de tenant.
 * Uma tabela durável `security_event` (sem organizationId) pode substituir esta
 * implementação depois — ver handoff 15-para-01-security-event-global-table.
 */
export class LoggerGlobalSecurityEventSink implements IGlobalSecurityEventSink {
  async emit(event: GlobalSecurityEvent): Promise<void> {
    logger.info(
      { securityEvent: event, channel: 'global-security-events' },
      `[security-event] ${event.eventType}`,
    );
  }
}

/** Implementação para testes: guarda os eventos em memória. */
export class InMemoryGlobalSecurityEventSink implements IGlobalSecurityEventSink {
  readonly events: GlobalSecurityEvent[] = [];
  async emit(event: GlobalSecurityEvent): Promise<void> {
    this.events.push(event);
  }
}
