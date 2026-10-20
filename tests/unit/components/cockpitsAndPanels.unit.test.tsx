import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveCopilotHUD } from '../../../src/features/copilot/components/LiveCopilotHUD.js';
import { WarRoomArenaView } from '../../../src/features/gamification/components/WarRoomArenaView.js';
import { PredictiveRevenueCockpit } from '../../../src/features/predictability/components/PredictiveRevenueCockpit.js';
import { MultiRegionResiliencePanel } from '../../../src/features/settings/components/MultiRegionResiliencePanel.js';

// Mocks para evitar dependências de som, toast e bus externo
vi.mock('../../../src/lib/soundEffects.js', () => ({
  SoundFX: {
    play: vi.fn(),
  },
}));

vi.mock('../../../src/lib/toast.js', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../src/features/copilot/copilotLiveBus.js', () => ({
  useLiveCopilotSession: vi.fn(() => ({
    isCallActive: true,
    session: {
      sessionId: 'test-session-123',
      leadName: 'Carlos Silveira',
      leadCompany: 'Logística Brasil Express',
    },
    latestObjection: null,
    transcripts: [],
  })),
}));

describe('Cockpits e Painéis Operacionais (Opção 1)', () => {
  describe('WarRoomArenaView', () => {
    it('renderiza título, modos de duelo e lista de objeções do playbook', () => {
      render(<WarRoomArenaView />);

      expect(screen.getByText(/Arena de Duelo de Objeções/i)).toBeInTheDocument();
      expect(screen.getByText(/Duelo 1v1/i)).toBeInTheDocument();
      expect(screen.getByText(/Desafio de Time/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Preço & Orçamento/i).length).toBeGreaterThan(0);
    });

    it('permite alternar entre objeções do playbook e atualizar campo de defesa', () => {
      render(<WarRoomArenaView />);

      const concorrênciaBtn = screen.getByText(/Concorrência/i);
      fireEvent.click(concorrênciaBtn);

      const textarea = screen.getByPlaceholderText(/Digite sua resposta estruturada/i);
      expect(textarea).toBeInTheDocument();

      fireEvent.change(textarea, {
        target: { value: 'Compreendo perfeitamente. Como você avalia o impacto de telemetria nativa no ROI?' },
      });
      expect(textarea).toHaveValue(
        'Compreendo perfeitamente. Como você avalia o impacto de telemetria nativa no ROI?',
      );
    });
  });

  describe('PredictiveRevenueCockpit', () => {
    it('renderiza intervalos de confiança P10, P50 e P90 e horizontes temporais', () => {
      render(<PredictiveRevenueCockpit />);

      expect(screen.getByText(/Cockpit Preditivo de Receita \(P10 \/ P50 \/ P90\)/i)).toBeInTheDocument();
      expect(screen.getByText(/P10 • Cenário Conservador/i)).toBeInTheDocument();
      expect(screen.getByText(/P50 • Cenário Esperado/i)).toBeInTheDocument();
      expect(screen.getByText(/P90 • Cenário Otimista/i)).toBeInTheDocument();
      expect(screen.getByText(/Simulação Dinâmica de Cenários \(What-If\)/i)).toBeInTheDocument();
    });

    it('permite alternar o horizonte temporal para 30 ou 180 dias', () => {
      render(<PredictiveRevenueCockpit />);

      const btn30 = screen.getByText('30 Dias');
      fireEvent.click(btn30);
      expect(btn30).toBeInTheDocument();

      const btn180 = screen.getByText('180 Dias');
      fireEvent.click(btn180);
      expect(btn180).toBeInTheDocument();
    });
  });

  describe('MultiRegionResiliencePanel', () => {
    it('renderiza regiões sa-east-1, us-east-1 e métricas de RPO/RTO', () => {
      render(<MultiRegionResiliencePanel />);

      expect(screen.getByText(/Governança de Topologia Multi-Região & Failover/i)).toBeInTheDocument();
      expect(screen.getAllByText(/sa-east-1/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/us-east-1/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/us-west-2/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/RPO Máximo/i)).toBeInTheDocument();
      expect(screen.getByText(/RTO Alvo/i)).toBeInTheDocument();
    });

    it('possui botão de teste de failover seguro acionável', () => {
      render(<MultiRegionResiliencePanel />);

      const failoverBtn = screen.getByRole('button', { name: /Testar Failover Seguro/i });
      expect(failoverBtn).toBeInTheDocument();
      fireEvent.click(failoverBtn);
      expect(screen.getByText(/Processando Failover.../i)).toBeInTheDocument();
    });
  });

  describe('LiveCopilotHUD', () => {
    it('renderiza indicador WebRTC Live e barra de proporção Fala/Escuta durante chamada ativa', () => {
      render(<LiveCopilotHUD isActive={true} />);

      expect(screen.getByText(/Carlos Silveira/i)).toBeInTheDocument();
      expect(screen.getByText(/WebRTC Live/i)).toBeInTheDocument();
      expect(screen.getByText(/Zona Ideal SPIN Selling/i)).toBeInTheDocument();
      expect(screen.getByText(/Consultor: 38%/i)).toBeInTheDocument();
      expect(screen.getByText(/Prospect: 62%/i)).toBeInTheDocument();
    });
  });
});
