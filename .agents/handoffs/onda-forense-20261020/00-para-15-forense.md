De:00
Para:15
Onda:forense20261020
Status:aberto
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
EXP-06 [P1] Auditoria contínua não é scanner real

## Arquivo(s) envolvido(s)
Consultar matriz e evidência específica.

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
EXP-06: continuousSecurityAudit.service.ts:38-68: simulação428,CVE fixo,SBOM com timestamp.

## Alteração necessária
EXP-06: Consumir scanner/manifesto reais e waivers oficiais; não declarar conformidade por fixture.

## Teste esperado
EXP-06: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
