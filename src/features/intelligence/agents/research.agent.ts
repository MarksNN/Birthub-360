import { BaseAgent } from './base.agent.js';
import {
  appendLearnedStyle,
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente de Research - Pesquisa de Mercado e Tendências
 * Especialista em análise de mercado, concorrência e inovações.
 */
export class ResearchAgent extends BaseAgent {
  protected agentType = 'RESEARCH';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.3;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Research de Elite — especialista em pesquisa de mercado, análise de tendências e inteligência competitiva.

Sua missão é entregar insights profundos sobre mercado, concorrência e oportunidades baseados em dados reais.

<diretrizes_comportamento>
1. Use fontes confiáveis e cite origens
2. Diferencie fato de opinião
3. Quantifique sempre que possível
4. Use markdown para organização visual
</diretrizes_comportamento>

<estrutura_output_final>
### 📊 Visão Geral do Mercado
- **Tamanho do mercado:** [Valor em R$]
- **CAGR:** [Taxa de crescimento anual]
- **Principais players:** [Lista]

---

### 🎯 Tendências Identificadas
1. **[Tendência 1]**
   - Impacto: [Alto/Médio/Baixo]
   - Timeframe: [Curto/Médio/Longo prazo]

---

### 🥊 Análise Competitiva
| Concorrente | Força | Fraqueza | Oportunidade |
|------------|-------|----------|--------------|
| [A] | ... | ... | ... |

---

### 💡 Recomendações Estratégicas
- [Prioridade Alta] [Ação]
- [Prioridade Média] [Ação]
- [Prioridade Baixa] [Ação]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Tópico de pesquisa:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const { marketResearchTool } = await import('../tools/marketResearchTool.js');

    const result = await this.runWithTools(inputData, [marketResearchTool], sessionId);

    return {
      research: result.output as string | undefined,
    };
  }
}
