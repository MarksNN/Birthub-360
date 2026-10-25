// src/lib/integrations/integrationSettings.repository.ts
//
// Único caminho de leitura/escrita das credenciais de integração guardadas em
// `Setting` (`key = integration.*`, coluna `value Json`). Antes deste módulo, cada tool do Hub
// Universal (src/features/intelligence/tools/universal*Tool.ts) e o próprio
// universalConnectors.service liam/gravavam `prisma.setting` direto, com os tokens em TEXTO PURO
// dentro do JSON — a extensão de cifra do Prisma (src/lib/prisma.ts + ENCRYPTED_MODEL_FIELDS)
// só cobre colunas string, nunca `Json`. Ver docs/ADR/ADR-010-integration-settings-at-rest.md.
//
// Regras:
// - Cifra POR CAMPO (formato `enc:v1:` de src/lib/crypto/secretFields.ts), só nos campos marcados
//   `secret: true` no catálogo (universalConnectors.catalog.ts). O JSON continua um objeto com as
//   mesmas chaves — nada de blob cifrado inteiro. Valor legado sem prefixo é lido em passthrough
//   e recifrado na próxima gravação (ou pelo backfill
//   scripts/security/backfill-integration-settings-encryption.ts).
// - `get`/`getMany` devolvem valores DECIFRADOS — só para uso server-side (chamar a API do
//   provedor). Nunca serializar o retorno para o LLM, logs ou resposta HTTP. Para UI/LLM, use
//   `getStatus`/`listStatus`, que nunca devolvem segredo.
// - Fail-closed: se QUALQUER campo secreto não decifrar (chave errada/dado adulterado), `get`
//   devolve `null` (integração tratada como não configurada) — `tryDecryptField` loga só
//   model/campo/id, nunca o valor.
// - Tenant: sem `bypassRls`. O `orgId` recebido PRECISA ser igual ao tenant do requestContext
//   (o mesmo que a extensão RLS do Prisma usa em `app.current_tenant_id`); ausência de contexto ou
//   divergência lança `IntegrationSettingsTenantError` antes de qualquer query.
// - `save` faz merge: campo ausente, `''` ou contendo `••••` (máscara devolvida pelo GET)
//   PRESERVA o valor atual. A única forma de remover é `clear`.

import type { Prisma } from '@prisma/client';
import {
  INTEGRATION_SETTING_DEFINITIONS,
  type IntegrationProvider,
  isIntegrationProvider,
} from '../../features/intelligence/services/universalConnectors.catalog.js';
import { getTenantId } from '../async-context.js';
import { DECRYPTION_FAILED_MARKER, encryptField, tryDecryptField } from '../crypto/secretFields.js';
import { prisma } from '../prisma.js';

export type { IntegrationProvider } from '../../features/intelligence/services/universalConnectors.catalog.js';

export const ENC_PREFIX = 'enc:';
export const MASK_TOKEN = '••••';
const UNREADABLE_MASK = `${MASK_TOKEN} (ilegível — reconfigure)`;

export interface IntegrationStatus {
  configured: boolean;
  /** Só campos `secret` com valor, mascarados (`••••` + últimos 4 quando o valor tem > 8 chars). */
  masked: Record<string, string>;
  /** Campos NÃO secretos (ex.: companyDomain, boardId, schedulingUrl), em claro. */
  publicFields: Record<string, string>;
}

export interface IntegrationListStatus extends IntegrationStatus {
  updatedAt: Date | null;
}

export class IntegrationSettingsTenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrationSettingsTenantError';
  }
}

export class UnknownIntegrationProviderError extends Error {
  constructor(provider: string) {
    super(`Provedor de integração desconhecido ou sem Setting: ${provider}`);
    this.name = 'UnknownIntegrationProviderError';
  }
}

function assertTenant(orgId: string): void {
  const ctxTenant = getTenantId();
  if (!ctxTenant) {
    throw new IntegrationSettingsTenantError(
      'integrationSettings: sem tenant no requestContext — acesso a credenciais negado.',
    );
  }
  if (!orgId || ctxTenant !== orgId) {
    throw new IntegrationSettingsTenantError(
      'integrationSettings: organizationId diverge do tenant do requestContext.',
    );
  }
}

