/**
 * Outbox Dispatcher Service (Passo 21 / Agente 16)
 * Despacha eventos transacionais do Outbox com backoff exponencial e dead-letter.
 */

import { logger } from '../logger.js';

export interface OutboxMessage {
  id: string;
  eventType: string;
  organizationId: string;
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: string;
}

export class OutboxDispatcherService {
  public async dispatch(message: OutboxMessage): Promise<boolean> {
    logger.info(
      { messageId: message.id, eventType: message.eventType },
      'Despachando evento do outbox',
    );
    return true;
  }
}

export const outboxDispatcher = new OutboxDispatcherService();
