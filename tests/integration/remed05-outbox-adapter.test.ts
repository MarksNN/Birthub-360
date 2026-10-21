/**
 * REMED-05 — integração real do adaptador Prisma/SQL da outbox contra Postgres com a migração
 * 20261020210000_remed05_domain_event_outbox (PR #34) aplicada.
 *
 * Usa um role SEM superuser/BYPASSRLS (OUTBOX_TEST_APP_URL) para que a RLS FORCE seja exercida.
 * Pulado quando OUTBOX_TEST_APP_URL não está definido (ex.: CI antes do merge do #34).
 */
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DomainEventMeshService } from '../../src/lib/queue/domainEventMesh.service.js';
import { OutboxRelay } from '../../src/lib/queue/outbox/outboxRelay.service.js';
import {
  PrismaConsumptionStore,
  PrismaOutboxRepository,
  PrismaOutboxUnitOfWork,
  type SqlExecutor,
  type TenantSqlRunner,
} from '../../src/lib/queue/outbox/prismaOutbox.repository.js';

const APP_URL = process.env.OUTBOX_TEST_APP_URL;
const ADMIN_URL = process.env.OUTBOX_TEST_ADMIN_URL ?? process.env.DATABASE_URL;

function executor(c: pg.PoolClient): SqlExecutor {
  return {
    $queryRawUnsafe: async <T>(q: string, ...v: unknown[]) => (await c.query(q, v)).rows as T,
    $executeRawUnsafe: async (q: string, ...v: unknown[]) => (await c.query(q, v)).rowCount ?? 0,
  };
}

