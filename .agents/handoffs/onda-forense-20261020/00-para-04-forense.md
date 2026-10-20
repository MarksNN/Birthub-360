De:00
Para:04
Onda:forense20261020
Status:aberto
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
F04-01 [P1] Forecast e backtest rotulados calibrados usam constantes

## Arquivo(s) envolvido(s)
src/features/commercial-intelligence/services/predictiveRevenueOracle.service.ts:20
src/features/commercial-intelligence/services/predictiveRevenueOracle.service.ts:205
src/features/predictability/components/PredictiveRevenueCockpit.tsx:42

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
F04-01: 145000/485000/980000 e MAPE8.4/samples142/calibrated=true não derivam de dados. UI mantém projeções e recomendações locais; approve só setState e toast. predictiveRevenueOracle.service.ts:20-139,218-230; PredictiveRevenueCockpit.tsx:42-146.

## Alteração necessária
F04-01: Ligar dados reais ao motor, calcular backtest em histórico versionado e impedir métrica fabricada; testar conjunto conhecido e reload.

## Teste esperado
F04-01: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
