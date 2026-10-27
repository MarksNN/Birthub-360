// scripts/security/backfill-integration-settings-encryption.ts
//
// Cifra em repouso (AES-256-GCM, formato `enc:v1:` de src/lib/crypto/secretFields.ts), POR CAMPO,
// os segredos de integração gravados em TEXTO PURO dentro de `Setting.value` (Json) ANTES de
// src/lib/integrations/integrationSettings.repository.ts existir. Quais campos são segredo vem do
// catálogo (`secret: true` em src/features/intelligence/services/universalConnectors.catalog.ts) —
// mesma fonte que o repositório usa, então script e app nunca divergem.
//
// Também cifra o valor (string JSON) da chave legada `bitrix_webhook_url`, que o Hub Universal
// gravava em texto puro e nunca lia (gravação removida na Onda 52) — a linha continua existindo
// em bancos antigos até alguém apagá-la.
//
// Sem rodar isto nada quebra: o repositório lê valor sem prefixo em passthrough e recifra na
// próxima gravação. O backfill só encurta a janela em que o banco/backup guarda token em claro.
//
// SEGURANÇA DE EXECUÇÃO
// - DRY-RUN POR PADRÃO. Só grava com `--apply` explícito E `--snapshot-confirmed=<id>` (id do
//   snapshot/backup do banco tirado imediatamente antes — runbook no ADR-010).
// - ABORTA antes de conectar se CREDENTIALS_ENCRYPTION_KEY não estiver EXPLÍCITA e válida no env,
//   em qualquer NODE_ENV (secretFields.ts cairia na chave fixa de dev fora de produção) — ver
//   credential-script-guards.ts.
// - Chaves fora do catálogo (ex.: `accountSid`/`email` legados) são REPORTADAS no log
//   (`fora_do_catalogo=`) e preservadas intactas — nunca descartadas nem cifradas.
// - Idempotente: valor que já começa com `enc:` é pulado; rodar duas vezes não muda nada.
// - Fail-closed por linha: valor `enc:` que NÃO decifra com a CREDENTIALS_ENCRYPTION_KEY informada
//   é contado como ilegível (`ilegiveis=`) e a linha inteira não é gravada — sinal de chave errada
//   no env ou de rotação incompleta.
// - `--verify` (somente leitura, sem snapshot): conta campos secretos legíveis / ilegíveis / em
//   claro (pendentes) sob a chave de `--key-env=NOME` (padrão CREDENTIALS_ENCRYPTION_KEY).
// - Código de saída: 0 ok; 1 pré-condição/preflight/falha; 2 = há ilegíveis, conflitos ou
//   divergência de cobertura (dry-run/apply/verify) ou, no --verify, algum segredo ainda em claro.
// - Nunca imprime valor (nem cifrado nem em claro) — só org/key/campos.
// - RLS (PR #107, B1 — rls-coverage.ts): PREFLIGHT logado (role, rolsuper, rolbypassrls,
//   RLS/FORCE/policy/privilégios de Setting) que aborta com 1 se a cobertura não é provável;
//   Setting (policy só de tenant, sem bypass) processado organização por organização numa
//   TRANSAÇÃO com `set_config('app.current_tenant_id', org, true)` (antes: GUC de sessão, fora de
//   transação); bypass só para listar Organization. Contagem por org e global (exata com role
//   BYPASSRLS; senão pg_class.reltuples — ANALYZE antes) — divergência = código 2. UPDATE com
//   compare-and-set no `value` lido (a app gravou no meio = conflito, código 2). `--verify` em
//   transações READ ONLY.
// - Rodar em produção exige OK explícito do Marcelo (regra do Agente 15). Não executado no PR.
//
// Uso:
//   DATABASE_URL=... CREDENTIALS_ENCRYPTION_KEY=... npx tsx scripts/security/backfill-integration-settings-encryption.ts          # dry-run
//   DATABASE_URL=... CREDENTIALS_ENCRYPTION_KEY=... npx tsx scripts/security/backfill-integration-settings-encryption.ts --apply --snapshot-confirmed=<id>  # grava
//   DATABASE_URL=... CREDENTIALS_ENCRYPTION_KEY=... npx tsx scripts/security/backfill-integration-settings-encryption.ts --verify [--key-env=NOME]  # só lê

