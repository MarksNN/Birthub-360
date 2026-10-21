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
    `INSERT INTO "ConsentAuditRecord" (id,"organizationId","formatVersion",sequence,kind,"subjectRef",purpose,"termsVersion",status,"previousHash","currentHash","occurredAt")
     VALUES ($1,$2,3,$3,'CONSENT','hs256:' || repeat('ab',32),'marketing','v1','GRANTED',$4,$5,now())`,
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

  const CONSENT_INSERT = `INSERT INTO "ConsentAuditRecord" (id,"organizationId","formatVersion",sequence,kind,"subjectRef",purpose,"termsVersion",status,"previousHash","currentHash","occurredAt")
     VALUES ($1,$2,3,$3,'CONSENT','hs256:' || repeat('ab',32),'marketing','v1','GRANTED',$4,$5,now())`;

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
      await expectFail(`TRUNCATE "ConsentAuditRecord" CASCADE`, [], /append-only \(TRUNCATE/);
      const { rows } = await c.query(`SELECT purpose FROM "ConsentAuditRecord" WHERE id=$1`, [id]);
      expect(rows[0]?.purpose).toBe('marketing');
    });
  });

  it('ConsentAuditRecord: CHECK de subjectRef (hs256 obrigatório fora de GENESIS) e reasonCode enum', async () => {
    await inRollback(pool, async (c, as, expectFail) => {
      await as(ORG_A);
      const base = `INSERT INTO "ConsentAuditRecord" (id,"organizationId","formatVersion",sequence,kind,"subjectRef",purpose,"termsVersion",status,"reasonCode","previousHash","currentHash","occurredAt")
        VALUES ($1,$2,3,$3,$4,$5,'p','v1',$6,$7,repeat('0',64),$8,now())`;
      await expectFail(base, [`k1-${RUN}`, ORG_A, 1, 'CONSENT', 'sha256:abc', 'GRANTED', null, `k1${RUN}`.padEnd(64, '0')], /subjectRef_hs256_check/);
      await expectFail(base, [`k2-${RUN}`, ORG_A, 2, 'CONSENT', 'alice@example.com', 'GRANTED', null, `k2${RUN}`.padEnd(64, '0')], /subjectRef_hs256_check/);
      await expectFail(base, [`k3-${RUN}`, ORG_A, 3, 'REVOCATION', `hs256:${'ab'.repeat(32)}`, 'REVOKED', 'texto livre', `k3${RUN}`.padEnd(64, '0')], /invalid input value for enum/);
      // GENESIS sem titular é aceito; reasonCode válido é aceito
      await c.query(base, [`g-${RUN}`, ORG_A, 0, 'GENESIS', 'genesis', 'GRANTED', null, `g${RUN}`.padEnd(64, '0')]);
      await c.query(base, [`r-${RUN}`, ORG_A, 1, 'REVOCATION', `hs256:${'ab'.repeat(32)}`, 'REVOKED', 'ERASURE_REQUEST', `r${RUN}`.padEnd(64, '0')]);
      // UNIQUE é por (organizationId, currentHash): mesmo hash em OUTRA org não colide (sem oráculo cross-tenant)
      await as(ORG_B);
      await c.query(base, [`gb-${RUN}`, ORG_B, 0, 'GENESIS', 'genesis', 'GRANTED', null, `g${RUN}`.padEnd(64, '0')]);
    });
  });

  it('privilégios (sem skip): papel de app NÃO é dono e NÃO tem UPDATE/DELETE/TRUNCATE na cadeia nem DELETE/TRUNCATE no head', async () => {
    const { rows } = await pool.query(
      `SELECT t,
              pg_get_userbyid(c.relowner) = current_user AS is_owner,
              has_table_privilege(current_user, format('%I', t), 'UPDATE') AS upd,
              has_table_privilege(current_user, format('%I', t), 'DELETE') AS del,
              has_table_privilege(current_user, format('%I', t), 'TRUNCATE') AS trn,
              has_table_privilege(current_user, format('%I', t), 'INSERT') AS ins
         FROM unnest(ARRAY['ConsentAuditRecord','ConsentAuditChainHead']) t
         JOIN pg_class c ON c.relname = t AND c.relnamespace = 'public'::regnamespace ORDER BY t`,
    );
    const by = Object.fromEntries(rows.map((r) => [r.t, r]));
    expect(by.ConsentAuditRecord).toMatchObject({ is_owner: false, upd: false, del: false, trn: false, ins: true });
    expect(by.ConsentAuditChainHead).toMatchObject({ is_owner: false, upd: true, del: false, trn: false, ins: true });
  });

  it('triggers (sem skip): habilitados em modo ORIGIN e a função bloqueia DML independentemente de privilégio', async () => {
    const { rows } = await pool.query(
      `SELECT tgname, tgenabled FROM pg_trigger
        WHERE tgrelid IN ('"ConsentAuditRecord"'::regclass, '"ConsentAuditChainHead"'::regclass) AND NOT tgisinternal ORDER BY tgname`,
    );
    expect(rows).toEqual([
      { tgname: 'consent_audit_no_mutation', tgenabled: 'O' },
      { tgname: 'consent_audit_no_truncate', tgenabled: 'O' },
      { tgname: 'consent_chain_head_guard_row', tgenabled: 'O' },
      { tgname: 'consent_chain_head_no_truncate', tgenabled: 'O' },
    ]);
    // Prova comportamental sem conexão de owner: tabela TEMP de propriedade do próprio app (dono +
    // todos os privilégios) com a MESMA função de trigger — o dono continua bloqueado.
    await inRollback(pool, async (c, _as, expectFail) => {
      await c.query(`CREATE TEMP TABLE consent_probe (id int) ON COMMIT DROP`);
      await c.query(`CREATE TRIGGER p BEFORE UPDATE OR DELETE ON consent_probe FOR EACH ROW EXECUTE FUNCTION public.consent_audit_immutable()`);
      await c.query(`CREATE TRIGGER pt BEFORE TRUNCATE ON consent_probe FOR EACH STATEMENT EXECUTE FUNCTION public.consent_audit_immutable()`);
      await c.query(`INSERT INTO consent_probe VALUES (1)`);
      await expectFail(`UPDATE consent_probe SET id = 2`, [], /append-only \(UPDATE/);
      await expectFail(`DELETE FROM consent_probe`, [], /append-only \(DELETE/);
      await expectFail(`TRUNCATE consent_probe`, [], /append-only \(TRUNCATE/);
    });
  });

  it('head: gênese imutável, lastSequence estritamente crescente, DELETE bloqueado; isolado por RLS', async () => {
    await inRollback(pool, async (c, as, expectFail) => {
      await as(ORG_A);
      await c.query(
        `INSERT INTO "ConsentAuditChainHead" ("organizationId","genesisId","genesisHash","lastSequence","lastHash") VALUES ($1,'g',repeat('a',64),1,repeat('b',64))`,
        [ORG_A],
      );
      await c.query(`UPDATE "ConsentAuditChainHead" SET "lastSequence"=2, "lastHash"=repeat('c',64) WHERE "organizationId"=$1`, [ORG_A]);
      await expectFail(`UPDATE "ConsentAuditChainHead" SET "lastSequence"=2 WHERE "organizationId"=$1`, [ORG_A], /só cresce/);
      await expectFail(`UPDATE "ConsentAuditChainHead" SET "genesisHash"=repeat('f',64), "lastSequence"=9 WHERE "organizationId"=$1`, [ORG_A], /imutável/);
      await expectFail(`DELETE FROM "ConsentAuditChainHead" WHERE "organizationId"=$1`, [ORG_A], /permission denied|DELETE bloqueado/);
      await as(ORG_B);
      expect((await c.query(`SELECT 1 FROM "ConsentAuditChainHead" WHERE "organizationId"=$1`, [ORG_A])).rowCount).toBe(0);
    });
  });

  it('ConsentEventDetail / ConsentPurgeTask / ConsentSubjectKey: RLS A/B e DELETE do próprio tenant (expurgo/crypto-shredding)', async () => {
    await inRollback(pool, async (c, as, expectFail) => {
      await as(ORG_A);
      const ev = `ev-${RUN}`;
      await insertConsent(c, ev, ORG_A, 0, `e${RUN}`.padEnd(64, '0'));
      await c.query(
        `INSERT INTO "ConsentEventDetail" ("eventId","organizationId","subjectLookupId",detail,"retentionUntil") VALUES ($1,$2,repeat('1',64),'motivo livre',now() + interval '1 day')`,
        [ev, ORG_A],
      );
      await c.query(`INSERT INTO "ConsentPurgeTask" (id,"organizationId","revocationEventId","subjectRef","nextAttemptAt") VALUES ($1,$2,$3,'hs256:x',now() - interval '1 second')`, [`pt-${RUN}`, ORG_A, ev]);
      await expectFail(`INSERT INTO "ConsentPurgeTask" (id,"organizationId","revocationEventId") VALUES ($1,$2,$3)`, [`pt2-${RUN}`, ORG_A, ev], /unique|duplicate/i);
      await c.query(`INSERT INTO "ConsentSubjectKey" ("organizationId","lookupId","keyMaterial") VALUES ($1,repeat('1',64),$2)`, [ORG_A, Buffer.alloc(32, 7)]);
      const t = await c.query(`SELECT status, attempts FROM "ConsentPurgeTask" WHERE id=$1`, [`pt-${RUN}`]);
      expect(t.rows[0]).toEqual({ status: 'PENDING', attempts: 0 });

      await as(ORG_B);
      for (const tbl of ['ConsentEventDetail', 'ConsentPurgeTask', 'ConsentSubjectKey']) {
        expect((await c.query(`SELECT 1 FROM "${tbl}" WHERE "organizationId"=$1`, [ORG_A])).rowCount, tbl).toBe(0);
        expect((await c.query(`DELETE FROM "${tbl}" WHERE "organizationId"=$1`, [ORG_A])).rowCount, tbl).toBe(0);
      }
      await expectFail(`INSERT INTO "ConsentSubjectKey" ("organizationId","lookupId","keyMaterial") VALUES ($1,repeat('2',64),'\\x00')`, [ORG_A], /row-level security/);

      // Worker sem bypass: itera por organização com app.current_tenant_id
      await as(ORG_A);
      expect((await c.query(`UPDATE "ConsentPurgeTask" SET status='DONE', "subjectRef"=NULL, "completedAt"=now() WHERE status='PENDING' AND "nextAttemptAt" <= now()`)).rowCount).toBe(1);
      expect((await c.query(`DELETE FROM "ConsentEventDetail" WHERE "organizationId"=$1`, [ORG_A])).rowCount).toBe(1);
      expect((await c.query(`DELETE FROM "ConsentSubjectKey" WHERE "organizationId"=$1`, [ORG_A])).rowCount).toBe(1);
      // bypass_rls = on NÃO abre nada (policies sem cláusula de bypass)
      await as(null);
      await c.query(`SELECT set_config('app.bypass_rls', 'on', TRUE)`);
      expect((await c.query(`SELECT 1 FROM "ConsentPurgeTask" WHERE "organizationId"=$1`, [ORG_A])).rowCount).toBe(0);
    });
  });

  it('grants mínimos (Agente 15, sem skip): app não é dono de nenhuma tabela LGPD e só tem os privilégios necessários', async () => {
    const expected: Record<string, string> = {
      ConsentAuditRecord: 'INSERT,SELECT',
      ConsentAuditChainHead: 'INSERT,SELECT,UPDATE',
      ConsentSubjectKey: 'DELETE,INSERT,SELECT',
      ConsentSubjectKeyTombstone: 'SELECT',
      ConsentEventDetail: 'DELETE,INSERT,SELECT',
      ConsentPurgeTask: 'DELETE,INSERT,SELECT,UPDATE',
      FlywheelApproachRecord: 'DELETE,INSERT,SELECT,UPDATE',
      FlywheelFewShotExample: 'DELETE,INSERT,SELECT,UPDATE',
    };
    const { rows } = await pool.query(
      `SELECT t,
              pg_get_userbyid(c.relowner) = current_user AS is_owner,
              array_to_string(ARRAY(SELECT p FROM unnest(ARRAY['DELETE','INSERT','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) p
                                    WHERE has_table_privilege(current_user, format('public.%I', t), p) ORDER BY p), ',') AS privs
         FROM unnest($1::text[]) t
         JOIN pg_class c ON c.relname = t AND c.relnamespace = 'public'::regnamespace`,
      [Object.keys(expected)],
    );
    expect(rows).toHaveLength(Object.keys(expected).length);
    for (const r of rows) {
      expect(r.is_owner, r.t).toBe(false);
      expect(r.privs, r.t).toBe(expected[r.t]);
    }
  });

  it('ConsentSubjectKey: DELETE (crypto-shredding) deixa tombstone sem material de chave; tombstone é append-only e isolado', async () => {
    await inRollback(pool, async (c, as, expectFail) => {
      await as(ORG_A);
      const lookup = `${RUN}`.padEnd(64, 'f');
      await c.query(`INSERT INTO "ConsentSubjectKey" ("organizationId","lookupId","keyMaterial") VALUES ($1,$2,$3)`, [ORG_A, lookup, Buffer.alloc(32, 9)]);
      expect((await c.query(`DELETE FROM "ConsentSubjectKey" WHERE "lookupId"=$1`, [lookup])).rowCount).toBe(1);
      const tomb = await c.query(`SELECT * FROM "ConsentSubjectKeyTombstone" WHERE "lookupId"=$1`, [lookup]);
      expect(tomb.rowCount).toBe(1);
      expect(tomb.rows[0]).toMatchObject({ organizationId: ORG_A, lookupId: lookup });
      expect(Object.keys(tomb.rows[0]).sort()).toEqual(['keyCreatedAt', 'lookupId', 'organizationId', 'shreddedAt', 'shreddedBy']);
      expect((await c.query(`SELECT 1 FROM "ConsentSubjectKey" WHERE "lookupId"=$1`, [lookup])).rowCount).toBe(0);
      await expectFail(`INSERT INTO "ConsentSubjectKeyTombstone" ("organizationId","lookupId","keyCreatedAt") VALUES ($1,$2,now())`, [ORG_A, lookup], /permission denied/);
      await expectFail(`UPDATE "ConsentSubjectKeyTombstone" SET "lookupId"=$1`, [lookup], /permission denied|append-only/);
      await expectFail(`DELETE FROM "ConsentSubjectKeyTombstone"`, [], /permission denied|append-only/);
      await as(ORG_B);
      expect((await c.query(`SELECT 1 FROM "ConsentSubjectKeyTombstone" WHERE "lookupId"=$1`, [lookup])).rowCount).toBe(0);
    });
  });

  it('head: cascata de Organization (offboarding sem cadeia) remove head; DELETE direto não', async () => {
    const org = `test-lgpd-off-${RUN}`;
    await tx(pool, null, (c) => c.query(`INSERT INTO "Organization" (id,name,"updatedAt") VALUES ($1,$1,now())`, [org]), true);
    await tx(pool, org, (c) =>
      c.query(`INSERT INTO "ConsentAuditChainHead" ("organizationId","genesisId","genesisHash","lastSequence","lastHash") VALUES ($1,'g',repeat('a',64),0,repeat('a',64))`, [org]),
    );
    await expect(tx(pool, org, (c) => c.query(`DELETE FROM "ConsentAuditChainHead" WHERE "organizationId"=$1`, [org]))).rejects.toThrow();
    const del = await tx(pool, null, (c) => c.query(`DELETE FROM "Organization" WHERE id=$1`, [org]), true);
    expect(del.rowCount).toBe(1);
  });
});
