// scripts/security/reencrypt-credentials.ts
//
// Utilitário de re-encriptação de credenciais e dados em repouso
// para suporte à Rotação da Chave Mestra (CREDENTIALS_ENCRYPTION_KEY).
//
// Propriedade: Agente 15 (Segurança Aplicada e Rotação de Segredos)
// Runbook: docs/security/runbooks/ROTATE_CREDENTIALS_ENCRYPTION_KEY.md (RB-SEC-010).
//
// Uso (DRY-RUN por padrão — só grava com --apply + --snapshot-confirmed=<id>):
//   DATABASE_URL=... CREDENTIALS_ENCRYPTION_KEY=<atual> OLD_KEY=<base64-32b> NEW_KEY=<base64-32b> \
//     npx tsx scripts/security/reencrypt-credentials.ts [--model=BitrixConnection]            # dry-run
//   ... npx tsx scripts/security/reencrypt-credentials.ts --apply --snapshot-confirmed=<id>    # grava
//   REDIS_URL=... CREDENTIALS_ENCRYPTION_KEY=... OLD_KEY=... NEW_KEY=... \
//     npx tsx scripts/security/reencrypt-credentials.ts --target=redis-wa-auth [--apply --snapshot-confirmed=<id>]
//   DATABASE_URL=... CREDENTIALS_ENCRYPTION_KEY=<chave a verificar> \
//     npx tsx scripts/security/reencrypt-credentials.ts --verify [--key-env=NOME] [--target=...] [--model=...]
//
// Pré-condições (credential-script-guards.ts, checadas ANTES de conectar): CREDENTIALS_ENCRYPTION_KEY,
// OLD_KEY e NEW_KEY explícitas no env e válidas, em QUALQUER NODE_ENV — sem fallback entre elas nem
// para chave de dev; OLD≠NEW; CREDENTIALS_ENCRYPTION_KEY ∈ {OLD, NEW}. `--apply` exige o id do
// snapshot (banco, ou Redis no alvo redis-wa-auth) tirado antes.
//
// Alvos (`--target`, padrão `db`):
// - `db`: TODOS os models de ENCRYPTED_MODEL_FIELDS (src/lib/crypto/encryptedModelFields.ts — a
//   MESMA lista que a extensão do Prisma cifra; nada copiado à mão) e o `Setting` (segredos POR
//   CAMPO dentro do JSON de `Setting.value`, `key = integration.*` + legada `bitrix_webhook_url`).
//   `--model=<Model>` restringe a um model (inclusive `--model=Setting`).
// - `redis-wa-auth`: sessões WhatsApp/Baileys `wa-auth:<org>:*` (useRedisAuthState.ts), cifradas
//   com a MESMA chave. SCAN (nunca KEYS), troca atômica por chave (compare-and-set em Lua) que
//   preserva o TTL, nunca loga valores. Erro de conexão no GET aborta (código 1).
//
// RLS (PR #107, B1 do Agente 24 — ver rls-coverage.ts): PREFLIGHT logado (role, rolsuper,
// rolbypassrls, RLS/FORCE/policies/privilégios por tabela) que aborta com 1 se a cobertura não é
// provável; models com organizationId processados ORGANIZAÇÃO POR ORGANIZAÇÃO numa transação com
// `app.current_tenant_id` local (sem bypass); `account` (sem organizationId) com bypass, que a
// policy dele admite; contagem independente por org e global — divergência = código 2.
//
// Gravação ATÔMICA POR LINHA e com compare-and-set: se qualquer campo cifrado de uma linha não
// decifra com OLD_KEY, a linha inteira NÃO é gravada; o UPDATE só casa se os campos ainda têm o
// valor lido (senão é Conflito — a app gravou no meio — e a linha fica para a próxima rodada).
// Cada organização × model é uma transação: falha no meio desfaz só aquela org/model; o que já foi
// commitado está em NEW_KEY e uma nova rodada é idempotente: valor que não decifra com OLD_KEY mas
// decifra com NEW_KEY conta como "Já em NEW_KEY" (não é Erro nem é regravado); só o que não decifra
// com NENHUMA das duas é Erro. O --verify com NEW_KEY é a prova final.
//
// `--verify` (somente leitura, transações READ ONLY; sem NEW_KEY nem snapshot): conta, por
// model/alvo, valores legíveis, ilegíveis e em claro sob UMA chave, com a mesma cobertura.
//
// Código de saída: 0 = sem problemas; 1 = pré-condição/preflight/falha de execução; 2 = há Erros
// (linhas ilegíveis), Conflitos, divergência de cobertura ou, no --verify, algum valor ilegível.
//

