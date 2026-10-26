// scripts/security/rls-coverage.ts
//
// Varredura de tabelas com RLS para os scripts de credenciais (reencrypt-credentials.ts e
// backfill-integration-settings-encryption.ts) — com COBERTURA PROVADA, fail-closed.
//
// Por que existe (PR #107, B1 do Agente 24): a rotação lia os models com `app.bypass_rls=on` e SEM
// tenant. Contact, GoogleWorkspaceConnection, ThreeCXConnection, ExternalCrmConnection e Setting
// têm FORCE RLS com policy só de tenant (sem cláusula de bypass) — então, com um role sem
// BYPASSRLS (o caso real: o dono das tabelas, como a app), o SELECT devolvia 0 linhas, o script
// saía 0, o VERIFY dava OK e Contact continuava inteiro na chave ANTIGA.
//
// Agora:
// 1. PREFLIGHT (antes de qualquer leitura de dados ou gravação, logado): current_user, rolsuper,
//    rolbypassrls e, por tabela-alvo, existência, relrowsecurity/relforcerowsecurity, se a RLS se
//    aplica a este role, se a policy de leitura admite `app.bypass_rls`, se há `organizationId`,
//    privilégios e reltuples. O que não dá para provar ABORTA com código 1 (tabela inexistente,
//    sem privilégio, escopo impossível, estimativa ausente).
// 2. Models com `organizationId` são processados ORGANIZAÇÃO POR ORGANIZAÇÃO, cada uma numa
//    transação com `set_config('app.bypass_rls','off',true)` + `set_config('app.current_tenant_id',
//    orgId, true)` — mesmo GUC/padrão das policies e do runInTransaction de src/lib/prisma.ts.
//    Organizações são listadas com bypass, que a policy de Organization admite (allowlist de
//    bypass, migration 20260825120000) — o mesmo caminho de backfill-contact-pii.ts.
// 3. COBERTURA: por org e por model, as linhas processadas são comparadas com um count(*)
//    independente sob o mesmo tenant (e, se a RLS se aplica, o count(*) só pela policy tem de bater
//    com o filtro explícito por organizationId). No fim, a soma por org é comparada com uma
//    contagem GLOBAL: exata se o role ignora RLS ou a policy admite bypass; senão a estimativa de
//    pg_class.reltuples (exige ANALYZE recente — ver runbook). Qualquer divergência → código 2.

export type SqlResult<R> = { rows: R[]; rowCount?: number | null };
export type QueryFn = <R = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => Promise<SqlResult<R>>;
export type Log = (line: string) => void;

/** Cobertura não provável antes de começar — o main converte em código 1 (nada lido/gravado). */
export class CoverageNotProvableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoverageNotProvableError';
  }
}

