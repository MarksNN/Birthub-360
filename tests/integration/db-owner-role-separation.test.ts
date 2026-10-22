import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * Dívida de segurança (Agente 15): o papel de aplicação NÃO pode ser dono de nada.
 * Dono = pode `ALTER TABLE ... DISABLE/NO FORCE ROW LEVEL SECURITY`, `DROP POLICY`, `DROP TABLE`,
 * `DISABLE TRIGGER` — uma SQL injection desligaria a RLS. Este teste roda como `prospector_app`
 * (DATABASE_URL do CI/local) via `pg` cru e prova que ele só tem DML. O dono é
 * `prospector_migrator` (scripts/db/create-app-role.sql), usado só por `prisma migrate deploy`.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const TABLE = 'ForecastSnapshot'; // tabela tenant-scoped com FORCE RLS
/** Schemas não-sistema (parecer 15 v2: o inventário não pode olhar só `public`). */
const USER_SCHEMAS_SQL = `SELECT oid FROM pg_namespace
  WHERE nspname NOT IN ('pg_catalog','information_schema') AND nspname !~ '^pg_(toast|temp_|toast_temp_)'`;
const NOT_EXTENSION = (cls: string, alias: string) =>
  `NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = '${cls}'::regclass AND d.objid = ${alias}.oid AND d.deptype = 'e')`;

afterAll(async () => {
  await pool.end();
});

async function expectDenied(sql: string) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await expect(c.query(sql), sql).rejects.toThrow(/must be owner|permission denied/);
  } finally {
    await c.query('ROLLBACK').catch(() => {});
    c.release();
  }
}

