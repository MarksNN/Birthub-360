import { describe, expect, it } from 'vitest';
import type {
  OrganizationModulesRepository,
  OrganizationModulesStoredState,
} from '../../domain/OrganizationModules.js';
import {
  OrganizationModulesService,
  OrganizationModulesServiceError,
} from '../organizationModules.service.js';

const ORG = 'org-1';
const ADMIN = 'admin-1';

class InMemoryRepo implements OrganizationModulesRepository {
  store = new Map<string, OrganizationModulesStoredState>();
  async load(organizationId: string) {
    const s = this.store.get(organizationId);
    return s ? structuredClone(s) : null;
  }
  async save(organizationId: string, state: OrganizationModulesStoredState) {
    this.store.set(organizationId, structuredClone(state));
  }
}

function build() {
  const repo = new InMemoryRepo();
  return { repo, service: new OrganizationModulesService(repo) };
}

describe('OrganizationModulesService', () => {
  it('organização legada (sem configuração) vê todos os módulos ativos e onboarding pendente', async () => {
    const { service } = build();
    const view = await service.get(ORG);
    expect(view.configured).toBe(false);
    expect(view.onboardingCompleted).toBe(false);
    expect(view.activeModules).toEqual(['crm-comercial', 'social-selling', 'hub-inteligencia']);
  });

  it('fluxo do SetupWizard: ativa módulos e conclui onboarding, persistindo', async () => {
    const { service, repo } = build();
    await service.enable(ORG, ADMIN, 'crm-comercial');
    await service.enable(ORG, ADMIN, 'hub-inteligencia');
    const done = await service.completeOnboarding(ORG, ADMIN, new Date('2026-10-10T00:00:00Z'));

    expect(done.configured).toBe(true);
    expect(done.onboardingCompleted).toBe(true);
    expect(done.onboardingCompletedAt).toBe('2026-10-10T00:00:00.000Z');
    expect(done.activeModules).toEqual(['crm-comercial', 'hub-inteligencia']);
    expect(repo.store.get(ORG)?.updatedByUserId).toBe(ADMIN);

    const reread = await service.get(ORG);
    expect(reread).toEqual(done);
  });

  it('enable é idempotente e o módulo obrigatório sempre fica ativo', async () => {
    const { service } = build();
    await service.enable(ORG, ADMIN, 'social-selling');
    const view = await service.enable(ORG, ADMIN, 'social-selling');
    expect(view.activeModules).toEqual(['crm-comercial', 'social-selling']);
  });

  it('rejeita módulo desconhecido com 400', async () => {
    const { service } = build();
    await expect(service.enable(ORG, ADMIN, 'nao-existe')).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(service.replace(ORG, ADMIN, ['crm-comercial', 'x'])).rejects.toBeInstanceOf(
      OrganizationModulesServiceError,
    );
    await expect(service.replace(ORG, ADMIN, 'crm-comercial')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('não permite desativar módulo obrigatório (409) mas desativa opcional', async () => {
    const { service } = build();
    await service.replace(ORG, ADMIN, ['social-selling', 'hub-inteligencia']);
    await expect(service.disable(ORG, ADMIN, 'crm-comercial')).rejects.toMatchObject({
      statusCode: 409,
    });
    const view = await service.disable(ORG, ADMIN, 'social-selling');
    expect(view.activeModules).toEqual(['crm-comercial', 'hub-inteligencia']);
  });

  it('completeOnboarding preserva a data original quando chamado de novo', async () => {
    const { service } = build();
    await service.completeOnboarding(ORG, ADMIN, new Date('2026-01-01T00:00:00Z'));
    const again = await service.completeOnboarding(ORG, ADMIN, new Date('2026-02-01T00:00:00Z'));
    expect(again.onboardingCompletedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
