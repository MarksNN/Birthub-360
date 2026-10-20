De:00
Para:12
Onda:forense20261020
Status:aberto
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
F04-04 [P1] Chamadas, reuniões, assinatura e tarefa CRM simuladas como executadas

EXP-01 [P1] Bimodal Live é simulação sem transporte/provedor

EXP-07 [P1] Precisão conversacional não calculada integralmente

## Arquivo(s) envolvido(s)
src/features/ai-voice/server/autonomousSdr.service.ts:65
src/features/ai-voice/server/autonomousSdr.service.ts:139
src/features/proposals/services/proposalAutomation.service.ts:176
src/features/intelligence/agents/tactical/promiseGuardian.agent.ts:186

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
F04-04: Resultado/IDs/URLs são construídos sem provider; Guardião aprova id inexistente fabricando compromisso e task UUID. Strings/logs alegam confirmação externa.

EXP-01: bimodalLiveVoice.service.ts:26-34,103-119,155; sem consumidor produtivo encontrado.

EXP-07: conversationalIntelligence.service.ts:65-94 soma turnos, fixa overlap0/confiança0.95.

## Alteração necessária
F04-04: Retornar simulação explícita ou exigir confirmação da porta real; teste negativo sem provedor nunca deve afirmar sucesso.

EXP-01: Implementar adaptador Live e medições de áudio reais; remover métricas demonstrativas do estado operacional.

EXP-07: Calcular união/interseção de intervalos e distinguir estimativa de medição; validar diarização com ground truth.

## Teste esperado
F04-04: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

EXP-01: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

EXP-07: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