import { encryptField } from '../../src/lib/crypto/secretFields.js';
import {
  classifyValue,
  EXIT_DATA_ISSUES,
  emptyCounts,
  type VerifyCounts,
} from './credential-envelope.js';
import {
  assertBackfillPreconditions,
  assertVerifyPreconditions,
  isVerifyMode,
  requireExplicitKey,
  ScriptPreconditionError,
} from './credential-script-guards.js';
import {
  classifySettingValue,
  KNOWN_FIELDS_BY_SETTING_KEY,
  LEGACY_BITRIX_KEY,
  SECRET_FIELDS_BY_SETTING_KEY,
  TARGET_SETTING_KEYS,
} from './integration-settings-targets.js';
import {
  type CoverageTally,
  fmtCoverage,
  type Log,
  listOrganizations,
  type QueryFn,
  runPreflight,
  scanTable,
  type TableInfo,
  type TableTarget,
} from './rls-coverage.js';

export {
  assertBackfillPreconditions,
  KNOWN_FIELDS_BY_SETTING_KEY,
  LEGACY_BITRIX_KEY,
  SECRET_FIELDS_BY_SETTING_KEY,
  TARGET_SETTING_KEYS,
};

export const ENC_PREFIX = 'enc:';
export interface SettingRow {
  id: string;
  organizationId: string;
  key: string;
  value: unknown;
}

export interface BackfillPlan {
  /** Novo `value` a gravar, ou `null` se nada a fazer. */
  nextValue: unknown | null;
  encryptedFields: string[];
  /** Chaves do JSON fora do catálogo do provider — só reportadas; ficam intactas em `nextValue`. */
  unknownFields: string[];
  /** Campos secretos `enc:` que não decifram com `readKey` — a linha NÃO é gravada. */
  unreadableFields: string[];
}

function isPlaintext(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && !v.startsWith(ENC_PREFIX);
}

const isUnreadable = (v: unknown, readKey: Buffer | undefined): boolean =>
  readKey !== undefined && classifyValue(v, readKey) === 'unreadable';

/**
 * Puro: decide o que mudar numa linha. Nunca toca valor já cifrado. Com `readKey`, valor `enc:`
 * que não decifra com ela torna a linha ilegível: nada é gravado nela (fail-closed por linha).
 */
export function planSettingBackfill(
  row: Pick<SettingRow, 'key' | 'value'>,
  encrypt: (plain: string) => string = encryptField,
  readKey?: Buffer,
): BackfillPlan {
  const none = { nextValue: null, encryptedFields: [], unknownFields: [], unreadableFields: [] };
  if (row.key === LEGACY_BITRIX_KEY) {
    if (isUnreadable(row.value, readKey)) return { ...none, unreadableFields: ['<value>'] };
    return isPlaintext(row.value)
      ? { ...none, nextValue: encrypt(row.value), encryptedFields: ['<value>'] }
      : none;
  }
  const secretFields = SECRET_FIELDS_BY_SETTING_KEY.get(row.key);
  if (!secretFields || !row.value || typeof row.value !== 'object' || Array.isArray(row.value)) {
    return none;
  }
  const value = row.value as Record<string, unknown>;
  const known = new Set(KNOWN_FIELDS_BY_SETTING_KEY.get(row.key) ?? []);
  const unknownFields = Object.keys(value)
    .filter((k) => !known.has(k))
    .sort();
  const unreadableFields = secretFields.filter((f) => isUnreadable(value[f], readKey));
  if (unreadableFields.length > 0) return { ...none, unknownFields, unreadableFields };
  const next: Record<string, unknown> = { ...value };
  const encryptedFields: string[] = [];
  for (const field of secretFields) {
    const current = value[field];
    if (isPlaintext(current)) {
      next[field] = encrypt(current);
      encryptedFields.push(field);
    }
  }
  return encryptedFields.length > 0
    ? { nextValue: next, encryptedFields, unknownFields, unreadableFields: [] }
    : { ...none, unknownFields };
}

export type { QueryFn } from './rls-coverage.js';

export const SETTING_TARGET: TableTarget = { model: 'Setting', table: 'Setting', scope: 'org' };
const settingFilter = (p: (v: unknown) => string) => `key = ANY(${p(TARGET_SETTING_KEYS)}::text[])`;

