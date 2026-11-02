/**
 * Cliente Redis Centralizado — Birth Hub 360°
 * Agentes: 16 (Runtime e Escala) & 10 (Infraestrutura/SRE)
 *
 * Fornece interface e cliente Redis otimizado para operações de cache,
 * com fail-fast, fail-safe e suporte a injeção para testes.
 */
import type { Redis } from 'ioredis';
import { logger } from '../logger.js';
import { cacheConnection, redisConfigured } from '../queue/redis.js';

export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  keys?(pattern: string): Promise<string[]>;
  scan(cursor: string | number, ...args: (string | number)[]): Promise<[string, string[]]>;
  exists(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  ping(): Promise<string>;
  status?: string;
}

let testClientOverride: IRedisClient | null = null;

/**
 * Obtém a instância ativa do cliente Redis para cache e runtime.
 * Retorna o mock injetado em testes ou a conexão padrão de cache.
 */
export function getRedisClient(): IRedisClient {
  if (testClientOverride) {
    return testClientOverride;
  }
  return cacheConnection as unknown as IRedisClient;
}

/**
 * Verifica se o Redis está configurado no ambiente.
 */
export function isRedisConfigured(): boolean {
  return redisConfigured || testClientOverride !== null;
}

/**
 * Executa ping de verificação de conectividade.
 */
export async function pingRedisClient(client: IRedisClient = getRedisClient()): Promise<boolean> {
  try {
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (err) {
    logger.warn({ err }, 'Redis client ping falhou');
    return false;
  }
}

/**
 * Injeta cliente alternativo (ex.: mock nos testes unitários).
 */
export function setRedisClientForTesting(client: IRedisClient | null): void {
  testClientOverride = client;
}

/**
 * Restaura o cliente padrão após testes.
 */
export function resetRedisClientForTesting(): void {
  testClientOverride = null;
}

export const redisClient = {
  get: (key: string) => getRedisClient().get(key),
  set: (key: string, value: string, ...args: (string | number)[]) =>
    getRedisClient().set(key, value, ...args),
  del: (...keys: string[]) => getRedisClient().del(...keys),
  scan: (cursor: string | number, ...args: (string | number)[]) =>
    getRedisClient().scan(cursor, ...args),
  exists: (...keys: string[]) => getRedisClient().exists(...keys),
  expire: (key: string, seconds: number) => getRedisClient().expire(key, seconds),
  ttl: (key: string) => getRedisClient().ttl(key),
  ping: () => getRedisClient().ping(),
};
