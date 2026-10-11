import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

const postMock = vi.fn();

vi.mock('../../../../../src/lib/api.js', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('../../../../../src/lib/soundEffects.js', () => ({
  SoundFX: {
    play: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/toast.js', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { PredictiveScoringNbaCard } from '../../../../../src/features/intelligence/components/PredictiveScoringNbaCard.js';
import { toast } from '../../../../../src/lib/toast.js';

describe('PredictiveScoringNbaCard — Componente de UI para Scoring Vetorial e NBA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockScoreData = {
    leadId: 'lead-123',
    deterministicIcpScore: 85,
    lookalikeSimilarityScore: 78,
    finalPredictiveScore: 82,
    temperature: 'Quente' as const,
    insights: [
      'Segmento Logística com alta aderência histórica',
      'Frota > 50 veículos alinhada com negócios fechados',
    ],
    computedAt: '2026-10-08T18:00:00.000Z',
  };

  const mockNbaData = {
    leadId: 'lead-123',
    action: 'Agendar Demonstração de Telemetria Avançada',
    rationale:
      'Lead com alto fit e dor de consumo de diesel; decisor já contatado nos últimos 3 dias.',
    recommendedChannel: 'whatsapp' as const,
    urgency: 'alta' as const,
    suggestedMessageTemplate:
      'Olá Carlos! Vi que você gerencia a frota da TransLog. Temos cases com 12% de economia em diesel.',
  };

  it('carrega e exibe pontuação preditiva e recomendação de ação com sucesso', async () => {
    postMock.mockImplementation((url: string) => {
      if (url.includes('/lead-score')) {
        return Promise.resolve({ success: true, data: mockScoreData });
      }
      if (url.includes('/next-best-action')) {
        return Promise.resolve({ success: true, data: mockNbaData });
      }
      return Promise.reject(new Error(`Rota desconhecida: ${url}`));
    });

    render(
      <PredictiveScoringNbaCard
        leadId="lead-123"
        leadName="Carlos Silva"
        companyName="TransLog Transportes"
        stage="Qualificação"
      />,
    );

    // Aguarda exibição do score final e temperatura
    await waitFor(() => {
      expect(screen.getByText('82')).toBeInTheDocument();
      expect(screen.getByText('Quente')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument(); // ICP Fit
      expect(screen.getByText('78')).toBeInTheDocument(); // Lookalike
    });

    // Verifica insights
    expect(
      screen.getByText('Segmento Logística com alta aderência histórica'),
    ).toBeInTheDocument();

    // Verifica Next Best Action
    expect(
      screen.getByText('Agendar Demonstração de Telemetria Avançada'),
    ).toBeInTheDocument();
    expect(screen.getByText(/URGÊNCIA ALTA/i)).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(
      screen.getByText(/Temos cases com 12% de economia em diesel/i),
    ).toBeInTheDocument();
  });

  it('exibe estado de erro e permite tentar novamente', async () => {
    postMock.mockRejectedValueOnce(new Error('Falha na conexão com Qdrant'));

    render(
      <PredictiveScoringNbaCard
        leadId="lead-123"
        leadName="Carlos Silva"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Erro na análise preditiva')).toBeInTheDocument();
      expect(screen.getByText('Falha na conexão com Qdrant')).toBeInTheDocument();
    });

    // Mock recupera na segunda tentativa
    postMock.mockImplementation((url: string) => {
      if (url.includes('/lead-score')) {
        return Promise.resolve({ success: true, data: mockScoreData });
      }
      return Promise.resolve({ success: true, data: mockNbaData });
    });

    const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
    await userEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('82')).toBeInTheDocument();
    });
  });

  it('recalcula ao clicar no botão de refresh no header', async () => {
    postMock.mockImplementation((url: string) => {
      if (url.includes('/lead-score')) {
        return Promise.resolve({ success: true, data: mockScoreData });
      }
      return Promise.resolve({ success: true, data: mockNbaData });
    });

    render(
      <PredictiveScoringNbaCard
        leadId="lead-123"
        leadName="Carlos Silva"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('82')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', {
      name: /recalcular pontuação preditiva/i,
    });
    await userEvent.click(refreshButton);

    expect(postMock).toHaveBeenCalledTimes(4); // 2 da montagem + 2 do refresh
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Pontuação e Next Best Action recalculados com sucesso!',
      );
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('não anuncia sucesso quando o recálculo pelo header falha', async () => {
    postMock.mockImplementation((url: string) => {
      if (url.includes('/lead-score')) {
        return Promise.resolve({ success: true, data: mockScoreData });
      }
      return Promise.resolve({ success: true, data: mockNbaData });
    });

    render(
      <PredictiveScoringNbaCard
        leadId="lead-123"
        leadName="Carlos Silva"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('82')).toBeInTheDocument();
    });

    postMock.mockRejectedValue(new Error('Serviço preditivo indisponível'));

    const refreshButton = screen.getByRole('button', {
      name: /recalcular pontuação preditiva/i,
    });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Não foi possível recalcular a pontuação preditiva.',
      );
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText('Serviço preditivo indisponível')).toBeInTheDocument();
  });
});
