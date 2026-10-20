De:00
Para:17
Onda:forense20261020
Status:aberto
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
F04-05 [P1] Estagnação lê leads sem isolamento organizacional no armazenamento

## Arquivo(s) envolvido(s)
src/features/cadence/services/selfDrivingCrm.service.ts:21
src/features/cadence/services/selfDrivingCrm.service.ts:203
src/features/cadence/services/selfDrivingCrm.service.ts:385

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
F04-05: seedLead não recebe organizationId; chave leadId e detectStagnatedLeads percorre todos os valores etiquetando-os com tenant recebido. Serviço não conectado ao runtime na investigação.

## Alteração necessária
F04-05: Fonte canônica tenant-scoped e teste dois tenants com leads distintos/IDs iguais; não expor até verificação.

## Teste esperado
F04-05: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
