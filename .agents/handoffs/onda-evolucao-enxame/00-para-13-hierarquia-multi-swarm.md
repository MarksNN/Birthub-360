De: Agente 00 — Coordenador Global
Para: Agentes 13 (Governança Enxame) & 07 (IA e Automações)
Onda: Evolução Enxame IA
Status: resolvido
Prioridade: normal
Bloqueador-ref: N/A
Sprint destino: Sprint 2

## Problema
O `SupervisorAgent` atualmente possui roteamento estático entre apenas 5 especialistas centrais (`sdr`, `bdr`, `closer`, `crm`, `ops`). Os 379 agentes do catálogo amplo não participam do grafo orquestrado pelo supervisor de forma dinâmica.

## Arquivo(s) envolvido(s)
- `src/features/intelligence/agents/supervisor.agent.ts`
- `src/features/intelligence/agents/swarm.constants.ts`
- `src/features/intelligence/services/swarmScheduler.service.ts`

## Evidência
Definição de `SwarmAgentKey = 'sdr' | 'bdr' | 'closer' | 'crm' | 'ops'` em `supervisor.agent.ts`.

## Alteração necessária
1. Modularizar o Supervisor com suporte a Sub-Swarms temáticos (Comercial, Marketing, Suporte/CS, Operações).
2. Adicionar nó de roteamento semântico que selecione dinamicamente especialistas do catálogo com base na similaridade de embedding da missão.
3. Preservar rigorosamente o limite de saltos `MAX_STEPS = 5` e os gates LGPD / FinOps de execução.

## Teste esperado
- Testes unitários de decisão estruturada do supervisor com novos sub-swarms.
- Testes de concorrência e ausência de loops infinitos.

## Resolução
- **Status:** **RESOLVIDO E VALIDADO**
- **Data:** 2026-11-01
- **Executores:** Agente 13 (Governança Enxame) & Agente 07 (IA e Automações)
- **Branch:** `agente/13-multi-swarm-hierarchy`

### Ações Executadas:
1. **Configuração de Sub-Swarms e Roteamento Semântico (`subSwarms.config.ts`):**
   - Implementado roteador modular com 4 Sub-Swarms temáticos: Comercial (`commercial`), Marketing (`marketing`), Customer Success (`customer_success`) e Operações (`operations`).
   - Algoritmo de roteamento semântico dinâmico (`semanticRouteMission` e `matchCatalogAgents`) que mapeia intenções da missão contra os 379 agentes canônicos do catálogo (`SWARM_CATALOG_TOTAL_AGENTS = 379`).
2. **Hardening do Grafo e StateGraph (`supervisor.agent.ts` e `swarm.constants.ts`):**
   - Teto rígido `SWARM_MAX_STEPS = 5` exportado como constante canônica de governança (Agente 13 / FinOps) e enforced em `supervisorNode` e `workflow`.
   - Nó `semanticRouterNode` adicionado ao fluxo do LangGraph (`__start__ -> semanticRouter -> supervisor`), injetando `catalogMatches` e ativando o Sub-Swarm correto.
   - Enriquecimento do `supervisorDecisionSchema` com suporte opcional a `subSwarm` e `catalogAgentCode`.
   - `fallbackDecision` e `enforceLeadGuard` atualizados com direcionamento temático e prevenção de loops.
3. **Evidências de Teste e Qualidade:**
   - `src/features/intelligence/agents/__tests__/subSwarms.test.ts`: **11/11 testes PASS**.
   - `src/features/intelligence/agents/__tests__/supervisor.decision.test.ts`: **25/25 testes PASS**.
   - Suíte de Agentes de Inteligência (`src/features/intelligence/agents/__tests__/`): **15/15 arquivos, 102/102 testes PASS**.
   - Typecheck TypeScript (`npx tsc --noEmit`): **0 erros (PASS)**.
   - Biome check (`npx @biomejs/biome check`): **0 erros, 0 warnings (PASS)**.
