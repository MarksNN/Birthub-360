import { PRODUCT_MODULES } from '../../../config/product-modules.js';
import type {
  OrganizationModulesRepository,
  OrganizationModulesStoredState,
  OrganizationModulesView,
} from '../domain/OrganizationModules.js';
import { settingOrganizationModulesRepository } from '../infra/SettingOrganizationModulesRepository.js';

export class OrganizationModulesServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

const ALWAYS_ACTIVE_KEYS = PRODUCT_MODULES.filter((m) => m.alwaysActive).map((m) => m.key);
const ALL_KEYS = PRODUCT_MODULES.map((m) => m.key);

function assertKnownModule(moduleKey: string): void {
  if (!ALL_KEYS.includes(moduleKey)) {
    throw new OrganizationModulesServiceError(`Módulo desconhecido: ${moduleKey}`, 400);
  }
}

function normalize(keys: Iterable<string>): string[] {
  const set = new Set([...ALWAYS_ACTIVE_KEYS, ...keys]);
  // Ordem estável = ordem do catálogo.
  return ALL_KEYS.filter((k) => set.has(k));
}

/**
 * Módulos de produto por organização + onboarding (/setup). Repositório injetável (mesmo padrão
 * de ModuleAccessService) para teste sem banco.
 */
export class OrganizationModulesService {
  private readonly mutationLocks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly repository: OrganizationModulesRepository = settingOrganizationModulesRepository,
  ) {}

  toView(state: OrganizationModulesStoredState | null): OrganizationModulesView {
    // Legado (nunca configurou): todos ativos — preserva o comportamento atual do front, onde
    // useOrganizationModules().isModuleActive sempre devolve true.
    const activeModules = state ? normalize(state.enabledModules) : [...ALL_KEYS];
    return {
      configured: state !== null,
      onboardingCompleted: Boolean(state?.onboardingCompletedAt),
      onboardingCompletedAt: state?.onboardingCompletedAt ?? null,
      activeModules,
      modules: PRODUCT_MODULES.map((m) => ({
        key: m.key,
        label: m.label,
        alwaysActive: Boolean(m.alwaysActive),
        active: activeModules.includes(m.key),
      })),
    };
  }

  async get(organizationId: string): Promise<OrganizationModulesView> {
    return this.toView(await this.repository.load(organizationId));
  }

  private async mutate(
    organizationId: string,
    userId: string,
    fn: (current: OrganizationModulesStoredState) => OrganizationModulesStoredState,
  ): Promise<OrganizationModulesView> {
    const previous = this.mutationLocks.get(organizationId) ?? Promise.resolve();
    const runMutation = async (): Promise<OrganizationModulesView> => {
      const current = (await this.repository.load(organizationId)) ?? {
        // Primeira gravação parte só dos obrigatórios (o /setup escolhe o resto explicitamente).
        enabledModules: [...ALWAYS_ACTIVE_KEYS],
        onboardingCompletedAt: null,
        updatedByUserId: null,
      };
      const next = fn(current);
      const saved: OrganizationModulesStoredState = {
        ...next,
        enabledModules: normalize(next.enabledModules),
        updatedByUserId: userId,
      };
      await this.repository.save(organizationId, saved);
      // Relê do repositório: a resposta reflete o que de fato foi persistido, não o que pedimos.
      return this.get(organizationId);
    };

    const nextPromise = previous.catch(() => undefined).then(runMutation);
    this.mutationLocks.set(organizationId, nextPromise);
    try {
      return await nextPromise;
    } finally {
      if (this.mutationLocks.get(organizationId) === nextPromise) {
        this.mutationLocks.delete(organizationId);
      }
    }
  }

  async enable(organizationId: string, userId: string, moduleKey: string) {
    assertKnownModule(moduleKey);
    return this.mutate(organizationId, userId, (s) => ({
      ...s,
      enabledModules: [...s.enabledModules, moduleKey],
    }));
  }

  async disable(organizationId: string, userId: string, moduleKey: string) {
    assertKnownModule(moduleKey);
    if (ALWAYS_ACTIVE_KEYS.includes(moduleKey)) {
      throw new OrganizationModulesServiceError(
        `Módulo obrigatório não pode ser desativado: ${moduleKey}`,
        409,
      );
    }
    return this.mutate(organizationId, userId, (s) => ({
      ...s,
      enabledModules: s.enabledModules.filter((k) => k !== moduleKey),
    }));
  }

  /** Substitui o conjunto inteiro (atômico do ponto de vista do cliente). */
  async replace(organizationId: string, userId: string, moduleKeys: unknown) {
    if (!Array.isArray(moduleKeys) || !moduleKeys.every((k) => typeof k === 'string')) {
      throw new OrganizationModulesServiceError('Campo "modules" deve ser uma lista de chaves.');
    }
    moduleKeys.forEach(assertKnownModule);
    return this.mutate(organizationId, userId, (s) => ({ ...s, enabledModules: moduleKeys }));
  }

  async completeOnboarding(organizationId: string, userId: string, now: Date = new Date()) {
    return this.mutate(organizationId, userId, (s) => ({
      ...s,
      onboardingCompletedAt: s.onboardingCompletedAt ?? now.toISOString(),
    }));
  }
}

export const organizationModulesService = new OrganizationModulesService();
