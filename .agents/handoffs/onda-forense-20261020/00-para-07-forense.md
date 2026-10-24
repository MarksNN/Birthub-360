De:00
Para:07
Onda:forense20261020
Status: resolvido (Implementado pelo Agente 07: Dynamic Model Routing, fallback fail-safe e integra��o com gateway; parecer APROVADO do Agente 24)
Prioridade:alto
Bloqueador-ref:auditoria-real-ondas00-05
Sprint destino:a definir pelo00

## Problema
A01-F2 [P1] Promoção afirma sucesso mesmo com erro de escrita, e retração não remove matriz persistida.

A01-F3 [P1] Cache/cascade são helpers sem consumidores runtime encontrados; cache exato em Map contradiz Redis/semântica.

A01-F5 [P1] Flywheel promove por único desfecho fornecido e confiança fixa; não implementa evidência estatística nem nexo causal.

F04-02 [P1] Rotas táticas declaradas no catálogo não localizadas

F04-06 [P1] Fonte e confiança são atribuídas sem verificação externa

EXP-02 [P1] Arena concede XP e avaliações apenas no frontend

EXP-08 [P1] Revisão Shadow não confere proprietário da cópia

EXP-09 [P1] Anonimização por contagem de registros não garante cinco pessoas

## Arquivo(s) envolvido(s)
src/features/playbook/services/curatedObjection.service.ts:74
src/features/playbook/services/curatedObjection.service.ts:105
src/features/playbook/services/curatedObjection.service.ts:125
src/lib/ai/cache/semanticCache.service.ts:10
src/lib/ai/gateway/model-cascade.ts:88
src/features/intelligence/services/commercialLearningFlywheel.service.ts
src/features/intelligence/agents/commercialAgentRegistry.ts:446
src/features/intelligence/routes/agent.routes.ts
src/features/intelligence/agents/tactical/accountDetective.agent.ts:71
src/features/market-intelligence/server/marketSensing.service.ts:155
src/features/intelligence/agents/tactical/devilsAdvocate.agent.ts:33

## Evidência
Base:82f848a39a7a45212956c1e949a8df28d8f946c9. Inspeção estática salvo comandos explicitamente reproduzidos; produto/API não presumidos testados.
A01-F2: undefined

A01-F3: undefined

A01-F5: undefined

F04-02: Busca por account-detective/promise-guardian/devils-advocate em src só encontrou catálogo/tipos; símbolos de classes só em definição. status REAL_EM_PRODUCAO não demonstra runtime.

F04-06: Input do chamador é rotulado Receita Federal/verificado; notícias ganham high; Advogado usa dias/probabilidade default como diagnóstico. Não há fetch de fonte nesses serviços.

EXP-02: WarRoomArenaView.tsx:127-176 contém Math.random/state/toasts, sem API; serviço paralelo em Map.

EXP-08: shadowCopywriting.service.ts:233-245 checa organizationId mas ignora sellerId. Dois defeitos de autorização/agregação reproduzidos pelo24 no elo serviço; ver24-reproduction.json. Sem demonstração de exposição viaAPI produtiva.

EXP-09: workloadWellbeing.service.ts:343-373 usa metricsList.length e não filtra tenant.

## Alteração necessária
A01-F2: Persistir antes de promover; erro observável; vincular ID da matriz e propagar retração; teste falha Prisma e reload.

A01-F3: Integrar ao gateway ou corrigir escopo documental; teste chamadas reais e isolamento.

A01-F5: Validar origem de desfecho e separar atribuição heurística de inferência causal, sem divulgar confiança calibrada.

F04-02: Registrar rotas autorizadas e entradas de eventos ou corrigir status declarado; provar chamada do usuário e falha.

F04-06: Guardar proveniência verificável e desconhecido para ausência de fonte; teste entrada incompleta sem fabricar fato.

EXP-02: Scoring autorizado e XP idempotente no backend, UI consulta resultado persistido.

EXP-08: Exigir identidade autenticada e ownership; provar negação entre vendedores do mesmo tenant.

EXP-09: Filtrar tenant e deduplicar pessoas, aplicar permissão no servidor e testar reidentificação.

## Teste esperado
A01-F2: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

A01-F3: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

A01-F5: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

F04-02: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

F04-06: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

EXP-02: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

EXP-08: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

EXP-09: Teste sintético positivo/negativo cobrindo a lacuna, persistência/reload, tenant cruzado quando aplicável; gate e parecer24.

## Contexto adicional
Missão atual somente auditoria; nenhuma correção autorizada por este handoff. Ver matriz335requisitos, relatórioHTML e parecer24. Revalidar contra main de destino, que foi alterada por outro processo durante a auditoria. Complexidade depende do proprietário; hipóteses não são causa operacional comprovada.
