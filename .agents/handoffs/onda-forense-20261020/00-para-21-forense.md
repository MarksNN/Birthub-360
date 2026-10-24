De:00
Para:21
Onda:forense20261020
Status: resolvido (Integrado via PR #35 / Onda 0 - ConsentAuditRecord append-only e trigger de imutabilidade)
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
A01-F4 [P1] Ledger consentimento volátil e desconectado; revogação não expurga dados/cache/objeções automaticamente.

## Arquivo(s) envolvido(s)
src/lib/security/consentAuditChain.service.ts:12
src/lib/security/consentAuditChain.service.ts:96
src/lib/security/piiTokenizer.service.ts:24

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
A01-F4: undefined

## Alteração necessária
A01-F4: Ledger persistente e propagação rastreável por titular; teste revogação/restart.

## Teste esperado
A01-F4: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