export function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Identificador inválido: ${name}`);
  return `"${name}"`;
}

/**
 * `org`: tabela com `organizationId`, processada por organização sob o tenant.
 * `bypass`: tabela SEM `organizationId` (hoje só `account`), lida numa transação com
 * `app.bypass_rls=on` — só aceita se o role ignora RLS ou se a policy admite o bypass.
 */
export type TenantScope = 'org' | 'bypass';

export interface TableTarget {
  model: string;
  table: string;
  scope: TenantScope;
}

export const ORGANIZATION_TARGET: TableTarget = {
  model: 'Organization',
  table: 'Organization',
  scope: 'bypass',
};

export type GlobalCountMode = 'exact' | 'exact-bypass' | 'estimate';

export interface RoleInfo {
  currentUser: string;
  rolsuper: boolean;
  rolbypassrls: boolean;
}

export interface TableInfo {
  model: string;
  table: string;
  scope: TenantScope;
  exists: boolean;
  rowSecurity: boolean;
  forceRowSecurity: boolean;
  isOwner: boolean;
  /** A RLS filtra as leituras DESTE role nesta tabela. */
  rlsApplies: boolean;
  /** Policies de leitura admitem `app.bypass_rls` (alguma permissiva e todas as restritivas). */
  policyAdmitsBypass: boolean;
  hasOrgColumn: boolean;
  canSelect: boolean;
  canUpdate: boolean;
  reltuples: number;
  globalMode: GlobalCountMode;
}

export interface Preflight {
  role: RoleInfo;
  organization: TableInfo;
  tables: Map<string, TableInfo>;
}

const BYPASS_GUC = 'app.bypass_rls';

interface RawTableRow {
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
  is_owner: boolean;
  can_select: boolean;
  can_update: boolean;
  has_org: boolean;
  reltuples: number | string;
  policies: Array<{ permissive: boolean; qual: string | null }> | null;
}

async function inspectTable(q: QueryFn, role: RoleInfo, target: TableTarget): Promise<TableInfo> {
  const { rows } = await q<RawTableRow>(
    `SELECT c.relrowsecurity, c.relforcerowsecurity,
            pg_has_role(current_user, c.relowner, 'USAGE') AS is_owner,
            has_table_privilege(c.oid, 'SELECT') AS can_select,
            has_table_privilege(c.oid, 'UPDATE') AS can_update,
            EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid
                      AND a.attname = 'organizationId' AND NOT a.attisdropped) AS has_org,
            c.reltuples,
            (SELECT json_agg(json_build_object('permissive', p.polpermissive,
                                               'qual', pg_get_expr(p.polqual, p.polrelid)))
               FROM pg_policy p
              WHERE p.polrelid = c.oid AND p.polcmd IN ('r', '*')) AS policies
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = current_schema() AND c.relname = $1 AND c.relkind IN ('r', 'p')`,
    [target.table],
  );
  const r = rows[0];
  if (!r) {
    return {
      ...target,
      exists: false,
      rowSecurity: false,
      forceRowSecurity: false,
      isOwner: false,
      rlsApplies: false,
      policyAdmitsBypass: false,
      hasOrgColumn: false,
      canSelect: false,
      canUpdate: false,
      reltuples: -1,
      globalMode: 'estimate',
    };
  }
  const policies = r.policies ?? [];
  const mentions = (p: { qual: string | null }) => (p.qual ?? '').includes(BYPASS_GUC);
  const permissive = policies.filter((p) => p.permissive);
  const restrictive = policies.filter((p) => !p.permissive);
  const policyAdmitsBypass = permissive.some(mentions) && restrictive.every(mentions);
  const ignoresRls = role.rolsuper || role.rolbypassrls;
  const rlsApplies =
    Boolean(r.relrowsecurity) && !ignoresRls && (Boolean(r.relforcerowsecurity) || !r.is_owner);
  return {
    ...target,
    exists: true,
    rowSecurity: Boolean(r.relrowsecurity),
    forceRowSecurity: Boolean(r.relforcerowsecurity),
    isOwner: Boolean(r.is_owner),
    rlsApplies,
    policyAdmitsBypass,
    hasOrgColumn: Boolean(r.has_org),
    canSelect: Boolean(r.can_select),
    canUpdate: Boolean(r.can_update),
    reltuples: Number(r.reltuples),
    globalMode: !rlsApplies ? 'exact' : policyAdmitsBypass ? 'exact-bypass' : 'estimate',
  };
}

function describe(t: TableInfo): string {
  if (!t.exists) return `[PREFLIGHT] ${t.model} → "${t.table}": NÃO EXISTE`;
  return (
    `[PREFLIGHT] ${t.model} → "${t.table}": escopo=${t.scope} rls=${t.rowSecurity} force=${t.forceRowSecurity} ` +
    `rls_se_aplica=${t.rlsApplies} policy_admite_bypass=${t.policyAdmitsBypass} organizationId=${t.hasOrgColumn} ` +
    `select=${t.canSelect} update=${t.canUpdate} reltuples=${t.reltuples} contagem_global=${t.globalMode}`
  );
}

/**
 * Preflight fail-closed. `write` = vai gravar (apply) — exige UPDATE. Lança
 * CoverageNotProvableError (código 1) listando TODOS os problemas, antes de ler qualquer dado.
 */
export async function runPreflight(
  q: QueryFn,
  targets: readonly TableTarget[],
  { write, log }: { write: boolean; log: Log },
): Promise<Preflight> {
  const { rows } = await q<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>(
    `SELECT current_user AS current_user, r.rolsuper, r.rolbypassrls
       FROM pg_roles r WHERE r.rolname = current_user`,
  );
  const r0 = rows[0];
  if (!r0) throw new CoverageNotProvableError('Preflight: role atual não encontrado em pg_roles.');
  const role: RoleInfo = {
    currentUser: r0.current_user,
    rolsuper: Boolean(r0.rolsuper),
    rolbypassrls: Boolean(r0.rolbypassrls),
  };
  log(
    `[PREFLIGHT] current_user=${role.currentUser} rolsuper=${role.rolsuper} rolbypassrls=${role.rolbypassrls}`,
  );
  const organization = await inspectTable(q, role, ORGANIZATION_TARGET);
  log(describe(organization));
  const problems: string[] = [];
  if (!organization.exists || !organization.canSelect) {
    problems.push('Organization inexistente ou sem SELECT — impossível listar as organizações.');
  } else if (organization.rlsApplies && !organization.policyAdmitsBypass) {
    problems.push(
      'Organization: a policy não admite app.bypass_rls e o role não ignora RLS — não há como listar TODAS as organizações.',
    );
  }
  const tables = new Map<string, TableInfo>();
  for (const target of targets) {
    const t = await inspectTable(q, role, target);
    tables.set(target.model, t);
    log(describe(t));
    if (!t.exists) {
      problems.push(
        `${t.model}: tabela "${t.table}" não existe (schema divergente ou mapeamento @@map errado) — antes era "[PULADO]" em silêncio.`,
      );
      continue;
    }
    if (!t.canSelect) problems.push(`${t.model}: role sem SELECT em "${t.table}".`);
    if (write && !t.canUpdate) problems.push(`${t.model}: role sem UPDATE em "${t.table}".`);
    if (t.scope === 'org' && !t.hasOrgColumn) {
      problems.push(
        `${t.model}: "${t.table}" não tem organizationId — não dá para processar por tenant.`,
      );
    }
    if (t.scope === 'bypass' && t.rlsApplies && !t.policyAdmitsBypass) {
      problems.push(
        `${t.model}: "${t.table}" não tem organizationId e a policy não admite app.bypass_rls — linhas invisíveis a este role.`,
      );
    }
    if (t.scope === 'org' && t.globalMode === 'estimate' && t.reltuples < 0) {
      problems.push(
        `${t.model}: contagem global só por estimativa e "${t.table}" nunca foi analisada (reltuples=-1) — rode ANALYZE ${quoteIdent(t.table)} antes, ou use um role com BYPASSRLS (runbook).`,
      );
    }
  }
  if (problems.length > 0) {
    for (const p of problems) log(`[PREFLIGHT] ❌ ${p}`);
    throw new CoverageNotProvableError(
      `Preflight: cobertura não provável (${problems.length} problema(s)) — nada foi lido nem gravado.`,
    );
  }
  log('[PREFLIGHT] ✅ cobertura provável para todos os alvos.');
  return { role, organization, tables };
}

export interface TxContext {
  tenantId: string | null;
  bypass: boolean;
  readOnly: boolean;
}

/**
 * Transação com GUCs LOCAIS (`set_config(..., true)` — somem no COMMIT/ROLLBACK, nunca vazam para
 * a próxima org), mesmo statement do runInTransaction de src/lib/prisma.ts. `readOnly` abre
 * `READ ONLY` em REPEATABLE READ (contagem e varredura veem o mesmo snapshot).
 */
export async function inTenantTx<T>(q: QueryFn, ctx: TxContext, fn: () => Promise<T>): Promise<T> {
  await q(ctx.readOnly ? 'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY' : 'BEGIN');
  try {
    await q(
      `SELECT set_config('app.bypass_rls', $1, TRUE), set_config('app.current_tenant_id', $2, TRUE)`,
      [ctx.bypass ? 'on' : 'off', ctx.tenantId ?? ''],
    );
    const out = await fn();
    await q('COMMIT');
    return out;
  } catch (err) {
    await q('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

export async function listOrganizations(q: QueryFn): Promise<string[]> {
  return inTenantTx(q, { tenantId: null, bypass: true, readOnly: true }, async () => {
    const { rows } = await q<{ id: string }>(`SELECT id FROM "Organization" ORDER BY id ASC`);
    return rows.map((r) => r.id);
  });
}

/** Filtro extra (ex.: `key = ANY(...)` no Setting). `p(v)` registra o parâmetro e devolve `$n`. */
export type ExtraFilter = (p: (value: unknown) => string) => string;

export interface ScanOptions {
  orgs: readonly string[];
  columns: readonly string[];
  readOnly: boolean;
  filter?: ExtraFilter;
  pageSize?: number;
  log: Log;
  /** Chamado dentro da transação do tenant (pode gravar se `readOnly=false`). */
  onRow: (row: Record<string, unknown>, orgId: string | null) => Promise<void>;
}

export interface CoverageTally {
  model: string;
  table: string;
  mode: GlobalCountMode;
  /** Linhas entregues a `onRow`. */
  processed: number;
  /** Soma, por org, de count(*) de TODAS as linhas da tabela (sem o filtro extra). */
  perOrgTotal: number;
  /** Contagem global (exata) ou estimativa (reltuples) usada na comparação final. */
  global: number | null;
  divergences: string[];
}

function buildParams(): { params: unknown[]; p: (v: unknown) => string } {
  const params: unknown[] = [];
  return {
    params,
    p: (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    },
  };
}

async function count(q: QueryFn, sql: string, params: unknown[]): Promise<number> {
  const { rows } = await q<{ n: string | number }>(sql, params);
  return Number(rows[0]?.n ?? 0);
}

/** Linhas de um tenant (ou de tudo, no escopo bypass), em páginas por id, dentro da tx corrente. */
async function scanRows(
  q: QueryFn,
  table: string,
  orgId: string | null,
  opts: ScanOptions,
): Promise<number> {
  const cols = ['id', ...opts.columns.filter((c) => c !== 'id')].map(quoteIdent).join(', ');
  const pageSize = opts.pageSize ?? 500;
  let lastId = '';
  let processed = 0;
  for (;;) {
    const { params, p } = buildParams();
    const where: string[] = [];
    if (orgId !== null) where.push(`"organizationId" = ${p(orgId)}`);
    if (opts.filter) where.push(`(${opts.filter(p)})`);
    where.push(`id > ${p(lastId)}`);
    const { rows } = await q<Record<string, unknown>>(
      `SELECT ${cols} FROM ${quoteIdent(table)} WHERE ${where.join(' AND ')} ORDER BY id ASC LIMIT ${p(pageSize)}`,
      params,
    );
    for (const row of rows) {
      processed++;
      await opts.onRow(row, orgId);
    }
    if (rows.length < pageSize) return processed;
    lastId = String(rows[rows.length - 1].id);
  }
}

async function filteredCount(
  q: QueryFn,
  table: string,
  orgId: string | null,
  filter: ExtraFilter | undefined,
): Promise<number> {
  const { params, p } = buildParams();
  const where: string[] = [];
  if (orgId !== null) where.push(`"organizationId" = ${p(orgId)}`);
  if (filter) where.push(`(${filter(p)})`);
  const clause = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return count(q, `SELECT count(*)::bigint AS n FROM ${quoteIdent(table)}${clause}`, params);
}

/** ANALYZE com até 30000 linhas lê a tabela inteira: reltuples é exato; acima disso, amostra. */
export const EXACT_ESTIMATE_MAX_ROWS = 30_000;
export const ESTIMATE_TOLERANCE = 0.02;

/** Puro: a estimativa de pg_class.reltuples é compatível com a soma por org? */
export function estimateMatches(sum: number, reltuples: number): boolean {
  if (reltuples < 0) return false;
  const est = Math.round(reltuples);
  if (sum === 0) return est === 0;
  if (est <= EXACT_ESTIMATE_MAX_ROWS) return sum === est;
  return Math.abs(sum - est) <= Math.ceil(est * ESTIMATE_TOLERANCE);
}

/**
 * Varre UMA tabela-alvo com cobertura provada. Escopo `org`: uma transação por organização. Escopo
 * `bypass`: uma transação com `app.bypass_rls=on` (o preflight já garantiu que isso vê tudo).
 */
export async function scanTable(
  q: QueryFn,
  info: TableInfo,
  opts: ScanOptions,
): Promise<CoverageTally> {
  const tally: CoverageTally = {
    model: info.model,
    table: info.table,
    mode: info.globalMode,
    processed: 0,
    perOrgTotal: 0,
    global: null,
    divergences: [],
  };
  const t = quoteIdent(info.table);
  if (info.scope === 'bypass') {
    await inTenantTx(q, { tenantId: null, bypass: true, readOnly: opts.readOnly }, async () => {
      const expected = await filteredCount(q, info.table, null, opts.filter);
      const processed = await scanRows(q, info.table, null, opts);
      tally.processed += processed;
      tally.perOrgTotal = processed;
      tally.global = expected;
      if (processed !== expected) {
        tally.divergences.push(
          `${info.model}: processadas=${processed} ≠ count(*)=${expected} (bypass)`,
        );
      }
    });
    return tally;
  }

  for (const orgId of opts.orgs) {
    await inTenantTx(q, { tenantId: orgId, bypass: false, readOnly: opts.readOnly }, async () => {
      const orgTotal = await count(
        q,
        `SELECT count(*)::bigint AS n FROM ${t} WHERE "organizationId" = $1`,
        [orgId],
      );
      if (info.rlsApplies) {
        const visible = await count(q, `SELECT count(*)::bigint AS n FROM ${t}`, []);
        if (visible !== orgTotal) {
          tally.divergences.push(
            `${info.model} org=${orgId}: policy expõe ${visible} linha(s) mas o tenant tem ${orgTotal} — isolamento por tenant não confere`,
          );
        }
      }
      const expected = opts.filter
        ? await filteredCount(q, info.table, orgId, opts.filter)
        : orgTotal;
      const processed = await scanRows(q, info.table, orgId, opts);
      tally.processed += processed;
      tally.perOrgTotal += orgTotal;
      if (processed !== expected) {
        tally.divergences.push(
          `${info.model} org=${orgId}: processadas=${processed} ≠ count(*) sob o tenant=${expected}`,
        );
      }
    });
  }

  // Contagem global independente — pega linhas fora de qualquer org listada (organizationId nulo
  // ou órfão) e tenant que a policy não deixou ver.
  if (info.globalMode === 'estimate') {
    const { rows } = await q<{ reltuples: number | string }>(
      `SELECT c.reltuples FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = current_schema() AND c.relname = $1`,
      [info.table],
    );
    const est = Number(rows[0]?.reltuples ?? -1);
    tally.global = est;
    if (!estimateMatches(tally.perOrgTotal, est)) {
      tally.divergences.push(
        `${info.model}: soma por org=${tally.perOrgTotal} incompatível com pg_class.reltuples=${est} (estimativa; com a app congelada, rode ANALYZE ${t} logo antes, ou use role com BYPASSRLS para contagem exata)`,
      );
    }
  } else {
    const bypass = info.globalMode === 'exact-bypass';
    const global = await inTenantTx(q, { tenantId: null, bypass, readOnly: true }, () =>
      count(q, `SELECT count(*)::bigint AS n FROM ${t}`, []),
    );
    tally.global = global;
    if (global !== tally.perOrgTotal) {
      tally.divergences.push(
        `${info.model}: soma por org=${tally.perOrgTotal} ≠ count(*) global=${global} (${info.globalMode}) — há linha fora das organizações listadas`,
      );
    }
  }
  return tally;
}

export function fmtCoverage(t: CoverageTally): string {
  return `  ↳ [COBERTURA] ${t.model}: processadas=${t.processed} soma_por_org=${t.perOrgTotal} global(${t.mode})=${t.global ?? '-'} divergências=${t.divergences.length}`;
}
