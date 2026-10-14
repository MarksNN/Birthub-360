# Agente06 — Auditoria forense de integrações/runtime/FinOps

Agente / Onda / Branch:06 / preparação diagnóstico / main snapshot 9373fb224a8aba30a39f7d10d1a2be639c35af78

Suposições:fontes do snapshot são base rastreável;staticamente conforme descreve apenas propriedade do título, nunca produção certificada. Prompt usuário somente auditoria prevalece sobre correções gerais.
Plano executado:governança→fontes→checks→reproduções puras→dados estruturados. Revisão08 e24 ainda pendente.

50 checks em10 categorias;6 achados canônicos;resultados:{"Não conforme":6,"Conforme":34,"Não verificado":9,"Parcialmente conforme":1}. NenhumP0.
Arquivos alterados:somente audit-06.json,audit-06.md e reproducer verify-06.cjs autorizado00;produto inalterado.
Comandos/testes:Get-Content AGENTS.md e prompts06,06A,07,12,13,16,17;rg --files;inspeções numeradas → exit 0:Governança/fontes inspecionadas;algumas tentativas nomes13/17 incorretos corrigidas por inventário.

rg arquivos inexistentes pricing.ts/providers.ts/threecx.webhook.ts e glob Windows → exit 2:Busca inicial falhou por caminho inexistente/glob;inventário posterior localizou fontes corretas. Sem inferência de falha de produto.

node --version → exit 0:v22.23.2

node stdin: extração guard e asserts estruturais shutdown/quotas/labels → exit 0:ECONNRESET nãoRedis classificado true;streamQuota false/chatQuota true;deadlineHTTP false.

node stdin: stripTypeScriptTypes shutdown e NotificationService fake deps → exit 0:SSE false/shutdown pending;B unread0 após A ler broadcast;sem conexão externa.

## Achados

### DEBT-INT-001 — Timeout Bitrix encerra antes leitura do corpo
P2;dono06;Risco operacional;Onda 05.

O timer é cancelado após headers antes response.json; corpo lento pode manter operação sem teto.

Causa:Cancelamento antecipado do AbortController. Impacto:Job/requisição pode aguardar corpo indefinidamente apesar contrato15s.

Evidência:src/features/integrations/bitrix/service/client.ts:82-86; src/features/integrations/bitrix/service/client.ts:92-96.

Remediação:Preservar timer até consumir body em finally; aplicar também testWebhook.

Aceite:Mock entrega headers e bloqueia corpo; operação deve abortar em15s.

Limitação:Staticamente confirmado; body stall não executado.

### DEBT-AI-001 — Streaming não aplica quota por tier
P2;dono23;Dívida técnica confirmada;Onda 06.

streamChatCompletion chama orçamento monetário mas não enforceTokenQuota;invoke aplica o controle.

Causa:Dois caminhos saída com controles distintos. Impacto:Quota de tokens premium por tier não cobre streaming; teto monetário continua existindo.

Evidência:src/lib/ai/gateway/streaming.ts:32-36; src/lib/ai/gateway/chat-model.ts:144-148.

Remediação:Aplicar decisão quota antes streaming e registrar consumo por mesma fonte.

Aceite:Quota excedida impede streaming premium antes fetch e usa mesma política do invoke.

Limitação:Não prova consumo real/exploração nem ausência de limites monetários.

### DEBT-OPS-006 — Guard classifica falhas de qualquer origem como Redis
P1;dono16;Risco operacional;Onda 03.

matchesKnownPattern && (looksLikeIoredis || matchesKnownPattern) reduz a matchesKnownPattern; ECONNRESET de serviço não Redis segue processo.

Causa:Predicado origem tornado tautológico por repetição do termo. Impacto:Bugs não tratados de outros clientes seguem execução em estado possivelmente inconsistente;log continua existindo.

Evidência:src/lib/process-guards.ts:48-52; src/lib/process-guards.ts:48-52.

Remediação:Exigir proveniência Redis com mensagem compatível;caso desconhecido fatal.

Aceite:Erro application ECONNRESET termina fatal;erro Redis conhecido segue log.error.

Limitação:Reprodução da função pura; não mede incidente ou ambiente real.

### DEBT-OPS-007 — Shutdown HTTP espera fechar conexão SSE antes de encerrá-la
P1;dono16;Risco operacional;Onda 03.

Await httpServer.close callback precede sseService.closeAll;SSE mantém callback pendente e código não tem deadline.

Causa:Ordem de dreno com ciclo e falta de limite/best-effort prometido em comentário. Impacto:Deploy pode exigir kill e perder encerramento ordenado;falha em closeAll/worker também impede cleanup posterior.

Evidência:src/bootstrap/shutdown.ts:69-73; src/features/notifications/sse.service.ts:55-59.

Remediação:Iniciar fechamento HTTP,fechar SSE,drenar com deadline e cleanup best-effort.

Aceite:SIGTERM com SSE ativo fecha SSE e HTTP dentro deadline;uma etapa falha não impede restantes.

