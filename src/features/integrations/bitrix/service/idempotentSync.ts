import { logger } from '../../../../lib/logger.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { callBitrix } from './client.js';
import { bitrixSyncFailuresTotal } from './metrics.js';

export class BitrixPaginationError extends AppError {
  constructor(
    message: string,
    public readonly method: string,
    public readonly pageStart: number,
  ) {
    super(message, 502);
  }
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  pagesProcessed: number;
  exhausted: boolean;
}

/**
 * Executa chamadas paginadas à API do Bitrix24 garantindo tratamento robusto de paginação (start/next/total).
 * Lança exceções explícitas (BitrixPaginationError) em caso de resposta truncada ou falha de estrutura,
 * evitando falhas silenciosas na extração/sincronização.
 */
export async function callBitrixPaginated<T>(
  webhookUrl: string,
  method: string,
  baseParams: Record<string, unknown> = {},
  options: {
    maxPages?: number;
    maxItems?: number;
    correlationId?: string;
  } = {},
): Promise<PaginatedResult<T>> {
  const maxPages = options.maxPages || 50;
  const maxItems = options.maxItems || 2500;
  const allItems: T[] = [];

  let start = 0;
  let pagesProcessed = 0;
  let total = 0;
  let exhausted = false;

  while (pagesProcessed < maxPages && allItems.length < maxItems) {
    pagesProcessed++;
    const params = { ...baseParams, start };

    try {
      const response = await callBitrix<{ result: T[]; next?: number; total?: number }>(
        webhookUrl,
        method,
        params,
        { correlationId: options.correlationId },
      );

      if (!response || !Array.isArray(response.result)) {
        bitrixSyncFailuresTotal.inc({ tenant: 'unknown', entity: method });
        throw new BitrixPaginationError(
          `Retorno inválido ou nulo na paginação de ${method} (start=${start}).`,
          method,
          start,
        );
      }

      allItems.push(...response.result);
      total = response.total ?? allItems.length;

      if (response.next !== undefined && response.next > start) {
        start = response.next;
      } else {
        exhausted = true;
        break;
      }
    } catch (err: any) {
      if (err instanceof BitrixPaginationError) throw err;
      logger.error(
        { err, method, start, pagesProcessed },
        '[BitrixPaginated] Falha durante a paginação do Bitrix24.',
      );
      bitrixSyncFailuresTotal.inc({ tenant: 'unknown', entity: method });
      throw new BitrixPaginationError(
        `Falha na página start=${start} do método ${method}: ${err.message}`,
        method,
        start,
      );
    }
  }

  return {
    items: allItems,
    total,
    pagesProcessed,
    exhausted,
  };
}

// ── Trava de Idempotência em Memória com TTL ──────────────────────────────────────────────
const syncLocks = new Map<string, number>();
const LOCK_TTL_MS = 60_000; // 60s lock window

/**
  Tenta adquirir a trava de idempotência para um evento/registro do Bitrix.
  Retorna `true` se o bloqueio foi adquirido com sucesso; `false` se já estiver sendo processado.
 */
export function acquireBitrixSyncLock(
  organizationId: string,
  entityType: 'lead' | 'deal' | 'contact',
  entityId: string,
): boolean {
  const lockKey = `bitrix:${organizationId}:${entityType}:${entityId}`;
  const now = Date.now();
  const existingLockTime = syncLocks.get(lockKey);

  if (existingLockTime && now - existingLockTime < LOCK_TTL_MS) {
    logger.info(
      { organizationId, entityType, entityId },
      '[BitrixSyncLock] Execução duplicada/concorrente ignorada (lock ativo).',
    );
    return false;
  }

  syncLocks.set(lockKey, now);
  return true;
}

/**
  Libera a trava de idempotência.
 */
export function releaseBitrixSyncLock(
  organizationId: string,
  entityType: 'lead' | 'deal' | 'contact',
  entityId: string,
): void {
  const lockKey = `bitrix:${organizationId}:${entityType}:${entityId}`;
  syncLocks.delete(lockKey);
}
