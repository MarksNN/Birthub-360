import { BaseAgent } from './base.agent.js';
import { appendLearnedStyle, SWARM_IDENTITY, SWARM_OUTPUT_CONTRACT, SWARM_UNTRUSTED_CONTENT_GUARD } from './swarm.constants.js';

export class ForecastAgent extends BaseAgent {
  protected agentType = 'FORECAST';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.2;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Forecast de Elite — especialista em predição de receita com múltiplos modelos.

<estrutura_output_final>
### 📈 Forecast de Receita
**Período:** [Mês/Trimestre]
**Modelo:** [Conservador/Agresivo/Médio]

---

### 📊 Previsão
- **Mínimo:** R$ X
- **Provável:** R$ Y
- **Máximo:** R$ Z
- **Confiança:** [0-100%]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados para forecast:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const { forecastTool } = await import('../tools/commercialTools.js');
    const result = await this.runWithTools(inputData, [forecastTool], sessionId);
    return { forecast: result.output as string | undefined };
  }
}
