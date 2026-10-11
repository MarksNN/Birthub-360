/**
 * Estado persistido dos módulos de produto da organização (catálogo em
 * src/config/product-modules.ts) + conclusão do onboarding (/setup).
 *
 * Persistido no model genérico `Setting` (organizationId, userId = null, key =
 * ORGANIZATION_MODULES_SETTING_KEY) — sem migration nova. `null` = organização nunca passou pelo
 * /setup (organizações legadas, anteriores a este endpoint).
 */
export interface OrganizationModulesStoredState {
  enabledModules: string[];
  onboardingCompletedAt: string | null;
  updatedByUserId: string | null;
}

export const ORGANIZATION_MODULES_SETTING_KEY = 'organization.modules';

export interface OrganizationModulesRepository {
  load(organizationId: string): Promise<OrganizationModulesStoredState | null>;
  save(organizationId: string, state: OrganizationModulesStoredState): Promise<void>;
}

export interface OrganizationModuleView {
  key: string;
  label: string;
  alwaysActive: boolean;
  active: boolean;
}

/** Contrato de resposta de GET /api/organization-modules (e das mutações). */
export interface OrganizationModulesView {
  /** false = organização nunca salvou módulos (legado): todos os módulos contam como ativos. */
  configured: boolean;
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  activeModules: string[];
  modules: OrganizationModuleView[];
}
