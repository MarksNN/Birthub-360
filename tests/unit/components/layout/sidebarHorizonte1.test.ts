import { describe, expect, it } from 'vitest';
import { getSidebarNavSections } from '../../../../src/components/layout/sidebarSections.js';

describe('getSidebarNavSections (Horizonte 1 — Unificação PT-BR e Eliminação de Rotas Órfãs)', () => {
  it('retorna todas as seções em português e subitens desacoplados com permissões completas', () => {
    const sections = getSidebarNavSections({
      canAccessCopilotoIa: true,
      canManageOperations: true,
      isAdmin: true,
      
    });

    const titles = sections.map((s) => s.title);
    expect(titles).toEqual([
      'CENTRAL DE COMANDO',
      'RECEITA',
      'INTELIGÊNCIA',
      'EXECUÇÃO',
      'RELACIONAMENTO',
      'PERFORMANCE',
      'GOVERNANÇA',
    ]);

    const allGroups = sections.flatMap((s) => s.groups);
    const workspaceGroup = allGroups.find((g) => g.id === 'workspace');
    expect(workspaceGroup?.subItems?.map((i) => i.tab)).toEqual([
      'workspace',
      'daily-plan',
      'notifications',
    ]);

    const crmGroup = allGroups.find((g) => g.id === 'revenue_tree');
    expect(crmGroup?.subItems?.map((i) => i.tab)).toContain('pipeline_ponderado');
    expect(crmGroup?.subItems?.map((i) => i.tab)).toContain('mesa-tratamento');

    const intelligenceGroup = allGroups.find((g) => g.id === 'intelligence');
    expect(intelligenceGroup?.subItems?.map((i) => i.tab)).toEqual([
      'intelligence',
      'knowledge',
      'sdr-diagnostic',
    ]);

    const cadenceGroup = allGroups.find((g) => g.id === 'cadences');
    expect(cadenceGroup?.subItems?.map((i) => i.tab)).toEqual(['cadence', 'roteiros', 'chatbook']);

    const activitiesGroup = allGroups.find((g) => g.id === 'activities');
    expect(activitiesGroup?.subItems?.map((i) => i.tab)).toEqual(['activities', 'calendar']);

    const workflowsGroup = allGroups.find((g) => g.id === 'workflows');
    expect(workflowsGroup?.label).toBe('Orquestração & Playbooks');
    expect(workflowsGroup?.ariaLabel).toBe('Workflows');
    expect(workflowsGroup?.subItems?.map((i) => i.tab)).toEqual([
      'jornadas',
      'playbooks',
      'processos',
      'editor',
    ]);

    const contactsGroup = allGroups.find((g) => g.id === 'contacts');
    expect(contactsGroup?.label).toBe('Contatos & Decisores');
    expect(contactsGroup?.subItems).toEqual([
      { tab: 'contacts', label: 'Base de Contatos' },
      { tab: 'contacts', path: 'contacts?view=decisores', label: 'Mapeamento de Decisores' },
    ]);

    const analyticsGroup = allGroups.find((g) => g.id === 'performance');
    expect(analyticsGroup?.subItems?.map((i) => i.tab)).toEqual(['analytics', 'winloss', 'reports']);

    const gamificationGroup = allGroups.find((g) => g.id === 'gamification');
    expect(gamificationGroup?.subItems?.map((i) => i.tab)).toEqual([
      'gamification',
      'roleplay',
      'qualification_matrix',
      'objections_matrix',
      'topic_training',
    ]);

    const integrationsGroup = allGroups.find((g) => g.id === 'integrations');
    expect(integrationsGroup?.subItems?.map((i) => i.tab)).toEqual(['integrations', 'bitrix']);

    const teamGroup = allGroups.find((g) => g.id === 'team');
    expect(teamGroup?.subItems?.map((i) => i.tab)).toEqual(['team', 'module-access', 'usage']);
  });

  it('omite grupos restritos quando as flags de permissão são falsas', () => {
    const sections = getSidebarNavSections({
      canAccessCopilotoIa: false,
      canManageOperations: false,
      canManageSystem: false,
      canManageTeam: false,
    });

    const allGroupIds = sections.flatMap((s) => s.groups.map((g) => g.id));
    expect(allGroupIds).not.toContain('assistant');
    expect(allGroupIds).not.toContain('automations');
    expect(allGroupIds).not.toContain('integrations');
    expect(allGroupIds).not.toContain('team');
  });
});
