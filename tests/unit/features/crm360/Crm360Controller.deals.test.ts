import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { Crm360Controller } from '@/features/crm360/presentation/Crm360Controller';
import type { Crm360UseCases } from '@/features/crm360/application/Crm360UseCases';

describe('Crm360Controller — query de negócios em /api/crm/deals', () => {
  it('retorna array vazio quando não há negócios ou o banco está vazio', async () => {
    const mockUseCases = {
      getDeals: vi.fn().mockResolvedValue([]),
    } as unknown as Crm360UseCases;

    const controller = new Crm360Controller(mockUseCases);

    const req = {
      user: { organizationId: 'org-test' },
    } as unknown as Request;

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;
    const next = vi.fn();

    await controller.getDeals(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith([]);
  });

  it('retorna array vazio em vez de estourar exceção não tratada quando o caso de uso falha', async () => {
    const mockUseCases = {
      getDeals: vi.fn().mockRejectedValue(new Error('Prisma query failed / table empty')),
    } as unknown as Crm360UseCases;

    const controller = new Crm360Controller(mockUseCases);

    const req = {
      user: { organizationId: 'org-test' },
    } as unknown as Request;

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;
    const next = vi.fn();

    await controller.getDeals(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith([]);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna a lista de negócios quando existem negócios', async () => {
    const fakeDeals = [
      { id: 'deal-1', title: 'Negócio 1', amount: 50000, status: 'Negocios_Ganhos' },
    ];
    const mockUseCases = {
      getDeals: vi.fn().mockResolvedValue(fakeDeals),
    } as unknown as Crm360UseCases;

    const controller = new Crm360Controller(mockUseCases);

    const req = {
      user: { organizationId: 'org-test' },
    } as unknown as Request;

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;
    const next = vi.fn();

    await controller.getDeals(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(fakeDeals);
  });
});
