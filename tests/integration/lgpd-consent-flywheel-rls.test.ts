import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * REMED-06 (handoff 21→01) — prova no Postgres real, via `pg` cru (sem extensão Prisma):
 * - RLS tenant_isolation (ENABLE+FORCE) em ConsentAuditRecord, FlywheelApproachRecord e
 *   FlywheelFewShotExample: B não lê, não altera, não apaga linhas de A; insert cruzado recusado.
 * - ConsentAuditRecord é append-only: UPDATE/DELETE/TRUNCATE bloqueados para o papel de app
 *   (REVOKE + trigger) e também para o owner (trigger), quando OWNER_DATABASE_URL/DIRECT_URL existe.
 * Linhas de consentimento nunca são commitadas (ROLLBACK): append-only impede limpeza.
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ownerUrl = process.env.OWNER_DATABASE_URL ?? process.env.DIRECT_URL;
const ownerPool = ownerUrl ? new Pool({ connectionString: ownerUrl }) : null;

const RUN = randomUUID().slice(0, 8);
const ORG_A = `test-lgpd-a-${RUN}`;
const ORG_B = `test-lgpd-b-${RUN}`;
const hash = (c: string) => c.repeat(64).slice(0, 64);

async function tx<T>(p: Pool, tenant: string | null, fn: (c: PoolClient) => Promise<T>, bypass = false): Promise<T> {
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', $1, TRUE)`, [bypass ? 'on' : 'off']);
    if (tenant) await client.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [tenant]);
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

const insertConsent = (c: PoolClient, id: string, org: string, seq: number, h: string) =>
  c.query(
    `INSERT INTO "ConsentAuditRecord" (id,"organizationId",sequence,kind,"subjectRef",purpose,"termsVersion",status,"previousHash","currentHash","occurredAt")
     VALUES ($1,$2,$3,'CONSENT','sha256:abc','marketing','v1','GRANTED',$4,$5,now())`,
    [id, org, seq, hash('0'), h],
  );
const insertApproach = (c: PoolClient, id: string, org: string) =>
  c.query(
    `INSERT INTO "FlywheelApproachRecord" (id,"organizationId","leadId",channel,segment,"approachText","sentAt")
     VALUES ($1,$2,'lead-1','email','smb','oi',now())`,
    [id, org],
  );
const insertFewShot = (c: PoolClient, id: string, org: string) =>
  c.query(
    `INSERT INTO "FlywheelFewShotExample" (id,"organizationId","leadId",channel,segment,"approachText","outcomeStatus","attributionEvidence",confidence,"promotedAt")
     VALUES ($1,$2,'lead-1','email','smb','oi','WON','{}'::jsonb,0.9,now())`,
    [id, org],
  );

const ids = { approachA: `fa-${RUN}`, fewA: `fs-${RUN}` };

