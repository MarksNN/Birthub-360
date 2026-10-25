/**
 * P1.1 - AgentExecutor Unificado
 *
 * Facade unificado para execução de agentes de IA.
 * Centraliza: LGPD gate, budget check, checkpointer, fallback, memory, logging.
 * Remove duplicação entre BaseAgent.run() e BaseAgent.runWithTools().
 *
 * Responsável por:
 * - Aplicar todos os gates de segurança (LGPD, budget, etc.)
 * - Configurar checkpointer (PostgresSaver por padrão)
 * - Gerenciar fallback de providers
 * - Persistir memória de execução
 * - Registrar falhas e telemetria
 *
 * Design:
 * - Single source of truth para execução de agentes
 * - Gates aplicados uniformemente em todos os caminhos
 * - Extensível para novos gates futuros
 * - Compatível com BaseAgent existente (migration path)
 */

import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { checkpointer, ensureCheckpointerReady } from '../../../../lib/ai/checkpointer.js';
import { getAiModel, logAiUsage } from '../../../../lib/ai/gateway.js';
import { assertAiBudgetNotExceeded } from '../../../../lib/ai/budget.js';
import { getTenantId, getUserId } from '../../../../lib/async-context.js';
import { logger } from '../../../../lib/logger.js';
import { assertPiiExternalConsent } from '../../services/guardrails.service.js';
import { recordAgentFailure, saveAgentMemory } from '../agentMemory.store.js';
import { getLearningProfile } from '../learning.agent.js';

export interface SerializedMessage {
  role: string;
  content: string;
}

export interface AgentExecutionContext {
  agentType: string;
  sessionId: string;
  organizationId: string | null;
  userId: string | null;
  inputData: string;
  modelName?: string;
  temperature?: number;
  toolsModelName?: string;
}

export interface AgentExecutionConfig {
  useTools?: boolean;
  tools?: StructuredToolInterface[];
  buildSystemPrompt: (learnedStyle: string | null) => string;
  buildHumanMessage: (input: string) => string;
}

export interface AgentExecutionResult {
  sessionId: string;
  output?: string;
  error?: string;
  messages?: SerializedMessage[];
}

/**
 * Gates de segurança aplicados antes da execução de qualquer agente.
 * Todos os gates devem ser fail-closed (bloqueiam se não passarem).
 */
async function applySecurityGates(context: AgentExecutionContext): Promise<void> {
  const { agentType, sessionId, organizationId } = context;

  // Gate 1: LGPD - consentimento para enviar PII a provedores externos
  try {
    assertPiiExternalConsent(organizationId);
  } catch (error: any) {
    const message = (error as Error).message;
    logger.warn(
      { err: error, sessionId, agentType, organizationId },
      `Agente ${agentType} bloqueado: sem base legal LGPD registrada para enviar dado pessoal a provedor de IA externo.`,
    );
    await recordAgentFailure({
      sessionId,
      agentType,
      organizationId,
      errorMessage: message,
    });
    throw new Error(message);
  }

  // Gate 2: Budget - orçamento mensal de IA (global + por organização)
  try {
    await assertAiBudgetNotExceeded();
  } catch (error: any) {
    const message = (error as Error).message;
    logger.warn(
      { err: error, sessionId, agentType, organizationId },
      `Agente ${agentType} bloqueado: orçamento de IA excedido.`,
    );
    await recordAgentFailure({
      sessionId,
      agentType,
      organizationId,
      errorMessage: message,
    });
    throw new Error(message);
  }

  // Gate 3: Checkpointer - garante que tabelas do LangGraph existem
  try {
    await ensureCheckpointerReady();
  } catch (error: any) {
    const message = (error as Error).message;
    logger.error(
      { err: error, sessionId, agentType, organizationId },
      `Agente ${agentType} bloqueado: checkpointer LangGraph não está pronto.`,
    );
    await recordAgentFailure({
      sessionId,
      agentType,
      organizationId,
      errorMessage: message,
    });
    throw new Error(message);
  }
}

/**
 * Executor unificado de agentes.
 * Substitui a lógica duplicada de BaseAgent.run() e BaseAgent.runWithTools().
 */
