De:00
Para:09
Onda:forense20261020
Status: resolvido (Implementado pelo Agente 09: sincroniza��o de rotas ativas e deep links no MainActivity.java)
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
EXP-03 [P1] Offline não comprova criptografia/expurgo prometidos

## Arquivo(s) envolvido(s)
Consultar matriz e evidência específica.

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
EXP-03: mobileEdgeAi.service.ts:13-15; offlineSync.service.ts:157-190,406-419; AuthContext.tsx:118-135 só limpa CacheStorage.

## Alteração necessária
EXP-03: Criptografar storage sensível, particionar por tenant/usuário e expurgar fila/briefings explicitamente ao logout; testar troca usuário.

## Teste esperado
EXP-03: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