Limitação:Fake dependências reproduz espera; não usa socket real nem simula deployment.

### DEBT-FIN-001 — Alerta orçamento IA usa vetores incompatíveis
P2;dono10;Dívida técnica confirmada;Onda 08.

Counter labels provider,tenant;budget Gauge sem esses labels.Divisão padrão não encontra correspondência,dados numerador não chegam resultado.

Causa:Expressão PromQL sem agregação/explicit matching;contador lifetime também difere orçamento mensal. Impacto:AIBudgetOverrun pode permanecer vazio mesmo com custo emitido;não prova estado atual cloud.

Evidência:infrastructure/observability/alert.rules.yml:260-264; src/lib/ai/metrics.ts:19-23.

Remediação:Construir métrica custo mensal alinhada budget global e expressão agregada;teste promtool positive/negative/mês.

Aceite:promtool rule test com custos provider/tenant e gauge global deve disparar quando soma mensal>teto.

Limitação:Regra inspecionada; promtool não instalado/executado.

### DEBT-NOT-001 — Leitura broadcast silencia unread para colegas
P2;dono02;Defeito funcional;Onda 04.

Notification tem readAt único;markRead de broadcast altera mesmo registro para toda organização.

Causa:Modelo mistura notificação e estado por destinatário. Impacto:Colegas deixam de receber indicação não lida de alerta que não abriram.

Evidência:src/features/notifications/notification.service.ts:94-98; prisma/schema.prisma:2048-2052.

Remediação:Manter leitura por usuário com modelo01 e contrato18,sem alterar conteúdo broadcast.

Aceite:UsuárioA lê broadcast;B continua unread até lê-lo;estado não compartilhado.

Limitação:Função exata com mock persistência; não certifica DB/RLS real.

