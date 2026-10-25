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
// - `db`: os models de TARGET_MODELS e o `Setting` (segredos POR CAMPO dentro do JSON de
//   `Setting.value`, `key = integration.*` + legada `bitrix_webhook_url`, organização por
//   organização com `app.current_tenant_id` — Setting não aceita bypass de RLS). `--model=<Model>`
//   restringe a um model (inclusive `--model=Setting`).
// - `redis-wa-auth`: sessões WhatsApp/Baileys `wa-auth:<org>:*` (useRedisAuthState.ts), cifradas
//   com a MESMA chave. SCAN (nunca KEYS), troca atômica por chave (compare-and-set em Lua) que
//   preserva o TTL, nunca loga valores.
//
// Gravação ATÔMICA POR LINHA: se qualquer campo cifrado de uma linha/chave não decifra com
// OLD_KEY, a linha inteira NÃO é gravada (antes, nos models fora do Setting, os campos legíveis
// eram regravados e o ilegível ficava para trás, deixando a linha com chaves misturadas).
//
// `--verify` (somente leitura; sem NEW_KEY nem snapshot): conta, por model/alvo, valores legíveis,
// ilegíveis e em claro sob UMA chave.
//
// Código de saída: 0 = sem problemas; 1 = pré-condição/falha de execução; 2 = há Erros (linhas
// ilegíveis), conflitos no Redis ou, no --verify, algum valor ilegível — em dry-run, apply ou verify.
//

import pg from 'pg';
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
} from './credential-script-guards.js';
import {
  classifySettingValue,
  LEGACY_BITRIX_KEY,
  SECRET_FIELDS_BY_SETTING_KEY,
  TARGET_SETTING_KEYS,
} from './integration-settings-targets.js';

export { decryptWithKey, encryptWithKey } from './credential-envelope.js';

const { Pool } = pg;

export const TARGET_MODELS: Readonly<Record<string, readonly string[]>> = {
  GoogleWorkspaceConnection: ['accessToken', 'refreshToken'],
  BitrixConnection: ['webhookUrl', 'webhookSecret'],
  ThreeCXConnection: ['apiKey', 'apiSecret'],
  VoiceHubConnection: ['apiKey', 'webhookSecret'],
  SlackConnection: ['webhookUrl', 'botToken'],
  StripeConnection: ['secretKey', 'webhookSecret'],
  OmieConnection: ['appKey', 'appSecret'],
  ExternalCrmConnection: ['config'],
  Account: ['accessToken', 'refreshToken', 'idToken'],
  Contact: ['email', 'phone', 'whatsapp'],
  VoiceCallLog: ['transcript', 'summary', 'recordingUrl'],
};
export const SETTING_MODEL = 'Setting';
export const ALLOWED_MODELS: readonly string[] = [...Object.keys(TARGET_MODELS), SETTING_MODEL];
export const REDIS_WA_AUTH_MATCH = 'wa-auth:*';

export type QueryFn = <R = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => Promise<{ rows: R[] }>;
export type Log = (line: string) => void;

export interface RotationKeys {
  apply: boolean;
  oldKey: Buffer;
  newKey: Buffer;
}

/**
 * Puro: re-cifra (OLD_KEY → NEW_KEY) os campos `enc:v1:` de um `Setting.value` de integração.
 * Texto puro legado fica intocado (é trabalho do backfill-integration-settings-encryption.ts).
 * Devolve `null` se nada mudou. Lança se algum campo não decifrar com OLD_KEY (fail-closed).
 */
export function reencryptIntegrationSettingValue(
  key: string,
  value: unknown,
  oldKeyBuf: Buffer,
  newKeyBuf: Buffer,
): { nextValue: unknown; fields: string[] } | null {
  const rotate = (v: string) => encryptWithKey(decryptWithKey(v, oldKeyBuf), newKeyBuf);
  if (key === LEGACY_BITRIX_KEY) {
    return typeof value === 'string' && value.startsWith(VERSION_PREFIX)
      ? { nextValue: rotate(value), fields: ['<value>'] }
      : null;
  }
  const secretFields = SECRET_FIELDS_BY_SETTING_KEY.get(key);
  if (!secretFields || !value || typeof value !== 'object' || Array.isArray(value)) return null;
  const current = value as Record<string, unknown>;
  const next: Record<string, unknown> = { ...current };
  const fields: string[] = [];
  for (const f of secretFields) {
    const v = current[f];
    if (typeof v === 'string' && v.startsWith(VERSION_PREFIX)) {
      next[f] = rotate(v);
      fields.push(f);
    }
  }
  return fields.length > 0 ? { nextValue: next, fields } : null;
}

