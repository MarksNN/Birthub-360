import { describe, expect, it, vi } from 'vitest';
import { DomainEventMeshService } from '../../../src/lib/queue/domainEventMesh.service.js';
import { computeBackoffMs } from '../../../src/lib/queue/outbox/backoff.js';
import { InMemoryConsumptionStore, InMemoryOutboxRepository, InMemoryUnitOfWork } from '../../../src/lib/queue/outbox/inMemory.js';
import { OutboxRelay } from '../../../src/lib/queue/outbox/outboxRelay.service.js';

const input = (over: Record<string, unknown> = {}) => ({
  eventType: 'DEAL_WON' as const,
  eventVersion: '1.0.0',
  organizationId: 'org-1',
  correlationId: 'c',
  producer: 'test',
  aggregateId: 'deal-1',
  payload: { v: 1 },
  ...over,
});

describe('REMED-05 backoff', () => {
  it('cresce exponencialmente, respeita teto e aplica jitter', () => {
    const p = { baseMs: 100, maxMs: 1000, maxAttempts: 5 };
    expect(computeBackoffMs(1, p, () => 0.999)).toBe(99);
    expect(computeBackoffMs(3, p, () => 0.999)).toBe(399);
    expect(computeBackoffMs(10, p, () => 0.999)).toBe(999);
    expect(computeBackoffMs(3, p, () => 0)).toBe(0);
  });
});

describe('REMED-05 outbox transacional', () => {
  it('grava na outbox na mesma transação e não despacha antes do relay', async () => {
    const repo = new InMemoryOutboxRepository();
    const mesh = new DomainEventMeshService({ outbox: repo });
    const h = vi.fn(async () => {});
    mesh.subscribe('DEAL_WON', h, 'crm');
    await mesh.withTransaction(new InMemoryUnitOfWork(repo), async ({ publish }) => {
      await publish(input());
    });
    expect([...repo.records.values()][0].status).toBe('PENDING');
    expect(h).not.toHaveBeenCalled();
    await mesh.createRelay({ workerId: 'w1' }).tick();
    expect(h).toHaveBeenCalledTimes(1);
    expect([...repo.records.values()][0].status).toBe('DISPATCHED');
  });

  it('rollback do caso de uso descarta o evento', async () => {
    const repo = new InMemoryOutboxRepository();
    const mesh = new DomainEventMeshService({ outbox: repo });
    await expect(
      mesh.withTransaction(new InMemoryUnitOfWork(repo), async ({ publish }) => {
        await publish(input());
        throw new Error('falha de negócio');
      }),
    ).rejects.toThrow('falha de negócio');
    expect(repo.records.size).toBe(0);
  });

  it('idempotencyKey do produtor deduplica por organização', async () => {
    const repo = new InMemoryOutboxRepository();
    const mesh = new DomainEventMeshService({ outbox: repo });
    const a = await mesh.publish(input(), { idempotencyKey: 'k1' });
    const b = await mesh.publish(input(), { idempotencyKey: 'k1' });
    await mesh.publish(input({ organizationId: 'org-2' }), { idempotencyKey: 'k1' });
    expect(b.eventId).toBe(a.eventId);
    expect(repo.records.size).toBe(2);
  });
});

describe('REMED-05 relay, retries e dead-letter', () => {
  it('reentrega pula consumidores já concluídos (idempotência durável)', async () => {
    const repo = new InMemoryOutboxRepository();
    const consumptions = new InMemoryConsumptionStore();
    const mesh = new DomainEventMeshService({ outbox: repo, consumptions, backoff: { baseMs: 1, maxMs: 1, maxAttempts: 5 } });
    const ok = vi.fn(async () => {});
    let fail = true;
    const flaky = vi.fn(async () => {
      if (fail) throw new Error('down');
    });
    mesh.subscribe('DEAL_WON', ok, 'ok');
    mesh.subscribe('DEAL_WON', flaky, 'flaky');
    await expect(mesh.publish(input())).rejects.toThrow('down');
    const rec = [...repo.records.values()][0];
    expect(rec.status).toBe('FAILED');
    expect(rec.retryCount).toBe(1);
    fail = false;
    const t = Date.now() + 10_000;
    await mesh.createRelay({ workerId: 'w', now: () => new Date(t) }).tick();
    expect(ok).toHaveBeenCalledTimes(1);
    expect(flaky).toHaveBeenCalledTimes(2);
    expect(repo.records.get(rec.id)?.status).toBe('DISPATCHED');
  });

  it('agenda com backoff e move para DEAD_LETTER ao esgotar tentativas', async () => {
    const repo = new InMemoryOutboxRepository();
    const mesh = new DomainEventMeshService({ outbox: repo });
    await mesh.publishInTransaction(repo, input(), { maxAttempts: 3 });
    let now = new Date(Date.now() + 1000);
    const relay = new OutboxRelay({
      repository: repo,
      dispatcher: async () => {
        throw new Error('boom');
      },
      backoff: { baseMs: 1000, maxMs: 60_000, maxAttempts: 3 },
      now: () => now,
      random: () => 0.5,
      workerId: 'w',
    });
    expect(await relay.tick()).toBe(1);
    const r1 = [...repo.records.values()][0];
    expect(r1.status).toBe('FAILED');
    expect(new Date(r1.nextAttemptAt).getTime() - now.getTime()).toBe(500);
    expect(await relay.tick()).toBe(0); // ainda em backoff
    now = new Date(now.getTime() + 600);
    await relay.tick();
    expect(new Date(r1.nextAttemptAt).getTime() - now.getTime()).toBe(1000);
    now = new Date(now.getTime() + 2000);
    await relay.tick();
    expect(r1.status).toBe('DEAD_LETTER');
    expect(r1.retryCount).toBe(3);
    now = new Date(now.getTime() + 10 ** 9);
    expect(await relay.tick()).toBe(0);
  });

  it('dois relays concorrentes não despacham o mesmo registro (lease)', async () => {
    const repo = new InMemoryOutboxRepository();
    const mesh = new DomainEventMeshService({ outbox: repo });
    await mesh.publishInTransaction(repo, input());
    const d = vi.fn(async () => {});
    const a = new OutboxRelay({ repository: repo, dispatcher: d, workerId: 'a' });
    const b = new OutboxRelay({ repository: repo, dispatcher: d, workerId: 'b' });
    await Promise.all([a.tick(), b.tick()]);
    expect(d).toHaveBeenCalledTimes(1);
  });

  it('lease expirado é reivindicado por outro worker', async () => {
    const repo = new InMemoryOutboxRepository();
    const mesh = new DomainEventMeshService({ outbox: repo });
    await mesh.publishInTransaction(repo, input());
    const now = new Date();
    await repo.claimBatch({ workerId: 'morto', limit: 10, now, leaseMs: 1000 });
    const d = vi.fn(async () => {});
    const r = new OutboxRelay({ repository: repo, dispatcher: d, workerId: 'vivo', now: () => new Date(now.getTime() + 2000) });
    expect(await r.tick()).toBe(1);
    expect([...repo.records.values()][0].status).toBe('DISPATCHED');
  });
});
