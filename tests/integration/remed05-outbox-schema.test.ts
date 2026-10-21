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
          `INSERT INTO "DomainEventConsumption" ("organizationId","eventId","consumer","reservedBy","reservedUntil")
           VALUES ($1,'evt-1','c1','w1', now() + interval '1 minute') ON CONFLICT DO NOTHING`,
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
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ['evt-bad-retry-neg', { retryCount: -1 }, 'DomainEventOutbox_retryCount_check'],
      [
        'evt-bad-max-zero',
        { maxAttempts: 0, retryCount: 0 },
        'DomainEventOutbox_maxAttempts_check',
      ],
      [
        'evt-bad-retry-gt-max',
        { retryCount: 9, maxAttempts: 8 },
        'DomainEventOutbox_retry_le_max_check',
      ],
      [
        'evt-bad-last-error',
        { lastError: 'x'.repeat(2001) },
        'DomainEventOutbox_lastError_len_check',
      ],
    ];
    for (const [eventId, bad, constraint] of cases) {
      const err = await asOrg(ORG_A, () =>
        prisma.domainEventOutbox.create({ data: { ...row(ORG_A, eventId), ...bad } }),
      ).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err, `${eventId} deveria violar ${constraint}`).not.toBeNull();
      const detail = JSON.stringify(err, Object.getOwnPropertyNames(err as object)) + String(err);
      expect(detail, `${eventId} deveria violar ${constraint}`).toContain(constraint);
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
    expect(plan.map((r) => r['QUERY PLAN']).join('\n')).toContain(
      'DomainEventOutbox_relay_due_idx',
    );
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
        data: {
          organizationId: ORG_A,
          eventId: 'd-old',
          consumer: 'c',
          reservedBy: 'w',
          reservedUntil: old,
          completedAt: old,
        },
      });
      // reserva antiga NÃO concluída: nunca é purgada (precisa ser retomada)
      await prisma.domainEventConsumption.create({
        data: {
          organizationId: ORG_A,
          eventId: 'd-open',
          consumer: 'c',
          reservedBy: 'w',
          reservedUntil: old,
        },
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
            Array<{
              dispatched_deleted: bigint;
              dead_letter_deleted: bigint;
              consumption_deleted: bigint;
            }>
          >(`SELECT * FROM domain_event_outbox_purge($1)`, target);
        }),
      );

    // não pode purgar outro tenant
    await expect(purge(ORG_A, ORG_B)).rejects.toThrow(/tenant da sessão/);
    // sessão sem tenant setado também falha (IS DISTINCT FROM, não passa com NULL)
    await expect(
      prisma.$transaction((tx) =>
        tx.$queryRawUnsafe(`SELECT * FROM domain_event_outbox_purge($1)`, ORG_A),
      ),
    ).rejects.toThrow(/tenant da sessão/);

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

  it('lease de consumo: reserva, expira e é retomada; concluído nunca é retomado', async () => {
    const tx = <T>(fn: (t: typeof prisma) => Promise<T>) =>
      asOrg(ORG_A, () =>
        prisma.$transaction(async (t) => {
          await t.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, ORG_A);
          return fn(t as unknown as typeof prisma);
        }),
      );
    // SQL de reserva do handoff 16 (ON CONFLICT ... DO UPDATE ... WHERE não concluído e vencido)
    const reserve = (eventId: string, worker: string, leaseSeconds: number) =>
      tx((t) =>
        t.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO "DomainEventConsumption" ("organizationId","eventId","consumer","reservedBy","reservedUntil")
           VALUES ($1,$2,'c1',$3, now() + make_interval(secs => $4))
           ON CONFLICT ("organizationId","eventId","consumer") DO UPDATE
             SET "reservedBy" = EXCLUDED."reservedBy", "reservedUntil" = EXCLUDED."reservedUntil"
           WHERE "DomainEventConsumption"."completedAt" IS NULL
             AND "DomainEventConsumption"."reservedUntil" < now()
           RETURNING id`,
          ORG_A,
          eventId,
          worker,
          leaseSeconds,
        ),
      );
    const complete = (eventId: string, worker: string) =>
      tx((t) =>
        t.$executeRawUnsafe(
          `UPDATE "DomainEventConsumption" SET "completedAt" = now()
           WHERE "organizationId"=$1 AND "eventId"=$2 AND consumer='c1' AND "reservedBy"=$3`,
          ORG_A,
          eventId,
          worker,
        ),
      );

    // reserva válida bloqueia outro worker
    expect(await reserve('e-lease', 'w1', 60)).toHaveLength(1);
    expect(await reserve('e-lease', 'w2', 60)).toHaveLength(0);

    // simula crash: lease expira → outro worker retoma
    await tx((t) =>
      t.$executeRawUnsafe(
        `UPDATE "DomainEventConsumption" SET "reservedUntil" = now() - interval '1 second'
         WHERE "organizationId"=$1 AND "eventId"='e-lease'`,
        ORG_A,
      ),
    );
    expect(await reserve('e-lease', 'w2', 60)).toHaveLength(1);
    // dono antigo não consegue mais concluir; o novo sim
    expect(await complete('e-lease', 'w1')).toBe(0);
    expect(await complete('e-lease', 'w2')).toBe(1);

    // concluído + lease vencida: NÃO é retomado
    await tx((t) =>
      t.$executeRawUnsafe(
        `UPDATE "DomainEventConsumption" SET "reservedUntil" = now() - interval '1 hour'
         WHERE "organizationId"=$1 AND "eventId"='e-lease'`,
        ORG_A,
      ),
    );
    expect(await reserve('e-lease', 'w3', 60)).toHaveLength(0);

    // CHECK: lease sem dono é rejeitada pelo banco
    const err = await asOrg(ORG_A, () =>
      prisma.domainEventConsumption.create({
        data: {
          organizationId: ORG_A,
          eventId: 'e-noowner',
          consumer: 'c1',
          reservedUntil: new Date(),
        },
      }),
    ).then(
      () => null,
      (e: unknown) => e,
    );
    expect(JSON.stringify(err, Object.getOwnPropertyNames(err as object)) + String(err)).toContain(
      'DomainEventConsumption_lease_owner_check',
    );

    // CHECK: consumo não concluído sem lease é rejeitado (nunca seria retomado)
    const noLease = await asOrg(ORG_A, () =>
      prisma.domainEventConsumption.create({
        data: { organizationId: ORG_A, eventId: 'e-nolease', consumer: 'c1', reservedBy: 'w1' },
      }),
    ).then(
      () => null,
      (e: unknown) => e,
    );
    expect(
      JSON.stringify(noLease, Object.getOwnPropertyNames(noLease as object)) + String(noLease),
    ).toContain('DomainEventConsumption_unfinished_has_lease_check');

    // fluxo do adaptador do 16 (0c658192): complete grava completedAt e zera reservedUntil — permitido
    expect(await reserve('e-adapter', 'w9', 60)).toHaveLength(1);
    const completed = await tx((t) =>
      t.$executeRawUnsafe(
        `UPDATE "DomainEventConsumption" SET "completedAt"=now(), "processedAt"=now(), "reservedUntil"=NULL
         WHERE "organizationId"=$1 AND "eventId"='e-adapter' AND consumer='c1' AND "reservedBy"='w9' AND "completedAt" IS NULL`,
        ORG_A,
      ),
    );
    expect(completed).toBe(1);
    expect(await reserve('e-adapter', 'w10', 60)).toHaveLength(0);

    // reclaim por tenant usa o índice parcial
    const plan = await tx(async (t) => {
      await t.$executeRawUnsafe(`SET LOCAL enable_seqscan = off`);
      return t.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
        `EXPLAIN SELECT id FROM "DomainEventConsumption"
         WHERE "organizationId" = '${ORG_A}' AND "completedAt" IS NULL AND "reservedUntil" < now()`,
      );
    });
    expect(plan.map((r) => r['QUERY PLAN']).join('\n')).toContain(
      'DomainEventConsumption_lease_reclaim_idx',
    );
  });
});