export interface RowPlan {
  /** Campos a gravar. Vazio se nada a rotacionar OU se a linha tem campo ilegível. */
  updates: Record<string, string>;
  unreadableFields: string[];
  skipped: number;
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
  for (const field of fields) {
    const val = row[field];
    if (typeof val !== 'string' || !val.startsWith(ENC_ANY_PREFIX)) {
      skipped++;
      continue;
    }
    try {
      if (!val.startsWith(VERSION_PREFIX)) throw new Error('versão de envelope desconhecida');
      updates[field] = encryptWithKey(decryptWithKey(val, oldKeyBuf), newKeyBuf);
    } catch {
      unreadableFields.push(field);
    }
  }
  return { updates: unreadableFields.length > 0 ? {} : updates, unreadableFields, skipped };
}

export interface ModelResult {
  total: number;
  rotated: number;
  skipped: number;
  /** Linhas com ≥1 campo ilegível — NÃO gravadas. */
  errors: number;
  unreadableFields: number;
}

function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Identificador inválido: ${name}`);
  return `"${name}"`;
}

export async function reencryptModel(
  query: QueryFn,
  model: string,
  fields: readonly string[],
  { apply, oldKey, newKey }: RotationKeys,
): Promise<ModelResult> {
  const selectCols = ['id', ...fields].map(quoteIdent).join(', ');
  const { rows } = await query<Record<string, unknown>>(
    `SELECT ${selectCols} FROM ${quoteIdent(model)}`,
  );
  const res: ModelResult = {
    total: rows.length,
    rotated: 0,
    skipped: 0,
    errors: 0,
    unreadableFields: 0,
  };
  for (const row of rows) {
    const plan = planRowReencrypt(row, fields, oldKey, newKey);
    res.skipped += plan.skipped;
    if (plan.unreadableFields.length > 0) {
      res.errors++;
      res.unreadableFields += plan.unreadableFields.length;
      continue;
    }
    const cols = Object.keys(plan.updates);
    if (cols.length === 0) continue;
    if (apply) {
      // Um único UPDATE por linha: todos os campos da linha mudam juntos ou nenhum.
      const setClauses = cols.map((f, idx) => `${quoteIdent(f)} = $${idx + 2}`).join(', ');
      await query(`UPDATE ${quoteIdent(model)} SET ${setClauses} WHERE id = $1`, [
        row.id,
        ...cols.map((c) => plan.updates[c]),
      ]);
    }
    res.rotated++;
  }
  return res;
}

async function forEachOrgSettingRow(
  query: QueryFn,
  fn: (row: { id: string; key: string; value: unknown }, orgId: string) => Promise<void>,
): Promise<void> {
  await query(`SELECT set_config('app.bypass_rls', 'on', false)`);
  const { rows: orgs } = await query<{ id: string }>(
    `SELECT id FROM "Organization" ORDER BY id ASC`,
  );
  await query(`SELECT set_config('app.bypass_rls', 'off', false)`);
  for (const org of orgs) {
    await query(`SELECT set_config('app.current_tenant_id', $1, false)`, [org.id]);
    const { rows } = await query<{ id: string; key: string; value: unknown }>(
      `SELECT id, key, value FROM "Setting" WHERE "organizationId" = $1 AND key = ANY($2::text[])`,
      [org.id, TARGET_SETTING_KEYS],
    );
    for (const row of rows) await fn(row, org.id);
  }
}

export async function reencryptSettings(
  query: QueryFn,
  { apply, oldKey, newKey }: RotationKeys,
): Promise<Omit<ModelResult, 'skipped' | 'unreadableFields'>> {
  const res = { total: 0, rotated: 0, errors: 0 };
  await forEachOrgSettingRow(query, async (row, orgId) => {
    res.total++;
    let out: ReturnType<typeof reencryptIntegrationSettingValue>;
    try {
      out = reencryptIntegrationSettingValue(row.key, row.value, oldKey, newKey);
    } catch {
      res.errors++; // fail-closed: nenhum campo da linha é gravado
      return;
    }
    if (!out) return;
    if (apply) {
      await query(
        `UPDATE "Setting" SET value = $1::jsonb WHERE id = $2 AND "organizationId" = $3`,
        [JSON.stringify(out.nextValue), row.id, orgId],
      );
    }
    res.rotated++;
  });
  return res;
}

export async function verifyModel(
  query: QueryFn,
  model: string,
  fields: readonly string[],
  key: Buffer,
): Promise<VerifyCounts> {
  const selectCols = ['id', ...fields].map(quoteIdent).join(', ');
  const { rows } = await query<Record<string, unknown>>(
    `SELECT ${selectCols} FROM ${quoteIdent(model)}`,
  );
  const counts = emptyCounts();
  for (const row of rows) for (const f of fields) addClass(counts, classifyValue(row[f], key));
  return counts;
}

export async function verifySettings(query: QueryFn, key: Buffer): Promise<VerifyCounts> {
  const counts = emptyCounts();
  await forEachOrgSettingRow(query, async (row) =>
    classifySettingValue(row.key, row.value, key, counts),
  );
  return counts;
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
    } catch {
      res.errors++; // ex.: WRONGTYPE — não é uma chave de sessão string
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
    let next: string;
    try {
      if (!current.startsWith(VERSION_PREFIX)) throw new Error('versão de envelope desconhecida');
      next = encryptWithKey(decryptWithKey(current, oldKey), newKey);
    } catch {
      res.errors++;
      note(key);
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
    } catch {
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

async function withDb<T>(fn: (query: QueryFn) => Promise<T>): Promise<T> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) throw new Error('DATABASE_URL não definida (obrigatória para --target=db).');
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    const query: QueryFn = async (sql, params) => {
      const r = await client.query(sql, params);
      return { rows: r.rows };
    };
    return await fn(query);
  } finally {
    client.release();
    await pool.end();
  }
}

async function withRedis<T>(url: string, fn: (redis: RedisLike) => Promise<T>): Promise<T> {
  const { default: Redis } = await import('ioredis');
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

async function tableExists(query: QueryFn, model: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists`,
    [model],
  );
  return Boolean(rows[0]?.exists);
}

