import {
  findSetting,
  upsertSetting,
} from '../../../lib/voice-hub/repositories/settingRepository.js';
import {
  ORGANIZATION_MODULES_SETTING_KEY,
  type OrganizationModulesRepository,
  type OrganizationModulesStoredState,
} from '../domain/OrganizationModules.js';

function parseStoredState(value: unknown): OrganizationModulesStoredState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const enabledModules = Array.isArray(raw.enabledModules)
    ? raw.enabledModules.filter((k): k is string => typeof k === 'string')
    : [];
  return {
    enabledModules,
    onboardingCompletedAt:
      typeof raw.onboardingCompletedAt === 'string' ? raw.onboardingCompletedAt : null,
    updatedByUserId: typeof raw.updatedByUserId === 'string' ? raw.updatedByUserId : null,
  };
}

/** Adaptador real: linha de `Setting` por organização (userId = null). */
export class SettingOrganizationModulesRepository implements OrganizationModulesRepository {
  async load(organizationId: string): Promise<OrganizationModulesStoredState | null> {
    const row = await findSetting(organizationId, null, ORGANIZATION_MODULES_SETTING_KEY);
    return row ? parseStoredState(row.value) : null;
  }

  async save(organizationId: string, state: OrganizationModulesStoredState): Promise<void> {
    await upsertSetting(organizationId, null, ORGANIZATION_MODULES_SETTING_KEY, state);
  }
}

export const settingOrganizationModulesRepository = new SettingOrganizationModulesRepository();
