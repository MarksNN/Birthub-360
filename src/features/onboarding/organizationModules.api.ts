import { api } from '../../lib/api.js';

/**
 * Cliente do contrato `/api/organization-modules` (Agente 01 — P0 #693).
 * Respostas no envelope `{ success, data: View }` — `apiFetch` já desembrulha `data`.
 * Erros HTTP (404 enquanto a rota não estiver mergeada, 403 não-ADMIN, 409 módulo obrigatório)
 * viram `Error` com a mensagem do servidor; a UI deve exibi-los, não só logar no console.
 */
export interface OrganizationModuleItem {
  key: string;
  label: string;
  alwaysActive: boolean;
  active: boolean;
}

export interface OrganizationModulesView {
  /** false = org nunca salvou seleção (todos os módulos ativos por padrão). */
  configured: boolean;
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  activeModules: string[];
  modules: OrganizationModuleItem[];
}

const BASE = '/api/organization-modules';

export const organizationModulesApi = {
  get: () => api.get<OrganizationModulesView>(BASE),
  /** Set completo (ADMIN). Preferir a POSTs em loop no wizard. */
  setAll: (modules: string[]) => api.put<OrganizationModulesView>(BASE, { modules }),
  activate: (moduleKey: string) =>
    api.post<OrganizationModulesView>(`${BASE}/${encodeURIComponent(moduleKey)}`, {}),
  /** 409 se o módulo for obrigatório. */
  deactivate: (moduleKey: string) =>
    api.delete<OrganizationModulesView>(`${BASE}/${encodeURIComponent(moduleKey)}`),
  completeOnboarding: () => api.post<OrganizationModulesView>(`${BASE}/onboarding/complete`, {}),
};

/** Traduz erros conhecidos para mensagem acionável em PT-BR. */
export function describeOrganizationModulesError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/status 404|not found/i.test(raw)) {
    return 'O serviço de módulos da organização ainda não está disponível neste ambiente (404). Nenhuma configuração foi salva.';
  }
  if (/status 403|forbidden/i.test(raw)) {
    return 'Apenas administradores podem alterar os módulos da organização.';
  }
  if (/status 409/i.test(raw)) {
    return 'Este módulo é obrigatório e não pode ser desativado.';
  }
  return raw || 'Falha ao comunicar com o serviço de módulos da organização.';
}
