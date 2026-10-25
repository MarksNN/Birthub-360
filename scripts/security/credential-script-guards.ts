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
// tirado imediatamente antes (ver docs/ADR/ADR-010-integration-settings-at-rest.md — runbook).

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
