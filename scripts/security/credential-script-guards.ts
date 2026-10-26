// scripts/security/credential-script-guards.ts
//
// Pré-condições OBRIGATÓRIAS dos scripts que gravam credenciais cifradas
// (backfill-integration-settings-encryption.ts e reencrypt-credentials.ts). Puro (sem pg, sem
// src/config/env.ts) para ser testável e rodar ANTES de qualquer conexão com o banco.
//
// Por que existe: src/lib/crypto/secretFields.ts, fora de NODE_ENV=production e sem
// CREDENTIALS_ENCRYPTION_KEY, cai numa chave FIXA de desenvolvimento. Um backfill rodado assim
// contra um banco real gravaria segredos cifrados com uma chave pública — irrecuperáveis com a
// chave real. Por isso os scripts NÃO confiam em NODE_ENV nem em fallback: a(s) chave(s) têm de
// estar explicitamente no env, válidas, em qualquer ambiente.
//
// Gravação (--apply) também exige `--snapshot-confirmed=<id>`: o id do snapshot/backup do banco
// (ou do Redis, no alvo redis-wa-auth) tirado imediatamente antes (runbook:
// docs/security/runbooks/ROTATE_CREDENTIALS_ENCRYPTION_KEY.md e ADR-010).
//
// `--verify` é um modo SOMENTE LEITURA separado: não exige OLD_KEY/NEW_KEY nem snapshot, lê UMA
// chave (`CREDENTIALS_ENCRYPTION_KEY` ou a env nomeada em `--key-env=NOME`) e não aceita `--apply`.

export class ScriptPreconditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScriptPreconditionError';
  }
}

export type ScriptEnv = Readonly<Record<string, string | undefined>>;

const SNAPSHOT_FLAG = '--snapshot-confirmed';