async function runVerify(argv: readonly string[], log: Log): Promise<number> {
  const scope = parseReencryptScope(argv, ALLOWED_MODELS);
  const { keyEnv, key } = assertVerifyPreconditions(process.env, argv);
  const redisUrl = scope.target === 'redis-wa-auth' ? requireRedisUrl(process.env) : null;
  log('='.repeat(70));
  log(
    `🔎 VERIFY (somente leitura) — chave de ${keyEnv} — alvo ${scope.target}${scope.model ? ` / ${scope.model}` : ''}`,
  );
  log('='.repeat(70));
  let unreadable = 0;
  if (redisUrl) {
    const c = await withRedis(redisUrl, (r) => verifyRedisWaAuth(r, key));
    log(`${fmtVerify(REDIS_WA_AUTH_MATCH, c)} chaves=${c.scanned}`);
    unreadable += c.unreadable;
  } else {
    await withDb(async (query) => {
      await query(`SELECT set_config('app.bypass_rls', 'on', false)`);
      for (const [model, fields] of dbModels(scope.model)) {
        if (!(await tableExists(query, model))) {
          log(`[PULADO] Tabela "${model}" não existe neste schema.`);
          continue;
        }
        const c = await verifyModel(query, model, fields, key);
        log(fmtVerify(model, c));
        unreadable += c.unreadable;
      }
      if (!scope.model || scope.model === SETTING_MODEL) {
        const c = await verifySettings(query, key);
        log(fmtVerify(`${SETTING_MODEL} (integration.* + ${LEGACY_BITRIX_KEY})`, c));
        unreadable += c.unreadable;
      }
    });
  }
  log('='.repeat(70));
  if (unreadable > 0) {
    log(
      `❌ VERIFY FALHOU: ${unreadable} valor(es) ilegível(is) com a chave de ${keyEnv}. Código ${EXIT_DATA_ISSUES}.`,
    );
    return EXIT_DATA_ISSUES;
  }
  log(`✅ VERIFY OK: 0 ilegíveis com a chave de ${keyEnv}.`);
  return 0;
}