async function preflightSetting(query: QueryFn, write: boolean, log: Log): Promise<TableInfo> {
  const pf = await runPreflight(query, [SETTING_TARGET], { write, log });
  const info = pf.tables.get(SETTING_TARGET.model);
  if (!info) throw new Error('Preflight sem a tabela Setting.');
  return info;
}

function logCoverage(log: Log, c: CoverageTally): void {
  log(fmtCoverage(c));
  for (const d of c.divergences.slice(0, 20)) log(`  ↳ [DIVERGÊNCIA] ${d}`);
}

export interface BackfillOptions {
  apply: boolean;
  /** Obrigatório com `apply` (defesa em profundidade além do main): id do snapshot do banco. */
  snapshotId?: string | null;
  log?: (line: string) => void;
  encrypt?: (plain: string) => string;
  /** Chave explícita para checar legibilidade dos valores `enc:` existentes (main sempre passa). */
  readKey?: Buffer;
}

export interface BackfillResult {
  organizations: number;
  scanned: number;
  toEncrypt: number;
  written: number;
  /** Linhas com chaves fora do catálogo (reportadas, preservadas). */
  rowsWithUnknownFields: number;
  /** Linhas com campo `enc:` ilegível sob `readKey` — não gravadas; código de saída 2. */
  unreadableRows: number;
  /** UPDATE compare-and-set que não casou (a app gravou no meio) — não gravadas; código 2. */
  conflicts: number;
  /** Divergências de cobertura (contagem por org / global) — código 2. */
  divergences: number;
}

export async function runIntegrationSettingsBackfill(
  query: QueryFn,
  { apply, snapshotId, log = console.log, encrypt = encryptField, readKey }: BackfillOptions,
): Promise<BackfillResult> {
  if (apply && !snapshotId?.trim()) {
    throw new ScriptPreconditionError(
      'apply exige snapshotId (--snapshot-confirmed=<id>) — tire o snapshot do banco antes.',
    );
  }
  const info = await preflightSetting(query, apply, log);
  const orgs = await listOrganizations(query);

  const result: BackfillResult = {
    organizations: orgs.length,
    scanned: 0,
    toEncrypt: 0,
    written: 0,
    rowsWithUnknownFields: 0,
    unreadableRows: 0,
    conflicts: 0,
    divergences: 0,
  };
  const tag = apply ? '[APPLY]' : '[DRY-RUN]';

  const coverage = await scanTable(query, info, {
    orgs,
    columns: ['organizationId', 'key', 'value'],
    filter: settingFilter,
    readOnly: !apply,
    log,
    onRow: async (raw) => {
      const row = raw as unknown as SettingRow;
      result.scanned++;
      const plan = planSettingBackfill(row, encrypt, readKey);
      if (plan.unknownFields.length > 0) {
        result.rowsWithUnknownFields++;
        log(
          `${tag} org=${row.organizationId} key=${row.key} fora_do_catalogo=${plan.unknownFields.join(',')} (preservadas, não cifradas)`,
        );
      }
      if (plan.unreadableFields.length > 0) {
        result.unreadableRows++;
        log(
          `${tag} org=${row.organizationId} key=${row.key} ILEGIVEIS=${plan.unreadableFields.join(',')} (linha não gravada)`,
        );
        return;
      }
      if (plan.nextValue === null) return;
      result.toEncrypt++;
      log(
        `${tag} org=${row.organizationId} key=${row.key} campos=${plan.encryptedFields.join(',')}`,
      );
      if (!apply) return;
      // Compare-and-set: só grava se `value` ainda é o lido (senão a app gravou no meio).
      const r = await query(
        `UPDATE "Setting" SET value = $1::jsonb, "updatedAt" = NOW()
         WHERE id = $2 AND "organizationId" = $3 AND value = $4::jsonb`,
        [JSON.stringify(plan.nextValue), row.id, row.organizationId, JSON.stringify(row.value)],
      );
      if (r.rowCount !== 1) {
        result.conflicts++;
        log(
          `${tag} org=${row.organizationId} key=${row.key} CONFLITO (alterada no meio; não gravada)`,
        );
        return;
      }
      result.written++;
    },
  });
  logCoverage(log, coverage);
  result.divergences = coverage.divergences.length;

  log(
    `Concluído [${apply ? 'APPLY' : 'DRY-RUN'}] orgs=${result.organizations} linhas=${result.scanned} a_cifrar=${result.toEncrypt} gravadas=${result.written} linhas_com_chaves_fora_do_catalogo=${result.rowsWithUnknownFields} ilegiveis=${result.unreadableRows} conflitos=${result.conflicts} divergencias=${result.divergences}`,
  );
  return result;
}

