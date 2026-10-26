/**
 * Agente 15 — B1 do parecer do 24 no PR #107, contra Postgres REAL com as policies REAIS (todas as
 * migrations de prisma/migrations aplicadas) e um role SEM BYPASSRLS, dono das tabelas (o caso da
 * app). Prova que:
 *   - o caminho antigo (bypass sem tenant) via 0 linhas de Contact (policy só de tenant);
 *   - o preflight aborta (fail-closed) sem estimativa global (tabela nunca analisada);
 *   - a rotação muda a chave de Contact das DUAS orgs, de CopilotoTranscriptSegment.text, de
 *     account (bypass) e de Setting, e o --verify com NEW sai 0;
 *   - o --verify detecta linha pendente na chave antiga (código 2);
 *   - Setting com organizationId nulo (fora de qualquer tenant) vira divergência (código 2).
 *
 * Como rodar (nunca contra banco real — só Postgres EFÊMERO):
 *   - RLS_PG_ADMIN_URL=postgres://<superuser>@127.0.0.1:<porta>/postgres  → usa um PG local
 *     descartável (o teste cria e apaga um database e um role próprios);
 *   - ou RUN_INFRA_TESTS=1 (CI: `npm run test:containers`) → sobe um container via testcontainers
 *     (imagem RLS_PG_IMAGE, padrão birthhub360/postgres-intelligence:16, a mesma de postgres.test.ts).
 *   - sem nenhum dos dois: suíte pulada.
 */
import { randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { decryptWithKey, encryptWithKey } from '../../scripts/security/credential-envelope.js';
import { main } from '../../scripts/security/reencrypt-credentials.js';

const ADMIN_URL = process.env.RLS_PG_ADMIN_URL?.trim();
const USE_CONTAINER = !ADMIN_URL && process.env.RUN_INFRA_TESTS === '1';
const suite = ADMIN_URL || USE_CONTAINER ? describe : describe.skip;

const ROOT = join(__dirname, '../..');
const SUFFIX = randomBytes(4).toString('hex');
const ROLE = `rot_owner_${SUFFIX}`;
const DB = `rot_rls_${SUFFIX}`;
const PASSWORD = randomBytes(12).toString('hex');
const OLD = randomBytes(32);
const NEW = randomBytes(32);
const b64 = (b: Buffer) => b.toString('base64');

function withDb(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

async function run<T>(url: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

suite('reencrypt-credentials × Postgres real com RLS (role sem BYPASSRLS)', () => {
  let adminUrl = '';
  let appUrl = '';
  let stopContainer: (() => Promise<unknown>) | undefined;
  const out: string[] = [];
  const log = (l: string) => {
    out.push(l);
    if (process.env.RLS_PG_VERBOSE === '1') console.log(l);
  };
  const argv = (...f: string[]) => ['node', 'reencrypt-credentials.ts', ...f];
  const rotationEnv = () => ({
    DATABASE_URL: appUrl,
    CREDENTIALS_ENCRYPTION_KEY: b64(OLD),
    OLD_KEY: b64(OLD),
    NEW_KEY: b64(NEW),
  });
  const verifyEnv = (k: Buffer) => ({ DATABASE_URL: appUrl, VERIFY_KEY: b64(k) });
  const asAdmin = <T>(fn: (c: pg.Client) => Promise<T>) => run(withDb(adminUrl, DB), fn);
  const asApp = <T>(fn: (c: pg.Client) => Promise<T>) => run(appUrl, fn);
  const analyze = () =>
    asApp(async (c) => {
      for (const t of ['Contact', 'Setting', 'GoogleWorkspaceConnection', 'ThreeCXConnection', 'ExternalCrmConnection']) {
        await c.query(`ANALYZE "${t}"`);
      }
    });

  beforeAll(async () => {
    if (ADMIN_URL) {
      adminUrl = ADMIN_URL;
    } else {
      const { GenericContainer, Wait } = await import('testcontainers');
      const container = await new GenericContainer(
        process.env.RLS_PG_IMAGE ?? 'birthhub360/postgres-intelligence:16',
      )
        .withEnvironment({ POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test', POSTGRES_DB: 'postgres' })
        .withExposedPorts(5432)
        .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
        .start();
      stopContainer = () => container.stop();
      adminUrl = `postgres://test:test@localhost:${container.getMappedPort(5432)}/postgres`;
    }
    await run(adminUrl, async (c) => {
      await c.query(`CREATE ROLE ${ROLE} LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${PASSWORD}'`);
      await c.query(`CREATE DATABASE ${DB} OWNER ${ROLE}`);
    });
    await asAdmin(async (c) => {
      for (const ext of ['vector', 'pg_trgm', 'citext', 'pgcrypto', 'uuid-ossp']) {
        await c.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
      }
    });
    const u = new URL(withDb(adminUrl, DB));
    u.username = ROLE;
    u.password = PASSWORD;
    u.hostname = 'localhost';
    appUrl = u.toString();
    // Migrations aplicadas PELO role da app: ele é o dono das tabelas (FORCE RLS vale para ele).
    const migDir = join(ROOT, 'prisma/migrations');
    const migs = readdirSync(migDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    await asApp(async (c) => {
      for (const m of migs) await c.query(readFileSync(join(migDir, m, 'migration.sql'), 'utf8'));
    });
    // Seed como superusuário (ignora RLS): 2 orgs, dados cifrados com a chave ANTIGA.
    await asAdmin(async (c) => {
      const enc = (s: string) => encryptWithKey(s, OLD);
      for (const org of ['org-a', 'org-b']) {
        await c.query(`INSERT INTO "Organization"(id, name, "updatedAt") VALUES ($1, $1, now())`, [org]);
        await c.query(
          `INSERT INTO "Company"(id, "legalName", "tradeName", "updatedAt", "organizationId") VALUES ($1, 'L', 'T', now(), $2)`,
          [`co-${org}`, org],
        );
        await c.query(
          `INSERT INTO "Contact"(id, name, "companyId", "updatedAt", "organizationId", email, phone) VALUES ($1, 'n', $2, now(), $3, $4, $5)`,
          [`ct-${org}`, `co-${org}`, org, enc(`${org}@x.test`), enc('5511999990000')],
        );
        await c.query(
          `INSERT INTO "BitrixConnection"(id, "organizationId", "webhookUrl", "updatedAt") VALUES ($1, $2, $3, now())`,
          [`bx-${org}`, org, enc('https://x.bitrix24.com/rest/1/y/')],
        );
        await c.query(
          `INSERT INTO "CopilotoConversation"(id, "organizationId", source, "updatedAt") VALUES ($1, $2, 'CALL', now())`,
          [`cv-${org}`, org],
        );
        await c.query(
          `INSERT INTO "CopilotoTranscriptSegment"(id, "organizationId", "conversationId", "startMs", "endMs", text) VALUES ($1, $2, $3, 0, 1, $4)`,
          [`sg-${org}`, org, `cv-${org}`, enc('fala do cliente')],
        );
        await c.query(
          `INSERT INTO "user"(id, name, email, "organizationId", "updatedAt") VALUES ($1, 'u', $2, $3, now())`,
          [`us-${org}`, `${org}@u.test`, org],
        );
        await c.query(
          `INSERT INTO account(id, "accountId", "providerId", "userId", "updatedAt", "accessToken") VALUES ($1, 'a', 'google', $2, now(), $3)`,
          [`ac-${org}`, `us-${org}`, enc('ya29.token')],
        );
        await c.query(
          `INSERT INTO "Setting"(id, key, value, "updatedAt", "organizationId") VALUES ($1, 'integration.trello', $2::jsonb, now(), $3)`,
          [`st-${org}`, JSON.stringify({ apiKey: enc('trello-key'), defaultListId: 'l1' }), org],
        );
      }
    });
  }, 240_000);

  afterAll(async () => {
    if (adminUrl) {
      await run(adminUrl, async (c) => {
        await c.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
        await c.query(`DROP ROLE IF EXISTS ${ROLE}`);
      }).catch(() => undefined);
    }
    await stopContainer?.();
  }, 60_000);

  it('o role é dono, sem BYPASSRLS, e Contact tem FORCE RLS só de tenant', async () => {
    const r = await asApp((c) =>
      c.query(
        `SELECT r.rolsuper, r.rolbypassrls, c.relforcerowsecurity, pg_get_userbyid(c.relowner) AS owner
           FROM pg_roles r, pg_class c WHERE r.rolname = current_user AND c.relname = 'Contact'`,
      ),
    );
    expect(r.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false, relforcerowsecurity: true, owner: ROLE });
  });

  it('regressão: o caminho antigo (bypass on, sem tenant) via 0 Contacts de 2', async () => {
    const n = await asApp(async (c) => {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.bypass_rls', 'on', true), set_config('app.current_tenant_id', '', true)`);
      const r = await c.query('SELECT count(*)::int AS n FROM "Contact"');
      await c.query('ROLLBACK');
      return r.rows[0].n;
    });
    expect(n).toBe(0);
    const real = await asAdmin((c) => c.query('SELECT count(*)::int AS n FROM "Contact"'));
    expect(real.rows[0].n).toBe(2);
  });

  it('preflight fail-closed: sem ANALYZE (reltuples=-1) a rotação lança antes de ler dados', async () => {
    out.length = 0;
    await expect(main(argv(), log, rotationEnv())).rejects.toThrow(/cobertura não provável/);
    expect(out.join('\n')).toContain(`current_user=${ROLE} rolsuper=false rolbypassrls=false`);
    expect(out.join('\n')).toMatch(/ANALYZE "Contact"/);
  });

  it('dry-run → 0 e não grava; apply → 0 e Contact (2 orgs), segmento, account e Setting mudam de chave', async () => {
    await analyze();
    out.length = 0;
    expect(await main(argv(), log, rotationEnv())).toBe(0);
    const before = await asAdmin((c) => c.query('SELECT email FROM "Contact" ORDER BY id'));
    for (const r of before.rows) expect(decryptWithKey(r.email, OLD)).toMatch(/@x\.test$/);

    out.length = 0;
    expect(await main(argv('--apply', '--snapshot-confirmed=ephemeral-test'), log, rotationEnv())).toBe(0);
    const text = out.join('\n');
    expect(text).toMatch(/Processando Model: Contact[\s\S]*?Re-criptografadas: 2/);
    expect(text).toMatch(/Processando Model: CopilotoTranscriptSegment[\s\S]*?Re-criptografadas: 2/);
    expect(text).toMatch(/Processando Model: Account → "account"[\s\S]*?Re-criptografadas: 2/);
    expect(text).not.toContain('[PULADO]');

    const after = await asAdmin(async (c) => ({
      contact: (await c.query('SELECT email, phone FROM "Contact" ORDER BY id')).rows,
      seg: (await c.query('SELECT text FROM "CopilotoTranscriptSegment" ORDER BY id')).rows,
      acc: (await c.query('SELECT "accessToken" FROM account ORDER BY id')).rows,
      set: (await c.query(`SELECT value FROM "Setting" ORDER BY id`)).rows,
    }));
    expect(after.contact.map((r) => decryptWithKey(r.email, NEW))).toEqual(['org-a@x.test', 'org-b@x.test']);
    for (const r of after.contact) expect(decryptWithKey(r.phone, NEW)).toBe('5511999990000');
    for (const r of after.seg) expect(decryptWithKey(r.text, NEW)).toBe('fala do cliente');
    for (const r of after.acc) expect(decryptWithKey(r.accessToken, NEW)).toBe('ya29.token');
    for (const r of after.set) {
      expect(decryptWithKey(r.value.apiKey, NEW)).toBe('trello-key');
      expect(r.value.defaultListId).toBe('l1');
    }
  }, 60_000);

  it('verify NEW → 0; verify OLD → 2 (detecta tudo pendente)', async () => {
    out.length = 0;
    expect(await main(argv('--verify', '--key-env=VERIFY_KEY'), log, verifyEnv(NEW))).toBe(0);
    out.length = 0;
    expect(await main(argv('--verify', '--key-env=VERIFY_KEY'), log, verifyEnv(OLD))).toBe(2);
  });

  it('verify detecta UMA linha pendente na chave antiga (Contact, tenant-only) → 2', async () => {
    await asAdmin((c) =>
      c.query(
        `INSERT INTO "Contact"(id, name, "companyId", "updatedAt", "organizationId", email) VALUES ('ct-pend', 'n', 'co-org-b', now(), 'org-b', $1)`,
        [encryptWithKey('pendente@x.test', OLD)],
      ),
    );
    await analyze();
    out.length = 0;
    expect(await main(argv('--verify', '--key-env=VERIFY_KEY', '--model=Contact'), log, verifyEnv(NEW))).toBe(2);
    expect(out.join('\n')).toMatch(/\[VERIFY\] Contact: legíveis=\d+ ilegíveis=1/);
    out.length = 0;
    // ... e a rotação a pega (idempotente nas já rotacionadas), depois verify volta a 0.
    expect(await main(argv('--model=Contact', '--apply', '--snapshot-confirmed=ephemeral-test'), log, rotationEnv())).toBe(0);
    expect(out.join('\n')).toMatch(/Total linhas: 3 \| Re-criptografadas: 1 \| Puladas: \d+ \| Já em NEW_KEY: 4 \| Erros: 0/);
    expect(await main(argv('--verify', '--key-env=VERIFY_KEY', '--model=Contact'), log, verifyEnv(NEW))).toBe(0);
  }, 60_000);

  it('cobertura: Setting sem organizationId (invisível a todo tenant) → divergência, código 2', async () => {
    await asAdmin((c) =>
      c.query(
        `INSERT INTO "Setting"(id, key, value, "updatedAt", "organizationId") VALUES ('st-orfa', 'integration.trello', $1::jsonb, now(), NULL)`,
        [JSON.stringify({ apiKey: encryptWithKey('k', OLD) })],
      ),
    );
    await analyze();
    out.length = 0;
    expect(await main(argv('--verify', '--key-env=VERIFY_KEY', '--model=Setting'), log, verifyEnv(NEW))).toBe(2);
    expect(out.join('\n')).toMatch(/\[DIVERGÊNCIA\] Setting: soma por org=2 incompatível com pg_class.reltuples=3/);
  });
});
