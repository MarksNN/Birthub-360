/**
 * Agente 15 — Postgres FALSO (em memória) que entende só o SQL gerado por
 * scripts/security/rls-coverage.ts e pelos UPDATEs compare-and-set dos scripts de credenciais.
 * Simula RLS: com `rls` ligado e role sem BYPASSRLS, só as linhas do `app.current_tenant_id`
 * são visíveis (mais todas, se `bypassPolicy` e `app.bypass_rls=on`). GUCs são locais à transação
 * (somem no COMMIT/ROLLBACK). UPDATE em transação READ ONLY lança, como no Postgres.
 * Nada aqui conecta em banco. O comportamento REAL é coberto por
 * tests/container/reencryptCredentialsRls.test.ts (Postgres efêmero com as migrations).
 */
import type { QueryFn } from '../../../../scripts/security/rls-coverage.js';

export type FakeRow = Record<string, unknown> & { id: string };

export interface FakeTable {
  rows: FakeRow[];
  rls?: boolean;
  force?: boolean;
  /** Policy de leitura admite `app.bypass_rls` (padrão: true para tabelas sem organizationId). */
  bypassPolicy?: boolean;
  hasOrg?: boolean;
  /** pg_class.reltuples (padrão: contagem real; -1 = nunca analisada). */
  reltuples?: number;
  canUpdate?: boolean;
}

export interface FakeDbOptions {
  role?: { rolsuper?: boolean; rolbypassrls?: boolean };
  tables: Record<string, FakeTable>;
  /** Chamado antes de cada UPDATE (para simular a app gravando no meio). */
  beforeUpdate?: (table: string, params: unknown[]) => void;
}

export interface Call {
  sql: string;
  params?: unknown[];
  tenant: string;
  bypass: string;
  readOnly: boolean;
  inTx: boolean;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function balanced(s: string): boolean {
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')' && --depth < 0) return false;
  }
  return depth === 0;
}

function stripParens(pred: string): string {
  let p = pred.trim();
  while (p.startsWith('(') && p.endsWith(')') && balanced(p.slice(1, -1))) p = p.slice(1, -1).trim();
  return p;
}