import { ENCRYPTED_MODEL_FIELDS } from '../../src/lib/crypto/encryptedModelFields.js';
import {
  addClass,
  classifyValue,
  decryptWithKey,
  ENC_ANY_PREFIX,
  EXIT_DATA_ISSUES,
  emptyCounts,
  encryptWithKey,
  VERSION_PREFIX,
  type VerifyCounts,
} from './credential-envelope.js';
import {
  assertRotationPreconditions,
  assertVerifyPreconditions,
  isVerifyMode,
  parseReencryptScope,
  requireRedisUrl,
  type ScriptEnv,
} from './credential-script-guards.js';
import {
  classifySettingValue,
  LEGACY_BITRIX_KEY,
  SECRET_FIELDS_BY_SETTING_KEY,
  TARGET_SETTING_KEYS,
} from './integration-settings-targets.js';
import {
  type CoverageTally,
  type ExtraFilter,
  fmtCoverage,
  type Log,
  listOrganizations,
  type Preflight,
  type QueryFn,
  quoteIdent,
  runPreflight,
  scanTable,
  type TableInfo,
  type TableTarget,
} from './rls-coverage.js';

export { decryptWithKey, encryptWithKey } from './credential-envelope.js';
export type { Log, QueryFn } from './rls-coverage.js';

/**
 * Models e campos cifrados — DERIVADO de ENCRYPTED_MODEL_FIELDS (fonte única da extensão do
 * Prisma). Antes era uma cópia à mão que esqueceu CopilotoTranscriptSegment.text (B2 do PR #107).
 */
export const TARGET_MODELS: Readonly<Record<string, readonly string[]>> = ENCRYPTED_MODEL_FIELDS;

/**
 * Model → tabela, quando o schema usa `@@map`. Antes o script usava o nome do model: `Account` é
 * `@@map("account")`, então a tabela "não existia", saía "[PULADO]" e os tokens OAuth NUNCA eram
 * rotacionados. Teste de contrato confere contra prisma/schema.prisma.
 */
export const TABLE_BY_MODEL: Readonly<Record<string, string>> = { Account: 'account' };

/**
 * Models SEM organizationId (escopo de tenant indireto). `account` é ligada a `user`, e há contas
 * de usuário sem organização — invisíveis a qualquer tenant. Account está na allowlist de bypass
 * (BYPASS_RLS_ALLOWED_MODELS em src/lib/prisma.ts; policy com `app.bypass_rls`), então é lida com
 * bypass — o preflight aborta se a policy deixar de admitir isso.
 */
export const BYPASS_SCOPE_MODELS: readonly string[] = ['Account'];

export const SETTING_MODEL = 'Setting';
export const ALLOWED_MODELS: readonly string[] = [...Object.keys(TARGET_MODELS), SETTING_MODEL];
export const REDIS_WA_AUTH_MATCH = 'wa-auth:*';

export function tableTargetFor(model: string): TableTarget {
  return {
    model,
    table: TABLE_BY_MODEL[model] ?? model,
    scope: BYPASS_SCOPE_MODELS.includes(model) ? 'bypass' : 'org',
  };
}

export const SETTING_FILTER: ExtraFilter = (p) => `key = ANY(${p(TARGET_SETTING_KEYS)}::text[])`;

export interface RotationKeys {
  apply: boolean;
  oldKey: Buffer;
  newKey: Buffer;
}

