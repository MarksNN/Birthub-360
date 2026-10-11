/**
 * Cliente da orquestração (P0 #693, contrato #696): `api.get` (apiFetch) já desembrulha
 * `{ success, data }`, então o cliente consome o overview direto — regressão do parecer 24
 * ("Resposta inválida" sempre).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => getMock(...args) },
}));

import {
  orchestrationApi,
  SalesOrchestrationApiError,
  type SalesOrchestrationOverview,
} from '@/features/sales-orchestration/orchestration.api';

const overview: SalesOrchestrationOverview = {
  kpis: { playbooksAtivos: 0, aderenciaPlaybook: null, speedToLeadMin: null, cadenciasAtivas: 0 },
  playbooks: [],
  jornadas: [],
  processos: [],
  roteiros: [],
  meta: { source: 'none', unavailableMetrics: ['aderenciaPlaybook', 'speedToLeadMin'] },
};

describe('orchestrationApi.getOverview', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('consome o overview já desembrulhado pelo apiFetch', async () => {
    getMock.mockResolvedValue(overview);
    await expect(orchestrationApi.getOverview()).resolves.toEqual(overview);
    expect(getMock).toHaveBeenCalledWith('/api/sales-orchestration/overview');
  });

  it('aceita envelope cru { success, data } por robustez', async () => {
    getMock.mockResolvedValue({ success: true, data: overview });
    await expect(orchestrationApi.getOverview()).resolves.toEqual(overview);
  });

  it('propaga falha de rede como SalesOrchestrationApiError (sem fallback)', async () => {
    getMock.mockImplementation(() => Promise.reject(new Error('500')));
    const err = await orchestrationApi.getOverview().then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(SalesOrchestrationApiError);
    expect((err as Error).message).toBe('Falha ao carregar a orquestração comercial.');
  });

  it('rejeita payload sem forma de overview', async () => {
    getMock.mockResolvedValue({ foo: 1 });
    await expect(orchestrationApi.getOverview()).rejects.toBeInstanceOf(SalesOrchestrationApiError);
  });
});
