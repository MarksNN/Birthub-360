De:00
Para:01
Onda:forense20261020
Status: resolvido (Integrado via PR #18 / Onda 0 - AccountGraphNode, WinLossAutopsyReport e migra��o Prisma)
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
F04-03 [P1] Serviços novos guardam estado somente em memória

## Arquivo(s) envolvido(s)
src/features/knowledge/services/accountKnowledgeGraph.service.ts:18
src/features/market-intelligence/server/marketSensing.service.ts:37
src/features/intelligence/services/winLossAutopsy.service.ts:16
src/features/gamification/services/behavioralEngine.service.ts:14
src/features/cadence/services/selfDrivingCrm.service.ts:18

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
F04-03: Map/Set são os armazenamentos reais; não há Prisma/porta de repositório nesses serviços. Não provam persistência, múltiplas instâncias ou idempotência durável.

## Alteração necessária
F04-03: Handoff de contrato persistente ao01; adaptar sob propriedade dos domínios e testar reinício/concorrência/tenants.

## Teste esperado
F04-03: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