/** Valor que já decifra com NEW_KEY (rodada anterior commitada) — não é erro nem é regravado. */
export const ALREADY_NEW = Symbol('already-new');

/**
 * Puro: OLD_KEY → NEW_KEY de um envelope `enc:`. Devolve `ALREADY_NEW` se ele NÃO decifra com
 * OLD_KEY mas decifra com NEW_KEY (retomada após falha parcial: idempotente). Lança se a versão é
 * desconhecida ou se não decifra com nenhuma das duas (fail-closed).
 */
export function rotateEnvelope(
  v: string,
  oldKeyBuf: Buffer,
  newKeyBuf: Buffer,
): string | typeof ALREADY_NEW {
  if (!v.startsWith(VERSION_PREFIX)) throw new Error('versão de envelope desconhecida');
  let plain: string;
  try {
    plain = decryptWithKey(v, oldKeyBuf);
  } catch (err) {
    try {
      decryptWithKey(v, newKeyBuf);
    } catch {
      throw err;
    }
    return ALREADY_NEW;
  }
  return encryptWithKey(plain, newKeyBuf);
}

/**
 * Puro: re-cifra (OLD_KEY → NEW_KEY) os campos `enc:v1:` de um `Setting.value` de integração.
 * Texto puro legado fica intocado (é trabalho do backfill-integration-settings-encryption.ts).
 * Devolve `null` se nada mudou. Lança se algum campo não decifrar com OLD_KEY OU tiver versão de
 * envelope desconhecida (`enc:` sem ser `enc:v1:` — antes era pulado em silêncio): fail-closed.
 */
export function reencryptIntegrationSettingValue(
  key: string,
  value: unknown,
  oldKeyBuf: Buffer,
  newKeyBuf: Buffer,
): { nextValue: unknown; fields: string[] } | null {
  const rotate = (v: string) => rotateEnvelope(v, oldKeyBuf, newKeyBuf);
  const isEnc = (v: unknown): v is string => typeof v === 'string' && v.startsWith(ENC_ANY_PREFIX);
  if (key === LEGACY_BITRIX_KEY) {
    if (!isEnc(value)) return null;
    const r = rotate(value);
    return r === ALREADY_NEW ? null : { nextValue: r, fields: ['<value>'] };
  }
  const secretFields = SECRET_FIELDS_BY_SETTING_KEY.get(key);
  if (!secretFields || !value || typeof value !== 'object' || Array.isArray(value)) return null;
  const current = value as Record<string, unknown>;
  const next: Record<string, unknown> = { ...current };
  const fields: string[] = [];
  for (const f of secretFields) {
    const v = current[f];
    if (!isEnc(v)) continue;
    const r = rotate(v);
    if (r === ALREADY_NEW) continue;
    next[f] = r;
    fields.push(f);
  }
  return fields.length > 0 ? { nextValue: next, fields } : null;
}

export interface RowPlan {
  /** Campos a gravar. Vazio se nada a rotacionar OU se a linha tem campo ilegível. */
  updates: Record<string, string>;
  unreadableFields: string[];
  skipped: number;
  /** Campos que já decifram com NEW_KEY (rodada anterior) — não regravados. */
  alreadyNew: number;
}

/**
 * Puro, ATÔMICO POR LINHA: re-cifra os campos `enc:v1:` de uma linha; se QUALQUER campo cifrado
 * (`enc:`) não decifrar com OLD_KEY, devolve `updates` vazio — a linha não é gravada.
 */
export function planRowReencrypt(
  row: Record<string, unknown>,
  fields: readonly string[],
  oldKeyBuf: Buffer,
  newKeyBuf: Buffer,
): RowPlan {
  const updates: Record<string, string> = {};
  const unreadableFields: string[] = [];
  let skipped = 0;
  let alreadyNew = 0;
  for (const field of fields) {
    const val = row[field];
    if (typeof val !== 'string' || !val.startsWith(ENC_ANY_PREFIX)) {
      skipped++;
      continue;
    }
    try {
      const r = rotateEnvelope(val, oldKeyBuf, newKeyBuf);
      if (r === ALREADY_NEW) alreadyNew++;
      else updates[field] = r;
    } catch {
      unreadableFields.push(field);
    }
  }
  return {
    updates: unreadableFields.length > 0 ? {} : updates,
    unreadableFields,
    skipped,
    alreadyNew,
  };
}

