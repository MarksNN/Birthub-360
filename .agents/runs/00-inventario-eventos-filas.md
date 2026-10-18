# INVENTÁRIO DO RUNTIME ASSÍNCRONO, FILAS E EVENTOS — ONDA 00
**Projeto:** Birth Hub 360° / Birthub 360  
**Onda:** `00 — Fundação e Preparação`  
**Data:** 2026-10-18  
**Autoridade:** `AGENTS.md`  
**Coordenador:** Agente 00 — Chief Commercial Intelligence Engineering Orchestrator  
**Auditor Independente:** Agente 24 — Revisão Independente  

---

## 1. Topologia do Runtime Assíncrono

A plataforma opera com um ecossistema assíncrono baseado em **BullMQ + Redis**, estruturado para isolar cargas intensivas de I/O, IA e telecomunicações da thread HTTP principal do Express.

### 1.1 Separação entre Processo HTTP e Workers
- **Processo Web Principal (`server.ts`):** Roda a API Express, rotas públicas e webhooks. Por padrão, workers embutidos estão **DESATIVADOS** (`ENABLE_EMBEDDED_WORKERS=false`), prevenindo que múltiplas instâncias web horizontais dupliquem a execução de cron jobs ou disputem filas de processamento.
- **Processo Worker Dedicado (`worker.ts`):** Entrypoint autônomo com lifecycle próprio, graceful shutdown independente e registro centralizado de todos os 13 workers do sistema.
- **Modo de Desenvolvimento Embutido (`src/bootstrap/workers.ts`):** Ativado exclusivamente se `ENABLE_EMBEDDED_WORKERS=true` para permitir que desenvolvedores rodem o ambiente completo em máquina local sem necessidade de abrir múltiplos terminais.
- **Garantia de Paridade:** O teste arquitetural `tests/unit/architecture/worker-registry-parity.test.ts` assegura que nenhum worker seja adicionado a `worker.ts` sem estar espelhado de forma idêntica em `src/bootstrap/workers.ts`.

---

## 2. Inventário Completo das 13 Filas BullMQ

| Fila / Worker | Arquivo Fonte | Responsabilidade | Concorrência | Política de Retry / Dead-Letter |
|---|---|---|:---:|---|
| **1. Leads Queue** | `src/lib/queue/index.ts` | Ingestão, enriquecimento primário e transição de status de Leads | 5 | 3 tentativas, exponencial, DLQ ativo |
| **2. Agent Worker** | `src/lib/queue/agent.worker.ts` | Execução de missões autônomas de agentes de IA em background | 3 | 2 tentativas com isolamento de contexto |
| **3. Enrichment Cascade** | `src/lib/queue/enrichment.queue.ts` | Cascata de enriquecimento (Apollo, Google, BrasilAPI) | 4 | Rate limit por provedor e cache Redis |
| **4. Knowledge Ingestion** | `src/lib/queue/knowledgeIngestion.worker.ts` | Chunking de documentos e geração de embeddings pgvector | 2 | Idempotente por hash de documento |
| **5. Search Queue** | `src/lib/queue/search.queue.ts` | Indexação assíncrona para busca textual | 5 | Fail-safe sem queda de processo |
| **6. Checkpointer Prune** | `src/lib/queue/checkpointerPrune.worker.ts` | Limpeza de checkpoints antigos de workflows de IA | 1 | Cron periódico diário |
| **7. Cold Call Worker** | `src/lib/queue/coldCall.worker.ts` | Discagem ativa SDR e orquestração de chamadas de voz | 2 | Bloqueio fora de horário e checagem de opt-out |
| **8. WhatsApp Signal** | `src/lib/queue/whatsappSignal.worker.ts` | Processamento de mensagens recebidas via WhatsApp | 5 | Isolamento multi-tenant por número |
| **9. WhatsApp Command** | `src/lib/queue/whatsappCommand.worker.ts` | Disparo de comandos e notificações ativas | 3 | Fila com backoff para evitar bans |
| **10. Swarm Scheduler** | `src/lib/queue/swarmScheduler.worker.ts` | Agendador e orquestrador da Célula Comercial de Agentes | 1 | Distributed lock no Redis (`distributedLock.ts`) |
| **11. Bitrix Sync & Outbound** | `src/lib/queue/bitrixSync.worker.ts` | Sincronização bidirecional de Deals, Leads e Contatos | 2 | Fila com fallback e registro de log de auditoria |
| **12. Copiloto Transcription** | `src/features/copiloto-ia/jobs/transcribeConversation.worker.ts` | Transcrição de áudio via Whisper e síntese pedagógica | 2 | Fila com retry e persistência em `Conversation` |
| **13. Cadence Run** | `src/features/cadence/jobs/cadenceRun.worker.ts` | Execução dos passos de cadência multicanal | 4 | Distributed lock por lead (`redisCadenceRunLock.ts`) |