export function createFakeDb(opts: FakeDbOptions) {
  const calls: Call[] = [];
  const role = { rolsuper: false, rolbypassrls: false, ...opts.role };
  const tx = { active: false, readOnly: false, tenant: '', bypass: '' };

  const table = (name: string): FakeTable => {
    const t = opts.tables[name];
    if (!t) throw new Error(`relation "${name}" does not exist`);
    return t;
  };
  const hasOrg = (name: string, t: FakeTable) =>
    t.hasOrg ?? (name !== 'Organization' && name !== 'account');
  const visibleRows = (name: string): FakeRow[] => {
    const t = table(name);
    const rlsOn = t.rls ?? true;
    if (!rlsOn || role.rolsuper || role.rolbypassrls) return t.rows;
    const bypassPolicy = t.bypassPolicy ?? !hasOrg(name, t);
    if (bypassPolicy && tx.bypass === 'on') return t.rows;
    if (name === 'Organization') return t.rows.filter((r) => r.id === tx.tenant);
    if (!hasOrg(name, t)) return [];
    return t.rows.filter((r) => r.organizationId === tx.tenant);
  };

  /** Avalia o WHERE gerado (só os predicados que os scripts usam). */
  const matches = (row: FakeRow, where: string, params: unknown[]): boolean => {
    if (!where) return true;
    const preds = where.split(/ AND /).map(stripParens);
    return preds.every((pred) => {
      let m = /^"?(\w+)"? = \$(\d+)(::jsonb)?$/.exec(pred);
      if (m) {
        const v = params[Number(m[2]) - 1];
        if (m[3]) return JSON.stringify(row[m[1]]) === JSON.stringify(JSON.parse(String(v)));
        return row[m[1]] === v;
      }
      m = /^"?(\w+)"? IS NOT DISTINCT FROM \$(\d+)$/.exec(pred);
      if (m) return (row[m[1]] ?? null) === (params[Number(m[2]) - 1] ?? null);
      m = /^key = ANY\(\$(\d+)::text\[\]\)$/.exec(pred);
      if (m) return (params[Number(m[1]) - 1] as string[]).includes(String(row.key));
      m = /^id > \$(\d+)$/.exec(pred);
      if (m) return String(row.id) > String(params[Number(m[1]) - 1]);
      throw new Error(`fakeRlsDb: predicado não suportado: ${pred}`);
    });
  };

  const query = (async (rawSql: string, params: unknown[] = []) => {
    const sql = norm(rawSql);
    calls.push({ sql, params, tenant: tx.tenant, bypass: tx.bypass, readOnly: tx.readOnly, inTx: tx.active });
    if (sql.startsWith('BEGIN')) {
      tx.active = true;
      tx.readOnly = sql.includes('READ ONLY');
      return { rows: [], rowCount: null };
    }
    if (sql === 'COMMIT' || sql === 'ROLLBACK') {
      Object.assign(tx, { active: false, readOnly: false, tenant: '', bypass: '' });
      return { rows: [], rowCount: null };
    }
    if (sql.startsWith('SELECT set_config(')) {
      if (!tx.active) throw new Error('fakeRlsDb: set_config local fora de transação');
      tx.bypass = String(params[0]);
      tx.tenant = String(params[1]);
      return { rows: [{}], rowCount: 1 };
    }
    if (sql.includes('FROM pg_roles')) {
      return { rows: [{ current_user: 'app_owner', ...role }], rowCount: 1 };
    }
    if (sql.startsWith('SELECT c.relrowsecurity')) {
      const name = String(params[0]);
      const t = opts.tables[name];
      if (!t) return { rows: [], rowCount: 0 };
      const org = hasOrg(name, t);
      const bypassPolicy = t.bypassPolicy ?? !org;
      const qual = bypassPolicy
        ? `(("organizationId" = current_setting('app.current_tenant_id', true)) OR (current_setting('app.bypass_rls', true) = 'on'))`
        : `("organizationId" = current_setting('app.current_tenant_id', true))`;
      return {
        rows: [
          {
            relrowsecurity: t.rls ?? true,
            relforcerowsecurity: t.force ?? true,
            is_owner: true,
            can_select: true,
            can_update: t.canUpdate ?? true,
            has_org: org,
            reltuples: t.reltuples ?? t.rows.length,
            policies: [{ permissive: true, qual }],
          },
        ],
        rowCount: 1,
      };
    }
    if (sql.startsWith('SELECT c.reltuples')) {
      const t = opts.tables[String(params[0])];
      return { rows: t ? [{ reltuples: t.reltuples ?? t.rows.length }] : [], rowCount: t ? 1 : 0 };
    }
    let m = /^SELECT count\(\*\)::bigint AS n FROM "(\w+)"(?: WHERE (.*))?$/.exec(sql);
    if (m) {
      const [, name, where = ''] = m;
      const n = visibleRows(name).filter((r) => matches(r, where, params)).length;
      return { rows: [{ n: String(n) }], rowCount: 1 };
    }
    if (sql === 'SELECT id FROM "Organization" ORDER BY id ASC') {
      const rows = visibleRows('Organization').map((r) => ({ id: r.id }));
      return { rows: [...rows].sort((a, b) => a.id.localeCompare(b.id)), rowCount: rows.length };
    }
    m = /^SELECT (.+) FROM "(\w+)" WHERE (.*) ORDER BY id ASC LIMIT \$(\d+)$/.exec(sql);
    if (m) {
      const [, colList, name, where, limitIdx] = m;
      const cols = colList.split(', ').map((c) => c.replace(/"/g, ''));
      const rows = visibleRows(name)
        .filter((r) => matches(r, where, params))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
        .slice(0, Number(params[Number(limitIdx) - 1]))
        .map((r) => Object.fromEntries(cols.map((c) => [c, structuredClone(r[c])])));
      return { rows, rowCount: rows.length };
    }
    m = /^UPDATE "(\w+)" SET (.+?) WHERE (.*)$/.exec(sql);
    if (m) {
      if (tx.readOnly) throw new Error('cannot execute UPDATE in a read-only transaction');
      const [, name, setList, where] = m;
      opts.beforeUpdate?.(name, params);
      const hit = visibleRows(name).filter((r) => matches(r, where, params));
      for (const r of hit) {
        for (const assign of setList.split(', ')) {
          const a = /^"?(\w+)"? = (?:\$(\d+)(::jsonb)?|NOW\(\))$/.exec(assign);
          if (!a) throw new Error(`fakeRlsDb: SET não suportado: ${assign}`);
          if (!a[2]) continue;
          const v = params[Number(a[2]) - 1];
          r[a[1]] = a[3] ? JSON.parse(String(v)) : v;
        }
      }
      return { rows: [], rowCount: hit.length };
    }
    throw new Error(`fakeRlsDb: SQL não suportado: ${sql}`);
  }) as QueryFn;

  return {
    query,
    calls,
    updates: () => calls.filter((c) => c.sql.startsWith('UPDATE')),
    rows: (name: string) => table(name).rows,
  };
}

/** Organization + linhas por org (atalho). */
export function orgRows(...ids: string[]): FakeRow[] {
  return ids.map((id) => ({ id }));
}
