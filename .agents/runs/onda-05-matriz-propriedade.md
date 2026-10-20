# MATRIZ DE PROPRIEDADE E CONCORRÊNCIA — ONDA 05
## INTELIGÊNCIA CONVERSACIONAL, BEM-ESTAR OPERACIONAL E GOVERNANÇA

**Data:** 19 de Outubro de 2026  
**Projeto:** BIRTH HUB 360°  
**Branch de Integração:** `integracao/onda-05`  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  
**Teto de Concorrência:** Até 8 especialistas simultâneos com isolamento estrito.

---

### 1. Matriz de Propriedade Exclusiva de Arquivos

| Especialista | Domínio | Arquivos e Diretórios Sob Propriedade Exclusiva |
|---|---|---|
| **Agente 18 — Contratos e API** | Contratos Canônicos | `src/shared/contracts/conversationalCoaching.contract.ts`<br>`src/shared/contracts/workloadWellbeing.contract.ts`<br>`src/shared/contracts/multimodalRoleplay.contract.ts`<br>`src/shared/contracts/predictiveRevenueOracle.contract.ts`<br>`src/shared/contracts/multiRegionResilience.contract.ts`<br>`src/shared/contracts/continuousSecurityAudit.contract.ts`<br>`src/shared/contracts/domainEventMesh.contract.ts` |
| **Agente 12 — Voz e Telefonia** | Inteligência Conversacional & Métricas Acústicas | `src/features/ai-voice/server/conversationalIntelligence.service.ts`<br>`src/features/ai-voice/server/bimodalLiveVoice.service.ts` |
| **Agente 02 — Produto e UX** | Bem-Estar, Pausas e Experiência Voluntária | `src/features/calendar/services/workloadWellbeing.service.ts`<br>`src/features/calendar/components/` |
| **Agente 07 — IA e Automações** | Coaching Metodológico, Roleplay & Microtreinamentos | `src/features/roleplay/services/multimodalRoleplaySimulator.service.ts`<br>`src/features/intelligence/` |
| **Agente 04 — CRM e BI** | Métricas Comerciais e Agenda Operacional | `src/features/commercial-intelligence/services/predictiveRevenueOracle.service.ts`<br>`src/features/calendar/routes/` |
| **Agente 13 — Swarm Autônomo** | Orquestração de Recomendações e Assistentes | `src/features/intelligence/agents/`<br>`src/features/intelligence/services/swarmScheduler.service.ts` |
| **Agente 15 — Segurança Aplicada** | Proteção de Dados, Retenção e Waivers | `src/lib/security/services/continuousSecurityAudit.service.ts`<br>`src/lib/security/` |
| **Agente 16 — Runtime e Escala** | Multi-Região, Failover e Filas | `src/lib/runtime/services/multiRegionResilience.service.ts` |
| **Agente 08 — QA e Release** | Harness, Gates e Testes Integrados | `tests/unit/contracts/onda05Contracts.test.ts`<br>`tests/unit/ai-voice/`<br>`tests/unit/calendar/`<br>`tests/integration/onda05ComprehensiveFlow.integration.test.ts` |
| **Agente 21 — LGPD e Privacidade** | Governança de Dados do Trabalhador e Anti-Vigilância | Políticas de Minimização, Avaliação de Finalidade e Anti-Punição |
| **Agente 24 — Auditoria Independente** | Revisão Isenta e Pareceres Formais | `.agents/reviews/24-onda-05-revisao-independente.md`<br>`.agents/reviews/checklist-onda-05.html`<br>`.agents/reviews/onda-05-evidencias.json` |

---

### 2. Regras Inegociáveis de Isolamento e Não-Interferência

1. **Working Trees Disjuntos:** Nenhum especialista compartilha checkout ou working tree simultaneamente.
2. **Sem Conflito de Schema:** Nenhum especialista desta onda tocou em `prisma/schema.prisma` ou criou migrações diretas.
3. **Trava de Dependências:** `package.json` e lockfile permaneceram intocados sem adição de pacotes desnecessários.
4. **Gates Sucessivos:** Validação de gates a cada integração (typecheck, lint, arquitetura, OpenAPI drift, build e vitest).
5. **Auditoria Prévia do Agente 24:** Nenhuma entrega é integrada definitivamente sem o parecer APROVADO do Agente 24.