function definitionFor(provider: string) {
  if (!isIntegrationProvider(provider)) {
    throw new UnknownIntegrationProviderError(provider);
  }
  return INTEGRATION_SETTING_DEFINITIONS[provider];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

interface DecodedFields {
  values: Record<string, string>;
  failed: string[];
}

function decodeFields(
  provider: IntegrationProvider,
  rawValue: unknown,
  rowId: string | undefined,
): DecodedFields {
  const def = INTEGRATION_SETTING_DEFINITIONS[provider];
  const raw = asObject(rawValue);
  const values: Record<string, string> = {};
  const failed: string[] = [];
  for (const field of def.fields) {
    const stored = raw[field.key];
    if (typeof stored !== 'string' || stored.trim().length === 0) continue;
    if (!('secret' in field && field.secret)) {
      values[field.key] = stored;
      continue;
    }
    const plain = tryDecryptField(stored, {
      model: 'Setting',
      field: `${def.settingKey}.${field.key}`,
      id: rowId,
    });
    if (plain === DECRYPTION_FAILED_MARKER) {
      failed.push(field.key);
      continue;
    }
    values[field.key] = plain;
  }
  return { values, failed };
}

function toDecrypted(decoded: DecodedFields): Record<string, string> | null {
  if (decoded.failed.length > 0) return null;
  return Object.keys(decoded.values).length > 0 ? decoded.values : null;
}

export function maskSecretValue(value: string): string {
  if (value.length <= 8) return `${MASK_TOKEN}${MASK_TOKEN}`;
  return `${MASK_TOKEN}${value.slice(-4)}`;
}

function toStatus(provider: IntegrationProvider, decoded: DecodedFields): IntegrationStatus {
  const def = INTEGRATION_SETTING_DEFINITIONS[provider];
  const masked: Record<string, string> = {};
  const publicFields: Record<string, string> = {};
  for (const field of def.fields) {
    const isSecret = 'secret' in field && field.secret === true;
    if (decoded.failed.includes(field.key)) {
      masked[field.key] = UNREADABLE_MASK;
      continue;
    }
    const value = decoded.values[field.key];
    if (value === undefined) continue;
    if (isSecret) masked[field.key] = maskSecretValue(value);
    else publicFields[field.key] = value;
  }
  return {
    configured: decoded.failed.length === 0 && Object.keys(decoded.values).length > 0,
    masked,
    publicFields,
  };
}

function findRow(orgId: string, provider: IntegrationProvider) {
  return prisma.setting.findFirst({
    where: {
      organizationId: orgId,
      userId: null,
      key: INTEGRATION_SETTING_DEFINITIONS[provider].settingKey,
    },
    select: { id: true, value: true, updatedAt: true },
  });
}

async function findRows(orgId: string, providers: readonly IntegrationProvider[]) {
  const keyToProvider = new Map<string, IntegrationProvider>(
    providers.map((p) => [INTEGRATION_SETTING_DEFINITIONS[p].settingKey, p]),
  );
  if (keyToProvider.size === 0) return [];
  const rows = await prisma.setting.findMany({
    where: { organizationId: orgId, userId: null, key: { in: [...keyToProvider.keys()] } },
    select: { id: true, key: true, value: true, updatedAt: true },
  });
  return rows.flatMap((row) => {
    const provider = keyToProvider.get(row.key);
    return provider ? [{ ...row, provider }] : [];
  });
}

/** Valores DECIFRADOS — só server-side. `null` = não configurado ou falha de decifra. */
export async function get(
  orgId: string,
  provider: IntegrationProvider,
): Promise<Record<string, string> | null> {
  definitionFor(provider);
  assertTenant(orgId);
  const row = await findRow(orgId, provider);
  if (!row) return null;
  return toDecrypted(decodeFields(provider, row.value, row.id));
}

/** Como `get`, para vários providers numa ÚNICA query. Providers não configurados ficam fora. */
export async function getMany<P extends IntegrationProvider>(
  orgId: string,
  providers: readonly P[],
): Promise<Partial<Record<P, Record<string, string>>>> {
  for (const p of providers) definitionFor(p);
  assertTenant(orgId);
  const result: Partial<Record<P, Record<string, string>>> = {};
  for (const row of await findRows(orgId, providers)) {
    const decrypted = toDecrypted(decodeFields(row.provider, row.value, row.id));
    if (decrypted) result[row.provider as P] = decrypted;
  }
  return result;
}

/** Status seguro para UI/LLM — nunca devolve segredo. */
export async function getStatus(
  orgId: string,
  provider: IntegrationProvider,
): Promise<IntegrationStatus> {
  definitionFor(provider);
  assertTenant(orgId);
  const row = await findRow(orgId, provider);
  return toStatus(provider, decodeFields(provider, row?.value, row?.id));
}

/** Status de TODOS os providers `integration.*` do catálogo, numa única query. */
export async function listStatus(
  orgId: string,
): Promise<Record<IntegrationProvider, IntegrationListStatus>> {
  assertTenant(orgId);
  const providers = Object.keys(INTEGRATION_SETTING_DEFINITIONS) as IntegrationProvider[];
  const rows = new Map((await findRows(orgId, providers)).map((r) => [r.provider, r]));
  return Object.fromEntries(
    providers.map((p) => {
      const row = rows.get(p);
      return [
        p,
        { ...toStatus(p, decodeFields(p, row?.value, row?.id)), updatedAt: row?.updatedAt ?? null },
      ];
    }),
  ) as Record<IntegrationProvider, IntegrationListStatus>;
}

function isPreserveSentinel(value: string): boolean {
  return value.length === 0 || value.includes(MASK_TOKEN);
}

function encryptIfNeeded(value: string): string {
  return value.startsWith(ENC_PREFIX) ? value : encryptField(value);
}

/**
 * Merge com o valor anterior. Campo ausente, `''` ou com `••••` PRESERVA o atual; chaves fora do
 * catálogo do provider são ignoradas. Campos `secret` são gravados cifrados (inclusive os
 * preservados que ainda estavam em texto puro legado). Devolve as chaves efetivamente alteradas.
 */
export async function save(
  orgId: string,
  provider: IntegrationProvider,
  patch: Record<string, string>,
): Promise<{ updatedFields: string[] }> {
  const def = definitionFor(provider);
  assertTenant(orgId);
  const existing = await findRow(orgId, provider);
  const previous = asObject(existing?.value);
  const next: Record<string, unknown> = { ...previous };
  const updatedFields: string[] = [];

  for (const field of def.fields) {
    const isSecret = 'secret' in field && field.secret === true;
    const incoming = patch[field.key];
    const trimmed = typeof incoming === 'string' ? incoming.trim() : '';
    if (!isPreserveSentinel(trimmed)) {
      next[field.key] = isSecret ? encryptField(trimmed) : trimmed;
      updatedFields.push(field.key);
      continue;
    }
    const prev = previous[field.key];
    if (isSecret && typeof prev === 'string' && prev.length > 0) {
      next[field.key] = encryptIfNeeded(prev);
    }
  }

  const value = next as Prisma.InputJsonObject;
  if (existing) {
    await prisma.setting.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.setting.create({
      data: { organizationId: orgId, key: def.settingKey, value },
    });
  }
  return { updatedFields };
}

/**
 * Única forma de remover credenciais. Sem `fields`, apaga a linha inteira; com `fields`, remove só
 * essas chaves (e apaga a linha se não sobrar nada).
 */
export async function clear(
  orgId: string,
  provider: IntegrationProvider,
  fields?: readonly string[],
): Promise<void> {
  const def = definitionFor(provider);
  assertTenant(orgId);
  const existing = await findRow(orgId, provider);
  if (!existing) return;
  if (!fields || fields.length === 0) {
    await prisma.setting.deleteMany({
      where: { organizationId: orgId, userId: null, key: def.settingKey },
    });
    return;
  }
  const next = { ...asObject(existing.value) };
  for (const f of fields) delete next[f];
  if (Object.keys(next).length === 0) {
    await prisma.setting.deleteMany({
      where: { organizationId: orgId, userId: null, key: def.settingKey },
    });
    return;
  }
  await prisma.setting.update({
    where: { id: existing.id },
    data: { value: next as Prisma.InputJsonObject },
  });
}

export const integrationSettingsRepository = {
  get,
  getMany,
  getStatus,
  listStatus,
  save,
  clear,
};
