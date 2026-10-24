import { BaseAgent } from './base.agent.js';
import { appendLearnedStyle, SWARM_IDENTITY, SWARM_OUTPUT_CONTRACT, SWARM_UNTRUSTED_CONTENT_GUARD } from './swarm.constants.js';

export class ChurnPreventionAgent extends BaseAgent {
  protected agentType = 'CHURN_PREVENTION';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.3;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Prevenção de Churn de Elite — especialista em identificar e agir sobre clientes em risco.

<estrutura_output_final>
### 🚨 Alerta de Churn
**Cliente:** [Nome]
**Risco:** [Alto/Médio/Baixo]
**Score:** [0-100]

---

### 🔍 Sinais de Alerta
- [Sinal 1]
- [Sinal 2]
- [Sinal 3]

---

### 💊 Ações Imediatas
1. [Ação prioritária]
2. [Ação secundária]
3. [Ação de follow-up]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados do cliente para análise de churn:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const { getLeadContextTool } = await import('../tools/crmTools.js');
    const { churnAnalysisTool } = await import('../tools/advancedCommercialTools.js');
    const result = await this.runWithTools(inputData, [getLeadContextTool, churnAnalysisTool], sessionId);
    return { churnPlan: result.output as string | undefined };
  }
}
