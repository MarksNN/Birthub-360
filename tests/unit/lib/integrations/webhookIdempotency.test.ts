import { describe, expect, it } from 'vitest';
import {
  __resetTokenQuotaCacheForTests,
  normalizeTier,
  TokenQuotaService,
} from '../../../../src/lib/ai/finops/tokenQuota.service.js';
import { buildDeterministicWebhookIdentity } from '../../../../src/lib/integrations/webhookIdempotency.js';

describe('buildDeterministicWebhookIdentity (Horizonte 2 — Idempotência de Webhooks)', () => {
  it('gera exatamente o mesmo correlationId e idempotencyKey para retries com mesmo externalEventId', () => {
    const first = buildDeterministicWebhookIdentity({
      provider: 'whatsapp',
      organizationId: 'org-123',
      externalEventId: 'wamid.HBgMNTUxMTk5OTk5OTk5FQIAERgSQABCDEF',
      externalEntityId: '5511999999999',
      eventType: 'whatsapp.message.received',
      nowMs: 1_700_000_000_000,
    });

    const retryLater = buildDeterministicWebhookIdentity({
      provider: 'whatsapp',
      organizationId: 'org-123',
      externalEventId: 'wamid.HBgMNTUxMTk5OTk5OTk5FQIAERgSQABCDEF',
      externalEntityId: '5511999999999',
      eventType: 'whatsapp.message.received',
      nowMs: 1_700_000_120_000,
    });

    expect(first.idempotencyKey).toBe(retryLater.idempotencyKey);
    expect(first.correlationId).toBe(retryLater.correlationId);
    expect(first.dedupRedisKey).toBe(retryLater.dedupRedisKey);
    expect(first.ttlSeconds).toBe(86_400);
  });

  it('deduplica retries sem externalEventId (ex.: Bitrix24 DEAL update) dentro da mesma janela temporal', () => {
    const baseTime = 1_700_000_100_000;
    const callA = buildDeterministicWebhookIdentity({
      provider: 'bitrix24',
      organizationId: 'org-b24',
      externalEntityId: 'DEAL_42',
      eventType: 'ONCRMDEALUPDATE',
      payloadFingerprint: { stageId: 'WON', amount: 15000, tags: ['enterprise', 'b2b', null] },
      bucketWindowSeconds: 300,
      nowMs: baseTime,
    });

    const callBRetry = buildDeterministicWebhookIdentity({
      provider: 'bitrix24',
      organizationId: 'org-b24',
      externalEntityId: 'DEAL_42',
      eventType: 'ONCRMDEALUPDATE',
      payloadFingerprint: { tags: ['enterprise', 'b2b', null], amount: 15000, stageId: 'WON' },
      bucketWindowSeconds: 300,
      nowMs: baseTime + 15_000,
    });

    expect(callA.idempotencyKey).toBe(callBRetry.idempotencyKey);
    expect(callA.correlationId).toBe(callBRetry.correlationId);
    expect(callA.ttlSeconds).toBe(300);
  });

  it('aplica fallback unknown-entity, serializa primitivos/null e respeita bucketWindowSeconds customizado', () => {
    const withoutEntity = buildDeterministicWebhookIdentity({
      provider: 'generic',
      organizationId: 'org-fallback',
      externalEntityId: '   ',
      eventType: 'CUSTOM_WEBHOOK',
      payloadFingerprint: 'raw-string-fingerprint',
    });

    expect(withoutEntity.correlationId).toContain('generic-inbound-unknown-entity-');
    expect(withoutEntity.ttlSeconds).toBe(300);

    const longWindowWithEvent = buildDeterministicWebhookIdentity({
      provider: 'stripe',
      organizationId: 'org-stripe',
      externalEventId: '  evt_12345  ',
      externalEntityId: null,
      eventType: 'invoice.paid',
      payloadFingerprint: null,
      bucketWindowSeconds: 172_800,
    });

    expect(longWindowWithEvent.ttlSeconds).toBe(172_800);
    expect(longWindowWithEvent.correlationId).toContain('stripe-inbound-unknown-entity-');
  });

  it('isola chaves de deduplicação entre organizações diferentes (multi-tenant isolation)', () => {
    const tenantA = buildDeterministicWebhookIdentity({
      provider: 'bitrix24',
      organizationId: 'org-alpha',
      externalEventId: 'evt-99',
      externalEntityId: 'DEAL_99',
      eventType: 'ONCRMDEALADD',
    });

    const tenantB = buildDeterministicWebhookIdentity({
      provider: 'bitrix24',
      organizationId: 'org-beta',
      externalEventId: 'evt-99',
      externalEntityId: 'DEAL_99',
      eventType: 'ONCRMDEALADD',
    });

    expect(tenantA.idempotencyKey).not.toBe(tenantB.idempotencyKey);
    expect(tenantA.dedupRedisKey).not.toBe(tenantB.dedupRedisKey);
  });

  it('valida circuit breaker FinOps em tempo real para tokens inválidos ou incremento incremental', async () => {
    __resetTokenQuotaCacheForTests();
    expect(normalizeTier('enterprise')).toBe('enterprise');
    expect(normalizeTier('unknown')).toBe('starter');

    const service = new TokenQuotaService();
    await expect(
      service.recordUsage({
        organizationId: '',
        model: 'gpt-4o-mini',
        tokens: 0,
      }),
    ).resolves.toBeUndefined();

    await expect(
      service.recordUsage({
        organizationId: 'org-finops-test',
        model: 'gpt-4o-mini',
        tokens: 250,
        tier: 'pro',
      }),
    ).resolves.toBeUndefined();
  });
});
