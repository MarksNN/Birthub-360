# PLANO DE EXECUÇÃO — ONDA 02: INTELIGÊNCIA COMERCIAL EXÓGENA, GRAFO DE CONTAS E DECISORES, SWARM TÁTICO, MARKET SENSING E WIN-LOSS DEEP AUTOPSY
**Projeto:** BIRTH HUB 360  
**Versão:** 2.0.0 — Data: 2026-10-18  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  
**Branch de Integração:** `integracao/onda-02`  

---

## 1. Visão Geral da Onda 02

A Onda 02 consolida o Birth Hub 360 como uma plataforma autônoma de inteligência comercial B2B, integrando 4 eixos estratégicos sobre a infraestrutura da Onda 01 (DomainEventMesh, RAG Híbrido, Data Flywheel, Proteção de PII e FinOps):

1. **Eixo 6 — Knowledge Graph:** Grafo Semântico de Contas, Empresas, Decisores e Relacionamentos com Multi-Threading para Social Selling.
2. **Eixo 11 — Multi-Agent Tactical Swarm:** 3 Agentes Táticos Especializados com supervisão humana:
   - *Detetive de Conta (Account Detective)*: Dossiê executivo em 10 seções sem alucinação de dados.
   - *Guardião de Promessas (Promise Guardian)*: Extração de compromissos em interações e aprovação com criação de tarefa no CRM.
   - *Advogado do Diabo (Devil's Advocate)*: Contrapeso a previsões hiper-otimistas e auditoria de estagnação.
3. **Eixo 12 — Market Sensing:** Inteligência Exógena e Sinais de Mercado (notícias, vagas, Diário Oficial, M&A, expansões).
4. **Eixo 19 — Win-Loss Deep Autopsy:** Análise forense de negócios ganhos e perdidos em 9 seções estruturadas (A-I), com retroalimentação direta para Playbook, Roleplay e RevOps.

---

## 2. As Cinco Jornadas Integradas E2E

1. **Jornada 1 — Pesquisa de Conta:**
   `CRM -> Grafo de Contas -> Detetive de Conta -> Market Sensing -> Dossiê Executivo -> Social Selling Multi-Threading`
2. **Jornada 2 — Mudança Externa:**
   `Notícia / Regulatório -> Verificação -> Conta Relacionada -> RevOps -> Alerta Comercial -> Abordagem Consultiva`
3. **Jornada 3 — Compromisso Comercial:**
   `VoiceHub / Mobile -> Transcrição -> Guardião de Promessas -> Tarefa de CRM -> Acompanhamento Supervisionado`
4. **Jornada 4 — Deal Perdido:**
   `Bitrix24 -> DEAL_LOST -> Win-Loss Deep Autopsy -> Curadoria Gestor -> Playbook -> Roleplay Simulator`
5. **Jornada 5 — Forecast Preventivo:**
   `CRM -> RevOps -> Advogado do Diabo -> Evidências de Risco -> Recomendação Calibrada de Forecast`

---

## 3. Roteiro Cirúrgico de Execução e Entregas

- **Fase 1: Contratos Canônicos (Agente 18)**
  - `src/shared/contracts/accountKnowledgeGraph.contract.ts`
  - `src/shared/contracts/tacticalSwarm.contract.ts`
  - `src/shared/contracts/marketSignals.contract.ts`
  - `src/shared/contracts/winLossAutopsy.contract.ts`
  - `src/shared/contracts/domainEventMesh.contract.ts` (eventos da Onda 02)
- **Fase 2: Grafo Semântico de Contas & Multi-Threading (Agentes 04, 05, 06)**
  - `src/features/knowledge/services/accountKnowledgeGraph.service.ts`
- **Fase 3: Swarm Tático de Apoio Comercial (Agentes 13, 07)**
  - `src/features/intelligence/agents/tactical/accountDetective.agent.ts`
  - `src/features/intelligence/agents/tactical/promiseGuardian.agent.ts`
  - `src/features/intelligence/agents/tactical/devilsAdvocate.agent.ts`
  - `src/features/intelligence/agents/commercialAgentRegistry.ts`
- **Fase 4: Market Sensing & Sinais Exógenos (Agentes 05, 06, 07)**
  - `src/features/market-intelligence/server/marketSensing.service.ts`
- **Fase 5: Win-Loss Deep Autopsy & Flywheel (Agentes 04, 07, 13)**
  - `src/features/intelligence/services/winLossAutopsy.service.ts`
- **Fase 6: Suíte de Testes Automatizados & E2E (Agente 08)**
  - `tests/unit/contracts/onda02Contracts.test.ts`
  - `tests/unit/knowledge/accountKnowledgeGraph.service.test.ts`
  - `tests/unit/intelligence/tacticalSwarm.test.ts`
  - `tests/unit/tactical/tacticalSwarm.agents.test.ts`
  - `tests/unit/market-intelligence/marketSensing.service.test.ts`
  - `tests/unit/intelligence/winLossAutopsy.service.test.ts`
  - `tests/integration/onda-02/onda02ComprehensiveFlow.integration.test.ts`
  - `tests/integration/onda-02/onda02EndToEndFlow.integration.test.ts`
- **Fase 7: Auditoria Independente do Agente 24**
  - Revisão de conformidade com AGENTS.md, P1-P4, RLS multi-tenant, LGPD e proveniência.
  - Emissão de parecer formal `APROVADO`.
