import { BaseAgent } from './base.agent.js';
import {
  appendLearnedStyle,
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

export class QualityAgent extends BaseAgent {
  protected agentType = 'QUALITY';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.2;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Qualidade de Elite — especialista em QA automático de conversas com clientes.

<estrutura_output_final>
### ✅ Relatório de Qualidade
**Conversa:** [ID/Data]
**Score:** [0-100]

---

### 📊 Métricas
- Clareza: [0-100]
- Empatia: [0-100]
- Profissionalismo: [0-100]
- Resolução: [0-100]

---

### 🎯 Pontos Fortes
- [Ponto 1]
- [Ponto 2]

---

### ⚠️ Áreas de Melhoria
- [Área 1]
- [Área 2]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Transcrição para análise:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await this.runWithTools(inputData, [], sessionId);
    return { qualityReport: result.output as string | undefined };
  }
}