describe('REMED-06 — RLS + append-only (ConsentAuditRecord / Flywheel)', () => {
  beforeAll(async () => {
    await tx(pool, null, async (c) => {
      for (const id of [ORG_A, ORG_B]) {
        await c.query(`INSERT INTO "Organization" (id,name,"updatedAt") VALUES ($1,$1,now()) ON CONFLICT (id) DO NOTHING`, [id]);
      }
    }, true);
    await tx(pool, ORG_A, async (c) => {
      await insertApproach(c, ids.approachA, ORG_A);
      await insertFewShot(c, ids.fewA, ORG_A);
    });
  });

  afterAll(async () => {
    await tx(pool, ORG_A, async (c) => {
      await c.query(`DELETE FROM "FlywheelApproachRecord" WHERE "organizationId"=$1`, [ORG_A]);
      await c.query(`DELETE FROM "FlywheelFewShotExample" WHERE "organizationId"=$1`, [ORG_A]);
    }).catch(() => {});
    await pool.end();
    await ownerPool?.end();
  });

  it('papel de app não é superuser nem BYPASSRLS', async () => {
    const { rows } = await pool.query(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`);
    expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  });

  for (const [table, id] of [
    ['FlywheelApproachRecord', ids.approachA],
    ['FlywheelFewShotExample', ids.fewA],
  ] as const) {
    it(`${table}: A enxerga a própria linha; B não enxerga`, async () => {
      const a = await tx(pool, ORG_A, (c) => c.query(`SELECT id FROM "${table}" WHERE id=$1`, [id]));
      const b = await tx(pool, ORG_B, (c) => c.query(`SELECT id FROM "${table}" WHERE id=$1`, [id]));
      const none = await tx(pool, null, (c) => c.query(`SELECT id FROM "${table}" WHERE id=$1`, [id]));
      expect(a.rowCount).toBe(1);
      expect(b.rowCount).toBe(0);
      expect(none.rowCount).toBe(0);
    });
  }

  it('Flywheel: insert cruzado (B gravando organizationId de A) é recusado', async () => {
    await expect(tx(pool, ORG_B, (c) => insertApproach(c, `x2-${RUN}`, ORG_A))).rejects.toThrow(/row-level security/);
    await expect(tx(pool, ORG_B, (c) => insertFewShot(c, `x3-${RUN}`, ORG_A))).rejects.toThrow(/row-level security/);
  });

  it('Flywheel: B não altera nem apaga linhas de A; A consegue apagar (expurgo LGPD)', async () => {
    for (const [t, id] of [['FlywheelApproachRecord', ids.approachA], ['FlywheelFewShotExample', ids.fewA]] as const) {
      const u = await tx(pool, ORG_B, (c) => c.query(`UPDATE "${t}" SET channel='x' WHERE id=$1`, [id]));
      const d = await tx(pool, ORG_B, (c) => c.query(`DELETE FROM "${t}" WHERE id=$1`, [id]));
      expect(u.rowCount).toBe(0);
      expect(d.rowCount).toBe(0);
    }
    const tmp = `fa-tmp-${RUN}`;
    await tx(pool, ORG_A, (c) => insertApproach(c, tmp, ORG_A));
    const del = await tx(pool, ORG_A, (c) => c.query(`DELETE FROM "FlywheelApproachRecord" WHERE id=$1`, [tmp]));
    expect(del.rowCount).toBe(1);
  });

  /**
   * ConsentAuditRecord é append-only: uma linha commitada não pode mais ser removida (nem pelo
   * teardown global, que apaga Organization — FK Restrict). Por isso estes casos rodam numa ÚNICA
   * transação por papel, com SAVEPOINT para cada erro esperado, e terminam em ROLLBACK.
   */
  async function inRollback(p: Pool, fn: (c: PoolClient, as: (t: string | null) => Promise<void>, expectFail: (sql: string, params: unknown[], re: RegExp) => Promise<void>) => Promise<void>) {
    const c = await p.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.bypass_rls', 'off', TRUE)`);
      const as = async (t: string | null) => {
        await c.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [t ?? '']);
      };
      const expectFail = async (sql: string, params: unknown[], re: RegExp) => {
        await c.query('SAVEPOINT sp');
        let err: unknown = null;
        try {
          await c.query(sql, params);
        } catch (e) {
          err = e;
        }
        await c.query('ROLLBACK TO SAVEPOINT sp');
        expect(err, sql).toBeInstanceOf(Error);
        expect(String((err as Error).message)).toMatch(re);
      };
      await fn(c, as, expectFail);
    } finally {
      await c.query('ROLLBACK').catch(() => {});
      c.release();
    }
  }

  const CONSENT_INSERT = `INSERT INTO "ConsentAuditRecord" (id,"organizationId",sequence,kind,"subjectRef",purpose,"termsVersion",status,"previousHash","currentHash","occurredAt")
     VALUES ($1,$2,$3,'CONSENT','sha256:abc','marketing','v1','GRANTED',$4,$5,now())`;

  it('ConsentAuditRecord (papel de app): RLS isola A/B, insert cruzado recusado, unicidade de sequence, UPDATE/DELETE/TRUNCATE bloqueados', async () => {
    await inRollback(pool, async (c, as, expectFail) => {
      const id = `ca-${RUN}`;
      await as(ORG_A);
      await insertConsent(c, id, ORG_A, 0, `a${RUN}`.padEnd(64, '0'));
      expect((await c.query(`SELECT id FROM "ConsentAuditRecord" WHERE id=$1`, [id])).rowCount).toBe(1);
      await expectFail(CONSENT_INSERT, [`dup-${RUN}`, ORG_A, 0, hash('0'), `d${RUN}`.padEnd(64, '0')], /unique|duplicate/i);
      await expectFail(`UPDATE "ConsentAuditRecord" SET purpose='x' WHERE id=$1`, [id], /permission denied|append-only/);
      await expectFail(`DELETE FROM "ConsentAuditRecord" WHERE id=$1`, [id], /permission denied|append-only/);
      await expectFail(`TRUNCATE "ConsentAuditRecord"`, [], /permission denied|append-only/);

      await as(ORG_B);
      expect((await c.query(`SELECT id FROM "ConsentAuditRecord" WHERE id=$1`, [id])).rowCount).toBe(0);
      await expectFail(CONSENT_INSERT, [`x-${RUN}`, ORG_A, 1, hash('0'), `x${RUN}`.padEnd(64, '0')], /row-level security/);

      await as(null);
      expect((await c.query(`SELECT id FROM "ConsentAuditRecord" WHERE id=$1`, [id])).rowCount).toBe(0);
    });
  });

  it.skipIf(!ownerPool)('ConsentAuditRecord: trigger bloqueia UPDATE/DELETE/TRUNCATE até para o owner/superuser', async () => {
    await inRollback(ownerPool as Pool, async (c, as, expectFail) => {
      const id = `co-${RUN}`;
      await as(ORG_A);
      await insertConsent(c, id, ORG_A, 0, `o${RUN}`.padEnd(64, '0'));
      await expectFail(`UPDATE "ConsentAuditRecord" SET purpose='x' WHERE id=$1`, [id], /append-only \(UPDATE/);
      await expectFail(`DELETE FROM "ConsentAuditRecord" WHERE id=$1`, [id], /append-only \(DELETE/);
      await expectFail(`TRUNCATE "ConsentAuditRecord"`, [], /append-only \(TRUNCATE/);
      const { rows } = await c.query(`SELECT purpose FROM "ConsentAuditRecord" WHERE id=$1`, [id]);
      expect(rows[0]?.purpose).toBe('marketing');
    });
  });
});