export interface ModelResult {
  total: number;
  rotated: number;
  skipped: number;
  /** Linhas com ≥1 campo ilegível — NÃO gravadas. */
  errors: number;
  unreadableFields: number;
  /** Campos que já estavam em NEW_KEY (retomada idempotente). */
  alreadyNew: number;
  /** UPDATE compare-and-set que não casou (a app mudou a linha no meio) — não gravadas. */
  conflicts: number;
  coverage: CoverageTally;
}

/** UPDATE de uma linha com compare-and-set nos campos alterados. Devolve se casou (1 linha). */
async function casUpdateRow(
  query: QueryFn,
  info: TableInfo,
  row: Record<string, unknown>,
  orgId: string | null,
  updates: Record<string, string>,
): Promise<boolean> {
  const cols = Object.keys(updates);
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const set = cols.map((c) => `${quoteIdent(c)} = ${p(updates[c])}`).join(', ');
  const where = [`id = ${p(row.id)}`];
  if (orgId !== null) where.push(`"organizationId" = ${p(orgId)}`);
  for (const c of cols) where.push(`${quoteIdent(c)} IS NOT DISTINCT FROM ${p(row[c])}`);
  const r = await query(
    `UPDATE ${quoteIdent(info.table)} SET ${set} WHERE ${where.join(' AND ')}`,
    params,
  );
  return r.rowCount === 1;
}

export async function reencryptModel(
  query: QueryFn,
  info: TableInfo,
  fields: readonly string[],
  { apply, oldKey, newKey }: RotationKeys,
  { orgs, log }: { orgs: readonly string[]; log: Log },
): Promise<ModelResult> {
  const res = {
    total: 0,
    rotated: 0,
    skipped: 0,
    alreadyNew: 0,
    errors: 0,
    unreadableFields: 0,
    conflicts: 0,
  };
  const coverage = await scanTable(query, info, {
    orgs,
    columns: fields,
    readOnly: !apply,
    log,
    onRow: async (row, orgId) => {
      res.total++;
      const plan = planRowReencrypt(row, fields, oldKey, newKey);
      res.skipped += plan.skipped;
      res.alreadyNew += plan.alreadyNew;
      if (plan.unreadableFields.length > 0) {
        res.errors++;
        res.unreadableFields += plan.unreadableFields.length;
        return;
      }
      if (Object.keys(plan.updates).length === 0) return;
      if (apply && !(await casUpdateRow(query, info, row, orgId, plan.updates))) {
        res.conflicts++;
        return;
      }
      res.rotated++;
    },
  });
  return { ...res, coverage };
}

export async function reencryptSettings(
  query: QueryFn,
  info: TableInfo,
  { apply, oldKey, newKey }: RotationKeys,
  { orgs, log }: { orgs: readonly string[]; log: Log },
): Promise<Omit<ModelResult, 'skipped' | 'unreadableFields' | 'alreadyNew'>> {
  const res = { total: 0, rotated: 0, errors: 0, conflicts: 0 };
  const coverage = await scanTable(query, info, {
    orgs,
    columns: ['key', 'value'],
    filter: SETTING_FILTER,
    readOnly: !apply,
    log,
    onRow: async (row, orgId) => {
      res.total++;
      let out: ReturnType<typeof reencryptIntegrationSettingValue>;
      try {
        out = reencryptIntegrationSettingValue(String(row.key), row.value, oldKey, newKey);
      } catch {
        res.errors++; // fail-closed: nenhum campo da linha é gravado
        return;
      }
      if (!out) return;
      if (apply) {
        const r = await query(
          `UPDATE "Setting" SET value = $1::jsonb
            WHERE id = $2 AND "organizationId" = $3 AND value = $4::jsonb`,
          [JSON.stringify(out.nextValue), row.id, orgId, JSON.stringify(row.value)],
        );
        if (r.rowCount !== 1) {
          res.conflicts++;
          return;
        }
      }
      res.rotated++;
    },
  });
  return { ...res, coverage };
}

