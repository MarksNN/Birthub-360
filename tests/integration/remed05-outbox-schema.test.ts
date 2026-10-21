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
             WHERE (status IN ('PENDING','FAILED') AND "nextAttemptAt" <= now())
                OR (status='PROCESSING' AND "lockedUntil" <= now())
             ORDER BY "createdAt" LIMIT 3 FOR UPDATE SKIP LOCKED)
           UPDATE "DomainEventOutbox" o SET status='PROCESSING', "lockedBy"=$1,
             "lockedUntil"=now() + interval '30 seconds'
           FROM due WHERE o.id = due.id
           RETURNING o."eventId"`,
          worker,
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
});
