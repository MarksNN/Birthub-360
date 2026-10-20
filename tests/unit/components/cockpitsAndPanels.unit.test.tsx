import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveCopilotHUD } from '../../../src/features/copilot/components/LiveCopilotHUD.js';
import { WarRoomArenaView } from '../../../src/features/gamification/components/WarRoomArenaView.js';
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

vi.mock('../../../src/contexts/AuthContext.js', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'usr-1', name: 'Vendedor Teste', email: 'test@birthhub.com', role: 'admin' },
  })),
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
    it('renderiza título, modos de duelo e botão de entrada na arena', () => {
      render(<WarRoomArenaView />);

      expect(screen.getByText(/Arena Interativa de War Room/i)).toBeInTheDocument();
      expect(screen.getByText(/Duelo de Objeções/i)).toBeInTheDocument();
      expect(screen.getByText(/Desafio de Equipe/i)).toBeInTheDocument();
      expect(screen.getByText(/Torneio Sazonal/i)).toBeInTheDocument();
      expect(screen.getByText(/Entrar na Arena Agora/i)).toBeInTheDocument();
    });

    it('inicia duelo e permite digitar defesa contra a objeção ativa', () => {
      render(<WarRoomArenaView />);

      const startBtn = screen.getByText(/Entrar na Arena Agora/i);
      fireEvent.click(startBtn);

      expect(screen.getByText(/Round 1 de 3/i)).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText(/Estruture sua resposta/i);
      expect(textarea).toBeInTheDocument();

      fireEvent.change(textarea, {
        target: { value: 'Compreendo perfeitamente. Como você avalia o impacto de telemetria nativa no ROI?' },
      });
      expect(textarea).toHaveValue(
        'Compreendo perfeitamente. Como você avalia o impacto de telemetria nativa no ROI?',
      );
    });
  });

  // PredictiveRevenueCockpit: testes antigos validavam números fictícios (INITIAL_*), removidos no
  // REMED-03/04 — ver tests/unit/features/predictability/PredictiveRevenueCockpit.rebalance.test.tsx.

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