/** Chave base64 de 32 bytes lida SÓ de `env[name]` — sem fallback, sem chave de dev. */
export function requireExplicitKey(env: ScriptEnv, name: string): Buffer {
  const raw = env[name]?.trim();
  if (!raw) {
    throw new ScriptPreconditionError(
      `${name} não definida explicitamente no ambiente — abortando (sem fallback para chave de desenvolvimento, em qualquer NODE_ENV).`,
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new ScriptPreconditionError(
      `${name} inválida: esperado 32 bytes após decodificar base64, recebido ${buf.length}.`,
    );
  }
  return buf;
}

/** Valor de `--snapshot-confirmed=<id>`, ou `null` se ausente. Lança se presente e vazio. */
export function parseSnapshotConfirmed(argv: readonly string[]): string | null {
  const hits = argv.filter((a) => a === SNAPSHOT_FLAG || a.startsWith(`${SNAPSHOT_FLAG}=`));
  if (hits.length === 0) return null;
  const id = hits[hits.length - 1].slice(SNAPSHOT_FLAG.length + 1).trim();
  if (!id) {
    throw new ScriptPreconditionError(
      `${SNAPSHOT_FLAG} exige o id do snapshot: ${SNAPSHOT_FLAG}=<id-do-snapshot>.`,
    );
  }
  return id;
}

function requireSnapshotForApply(argv: readonly string[]): string {
  const id = parseSnapshotConfirmed(argv);
  if (!id) {
    throw new ScriptPreconditionError(
      `--apply exige ${SNAPSHOT_FLAG}=<id>: tire um snapshot/backup do banco ANTES e informe o id (runbook no ADR-010).`,
    );
  }
  return id;
}

export interface BackfillPreconditions {
  apply: boolean;
  /** Só com `apply`. */
  snapshotId: string | null;
}

/** Backfill: CREDENTIALS_ENCRYPTION_KEY explícita e válida; `--apply` ⇒ snapshot confirmado. */
export function assertBackfillPreconditions(
  env: ScriptEnv,
  argv: readonly string[],
): BackfillPreconditions {
  rejectVerifyCombination(argv);
  requireExplicitKey(env, 'CREDENTIALS_ENCRYPTION_KEY');
  const apply = argv.includes('--apply');
  return { apply, snapshotId: apply ? requireSnapshotForApply(argv) : null };
}

export interface RotationPreconditions {
  apply: boolean;
  snapshotId: string | null;
  oldKey: Buffer;
  newKey: Buffer;
}

/**
 * Rotação: CREDENTIALS_ENCRYPTION_KEY, OLD_KEY e NEW_KEY explícitas (sem fallback entre elas nem
 * para NEW_CREDENTIALS_ENCRYPTION_KEY), válidas, OLD≠NEW e CREDENTIALS_ENCRYPTION_KEY igual a uma
 * das duas (pega env trocado). DRY-RUN por padrão; grava só com `--apply` + snapshot confirmado.
 */
export function assertRotationPreconditions(
  env: ScriptEnv,
  argv: readonly string[],
): RotationPreconditions {
  rejectVerifyCombination(argv);
  const current = requireExplicitKey(env, 'CREDENTIALS_ENCRYPTION_KEY');
  const oldKey = requireExplicitKey(env, 'OLD_KEY');
  const newKey = requireExplicitKey(env, 'NEW_KEY');
  if (oldKey.equals(newKey)) {
    throw new ScriptPreconditionError('OLD_KEY e NEW_KEY são idênticas — nada a rotacionar.');
  }
  if (!current.equals(oldKey) && !current.equals(newKey)) {
    throw new ScriptPreconditionError(
      'CREDENTIALS_ENCRYPTION_KEY não corresponde nem a OLD_KEY nem a NEW_KEY — ambiente provavelmente trocado; abortando.',
    );
  }
  const apply = argv.includes('--apply');
  if (apply && argv.includes('--dry-run')) {
    throw new ScriptPreconditionError('--apply e --dry-run são mutuamente exclusivos.');
  }
  return { apply, snapshotId: apply ? requireSnapshotForApply(argv) : null, oldKey, newKey };
}

const VERIFY_FLAG = '--verify';
const KEY_ENV_FLAG = '--key-env';
const TARGET_FLAG = '--target';
const MODEL_FLAG = '--model';
const DEFAULT_KEY_ENV = 'CREDENTIALS_ENCRYPTION_KEY';
const ENV_NAME_RE = /^[A-Z][A-Z0-9_]*$/;

/** Último valor de `--flag=<v>`; `null` se ausente; lança se presente sem valor. */
function parseValueFlag(argv: readonly string[], flag: string, hint: string): string | null {
  const hits = argv.filter((a) => a === flag || a.startsWith(`${flag}=`));
  if (hits.length === 0) return null;
  const value = hits[hits.length - 1].slice(flag.length + 1).trim();
  if (!value) throw new ScriptPreconditionError(`${flag} exige um valor: ${flag}=${hint}.`);
  return value;
}

export function isVerifyMode(argv: readonly string[]): boolean {
  return argv.includes(VERIFY_FLAG);
}

/** Os modos de gravação/dry-run recusam `--verify` (precisa ir pelo assertVerifyPreconditions). */
function rejectVerifyCombination(argv: readonly string[]): void {
  if (isVerifyMode(argv)) {
    throw new ScriptPreconditionError(
      '--verify é um modo próprio (somente leitura) — use assertVerifyPreconditions, sem --apply.',
    );
  }
}

/** Nome da env com a chave a verificar: `--key-env=NOME` ou `CREDENTIALS_ENCRYPTION_KEY`. */
export function parseKeyEnvName(argv: readonly string[]): string {
  const name = parseValueFlag(argv, KEY_ENV_FLAG, '<NOME_DA_ENV>') ?? DEFAULT_KEY_ENV;
  if (!ENV_NAME_RE.test(name)) {
    throw new ScriptPreconditionError(
      `${KEY_ENV_FLAG} inválido: esperado nome de variável de ambiente em MAIÚSCULAS (ex.: ${KEY_ENV_FLAG}=VERIFY_KEY).`,
    );
  }
  return name;
}

export interface VerifyPreconditions {
  /** Nome da env de onde a chave foi lida (para log; nunca o valor). */
  keyEnv: string;
  key: Buffer;
}

/**
 * `--verify`: somente leitura. Chave explícita e válida em `--key-env=NOME` (padrão
 * CREDENTIALS_ENCRYPTION_KEY), sem fallback. Não exige OLD_KEY/NEW_KEY nem snapshot; recusa
 * `--apply` (verificar nunca grava).
 */
export function assertVerifyPreconditions(
  env: ScriptEnv,
  argv: readonly string[],
): VerifyPreconditions {
  if (!isVerifyMode(argv)) {
    throw new ScriptPreconditionError('assertVerifyPreconditions exige --verify.');
  }
  if (argv.includes('--apply')) {
    throw new ScriptPreconditionError(
      '--verify e --apply são mutuamente exclusivos (verify nunca grava).',
    );
  }
  const keyEnv = parseKeyEnvName(argv);
  return { keyEnv, key: requireExplicitKey(env, keyEnv) };
}

export type ReencryptTarget = 'db' | 'redis-wa-auth';
const TARGETS: readonly ReencryptTarget[] = ['db', 'redis-wa-auth'];

export interface ReencryptScope {
  target: ReencryptTarget;
  /** Só no alvo `db`; `null` = todos os models + Setting. */
  model: string | null;
}

/**
 * `--target=db|redis-wa-auth` (padrão `db`) e `--model=<Model>` (só `db`, tem de estar em
 * `allowedModels`). Antes, `--model=` vazio ou um nome errado viravam "todos" ou "nenhum" em
 * silêncio; agora abortam.
 */
export function parseReencryptScope(
  argv: readonly string[],
  allowedModels: readonly string[],
): ReencryptScope {
  const rawTarget = parseValueFlag(argv, TARGET_FLAG, TARGETS.join('|')) ?? 'db';
  if (!(TARGETS as readonly string[]).includes(rawTarget)) {
    throw new ScriptPreconditionError(
      `${TARGET_FLAG} desconhecido: "${rawTarget}". Valores aceitos: ${TARGETS.join(', ')}.`,
    );
  }
  const target = rawTarget as ReencryptTarget;
  const model = parseValueFlag(argv, MODEL_FLAG, '<Model>');
  if (model && target !== 'db') {
    throw new ScriptPreconditionError(`${MODEL_FLAG} só vale com ${TARGET_FLAG}=db.`);
  }
  if (model && !allowedModels.includes(model)) {
    throw new ScriptPreconditionError(
      `${MODEL_FLAG} desconhecido: "${model}". Aceitos: ${allowedModels.join(', ')}.`,
    );
  }
  return { target, model };
}

/** URL explícita do Redis para o alvo redis-wa-auth — sem fallback para localhost. */
export function requireRedisUrl(env: ScriptEnv): string {
  const url = env.REDIS_URL?.trim();
  if (!url) {
    throw new ScriptPreconditionError(
      'REDIS_URL não definida explicitamente — obrigatória para --target=redis-wa-auth (sem fallback para localhost).',
    );
  }
  return url;
}
