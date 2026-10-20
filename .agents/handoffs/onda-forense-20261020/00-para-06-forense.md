De:00
Para:06
Onda:forense20261020
Status:aberto
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
GATE-02 [P1] Typecheck falha na revisão82f8

## Arquivo(s) envolvido(s)
src/features/integrations/bitrix/services/bitrixEventMeshBridge.service.ts:96
src/features/integrations/bitrix/services/bitrixEventMeshBridge.service.ts:281

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
GATE-02: Execução isolada npm run typecheck: exit2,TS2352 nos casts para WhatsAppMessageEventPayload e BitrixWebhookEventPayload.

## Alteração necessária
GATE-02: Validar payload contra contrato antes da conversão e executar typecheck/testes de erro e evento válido.

## Teste esperado
GATE-02: npm run typecheck exit0 na revisão de destino e regressão de payload inválido.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