export class AgentExecutor {
  /**
   * Executa um agente sem ferramentas (turno único do StateGraph).
   * Usa o gateway de IA centralizado (getAiModel).
   */
  static async executeWithoutTools(
    context: AgentExecutionContext,
    config: AgentExecutionConfig,
  ): Promise<AgentExecutionResult> {
    const {
      agentType,
      sessionId,
      inputData,
      modelName = 'local-llama3-fast',
      temperature = 0.4,
    } = context;
    const { buildSystemPrompt, buildHumanMessage } = config;

    // Aplicar gates de segurança
    await applySecurityGates(context);

    // Carregar perfil de estilo aprendido
    const learnedStyle = await loadLearnedStyle(context);

    // Construir grafo LangGraph com checkpointer PostgresSaver
    const graph = new StateGraph(MessagesAnnotation)
      .addNode('process', async (state) => {
        const model = getAiModel(modelName, temperature, `${agentType.toLowerCase()}-agent`);
        const startTime = Date.now();

        const systemPrompt = new SystemMessage(buildSystemPrompt(learnedStyle));
        const response = await model.invoke([systemPrompt, ...state.messages]);

        await logAiUsage({
          model: response.response_metadata.model,
          usage: response.response_metadata.tokenUsage,
          latencyMs: Date.now() - startTime,
          agentRole: agentType,
        });

        return { messages: [new AIMessage(response.content)] };
      })
      .addEdge('__start__', 'process')
      .addEdge('process', '__end__');

    const compiled = graph.compile({ checkpointer });
    const graphConfig = { configurable: { thread_id: sessionId } };

    try {
      const finalState = await compiled.invoke(
        { messages: [new HumanMessage(buildHumanMessage(inputData))] },
        graphConfig,
      );

      const messages = finalState.messages as BaseMessage[];
      const lastMessage = messages[messages.length - 1];

      const serializedMessages = messages.map(
        (m: BaseMessage): SerializedMessage => ({
          role: m.type,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        }),
      );

      // Persistir memória
      await saveAgentMemory({
        sessionId,
        agentType,
        organizationId: context.organizationId,
        messages: serializedMessages,
        status: 'Completed',
      });

      return {
        output: lastMessage.content as string,
        sessionId,
        messages: serializedMessages,
      };
    } catch (error: any) {
      logger.error({ err: error, sessionId, agentType }, 'Agent execution failed (without tools)');
      const message =
        error instanceof Error ? error.message : `Falha desconhecida no Agente ${agentType}.`;
      return { error: message, sessionId };
    }
  }

  /**
   * Executa um agente com ferramentas (ReAct loop).
   * Usa buildModelWithFallback com bindTools.
   */
  static async executeWithTools(
    context: AgentExecutionContext,
    config: AgentExecutionConfig,
  ): Promise<AgentExecutionResult> {
    const { agentType, sessionId, inputData, toolsModelName = 'openai/gpt-oss-20b' } = context;
    const { buildSystemPrompt, buildHumanMessage, tools = [] } = config;

    // Aplicar gates de segurança
    await applySecurityGates(context);

    // Carregar perfil de estilo aprendido
    const learnedStyle = await loadLearnedStyle(context);

    try {
      const { buildModelWithFallback } = await import('../fallback.util.js');
      const { createReactAgent } = await import('@langchain/langgraph/prebuilt');

      const model = buildModelWithFallback(toolsModelName, tools);
      const agent = createReactAgent({ llm: model, tools: tools as any });

      const result = await agent.invoke({
        messages: [
          new SystemMessage(buildSystemPrompt(learnedStyle)),
          new HumanMessage(buildHumanMessage(inputData)),
        ],
      });

      const messages = result.messages as BaseMessage[];
      const lastMessage = messages[messages.length - 1];

      const serializedMessages = messages.map(
        (m): SerializedMessage => ({
          role: m._getType(),
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        }),
      );

      // Persistir memória
      await saveAgentMemory({
        sessionId,
        agentType,
        organizationId: context.organizationId,
        messages: serializedMessages,
        status: 'Completed',
      });

      return {
        output: lastMessage.content as string,
        sessionId,
        messages: serializedMessages,
      };
    } catch (error: any) {
      logger.error({ err: error, sessionId, agentType }, 'Agent execution failed (with tools)');
      const message =
        error instanceof Error ? error.message : `Falha desconhecida no Agente ${agentType}.`;
      return { error: message, sessionId };
    }
  }

  /**
   * Método de conveniência que decide automaticamente entre executeWithoutTools e executeWithTools.
   */
  static async execute(
    context: AgentExecutionContext,
    config: AgentExecutionConfig,
  ): Promise<AgentExecutionResult> {
    if (config.useTools && config.tools && config.tools.length > 0) {
      return this.executeWithTools(context, config);
    }
    return this.executeWithoutTools(context, config);
  }
}

/**
 * Carrega o perfil de estilo aprendido para o agente.
 * Se não houver tenant/user conhecido, retorna null.
 */
async function loadLearnedStyle(context: AgentExecutionContext): Promise<string | null> {
  const { organizationId, userId } = context;
  if (!organizationId || !userId) return null;
  return getLearningProfile(organizationId, userId);
}