describe('separação de papéis: prospector_app só DML, prospector_migrator dono', () => {
  it('papel atual é prospector_app: sem superuser, sem BYPASSRLS, sem CREATEROLE/CREATEDB, não herda o migrator', async () => {
    const { rows } = await pool.query(
      `SELECT current_user AS u, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb,
              pg_has_role(current_user, 'prospector_migrator', 'MEMBER') AS member_of_migrator
         FROM pg_roles WHERE rolname = current_user`,
    );
    expect(rows[0]).toEqual({
      u: 'prospector_app',
      rolsuper: false,
      rolbypassrls: false,
      rolcreaterole: false,
      rolcreatedb: false,
      member_of_migrator: false,
    });
  });

  it('prospector_app não é dono do schema public nem de nenhuma tabela/sequence/view/função/tipo do app', async () => {
    const { rows } = await pool.query(
      `SELECT 'schema' AS kind, nspname AS name FROM pg_namespace WHERE nspname = 'public' AND nspowner = 'prospector_app'::regrole
       UNION ALL
       SELECT 'rel', relname FROM pg_class
        WHERE relnamespace = 'public'::regnamespace AND relowner = 'prospector_app'::regrole
          AND relkind IN ('r','p','v','m','S','f')
       UNION ALL
       SELECT 'proc', proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proowner = 'prospector_app'::regrole
       UNION ALL
       SELECT 'type', typname FROM pg_type
        WHERE typnamespace = 'public'::regnamespace AND typowner = 'prospector_app'::regrole AND typtype IN ('e','d','c')`,
    );
    expect(rows).toEqual([]);
    const owner = await pool.query(
      `SELECT pg_get_userbyid(nspowner) AS o FROM pg_namespace WHERE nspname = 'public'`,
    );
    expect(owner.rows[0].o).toBe('prospector_migrator');
    const tbl = await pool.query(
      `SELECT pg_get_userbyid(relowner) AS o FROM pg_class WHERE oid = $1::regclass`,
      [`"${TABLE}"`],
    );
    expect(tbl.rows[0].o).toBe('prospector_migrator');
  });

  it('prospector_app tem DML (SELECT/INSERT/UPDATE/DELETE) e NÃO tem TRUNCATE/REFERENCES/TRIGGER', async () => {
    const { rows } = await pool.query(
      `SELECT p, has_table_privilege(current_user, $1::regclass, p) AS ok
         FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p`,
      [`"${TABLE}"`],
    );
    expect(Object.fromEntries(rows.map((r) => [r.p, r.ok]))).toEqual({
      SELECT: true,
      INSERT: true,
      UPDATE: true,
      DELETE: true,
      TRUNCATE: false,
      REFERENCES: false,
      TRIGGER: false,
    });
  });

  it('prospector_app NÃO consegue desligar RLS, apagar policy/trigger nem fazer DDL em tabelas do migrator', async () => {
    const policy = await pool.query(
      `SELECT polname FROM pg_policy WHERE polrelid = $1::regclass LIMIT 1`,
      [`"${TABLE}"`],
    );
    expect(policy.rowCount).toBe(1);
    for (const sql of [
      `ALTER TABLE "${TABLE}" DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE "${TABLE}" NO FORCE ROW LEVEL SECURITY`,
      `DROP POLICY "${policy.rows[0].polname}" ON "${TABLE}"`,
      `CREATE POLICY allow_all ON "${TABLE}" USING (true)`,
      `ALTER TABLE "${TABLE}" DISABLE TRIGGER ALL`,
      `ALTER TABLE "${TABLE}" ADD COLUMN pwned int`,
      `ALTER TABLE "${TABLE}" OWNER TO prospector_app`,
      `DROP TABLE "${TABLE}"`,
      `TRUNCATE "${TABLE}"`,
      `ALTER SCHEMA public OWNER TO prospector_app`,
      `GRANT prospector_migrator TO prospector_app`,
      `ALTER ROLE prospector_app BYPASSRLS`,
    ]) {
      await expectDenied(sql);
    }
    const state = await pool.query(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = $1::regclass`,
      [`"${TABLE}"`],
    );
    expect(state.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  });

  it('defaults do migrator: toda tabela nova (via migration) já dá DML ao app — nenhuma tabela do migrator sem SELECT', async () => {
    const { rows } = await pool.query(
      `SELECT relname FROM pg_class
        WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','p')
          AND relowner = 'prospector_migrator'::regrole
          AND relname <> '_prisma_migrations'
          AND NOT has_table_privilege(current_user, oid, 'SELECT')`,
    );
    expect(rows).toEqual([]);
    const defs = await pool.query(
      `SELECT defaclobjtype AS t, array_to_string(defaclacl, ',') AS acl FROM pg_default_acl
        WHERE defaclrole = 'prospector_migrator'::regrole AND defaclnamespace = 'public'::regnamespace ORDER BY 1`,
    );
    const acl = Object.fromEntries(defs.rows.map((r) => [r.t, r.acl]));
    expect(acl.r).toMatch(/prospector_app=arwd\//); // SELECT,INSERT,UPDATE,DELETE — sem D(truncate)/x/t
    expect(acl.S).toMatch(/prospector_app=rU\//); // USAGE,SELECT — sem UPDATE (setval)
    expect(acl.f ?? '').not.toMatch(/prospector_app=/); // sem EXECUTE default para o app
  });

  // ─── Parecer 15 do PR #39 ─────────────────────────────────────────────────────────────────
  it('A1/C3: o app não cria NADA — CREATE SCHEMA/TABLE/VIEW/FUNCTION/TYPE e TEMP negados', async () => {
    for (const sql of [
      `CREATE SCHEMA prospector_app`,
      `CREATE SCHEMA IF NOT EXISTS "public"`, // o que PostgresSaver.setup() fazia
      `CREATE TABLE public.pwned (id int)`,
      `CREATE TABLE pwned (id int)`,
      `CREATE TABLE public.checkpoint_pwned (id int)`, // A3: prefixo não é mais exceção
      `CREATE VIEW public."Lead" AS SELECT 1 AS id`,
      `CREATE FUNCTION public.pwned() RETURNS int LANGUAGE sql AS 'SELECT 1'`,
      `CREATE TYPE public.pwned AS ENUM ('x')`,
      `CREATE TEMP TABLE "Lead" (id int)`,
      `CREATE TEMPORARY TABLE pwned_tmp (id int)`,
    ]) {
      await expectDenied(sql);
    }
    const { rows } = await pool.query(
      `SELECT has_database_privilege(current_user, current_database(), 'CREATE') AS db_create,
              has_database_privilege(current_user, current_database(), 'TEMP') AS db_temp,
              has_schema_privilege(current_user, 'public', 'CREATE') AS schema_create,
              current_setting('search_path') AS sp`,
    );
    expect(rows[0]).toEqual({
      db_create: false,
      db_temp: false,
      schema_create: false,
      sp: 'pg_catalog, public',
    });
  });

  it('A2: o app não consegue montar tabela+trigger própria para apagar linhas com pg_trigger_depth() > 1', async () => {
    // Sem CREATE não há tabela nem função própria; sem TRIGGER não há trigger em tabela do migrator.
    await expectDenied(`CREATE TABLE public.checkpoint_x (id int)`);
    await expectDenied(
      `CREATE FUNCTION public.evil() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN DELETE FROM "${TABLE}"; RETURN NULL; END$$`,
    );
    for (const t of [TABLE, 'checkpoints', 'checkpoint_writes']) {
      await expectDenied(
        `CREATE TRIGGER evil AFTER INSERT ON public."${t}" FOR EACH ROW EXECUTE FUNCTION pg_catalog.suppress_redundant_updates_trigger()`,
      );
    }
    // Inventário: nenhum trigger em public pertence a uma tabela que não seja do migrator.
    const trg = await pool.query(
      `SELECT tgname, c.relname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
        WHERE c.relnamespace = 'public'::regnamespace AND NOT t.tgisinternal
          AND c.relowner <> 'prospector_migrator'::regrole`,
    );
    expect(trg.rows).toEqual([]);
  });

  it('A3: tabelas do LangGraph são do migrator (via migration) e o app só tem DML nelas', async () => {
    const { rows } = await pool.query(
      `SELECT relname, pg_get_userbyid(relowner) AS o,
              has_table_privilege(current_user, oid, 'SELECT,INSERT,UPDATE,DELETE') AS dml,
              has_table_privilege(current_user, oid, 'TRUNCATE') OR has_table_privilege(current_user, oid, 'TRIGGER') AS extra
         FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
          AND relname IN ('checkpoints','checkpoint_writes','checkpoint_blobs','checkpoint_migrations') ORDER BY 1`,
    );
    expect(rows).toEqual(
      ['checkpoint_blobs', 'checkpoint_migrations', 'checkpoint_writes', 'checkpoints'].map(
        (relname) => ({
          relname,
          o: 'prospector_migrator',
          dml: true,
          extra: false,
        }),
      ),
    );
  });

  it('toda tabela FORCE RLS é do migrator (nenhuma do app)', async () => {
    const { rows } = await pool.query(
      `SELECT relname, pg_get_userbyid(relowner) AS o FROM pg_class
        WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','p') AND relforcerowsecurity
          AND relowner <> 'prospector_migrator'::regrole`,
    );
    expect(rows).toEqual([]);
  });

  /**
   * B/B1: SECURITY DEFINER revisadas. Cada uma precisa de search_path fixo E de tenant guard
   * explícito (`current_setting('app.current_tenant_id'...)` no corpo) OU estar aqui com motivo.
   * Hoje (main + #39) não há nenhuma; o #35 adiciona as dele com guard.
   */
  const DEFINER_ALLOWLIST_WITHOUT_TENANT_GUARD: Record<string, string> = {};
  /** EXECUTE do app: só estas funções próprias (não-extensão). Funções SECURITY INVOKER por tenant. */
  const APP_EXECUTE_ALLOWLIST: string[] = [
    'rebalance_approval_purge(text,integer)',
    'rebalance_approval_anonymize_lead_notes(text,text)',
  ];

  it('B: inventário de SECURITY DEFINER — search_path fixo e tenant guard (ou allowlist revisada)', async () => {
    const { rows } = await pool.query(
      `SELECT p.oid::regprocedure::text AS sig, p.proconfig, p.prosrc FROM pg_proc p
        WHERE p.pronamespace IN (${USER_SCHEMAS_SQL}) AND p.prosecdef AND ${NOT_EXTENSION('pg_proc', 'p')}`,
    );
    for (const r of rows) {
      expect(r.proconfig ?? [], `${r.sig} sem search_path fixo`).toEqual(
        expect.arrayContaining([expect.stringMatching(/^search_path=/)]),
      );
      const guarded = /current_setting\(\s*'app\.current_tenant_id'/.test(r.prosrc);
      expect(
        guarded || r.sig in DEFINER_ALLOWLIST_WITHOUT_TENANT_GUARD,
        `${r.sig} sem tenant guard`,
      ).toBe(true);
    }
  });

  it('B1: o app só executa funções próprias da allowlist (nada por GRANT ON ALL / default)', async () => {
    const { rows } = await pool.query(
      `SELECT p.oid::regprocedure::text AS sig FROM pg_proc p
        WHERE p.pronamespace IN (${USER_SCHEMAS_SQL}) AND ${NOT_EXTENSION('pg_proc', 'p')}
          AND has_function_privilege(current_user, p.oid, 'EXECUTE') ORDER BY 1`,
    );
    expect(rows.map((r) => r.sig).filter((sig) => !APP_EXECUTE_ALLOWLIST.includes(sig))).toEqual(
      [],
    );
  });

  /**
   * Triggers não internos permitidos, em QUALQUER schema não-sistema (parecer 15 v2, Q1/O3).
   * Chave `schema.tabela:trigger` → função executada. Os do #35 (LGPD) já estão listados; trigger
   * novo exige entrada aqui com revisão (inclusive resíduos criados pelo app antes do rollout,
   * que o loop de posse só transfere para o migrator).
   */
  const TRIGGER_ALLOWLIST: Record<string, string> = {
    'public.ConsentAuditRecord:consent_audit_no_mutation': 'consent_audit_immutable',
    'public.ConsentAuditRecord:consent_audit_no_truncate': 'consent_audit_immutable',
    'public.ConsentAuditRecord:consent_audit_advance_head': 'consent_audit_advance_head',
    'public.ConsentAuditChainHead:consent_chain_head_guard_row': 'consent_chain_head_guard',
    'public.ConsentAuditChainHead:consent_chain_head_no_truncate': 'consent_chain_head_guard',
    'public.ConsentSubjectKey:consent_subject_key_shred_tombstone': 'consent_subject_key_tombstone',
    'public.ConsentSubjectKeyTombstone:consent_tombstone_no_mutation':
      'consent_tombstone_immutable',
    'public.ConsentSubjectKeyTombstone:consent_tombstone_no_truncate':
      'consent_tombstone_immutable',
    'public.TenantKeyEnvelope:tenant_key_envelope_guard_row': 'tenant_key_envelope_guard',
    'public.TenantKeyEnvelope:tenant_key_envelope_no_truncate': 'tenant_key_envelope_guard',
  };

  it('P1: search_path do migrator é só public (pg_catalog implícito, buscado antes)', async () => {
    const { rows } = await pool.query(
      `SELECT rolconfig FROM pg_roles WHERE rolname = 'prospector_migrator'`,
    );
    expect(rows[0].rolconfig).toEqual(['search_path=public']);
  });

  it('P1: nenhuma função ou operador em public (fora de extensão) sombreia o pg_catalog', async () => {
    const { rows } = await pool.query(
      `SELECT 'func ' || p.oid::regprocedure::text AS obj FROM pg_proc p
        WHERE p.pronamespace = 'public'::regnamespace AND ${NOT_EXTENSION('pg_proc', 'p')}
          AND EXISTS (SELECT 1 FROM pg_proc c WHERE c.pronamespace = 'pg_catalog'::regnamespace
                       AND c.proname = p.proname AND c.proargtypes = p.proargtypes)
       UNION ALL
       SELECT 'op ' || o.oid::regoperator::text FROM pg_operator o
        WHERE o.oprnamespace = 'public'::regnamespace AND ${NOT_EXTENSION('pg_operator', 'o')}
          AND EXISTS (SELECT 1 FROM pg_operator c WHERE c.oprnamespace = 'pg_catalog'::regnamespace
                       AND c.oprname = o.oprname AND c.oprleft = o.oprleft AND c.oprright = o.oprright)`,
    );
    expect(rows).toEqual([]);
  });

  it('inventário de triggers: todo trigger não interno de schema não-sistema está na allowlist', async () => {
    const { rows } = await pool.query(
      `SELECT n.nspname || '.' || c.relname || ':' || t.tgname AS k, f.proname AS fn
         FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_proc f ON f.oid = t.tgfoid
        WHERE NOT t.tgisinternal AND c.relnamespace IN (${USER_SCHEMAS_SQL}) ORDER BY 1`,
    );
    const unexpected = rows.filter((r) => TRIGGER_ALLOWLIST[r.k] !== r.fn);
    expect(unexpected).toEqual([]);
  });

  it('Q2: o app não tem CREATE em nenhum schema e não é membro de nenhum papel', async () => {
    const { rows } = await pool.query(
      `SELECT nspname FROM pg_namespace WHERE has_schema_privilege(current_user, oid, 'CREATE')`,
    );
    expect(rows).toEqual([]);
    const m = await pool.query(
      `SELECT r.rolname FROM pg_auth_members am JOIN pg_roles r ON r.oid = am.roleid
        WHERE am.member = (SELECT oid FROM pg_roles WHERE rolname = current_user)`,
    );
    expect(m.rows).toEqual([]);
  });

  it('C: inventário de grants a PUBLIC — banco sem CREATE/TEMP, schema public sem nada, funções próprias sem EXECUTE, default de funções sem PUBLIC', async () => {
    const { rows } = await pool.query(
      `SELECT 'database' AS obj, a.privilege_type AS p FROM pg_database d, aclexplode(d.datacl) a
        WHERE d.datname = current_database() AND a.grantee = 0 AND a.privilege_type <> 'CONNECT'
       UNION ALL
       SELECT 'schema public', a.privilege_type FROM pg_namespace n, aclexplode(n.nspacl) a
        WHERE n.nspname = 'public' AND a.grantee = 0
       UNION ALL
       SELECT 'rel ' || c.relname, a.privilege_type FROM pg_class c, aclexplode(c.relacl) a
        WHERE c.relnamespace = 'public'::regnamespace AND a.grantee = 0
       UNION ALL
       SELECT 'func ' || p.oid::regprocedure::text, 'EXECUTE' FROM pg_proc p
        WHERE p.pronamespace = 'public'::regnamespace
          AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
          AND (p.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0))`,
    );
    expect(rows).toEqual([]);
    // Default global do migrator para funções: existe e não inclui PUBLIC ("=X/").
    const def = await pool.query(
      `SELECT array_to_string(defaclacl, ',') AS acl FROM pg_default_acl
        WHERE defaclrole = 'prospector_migrator'::regrole AND defaclnamespace = 0 AND defaclobjtype = 'f'`,
    );
    expect(def.rowCount).toBe(1);
    expect(def.rows[0].acl).not.toMatch(/(^|,)=X/);
  });
});
