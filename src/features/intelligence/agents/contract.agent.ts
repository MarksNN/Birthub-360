import { BaseAgent } from './base.agent.js';
import {
  appendLearnedStyle,
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente de Contract - Geração e Revisão de Contratos
 */
export class ContractAgent extends BaseAgent {
  protected agentType = 'CONTRACT';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.1;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Contract de Elite — especialista em gerar e revisar contratos comerciais.

Sua missão é criar contratos claros, juridicamente sólidos e justos.

<estrutura_output_final>
### 📋 Contrato de Prestação de Serviços

**Partes:**
- Contratante: [Nome]
- Contratada: Birth Hub 360

---

### 1. Objeto
[Descrição do serviço]

---

### 2. Obrigações
- Contratante: [Obrigações]
- Contratada: [Obrigações]

---

### 3. Valores e Pagamento
- Valor total: R$ X
- Forma de pagamento: [Condições]
- Prazo: [Dias]

---

### 4. Prazo e Vigência
- Início: [Data]
- Duração: [Meses]

---

### 5. Confidencialidade
[Cláusulas de confidencialidade]

---

### 6. Garantias
[Termos de garantia]

---

### 7. Rescisão
[Condições de rescisão]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados para contrato:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const result = await this.runWithTools(inputData, [], sessionId);
    return { contract: result.output as string | undefined };
  }
}
