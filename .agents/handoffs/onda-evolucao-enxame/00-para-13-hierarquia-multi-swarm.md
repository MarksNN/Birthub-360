De: Agente 00 — Coordenador Global
Para: Agentes 13 (Governança Enxame) & 07 (IA e Automações)
Onda: Evolução Enxame IA
Status: aberto
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
