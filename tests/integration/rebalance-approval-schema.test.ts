import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';

/**
 * REMED-04 (schema, handoff 04→01): prova contra Postgres real a UNIQUE
 * (organizationId, recommendationId) inclusive sob concorrência, os CHECKs, a RLS e as funções
 * de purge/anonimização com guarda de tenant da sessão.
 */
const ORG_A = 'rebalance-org-a';
const ORG_B = 'rebalance-org-b';
const bypass = <T>(fn: () => Promise<T>) => requestContext.run({ bypassRls: true }, fn);
const asOrg = <T>(org: string, fn: () => Promise<T>) => requestContext.run({ tenantId: org }, fn);

const HASH = 'a'.repeat(64);

const row = (org: string, recommendationId: string, extra: Record<string, unknown> = {}) => ({
  organizationId: org,
  recommendationId,
  leadId: 'lead-1',
  toOwner: 'user-2',
  decision: 'APPROVED',
  noteLength: 13,
  noteHash: HASH,
  decidedBy: 'user-1',
  ...extra,
});

const errorText = (e: unknown) =>
  JSON.stringify(e, Object.getOwnPropertyNames(e as object)) + String(e);

const inTenantTx = <T>(org: string, sql: string, ...params: unknown[]) =>
  asOrg(org, () =>
    prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, org);
      return tx.$queryRawUnsafe<T>(sql, ...params);
    }),
  );

describe('REMED-04 RebalanceApproval schema (Postgres real)', () => {
  beforeEach(async () => {
    await bypass(async () => {
      for (const id of [ORG_A, ORG_B]) {
        await prisma.organization.upsert({ where: { id }, create: { id, name: id }, update: {} });
      }
    });
    for (const org of [ORG_A, ORG_B]) {
      await asOrg(org, () =>
        prisma.rebalanceApproval.deleteMany({ where: { organizationId: org } }),
      );
    }
  });

  it('UNIQUE (org, recommendationId): concorrência grava 1 linha; outro tenant não colide', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        asOrg(ORG_A, () => prisma.rebalanceApproval.create({ data: row(ORG_A, 'rec-1') })),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(4);
    for (const r of rejected) expect(errorText(r.reason)).toContain('P2002');
    expect(await asOrg(ORG_A, () => prisma.rebalanceApproval.count())).toBe(1);

    await asOrg(ORG_B, () => prisma.rebalanceApproval.create({ data: row(ORG_B, 'rec-1') }));
    expect(await asOrg(ORG_B, () => prisma.rebalanceApproval.count())).toBe(1);
  });

  it('RLS: tenant não lê nem grava linhas de outro tenant', async () => {
    await asOrg(ORG_A, () => prisma.rebalanceApproval.create({ data: row(ORG_A, 'rec-a') }));
    const seenByB = await asOrg(ORG_B, () => prisma.rebalanceApproval.findMany());
    expect(seenByB).toHaveLength(0);
    await expect(
      asOrg(ORG_A, () => prisma.rebalanceApproval.create({ data: row(ORG_B, 'rec-x') })),
    ).rejects.toThrow();
  });

  it('CHECKs: decision, noteLength 0..280 e noteHash hex(64) são impostos pelo banco', async () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ['rec-bad-decision', { decision: 'MAYBE' }, 'RebalanceApproval_decision_check'],
      ['rec-bad-len-neg', { noteLength: -1 }, 'RebalanceApproval_noteLength_check'],
      ['rec-bad-len-281', { noteLength: 281 }, 'RebalanceApproval_noteLength_check'],
      ['rec-bad-hash-upper', { noteHash: 'A'.repeat(64) }, 'RebalanceApproval_noteHash_check'],
      ['rec-bad-hash-chars', { noteHash: 'z'.repeat(64) }, 'RebalanceApproval_noteHash_check'],
    ];
    for (const [rec, extra, constraint] of cases) {
      const err = await asOrg(ORG_A, () =>
        prisma.rebalanceApproval.create({ data: row(ORG_A, rec, extra) }),
      ).then(
        () => null,
        (e: unknown) => e,
      );
      expect(errorText(err), `${rec} deveria violar ${constraint}`).toContain(constraint);
    }
    // limites válidos e sem nota
    await asOrg(ORG_A, async () => {
      await prisma.rebalanceApproval.create({ data: row(ORG_A, 'rec-280', { noteLength: 280 }) });
      await prisma.rebalanceApproval.create({
        data: row(ORG_A, 'rec-no-note', { noteLength: null, noteHash: null }),
      });
    });
  });

  it('purge e anonimização: só no tenant da sessão; tenant ausente ou diferente falha', async () => {
    const old = new Date(Date.now() - 400 * 24 * 3600 * 1000);
    await asOrg(ORG_A, async () => {
      await prisma.rebalanceApproval.create({ data: row(ORG_A, 'rec-old', { decidedAt: old }) });
      await prisma.rebalanceApproval.create({ data: row(ORG_A, 'rec-new') });
      await prisma.rebalanceApproval.create({
        data: row(ORG_A, 'rec-other-lead', { leadId: 'lead-2' }),
      });
    });
    await asOrg(ORG_B, () =>
      prisma.rebalanceApproval.create({ data: row(ORG_B, 'rec-b-old', { decidedAt: old }) }),
    );

    await expect(
      inTenantTx(ORG_A, `SELECT rebalance_approval_purge($1, 365)`, ORG_B),
    ).rejects.toThrow(/tenant da sessão/);
    await expect(
      prisma.$transaction((tx) =>
        tx.$queryRawUnsafe(`SELECT rebalance_approval_purge($1, 365)`, ORG_A),
      ),
    ).rejects.toThrow(/tenant da sessão/);
    await expect(
      inTenantTx(ORG_A, `SELECT rebalance_approval_anonymize_lead_notes($1, 'lead-1')`, ORG_B),
    ).rejects.toThrow(/tenant da sessão/);

    const [purged] = await inTenantTx<Array<{ n: bigint }>>(
      ORG_A,
      `SELECT rebalance_approval_purge($1, 365) AS n`,
      ORG_A,
    );
    expect(Number(purged.n)).toBe(1);

    const [anon] = await inTenantTx<Array<{ n: bigint }>>(
      ORG_A,
      `SELECT rebalance_approval_anonymize_lead_notes($1, 'lead-1') AS n`,
      ORG_A,
    );
    expect(Number(anon.n)).toBe(1);

    const left = await asOrg(ORG_A, () =>
      prisma.rebalanceApproval.findMany({
        select: { recommendationId: true, noteLength: true, noteHash: true, noteRef: true },
        orderBy: { recommendationId: 'asc' },
      }),
    );
    expect(left).toEqual([
      { recommendationId: 'rec-new', noteLength: null, noteHash: null, noteRef: null },
      { recommendationId: 'rec-other-lead', noteLength: 13, noteHash: HASH, noteRef: null },
    ]);
    expect(await asOrg(ORG_B, () => prisma.rebalanceApproval.count())).toBe(1);
  });
});
