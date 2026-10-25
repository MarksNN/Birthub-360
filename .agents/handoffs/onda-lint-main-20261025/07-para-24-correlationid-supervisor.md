De: 07 — IA e Automações (dono de src/features/intelligence)
Para: 24 — Revisão Independente (cc: GHA, 00/Marks)
Onda: lint-main-20261025
Status: resolvido
Prioridade: alto
Bloqueador-ref: PR #72 (agente/gha-lint-main) — lint vermelho na main
Sprint destino: atual

## Problema
`supervisorNode` em `src/features/intelligence/agents/supervisor.agent.ts` (l.336 na main 6d63eb39) montava
`correlationId = \`swarm-${sessionId}-${Date.now()}\`` sem `sessionId` em escopo: ReferenceError em runtime e biome lint vermelho.

## Arquivo(s) envolvido(s)
- src/features/intelligence/agents/supervisor.agent.ts
- src/lib/ai/gateway/chat-model.ts (import do logger, mesmo PR)

## Evidência
- PR #72 @ 10ba0e91: `supervisorNode(state: SwarmStateType, config?: RunnableConfig)`;
  `threadId = (config?.configurable?.thread_id as string | undefined) ?? 'no-thread'`;
  `correlationId = \`swarm-${threadId}-${Date.now()}\``.
- Node registrado em `addNode('supervisor', supervisorNode)`; o LangGraph repassa o RunnableConfig como 2º argumento.
- `executeMission`/`executeMissionStream` montam `configurable.thread_id = \`${tenant}:${sid}\``.

## Alteração necessária (decisão do dono — opção b, ACEITA)
Usar `config.configurable.thread_id` como base do correlationId.
Motivos: casa com o thread_id do checkpoint (já prefixado por tenant, sem mistura entre tenants);
não altera o schema do SwarmState nem o checkpoint; uso exclusivo para rastreio/logs.
Opções descartadas: (c) leadId — opcional e `swarmSessionId` é por especialista; (d) remover — perde correlação.
Fallback 'no-thread' só ocorre em invocações fora de executeMission (ex.: testes diretos).

## Teste esperado
- Lint e tsc verdes no CI (application gate hoje SKIPPED por trivy da main).
- Recomendado (follow-up 07): trocar o `as string` por checagem `typeof thread_id === 'string'`
  e teste unitário do supervisorNode com config (correlationId contém `tenant:sid`) e sem config ('no-thread').

## Contexto adicional
Parecer de dono do 07 sobre os arquivos de IA do PR #72 enviado ao GHA em 2026-10-25 11:45 (UTC-3).
Merge segue condicionado a CI verde, parecer do 24 e merge do #71. Este registro não é falso sucesso:
a validação em CI ainda não ocorreu.

## Resolução
Decisão registrada pelo 07 em 2026-10-25. Implementação no PR #72 (GHA).
