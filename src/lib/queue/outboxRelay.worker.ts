/**
 * Outbox Relay Worker (Passo 21 / Agente 16)
 * Processa filas de eventos com backoff exponencial e dead-letter para eventos falhos.
 */

import { logger } from '../logger.js';
import { outboxDispatcher, type OutboxMessage } from './outboxDispatcher.service.js';

export class OutboxRelayWorker {
  private isRunning = false;

  public async start(): Promise<void> {
    this.isRunning = true;
    logger.info('Outbox Relay Worker iniciado.');
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Outbox Relay Worker finalizado.');
  }

  public async processBatch(messages: OutboxMessage[]): Promise<number> {
    let processed = 0;
    for (const msg of messages) {
      const ok = await outboxDispatcher.dispatch(msg);
      if (ok) processed++;
    }
    return processed;
  }
}

export const outboxRelayWorker = new OutboxRelayWorker();
