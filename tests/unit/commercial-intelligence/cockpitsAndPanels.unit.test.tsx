import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  PredictiveRevenueCockpit,
  type PredictiveCockpitPayload,
} from '../../../src/features/commercial-intelligence/components/PredictiveRevenueCockpit.js';

describe('PredictiveRevenueCockpit Component (Passo 050)', () => {
  it('deve renderizar estado de loading quando loading=true', () => {
    render(<PredictiveRevenueCockpit loading={true} />);
    const loadingElem = screen.getByTestId('predictive-loading');
    expect(loadingElem).toBeDefined();
  });

  it('deve renderizar estado de empty/insufficient_data sem fabricar métricas quando não houver histórico suficiente', () => {
    const insufficientData: PredictiveCockpitPayload = {
      status: 'insufficient_data',
      currentPeriod: '2026-10',
      closedWonRevenue: 0,
      weightedPipelineRevenue: 0,
      modelConfidence: 'NO_CONFIDENCE',
      projections: null,
    };

    render(<PredictiveRevenueCockpit loading={false} data={insufficientData} />);
    const emptyElem = screen.getByTestId('predictive-empty');
    expect(emptyElem).toBeDefined();
    expect(screen.getByText(/Histórico Insuficiente para Projeção Confiável/i)).toBeDefined();
    expect(screen.getByText(/exige um histórico mínimo de 10 negócios ganhos/i)).toBeDefined();
  });

  it('deve renderizar projeções consolidadas P10/P50/P90 quando os dados estiverem disponíveis', () => {
    const readyData: PredictiveCockpitPayload = {
      status: 'ok',
      currentPeriod: '2026-10',
      closedWonRevenue: 150000,
      weightedPipelineRevenue: 450000,
      modelConfidence: 'CALIBRATED_PROJECTION',
      projections: {
        days30: {
          horizonDays: 30,
          expectedRevenue: 120000,
          confidenceInterval: { p10: 95000, p50: 120000, p90: 145000 },
          status: 'ok',
        },
        days90: {
          horizonDays: 90,
          expectedRevenue: 340000,
          confidenceInterval: { p10: 270000, p50: 340000, p90: 410000 },
          status: 'ok',
        },
        days180: {
          horizonDays: 180,
          expectedRevenue: 720000,
          confidenceInterval: { p10: 550000, p50: 720000, p90: 890000 },
          status: 'ok',
        },
      },
    };

    render(<PredictiveRevenueCockpit loading={false} data={readyData} />);
    const readyElem = screen.getByTestId('predictive-ready');
    expect(readyElem).toBeDefined();
    expect(screen.getByText(/Horizonte 30 Dias/i)).toBeDefined();
    expect(screen.getByText(/Horizonte 90 Dias/i)).toBeDefined();
    expect(screen.getByText(/Horizonte 180 Dias/i)).toBeDefined();
    expect(screen.getByText(/CALIBRATED_PROJECTION/i)).toBeDefined();
  });
});
