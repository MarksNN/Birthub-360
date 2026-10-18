import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CuratedObjectionService } from '../../../../src/features/playbook/services/curatedObjection.service.js';
import type { ObjectionMatrixItemRepository } from '../../../../src/features/playbook/objection-matrix/domain/ObjectionMatrixItem.js';

describe('CuratedObjectionService Unit Tests', () => {
  let service: CuratedObjectionService;
  let mockObjectionRepo: ObjectionMatrixItemRepository;

  beforeEach(() => {
    mockObjectionRepo = {
      findAllWithFilters: vi.fn().mockResolvedValue({ data: [], meta: {} }),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((orgId, data) => Promise.resolve({ id: 'matrix-1', organizationId: orgId, ...data })),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new CuratedObjectionService(mockObjectionRepo);
    service.clear();
  });

  it('should ingest and classify high-confidence objection as VERIFIED', async () => {
    const item = await service.ingestDetectedObjection({
      organizationId: 'org-tenant-1',
      sourceInteractionId: 'call-101',
      sourceType: 'VOICE_CALL',
      category: 'Custo de Implantação',
      commercialContext: 'Diretor de Logística questionou payback do projeto',
      segment: 'Logística',
      confidenceScore: 0.95,
      anonymizedEvidence: 'O custo de rollout inicial ultrapassa o teto anual',
    });

    expect(item.id).toMatch(/^cobj-/);
    expect(item.curationStatus).toBe('VERIFIED');
    expect(item.version).toBe(1);
  });

  it('should classify medium-confidence objection as REVIEW_REQUIRED', async () => {
    const item = await service.ingestDetectedObjection({
      organizationId: 'org-tenant-1',
      sourceInteractionId: 'field-202',
      sourceType: 'FIELD_MEETING',
      category: 'Integração com ERP Legado',
      commercialContext: 'Reunião presencial sobre sistemas legados',
      segment: 'Manufatura',
      confidenceScore: 0.78,
      anonymizedEvidence: 'Possuímos um sistema proprietário em Delphi sem API documentada',
    });

    expect(item.curationStatus).toBe('REVIEW_REQUIRED');
  });

  it('should promote an objection to Playbook and increment version', async () => {
    const item = await service.ingestDetectedObjection({
      organizationId: 'org-tenant-1',
      sourceInteractionId: 'call-303',
      sourceType: 'VOICE_CALL',
      category: 'Prazo de Entrega',
      commercialContext: 'Urgência na entrega de produtos',
      segment: 'Saúde',
      confidenceScore: 0.92,
      anonymizedEvidence: 'Precisamos de início em menos de 10 dias úteis',
      suggestedResponse: 'Destacar squads de ativação rápida e onboarding prioritário',
    });

    const promoted = await service.promoteObjection('org-tenant-1', item.id, 'user-admin-1');

    expect(promoted.curationStatus).toBe('PROMOTED');
    expect(promoted.promotedByUserId).toBe('user-admin-1');
    expect(promoted.version).toBe(2);
    expect(mockObjectionRepo.create).toHaveBeenCalledTimes(1);
  });

  it('should retract an objection and remove it from Roleplay eligibility', async () => {
    const item = await service.ingestDetectedObjection({
      organizationId: 'org-tenant-1',
      sourceInteractionId: 'call-404',
      sourceType: 'VOICE_CALL',
      category: 'Preço',
      commercialContext: 'Contexto sensível',
      segment: 'Fintech',
      confidenceScore: 0.96,
      anonymizedEvidence: 'Desconto de 50%',
    });

    let eligible = await service.listEligibleForRoleplay('org-tenant-1');
    expect(eligible).toHaveLength(1);

    const retracted = await service.retractObjection(
      'org-tenant-1',
      item.id,
      'Solicitação de exclusão do cliente (LGPD)',
    );
    expect(retracted.curationStatus).toBe('RETRACTED');

    eligible = await service.listEligibleForRoleplay('org-tenant-1');
    expect(eligible).toHaveLength(0);
  });

  it('should enforce strict multi-tenant isolation', async () => {
    await service.ingestDetectedObjection({
      organizationId: 'org-tenant-A',
      sourceInteractionId: 'call-A',
      sourceType: 'VOICE_CALL',
      category: 'Concorrente X',
      commercialContext: 'Avaliação de concorrente',
      segment: 'Varejo',
      confidenceScore: 0.95,
      anonymizedEvidence: 'Concorrente X ofereceu carência de 3 meses',
    });

    const eligibleForTenantB = await service.listEligibleForRoleplay('org-tenant-B');
    expect(eligibleForTenantB).toHaveLength(0);

    const eligibleForTenantA = await service.listEligibleForRoleplay('org-tenant-A');
    expect(eligibleForTenantA).toHaveLength(1);
  });
});
