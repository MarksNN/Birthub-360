import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { roleplayApi } from '../../../../src/features/roleplay/api/roleplay.api.js';
import { RoleplayHub } from '../../../../src/features/roleplay/components/RoleplayHub.js';
import type { RoleplayPersona, RoleplaySession } from '../../../../src/features/roleplay/domain/Roleplay.js';
import { api } from '../../../../src/lib/api.js';

// Mock do contexto de playbook
vi.mock('../../../../src/hooks/useActivePlaybook.js', () => ({
  useActivePlaybook: () => ({
    playbook: 'atlas',
    info: {
      label: 'Playbook Atlas',
      description: 'Logística e Gerenciamento de Risco',
    },
  }),
}));

// Mock de dados de matrizes vivas
vi.mock('../../../../src/hooks/usePlaybookMatrixData.js', () => ({
  usePlaybookMatrixData: () => ({
    objections: [
      {
        id: 'obj-1',
        brand: 'atlas',
        objectionTitle: 'Custo Elevado',
        objectionText: 'A mensalidade parece acima do orçamento atual.',
        responseScript: 'Destaque o ROI em redução de sinistros.',
        keyDifferentiator: 'Retorno financeiro em 4 meses',
      },
    ],
    qualifications: [
      {
        id: 'qual-1',
        brand: 'atlas',
        questionCategory: 'Situação',
        questionText: 'Quantos veículos na frota utilizam telemetria atualmente?',
        idealAnswer: 'Mais de 50 veículos.',
      },
    ],
    loading: false,
  }),
}));

// Mock de efeitos sonoros
vi.mock('../../../../src/lib/soundEffects.js', () => ({
  SoundFX: {
    play: vi.fn(),
  },
}));

// Mock de mediaDevices e SpeechRecognition para ambiente jsdom
beforeEach(() => {
  vi.restoreAllMocks();
  window.speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: vi.fn().mockReturnValue([]),
  } as unknown as SpeechSynthesis;

  class MockSpeechSynthesisUtterance {
    text: string;
    lang = 'pt-BR';
    rate = 1.0;
    pitch = 1.0;
    voice: unknown = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
    MockSpeechSynthesisUtterance;

  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
  });

  class MockMediaRecorder {
    state = 'recording';
    ondataavailable: ((event: unknown) => void) | null = null;
    onstop: (() => void) | null = null;
    start = vi.fn();
    stop = vi.fn();
  }
  (window as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
});

afterEach(() => {
  cleanup();
});

describe('Capacidade 3 — Roleplay: Fluxo de Treinamento e Avaliação Pedagógica de IA', () => {
  const mockPersona: RoleplayPersona = {
    id: 'cfo-cético',
    name: 'Roberto Valente',
    title: 'Diretor Financeiro (CFO)',
    companyType: 'Indústria Metalúrgica',
    difficulty: 'AVANCADO',
    scenario: 'Revisando contratos e exigindo payback em 6 meses.',
    coreObjections: ['Já temos CRM legado', 'Custo alto'],
    personalityTraits: ['Analítico', 'Direto'],
  };

  const mockSession: RoleplaySession = {
    id: 'session-roleplay-123',
    organizationId: 'org-demo',
    userId: 'usr-sdr-01',
    personaId: 'cfo-cético',
    status: 'ACTIVE',
    messages: [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Olá, sou Roberto Valente. Tenho 10 minutos.',
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('1. roleplayApi.getPersonas recupera a lista de personas B2B pré-configuradas', async () => {
    const apiGetSpy = vi.spyOn(api, 'get').mockResolvedValueOnce([mockPersona]);

    const personas = await roleplayApi.getPersonas();

    expect(apiGetSpy).toHaveBeenCalledWith('/api/roleplay/personas');
    expect(personas).toHaveLength(1);
    expect(personas[0].name).toBe('Roberto Valente');
    expect(personas[0].difficulty).toBe('AVANCADO');
  });

  it('2. roleplayApi.startSession cria uma nova sessão persistida para o tenant', async () => {
    const apiPostSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
      session: mockSession,
      persona: mockPersona,
      initialGreeting: 'Olá, sou Roberto Valente.',
    });

    const result = await roleplayApi.startSession('cfo-cético');

    expect(apiPostSpy).toHaveBeenCalledWith('/api/roleplay/sessions', {
      personaId: 'cfo-cético',
    });
    expect(result.session.id).toBe('session-roleplay-123');
    expect(result.persona.name).toBe('Roberto Valente');
  });

  it('3. roleplayApi.sendTurn envia a fala do vendedor e recebe réplica da IA', async () => {
    const apiPostSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
      response: 'Entendo sua proposta, mas qual a garantia do payback em 4 meses?',
      turnCount: 2,
    });

    const result = await roleplayApi.sendTurn(
      'session-roleplay-123',
      'Nosso sistema traz ROI comprovado em menos de 120 dias.',
    );

    expect(apiPostSpy).toHaveBeenCalledWith(
      '/api/roleplay/sessions/session-roleplay-123/messages',
      { message: 'Nosso sistema traz ROI comprovado em menos de 120 dias.' },
    );
    expect(result.turnCount).toBe(2);
    expect(result.response).toContain('payback em 4 meses');
  });

  it('4. roleplayApi.evaluateSession emite parecer pedagógico com notas SPIN e feedback acionável', async () => {
    const mockFeedback = {
      overallScore: 84,
      spinSellingScores: {
        situation: 85,
        problem: 80,
        implication: 82,
        needPayoff: 90,
      },
      objectionHandlingScore: 88,
      strengths: ['Investigação sólida da operação', 'Foco claro em ROI'],
      improvementAreas: ['Poderia explorar mais o custo de inação'],
      summary: 'Excelente postura comercial com contorno assertivo de objeções.',
    };

    const apiPostSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(mockFeedback);

    const feedback = await roleplayApi.evaluateSession('session-roleplay-123');

    expect(apiPostSpy).toHaveBeenCalledWith(
      '/api/roleplay/sessions/session-roleplay-123/evaluate',
      {},
    );
    expect(feedback.overallScore).toBe(84);
    expect(feedback.spinSellingScores.needPayoff).toBe(90);
    expect(feedback.objectionHandlingScore).toBe(88);
    expect(feedback.strengths).toContain('Foco claro em ROI');
  });

  it('5. roleplayApi.getUserHistory lista o histórico de simulações do vendedor logado', async () => {
    const apiGetSpy = vi.spyOn(api, 'get').mockResolvedValueOnce([mockSession]);

    const history = await roleplayApi.getUserHistory();

    expect(apiGetSpy).toHaveBeenCalledWith('/api/roleplay/history');
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('session-roleplay-123');
  });

  it('6. RoleplayHub renderiza a tela de Setup com opções de persona e resistência', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce([]);

    render(<RoleplayHub />);

    expect(screen.getByText('Setup da Ligação')).toBeInTheDocument();
    expect(screen.getByText(/Escolha quem você vai ligar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ligar Agora/i })).toBeInTheDocument();
    expect(screen.getByText('Resistência da ligação:')).toBeInTheDocument();
  });

  it('7. RoleplayHub inicia a chamada interativa ao clicar em "Ligar Agora"', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce([]);

    render(<RoleplayHub />);

    const ligarBtn = screen.getByRole('button', { name: /Ligar Agora/i });
    fireEvent.click(ligarBtn);

    await waitFor(() => {
      // Verifica se a tela mudou para ligação ativa
      expect(screen.queryByText('Setup da Ligação')).not.toBeInTheDocument();
      expect(screen.getByText(/00:00/)).toBeInTheDocument();
    });
  });
});