export async function verifyModel(
  query: QueryFn,
  info: TableInfo,
  fields: readonly string[],
  key: Buffer,
  { orgs, log }: { orgs: readonly string[]; log: Log },
): Promise<VerifyCounts & { rows: number; coverage: CoverageTally }> {
  const counts = { ...emptyCounts(), rows: 0 };
  const coverage = await scanTable(query, info, {
    orgs,
    columns: fields,
    readOnly: true,
    log,
    onRow: async (row) => {
      counts.rows++;
      for (const f of fields) addClass(counts, classifyValue(row[f], key));
    },
  });
  return { ...counts, coverage };
}

export async function verifySettings(
  query: QueryFn,
  info: TableInfo,
  key: Buffer,
  { orgs, log }: { orgs: readonly string[]; log: Log },
): Promise<VerifyCounts & { rows: number; coverage: CoverageTally }> {
  const counts = { ...emptyCounts(), rows: 0 };
  const coverage = await scanTable(query, info, {
    orgs,
    columns: ['key', 'value'],
    filter: SETTING_FILTER,
    readOnly: true,
    log,
    onRow: async (row) => {
      counts.rows++;
      classifySettingValue(String(row.key), row.value, key, counts);
    },
  });
  return { ...counts, coverage };
}

// ── Redis: sessões WhatsApp/Baileys (wa-auth:<org>:*) ─────────────────────────────────────────

/** Subconjunto do ioredis usado aqui (facilita mock nos testes). */
export interface RedisLike {
  scan(cursor: string, ...args: (string | number)[]): Promise<[string, string[]]>;
  get(key: string): Promise<string | null>;
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
}

/**
 * Compare-and-set atômico que PRESERVA O TTL: só grava se o valor atual ainda é o lido (senão é
 * conflito — a app gravou no meio) e reaplica o PTTL restante (funciona em Redis < 6, sem KEEPTTL).
 */
export const CAS_SET_PRESERVE_TTL_LUA = `
local cur = redis.call('GET', KEYS[1])
if cur ~= ARGV[1] then return 0 end
local ttl = redis.call('PTTL', KEYS[1])
if ttl > 0 then
  redis.call('SET', KEYS[1], ARGV[2], 'PX', ttl)
else
  redis.call('SET', KEYS[1], ARGV[2])
end
return 1
`;

/** Erro de tipo do Redis (chave não-string) — o único erro de GET tratado como dado. */
export function isWrongTypeError(err: unknown): boolean {
  return err instanceof Error && /^WRONGTYPE\b/.test(err.message);
}

/** SCAN incremental (nunca KEYS) com deduplicação — SCAN pode devolver a mesma chave mais de uma vez. */
export async function scanAllKeys(redis: RedisLike, match: string, count = 500): Promise<string[]> {
  const seen = new Set<string>();
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', match, 'COUNT', count);
    for (const k of keys) seen.add(k);
    cursor = next;
  } while (cursor !== '0');
  return [...seen].sort();
}

export interface RedisResult {
  scanned: number;
  rotated: number;
  plaintext: number;
  /** Chaves que já decifram com NEW_KEY (retomada) — não regravadas. */
  alreadyNew: number;
  /** Chaves cujo valor `enc:` não decifra com OLD_KEY (ou não é string) — não gravadas. */
  errors: number;
  /** Chaves alteradas pela app entre a leitura e a gravação — não gravadas; rodar de novo. */
  conflicts: number;
  /** Chaves que sumiram (expiraram/deletadas) entre o SCAN e o GET. */
  missing: number;
  /** Nomes (nunca valores) das chaves com erro/conflito, limitado a 20. */
  problemKeys: string[];
}

