import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Parecer 24 do PR #62: re-rodar scripts/db/create-app-role.sql depois das migrations devolvia DELETE
 * em `Organization` ao prospector_app (o loop dava DML completo a toda tabela). Este teste estático
 * trava o desenho; o efeito no banco é provado em tests/integration/db-restricted-table-privileges.test.ts.
 */
const sql = readFileSync('scripts/db/create-app-role.sql', 'utf8');
const HOOK = '$db_apply_restricted_table_privileges$';

describe('create-app-role.sql: regime restrito sem DELETE/TRUNCATE para o app', () => {
  it('Organization está na lista única de tabelas sem DELETE, definida antes do loop', () => {
    const m = sql.match(/^SET birthub\.restricted_no_delete_tables = '([^']*)';$/m);
    expect(m).not.toBeNull();
    expect(m![1].split(',')).toContain('Organization');
    expect(m!.index!).toBeLessThan(
      sql.indexOf('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I'),
    );
  });

  it('o loop dá DELETE só fora da lista restrita', () => {
    expect(sql).toMatch(
      /IF r\.relname = ANY \(no_delete\) THEN\s+EXECUTE format\('GRANT SELECT, INSERT, UPDATE ON TABLE public\.%I TO prospector_app'/,
    );
    // Nenhum GRANT com TRUNCATE para o app em lugar nenhum do script.
    expect(sql).not.toMatch(/GRANT[^;]*TRUNCATE[^;]*TO\s+prospector_app/i);
    expect(sql).not.toMatch(/GRANT\s+ALL[^;]*TO\s+prospector_app/i);
  });

  it('o hook db_apply_restricted_table_privileges roda por último: depois do último GRANT amplo, dos defaults e do hook LGPD', () => {
    const hook = sql.indexOf(HOOK);
    expect(hook).toBeGreaterThan(0);
    const body = sql.slice(hook, sql.lastIndexOf(HOOK));
    expect(body).toContain(
      'REVOKE DELETE, TRUNCATE ON TABLE public.%I FROM PUBLIC, prospector_app',
    );
    expect(body).toContain('RAISE EXCEPTION');
    const lastBroad = Math.max(
      ...[/GRANT\s+[A-Z ,]+\s+ON\s+TABLE/g, /GRANT\s+[A-Z ,]+\s+ON\s+TABLES/g].flatMap((re) =>
        [...sql.matchAll(re)].map((m) => m.index ?? -1),
      ),
    );
    expect(hook).toBeGreaterThan(lastBroad);
    expect(hook).toBeGreaterThan(sql.lastIndexOf('lgpd_apply_consent_privileges()'));
    expect(hook).toBeGreaterThan(sql.lastIndexOf('ALTER DEFAULT PRIVILEGES'));
    // Depois do hook não há mais nenhum GRANT.
    const tail = sql.slice(sql.lastIndexOf(HOOK)).replace(/^\s*--.*$/gm, '');
    expect(tail).not.toMatch(/\bGRANT\b/);
  });
});