async function runRotation(argv: readonly string[], log: Log): Promise<number> {
  const scope = parseReencryptScope(argv, ALLOWED_MODELS);
  // Aborta (lança) antes de qualquer conexão se faltar/for inválida alguma chave, ou se --apply
  // vier sem --snapshot-confirmed=<id>.
  const pre = assertRotationPreconditions(process.env, argv);
  const redisUrl = scope.target === 'redis-wa-auth' ? requireRedisUrl(process.env) : null;
  const keys: RotationKeys = { apply: pre.apply, oldKey: pre.oldKey, newKey: pre.newKey };
  const mode = pre.apply ? 'LIVE' : 'DRY-RUN';
  if (pre.snapshotId) log(`Snapshot confirmado: ${pre.snapshotId}`);
  log('='.repeat(70));
  log('🔐 RE-ENCRIPTAÇÃO DE CREDENCIAIS — ROTAÇÃO DE CHAVE MESTRA');
  log(
    `Modo: ${pre.apply ? '🚀 LIVE (gravação real)' : '🔍 DRY-RUN (simulação sem gravação)'} — alvo ${scope.target}`,
  );
  log('='.repeat(70));

  let errors = 0;
  let conflicts = 0;
  if (redisUrl) {
    log(`\nProcessando Redis: ${REDIS_WA_AUTH_MATCH} (sessões WhatsApp/Baileys)`);
    const r = await withRedis(redisUrl, (redis) => reencryptRedisWaAuth(redis, keys));
    log(
      `  ↳ Total chaves: ${r.scanned} | Re-criptografadas: ${r.rotated} | Em claro: ${r.plaintext} | Erros: ${r.errors} | Conflitos: ${r.conflicts} | Sumidas: ${r.missing}`,
    );
    if (r.problemKeys.length > 0)
      log(`  ↳ Chaves com erro/conflito (nomes, até 20): ${r.problemKeys.join(', ')}`);
    errors += r.errors;
    conflicts += r.conflicts;
  } else {
    await withDb(async (query) => {
      // Bypass de RLS só para os models de conexão (manutenção de infraestrutura); Setting usa tenant.
      await query(`SELECT set_config('app.bypass_rls', 'on', false)`);
      for (const [model, fields] of dbModels(scope.model)) {
        if (!(await tableExists(query, model))) {
          log(`[PULADO] Tabela "${model}" não existe neste schema.`);
          continue;
        }
        log(`\nProcessando Model: ${model} (campos: ${fields.join(', ')})`);
        const r = await reencryptModel(query, model, fields, keys);
        log(
          `  ↳ Total linhas: ${r.total} | Re-criptografadas: ${r.rotated} | Puladas: ${r.skipped} | Erros: ${r.errors} (linhas com campo ilegível, não gravadas; campos ilegíveis: ${r.unreadableFields})`,
        );
        errors += r.errors;
      }
      if (!scope.model || scope.model === SETTING_MODEL) {
        log(`\nProcessando Model: Setting (integration.* + ${LEGACY_BITRIX_KEY}, por campo)`);
        const r = await reencryptSettings(query, keys);
        log(
          `  ↳ Total linhas: ${r.total} | Re-criptografadas: ${r.rotated} | Erros: ${r.errors} (linhas com campo ilegível, não gravadas)`,
        );
        errors += r.errors;
      }
    });
  }

  log(`\n${'='.repeat(70)}`);
  if (errors > 0 || conflicts > 0) {
    log(
      `❌ Concluído COM PROBLEMAS: Erros=${errors} Conflitos=${conflicts}. [Modo: ${mode}] Código ${EXIT_DATA_ISSUES}.`,
    );
    log('='.repeat(70));
    return EXIT_DATA_ISSUES;
  }
  log(`✅ Concluído sem erros. [Modo: ${mode}]`);
  log('='.repeat(70));
  return 0;
}

export async function main(
  argv: readonly string[] = process.argv,
  log: Log = console.log,
): Promise<number> {
  return isVerifyMode(argv) ? runVerify(argv, log) : runRotation(argv, log);
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