describe.skipIf(!APP_URL)('REMED-05 adaptador Postgres (RLS estrita, #34)', () => {
  let app: pg.Pool;
  let admin: pg.Pool;
  const orgA = `org-remed05-a-${randomUUID()}`;
  const orgB = `org-remed05-b-${randomUUID()}`;

  async function inTenant<T>(org: string, fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    const c = await app.connect();
    try {
      await c.query('BEGIN');
      await c.query("SELECT set_config('app.current_tenant_id', $1, true)", [org]);
      const r = await fn(executor(c));
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }
  const runner: TenantSqlRunner = { runAsTenant: inTenant, listTenants: async () => [orgA, orgB] };
  const input = (org: string) => ({
    eventType: 'DEAL_WON' as const,
    eventVersion: '1.0.0',
    organizationId: org,
    correlationId: 'c',
    producer: 'it',
    aggregateId: 'deal-1',
    payload: { v: 1 },
  });
  const countOutbox = async (org: string) =>
    Number((await inTenant(org, (tx) => tx.$queryRawUnsafe<Array<{ n: string }>>('SELECT count(*) n FROM "DomainEventOutbox"')))[0].n);

  beforeAll(async () => {
    app = new pg.Pool({ connectionString: APP_URL, max: 10 });
    admin = new pg.Pool({ connectionString: ADMIN_URL, max: 2 });
    for (const id of [orgA, orgB]) {
      await admin.query('INSERT INTO "Organization"(id, name, "updatedAt") VALUES ($1,$1, now())', [id]);
    }
  });

  afterAll(async () => {
    await admin.query('DELETE FROM "Organization" WHERE id = ANY($1)', [[orgA, orgB]]);
    await app.end();
    await admin.end();
  });

  it('rollback do caso de uso descarta o evento; commit persiste', async () => {
    const mesh = new DomainEventMeshService();
    const uow = new PrismaOutboxUnitOfWork<SqlExecutor>((fn) => inTenant(orgA, fn));
    await expect(
      mesh.withTransaction(uow, async ({ publish }) => {
        await publish(input(orgA));
        throw new Error('negócio falhou');
      }),
    ).rejects.toThrow('negócio falhou');
    expect(await countOutbox(orgA)).toBe(0);
    await mesh.withTransaction(uow, async ({ publish }) => {
      await publish(input(orgA));
    });
    expect(await countOutbox(orgA)).toBe(1);
  });

  it('RLS: tenant B não enxerga a outbox do tenant A', async () => {
    expect(await countOutbox(orgB)).toBe(0);
  });

  it('dois relays concorrentes não despacham o mesmo registro e o claim respeita o LIMIT', async () => {
    const repo = new PrismaOutboxRepository(runner);
    const mesh = new DomainEventMeshService({ outbox: repo });
    for (let i = 0; i < 12; i++) await mesh.publishInTransaction(repo, input(orgB));
    const seen: string[] = [];
    const dispatcher = async (e: { eventId: string; organizationId: string }) => {
      if (e.organizationId === orgB) seen.push(e.eventId);
      await new Promise((r) => setTimeout(r, 5));
    };
    const claimed = await repo.claimBatch({ workerId: 'probe', limit: 3, now: new Date(), leaseMs: 1, organizationId: orgB });
    expect(claimed).toHaveLength(3);
    await new Promise((r) => setTimeout(r, 20)); // lease de 1ms expira
    const r1 = new OutboxRelay({ repository: repo, dispatcher, workerId: 'r1', batchSize: 5 });
    const r2 = new OutboxRelay({ repository: repo, dispatcher, workerId: 'r2', batchSize: 5 });
    for (let i = 0; i < 4; i++) await Promise.all([r1.tick(), r2.tick()]);
    const pendingB = await inTenant(orgB, (tx) =>
      tx.$queryRawUnsafe<Array<{ status: string; n: string }>>('SELECT status, count(*) n FROM "DomainEventOutbox" GROUP BY status'),
    );
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.length).toBe(12);
    expect(pendingB).toEqual([{ status: 'DISPATCHED', n: '12' }]);
  });

  it('DLQ: falhas usam now() do SQL para nextAttemptAt e terminam em DEAD_LETTER; requeue reabre', async () => {
    const repo = new PrismaOutboxRepository(runner);
    const mesh = new DomainEventMeshService({ outbox: repo });
    const env = await mesh.publishInTransaction(repo, input(orgA), { maxAttempts: 2 });
    const relay = new OutboxRelay({
      repository: repo,
      dispatcher: async () => {
        throw new Error('boom para ana@example.com');
      },
      backoff: { baseMs: 1, maxMs: 1, maxAttempts: 2 },
      workerId: 'dlq',
    });
    await relay.tick();
    const [r1] = await inTenant(orgA, (tx) =>
      tx.$queryRawUnsafe<Array<{ status: string; ok: boolean }>>(
        'SELECT status, ("nextAttemptAt" >= "createdAt") ok FROM "DomainEventOutbox" WHERE "eventId"=$1',
        env.eventId,
      ),
    );
    expect(r1).toEqual({ status: 'FAILED', ok: true });
    await new Promise((r) => setTimeout(r, 20));
    await relay.tick();
    const [r2] = await inTenant(orgA, (tx) =>
      tx.$queryRawUnsafe<Array<{ status: string; retryCount: number; lastError: string }>>(
        'SELECT status, "retryCount", "lastError" FROM "DomainEventOutbox" WHERE "eventId"=$1',
        env.eventId,
      ),
    );
    expect(r2.status).toBe('DEAD_LETTER');
    expect(r2.retryCount).toBe(2);
    expect(r2.lastError).not.toContain('ana@example.com');
    expect(await repo.requeueDeadLetters({ organizationId: orgA })).toBe(1);
  });

  it('unique de consumo: reserva concorrente só vence uma vez; release libera', async () => {
    const store = new PrismaConsumptionStore(runner);
    const k = { organizationId: orgA, eventId: `evt-${randomUUID()}`, consumer: 'crm', owner: 'x', now: new Date(), leaseMs: 1000 };
    const results = await Promise.all(Array.from({ length: 5 }, () => store.reserve(k)));
    expect(results.filter(Boolean)).toHaveLength(1);
    await store.release(k);
    expect(await store.isCompleted(orgA, k.eventId, 'crm')).toBe(false);
    expect(await store.reserve(k)).toBe(true);
    await store.complete(k);
    expect(await store.isCompleted(orgA, k.eventId, 'crm')).toBe(true);
    // RLS: outro tenant não vê o consumo
    expect(await store.isCompleted(orgB, k.eventId, 'crm')).toBe(false);
  });

  it('idempotencyKey: índice parcial único deduplica via ON CONFLICT', async () => {
    const repo = new PrismaOutboxRepository(runner);
    const mesh = new DomainEventMeshService({ outbox: repo });
    const a = await mesh.publishInTransaction(repo, input(orgB), { idempotencyKey: 'k-1' });
    const b = await mesh.publishInTransaction(repo, input(orgB), { idempotencyKey: 'k-1' });
    expect(b.eventId).toBe(a.eventId);
  });

  it('purge usa domain_event_outbox_purge: só DISPATCHED além da retenção, por tenant', async () => {
    const repo = new PrismaOutboxRepository(runner);
    const countDispatched = async () =>
      Number(
        (
          await inTenant(orgB, (tx) =>
            tx.$queryRawUnsafe<Array<{ n: string }>>(`SELECT count(*) n FROM "DomainEventOutbox" WHERE status='DISPATCHED'`),
          )
        )[0].n,
      );
    const before = await countDispatched();
    expect(before).toBeGreaterThan(2);
    await admin.query(
      `UPDATE "DomainEventOutbox" SET "dispatchedAt" = now() - interval '40 days'
        WHERE id IN (SELECT id FROM "DomainEventOutbox" WHERE "organizationId"=$1 AND status='DISPATCHED' LIMIT 2)`,
      [orgB],
    );
    expect(await repo.purge({ dispatchedDays: 30, deadLetterDays: 90, consumptionDays: 30, now: new Date() })).toBe(2);
    expect(await countDispatched()).toBe(before - 2);
  });

  it('eventId é único por organização (mesmo eventId em dois tenants é aceito; repetido no tenant não duplica)', async () => {
    const repo = new PrismaOutboxRepository(runner);
    const base = (org: string) => ({
      id: randomUUID(),
      eventId: 'evt-compartilhado',
      eventType: 'DEAL_WON' as const,
      organizationId: org,
      envelope: { ...input(org), eventId: 'evt-compartilhado', occurredAt: new Date().toISOString() },
      payload: {},
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    });
    expect((await repo.append(base(orgA))).created).toBe(true);
    expect((await repo.append(base(orgB))).created).toBe(true);
    const again = await repo.append(base(orgA));
    expect(again.created).toBe(false);
    expect(again.record.organizationId).toBe(orgA);
  });

  it('claim ordena por nextAttemptAt', async () => {
    const orgC = `org-remed05-c-${randomUUID()}`;
    await admin.query('INSERT INTO "Organization"(id, name, "updatedAt") VALUES ($1,$1, now())', [orgC]);
    try {
      const repo = new PrismaOutboxRepository({ ...runner, listTenants: async () => [orgC] });
      const mesh = new DomainEventMeshService({ outbox: repo });
      const first = await mesh.publishInTransaction(repo, input(orgC));
      const second = await mesh.publishInTransaction(repo, input(orgC));
      // o segundo (criado depois) fica com nextAttemptAt mais antigo
      await admin.query(`UPDATE "DomainEventOutbox" SET "nextAttemptAt" = now() - interval '1 hour' WHERE "eventId"=$1`, [
        second.eventId,
      ]);
      const [claimed] = await repo.claimBatch({ workerId: 'o', limit: 1, now: new Date(), leaseMs: 1000, organizationId: orgC });
      expect(claimed.eventId).toBe(second.eventId);
      expect(claimed.eventId).not.toBe(first.eventId);
    } finally {
      await admin.query('DELETE FROM "Organization" WHERE id=$1', [orgC]);
    }
  });
});
