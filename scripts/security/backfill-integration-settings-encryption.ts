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
// - Nunca imprime valor (nem cifrado nem em claro) — só org/key/campos.
// - Sem `app.bypass_rls` para Setting: processa organização por organização setando
//   `app.current_tenant_id` (mesmo padrão de backfill-contact-pii.ts). bypass só para listar
//   Organization.
// - Rodar em produção exige OK explícito do Marcelo (regra do Agente 15). Não executado no PR.
//
// Uso:
//   DATABASE_URL=... CREDENTIALS_ENCRYPTION_KEY=... npx tsx scripts/security/backfill-integration-settings-encryption.ts          # dry-run
//   DATABASE_URL=... CREDENTIALS_ENCRYPTION_KEY=... npx tsx scripts/security/backfill-integration-settings-encryption.ts --apply --snapshot-confirmed=<id>  # grava

import { encryptField } from '../../src/lib/crypto/secretFields.js';
import {
  assertBackfillPreconditions,
  ScriptPreconditionError,
} from './credential-script-guards.js';
import {
  KNOWN_FIELDS_BY_SETTING_KEY,
  LEGACY_BITRIX_KEY,
  SECRET_FIELDS_BY_SETTING_KEY,
  TARGET_SETTING_KEYS,
} from './integration-settings-targets.js';

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
}

function isPlaintext(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && !v.startsWith(ENC_PREFIX);
}

/** Puro: decide o que mudar numa linha. Nunca toca valor já cifrado. */
export function planSettingBackfill(
  row: Pick<SettingRow, 'key' | 'value'>,
  encrypt: (plain: string) => string = encryptField,
): BackfillPlan {
  if (row.key === LEGACY_BITRIX_KEY) {
    return isPlaintext(row.value)
      ? { nextValue: encrypt(row.value), encryptedFields: ['<value>'], unknownFields: [] }
      : { nextValue: null, encryptedFields: [], unknownFields: [] };
  }
  const secretFields = SECRET_FIELDS_BY_SETTING_KEY.get(row.key);
  if (!secretFields || !row.value || typeof row.value !== 'object' || Array.isArray(row.value)) {
    return { nextValue: null, encryptedFields: [], unknownFields: [] };
  }
  const value = row.value as Record<string, unknown>;
  const known = new Set(KNOWN_FIELDS_BY_SETTING_KEY.get(row.key) ?? []);
  const unknownFields = Object.keys(value)
    .filter((k) => !known.has(k))
    .sort();
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
    ? { nextValue: next, encryptedFields, unknownFields }
    : { nextValue: null, encryptedFields: [], unknownFields };
}

export type QueryFn = <R = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => Promise<{ rows: R[] }>;

export interface BackfillOptions {
  apply: boolean;
  /** Obrigatório com `apply` (defesa em profundidade além do main): id do snapshot do banco. */
  snapshotId?: string | null;
  log?: (line: string) => void;
  encrypt?: (plain: string) => string;
}

export interface BackfillResult {
  organizations: number;
  scanned: number;
  toEncrypt: number;
  written: number;
  /** Linhas com chaves fora do catálogo (reportadas, preservadas). */
  rowsWithUnknownFields: number;
}

export async function runIntegrationSettingsBackfill(
  query: QueryFn,
  { apply, snapshotId, log = console.log, encrypt = encryptField }: BackfillOptions,
): Promise<BackfillResult> {
  if (apply && !snapshotId?.trim()) {
    throw new ScriptPreconditionError(
      'apply exige snapshotId (--snapshot-confirmed=<id>) — tire o snapshot do banco antes.',
    );
  }
  await query(`SELECT set_config('app.bypass_rls', 'on', false)`);
  const { rows: orgs } = await query<{ id: string }>(
    `SELECT id FROM "Organization" ORDER BY id ASC`,
  );
  // Setting não está na allowlist de bypass: desliga antes de tocar Setting e usa o tenant real.
  await query(`SELECT set_config('app.bypass_rls', 'off', false)`);

  const result: BackfillResult = {
    organizations: orgs.length,
    scanned: 0,
    toEncrypt: 0,
    written: 0,
    rowsWithUnknownFields: 0,
  };

  for (const org of orgs) {
    await query(`SELECT set_config('app.current_tenant_id', $1, false)`, [org.id]);
    const { rows } = await query<SettingRow>(
      `SELECT id, "organizationId", key, value FROM "Setting"
       WHERE "organizationId" = $1 AND key = ANY($2::text[])
       ORDER BY id ASC`,
      [org.id, TARGET_SETTING_KEYS],
    );
    for (const row of rows) {
      result.scanned++;
      const plan = planSettingBackfill(row, encrypt);
      if (plan.unknownFields.length > 0) {
        result.rowsWithUnknownFields++;
        log(
          `${apply ? '[APPLY]' : '[DRY-RUN]'} org=${row.organizationId} key=${row.key} fora_do_catalogo=${plan.unknownFields.join(',')} (preservadas, não cifradas)`,
        );
      }
      if (plan.nextValue === null) continue;
      result.toEncrypt++;
      log(
        `${apply ? '[APPLY]' : '[DRY-RUN]'} org=${row.organizationId} key=${row.key} campos=${plan.encryptedFields.join(',')}`,
      );
      if (!apply) continue;
      await query(
        `UPDATE "Setting" SET value = $1::jsonb, "updatedAt" = NOW()
         WHERE id = $2 AND "organizationId" = $3`,
        [JSON.stringify(plan.nextValue), row.id, row.organizationId],
      );
      result.written++;
    }
  }

  log(
    `Concluído [${apply ? 'APPLY' : 'DRY-RUN'}] orgs=${result.organizations} linhas=${result.scanned} a_cifrar=${result.toEncrypt} gravadas=${result.written} linhas_com_chaves_fora_do_catalogo=${result.rowsWithUnknownFields}`,
  );
  return result;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória.');
  // Aborta ANTES de conectar: chave explícita/válida; --apply só com --snapshot-confirmed=<id>.
  const { apply, snapshotId } = assertBackfillPreconditions(process.env, process.argv);
  if (snapshotId) console.log(`Snapshot confirmado: ${snapshotId}`);
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    const query: QueryFn = async (sql, params) => {
      const res = await client.query(sql, params);
      return { rows: res.rows };
    };
    await runIntegrationSettingsBackfill(query, { apply, snapshotId });
    if (!apply) {
      console.log(
        'Nada gravado (dry-run). Para gravar: snapshot do banco + --apply --snapshot-confirmed=<id>.',
      );
    }
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('backfill-integration-settings-encryption.ts')) {
  main().catch((err: unknown) => {
    console.error('[FALHA]', err instanceof Error ? err.message : 'erro desconhecido');
    process.exit(1);
  });
}
