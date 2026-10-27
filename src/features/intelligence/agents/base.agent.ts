import type { StructuredToolInterface } from '@langchain/core/tools';
import { getTenantId, getUserId } from '../../../lib/async-context.js';
import { saveAgentMemory } from './agentMemory.store.js';
import {
  type AgentExecutionConfig,
  type AgentExecutionContext,
  AgentExecutor,
} from './execution/AgentExecutor.js';

export interface AgentRunResult {
  sessionId?: string;
  error?: string;
}

/**
 * Classe base abstrata para os agentes de IA do Birth Hub 360.
 * P1.1 - Refatorada para usar AgentExecutor unificado.
 *
 * Centraliza: delegação para AgentExecutor, que aplica gates de segurança,
 * gerencia checkpointer, fallback, memory e logging de forma unificada.
 *
 * Subclasses devem implementar:
 * - `agentType`: identificador persistido no AgentMemory (ex: 'BDR', 'CRM')
 * - `buildSystemPrompt(learnedStyle)`: texto do SystemMessage específico do agente
 * - `buildHumanMessage(input)`: HumanMessage de entrada para o grafo
 * - `modelName` (opcional): nome lógico do modelo no gateway (padrão: 'local-llama3-fast')
 * - `temperature` (opcional): temperatura de geração (padrão: 0.4)
 */
export abstract class BaseAgent {
  protected abstract agentType: string;
  protected modelName: string = 'local-llama3-fast';
  protected temperature: number = 0.4;
  // Nome real do modelo Groq usado por runWithTools (namespace diferente de `modelName`, que é
  // o nome lógico resolvido pelo gateway.ts em `run()`) — runWithTools fala direto com
  // LangChain/Groq via bindTools, que o gateway não transporta.
  protected toolsModelName: string = 'openai/gpt-oss-20b';

  protected abstract buildSystemPrompt(learnedStyle: string | null): string;
  protected abstract buildHumanMessage(input: string): string;

  /**
   * Persiste o histórico de mensagens da sessão no AgentMemory.
   */
  protected async updateMemory(sessionId: string, messages: unknown): Promise<void> {
    await saveAgentMemory({
      sessionId,
      agentType: this.agentType,
      organizationId: getTenantId(),
      messages,
    });
  }

  /**
   * Executa o agente sem ferramentas (turno único).
   * P1.1 - Agora delega para AgentExecutor.executeWithoutTools.
   * Gates (LGPD, budget, checkpointer) são aplicados automaticamente.
   */
  async run(
    inputData: string,
    sessionId?: string,
  ): Promise<AgentRunResult & Record<string, unknown>> {
    const sid = sessionId || `session-${this.agentType.toLowerCase()}-${Date.now()}`;
    const organizationId = getTenantId();
    const userId = getUserId();

    const context: AgentExecutionContext = {
      agentType: this.agentType,
      sessionId: sid,
      organizationId,
      userId,
      inputData,
      modelName: this.modelName,
      temperature: this.temperature,
    };

    const config: AgentExecutionConfig = {
      useTools: false,
      buildSystemPrompt: this.buildSystemPrompt,
      buildHumanMessage: this.buildHumanMessage,
    };

    try {
      const result = await AgentExecutor.executeWithoutTools(context, config);
      return { ...result, sessionId: sid };
    } catch (error: any) {
      // AgentExecutor já registra falha e retorna {error}, mas precisamos garantir
      // que a exceção não propague (contrato original de BaseAgent).
      const message =
        error instanceof Error ? error.message : `Falha desconhecida no Agente ${this.agentType}.`;
      return { error: message, sessionId: sid };
    }
  }

  /**
   * Executa o agente com ferramentas (ReAct loop).
   * P1.1 - Agora delega para AgentExecutor.executeWithTools.
   * Gates (LGPD, budget, checkpointer) são aplicados automaticamente.
   */
  protected async runWithTools(
    inputData: string,
    tools: StructuredToolInterface[],
    sessionId?: string,
  ): Promise<AgentRunResult & Record<string, unknown>> {
    const sid = sessionId || `session-${this.agentType.toLowerCase()}-${Date.now()}`;
    const organizationId = getTenantId();
    const userId = getUserId();

    const context: AgentExecutionContext = {
      agentType: this.agentType,
      sessionId: sid,
      organizationId,
      userId,
      inputData,
      toolsModelName: this.toolsModelName,
    };

    const config: AgentExecutionConfig = {
      useTools: true,
      tools,
      buildSystemPrompt: this.buildSystemPrompt,
      buildHumanMessage: this.buildHumanMessage,
    };

    try {
      const result = await AgentExecutor.executeWithTools(context, config);
      return { ...result, sessionId: sid };
    } catch (error: any) {
      // AgentExecutor já registra falha e retorna {error}, mas precisamos garantir
      // que a exceção não propague (contrato original de BaseAgent).
      const message =
        error instanceof Error ? error.message : `Falha desconhecida no Agente ${this.agentType}.`;
      return { error: message, sessionId: sid };
    }
  }
}
