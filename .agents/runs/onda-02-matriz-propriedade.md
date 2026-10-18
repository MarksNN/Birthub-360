# MATRIZ DE PROPRIEDADE E CONCORRÊNCIA — ONDA 02
**Projeto:** BIRTH HUB 360  
**Onda:** `02 — Inteligência Comercial Exógena, Grafo de Contas e Decisores, Swarm Tático, Market Sensing e Win-Loss Deep Autopsy`  
**Data:** 2026-10-18  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  
**Branch de Integração:** `integracao/onda-02`  

---

## 1. Roster Oficial de Especialistas na Bateria Principal da Onda 02

| Agente | Responsabilidade Principal | Arquivos e Diretórios sob Propriedade Exclusiva |
|---|---|---|
| **00 — Coordenador** | Orquestração global, integração, baselines e governança | `.agents/plans/**`, `.agents/runs/**`, gates e merges |
| **04 — CRM e BI** | Grafo de contas, indicadores comerciais e Win-Loss | `src/features/knowledge/services/accountKnowledgeGraph.service.ts`, `src/features/intelligence/services/winLossAutopsy.service.ts` |
| **05 — Prospecção** | Inteligência de empresas, decisores e enriquecimento | `src/features/contacts/services/**`, `src/features/prospecting/**` |
| **06 — Integrações e Bitrix**| Extração de histórico e sincronização com Bitrix24 | `src/features/integrations/bitrix/**` (consumidores de eventos) |
| **07 — IA e Automações** | RAG híbrido, extração contextual e Flywheel | `src/features/intelligence/services/**`, `src/features/playbook/services/**` |
| **08 — QA e Release** | Suíte de testes automatizados, CI/CD e gates | `tests/unit/**`, `tests/integration/onda-02/**` |
| **13 — Swarm Autônomo** | Agentes táticos (Detetive, Guardião, Advogado do Diabo) | `src/features/intelligence/agents/tactical/**`, `src/features/intelligence/agents/commercialAgentRegistry.ts` |
| **15 — Segurança Aplicada** | Minimização de PII, proveniência e isolamento multi-tenant | Tenancy guards, filtros de hashing e anonimização |
| **18 — Contratos e API** | Contratos compartilhados e schemas de eventos | `src/shared/contracts/accountKnowledgeGraph.contract.ts`, `src/shared/contracts/tacticalSwarm.contract.ts`, `src/shared/contracts/marketSignals.contract.ts`, `src/shared/contracts/winLossAutopsy.contract.ts`, `src/shared/contracts/domainEventMesh.contract.ts` |
| **24 — Revisão Independente**| Auditoria autônoma do commit final e parecer formal | `.agents/reviews/**` |

---

## 2. Regras Estritas de Concorrência e Isolamento

1. **Propriedade Disjunta:** Nenhum agente edita arquivos atribuídos a outro especialista sem abertura de handoff explícito em `.agents/handoffs/`.
2. **Schema Prisma:** Intocado na Onda 02. Nenhuma migration de schema foi necessária; persistência e grafos lógicos usam estruturas existentes e repositórios tipados.
3. **Queue e Event Mesh:** O `DomainEventMesh` atua como barramento desacoplado. Agentes publicam eventos canônicos (`MARKET_SIGNAL_DETECTED`, `PROMISE_COMMITMENT_DETECTED`, `DEVILS_ADVOCATE_ALERT`, `WIN_LOSS_AUTOPSY_COMPLETED`, `GRAPH_RELATIONSHIP_UPDATED`) sem conflito de concorrência no worker.
4. **Gates Obrigatórios:** Toda integração parcial passou por `tsc --noEmit`, `npm run lint` e suíte de testes antes do merge no branch `integracao/onda-02`.