/**
 * `--verify` (somente leitura): campos secretos legíveis / ilegíveis / em claro (pendentes) sob
 * `key`. Nunca grava; não exige snapshot.
 */
export async function runIntegrationSettingsVerify(
  query: QueryFn,
  key: Buffer,
  log: (line: string) => void = console.log,
): Promise<VerifyCounts & { organizations: number; scanned: number; divergences: number }> {
  const info = await preflightSetting(query, false, log);
  const orgs = await listOrganizations(query);
  const counts = { ...emptyCounts(), organizations: orgs.length, scanned: 0, divergences: 0 };
  const coverage = await scanTable(query, info, {
    orgs,
    columns: ['key', 'value'],
    filter: settingFilter,
    readOnly: true,
    log,
    onRow: async (row) => {
      counts.scanned++;
      classifySettingValue(String(row.key), row.value, key, counts);
    },
  });
  logCoverage(log, coverage);
  counts.divergences = coverage.divergences.length;
  log(
    `[VERIFY] orgs=${counts.organizations} linhas=${counts.scanned} legiveis=${counts.readable} ilegiveis=${counts.unreadable} em_claro=${counts.plaintext} divergencias=${counts.divergences}`,
  );
  return counts;
}

async function main(): Promise<number> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória.');
  // Aborta ANTES de conectar: chave explícita/válida; --apply só com --snapshot-confirmed=<id>.
  const verify = isVerifyMode(process.argv)
    ? assertVerifyPreconditions(process.env, process.argv)
    : null;
  const pre = verify ? null : assertBackfillPreconditions(process.env, process.argv);
  if (pre?.snapshotId) console.log(`Snapshot confirmado: ${pre.snapshotId}`);
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    const query: QueryFn = async (sql, params) => {
      const res = await client.query(sql, params);
      return { rows: res.rows, rowCount: res.rowCount };
    };
    if (verify) {
      console.log(`VERIFY (somente leitura) com a chave de ${verify.keyEnv}`);
      const c = await runIntegrationSettingsVerify(query, verify.key);
      if (c.unreadable > 0 || c.plaintext > 0 || c.divergences > 0) {
        console.log(
          `❌ VERIFY FALHOU: ilegiveis=${c.unreadable} em_claro(pendentes)=${c.plaintext} divergencias=${c.divergences}. Código ${EXIT_DATA_ISSUES}.`,
        );
        return EXIT_DATA_ISSUES;
      }
      console.log('✅ VERIFY OK: 0 ilegíveis, 0 pendentes em claro e cobertura conferida.');
      return 0;
    }
    const apply = pre?.apply ?? false;
    // Mesma chave que encryptField usa (CREDENTIALS_ENCRYPTION_KEY), já validada pelo guard.
    const readKey = requireExplicitKey(process.env, 'CREDENTIALS_ENCRYPTION_KEY');
    const result = await runIntegrationSettingsBackfill(query, {
      apply,
      snapshotId: pre?.snapshotId ?? null,
      readKey,
    });
    if (!apply) {
      console.log(
        'Nada gravado (dry-run). Para gravar: snapshot do banco + --apply --snapshot-confirmed=<id>.',
      );
    }
    if (result.unreadableRows > 0 || result.conflicts > 0 || result.divergences > 0) {
      console.log(
        `❌ ilegiveis=${result.unreadableRows} (linhas com valor cifrado ilegível sob CREDENTIALS_ENCRYPTION_KEY, não gravadas) conflitos=${result.conflicts} divergencias=${result.divergences}. Código ${EXIT_DATA_ISSUES}.`,
      );
      return EXIT_DATA_ISSUES;
    }
    return 0;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('backfill-integration-settings-encryption.ts')) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err: unknown) => {
      console.error('[FALHA]', err instanceof Error ? err.message : 'erro desconhecido');
      process.exit(1);
    });
}
