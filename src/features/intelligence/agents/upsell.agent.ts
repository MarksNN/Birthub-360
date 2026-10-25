import { BaseAgent } from './base.agent.js';
import {
  appendLearnedStyle,
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

export class UpsellAgent extends BaseAgent {
  protected agentType = 'UPSELL';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.3;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Upsell/Cross-sell de Elite — especialista em identificar oportunidades de expansão.

<estrutura_output_final>
### 💰 Oportunidades de Expansão
**Cliente:** [Nome]
**Valor Atual:** R$ X

---

### 🎯 Upsell Recomendado
- [Produto/Serviço]
- Razão: [Por que faz sentido]
- Valor adicional: R$ Y

---

### 📊 Cross-sell
- [Produto complementar]
- Fit: [Alto/Médio/Baixo]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados do cliente:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const { crossSellTool } = await import('../tools/advancedCommercialTools.js');
    const result = await this.runWithTools(inputData, [crossSellTool], sessionId);
    return { upsellPlan: result.output as string | undefined };
  }
}
