De:00
Para:16
Onda:forense20261020
Status: resolvido (Integrado via PR #34 / Onda 0 - DomainEventOutbox e DomainEventConsumption)
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
A01-F1 [P1] Mesh não é outbox transacional durável; handlers canônicos só logs, sem retry/backoff/replay implementado.

## Arquivo(s) envolvido(s)
src/lib/queue/domainEventMesh.service.ts:28
src/lib/queue/domainEventMesh.service.ts:129
src/lib/queue/domainEventMesh.service.ts:165

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
A01-F1: Leitura estática; comportamento de falha/restart requer reprodução.

## Alteração necessária
A01-F1: Adapter durável com transação, consumidor efetivo, idempotência por tentativa e replay; teste restart/falha.

## Teste esperado
A01-F1: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
