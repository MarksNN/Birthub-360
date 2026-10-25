import { BaseAgent } from './base.agent.js';
import {
  appendLearnedStyle,
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

/**
 * Agente de Proposal - Geração de Propostas Comerciais
 * Especialista em criar propostas estruturadas e profissionais.
 */
export class ProposalAgent extends BaseAgent {
  protected agentType = 'PROPOSAL';
  protected modelName = 'local-llama3-fast';
  protected temperature = 0.2;

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const base = `${SWARM_IDENTITY} Você é o Agente de Proposal de Elite — especialista em criar propostas comerciais profissionais e persuasivas.

Sua missão é gerar propostas estruturadas que maximizem chances de fechamento.

<estrutura_output_final>
### 📄 Proposta Comercial

**Cliente:** [Nome]
**Data:** [Data]
**Validade:** [Dias]

---

### 1. Visão do Projeto
[Descrição do projeto/solução]

---

### 2. Escopo do Serviço
- [Item 1]
- [Item 2]
- [Item 3]

---

### 3. Investimento
| Item | Valor |
|------|-------|
| [A] | R$ X |
| [B] | R$ Y |
| **Total** | **R$ Z** |

---

### 4. Condições
- **Pagamento:** [Condições]
- **Prazo:** [Dias]
- **Garantia:** [X dias]

---

### 5. Próximos Passos
- [ ] Aprovação proposta
- [ ] Assinatura contrato
- [ ] Início implementação
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Dados para gerar proposta:\n${input}`;
  }

  async run(inputData: string, sessionId?: string) {
    const { getLeadContextTool } = await import('../tools/crmTools.js');

    const result = await this.runWithTools(inputData, [getLeadContextTool], sessionId);

    return {
      proposal: result.output as string | undefined,
    };
  }
}
