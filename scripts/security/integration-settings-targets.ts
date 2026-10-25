// scripts/security/integration-settings-targets.ts
//
// Alvos de cifra em `Setting` derivados do catálogo do Hub Universal (`secret: true`). Módulo sem
// dependências de runtime além do catálogo (que também não tem nenhuma) — para que
// reencrypt-credentials.ts possa importá-lo sem carregar src/config/env.ts.

import {
  type ConnectorFieldSpec,
  UNIVERSAL_CONNECTOR_DEFINITIONS,
} from '../../src/features/intelligence/services/universalConnectors.catalog.js';

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

export const TARGET_SETTING_KEYS: readonly string[] = [
  ...SECRET_FIELDS_BY_SETTING_KEY.keys(),
  LEGACY_BITRIX_KEY,
];