## Inventário das verificações
|ID|Propriedade|Resultado|Dono|Evidência|
|---|---|---|---|---|
|DT-09-01|Timeout cobre também leitura de corpo Bitrix|Não conforme|06|src/features/integrations/bitrix/service/client.ts:82|
|DT-09-02|Retry diferencia429,5xx de401/403|Conforme|06|src/features/integrations/bitrix/service/client.ts:192|
|DT-09-03|Paginação automática segue cursor e registra limite|Conforme|06|src/features/integrations/bitrix/service/leads.ts:186|
|DT-09-04|OAuth renova token e delimita timeout|Conforme|06|src/features/integrations/google/google.service.ts:221|
|DT-09-05|Webhook voz exige assinatura e proteção replay|Conforme|12|src/features/integrations/birth-voice/birthVoice.webhook.ts:299|
|DT-10-01|Gateway fallback só por providers configurados|Conforme|07|src/lib/ai/gateway/chat-model.ts:78|
|DT-10-02|Streaming respeita quotas por tier como invoke|Não conforme|23|src/lib/ai/gateway/streaming.ts:32|
|DT-10-03|Circuit breaker registra falhas de streaming|Conforme|07|src/lib/ai/gateway/streaming.ts:68|
|DT-10-04|Saída IA tem checagem PII|Conforme|13|src/lib/ai/gateway/chat-model.ts:166|
|DT-10-05|Avaliações reais de modelos no ambiente autorizado|Não verificado|07|package.json:84|
|DT-16-01|NODE_ENV obrigatório validado por enum|Conforme|01|src/config/env.ts:10|
|DT-16-02|Bypass de auth proibido em produção|Conforme|01|src/config/env.ts:355|
|DT-16-03|Janela de discagem validada start<end|Conforme|12|src/config/env.ts:337|
|DT-16-04|Retenção extração tem limite configurado|Conforme|06|src/config/env.ts:275|
|DT-16-05|Consistência valores efetivos de env deploy|Não verificado|10|src/config/env.ts:342|
|DT-19-01|Logs estruturados redigem chaves sensíveis|Conforme|15|src/lib/logger.ts:35|
|DT-19-02|Classificação guard exige origem Redis|Não conforme|16|src/lib/process-guards.ts:48|
|DT-19-03|Alerta orçamento compara vetores compatíveis|Não conforme|10|infrastructure/observability/alert.rules.yml:260|
|DT-19-04|Instrumentação servidor precede bootstrap|Conforme|10|server.ts:1|
|DT-19-05|Alertas chegam operador|Não verificado|10|infrastructure/observability/alert.rules.yml:54|
|DT-20-01|Atualizações dependências têm rotina semanal|Conforme|08|.github/dependabot.yml:6|
|DT-20-02|Inventário detecta pré-release offline|Conforme|08|scripts/security/dependency-inventory.ts:9|
|DT-20-03|Waivers de auditoria têm checker dedicado|Conforme|15|package.json:47|
|DT-20-04|SBOM com saída reproduzível declarado|Conforme|08|package.json:48|
|DT-20-05|Vulnerabilidades/deprecações atuais|Não verificado|15|package.json:205|
|DT-21-01|Liveness separado de readiness|Conforme|10|src/bootstrap/healthchecks.ts:85|
|DT-21-02|Readiness valida DB e Redis habilitado|Conforme|10|src/bootstrap/healthchecks.ts:31|
|DT-21-03|Shutdown HTTP drena SSE sem deadlock|Não conforme|16|src/bootstrap/shutdown.ts:69|
|DT-21-04|PDB expressa disponibilidade mínima|Conforme|10|charts/birthhub-360/values.yaml:110|
|DT-21-05|Worker tem deadline explícito no shutdown|Conforme|16|src/bootstrap/workerServer.ts:189|
|DT-25-01|Sync recorrente usa scheduler idempotente|Conforme|16|src/lib/queue/bitrixSync.worker.ts:57|
|DT-25-02|Falha final registra deadletter sanitizada|Conforme|16|src/lib/queue/deadLetter.ts:78|
|DT-25-03|Métricas profundidade e falhas implementadas|Conforme|10|src/lib/queue/metrics.ts:36|
|DT-25-04|Tick Bitrix registra falhas por regra|Conforme|06|src/features/integrations/bitrix/service/syncRules.ts:241|
|DT-25-05|Entrega única concorrente sob restart|Não verificado|16|src/lib/queue/bitrixSync.worker.ts:28|
|DT-26-01|Requests e limits web/worker declarados|Conforme|10|charts/birthhub-360/values.yaml:68|
|DT-26-02|Autoscaling web delimita replicas|Conforme|10|charts/birthhub-360/values.yaml:79|
|DT-26-03|Recursos cloud ociosos medidos|Não verificado|10|charts/birthhub-360/values.yaml:2|
|DT-26-04|Custos storage egress retenção calculados|Não verificado|10|src/config/env.ts:287|
|DT-26-05|Dimensionamento worker validado por telemetria|Não verificado|23|charts/birthhub-360/values.yaml:115|
|DT-27-01|Custos IA atribuídos provider e tenant|Conforme|23|src/lib/ai/metrics.ts:19|
|DT-27-02|Teto mensal por org escopa consultas|Conforme|23|src/lib/ai/budget.ts:165|
|DT-27-03|Quota uso mensal escopada e cache por org/mês|Conforme|23|src/lib/ai/finops/tokenQuota.service.ts:187|
|DT-27-04|Preço não cadastrado sinaliza fallback|Conforme|23|src/lib/ai/gateway/pricing.ts:35|
|DT-27-05|Reconciliação estimativa IA e fatura real|Não verificado|23|src/lib/ai/gateway/pricing.ts:11|
|DT-35-01|SMTP ausente retorna erro explícito|Conforme|05|src/lib/email/mailer.ts:24|
|DT-35-02|Visibilidade notificação aplica tenant e destinatário|Conforme|01|src/features/notifications/notification.service.ts:59|
|DT-35-03|Leitura broadcast individual por destinatário|Não conforme|02|src/features/notifications/notification.service.ts:94|
|DT-35-04|Exclusão broadcast restrita gerência|Conforme|01|src/features/notifications/notification.service.ts:131|
|DT-35-05|Inbound email adaptado provedor real|Parcialmente conforme|06|src/features/integrations/email/emailReply.webhook.ts:24|

## Dependências/handoffs
REQUER OUTRO AGENTE:16+10 runtime;07+23 quotas;10+23 alerta;02+01+18 notificações. Comunicados00 via mensagens rastreáveis;handoff formal será backlog consolidado autorizado00. Nenhum schema editado.
Problemas fora escopo:12 exclusões launch preservadas sem duplicação;sem implementação.
Aprendizado reutilizável:predicate origem guard é tautológico;shutdown await close antes SSE cria ciclo;conformidade estática e mock não equivalem persistência real.
Pendências:08/24 revisar50checks e6achados;homologação segura posteriormente com autorização.
Riscos:limitações operacionais explícitas;nenhum deploy/commit/push/PR/serviço externo executado.
node_modules não existe na cópia;lint/typecheck/build e suítes Vitest NÃO EXECUTADOS pelo06.
Sem serviços reais,DB,Redis,SMTP,cloud faturamento ouLLMs;checks operacionais marcadosNão verificado.
BITRIX24-LEAD-FLOW-AUDIT.md referenciado pela skill não encontrado no inventário snapshot;não usar alegações históricas como prova.
12 itens launch excluídos pelo00; nenhuma investigação/check dedicado aos itens excluídos.
Custos são estimativas de código;nenhum valor de fatura real informado.

Reprodução persistida: `node verify-06.cjs` → exit0. Inclui positivos/negativos de guard,shutdown,body Bitrix,broadcast e checks estruturais quota/50IDs/ranges. Timeout Bitrix: função exata com safeFetch fake, timer reduzido5ms e espera30ms permanece pending;body imediato sucede. Não equivale teste backend/provedor real. Evidência corrigida JSON client.ts159–216;promtool NÃO EXECUTADO.
