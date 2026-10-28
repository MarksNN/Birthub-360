import { useCallback, useEffect, useState } from 'react';
import {
  describeOrganizationModulesError,
  type OrganizationModulesView,
  organizationModulesApi,
} from '../features/onboarding/organizationModules.api.js';

/**
 * Estado real dos módulos da organização (P0 #693 — antes era stub fixo).
 *
 * Regras:
 * - `isPendingOnboarding = configured && !onboardingCompleted`. NÃO usar só
 *   `!onboardingCompleted`: orgs antigas (configured:false) jogariam todo ADMIN no /setup.
 * - Org sem save → `configured:false` + todos ativos (contrato do Agente 01).
 * - Se a API falhar (ex.: 404 antes do merge do 01), falha ABERTA: módulos liberados e
 *   ninguém é redirecionado ao /setup — mas `error` fica exposto para a UI mostrar.
 *
 * Cache em memória compartilhado (mesmo padrão de useFeatureFlags; sem QueryClientProvider no app).
 */
let cache: OrganizationModulesView | null = null;
let cachedError: string | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function load(): Promise<void> {
  if (!inFlight) {
    inFlight = organizationModulesApi
      .get()
      .then((view) => {
        cache = view;
        cachedError = null;
      })
      .catch((err: unknown) => {
        cache = null;
        cachedError = describeOrganizationModulesError(err);
      })
      .finally(() => {
        inFlight = null;
        notify();
      });
  }
  return inFlight;
}

/** Atualiza o cache após uma mutação bem-sucedida (ex.: SetupWizard). */
export function setOrganizationModulesCache(view: OrganizationModulesView): void {
  cache = view;
  cachedError = null;
  notify();
}

export function invalidateOrganizationModulesCache(): void {
  cache = null;
  cachedError = null;
}

export function useOrganizationModules() {
  const [, force] = useState(0);
  const [isLoading, setIsLoading] = useState(!cache && !cachedError);

  useEffect(() => {
    const listener = () => {
      force((n) => n + 1);
      setIsLoading(false);
    };
    listeners.add(listener);
    if (!cache && !cachedError) {
      void load();
    } else {
      setIsLoading(false);
    }
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const reload = useCallback(() => {
    invalidateOrganizationModulesCache();
    setIsLoading(true);
    void load();
  }, []);

  const view = cache;
  const isPendingOnboarding = view ? view.configured && !view.onboardingCompleted : false;

  const isModuleActive = (key: string) => {
    if (!view) return true; // falha aberta (erro/loading) — ver doc acima
    if (!view.configured) return true; // org sem save: todos ativos
    const mod = view.modules.find((m) => m.key === key);
    if (mod) return mod.alwaysActive || mod.active;
    return view.activeModules.includes(key);
  };

  return {
    data: view,
    error: cachedError,
    isPendingOnboarding,
    isLoading,
    isModuleActive,
    reload,
  };
}
