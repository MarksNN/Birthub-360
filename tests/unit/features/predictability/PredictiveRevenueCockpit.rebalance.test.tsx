import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountAllocationRecommendation } from '../../../../src/shared/contracts/predictiveRevenueOracle.contract.js';

const h = vi.hoisted(() => ({
  role: 'GESTOR',
  submit: vi.fn(),
  cockpit: vi.fn(),
  backtest: vi.fn(),
}));
vi.mock('../../../../src/contexts/AuthContext.js', () => ({
  useAuth: () => ({ currentUser: { id: 'u', role: h.role } }),
}));
vi.mock('../../../../src/features/predictability/rebalance.api.js', async (orig) => ({
  ...(await orig<object>()),
  submitRebalanceApproval: (...a: unknown[]) => h.submit(...a),
  getPredictiveCockpit: () => h.cockpit(),
  getPredictiveBacktest: () => h.backtest(),
}));

import { PredictiveRevenueCockpit } from '../../../../src/features/predictability/components/PredictiveRevenueCockpit.js';
import { RebalanceApprovalApiError } from '../../../../src/features/predictability/rebalance.api.js';

const horizon = (d: 30 | 90 | 180) => ({
  horizonDays: d,
  status: 'insufficient_data' as const,
  insufficientDataReason: 'menos de 3 janelas',
  sampleWindows: 0,
  expectedRevenue: null,
  confidenceInterval: null,
  pipelineWeightedAmount: 0,
  projectedWonDealsCount: null,
  keyDrivers: [],
  uncertaintyDegree: null,
});
const cockpit = {
  organizationId: 'o',
  currentPeriod: '2026-10',
  status: 'insufficient_data',
  insufficientDataReason: 'sem histórico',
  currentQuota: null,
  closedWonRevenue: 0,
  quotaAttainmentPercent: null,
  weightedPipelineRevenue: 0,
  projections: { days30: horizon(30), days90: horizon(90), days180: horizon(180) },
  dealsAtRisk: [],
  mainFunnelBottlenecks: [],
  activeRecommendationsCount: 0,
  modelConfidence: 'INSUFFICIENT_DATA',
  lastCalculatedAt: '2026-10-20T00:00:00.000Z',
};
const backtest = {
  evaluationPeriod: '2026-Q3',
  samplesEvaluated: 0,
  meanAbsoluteError: null,
  meanAbsolutePercentageError: null,
  predictionBias: null,
  calibrationScore: null,
  predictionIntervalCoveragePercent: null,
  isModelCalibrated: false,
  status: 'INSUFFICIENT_DATA',
  insufficientDataReason: 'sem snapshots',
};
const rec: AccountAllocationRecommendation = {
  recommendationId: 'rec-01',
  organizationId: 'o',
  targetAccountId: 'lead-1',
  targetAccountName: 'Conta Teste',
  currentOwnerName: 'u1',
  suggestedOwnerName: 'u2',
  matchScore: 90,
  rationale: {
    industrySpecialization: true,
    currentWorkloadCapacity: 'OPTIMAL',
    historicalConversionRate: 0.3,
    territoryCompliance: true,
  },
  estimatedConversionUpliftPercent: 10,
  approvalStatus: 'PENDING_HUMAN_REVIEW',
  generatedAt: '2026-10-20T00:00:00.000Z',
};
const approval = {
  recommendationId: 'rec-01',
  leadId: 'lead-1',
  fromOwner: 'u1',
  toOwner: 'u2',
  decision: 'APPROVED' as const,
  approvalId: 'ap',
  organizationId: 'o',
  decidedBy: 'g',
  decidedAt: '2026-10-20T00:00:00.000Z',
  appliedToCrm: false as const,
};

describe('PredictiveRevenueCockpit — REMED-03/04 contrato 04', () => {
  beforeEach(() => {
    h.role = 'GESTOR';
    h.submit.mockReset();
    h.cockpit.mockReset().mockResolvedValue(cockpit);
    h.backtest.mockReset().mockResolvedValue(backtest);
  });

  it('insufficient_data → estados vazios, meta em /goals, sem números fictícios', async () => {
    render(<PredictiveRevenueCockpit />);
    expect(await screen.findByText(/meta em \/goals/)).toBeInTheDocument();
    expect(screen.getByText(/Histórico insuficiente para projetar 30 dias/)).toBeInTheDocument();
    expect(screen.getByText(/Backtest sem amostras/)).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma recomendação/)).toBeInTheDocument();
    expect(screen.queryByText(/145\.000/)).toBeNull();
  });

  it('sucesso: diz decisão registrada e owner NÃO alterado', async () => {
    h.submit.mockResolvedValue({ approval, alreadyRecorded: false });
    render(<PredictiveRevenueCockpit recommendations={[rec]} />);
    fireEvent.click(screen.getByRole('button', { name: /Aprovar/ }));
    expect(screen.getByRole('button', { name: /Aprovar/ })).toBeDisabled();
    expect(await screen.findByText(/Decisão registrada\./)).toHaveTextContent(
      'Owner não alterado no CRM',
    );
    expect(h.submit).toHaveBeenCalledWith({
      recommendationId: 'rec-01',
      leadId: 'lead-1',
      fromOwner: 'u1',
      toOwner: 'u2',
      decision: 'APPROVED',
    });
  });

  it('409: mostra decisão existente', async () => {
    h.submit.mockImplementation(async () => {
      throw new RebalanceApprovalApiError('Já decidido', 'conflict', 409, {}, {
        ...approval,
        decision: 'REJECTED',
      });
    });
    render(<PredictiveRevenueCockpit recommendations={[rec]} />);
    fireEvent.click(screen.getByRole('button', { name: /Aprovar/ }));
    expect(await screen.findByText('Rejeitado')).toBeInTheDocument();
    expect(screen.getByText(/já registrada anteriormente/)).toBeInTheDocument();
  });

  it('422: erros por campo + tentar de novo', async () => {
    h.submit.mockImplementationOnce(async () => {
      throw new RebalanceApprovalApiError('Payload inválido.', 'validation', 422, {
        toOwner: ['deve ser diferente de fromOwner'],
      });
    });
    render(<PredictiveRevenueCockpit recommendations={[rec]} />);
    fireEvent.click(screen.getByRole('button', { name: /Aprovar/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('toOwner: deve ser diferente');
    h.submit.mockResolvedValueOnce({ approval, alreadyRecorded: true });
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText(/já estava registrada/)).toBeInTheDocument();
  });

  it('RBAC: CLOSER não vê botões', async () => {
    h.role = 'CLOSER';
    render(<PredictiveRevenueCockpit recommendations={[rec]} />);
    expect(await screen.findByText(/Apenas Admin e Gestor/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprovar/ })).toBeNull();
  });
});