export async function reencryptRedisWaAuth(
  redis: RedisLike,
  { apply, oldKey, newKey }: RotationKeys,
  { match = REDIS_WA_AUTH_MATCH, scanCount = 500 }: { match?: string; scanCount?: number } = {},
): Promise<RedisResult> {
  const res: RedisResult = {
    scanned: 0,
    rotated: 0,
    plaintext: 0,
    alreadyNew: 0,
    errors: 0,
    conflicts: 0,
    missing: 0,
    problemKeys: [],
  };
  const note = (k: string) => {
    if (res.problemKeys.length < 20) res.problemKeys.push(k);
  };
  for (const key of await scanAllKeys(redis, match, scanCount)) {
    res.scanned++;
    let current: string | null;
    try {
      current = await redis.get(key);
    } catch (err) {
      // Só WRONGTYPE (chave que não é string) é problema de DADO; erro de conexão/timeout relança
      // e vira código 1 (antes virava "Erros" e o script seguia, mascarando Redis fora do ar).
      if (!isWrongTypeError(err)) throw err;
      res.errors++;
      note(key);
      continue;
    }
    if (current === null) {
      res.missing++;
      continue;
    }
    if (!current.startsWith(ENC_ANY_PREFIX)) {
      res.plaintext++; // legado em JSON puro: a app re-cifra no próximo save; rotação não toca
      continue;
    }
    let next: string | typeof ALREADY_NEW;
    try {
      next = rotateEnvelope(current, oldKey, newKey);
    } catch {
      res.errors++;
      note(key);
      continue;
    }
    if (next === ALREADY_NEW) {
      res.alreadyNew++;
      continue;
    }
    if (apply) {
      const ok = await redis.eval(CAS_SET_PRESERVE_TTL_LUA, 1, key, current, next);
      if (Number(ok) !== 1) {
        res.conflicts++;
        note(key);
        continue;
      }
    }
    res.rotated++;
  }
  return res;
}

export async function verifyRedisWaAuth(
  redis: RedisLike,
  key: Buffer,
  { match = REDIS_WA_AUTH_MATCH, scanCount = 500 }: { match?: string; scanCount?: number } = {},
): Promise<VerifyCounts & { scanned: number }> {
  const counts = { ...emptyCounts(), scanned: 0 };
  for (const k of await scanAllKeys(redis, match, scanCount)) {
    counts.scanned++;
    let v: string | null;
    try {
      v = await redis.get(k);
    } catch (err) {
      if (!isWrongTypeError(err)) throw err; // conexão/timeout → código 1, nunca "VERIFY OK"
      counts.unreadable++;
      continue;
    }
    addClass(counts, classifyValue(v, key));
  }
  return counts;
}

// ── main ─────────────────────────────────────────────────────────────────────────────────────

function fmtVerify(label: string, c: VerifyCounts): string {
  return `  ↳ [VERIFY] ${label}: legíveis=${c.readable} ilegíveis=${c.unreadable} em_claro=${c.plaintext}`;
}

