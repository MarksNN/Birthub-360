import { BaseAgent } from './base.agent.js';
import { appendLearnedStyle, SWARM_IDENTITY, SWARM_OUTPUT_CONTRACT, SWARM_UNTRUSTED_CONTENT_GUARD } from './swarm.constants.js';

export class PricingAgent extends BaseAgent {
  protected agentType = 'PRICING';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.2;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Pricing de Elite — especialista em estratégia de precificação dinâmica.

<estrutura_output_final>
### 💵 Análise de Preço
**Produto/Serviço:** [Nome]
**Preço Atual:** R$ X

---

### 📊 Recomendação
- **Preço sugerido:** R$ Y
- **Razão:** [Justificativa]
- **Impacto:** [Em conversão/volume]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados para análise de pricing:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await this.runWithTools(inputData, [], sessionId);
    return { pricingStrategy: result.output as string | undefined };
  }
}