---

## 3. Jobs Agendados e Cronograma de Automações

| Identificador do Cron | Expressão / Padrão | Serviço Responsável | Finalidade Técnica |
|---|---|---|---|
| `daily-ldr-scheduler` | `0 2 * * *` (2h da manhã) | `accountIntelligenceScheduler.worker.ts` | Varredura de contas-alvo e prospecção LDR |
| `forecastSnapshotWeekly` | Semanal (Domingo 23h) | `forecastSnapshotWeekly.worker.ts` | Congelamento de snapshot semanal de pipeline |
| `bitrixSyncTick` | Periódico (a cada 15 min) | `bitrixSync.worker.ts` | Sincronização incremental com Bitrix24 |
| `dailyExecutiveSummary` | Diário (18h) | `dailyExecutiveSummary.worker.ts` | Resumo executivo de métricas de vendas |
| `autoAnonymizeDisqualified` | Diário (3h da manhã) | `autoAnonymizeDisqualified.worker.ts` | Expurgo LGPD automático de leads desqualificados |
| `coldLeadsScanner` | Diário (4h da manhã) | `cold-leads-scanner.service.ts` | Identificação de oportunidades estagnadas |
| `agentMemoryCleanup` | Semanal | `agentMemoryCleanup.worker.ts` | Expurgo de memórias transitórias de agentes |
| `globalNewsScan` | A cada 4 horas | `newsMonitor.worker.ts` | Monitoramento de notícias e gatilhos de mercado |

---

## 4. Resiliência, Guards e Prevenção de Falhas Silenciosas

1. **Dead-Letter Queue (`src/lib/queue/deadLetter.ts`):** Jobs que esgotam retries são movidos para DLQ com payload serializado, stack trace e metadata do tenant, permitindo inspeção e reprocessamento sem perda de dados.
2. **Process Guards (`src/lib/process-guards.ts`):** Captura de `unhandledRejection` e `uncaughtException` com logging estruturado, impedindo que falhas de conexão transiente com Redis derrubem o processo Node.js.
3. **Locks Distribuídos (`src/lib/queue/distributedLock.ts`):** Implementação baseada em `Redlock` para evitar que workers paralelos processem o mesmo Lead ou executem o mesmo passo de cadência simultaneamente.
4. **Graceful Shutdown (`src/bootstrap/shutdown.ts`):** Sinais `SIGTERM` e `SIGINT` aguardam a conclusão de jobs ativos até o timeout de 10s antes de encerrar as conexões com Redis e PostgreSQL.

---

## 5. Recomendação Arquitetural para o Futuro `DomainEventMesh`

Para suportar as 20 evoluções estratégicas das próximas ondas sem acoplamento direto:
- **Diagnóstico:** O mecanismo atual (`InMemoryEventBus` + BullMQ) atende plenamente o escopo atual, mas depende de memória local no processo HTTP para despacho inicial.
- **Evolução Recomendada:** Adotar o padrão **Transactional Outbox (`DomainEventOutbox`)** no PostgreSQL na Onda 01. Ao persistir uma entidade de negócio (ex.: Deal fechado, Lead desqualificado), o evento de domínio é gravado na mesma transação ACID do banco. Um worker leve do BullMQ lê o Outbox e distribui os eventos no barramento distribuído, eliminando 100% do risco de perda de eventos em falhas de rede.
