import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * Parecer 24 do PR #62 (P2-1/P3-2): re-rodar o bootstrap (scripts/db/create-app-role.sql) DEPOIS das
 * migrations não pode devolver DELETE/TRUNCATE em `Organization` ao prospector_app. A migration
 * 20261021000000 revoga uma vez só (fica em `_prisma_migrations`); o script é que precisa manter a
 * exceção a cada re-execução — no loop de grants e no hook final `db_apply_restricted_table_privileges`.
 *
 * Cenário real: migrate deploy → re-bootstrap → has_table_privilege(DELETE/TRUNCATE) = false.
 * O CI (ci.yml) roda o bootstrap, o migrate deploy e um re-bootstrap antes desta suíte, e este teste
 * re-roda o script de novo depois de simular a regressão (grant devolvido, como numa Organization
 * recriada que herda os default privileges). Precisa de BOOTSTRAP_SUPERUSER_URL (superusuário do
 * banco de teste, só no .env.test) e de `psql` no PATH. No CI a ausência FALHA, não pula.
 */
const appUrl = process.env.DATABASE_URL ?? '';
const ownerUrl = process.env.MIGRATOR_DATABASE_URL || process.env.DIRECT_URL || '';
const superUrl = process.env.BOOTSTRAP_SUPERUSER_URL || '';
const isCI = process.env.CI === 'true' || process.env.CI === '1';
const SCRIPT = path.resolve(process.cwd(), 'scripts/db/create-app-role.sql');
const ORG = '"Organization"';
const CONTROL = '"ForecastSnapshot"'; // tabela comum: continua com DELETE (a exceção não vaza)

const canRebootstrap = Boolean(superUrl && ownerUrl);
if (isCI && !canRebootstrap) {
  throw new Error(
    'db-restricted-table-privileges: BOOTSTRAP_SUPERUSER_URL e DIRECT_URL são obrigatórios no CI (o teste de regressão não pode ficar skipped).',
  );
}

const app = new Pool({ connectionString: appUrl });
const owner = canRebootstrap ? new Pool({ connectionString: ownerUrl }) : null;

afterAll(async () => {
  await app.end();
  await owner?.end();
});

function passwordOf(url: string): string {
  return decodeURIComponent(new URL(url).password);
}

/** psql não aceita `?schema=public` (parâmetro do Prisma) na URI. */
function psqlUri(url: string): string {
  const u = new URL(url);
  u.search = '';
  return u.toString();
}

function rerunBootstrap(): void {
  const r = spawnSync(
    'psql',
    [
      psqlUri(superUrl),
      '-X',
      '-q',
      '-v',
      'ON_ERROR_STOP=1',
      '-v',
      `app_password=${passwordOf(appUrl)}`,
      '-v',
      // Mesma senha do migrator que já está em uso: vazio viraria NOLOGIN.
      `migrator_password=${passwordOf(ownerUrl)}`,
      '-f',
      SCRIPT,
    ],
    { encoding: 'utf-8' },
  );
  if (r.error) throw r.error;
  expect(r.status, `psql create-app-role.sql falhou:\n${r.stderr}`).toBe(0);
}

async function privileges(table: string): Promise<Record<string, boolean>> {
  const { rows } = await app.query(
    `SELECT p, has_table_privilege('prospector_app', $1::regclass, p) AS ok
       FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) p`,
    [table],
  );
  return Object.fromEntries(rows.map((r: { p: string; ok: boolean }) => [r.p, r.ok]));
}

const ORG_EXPECTED = { SELECT: true, INSERT: true, UPDATE: true, DELETE: false, TRUNCATE: false };

describe('regime restrito: prospector_app nunca tem DELETE/TRUNCATE em Organization (parecer 24, PR #62)', () => {
  it('estado atual (CI: bootstrap → migrate deploy → re-bootstrap): Organization sem DELETE/TRUNCATE', async () => {
    expect(await privileges(ORG)).toEqual(ORG_EXPECTED);
    expect((await privileges(CONTROL)).DELETE).toBe(true);
    const c = await app.connect();
    try {
      await c.query('BEGIN');
      await expect(c.query(`DELETE FROM ${ORG} WHERE false`)).rejects.toThrow(
        /permission denied for table Organization/,
      );
      await c.query('ROLLBACK');
      await c.query('BEGIN');
      await expect(c.query(`TRUNCATE ${ORG}`)).rejects.toThrow(
        /permission denied for table Organization/,
      );
    } finally {
      await c.query('ROLLBACK').catch(() => {});
      c.release();
    }
  });

  it.runIf(canRebootstrap)(
    'migrate deploy → re-bootstrap (create-app-role.sql) mantém Organization sem DELETE/TRUNCATE',
    async () => {
      rerunBootstrap();
      expect(await privileges(ORG)).toEqual(ORG_EXPECTED);
      expect((await privileges(CONTROL)).DELETE).toBe(true);
      // Re-execução é idempotente: uma segunda rodada dá o mesmo resultado.
      rerunBootstrap();
      expect(await privileges(ORG)).toEqual(ORG_EXPECTED);
    },
    60_000,
  );

  it.runIf(canRebootstrap)(
    'grant devolvido (Organization recriada herda o default com DELETE) é desfeito pelo hook ao re-rodar o bootstrap',
    async () => {
      try {
        await owner!.query(`GRANT DELETE, TRUNCATE ON TABLE ${ORG} TO prospector_app`);
        const drifted = await privileges(ORG);
        expect(drifted.DELETE).toBe(true);
        expect(drifted.TRUNCATE).toBe(true);
        rerunBootstrap();
        expect(await privileges(ORG)).toEqual(ORG_EXPECTED);
      } finally {
        // Nunca deixa a suíte seguinte com o grant, mesmo se o script falhar.
        await owner!.query(`REVOKE DELETE, TRUNCATE ON TABLE ${ORG} FROM prospector_app`);
      }
    },
    60_000,
  );
});
