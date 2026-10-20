import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copilotLiveBus } from '../../../src/features/copilot/copilotLiveBus.js';
import { LiveCopilotHUD } from '../../../src/features/copilot/components/LiveCopilotHUD.js';
import { WarRoomArenaView } from '../../../src/features/gamification/components/WarRoomArenaView.js';
import { MultiRegionFailoverPanel } from '../../../src/features/settings/components/MultiRegionFailoverPanel.js';

// Mocks do ambiente de teste
vi.mock('../../../src/contexts/AuthContext.js', () => ({
  useAuth: () => ({
    currentUser: { id: 'usr-closer-01', name: 'Lucas Closer', role: 'CLOSER' },
    isAdmin: true,
  }),
}));

vi.mock('../../../src/lib/soundEffects.js', () => ({
  SoundFX: {
    play: vi.fn(),
  },
}));

vi.mock('../../../src/lib/toast.js', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Cockpit Operacional e Telas de Gestão na UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    copilotLiveBus.reset();
  });

  describe('1. HUD do Live Copilot de Voz (Bimodal)', () => {
    it('deve renderizar a telemetria do motor bimodal de voz com P50 e estado LISTENING', () => {
      copilotLiveBus.startCall({
        sessionId: 'call-bimodal-test',
        leadName: 'Fernanda Rocha',
        leadCompany: 'LogSul Transportes',
      });

      render(<LiveCopilotHUD isActive={true} sessionId="call-bimodal-test" />);

      expect(screen.getByText('Fernanda Rocha')).toBeDefined();
      expect(screen.getByText('LogSul Transportes')).toBeDefined();
      expect(screen.getByText('Voz: Ouvindo Lead')).toBeDefined();
      expect(screen.getByText('P50 380ms')).toBeDefined();
    });

    it('deve acionar o controle de Barge-In e registrar interrupção na telemetria', () => {
      copilotLiveBus.startCall({ sessionId: 'call-test' });
      render(<LiveCopilotHUD isActive={true} sessionId="call-test" />);

      const bargeInButtons = screen.getAllByRole('button', { name: /Barge-In/i });
      expect(bargeInButtons.length).toBeGreaterThan(0);

      fireEvent.click(bargeInButtons[0]);

      const state = copilotLiveBus.getState();
      expect(state.bimodalVoice.state).toBe('INTERRUPTED');
      expect(state.bimodalVoice.lastBargeInMs).toBeDefined();
    });

    it('deve alternar para modo Fallback STT/TTS assíncrono e retornar para bimodal', () => {
      copilotLiveBus.startCall({ sessionId: 'call-test' });
      render(<LiveCopilotHUD isActive={true} sessionId="call-test" />);

      const fallbackToggle = screen.getByTitle(/Ativar fallback assíncrono/i);
      fireEvent.click(fallbackToggle);

      let state = copilotLiveBus.getState();
      expect(state.bimodalVoice.isFallback).toBe(true);
      expect(state.bimodalVoice.transport).toBe('websocket');
      expect(state.bimodalVoice.state).toBe('FALLBACK');

      // Alternar de volta
      const bimodalRestore = screen.getByTitle(/Voltar para Bimodal WebRTC/i);
      fireEvent.click(bimodalRestore);

      state = copilotLiveBus.getState();
      expect(state.bimodalVoice.isFallback).toBe(false);
      expect(state.bimodalVoice.transport).toBe('webrtc');
    });
  });

  describe('2. Arena Interativa de War Room', () => {
    it('deve renderizar o lobby com os 3 modos de duelo', () => {
      render(<WarRoomArenaView />);

      expect(screen.getByText('Arena Interativa de War Room')).toBeDefined();
      expect(screen.getByText('Duelo de Objeções')).toBeDefined();
      expect(screen.getByText('Desafio de Equipe')).toBeDefined();
      expect(screen.getByText('Torneio Sazonal')).toBeDefined();
    });

    it('deve iniciar o duelo e apresentar o round cronometrado com objeção ativa', () => {
      render(<WarRoomArenaView />);

      const enterArenaBtn = screen.getByRole('button', { name: /Entrar na Arena Agora/i });
      fireEvent.click(enterArenaBtn);

      expect(screen.getByText('Round 1 de 3')).toBeDefined();
      expect(screen.getByText(/Objeção do Lead/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/Estruture sua resposta/i)).toBeDefined();
    });
  });

  // 3. Cockpit Preditivo: os testes antigos validavam números fictícios (INITIAL_*), removidos
  // no REMED-03/04 — cobertura real em tests/unit/features/predictability/PredictiveRevenueCockpit.rebalance.test.tsx.

  describe('4. Visualizador de Failover Multi-Região', () => {
    it('deve exibir as 3 regiões canônicas (sa-east-1, us-east-1, us-west-2)', () => {
      render(<MultiRegionFailoverPanel />);

      expect(screen.getByText('Visualizador de Failover Multi-Região')).toBeDefined();
      expect(screen.getByText('sa-east-1')).toBeDefined();
      expect(screen.getByText('us-east-1')).toBeDefined();
      expect(screen.getByText('us-west-2')).toBeDefined();
      expect(screen.getByText('PRIMÁRIO')).toBeDefined();
    });

    it('deve abrir o modal de disparo de failover controlado', () => {
      render(<MultiRegionFailoverPanel />);

      const triggerBtn = screen.getByRole('button', { name: /Disparar Failover/i });
      fireEvent.click(triggerBtn);

      expect(screen.getByText('Disparar Failover Controlado')).toBeDefined();
      expect(screen.getByText('Região de Origem:')).toBeDefined();
      expect(screen.getByText('Região de Destino:')).toBeDefined();
    });
  });
});
