De: 07 — Inteligência / Swarm (proprietário de supervisor.agent.ts)
Para: 00 — Coordenador
Onda: 52
Status: resolvido
Prioridade: alto
Bloqueador-ref: LINT-MAIN-SESSIONID (biome noUndeclaredVariables, supervisor.agent.ts:336)
Sprint destino: PR #72 (agente/gha-lint-main)

## Problema

`supervisorNode` montava `correlationId = swarm-${sessionId}-${Date.now()}` (introduzido em cdea0bc9), mas não existe `sessionId` no escopo do node. O `SwarmState` não tem esse campo, e o `sid` só existe dentro de `executeMission`/`executeMissionStream`. Resultado: erro `noUndeclaredVariables` no `biome lint src`, que bloqueia o application gate. Escolher qual identificador usar é uma decisão de comportamento, então foi levada ao proprietário.

## Arquivo(s) envolvido(s)

- `src/features/intelligence/agents/supervisor.agent.ts`
- `src/features/intelligence/agents/__tests__/supervisor.correlationId.test.ts`

## Evidência

Opções avaliadas:
- (a) adicionar `sessionId` ao `SwarmState` e passá-lo no `invoke` (muda o schema do estado e do checkpoint);
- (b) usar `config.configurable.thread_id`, que o LangGraph repassa ao node;
- (c) derivar de `swarmSessionId`/`leadId` (não é a sessão);
- (d) remover o identificador da string.

## Decisão

**Opção (b).** `supervisorNode(state, config?: RunnableConfig)` usa `config.configurable.thread_id`, que vale `${tenant}:${sid}`: o mesmo valor que `executeMission`/`executeMissionStream` usam como chave do checkpoint. Assim o correlationId correlaciona diretamente com o checkpoint, sem mudar o schema do `SwarmState`. Fallback `'no-thread'` quando `thread_id` está ausente, vazio ou não é string (checagem com `typeof`, sem cast; ajuste P3 pedido pelo Agente 24).

Aprovação: Agente 07 (owner review aprovado @ `10ba0e91`).

## Alteração necessária

Implementada no PR #72: helper exportado `buildSwarmCorrelationId(config?, now?)` usado em `supervisorNode`.

## Teste esperado

`supervisor.correlationId.test.ts` cobre `thread_id` presente e o fallback `no-thread` (sem config, sem `configurable`, `thread_id` vazio, `thread_id` não-string).

## Contexto adicional

O node está registrado como `.addNode('supervisor', supervisorNode)`, então o LangGraph passa o `RunnableConfig` como 2º argumento.
