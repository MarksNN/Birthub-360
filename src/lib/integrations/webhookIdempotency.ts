import { createHash } from 'node:crypto';

export type WebhookProviderKey =
  | 'bitrix24'
  | 'whatsapp'
  | 'hubspot'
  | 'pipedrive'
  | 'rdstation'
  | 'calendly'
  | 'stripe'
  | 'generic';

export interface DeterministicWebhookIdentityInput {
  provider: WebhookProviderKey;
  organizationId: string;
  externalEventId?: string | null;
  externalEntityId?: string | null;
  eventType: string;
  payloadFingerprint?: string | Record<string, unknown> | null;
  /**
   * Janela de deduplicação em segundos quando o provedor não envia ID único de evento
   * (ex.: retries de webhook do Bitrix24 para o mesmo DEAL_ID dentro de 5 minutos).
   * Default: 300s (5 minutos).
   */
  bucketWindowSeconds?: number;
  nowMs?: number;
}

export interface DeterministicWebhookIdentity {
  idempotencyKey: string;
  correlationId: string;
  dedupRedisKey: string;
  ttlSeconds: number;
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`).join(',')}}`;
}

/**
 * Gera `idempotencyKey`, `correlationId` e `dedupRedisKey` determinísticos (SHA-256)
 * para webhooks de entrada (Bitrix24, WhatsApp, CRMs externos) e eventos do `domainEventMesh`.
 *
 * Evita que retries automáticos de provedores (que antes usavam `Date.now()` no correlationId)
 * gerem eventos duplicados no Event Mesh ou contornem a janela de deduplicação.
 */
export function buildDeterministicWebhookIdentity(
  input: DeterministicWebhookIdentityInput,
): DeterministicWebhookIdentity {
  const bucketSeconds = Math.max(1, input.bucketWindowSeconds ?? 300);
  const nowMs = input.nowMs ?? Date.now();
  const timeBucket = Math.floor(nowMs / (bucketSeconds * 1000));

  const trimmedEventId = input.externalEventId?.trim();
  const trimmedEntityId = input.externalEntityId?.trim() || 'unknown-entity';
  const serializedFingerprint = stableSerialize(input.payloadFingerprint);

  const canonicalSeed = trimmedEventId
    ? `${input.provider}|${input.organizationId}|${input.eventType}|event:${trimmedEventId}`
    : `${input.provider}|${input.organizationId}|${input.eventType}|entity:${trimmedEntityId}|bucket:${timeBucket}|fp:${serializedFingerprint}`;

  const digest = createHash('sha256').update(canonicalSeed).digest('hex').slice(0, 32);

  return {
    idempotencyKey: `idem:${input.provider}:${digest}`,
    correlationId: `${input.provider}-inbound-${trimmedEntityId}-${digest.slice(0, 16)}`,
    dedupRedisKey: `webhook:dedup:${input.provider}:${input.organizationId}:${digest}`,
    ttlSeconds: trimmedEventId ? Math.max(bucketSeconds, 86_400) : bucketSeconds,
  };
}
