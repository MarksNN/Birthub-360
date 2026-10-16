# Birthub 360° — Relatório Executivo da Auditoria Forense de Dívidas Técnicas

**Coordenação:** Agente 00 (Orquestrador de Engenharia) | **Controle de Qualidade:** Agente 08 | **Revisão Independente:** Agente 24  
**Repositório:** [`MaarkssN/Birthub-360`](https://github.com/MaarkssN/Birthub-360) | **Branch:** `main` | **Commit Auditado:** [`c7e33a911b73`](https://github.com/MaarkssN/Birthub-360/commit/c7e33a911b734ddb3131a3ad08d421efbc823fd4) (Snapshot base [`9373fb224a8a`](https://github.com/MaarkssN/Birthub-360/commit/9373fb224a8aba30a39f7d10d1a2be639c35af78))  
**Data da Consolidação:** 14 de outubro de 2026 | **Modo de Execução:** Somente Leitura (Zero alterações no código de produção)

## 1. Síntese Executiva: 40 Achados Confirmados em 216 Verificações Técnicas (Zero P0, 17 P1, 20 P2, 3 P3)

A auditoria forense avaliou integralmente as **40 categorias obrigatórias (`DT-01` a `DT-40`)** por meio de **216 verificações técnicas distintas e testáveis**, combinando análise estática contextual da árvore `main`, inspeção de diffs de merges recentes (`23a61ea0`, `9ae65b1a`, `2b918e0a`, `c7e33a91` e PR aberto `#741`) e execução isolada de funções extraídas no runtime Node.js v22.

| Indicador Executivo | Valor Auditado | Observação Forense |
| :--- | :---: | :--- |
| **Categorias Auditadas (`DT-01` a `DT-40`)** | **40 / 40 (100%)** | Mínimo de 5 verificações distintas e testáveis por categoria |
| **Total de Verificações Individuais** | **216** | 200 verificações base das 40 categorias + 16 verificações de regressões e lançamento |
| **Verificações Concluídas** | **170 (78,7%)** | 125 Conformes, 41 Não conformes e 4 Parcialmente conformes |
| **Verificações Não Verificadas** | **46 (21,3%)** | Dependem de runtime com `node_modules`, Docker daemon ou credenciais externas |
| **Conformidade Verificável** | **73.5%** | `125 / 170` propriedades estáticas/isoladas (81,2% no recorte incremental de 200 checks) |
| **Achados Canônicos Confirmados (Deduplicados)** | **40** | 24 da varredura de 40 categorias + 12 de lançamento abertos em `main` + 4 de merges/governança |
| **Dívidas Resolvidas Nesta Auditoria** | **0** | Missão estritamente diagnóstica; 6 achados possuem patch candidato isolado não integrado |

## 2. Distribuição de Severidade e Risco de Negócio

Seguindo a Regra 1 e a Fase 04, nenhuma ocorrência foi classificada como `P0` apenas pelo rótulo da categoria: como não foi demonstrado acesso cruzado ativo não autenticado, perda irreversível consumada em banco de produção ou chave privada real vazada no HEAD, o diagnóstico concentra os bloqueadores reais em **17 achados P1 (Alta Prioridade)**.

| Prioridade | Quantidade | % dos Achados | Perfil de Risco Confirmado |
| :--- | :---: | :---: | :--- |
| **P0 — Crítica** | **0** | 0,0% | Nenhuma perda de dados ativa ou quebra de isolamento explorável sem autenticação demonstrada |
| **P1 — Alta** | **17** | 42,5% | Segurança de logs/LGPD, isolamento de cache PWA, SQL do dialer sem `organization_id`, deriva OpenAPI, falsos sucessos no Copiloto/Analytics/Release Gate, shutdown SSE e 62 testes ignorados |
| **P2 — Média** | **20** | 50,0% | Performance O(n) em `AILog`, concorrência no onboarding, paginação Meilisearch, fuso UTC vs Brasília, timeout Bitrix, quota streaming IA, deep links/ícones mobile e governança |
| **P3 — Baixa** | **3** | 7,5% | Query `user.count` redundante no signup, cálculo de renovação em módulo legado desativado e link documental órfão |

## 3. Os 10 Principais Riscos Técnicos e Operacionais Confirmados

1. **Vazamento de URLs de autenticação e PII em logs (`DEBT-SEC-001` — P1, DT-06):** Quando o transporte SMTP não está configurado (`MailerNotConfiguredError`), `src/lib/auth.ts:127-132, 179-184` grava o endereço de e-mail e a URL completa com token de recuperação/verificação no logger, cujos caminhos de redaction (`src/lib/logger.ts:36-41`) não cobrem `url`, `email` nem a string interpolada em `msg`.
2. **Exclusão LGPD sujeita a falha de supressão e memória de IA sem vínculo ao titular (`DEBT-LGPD-001` e `DEBT-LGPD-002` — P1, DT-06):** Em `src/shared/services/dataSubjectErasure.service.ts:119`, `eraseDataSubject` destrói `email`/`phone` antes de gravar `OptOutRecord` e ignora exceções em `catch {}`, permitindo reabordagem por `cold-email.service.ts:90` se o opt-out falhar. Além disso, `AgentMemory` (`prisma/schema.prisma:1766`) não possui `contactId`/`leadId` para expurgo individual imediato.
3. **Cache PWA compartilhado entre sessões e queries SQL do dialer sem `organization_id` (`DEBT-UX-001` e `DEBT-DB-002` — P1, DT-34 / DT-05):** `vite.config.ts:61-66` armazena respostas `GET /api/crm` em cache `StaleWhileRevalidate` apenas por URL e `AuthContext.tsx:118-128` não limpa `CacheStorage` no logout. No backend, o merge `2b918e0a` (`PgCampaignRepository.ts:32-71` e `PgLeadRepository.ts:65-201`) executa SQL nativo em `campaigns` e `leads` sem cláusula `WHERE organization_id`.
4. **Guia canônico orientando conexão com superusuário PostgreSQL (`DEBT-DB-001` — P1, DT-05):** `docs/development/LOCAL_FIRST.md:39` orienta usar o usuário `prospector` (superusuário de bootstrap em `docker-compose.postgres-local.yml:23`) em `DATABASE_URL` em vez da role restrita `prospector_app` (`NOSUPERUSER` em `scripts/db/create-app-role.sql:1`), contornando as políticas de Row-Level Security.
5. **Regressão de contrato OpenAPI introduzida pelo merge `2b918e0a` (`DEBT-API-001` — P1, DT-02):** O merge da branch `origin/backup-stash/20261013-4-pg-repositories` (`2512d2b8`) em `main` removeu acidentalmente 124 linhas de `docs/openapi.yaml:10229-10358`, apagando a documentação de `/organization-modules` recém-adicionada no PR `#724` e quebrando `verify:openapi-drift`.
6. **Métricas fabricadas, NBA cenográfica e trace LGPD sintético no Copiloto Executivo (`DEBT-AI-002`, `DEBT-AI-003`, `DEBT-AI-004` — P1, DT-10):** `src/features/intelligence/routes/commercial-agent.routes.ts:40-245` calcula receita (`wonLeads.length * 25000`), meta (`200000`) e forecasts fixos sobre apenas 10 leads, responde sucesso em `/execute` e `/feedback` sem acionar dispatcher/banco, e devolve trace `COMPLETED` com aprovação LGPD estática para qualquer ID.
7. **Ocultação de falhas de banco no Analytics (`DEBT-UX-003` — P1, DT-31):** `src/features/analytics/presentation/AnalyticsController.ts:24-147` captura qualquer exceção do repositório e retorna `HTTP 200` com `success: true` e indicadores zerados, mascarando indisponibilidade de banco como queda real de receita.
8. **Reenfileiramento infinito no worker WhatsApp, guard tautológico e deadlock no shutdown HTTP/SSE (`DEBT-QUEUE-001`, `DEBT-OPS-006`, `DEBT-OPS-007` — P1, DT-25 / DT-19 / DT-21):** Escape duplo na regex de `src/lib/queue/redis.ts:10` faz o worker ser classificado como web e reenfileirar mensagens WhatsApp sem sessão; `process-guards.ts:48-52` trata qualquer `ECONNRESET` como erro Redis; e `shutdown.ts:69-73` aguarda `httpServer.close` antes de fechar conexões SSE (`sse.service.ts:55-59`).
9. **Falso `STATUS: GO` no gate local de release e no drill de restore (`DEBT-GATE-001` e `DEBT-OPS-004` — P1, DT-08 / DT-22):** `scripts/release-gate.js:43` trata `lint` e `typecheck` como opcionais e emite `GO` (`exit 0`) com compilação quebrada; `scripts/backup/run-backup-restore-drill.ts:298-302` aprova o drill mesmo com `migration failed` e `RTO > 900s`.
10. **Lacuna de descoberta em 62 suítes de teste e ruído no PR `#741` (`DEBT-OPS-001` — P1, DT-08 e `DEBT-GOV-004` — P2, DT-14):** `vitest.unit.config.ts:35-39` ignora 62 arquivos `*.test.ts(x)` co-localizados fora de `__tests__`; paralelamente, o PR aberto `#741` gerou 176 falsos positivos por busca textual cega (`git grep`) e rodou `npm run format` alterando código funcional.

## 4. Concentração por Categoria e Módulo

| Categoria Principal | Nome da Categoria | Verificações | Achados Confirmados | IDs dos Achados |
| :---: | :--- | :---: | :---: | :--- |
| **DT-10** | Inteligência artificial | 8 | **4** | `DEBT-AI-002, DEBT-AI-003, DEBT-AI-004, DEBT-AI-001` |
| **DT-06** | Segurança e privacidade | 7 | **3** | `DEBT-LGPD-001, DEBT-LGPD-002, DEBT-SEC-001` |
| **DT-34** | Mobile e PWA | 5 | **3** | `DEBT-UX-001, DEBT-UX-005, DEBT-UX-006` |
| **DT-04** | Backend e APIs | 6 | **2** | `DEBT-CAD-001, DEBT-PERF-001` |
| **DT-05** | Banco de dados | 7 | **2** | `DEBT-DB-001, DEBT-DB-002` |
| **DT-08** | Testes e QA | 6 | **2** | `DEBT-GATE-001, DEBT-OPS-001` |
| **DT-11** | Documentação | 6 | **2** | `DEBT-DOC-001, DEBT-GOV-001` |
| **DT-13** | Governança | 6 | **2** | `DEBT-GOV-002, DEBT-GOV-003` |
| **DT-36** | Busca | 5 | **2** | `DEBT-UX-002, DEBT-UX-007` |
| **DT-01** | Código-fonte | 5 | **1** | `DEBT-CODE-001` |
| **DT-02** | Arquitetura | 6 | **1** | `DEBT-API-001` |
| **DT-03** | Frontend e UX | 6 | **1** | `DEBT-UX-008` |
| **DT-07** | Infraestrutura e DevOps | 5 | **1** | `DEBT-OPS-003` |
| **DT-09** | Integrações externas | 5 | **1** | `DEBT-INT-001` |
| **DT-14** | Git e versionamento | 6 | **1** | `DEBT-GOV-004` |
| **DT-16** | Configuração | 6 | **1** | `DEBT-MOB-001` |
| **DT-17** | Build | 5 | **1** | `DEBT-OPS-002` |
| **DT-19** | Observabilidade | 5 | **1** | `DEBT-OPS-006` |
| **DT-21** | Disponibilidade | 5 | **1** | `DEBT-OPS-007` |
| **DT-22** | Recuperação | 5 | **1** | `DEBT-OPS-004` |
| **DT-25** | Filas e eventos | 6 | **1** | `DEBT-QUEUE-001` |
| **DT-27** | FinOps | 5 | **1** | `DEBT-FIN-001` |
| **DT-28** | Billing | 5 | **1** | `DEBT-BILL-003` |
| **DT-29** | Onboarding | 5 | **1** | `DEBT-ONB-001` |
| **DT-31** | Analytics | 5 | **1** | `DEBT-UX-003` |
| **DT-32** | Internacionalização | 5 | **1** | `DEBT-UX-004` |
| **DT-35** | Notificações | 5 | **1** | `DEBT-NOT-001` |

## 5. Resumo do Plano de Saneamento por Ondas (Aguardando Autorização)

Nenhuma correção foi aplicada nesta etapa. O saneamento integral está estruturado em **10 ondas sequenciais e rastreáveis (`Onda 00` a `Onda 09`)**, detalhadas em `birthub360-plano-saneamento-dividas.md`:

| Onda | Foco Técnico | Achados Incluídos | Agentes Líderes | Esforço Estimado |
| :---: | :--- | :--- | :---: | :---: |
| **Onda 00** | Preparação, Baseline Isolado e Higiene de Gates | `DEBT-GATE-001, DEBT-OPS-002, DEBT-OPS-003, DEBT-GOV-004` (4) | `08, 14, 08A, 00` | 1–3 dias / onda |
| **Onda 01** | Segurança Crítica, Privacidade LGPD e Isolamento Multi-Tenant | `DEBT-SEC-001, DEBT-LGPD-001, DEBT-LGPD-002, DEBT-DB-001, DEBT-DB-002, DEBT-UX-001` (6) | `15, 01, 01A, 09, 21` | 1–3 dias / onda |
| **Onda 02** | Integridade de Dados, Migrações e Confiabilidade de Recuperação (DR) | `DEBT-OPS-004` (1) | `10, 01A` | 1–3 dias / onda |
| **Onda 03** | Arquitetura, Backend, Contratos OpenAPI e Resiliência de Runtime | `DEBT-API-001, DEBT-UX-003, DEBT-OPS-006, DEBT-OPS-007, DEBT-ONB-001, DEBT-UX-002, DEBT-UX-004, DEBT-CAD-001, DEBT-CODE-001, DEBT-BILL-003` (10) | `18, 04, 16, 01, 17, 12` | 1–3 dias / onda |
| **Onda 04** | Frontend, Design System, Resiliência de UI, Mobile e PWA | `DEBT-UX-008, DEBT-NOT-001, DEBT-UX-005, DEBT-UX-006, DEBT-MOB-001` (5) | `02, 07, 09, 11, 01` | 1–3 dias / onda |
| **Onda 05** | Integrações Externas, Bitrix24, Filas WhatsApp e Busca Híbrida | `DEBT-QUEUE-001, DEBT-INT-001, DEBT-UX-007` (3) | `16, 06, 07` | 1–3 dias / onda |
| **Onda 06** | Inteligência Artificial, Copiloto Executivo, Enxame e Quotas por Tier | `DEBT-AI-002, DEBT-AI-003, DEBT-AI-004, DEBT-AI-001` (4) | `07, 23, 13, 04, 18` | 1–3 dias / onda |
| **Onda 07** | Performance, Escalabilidade e Eficiência de Consultas | `DEBT-PERF-001` (1) | `01, 23, 07` | 1–3 dias / onda |
| **Onda 08** | QA, Descoberta Completa de Testes e Observabilidade PromQL | `DEBT-OPS-001, DEBT-FIN-001` (2) | `14, 08, 10, 23` | 1–3 dias / onda |
| **Onda 09** | Governança, Documentação Operacional e Certificação de Release | `DEBT-GOV-002, DEBT-DOC-001, DEBT-GOV-003, DEBT-GOV-001` (4) | `00, 08, 18, 24` | 1–3 dias / onda |

## 6. Recomendações Imediatas ao Coordenador Humano (Marks)

1. **Rejeitar/Fechar o PR `#741` (`tech-debt-audit-1898280509423632042`):** Evitar o merge dos 176 falsos positivos gerados por `git grep` e da formatação não autorizada.
2. **Autorizar a execução da `Onda 00` e da `Onda 01`:** Priorizar o provisionamento do baseline com `node_modules`/Docker pelo Agente 14, a restauração das 124 linhas de `docs/openapi.yaml` perdidas no merge `2b918e0a`, a sanitização de logs de autenticação (`DEBT-SEC-001`), a blindagem de `organization_id` no SQL do dialer (`DEBT-DB-002`), a limpeza do cache PWA no logout (`DEBT-UX-001`) e a integração dos patches candidatos validados de LGPD (`DEBT-LGPD-001`) e release-gate (`DEBT-GATE-001`).
3. **Emitir as 2 decisões humanas de governança pendentes para a `Onda 09`:** (a) Definir se `.github/workflows/docker-publish.yml` deve ter o gatilho `workflow_run` suspenso durante o regime Local-First (`DEBT-GOV-002`); e (b) autorizar a atualização da referência a `EXECUCAO-ONDAS.md` em `.agents/prompts/00-coordenador.md` (`DEBT-GOV-001`).
