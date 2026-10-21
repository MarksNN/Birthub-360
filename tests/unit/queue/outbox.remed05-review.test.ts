import client from 'prom-client';
import { describe, expect, it, vi } from 'vitest';
import { DomainEventMeshService } from '../../../src/lib/queue/domainEventMesh.service.js';
import { InMemoryConsumptionStore, InMemoryOutboxRepository } from '../../../src/lib/queue/outbox/inMemory.js';
import { sanitizeError } from '../../../src/lib/queue/outbox/metrics.js';
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

async function counterValue(name: string) {
  const m = client.register.getSingleMetric(name);
  const v = await m?.get();
  return (v?.values ?? []).reduce((a, x) => a + x.value, 0);
}

describe('PR#32 review (1): publish inline reivindica o lock', () => {
  it('relay concorrente não entrega durante a entrega inline', async () => {
    const repo = new InMemoryOutboxRepository();
    const mesh = new DomainEventMeshService({ outbox: repo });
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const h = vi.fn(async () => {
      await gate;
    });
    mesh.subscribe('DEAL_WON', h, 'crm');
    const pending = mesh.publish(input());
    await new Promise((r) => setImmediate(r));
    const rec = [...repo.records.values()][0];
    expect(rec.status).toBe('PROCESSING');
    expect(rec.lockedBy).toMatch(/^inline-/);
    const relayDispatch = vi.fn(async () => {});
    const relay = new OutboxRelay({ repository: repo, dispatcher: relayDispatch, workerId: 'r' });
    expect(await relay.tick()).toBe(0);
    release();
    await pending;
    expect(relayDispatch).not.toHaveBeenCalled();
    expect(h).toHaveBeenCalledTimes(1);
    expect(repo.records.get(rec.id)?.status).toBe('DISPATCHED');
  });

  it('markDispatched/markFailed exigem o dono do lock', async () => {
    const repo = new InMemoryOutboxRepository();
    const { record } = await repo.append(
      { id: 'o1', eventId: 'e1', eventType: 'DEAL_WON', organizationId: 'org-1', envelope: {} as never, payload: {}, maxAttempts: 3, createdAt: new Date().toISOString() },
      { claimFor: { workerId: 'dono', leaseUntil: new Date(Date.now() + 1000) } },
    );
    await repo.markDispatched(record.id, 'intruso', new Date());
    expect((await repo.findById('o1'))?.status).toBe('PROCESSING');
    await repo.markDispatched(record.id, 'dono', new Date());
    expect((await repo.findById('o1'))?.status).toBe('DISPATCHED');
  });
});

describe('PR#32 review (2): consumo atômico', () => {
  it('duas entregas concorrentes executam o handler uma única vez', async () => {
    const consumptions = new InMemoryConsumptionStore();
    const mesh = new DomainEventMeshService({ consumptions });
    let calls = 0;
    mesh.subscribe(
      'DEAL_WON',
      async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 10));
      },
      'crm',
    );
    const ev = { ...input(), eventId: 'evt-x', occurredAt: new Date().toISOString() };
    const results = await Promise.allSettled([mesh.deliver(ev), mesh.deliver(ev)]);
    expect(calls).toBe(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    await mesh.deliver(ev); // após conclusão: pulado sem erro
    expect(calls).toBe(1);
  });

  it('falha no handler libera a reserva e permite retry', async () => {
    const consumptions = new InMemoryConsumptionStore();
    const mesh = new DomainEventMeshService({ consumptions });
    let fail = true;
    const h = vi.fn(async () => {
      if (fail) throw new Error('x');
    });
    mesh.subscribe('DEAL_WON', h, 'crm');
    const ev = { ...input(), eventId: 'evt-y', occurredAt: new Date().toISOString() };
    await expect(mesh.deliver(ev)).rejects.toThrow('x');
    expect(await consumptions.isCompleted('org-1', 'evt-y', 'crm')).toBe(false);
    fail = false;
    await mesh.deliver(ev);
    expect(h).toHaveBeenCalledTimes(2);
    expect(await consumptions.isCompleted('org-1', 'evt-y', 'crm')).toBe(true);
  });

  it('reserva expirada (processo morto) pode ser assumida', async () => {
    const s = new InMemoryConsumptionStore();
    const k = { organizationId: 'o', eventId: 'e', consumer: 'c' };
    const t0 = new Date();
    expect(await s.reserve({ ...k, owner: 'a', now: t0, leaseMs: 100 })).toBe(true);
    expect(await s.reserve({ ...k, owner: 'b', now: t0, leaseMs: 100 })).toBe(false);
    expect(await s.reserve({ ...k, owner: 'b', now: new Date(t0.getTime() + 200), leaseMs: 100 })).toBe(true);
    await s.complete({ ...k, owner: 'a', now: t0 }); // dono antigo não conclui
    expect(await s.isCompleted('o', 'e', 'c')).toBe(false);
  });
});

describe('PR#32 review (4): DLQ requeue, métrica e retenção', () => {
  it('DLQ incrementa métrica, requeue volta para PENDING e reentrega', async () => {
    const repo = new InMemoryOutboxRepository();
    const mesh = new DomainEventMeshService({ outbox: repo });
    await mesh.publishInTransaction(repo, input(), { maxAttempts: 1 });
    let fail = true;
    const relay = new OutboxRelay({
      repository: repo,
      dispatcher: async () => {
        if (fail) throw new Error('falhou para joao@example.com +55 11 99999-8888');
      },
      workerId: 'w',
      now: () => new Date(Date.now() + 1000),
    });
    const dl0 = await counterValue('domain_event_outbox_dead_letter_total');
    await relay.tick();
    const rec = [...repo.records.values()][0];
    expect(rec.status).toBe('DEAD_LETTER');
    expect(rec.lastError).not.toContain('joao@example.com');
    expect(rec.lastError).not.toContain('99999');
    expect(await counterValue('domain_event_outbox_dead_letter_total')).toBe(dl0 + 1);
    const rq0 = await counterValue('domain_event_outbox_requeued_total');
    expect(await relay.requeueDeadLetters({ organizationId: 'outra-org' })).toBe(0);
    expect(await relay.requeueDeadLetters({ organizationId: 'org-1' })).toBe(1);
    expect(await counterValue('domain_event_outbox_requeued_total')).toBe(rq0 + 1);
    expect(rec.status).toBe('PENDING');
    expect(rec.retryCount).toBe(0);
    fail = false;
    await relay.tick();
    expect(rec.status).toBe('DISPATCHED');
  });

  it('purge remove só registros finalizados além da retenção', async () => {
    const repo = new InMemoryOutboxRepository();
    const mesh = new DomainEventMeshService({ outbox: repo });
    await mesh.publish(input({ aggregateId: 'antigo' }));
    await mesh.publish(input({ aggregateId: 'novo' }));
    await mesh.publishInTransaction(repo, input({ aggregateId: 'pendente' }));
    const [old] = [...repo.records.values()];
    old.dispatchedAt = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const relay = new OutboxRelay({ repository: repo, dispatcher: async () => {} });
    expect(await relay.purgeExpired(30)).toBe(1);
    expect(repo.records.size).toBe(2);
    expect([...repo.records.values()].some((r) => r.status === 'PENDING')).toBe(true);
  });

  it('sanitizeError trunca em 2000', () => {
    expect(sanitizeError(new Error('a'.repeat(5000)))).toHaveLength(2000);
  });
});
