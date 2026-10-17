import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { AnalyticsController } from '@/features/analytics/presentation/AnalyticsController';
import type { AnalyticsUseCases } from '@/features/analytics/application/AnalyticsUseCases';

describe('AnalyticsController — tratamento defensivo em /api/analytics', () => {
  it('retorna { metrics: [], total: 0 } com status 200 quando o banco estiver vazio', async () => {
    const mockUseCases = {
      getMetrics: vi.fn().mockResolvedValue({ metrics: [], total: 0 }),
    } as unknown as AnalyticsUseCases;

    const controller = new AnalyticsController(mockUseCases);

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

    await controller.getMetrics(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metrics: [],
        total: 0,
      }),
    );
  });

  it('encaminha o erro para next() quando a agregação estoura exceção', async () => {
    const testError = new Error('Connection failed or table empty');
    const mockUseCases = {
      getMetrics: vi.fn().mockRejectedValue(testError),
    } as unknown as AnalyticsUseCases;

    const controller = new AnalyticsController(mockUseCases);

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

    await controller.getMetrics(req, res, next);

    expect(next).toHaveBeenCalledWith(testError);
    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });
});
