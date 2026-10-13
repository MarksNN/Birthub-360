import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/signals-risks/signalsRisks.api', () => ({
  signalsRisksApi: {
    getSignalCoverage: vi.fn().mockResolvedValue({
      available: true,
      reason: null,
      totalSignals: 4,
      accountsWithSignals: 12,
      byType: { NOVA_OPERACAO: 1, EXPANSAO: 1, TECNOLOGIA: 1, VAGAS: 1 },
      byStatus: { active: 4 },
    }),
    getHealthScore: vi.fn().mockResolvedValue({
      overallScore: 82,
      pillars: [
        { name: 'atividade', score: 85, classification: 'saudavel' },
        { name: 'conversao', score: 79, classification: 'saudavel' },
      ],
    }),
    getOverviewAlerts: vi.fn().mockResolvedValue({
      alerts: [],
    }),
    getRiskNotifications: vi.fn().mockResolvedValue([
      {
        id: 'notif-1',
        title: 'Risco de perda — silêncio do lead Transportes ABC',
        body: 'Lead sem contato há mais de 5 dias úteis.',
        kind: 'ALERT',
        createdAt: new Date().toISOString(),
      },
    ]),
    scanDealRisks: vi.fn().mockResolvedValue({
      scanned: 15,
      alertsCreated: 2,
      skippedCooldown: 5,
      errors: 0,
    }),
  },
}));

import { SignalsAndRisksHub } from '@/features/signals-risks/components/SignalsAndRisksHub';

afterEach(cleanup);

describe('SignalsAndRisksHub', () => {
  it('renderiza o título, subtítulo e as abas principais', async () => {
    render(
      <MemoryRouter initialEntries={['/app/signals-risks']}>
        <SignalsAndRisksHub />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sinais & Riscos')).toBeInTheDocument();
      expect(screen.getByText('Radar de Sinais')).toBeInTheDocument();
      expect(screen.getByText('Riscos de Deals')).toBeInTheDocument();
    });
  });

  it('exibe os cards do Radar de Sinais na aba inicial', async () => {
    render(
      <MemoryRouter initialEntries={['/app/signals-risks/radar']}>
        <SignalsAndRisksHub initialView="radar" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Nova Operação / CNPJ Recente')).toBeInTheDocument();
      expect(screen.getByText('Abertura de Filial / Expansão Geográfica')).toBeInTheDocument();
      expect(screen.getByText('Modernização de Stack Tecnológico')).toBeInTheDocument();
    });
  });

  it('alterna para a aba Riscos de Deals ao clicar no seletor', async () => {
    render(
      <MemoryRouter initialEntries={['/app/signals-risks']}>
        <SignalsAndRisksHub />
      </MemoryRouter>,
    );

    const dealRisksButton = screen.getByRole('button', { name: /Riscos de Deals/i });
    fireEvent.click(dealRisksButton);

    await waitFor(() => {
      expect(screen.getByText('Detecção Agêntica de Riscos de Negócios')).toBeInTheDocument();
      expect(screen.getByText('Silêncio Prolongado')).toBeInTheDocument();
      expect(screen.getByText('Mudança de Tom & Frieza')).toBeInTheDocument();
      expect(screen.getByText('Concorrente Mencionado')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Escanear Riscos Agora/i })).toBeInTheDocument();
    });
  });
});
