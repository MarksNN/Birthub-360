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
          AND relname NOT LIKE 'checkpoint%'   -- LangGraph cria em runtime (exceção documentada)
          AND relkind IN ('r','p','v','m','S','f')
       UNION ALL
       SELECT 'proc', proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proowner = 'prospector_app'::regrole
       UNION ALL
       SELECT 'type', typname FROM pg_type
        WHERE typnamespace = 'public'::regnamespace AND typowner = 'prospector_app'::regrole AND typtype IN ('e','d')`,
    );
    expect(rows).toEqual([]);
    const owner = await pool.query(`SELECT pg_get_userbyid(nspowner) AS o FROM pg_namespace WHERE nspname = 'public'`);
    expect(owner.rows[0].o).toBe('prospector_migrator');
    const tbl = await pool.query(`SELECT pg_get_userbyid(relowner) AS o FROM pg_class WHERE oid = $1::regclass`, [`"${TABLE}"`]);
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
    const policy = await pool.query(`SELECT polname FROM pg_policy WHERE polrelid = $1::regclass LIMIT 1`, [`"${TABLE}"`]);
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
    const state = await pool.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = $1::regclass`, [`"${TABLE}"`]);
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
    expect(acl.S).toMatch(/prospector_app=rwU\//);
  });
});
