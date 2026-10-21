import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';

/**
 * REMED-05 (schema, handoff 16→01): prova contra Postgres real que as tabelas da outbox
 * suportam isolamento RLS, o único parcial de idempotência, o único de consumo e o claim
 * concorrente com FOR UPDATE SKIP LOCKED (sem que dois workers peguem a mesma linha).
 * Claim via CTE: a forma `WHERE id IN (SELECT ... LIMIT n FOR UPDATE SKIP LOCKED)` do handoff
 * devolveu MAIS que n linhas neste Postgres (subquery reavaliada) — o adaptador deve usar a CTE.
 */
const ORG_A = 'remed05-org-a';
const ORG_B = 'remed05-org-b';
const bypass = <T>(fn: () => Promise<T>) => requestContext.run({ bypassRls: true }, fn);
const asOrg = <T>(org: string, fn: () => Promise<T>) => requestContext.run({ tenantId: org }, fn);

const row = (org: string, eventId: string, idempotencyKey: string | null = null) => ({
  organizationId: org,
  eventId,
  eventType: 'DEAL_RISK_SPIKED',
  aggregateId: 'deal-1',
  correlationId: 'corr-1',
  producer: 'test',
  idempotencyKey,
  envelope: { eventId },
});

describe('REMED-05 outbox schema (Postgres real)', () => {
  beforeEach(async () => {
    await bypass(async () => {
      for (const id of [ORG_A, ORG_B]) {
        await prisma.organization.upsert({ where: { id }, create: { id, name: id }, update: {} });
      }
    });
    for (const org of [ORG_A, ORG_B]) {
      await asOrg(org, async () => {
        await prisma.domainEventOutbox.deleteMany({ where: { organizationId: org } });
        await prisma.domainEventConsumption.deleteMany({ where: { organizationId: org } });
      });
    }
  });

  it('RLS: tenant só vê/escreve suas linhas', async () => {
    await asOrg(ORG_A, () => prisma.domainEventOutbox.create({ data: row(ORG_A, 'evt-a1') }));
    await asOrg(ORG_B, () => prisma.domainEventOutbox.create({ data: row(ORG_B, 'evt-b1') }));
    const seenByA = await asOrg(ORG_A, () =>
      prisma.domainEventOutbox.findMany({ select: { eventId: true } }),
    );
    expect(seenByA.map((r) => r.eventId)).toEqual(['evt-a1']);
    await expect(
      asOrg(ORG_A, () => prisma.domainEventOutbox.create({ data: row(ORG_B, 'evt-x') })),
    ).rejects.toThrow();
  });

  it('único parcial (organizationId, idempotencyKey) só quando a chave não é nula', async () => {
    await asOrg(ORG_A, async () => {
      await prisma.domainEventOutbox.create({ data: row(ORG_A, 'evt-1', 'k1') });
      await expect(
        prisma.domainEventOutbox.create({ data: row(ORG_A, 'evt-2', 'k1') }),
      ).rejects.toThrow();
      await prisma.domainEventOutbox.create({ data: row(ORG_A, 'evt-3', null) });
      await prisma.domainEventOutbox.create({ data: row(ORG_A, 'evt-4', null) });
    });
    // mesma chave em outro tenant é permitida
    await asOrg(ORG_B, () => prisma.domainEventOutbox.create({ data: row(ORG_B, 'evt-5', 'k1') }));
  });

  it('claim concorrente FOR UPDATE SKIP LOCKED não entrega a mesma linha a dois workers', async () => {
    await asOrg(ORG_A, async () => {
      for (let i = 0; i < 6; i++) {
        await prisma.domainEventOutbox.create({ data: row(ORG_A, `evt-c${i}`) });
      }
    });
    const claim = (worker: string) =>
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, ORG_A);
        const rows = await tx.$queryRawUnsafe<Array<{ eventId: string }>>(
          `WITH due AS (
             SELECT id FROM "DomainEventOutbox"
             WHERE "organizationId" = $2
               AND status IN ('PENDING','FAILED') AND "nextAttemptAt" <= now()
             ORDER BY "nextAttemptAt" LIMIT 3 FOR UPDATE SKIP LOCKED)
           UPDATE "DomainEventOutbox" o SET status='PROCESSING', "lockedBy"=$1,
             "lockedUntil"=now() + interval '30 seconds'
           FROM due WHERE o.id = due.id
           RETURNING o."eventId"`,
          worker,
          ORG_A,
        );
        await new Promise((r) => setTimeout(r, 200)); // segura o lock enquanto o outro worker roda
        return rows.map((r) => r.eventId);
      });
    const [w1, w2] = await Promise.all([
      asOrg(ORG_A, () => claim('w1')),
      asOrg(ORG_A, () => claim('w2')),
    ]);
    expect(w1).toHaveLength(3);
    expect(w2).toHaveLength(3);
    expect(new Set([...w1, ...w2]).size).toBe(6);
  });

  it('consumo idempotente: ON CONFLICT DO NOTHING mantém uma linha por (org, evento, consumidor)', async () => {
    const insert = () =>
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, ORG_A);
        return tx.$executeRawUnsafe(
          `INSERT INTO "DomainEventConsumption" ("organizationId","eventId","consumer")
           VALUES ($1,'evt-1','c1') ON CONFLICT DO NOTHING`,
          ORG_A,
        );
      });
    expect(await asOrg(ORG_A, insert)).toBe(1);
    expect(await asOrg(ORG_A, insert)).toBe(0);
  });

  it('eventId é único por tenant (não global) e CHECKs de retry/maxAttempts/lastError valem', async () => {
    await asOrg(ORG_A, () => prisma.domainEventOutbox.create({ data: row(ORG_A, 'evt-same') }));
    await asOrg(ORG_B, () => prisma.domainEventOutbox.create({ data: row(ORG_B, 'evt-same') }));
    await expect(
      asOrg(ORG_A, () => prisma.domainEventOutbox.create({ data: row(ORG_A, 'evt-same') })),
    ).rejects.toThrow();
    for (const bad of [
      { retryCount: -1 },
      { maxAttempts: 0, retryCount: 0 },
      { retryCount: 9, maxAttempts: 8 },
      { lastError: 'x'.repeat(2001) },
    ]) {
      await expect(
        asOrg(ORG_A, () =>
          prisma.domainEventOutbox.create({
            data: { ...row(ORG_A, `evt-bad-${JSON.stringify(bad).length}`), ...bad },
          }),
        ),
      ).rejects.toThrow();
    }
  });

  it('plano de relay por organização usa o índice parcial relay_due', async () => {
    const plan = await asOrg(ORG_A, () =>
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, ORG_A);
        await tx.$executeRawUnsafe(`SET LOCAL enable_seqscan = off`);
        return tx.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
          `EXPLAIN SELECT id FROM "DomainEventOutbox"
           WHERE "organizationId" = '${ORG_A}' AND status IN ('PENDING','FAILED')
             AND "nextAttemptAt" <= now()
           ORDER BY "nextAttemptAt" LIMIT 3 FOR UPDATE SKIP LOCKED`,
        );
      }),
    );
    expect(plan.map((r) => r['QUERY PLAN']).join('\n')).toContain('DomainEventOutbox_relay_due_idx');
  });

  it('purge por tenant remove só DISPATCHED/DEAD_LETTER/consumo vencidos do próprio tenant', async () => {
    const old = new Date(Date.now() - 100 * 24 * 3600 * 1000);
    await asOrg(ORG_A, async () => {
      await prisma.domainEventOutbox.create({
        data: { ...row(ORG_A, 'd-old'), status: 'DISPATCHED', dispatchedAt: old },
      });
      await prisma.domainEventOutbox.create({
        data: { ...row(ORG_A, 'd-new'), status: 'DISPATCHED', dispatchedAt: new Date() },
      });
      await prisma.domainEventOutbox.create({
        data: { ...row(ORG_A, 'dlq-old'), status: 'DEAD_LETTER', createdAt: old },
      });
      await prisma.domainEventOutbox.create({
        data: { ...row(ORG_A, 'pending-old'), status: 'PENDING', createdAt: old },
      });
      await prisma.domainEventConsumption.create({
        data: { organizationId: ORG_A, eventId: 'd-old', consumer: 'c', processedAt: old },
      });
    });
    await asOrg(ORG_B, () =>
      prisma.domainEventOutbox.create({
        data: { ...row(ORG_B, 'b-old'), status: 'DISPATCHED', dispatchedAt: old },
      }),
    );

    const purge = (org: string, target: string) =>
      asOrg(org, () =>
        prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, org);
          return tx.$queryRawUnsafe<
            Array<{ dispatched_deleted: bigint; dead_letter_deleted: bigint; consumption_deleted: bigint }>
          >(`SELECT * FROM domain_event_outbox_purge($1)`, target);
        }),
      );

    // não pode purgar outro tenant
    await expect(purge(ORG_A, ORG_B)).rejects.toThrow();

    const [res] = await purge(ORG_A, ORG_A);
    expect(Number(res.dispatched_deleted)).toBe(1);
    expect(Number(res.dead_letter_deleted)).toBe(1);
    expect(Number(res.consumption_deleted)).toBe(1);
    const left = await asOrg(ORG_A, () =>
      prisma.domainEventOutbox.findMany({ select: { eventId: true }, orderBy: { eventId: 'asc' } }),
    );
    expect(left.map((r) => r.eventId)).toEqual(['d-new', 'pending-old']);
    expect(await asOrg(ORG_B, () => prisma.domainEventOutbox.count())).toBe(1);
  });
});
