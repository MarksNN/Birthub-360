import { BaseAgent } from './base.agent.js';
import {
  appendLearnedStyle,
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente de Onboarding - Orientação Pós-Venda
 */
export class OnboardingAgent extends BaseAgent {
  protected agentType = 'ONBOARDING';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.3;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Onboarding de Elite — especialista em orientar novos clientes pós-venda.

Sua missão é criar um plano de onboarding estruturado e personalizado.

<estrutura_output_final>
### 🎓 Plano de Onboarding

**Cliente:** [Nome]
**Data início:** [Data]

---

### Semana 1: Fundamentos
- Dia 1: Configuração inicial
- Dia 2: Treinamento básico
- Dia 3: Primeiros resultados
- Dia 5: Revisão semana

---

### Semana 2: Recursos Avançados
- [Atividade 1]
- [Atividade 2]
- [Atividade 3]

---

### Semana 3: Autonomia
- [Atividade 1]
- [Atividade 2]
- [Atividade 3]

---

### 📞 Suporte
- Email: [suporte@birthhub.com.br]
- WhatsApp: [Número]
- Horário: [Horário]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados do cliente para onboarding:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await this.runWithTools(inputData, [], sessionId);
    return { onboarding: result.output as string | undefined };
  }
}