async function withDb<T>(env: ScriptEnv, fn: (query: QueryFn) => Promise<T>): Promise<T> {
  const dbUrl = env.DATABASE_URL?.trim();
  if (!dbUrl) throw new Error('DATABASE_URL não definida (obrigatória para --target=db).');
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({
    connectionString: dbUrl,
    max: 1,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    const query: QueryFn = async (sql, params) => {
      const r = await client.query(sql, params);
      return { rows: r.rows, rowCount: r.rowCount };
    };
    return await fn(query);
  } finally {
    client.release();
    await pool.end();
  }
}

async function withRedis<T>(url: string, fn: (redis: RedisLike) => Promise<T>): Promise<T> {
  // Export nomeado: `default` do import dinâmico não é construível sob module=nodenext (TS2351).
  const { Redis } = await import('ioredis');
  const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  await redis.connect();
  try {
    return await fn(redis as unknown as RedisLike);
  } finally {
    await redis.quit();
  }
}

function dbModels(model: string | null): Array<[string, readonly string[]]> {
  return Object.entries(TARGET_MODELS).filter(([m]) => !model || m === model);
}

function dbTargets(model: string | null): TableTarget[] {
  const targets = dbModels(model).map(([m]) => tableTargetFor(m));
  if (!model || model === SETTING_MODEL) {
    targets.push({ model: SETTING_MODEL, table: SETTING_MODEL, scope: 'org' });
  }
  return targets;
}

function tableInfo(pf: Preflight, model: string): TableInfo {
  const info = pf.tables.get(model);
  if (!info) throw new Error(`Preflight sem a tabela do model ${model}.`);
  return info;
}

function logCoverage(log: Log, c: CoverageTally): number {
  log(fmtCoverage(c));
  for (const d of c.divergences.slice(0, 20)) log(`  ↳ [DIVERGÊNCIA] ${d}`);
  return c.divergences.length;
}

async function runVerify(argv: readonly string[], log: Log, env: ScriptEnv): Promise<number> {
  const scope = parseReencryptScope(argv, ALLOWED_MODELS);
  const { keyEnv, key } = assertVerifyPreconditions(env, argv);
  const redisUrl = scope.target === 'redis-wa-auth' ? requireRedisUrl(env) : null;
  log('='.repeat(70));
  log(
    `🔎 VERIFY (somente leitura) — chave de ${keyEnv} — alvo ${scope.target}${scope.model ? ` / ${scope.model}` : ''}`,
  );
  log('='.repeat(70));
  let unreadable = 0;
  let divergences = 0;
  if (redisUrl) {
    const c = await withRedis(redisUrl, (r) => verifyRedisWaAuth(r, key));
    log(`${fmtVerify(REDIS_WA_AUTH_MATCH, c)} chaves=${c.scanned}`);
    unreadable += c.unreadable;
  } else {
    await withDb(env, async (query) => {
      const pf = await runPreflight(query, dbTargets(scope.model), { write: false, log });
      const orgs = await listOrganizations(query);
      log(`Organizações: ${orgs.length}`);
      for (const [model, fields] of dbModels(scope.model)) {
        const c = await verifyModel(query, tableInfo(pf, model), fields, key, { orgs, log });
        log(`${fmtVerify(model, c)} linhas=${c.rows}`);
        divergences += logCoverage(log, c.coverage);
        unreadable += c.unreadable;
      }
      if (!scope.model || scope.model === SETTING_MODEL) {
        const c = await verifySettings(query, tableInfo(pf, SETTING_MODEL), key, { orgs, log });
        log(
          `${fmtVerify(`${SETTING_MODEL} (integration.* + ${LEGACY_BITRIX_KEY})`, c)} linhas=${c.rows}`,
        );
        divergences += logCoverage(log, c.coverage);
        unreadable += c.unreadable;
      }
    });
  }
  log('='.repeat(70));
  if (unreadable > 0 || divergences > 0) {
    log(
      `❌ VERIFY FALHOU: ${unreadable} valor(es) ilegível(is) com a chave de ${keyEnv}; ${divergences} divergência(s) de cobertura. Código ${EXIT_DATA_ISSUES}.`,
    );
    return EXIT_DATA_ISSUES;
  }
  log(`✅ VERIFY OK: 0 ilegíveis com a chave de ${keyEnv} e cobertura conferida.`);
  return 0;
}

async function runRotation(argv: readonly string[], log: Log, env: ScriptEnv): Promise<number> {
  const scope = parseReencryptScope(argv, ALLOWED_MODELS);
  // Aborta (lança) antes de qualquer conexão se faltar/for inválida alguma chave, ou se --apply
  // vier sem --snapshot-confirmed=<id>.
  const pre = assertRotationPreconditions(env, argv);
  const redisUrl = scope.target === 'redis-wa-auth' ? requireRedisUrl(env) : null;
  const keys: RotationKeys = { apply: pre.apply, oldKey: pre.oldKey, newKey: pre.newKey };
  const mode = pre.apply ? 'LIVE' : 'DRY-RUN';
  if (pre.snapshotId) log(`Snapshot confirmado: ${pre.snapshotId}`);
  log('='.repeat(70));
  log('🔐 RE-ENCRIPTAÇÃO DE CREDENCIAIS — ROTAÇÃO DE CHAVE MESTRA');
  log(
    `Modo: ${pre.apply ? '🚀 LIVE (gravação real)' : '🔍 DRY-RUN (simulação sem gravação, transações READ ONLY)'} — alvo ${scope.target}`,
  );
  log('='.repeat(70));

  let errors = 0;
  let conflicts = 0;
  let divergences = 0;
  if (redisUrl) {
    log(`\nProcessando Redis: ${REDIS_WA_AUTH_MATCH} (sessões WhatsApp/Baileys)`);
    const r = await withRedis(redisUrl, (redis) => reencryptRedisWaAuth(redis, keys));
    log(
      `  ↳ Total chaves: ${r.scanned} | Re-criptografadas: ${r.rotated} | Em claro: ${r.plaintext} | Já em NEW_KEY: ${r.alreadyNew} | Erros: ${r.errors} | Conflitos: ${r.conflicts} | Sumidas: ${r.missing}`,
    );
    if (r.problemKeys.length > 0)
      log(`  ↳ Chaves com erro/conflito (nomes, até 20): ${r.problemKeys.join(', ')}`);
    errors += r.errors;
    conflicts += r.conflicts;
  } else {
    await withDb(env, async (query) => {
      const pf = await runPreflight(query, dbTargets(scope.model), { write: pre.apply, log });
      const orgs = await listOrganizations(query);
      log(`Organizações: ${orgs.length}`);
      for (const [model, fields] of dbModels(scope.model)) {
        const info = tableInfo(pf, model);
        log(
          `\nProcessando Model: ${model} → "${info.table}" (campos: ${fields.join(', ')}; escopo ${info.scope})`,
        );
        const r = await reencryptModel(query, info, fields, keys, { orgs, log });
        log(
          `  ↳ Total linhas: ${r.total} | Re-criptografadas: ${r.rotated} | Puladas: ${r.skipped} | Já em NEW_KEY: ${r.alreadyNew} | Erros: ${r.errors} (linhas com campo ilegível, não gravadas; campos ilegíveis: ${r.unreadableFields}) | Conflitos: ${r.conflicts}`,
        );
        divergences += logCoverage(log, r.coverage);
        errors += r.errors;
        conflicts += r.conflicts;
      }
      if (!scope.model || scope.model === SETTING_MODEL) {
        log(`\nProcessando Model: Setting (integration.* + ${LEGACY_BITRIX_KEY}, por campo)`);
        const r = await reencryptSettings(query, tableInfo(pf, SETTING_MODEL), keys, {
          orgs,
          log,
        });
        log(
          `  ↳ Total linhas: ${r.total} | Re-criptografadas: ${r.rotated} | Erros: ${r.errors} (linhas com campo ilegível ou versão desconhecida, não gravadas) | Conflitos: ${r.conflicts}`,
        );
        divergences += logCoverage(log, r.coverage);
        errors += r.errors;
        conflicts += r.conflicts;
      }
    });
  }

  log(`\n${'='.repeat(70)}`);
  if (errors > 0 || conflicts > 0 || divergences > 0) {
    log(
      `❌ Concluído COM PROBLEMAS: Erros=${errors} Conflitos=${conflicts} Divergências=${divergences}. [Modo: ${mode}] Código ${EXIT_DATA_ISSUES}.`,
    );
    log('='.repeat(70));
    return EXIT_DATA_ISSUES;
  }
  log(`✅ Concluído sem erros, cobertura conferida. [Modo: ${mode}]`);
  log('='.repeat(70));
  return 0;
}

export async function main(
  argv: readonly string[] = process.argv,
  log: Log = console.log,
  env: ScriptEnv = process.env,
): Promise<number> {
  return isVerifyMode(argv) ? runVerify(argv, log, env) : runRotation(argv, log, env);
}

if (process.argv[1]?.endsWith('reencrypt-credentials.ts')) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err: Error) => {
      console.error('[FALHA CRÍTICA]:', err.message);
      process.exit(1);
    });
}
