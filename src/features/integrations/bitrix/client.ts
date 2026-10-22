/**
 * client.ts (Passo 053)
 * Cliente HTTP para a API Bitrix24 com rate limiting estrito de 500ms e retry exponencial contra 429.
 */

import { logger } from '../../../lib/logger.js';

export interface BitrixClientConfig {
  webhookUrl: string;
  minIntervalMs?: number; // Padrão: 500ms (limite de 2 req/s)
  maxRetries?: number; // Padrão: 3
  timeoutMs?: number; // Padrão: 10000ms
}

export interface BitrixApiResponse<T = unknown> {
  result: T;
  total?: number;
  next?: number;
  time?: {
    start: number;
    finish: number;
    duration: number;
  };
}

export class BitrixClient {
  private lastRequestTimestamp = 0;
  private readonly minIntervalMs: number;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly webhookUrl: string;

  constructor(config: BitrixClientConfig) {
    this.webhookUrl = config.webhookUrl.replace(/\/$/, '');
    this.minIntervalMs = config.minIntervalMs ?? 500;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 10000;
  }

  /**
   * Garante o espaçamento mínimo de 500ms entre chamadas para respeitar o rate-limit do Bitrix.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTimestamp;
    if (elapsed < this.minIntervalMs) {
      const waitMs = this.minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.lastRequestTimestamp = Date.now();
  }

  async callMethod<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    customFetch?: typeof fetch,
  ): Promise<BitrixApiResponse<T>> {
    const fetchFn = customFetch ?? fetch;
    const url = `${this.webhookUrl}/${method}.json`;

    let attempt = 0;
    let delay = 500;

    while (attempt <= this.maxRetries) {
      await this.throttle();
      attempt++;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          logger.warn(
            { attempt, maxRetries: this.maxRetries, delay },
            '[BitrixClient] HTTP 429 Too Many Requests detectado. Executando backoff exponencial.',
          );
          if (attempt > this.maxRetries) {
            throw new Error(`Bitrix rate limit excedido após ${this.maxRetries} tentativas (HTTP 429)`);
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        if (!response.ok) {
          throw new Error(`Bitrix API error: HTTP ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as BitrixApiResponse<T>;
        return data;
      } catch (err: any) {
        if (attempt > this.maxRetries) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw new Error('Falha inesperada no loop de retry do BitrixClient');
  }
}
