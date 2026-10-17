import { describe, expect, it, vi } from 'vitest';
import { RoleplayUseCases } from '@/features/roleplay/application/RoleplayUseCases';
import { InMemoryRoleplayRepository } from '@/features/roleplay/infra/PrismaRoleplayRepository';
import type { RoleplayAiService } from '@/features/roleplay/services/roleplay-ai.service';

function createMockAiService(overrides?: Partial<RoleplayAiService>): RoleplayAiService {
  return {
    simulateCustomerResponse: vi.fn().mockResolvedValue({
      personaReply: 'Entendi a proposta, mas na prática o payback de 4 meses é viável?',
      currentLeadInterest: 70,
      isDealClosed: false,
      isDealLost: false,
    }),
    evaluateSession: vi.fn().mockResolvedValue({
      overallScore: 82,
      clarityScore: 85,
      objectionHandlingScore: 80,
      closingAttemptScore: 75,
      strengths: ['Investigou payback de forma assertiva'],
      weaknesses: ['Poderia explorar mais riscos técnicos'],
      actionableFeedback: 'Boa condução comercial com foco em ROI.',
    }),
    ...overrides,
  } as unknown as RoleplayAiService;
}

describe('RoleplayUseCases — Simulador Comercial e Avaliação Real de IA (DT-007)', () => {
  it('lista personas B2B pré-configuradas com cenários e objeções', async () => {
    const repo = new InMemoryRoleplayRepository();
    const useCases = new RoleplayUseCases(repo, createMockAiService());

    const personas = await useCases.listPersonas();

    expect(personas.length).toBeGreaterThanOrEqual(3);
    const cfo = personas.find((p) => p.id === 'cfo-cético');
    expect(cfo).toBeDefined();
    expect(cfo?.difficulty).toBe('AVANCADO');
  });

  it('inicia sessão de roleplay com saudação contextualizada da persona', async () => {
    const repo = new InMemoryRoleplayRepository();
    const useCases = new RoleplayUseCases(repo, createMockAiService());

    const { session, persona, initialGreeting } = await useCases.startSession('org-1', 'user-1', 'cfo-cético');

    expect(session.id).toBeDefined();
    expect(session.status).toBe('ACTIVE');
    expect(persona.name).toBe('Roberto Valente');
    expect(initialGreeting).toContain('Roberto Valente');
    expect(session.messages).toHaveLength(1);
  });

  it('conduz turnos de conversa acionando o serviço de IA real e avalia a performance', async () => {
    const repo = new InMemoryRoleplayRepository();
    const mockAi = createMockAiService();
    const useCases = new RoleplayUseCases(repo, mockAi);

    const { session } = await useCases.startSession('org-1', 'user-1', 'cfo-cético');

    const turn1 = await useCases.sendTurn(
      'org-1',
      session.id,
      'Entendo sua preocupação orçamentária, Roberto. Nossa solução traz payback em 4 meses.',
    );
    expect(turn1.turnCount).toBe(2);
    expect(turn1.response).toContain('payback de 4 meses é viável?');
    expect(mockAi.simulateCustomerResponse).toHaveBeenCalledTimes(1);

    const feedback = await useCases.evaluateSession('org-1', session.id);
    expect(mockAi.evaluateSession).toHaveBeenCalledTimes(1);
    expect(feedback.overallScore).toBe(82);
    expect(feedback.spinSellingScores.situation).toBe(85);
    expect(feedback.objectionHandlingScore).toBe(80);
    expect(feedback.strengths.length).toBeGreaterThan(0);
  });

  it('DT-007: propaga erro explícito se o provider de IA falhar, sem retornar mock silencioso', async () => {
    const repo = new InMemoryRoleplayRepository();
    const failingAi = createMockAiService({
      simulateCustomerResponse: vi.fn().mockRejectedValue(new Error('LLM provider unavailable: rate limit exceeded')),
    });
    const useCases = new RoleplayUseCases(repo, failingAi);

    const { session } = await useCases.startSession('org-1', 'user-1', 'cfo-cético');

    await expect(
      useCases.sendTurn('org-1', session.id, 'Olá Roberto, como estão os negócios?'),
    ).rejects.toThrow('LLM provider unavailable: rate limit exceeded');
  });

  it('consulta critérios de qualificação e objeções via RoleplayPlaybookPort', async () => {
    const repo = new InMemoryRoleplayRepository();
    const mockAi = createMockAiService();
    const mockPlaybookPort = {
      findQualificationCriteria: vi.fn().mockResolvedValue(['Orçamento: Tem verba aprovada?']),
      findObjections: vi.fn().mockResolvedValue(['Preço alto (Muito caro)']),
    };
    const useCases = new RoleplayUseCases(repo, mockAi, mockPlaybookPort);

    const { session } = await useCases.startSession('org-1', 'user-1', 'cfo-cético');
    await useCases.sendTurn('org-1', session.id, 'Proposta comercial');

    expect(mockPlaybookPort.findQualificationCriteria).toHaveBeenCalledWith('org-1');
    expect(mockPlaybookPort.findObjections).toHaveBeenCalledWith('org-1');
    expect(mockAi.simulateCustomerResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        qualificationCriteria: ['Orçamento: Tem verba aprovada?'],
        objections: ['Preço alto (Muito caro)'],
      }),
    );
  });
});

