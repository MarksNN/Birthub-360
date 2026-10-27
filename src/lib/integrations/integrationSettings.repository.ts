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
// - Fail-closed: se QUALQUER campo secreto não decifrar (chave errada/dado adulterado), `get` e
//   `getMany` LANÇAM `IntegrationConfigUnreadableError` — ilegível NÃO é "não configurado", então
//   nenhum caller pode cair num fallback de plataforma (env) por engano. `null` continua
//   significando só "sem configuração". `getStatus`/`listStatus` nunca lançam por isso: expõem
//   `fields[k] = 'set' | 'unset' | 'unreadable'`, `unreadable` e `configured: false`.
//   `tryDecryptField` loga só model/campo/id, nunca o valor.
// - Tenant: sem `bypassRls`. O `orgId` recebido PRECISA ser igual ao tenant do requestContext
//   (o mesmo que a extensão RLS do Prisma usa em `app.current_tenant_id`); ausência de contexto,
//   divergência ou contexto com `bypassRls: true` lança `IntegrationSettingsTenantError` antes de
//   qualquer query.
// - `save` faz merge: campo ausente, `''` ou contendo `••••` (máscara devolvida pelo GET)
//   PRESERVA o valor atual. A única forma de remover é `clear`.

import type { Prisma } from '@prisma/client';
import {
  INTEGRATION_SETTING_DEFINITIONS,
  type IntegrationProvider,
  isIntegrationProvider,
} from '../../features/intelligence/services/universalConnectors.catalog.js';
import { AppError } from '../../shared/middlewares/errorHandler.js';
import { getTenantId, requestContext } from '../async-context.js';
import { DECRYPTION_FAILED_MARKER, encryptField, tryDecryptField } from '../crypto/secretFields.js';
import { prisma } from '../prisma.js';

export type { IntegrationProvider } from '../../features/intelligence/services/universalConnectors.catalog.js';

export const ENC_PREFIX = 'enc:';
export const MASK_TOKEN = '••••';
const UNREADABLE_MASK = `${MASK_TOKEN} (ilegível — reconfigure)`;

export type IntegrationFieldState = 'set' | 'unset' | 'unreadable';

export interface IntegrationStatus {
  /** `false` se não há valor OU se qualquer campo secreto está ilegível (falha de decifra). */
  configured: boolean;
  /** Algum campo secreto não decifrou (chave errada/rotação incompleta/adulteração) — reconfigurar. */
  unreadable: boolean;
  /** Estado por campo do catálogo — use isto (não `masked`) para decidir se um campo existe. */
  fields: Record<string, IntegrationFieldState>;
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

export class UnknownIntegrationProviderError extends AppError {
  constructor(provider: string) {
    super(`Provedor de integração desconhecido ou sem Setting: ${provider}`, 400);
    this.name = 'UnknownIntegrationProviderError';
  }
}

/**
 * A linha existe mas algum campo secreto não decifra. Distinto de "não configurado" de propósito:
 * quem recebe isto NÃO pode cair em fallback de plataforma — deve pedir reconfiguração.
 * A mensagem nunca carrega valor (só provider/campos).
 */
export class IntegrationConfigUnreadableError extends AppError {
  public readonly provider: string;
  public readonly fields: readonly string[];
  constructor(provider: string, fields: readonly string[]) {
    super(
      `Credenciais de ${provider} ilegíveis (falha de decifra em: ${fields.join(', ')}). Reconfigure a integração no Hub Universal.`,
      422,
    );
    this.name = 'IntegrationConfigUnreadableError';
    this.provider = provider;
    this.fields = fields;
  }
}

export function isIntegrationConfigUnreadableError(
  err: unknown,
): err is IntegrationConfigUnreadableError {
  return err instanceof IntegrationConfigUnreadableError;
}

function assertTenant(orgId: string): void {
  if (requestContext.getStore()?.bypassRls === true) {
    throw new IntegrationSettingsTenantError(
      'integrationSettings: contexto com bypassRls recusado — credenciais só no tenant real.',
    );
  }
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

function toDecrypted(
  provider: IntegrationProvider,
  decoded: DecodedFields,
): Record<string, string> | null {
  if (decoded.failed.length > 0)
    throw new IntegrationConfigUnreadableError(provider, decoded.failed);
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
  const fields: Record<string, IntegrationFieldState> = {};
  for (const field of def.fields) {
    const isSecret = 'secret' in field && field.secret === true;
    if (decoded.failed.includes(field.key)) {
      masked[field.key] = UNREADABLE_MASK;
      fields[field.key] = 'unreadable';
      continue;
    }
    const value = decoded.values[field.key];
    if (value === undefined) {
      fields[field.key] = 'unset';
      continue;
    }
    fields[field.key] = 'set';
    if (isSecret) masked[field.key] = maskSecretValue(value);
    else publicFields[field.key] = value;
  }
  const unreadable = decoded.failed.length > 0;
  return {
    configured: !unreadable && Object.keys(decoded.values).length > 0,
    unreadable,
    fields,
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

/**
 * Valores DECIFRADOS — só server-side. `null` = não configurado. Falha de decifra em qualquer campo
 * secreto LANÇA `IntegrationConfigUnreadableError` (nunca `null`: ilegível ≠ não configurado).
 */
export async function get(
  orgId: string,
  provider: IntegrationProvider,
): Promise<Record<string, string> | null> {
  definitionFor(provider);
  assertTenant(orgId);
  const row = await findRow(orgId, provider);
  if (!row) return null;
  return toDecrypted(provider, decodeFields(provider, row.value, row.id));
}

export type IntegrationConfigLookup =
  | { state: 'configured'; values: Record<string, string> }
  | { state: 'unconfigured' }
  | { state: 'unreadable'; fields: string[]; message: string };

/**
 * Variante de `get` que NÃO lança por ilegível: devolve o estado discriminado para o caller tratar
 * explicitamente (tools com fallback de plataforma DEVEM usar isto e, em `unreadable`, pedir
 * reconfiguração em vez de cair no fallback). Tenant/provider inválido continuam lançando.
 */
export async function lookup(
  orgId: string,
  provider: IntegrationProvider,
): Promise<IntegrationConfigLookup> {
  try {
    const values = await get(orgId, provider);
    return values ? { state: 'configured', values } : { state: 'unconfigured' };
  } catch (err) {
    if (err instanceof IntegrationConfigUnreadableError) {
      return { state: 'unreadable', fields: [...err.fields], message: err.message };
    }
    throw err;
  }
}

/**
 * Como `get`, para vários providers numa ÚNICA query. Providers não configurados ficam fora; se
 * QUALQUER um estiver ilegível, lança `IntegrationConfigUnreadableError` (fail-closed). Para só
 * saber o que está configurado (UI/LLM), prefira `listStatus`.
 */
export async function getMany<P extends IntegrationProvider>(
  orgId: string,
  providers: readonly P[],
): Promise<Partial<Record<P, Record<string, string>>>> {
  for (const p of providers) definitionFor(p);
  assertTenant(orgId);
  const result: Partial<Record<P, Record<string, string>>> = {};
  for (const row of await findRows(orgId, providers)) {
    const decrypted = toDecrypted(row.provider, decodeFields(row.provider, row.value, row.id));
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
  lookup,
  getMany,
  getStatus,
  listStatus,
  save,
  clear,
};
