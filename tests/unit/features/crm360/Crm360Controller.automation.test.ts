import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { Crm360Controller } from '@/features/crm360/presentation/Crm360Controller';
import type { Crm360UseCases } from '@/features/crm360/application/Crm360UseCases';
import * as crmEventBus from '@/shared/services/crmEventBus';

vi.mock('@/shared/services/crmEventBus', () => ({
  publishCrmStageChange: vi.fn().mockResolvedValue(undefined),
  subscribeToCrmStageChanges: vi.fn(),
}));

describe('Crm360Controller — automações de CRM nas transições de etapa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moveRecord publica evento de transição de estágio para o motor de automações', async () => {
    const fakeUpdatedLead = {
      id: 'lead-123',
      title: 'Oportunidade Alpha',
      status: 'Em_Negociacao',
      pipelineStageId: 'stage-2',
      amount: 15000,
    };

    const mockUseCases = {
      updateLeadStage: vi.fn().mockResolvedValue(fakeUpdatedLead),
    } as unknown as Crm360UseCases;

    const controller = new Crm360Controller(mockUseCases);

    const req = {
      user: { organizationId: 'org-1', id: 'user-actor-1' },
      params: { id: 'lead-123' },
      body: { stageId: 'stage-2' },
    } as unknown as Request;

    const jsonMock = vi.fn();
    const res = {
      json: jsonMock,
    } as unknown as Response;
    const next = vi.fn();

    await controller.moveRecord(req, res, next);

    expect(mockUseCases.updateLeadStage).toHaveBeenCalledWith(
      'org-1',
      'lead-123',
      'stage-2',
      undefined,
      'user-actor-1',
    );
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: fakeUpdatedLead });
    expect(crmEventBus.publishCrmStageChange).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        leadId: 'lead-123',
        stageId: 'stage-2',
        data: expect.objectContaining({ id: 'lead-123', status: 'Em_Negociacao' }),
      }),
    );
  });

  it('convertLead publica evento de conversão com flag converted:true', async () => {
    const fakeConvertedLead = {
      id: 'lead-456',
      title: 'Lead Qualificado',
      status: 'Nova_Oportunidade',
      funnel: 'Negocio',
    };

    const mockUseCases = {
      convertLead: vi.fn().mockResolvedValue(fakeConvertedLead),
    } as unknown as Crm360UseCases;

    const controller = new Crm360Controller(mockUseCases);

    const req = {
      user: { organizationId: 'org-1' },
      params: { id: 'lead-456' },
    } as unknown as Request;

    const jsonMock = vi.fn();
    const res = {
      json: jsonMock,
    } as unknown as Response;
    const next = vi.fn();

    await controller.convertLead(req, res, next);

    expect(mockUseCases.convertLead).toHaveBeenCalledWith('org-1', 'lead-456');
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: fakeConvertedLead });
    expect(crmEventBus.publishCrmStageChange).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        leadId: 'lead-456',
        funnel: 'Negocio',
        data: expect.objectContaining({ id: 'lead-456', converted: true }),
      }),
    );
  });
});
