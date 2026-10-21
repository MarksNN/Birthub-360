import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * REMED-06 v4 (#35) — prova no Postgres real, como papel de app (NOSUPERUSER, não-dono):
 * - v5: app sem DELETE/TRUNCATE em Organization; cadeia/head com FK RESTRICT (só o passo explícito de
 *   retenção do runbook remove a cadeia); demais tabelas LGPD seguem CASCADE.
 * - A2 (parecer 15 do #39): DELETE disparado por trigger (pg_trigger_depth() > 1) SEM a org ter sido
 *   apagada não pula o tombstone nem libera DELETE em tabela append-only.
 * - B/B1: funções LGPD — DEFINER só com search_path fixo e tenant guard; nenhuma com EXECUTE p/ app/PUBLIC.
 * - TenantKeyEnvelope (Agente 21): RLS, sem DELETE, UPDATE só para destruir, imutável após destroyedAt.
 * - Flywheel.leadId → Lead ON DELETE CASCADE.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const RUN = randomUUID().slice(0, 8);
const Z = '0'.repeat(64);

async function tx<T>(
  tenant: string | null,
  fn: (c: PoolClient) => Promise<T>,
  bypass = false,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(`SELECT set_config('app.bypass_rls', $1, TRUE)`, [bypass ? 'on' : 'off']);
    if (tenant) await c.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [tenant]);
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
const mkOrg = (org: string) =>
  tx(
    null,
    async (c) => {
      await c.query(`INSERT INTO "Organization" (id,name,"updatedAt") VALUES ($1,$1,now())`, [org]);
      await c.query(`INSERT INTO "Lead" (id,"organizationId","updatedAt") VALUES ($1,$2,now())`, [
        `lead-${org}`,
        org,
      ]);
    },
    true,
  );
const count = (c: PoolClient, table: string, org: string) =>
  c
    .query(`SELECT count(*)::int n FROM "${table}" WHERE "organizationId"=$1`, [org])
    .then((r) => r.rows[0].n as number);

const LGPD_TABLES = [
  'ConsentAuditRecord',
  'ConsentAuditChainHead',
  'ConsentSubjectKey',
  'ConsentSubjectKeyTombstone',
  'ConsentEventDetail',
  'ConsentPurgeTask',
  'FlywheelApproachRecord',
  'FlywheelFewShotExample',
  'TenantKeyEnvelope',
];

/** Semeia a cadeia completa no client dado (o chamador decide commit/rollback). */
async function seedFullChain(org: string, client?: PoolClient) {
  const run = (fn: (c: PoolClient) => Promise<void>) => (client ? fn(client) : tx(org, fn));
  await run(async (c) => {
    await c.query(
      `INSERT INTO "ConsentAuditRecord" (id,"organizationId","formatVersion",sequence,kind,"subjectRef",purpose,"termsVersion",status,"previousHash","currentHash","occurredAt")
       VALUES ($1,$2,3,0,'GENESIS','genesis','marketing','v1','GRANTED',$3,$4,now()),
              ($5,$2,3,1,'CONSENT',$6,'marketing','v1','GRANTED',$4,$7,now())`,
      [`g-${org}`, org, Z, 'a'.repeat(64), `c-${org}`, `hs256:${'ab'.repeat(32)}`, 'b'.repeat(64)],
    );
    await c.query(
      `INSERT INTO "ConsentEventDetail" ("eventId","organizationId","subjectLookupId",detail) VALUES ($1,$2,$3,'x')`,
      [`c-${org}`, org, 'c'.repeat(64)],
    );
    await c.query(
      `INSERT INTO "ConsentSubjectKey" ("organizationId","lookupId","keyMaterial") VALUES ($1,$2,$3),($1,$4,$3)`,
      [org, 'd'.repeat(64), Buffer.alloc(32, 1), 'e'.repeat(64)],
    );
    await c.query(`DELETE FROM "ConsentSubjectKey" WHERE "lookupId"=$1`, ['e'.repeat(64)]); // gera tombstone
    await c.query(
      `INSERT INTO "ConsentPurgeTask" (id,"organizationId","revocationEventId") VALUES ($1,$2,$3)`,
      [`p-${org}`, org, `c-${org}`],
    );
    await c.query(
      `INSERT INTO "FlywheelApproachRecord" (id,"organizationId","leadId",channel,segment,"approachText","sentAt") VALUES ($1,$2,$3,'email','smb','oi',now())`,
      [`fa-${org}`, org, `lead-${org}`],
    );
    await c.query(
      `INSERT INTO "FlywheelFewShotExample" (id,"organizationId","leadId",channel,segment,"approachText","outcomeStatus","attributionEvidence",confidence,"promotedAt")
       VALUES ($1,$2,$3,'email','smb','oi','WON','{}'::jsonb,0.9,now())`,
      [`fs-${org}`, org, `lead-${org}`],
    );
    await c.query(
      `INSERT INTO "TenantKeyEnvelope" ("organizationId",ciphertext,"cmkId") VALUES ($1,$2,'kms://cmk/1')`,
      [org, Buffer.alloc(48, 7)],
    );
  });
}

describe('REMED-06 v4 — cascata de Organization, A2, inventário de funções, TenantKeyEnvelope', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('v5: Organization com cadeia não sai — app sem DELETE/TRUNCATE em Organization; FKs da cadeia/head RESTRICT; demais LGPD CASCADE', async () => {
    // Cadeia nunca é commitada (com FK RESTRICT ela prenderia a org de teste para sempre).
    const org = `test-lgpd-casc-${RUN}`;
    await mkOrg(org);
    const c = await pool.connect();
    const expectFail = async (sql: string, params: unknown[], re: RegExp) => {
      await c.query('SAVEPOINT s');
      await expect(c.query(sql, params), sql).rejects.toThrow(re);
      await c.query('ROLLBACK TO SAVEPOINT s');
    };
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [org]);
      await seedFullChain(org, c);
      for (const t of [
        'ConsentAuditRecord',
        'ConsentAuditChainHead',
        'ConsentSubjectKeyTombstone',
        'TenantKeyEnvelope',
      ]) {
        await expectFail(
          `DELETE FROM "${t}" WHERE "organizationId"=$1`,
          [org],
          /permission denied|bloqueado|append-only/,
        );
      }
      await c.query(`SELECT set_config('app.bypass_rls', 'on', TRUE)`);
      await expectFail(
        `DELETE FROM "Organization" WHERE id=$1`,
        [org],
        /permission denied for table Organization/,
      );
      await expectFail(`TRUNCATE "Organization" CASCADE`, [], /permission denied/);
      await c.query(`SELECT set_config('app.bypass_rls', 'off', TRUE)`);
      // O marcador do passo de retenção não vale para o app (e ele nem tem DELETE na cadeia).
      await c.query(`SELECT set_config('app.lgpd_chain_retention_org', $1, TRUE)`, [org]);
      await expectFail(
        `DELETE FROM "ConsentAuditRecord" WHERE "organizationId"=$1`,
        [org],
        /permission denied|append-only/,
      );
    } finally {
      await c.query('ROLLBACK').catch(() => {});
      c.release();
    }
    const priv = await pool.query(
      `SELECT has_table_privilege(current_user, 'public."Organization"', 'DELETE') d,
              has_table_privilege(current_user, 'public."Organization"', 'TRUNCATE') t`,
    );
    expect(priv.rows[0]).toEqual({ d: false, t: false });
    // Para QUALQUER papel (migrator/superuser inclusive), apagar org com cadeia falha por FK RESTRICT
    // (provado ao vivo como superuser no PR; aqui, o catálogo). Demais filhos LGPD seguem CASCADE.
    const { rows } = await pool.query(
      `SELECT c.relname AS t, k.confdeltype FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
        WHERE k.contype = 'f' AND k.confrelid = 'public."Organization"'::regclass AND c.relname = ANY($1::text[])`,
      [LGPD_TABLES],
    );
    expect(Object.fromEntries(rows.map((r) => [r.t, r.confdeltype]))).toEqual({
      ConsentAuditRecord: 'r',
      ConsentAuditChainHead: 'r',
      ConsentSubjectKey: 'c',
      ConsentSubjectKeyTombstone: 'c',
      ConsentEventDetail: 'c',
      ConsentPurgeTask: 'c',
      FlywheelApproachRecord: 'c',
      FlywheelFewShotExample: 'c',
      TenantKeyEnvelope: 'c',
    });
  });

  it('A2: DELETE em ConsentSubjectKey disparado por trigger (depth > 1) com a org viva grava tombstone; tombstone/cadeia não liberam DELETE', async () => {
    const org = `test-lgpd-a2-${RUN}`;
    await mkOrg(org);
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [org]);
      const canTemp = (
        await c.query(`SELECT has_database_privilege(current_database(), 'TEMP') ok`)
      ).rows[0].ok as boolean;
      if (!canTemp) {
        // #39 aplicado: o vetor (objeto próprio do app com trigger) nem existe — prova isso.
        await expect(c.query(`CREATE TEMP TABLE evil (x int)`)).rejects.toThrow(
          /permission denied/,
        );
        return;
      }
      const lookup = 'a2'.repeat(32);
      await c.query(
        `INSERT INTO "ConsentSubjectKey" ("organizationId","lookupId","keyMaterial") VALUES ($1,$2,$3)`,
        [org, lookup, Buffer.alloc(32, 2)],
      );
      await c.query(`CREATE TEMP TABLE evil (op text)`);
      await c.query(`CREATE FUNCTION pg_temp.evil_fn() RETURNS trigger LANGUAGE plpgsql AS $f$
        BEGIN EXECUTE NEW.op; RETURN NEW; END $f$`);
      await c.query(
        `CREATE TRIGGER evil_t AFTER INSERT ON pg_temp.evil FOR EACH ROW EXECUTE FUNCTION pg_temp.evil_fn()`,
      );
      await c.query(`INSERT INTO pg_temp.evil VALUES ($1)`, [
        `DELETE FROM public."ConsentSubjectKey" WHERE "lookupId"='${lookup}'`,
      ]);
      expect(
        (await c.query(`SELECT 1 FROM "ConsentSubjectKey" WHERE "lookupId"=$1`, [lookup])).rowCount,
      ).toBe(0);
      expect(
        (await c.query(`SELECT 1 FROM "ConsentSubjectKeyTombstone" WHERE "lookupId"=$1`, [lookup]))
          .rowCount,
      ).toBe(1);
      for (const op of [
        `DELETE FROM public."ConsentSubjectKeyTombstone" WHERE "lookupId"='${lookup}'`,
        `DELETE FROM public."ConsentAuditRecord"`,
        `DELETE FROM public."ConsentAuditChainHead"`,
        `DELETE FROM public."TenantKeyEnvelope"`,
      ]) {
        await c.query('SAVEPOINT s');
        await expect(c.query(`INSERT INTO pg_temp.evil VALUES ($1)`, [op]), op).rejects.toThrow(
          /permission denied|bloqueado|append-only/,
        );
        await c.query('ROLLBACK TO SAVEPOINT s');
      }
    } finally {
      await c.query('ROLLBACK').catch(() => {});
      c.release();
    }
  });

  it('B/B1: funções LGPD — DEFINER com search_path fixo e tenant guard; nenhuma executável por PUBLIC ou pelo app', async () => {
    const { rows } = await pool.query(
      `SELECT p.proname, p.prosecdef, p.proconfig, p.prosrc,
              has_function_privilege(current_user, p.oid, 'EXECUTE') AS app_exec,
              (p.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0)) AS public_exec
         FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
          AND p.proname = ANY($1::text[])`,
      [
        [
          'consent_audit_immutable',
          'consent_chain_head_guard',
          'consent_audit_advance_head',
          'consent_subject_key_tombstone',
          'consent_tombstone_immutable',
          'tenant_key_envelope_guard',
          'lgpd_apply_consent_privileges',
        ],
      ],
    );
    expect(rows).toHaveLength(7);
    for (const r of rows) {
      expect(r.app_exec, `${r.proname} EXECUTE p/ app`).toBe(false);
      expect(r.public_exec, `${r.proname} EXECUTE p/ PUBLIC`).toBe(false);
      expect(r.proconfig ?? [], r.proname).toContain('search_path=pg_catalog, public, pg_temp');
      expect(r.prosrc, `${r.proname} sem atalho pg_trigger_depth isolado`).not.toMatch(
        /IF pg_trigger_depth\(\) > 1 THEN/,
      );
      if (r.prosecdef)
        expect(r.prosrc, `${r.proname} DEFINER sem tenant guard`).toMatch(
          /current_setting\('app\.current_tenant_id'/,
        );
    }
    expect(
      rows
        .filter((r) => r.prosecdef)
        .map((r) => r.proname)
        .sort(),
    ).toEqual(['consent_audit_advance_head', 'consent_subject_key_tombstone']);
  });

  it('TenantKeyEnvelope: RLS A/B, sem DELETE, UPDATE só destrói (ciphertext NULL), imutável depois; CHECK de tombstone', async () => {
    const a = `test-tke-a-${RUN}`;
    const b = `test-tke-b-${RUN}`;
    await mkOrg(a);
    await mkOrg(b);
    try {
      await tx(a, (c) =>
        c.query(
          `INSERT INTO "TenantKeyEnvelope" ("organizationId",ciphertext,"cmkId") VALUES ($1,$2,'cmk-a')`,
          [a, Buffer.alloc(48, 1)],
        ),
      );
      await expect(
        tx(b, (c) =>
          c.query(
            `INSERT INTO "TenantKeyEnvelope" ("organizationId",ciphertext,"cmkId") VALUES ($1,$2,'x')`,
            [a, Buffer.alloc(8, 1)],
          ),
        ),
      ).rejects.toThrow(/row-level security|duplicate/);
      expect(
        (
          await tx(b, (c) =>
            c.query(`SELECT 1 FROM "TenantKeyEnvelope" WHERE "organizationId"=$1`, [a]),
          )
        ).rowCount,
      ).toBe(0);
      expect(
        (
          await tx(b, (c) =>
            c.query(
              `UPDATE "TenantKeyEnvelope" SET "destroyedAt"=now(), ciphertext=NULL WHERE "organizationId"=$1`,
              [a],
            ),
          )
        ).rowCount,
      ).toBe(0);
      await expect(
        tx(b, (c) =>
          c.query(
            `INSERT INTO "TenantKeyEnvelope" ("organizationId",ciphertext,"cmkId") VALUES ($1,NULL,'x')`,
            [b],
          ),
        ),
      ).rejects.toThrow(/tombstone_check/);
      await expect(
        tx(b, (c) =>
          c.query(
            `INSERT INTO "TenantKeyEnvelope" ("organizationId",ciphertext,"cmkId") VALUES ($1,''::bytea,'x')`,
            [b],
          ),
        ),
      ).rejects.toThrow(/tombstone_check/);
      // UPDATE que não é destruição: recusado
      for (const set of [
        `"cmkId"='outra'`,
        `ciphertext=$2`,
        `"destroyedAt"=now()`,
        `"destroyedAt"=now(), ciphertext=NULL, "cmkId"='z'`,
      ]) {
        await expect(
          tx(a, (c) =>
            c.query(
              `UPDATE "TenantKeyEnvelope" SET ${set} WHERE "organizationId"=$1`,
              set.includes('$2') ? [a, Buffer.alloc(8, 3)] : [a],
            ),
          ),
          set,
        ).rejects.toThrow(/só para destruir|tombstone_check/);
      }
      await expect(
        tx(a, (c) => c.query(`DELETE FROM "TenantKeyEnvelope" WHERE "organizationId"=$1`, [a])),
      ).rejects.toThrow(/permission denied/);
      // destruição (crypto-shredding do tenant)
      const d = await tx(a, (c) =>
        c.query(
          `UPDATE "TenantKeyEnvelope" SET "destroyedAt"=now(), ciphertext=NULL WHERE "organizationId"=$1`,
          [a],
        ),
      );
      expect(d.rowCount).toBe(1);
      await expect(
        tx(a, (c) =>
          c.query(`UPDATE "TenantKeyEnvelope" SET "destroyedAt"=now() WHERE "organizationId"=$1`, [
            a,
          ]),
        ),
      ).rejects.toThrow(/destruído é imutável/);
      const row = await tx(a, (c) =>
        c.query(
          `SELECT ciphertext, "destroyedAt" FROM "TenantKeyEnvelope" WHERE "organizationId"=$1`,
          [a],
        ),
      );
      expect(row.rows[0].ciphertext).toBeNull();
      expect(row.rows[0].destroyedAt).not.toBeNull();
    } finally {
      // orgs de teste ficam no banco (v5: o app não apaga Organization)
    }
  });

  it('Flywheel → Lead ON DELETE CASCADE: expurgar o lead expurga approach e few-shot; leadId inexistente é recusado', async () => {
    const org = `test-lgpd-lead-${RUN}`;
    await mkOrg(org);
    try {
      await tx(org, async (c) => {
        await c.query(
          `INSERT INTO "FlywheelApproachRecord" (id,"organizationId","leadId",channel,segment,"approachText","sentAt") VALUES ($1,$2,$3,'email','smb','oi',now())`,
          [`fa-l-${RUN}`, org, `lead-${org}`],
        );
        await c.query(
          `INSERT INTO "FlywheelFewShotExample" (id,"organizationId","leadId",channel,segment,"approachText","outcomeStatus","attributionEvidence",confidence,"promotedAt")
           VALUES ($1,$2,$3,'email','smb','oi','WON','{}'::jsonb,0.9,now())`,
          [`fs-l-${RUN}`, org, `lead-${org}`],
        );
      });
      await expect(
        tx(org, (c) =>
          c.query(
            `INSERT INTO "FlywheelApproachRecord" (id,"organizationId","leadId",channel,segment,"approachText","sentAt") VALUES ($1,$2,'nao-existe','email','smb','oi',now())`,
            [`fa-x-${RUN}`, org],
          ),
        ),
      ).rejects.toThrow(/foreign key/);
      await tx(null, (c) => c.query(`DELETE FROM "Lead" WHERE id=$1`, [`lead-${org}`]), true);
      const n = await tx(
        org,
        async (c) =>
          (await count(c, 'FlywheelApproachRecord', org)) +
          (await count(c, 'FlywheelFewShotExample', org)),
      );
      expect(n).toBe(0);
    } finally {
      // orgs de teste ficam no banco (v5: o app não apaga Organization)
    }
  });
});
