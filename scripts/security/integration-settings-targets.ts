// scripts/security/integration-settings-targets.ts
//
// Alvos de cifra em `Setting` derivados do catálogo do Hub Universal (`secret: true`). Módulo sem
// dependências de runtime além do catálogo (que também não tem nenhuma) e de
// credential-envelope.ts (só node:crypto) — para que reencrypt-credentials.ts possa importá-lo sem
// carregar src/config/env.ts.

import {
  type ConnectorFieldSpec,
  UNIVERSAL_CONNECTOR_DEFINITIONS,
} from '../../src/features/intelligence/services/universalConnectors.catalog.js';
import { addClass, classifyValue, type VerifyCounts } from './credential-envelope.js';

export const LEGACY_BITRIX_KEY = 'bitrix_webhook_url';

/** settingKey → campos secretos, derivado do catálogo (só `integration.*`). */
export const SECRET_FIELDS_BY_SETTING_KEY: ReadonlyMap<string, readonly string[]> = new Map(
  UNIVERSAL_CONNECTOR_DEFINITIONS.filter((d) =>
    (d.settingKey ?? '').startsWith('integration.'),
  ).map((d) => [
    d.settingKey as string,
    (d.fields as readonly ConnectorFieldSpec[]).filter((f) => f.secret === true).map((f) => f.key),
  ]),
);

/** settingKey → TODOS os campos do catálogo (secretos ou não). Chave fora disto = legada/órfã. */
export const KNOWN_FIELDS_BY_SETTING_KEY: ReadonlyMap<string, readonly string[]> = new Map(
  UNIVERSAL_CONNECTOR_DEFINITIONS.filter((d) =>
    (d.settingKey ?? '').startsWith('integration.'),
  ).map((d) => [
    d.settingKey as string,
    (d.fields as readonly ConnectorFieldSpec[]).map((f) => f.key),
  ]),
);

export const TARGET_SETTING_KEYS: readonly string[] = [
  ...SECRET_FIELDS_BY_SETTING_KEY.keys(),
  LEGACY_BITRIX_KEY,
];

/**
 * Puro: classifica (legível/ilegível/em claro sob `key`) os campos secretos de um `Setting` de
 * integração — usado pelo `--verify` do reencrypt e do backfill.
 */
export function classifySettingValue(
  settingKey: string,
  value: unknown,
  key: Buffer,
  counts: VerifyCounts,
): void {
  if (settingKey === LEGACY_BITRIX_KEY) {
    addClass(counts, classifyValue(value, key));
    return;
  }
  const secretFields = SECRET_FIELDS_BY_SETTING_KEY.get(settingKey);
  if (!secretFields || !value || typeof value !== 'object' || Array.isArray(value)) return;
  const obj = value as Record<string, unknown>;
  for (const f of secretFields) addClass(counts, classifyValue(obj[f], key));
}
