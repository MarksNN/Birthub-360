import { describe, expect, it } from 'vitest';
import {
  normalizeOrchestrationOverview,
  SalesOrchestrationApiError,
  type SalesOrchestrationOverview,
} from '../../../src/features/sales-orchestration/orchestration.api.js';

const sample: SalesOrchestrationOverview = {
  kpis: {
    playbooksAtivos: 1,
    aderenciaPlaybook: null,
    speedToLeadMin: null,
    cadenciasAtivas: 0,
  },
  playbooks: [],
  jornadas: [],
  processos: [],
  roteiros: [],
  meta: {
    source: 'none',
    unavailableMetrics: ['aderenciaPlaybook'],
    emptySections: ['jornadas', 'processos', 'roteiros'],
  },
};

describe('normalizeOrchestrationOverview', () => {
  it('aceita overview já desembrulhado (pós-apiFetch)', () => {
    expect(normalizeOrchestrationOverview(sample)).toEqual(sample);
  });

  it('aceita { data, meta } residual do apiFetch', () => {
    const meta = { source: 'real' as const, unavailableMetrics: [] as string[] };
    const body = { ...sample, meta: { source: 'none' as const, unavailableMetrics: [] } };
    expect(normalizeOrchestrationOverview({ data: body, meta })).toEqual({ ...body, meta });
  });

  it('rejeita payload sem overview', () => {
    expect(() => normalizeOrchestrationOverview({ success: true })).toThrow(SalesOrchestrationApiError);
    expect(() => normalizeOrchestrationOverview(null)).toThrow(SalesOrchestrationApiError);
    expect(() => normalizeOrchestrationOverview({ playbooks: [] })).toThrow(SalesOrchestrationApiError);
  });
});
