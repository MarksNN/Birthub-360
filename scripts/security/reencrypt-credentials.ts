// scripts/security/reencrypt-credentials.ts
//
// Utilitário de re-encriptação de credenciais e dados em repouso
// para suporte à Rotação da Chave Mestra (CREDENTIALS_ENCRYPTION_KEY).
//
// Propriedade: Agente 15 (Segurança Aplicada e Rotação de Segredos)
//
// Uso:
//   DATABASE_URL=... OLD_KEY=<base64-32b> NEW_KEY=<base64-32b> npx tsx scripts/security/reencrypt-credentials.ts [--dry-run] [--model=BitrixConnection]
//
// `--model=Setting` (ou sem filtro) também re-cifra os campos secretos POR CAMPO dentro do JSON
// de `Setting.value` (`key = integration.*`, ver
// src/lib/integrations/integrationSettings.repository.ts) e a chave legada `bitrix_webhook_url`.
// Setting não aceita bypass de RLS: é processado organização por organização com
// `app.current_tenant_id`.
//

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import pg from 'pg';
import {
  LEGACY_BITRIX_KEY,
  SECRET_FIELDS_BY_SETTING_KEY,
  TARGET_SETTING_KEYS,
} from './integration-settings-targets.js';

const { Pool } = pg;

const ALGORITHM = 'aes-256-gcm';
const VERSION_PREFIX = 'enc:v1:';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const BATCH_SIZE = 250;

const dryRun = process.argv.includes('--dry-run');
const modelFilterArg = process.argv.find((a) => a.startsWith('--model='))?.split('=')[1];

const TARGET_MODELS: Record<string, string[]> = {
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

function parseKey(rawKey: string | undefined, name: string): Buffer {
  if (!rawKey?.trim()) {
    throw new Error(`Variável ${name} não fornecida. Gere uma chave válida de 32 bytes em base64.`);
  }
  const buf = Buffer.from(rawKey.trim(), 'base64');
  if (buf.length !== 32) {
    throw new Error(
      `${name} inválida: esperado 32 bytes após decodificação base64, recebido ${buf.length}.`,
    );
  }
  return buf;
}

export function decryptWithKey(stored: string, keyBuf: Buffer): string {
  if (!stored.startsWith(VERSION_PREFIX)) {
    return stored;
  }
  const parts = stored.slice(VERSION_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de envelope inválido.');
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, keyBuf, Buffer.from(ivB64, 'base64'), {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function encryptWithKey(plaintext: string, keyBuf: Buffer): string {
  // IV de CSPRNG (antes: Math.random — IV previsível/repetível quebra a garantia do GCM).
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv, { authTagLength: AUTH_TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${VERSION_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
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

async function reencryptIntegrationSettings(
  client: pg.PoolClient,
  oldKeyBuf: Buffer,
  newKeyBuf: Buffer,
): Promise<void> {
  console.log(`\nProcessando Model: Setting (integration.* + ${LEGACY_BITRIX_KEY}, por campo)`);
  await client.query(`SELECT set_config('app.bypass_rls', 'on', false)`);
  const { rows: orgs } = await client.query<{ id: string }>(
    `SELECT id FROM "Organization" ORDER BY id ASC`,
  );
  await client.query(`SELECT set_config('app.bypass_rls', 'off', false)`);
  let rotated = 0;
  let errors = 0;
  let total = 0;
  for (const org of orgs) {
    await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [org.id]);
    const { rows } = await client.query<{ id: string; key: string; value: unknown }>(
      `SELECT id, key, value FROM "Setting" WHERE "organizationId" = $1 AND key = ANY($2::text[])`,
      [org.id, TARGET_SETTING_KEYS],
    );
    for (const row of rows) {
      total++;
      try {
        const res = reencryptIntegrationSettingValue(row.key, row.value, oldKeyBuf, newKeyBuf);
        if (!res) continue;
        if (!dryRun) {
          await client.query(
            `UPDATE "Setting" SET value = $1::jsonb WHERE id = $2 AND "organizationId" = $3`,
            [JSON.stringify(res.nextValue), row.id, org.id],
          );
        }
        rotated++;
      } catch {
        errors++;
      }
    }
  }
  console.log(`  ↳ Total linhas: ${total} | Re-criptografadas: ${rotated} | Erros: ${errors}`);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error('[ERRO] DATABASE_URL não definida.');
    process.exit(1);
  }

  const oldKeyBuf = parseKey(
    process.env.OLD_KEY || process.env.CREDENTIALS_ENCRYPTION_KEY,
    'OLD_KEY',
  );
  const newKeyBuf = parseKey(
    process.env.NEW_KEY || process.env.NEW_CREDENTIALS_ENCRYPTION_KEY,
    'NEW_KEY',
  );

  if (oldKeyBuf.equals(newKeyBuf)) {
    console.error('[ERRO] OLD_KEY e NEW_KEY são idênticas. Nenhuma re-encriptação necessária.');
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('🔐 RE-ENCRIPTAÇÃO DE CREDENCIAIS — ROTAÇÃO DE CHAVE MESTRA');
  console.log(
    `Modo: ${dryRun ? '🔍 DRY-RUN (simulação sem gravação)' : '🚀 LIVE (gravação real no banco)'}`,
  );
  console.log('='.repeat(70));

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    // Configura bypass para manutenção de infraestrutura
    await client.query("SET app.bypass_rls = 'on';");

    for (const [model, fields] of Object.entries(TARGET_MODELS)) {
      if (modelFilterArg && model !== modelFilterArg) continue;

      // Verifica se a tabela existe
      const tableCheck = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        );`,
        [model],
      );

      if (!tableCheck.rows[0].exists) {
        console.log(`[PULADO] Tabela "${model}" não existe neste schema.`);
        continue;
      }

      console.log(`\nProcessando Model: ${model} (campos: ${fields.join(', ')})`);

      const selectCols = ['id', ...fields].map((c) => `"${c}"`).join(', ');
      const rowsRes = await client.query(`SELECT ${selectCols} FROM "${model}"`);
      const rows = rowsRes.rows;

      let reencryptedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        const updates: Record<string, string> = {};

        for (const field of fields) {
          const val = row[field];
          if (typeof val === 'string' && val.startsWith(VERSION_PREFIX)) {
            try {
              const plain = decryptWithKey(val, oldKeyBuf);
              const newlyEncrypted = encryptWithKey(plain, newKeyBuf);
              updates[field] = newlyEncrypted;
            } catch {
              errorCount++;
            }
          } else {
            skippedCount++;
          }
        }

        if (Object.keys(updates).length > 0) {
          if (!dryRun) {
            const setClauses = Object.keys(updates)
              .map((f, idx) => `"${f}" = $${idx + 2}`)
              .join(', ');
            const values = [row.id, ...Object.values(updates)];
            await client.query(`UPDATE "${model}" SET ${setClauses} WHERE id = $1`, values);
          }
          reencryptedCount++;
        }
      }

      console.log(
        `  ↳ Total linhas: ${rows.length} | Re-criptografadas: ${reencryptedCount} | Puladas: ${skippedCount} | Erros: ${errorCount}`,
      );
    }

    if (!modelFilterArg || modelFilterArg === 'Setting') {
      await reencryptIntegrationSettings(client, oldKeyBuf, newKeyBuf);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ Concluído com sucesso. [Modo: ${dryRun ? 'DRY-RUN' : 'LIVE'}]`);
    console.log('='.repeat(70));
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('reencrypt-credentials.ts')) {
  main().catch((err) => {
    console.error('[FALHA CRÍTICA]:', err.message);
    process.exit(1);
  });
}
