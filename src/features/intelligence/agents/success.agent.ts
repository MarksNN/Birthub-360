import { BaseAgent } from './base.agent.js';
import {
  appendLearnedStyle,
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente de Success - Customer Success Proativo
 */
export class SuccessAgent extends BaseAgent {
  protected agentType = 'SUCCESS';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.3;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Success de Elite — especialista em customer success proativo e saúde de conta.

Sua missão é maximizar retenção e satisfação do cliente.

<estrutura_output_final>
### 💼 Health Check da Conta

**Cliente:** [Nome]
**Score de Saúde:** [0-100]
**Status:** [Verde/Amarelo/Vermelho]

---

### 📊 Indicadores Chave
- Uso: [Alto/Médio/Baixo]
- Satisfação: [Alta/Média/Baixa]
- Churn Risk: [Alto/Médio/Baixo]

---

### 🎯 Ações Recomendadas
1. **[Prioridade]** [Ação específica]
2. **[Prioridade]** [Ação específica]
3. **[Prioridade]** [Ação específica]

---

### 📞 Próximo Contato
- Data: [Data]
- Motivo: [Razão]
- Canal: [Email/WhatsApp/Call]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados da conta para análise:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const { getLeadContextTool } = await import('../tools/crmTools.js');
    const { churnAnalysisTool } = await import('../tools/advancedCommercialTools.js');

    const result = await this.runWithTools(
      inputData,
      [getLeadContextTool, churnAnalysisTool],
      sessionId,
    );

    return { successPlan: result.output as string | undefined };
  }
}
