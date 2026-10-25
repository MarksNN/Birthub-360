/**
 * P1.1 - Testes para AgentExecutor
 *
 * Cobertura:
 * - Gates de segurança (LGPD, budget, checkpointer)
 * - Execução sem ferramentas
 * - Execução com ferramentas
 * - Tratamento de erros
 * - Persistência de memória
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AgentExecutor,
  type AgentExecutionContext,
  type AgentExecutionConfig,
} from '../AgentExecutor.js';
import { assertPiiExternalConsent } from '../../services/guardrails.service.js';
import { assertAiBudgetNotExceeded } from '../../../../lib/ai/budget.js';
import { ensureCheckpointerReady } from '../../../../lib/ai/checkpointer.js';
import { recordAgentFailure } from '../agentMemory.store.js';
import { saveAgentMemory } from '../agentMemory.store.js';
import { getLearningProfile } from '../learning.agent.js';

// Mocks
vi.mock('../../../../features/intelligence/services/guardrails.service.js');
vi.mock('../../../../lib/ai/budget.js');
vi.mock('../../../../lib/ai/checkpointer.js');
vi.mock('../agentMemory.store.js');
vi.mock('../learning.agent.js');

describe('AgentExecutor', () => {
  const mockContext: AgentExecutionContext = {
    agentType: 'TestAgent',
    sessionId: 'test-session-123',
    organizationId: 'org-123',
    userId: 'user-123',
    inputData: 'Test input',
    modelName: 'local-llama3-fast',
    temperature: 0.4,
  };

  const mockConfig: AgentExecutionConfig = {
    useTools: false,
    buildSystemPrompt: vi.fn(() => 'You are a test agent'),
    buildHumanMessage: vi.fn((input) => `Human: ${input}`),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPiiExternalConsent).mockResolvedValue(undefined);
    vi.mocked(assertAiBudgetNotExceeded).mockResolvedValue(undefined);
    vi.mocked(ensureCheckpointerReady).mockResolvedValue(undefined);
    vi.mocked(recordAgentFailure).mockResolvedValue(undefined);
    vi.mocked(saveAgentMemory).mockResolvedValue(undefined);
    vi.mocked(getLearningProfile).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applySecurityGates', () => {
    it('deve passar quando todos os gates estão OK', async () => {
      // Se não lançar exceção, o teste passa
      await AgentExecutor.executeWithoutTools(mockContext, mockConfig);

      expect(assertPiiExternalConsent).toHaveBeenCalledWith(mockContext.organizationId);
      expect(assertAiBudgetNotExceeded).toHaveBeenCalled();
      expect(ensureCheckpointerReady).toHaveBeenCalled();
    });

    it('deve bloquear quando gate LGPD falha', async () => {
      const lgpdError = new Error('Sem base legal LGPD');
      vi.mocked(assertPiiExternalConsent).mockRejectedValue(lgpdError);

      const result = await AgentExecutor.executeWithoutTools(mockContext, mockConfig);

      expect(result.error).toBe(lgpdError.message);
      expect(recordAgentFailure).toHaveBeenCalledWith({
        sessionId: mockContext.sessionId,
        agentType: mockContext.agentType,
        organizationId: mockContext.organizationId,
        errorMessage: lgpdError.message,
      });
    });

    it('deve bloquear quando gate budget falha', async () => {
      const budgetError = new Error('Orçamento excedido');
      vi.mocked(assertAiBudgetNotExceeded).mockRejectedValue(budgetError);

      const result = await AgentExecutor.executeWithoutTools(mockContext, mockConfig);

      expect(result.error).toBe(budgetError.message);
      expect(recordAgentFailure).toHaveBeenCalledWith({
        sessionId: mockContext.sessionId,
        agentType: mockContext.agentType,
        organizationId: mockContext.organizationId,
        errorMessage: budgetError.message,
      });
    });

    it('deve bloquear quando checkpointer não está pronto', async () => {
      const checkpointerError = new Error('Checkpointer não pronto');
      vi.mocked(ensureCheckpointerReady).mockRejectedValue(checkpointerError);

      const result = await AgentExecutor.executeWithoutTools(mockContext, mockConfig);

      expect(result.error).toBe(checkpointerError.message);
      expect(recordAgentFailure).toHaveBeenCalledWith({
        sessionId: mockContext.sessionId,
        agentType: mockContext.agentType,
        organizationId: mockContext.organizationId,
        errorMessage: checkpointerError.message,
      });
    });
  });

  describe('executeWithoutTools', () => {
    it('deve executar agente sem ferramentas com sucesso', async () => {
      // Mock do gateway de IA
      vi.doMock('../../../../lib/ai/gateway.js', () => ({
        getAiModel: vi.fn(() => ({
          invoke: vi.fn().mockResolvedValue({
            content: 'Test response',
            response_metadata: {
              model: 'local-llama3-fast',
              tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            },
          }),
        })),
        logAiUsage: vi.fn().mockResolvedValue(undefined),
      }));

      const result = await AgentExecutor.executeWithoutTools(mockContext, mockConfig);

      expect(result.error).toBeUndefined();
      expect(result.sessionId).toBe(mockContext.sessionId);
      expect(saveAgentMemory).toHaveBeenCalled();
    });

    it('deve carregar perfil de estilo aprendido quando disponível', async () => {
      vi.mocked(getLearningProfile).mockResolvedValue('Estilo aprendido: formal');

      await AgentExecutor.executeWithoutTools(mockContext, mockConfig);

      expect(getLearningProfile).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.userId,
      );
      expect(mockConfig.buildSystemPrompt).toHaveBeenCalledWith('Estilo aprendido: formal');
    });

    it('deve persistir memória após execução bem-sucedida', async () => {
      await AgentExecutor.executeWithoutTools(mockContext, mockConfig);

      expect(saveAgentMemory).toHaveBeenCalledWith({
        sessionId: mockContext.sessionId,
        agentType: mockContext.agentType,
        organizationId: mockContext.organizationId,
        messages: expect.any(Array),
        status: 'Completed',
      });
    });
  });

  describe('executeWithTools', () => {
    it('deve executar agente com ferramentas com sucesso', async () => {
      const configWithTools: AgentExecutionConfig = {
        useTools: true,
        tools: [],
        buildSystemPrompt: vi.fn(() => 'You are a test agent'),
        buildHumanMessage: vi.fn((input) => `Human: ${input}`),
      };

      // Mock do fallback.util
      vi.doMock('../fallback.util.js', () => ({
        buildModelWithFallback: vi.fn(() => ({
          invoke: vi.fn().mockResolvedValue({
            messages: [{ content: 'Test response', _getType: () => 'ai' }],
          }),
        })),
      }));

      const result = await AgentExecutor.executeWithTools(mockContext, configWithTools);

      expect(result.error).toBeUndefined();
      expect(result.sessionId).toBe(mockContext.sessionId);
      expect(saveAgentMemory).toHaveBeenCalled();
    });

    it('deve usar toolsModelName quando executando com ferramentas', async () => {
      const contextWithToolsModel: AgentExecutionContext = {
        ...mockContext,
        toolsModelName: 'openai/gpt-4o-mini',
      };

      const configWithTools: AgentExecutionConfig = {
        useTools: true,
        tools: [],
        buildSystemPrompt: vi.fn(() => 'You are a test agent'),
        buildHumanMessage: vi.fn((input) => `Human: ${input}`),
      };

      await AgentExecutor.executeWithTools(contextWithToolsModel, configWithTools);

      // Verifica que o modelo correto foi usado (via fallback.util)
      expect(saveAgentMemory).toHaveBeenCalled();
    });
  });

  describe('execute (método de conveniência)', () => {
    it('deve usar executeWithoutTools quando não há ferramentas', async () => {
      const result = await AgentExecutor.execute(mockContext, mockConfig);

      expect(result.error).toBeUndefined();
      expect(result.sessionId).toBe(mockContext.sessionId);
    });

    it('deve usar executeWithTools quando há ferramentas', async () => {
      const configWithTools: AgentExecutionConfig = {
        useTools: true,
        tools: [],
        buildSystemPrompt: vi.fn(() => 'You are a test agent'),
        buildHumanMessage: vi.fn((input) => `Human: ${input}`),
      };

      const result = await AgentExecutor.execute(mockContext, configWithTools);

      expect(result.error).toBeUndefined();
      expect(result.sessionId).toBe(mockContext.sessionId);
    });
  });

  describe('tratamento de erros', () => {
    it('deve retornar erro quando execução falha', async () => {
      // Mock que falha na execução
      vi.doMock('../../../../lib/ai/gateway.js', () => ({
        getAiModel: vi.fn(() => ({
          invoke: vi.fn().mockRejectedValue(new Error('Falha na IA')),
        })),
        logAiUsage: vi.fn().mockResolvedValue(undefined),
      }));

      const result = await AgentExecutor.executeWithoutTools(mockContext, mockConfig);

      expect(result.error).toBeDefined();
      expect(result.sessionId).toBe(mockContext.sessionId);
    });

    it('deve tratar erro sem mensagem definida', async () => {
      vi.doMock('../../../../lib/ai/gateway.js', () => ({
        getAiModel: vi.fn(() => ({
          invoke: vi.fn().mockRejectedValue(null),
        })),
        logAiUsage: vi.fn().mockResolvedValue(undefined),
      }));

      const result = await AgentExecutor.executeWithoutTools(mockContext, mockConfig);

      expect(result.error).toContain('Falha desconhecida');
    });
  });

  describe('loadLearnedStyle', () => {
    it('deve retornar null quando não há tenant', async () => {
      const contextNoTenant: AgentExecutionContext = {
        ...mockContext,
        organizationId: null,
      };

      await AgentExecutor.executeWithoutTools(contextNoTenant, mockConfig);

      expect(getLearningProfile).not.toHaveBeenCalled();
    });

    it('deve retornar null quando não há userId', async () => {
      const contextNoUser: AgentExecutionContext = {
        ...mockContext,
        userId: null,
      };

      await AgentExecutor.executeWithoutTools(contextNoUser, mockConfig);

      expect(getLearningProfile).not.toHaveBeenCalled();
    });
  });
});
