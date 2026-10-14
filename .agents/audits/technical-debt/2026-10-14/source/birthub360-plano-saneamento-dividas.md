# Birthub 360° — Plano de Saneamento por Ondas (Backlog Consolidado)

**Coordenação:** Agente 00 | **Base Auditada:** `main` ([`c7e33a911b73`](https://github.com/MaarkssN/Birthub-360/commit/c7e33a911b734ddb3131a3ad08d421efbc823fd4)) | **Total de Achados no Backlog:** 40 (`0 P0`, `17 P1`, `20 P2`, `3 P3`)  
**Status de Execução:** BLOQUEADO AGUARDANDO AUTORIZAÇÃO HUMANA EXPLÍCITA (Regra 2 e Fase 07)

## 1. Diretrizes de Orquestração, Slots Exclusivos e Dependências Cruzadas

- **Isolamento por Worktree (`AGENTS.md` §12–13):** Nenhum especialista compartilha working tree. Cada onda deve criar branches dedicadas `agente/<ID>-<slug>` a partir de `integracao/onda-<N>` e integrar em levas máximas de 2 a 3 merges seguidas de gate completo.
- **Slots Exclusivos (`AGENTS.md` §14–15):**
  - `prisma/schema.prisma` e `prisma/migrations/**` pertencem exclusivamente ao slot `01 / 01A` (nunca executam simultaneamente).
  - `src/lib/queue/**` exige exclusão mútua entre `16`, `06` e `07`.
  - `Dockerfile`, `.dockerignore` e `.github/workflows/**` pertencem ao slot `08 / 08A`.
  - `docs/openapi.yaml` pertence ao `Agente 18`.
- **Regra de Precedência:** Achados `P1` dentro de qualquer onda têm prioridade de agendamento sobre itens `P2` e `P3`.
- **Auditoria Obrigatória (`AGENTS.md` §40):** Nenhuma onda ou handoff pode ser encerrado sem parecer formal `APROVADO` do **Agente 24** vinculado aos hashes SHA-256 exatos do diff e das evidências de teste.

## 2. Detalhamento Técnico das Ondas de Saneamento (Onda 00 a Onda 09)

### Onda 00 — Preparação, Baseline Isolado e Higiene de Gates

- **Objetivo:** Estabelecer baseline reprodutível em ambiente isolado (Agente 14), blindar o gate local de lançamento contra falsos positivos (scripts/release-gate.js), fixar versão determinística do Prisma CLI na imagem Docker, higienizar .dockerignore e bloquear o merge do PR #741.
- **Agentes Responsáveis (Líderes):** `08, 14, 08A, 00`
- **Achados Incluídos (4):** `DEBT-GATE-001, DEBT-OPS-002, DEBT-OPS-003, DEBT-GOV-004`
- **Arquivos e Módulos Afetados:** `scripts/release-gate.js`, `docs/release/GO-LIVE-CHECKLIST.md`, `Dockerfile`, `.dockerignore`, `PR #741 (branch tech-debt-audit-1898280509423632042)`
- **Pré-requisitos:** Autorização humana explícita para iniciar saneamento e encerrar PR #741 | Preservação integral da branch main (c7e33a911b734ddb3131a3ad08d421efbc823fd4) e criação de worktrees isolados por agente
- **Ordem Recomendada de Execução:** 1º Preparar ambiente isolado (Agente 14) -> 2º Descartar/fechar PR #741 (Agente 08A) -> 3º Corrigir scripts/release-gate.js, Dockerfile e .dockerignore (Agente 08) -> 4º Revisão independente (Agente 24).
- **Critérios de Entrada:** Diagnóstico forense aprovado pelo Agente 24 e autorização humana para abertura da Onda 00.
- **Critérios de Saída (Aprovação):** verify-release-gate.mjs passando 11/11 cenários; build de imagem Docker resolvendo Prisma CLI idêntico ao lockfile; .dockerignore excluindo .worktrees/ e .tmp/; parecer APROVADO do Agente 24.
- **Testes Obrigatórios:** node docs/audits/launch-2026-10-14/evidence/verify-release-gate.mjs | Inspeção de contexto Docker com diretórios sintéticos .worktrees/ e .tmp/ | Verificação de versão exata npx prisma --version dentro do estágio runner
- **Evidências Necessárias:** Diff mínimo assinado por SHA-256 | Logs de saída (exit 0/1) dos 11 cenários do release-gate | Parecer formal do Agente 24 em .agents/reviews/
- **Riscos de Regressão:** Falha de build Docker caso a versão do Prisma CLI no runner divirja do @prisma/client gerado no builder | Bloqueio legítimo de pipelines locais que antes passavam por falso positivo em scripts/release-gate.js
- **Estratégia de Rollback:** Reverter commit da branch agente/08-onda-00-gates antes da integração em main; nenhuma alteração de banco de dados envolvida.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-GATE-001** (`OPS-001`) | **P1** | `DT-08` | QA / Release Gate | `Agente 08` | P (< 1 dia) | Baixo | Patch candidato isolado (não integrado em main) |
| **DEBT-OPS-002** (`DEBT-20261014-OPS-002`) | **P2** | `DT-17` | build | `Agente 08` | M (1–3 dias de engenharia com ambiente disponível) | moderado | Não iniciada (aguarda autorização) |
| **DEBT-OPS-003** (`DEBT-20261014-OPS-003`) | **P2** | `DT-07` | container | `Agente 08` | M (1–3 dias de engenharia com ambiente disponível) | moderado | Não iniciada (aguarda autorização) |
| **DEBT-GOV-004** (`PR-741-FALSE-POSITIVES`) | **P2** | `DT-14` | Git / Governança de PRs | `Agente 08A` | P (< 1 hora) | Nenhum | Bloqueado para merge pelo Agente 24 |

### Onda 01 — Segurança Crítica, Privacidade LGPD e Isolamento Multi-Tenant

- **Objetivo:** Eliminar exposição de URLs/tokens de autenticação em logs quando SMTP está ausente, garantir gravação de OptOutRecord antes de anonimização LGPD, vincular AgentMemory ao titular para expurgo individual, blindar queries SQL do discador por organization_id, corrigir orientação de role NOSUPERUSER (prospector_app) e isolar cache PWA de CRM por sessão/identidade.
- **Agentes Responsáveis (Líderes):** `15, 01, 01A, 09, 21`
- **Achados Incluídos (6):** `DEBT-SEC-001, DEBT-LGPD-001, DEBT-LGPD-002, DEBT-DB-001, DEBT-DB-002, DEBT-UX-001`
- **Arquivos e Módulos Afetados:** `src/lib/auth.ts`, `src/lib/logger.ts`, `src/shared/services/dataSubjectErasure.service.ts`, `src/features/prospecting/services/cold-email.service.ts`, `prisma/schema.prisma`, `src/features/intelligence/agents/agentMemory.store.ts`, `src/features/cadence/dialer/infrastructure/db/repositories/PgCampaignRepository.ts`, `src/features/cadence/dialer/infrastructure/db/repositories/PgLeadRepository.ts`, `docs/development/LOCAL_FIRST.md`, `vite.config.ts`, `src/contexts/AuthContext.tsx`
- **Pré-requisitos:** Conclusão da Onda 00 (ambiente isolado do Agente 14 operacional) | Slot exclusivo respeitado entre Agente 01 e Agente 01A para prisma/schema.prisma | Coordenação 09 -> 08 (vite.config.ts) -> 02 (AuthContext.tsx) para política de cache PWA
- **Ordem Recomendada de Execução:** 1º Sanitizar logs de auth e corrigir ordem de OptOutRecord em eraseDataSubject (Agente 01/15) -> 2º Adicionar filtro organization_id nos repositórios SQL do dialer e migrar AgentMemory (Agente 01/01A + 07) -> 3º Particionar/limpar cache PWA no logout (Agente 09/08/02) -> 4º Validar isolamento A/B (Agente 22) e Revisão (Agente 24).
- **Critérios de Entrada:** Onda 00 concluída e matriz de propriedade exclusiva publicada pelo Agente 00.
- **Critérios de Saída (Aprovação):** Zero URLs/tokens de reset/verificação em logs sob falha SMTP; falha de OptOutRecord aborta anonimização; eraseDataSubject remove AgentMemory do titular; testes negativos cross-tenant A/B aprovados no dialer e no cache PWA; parecer APROVADO do Agente 24.
- **Testes Obrigatórios:** Teste unitário/integração de fallback MailerNotConfiguredError verificando ausência de url/email no sink do pino logger | node docs/audits/launch-2026-10-14/evidence/verify-lgpd-optout.mjs + teste de integração PostgreSQL de eraseDataSubject com AgentMemory | Teste negativo multi-tenant (Tenant A vs Tenant B) em PgCampaignRepository, PgLeadRepository e troca de sessão no navegador (CacheStorage)
- **Evidências Necessárias:** Saída de testes unitários e de integração multi-tenant com exit 0 | Comprovação pelo Agente 22 de não vazamento entre sessões A/B após logout | Parecer formal do Agente 24
- **Riscos de Regressão:** Alteração de schema em AgentMemory exige migration compatível com registros legados sem contactId/leadId | Limpeza de CacheStorage no logout não deve remover assets estáticos públicos necessários offline
- **Estratégia de Rollback:** Reversão atômica de commits por domínio; para a migration aditiva de colunas opcionais em AgentMemory, manter colunas nullable compatíveis com versão anterior do app.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-SEC-001** (`DEBT-20261014-SEC-001`) | **P1** | `DT-06` | auth | `Agente 15` | Baixo | Médio | Não iniciada (aguarda autorização) |
| **DEBT-LGPD-001** (`FND-01`) | **P1** | `DT-06` | LGPD / Privacidade | `Agente 01` | P (< 1 dia) | Baixo | Patch candidato isolado (não integrado em main) |
| **DEBT-LGPD-002** (`FND-03`) | **P1** | `DT-06` | IA / LGPD | `Agente 01A` | M (1–3 dias) | Médio (envolve migration de banco e store de IA) | Não iniciada (aguarda autorização) |
| **DEBT-DB-001** (`OPS-002`) | **P1** | `DT-05` | Banco de Dados / RLS | `Agente 01` | P (< 1 dia) | Baixo | Patch candidato isolado (não integrado em main) |
| **DEBT-DB-002** (`NEW-MERGE-2B918E0A-DIALER-SQL`) | **P1** | `DT-05` | Cadência / Discador SQL | `Agente 01` | M (1–3 dias) | Médio (altera contrato das portas CampaignRepository e LeadRepository) | Não iniciada (aguarda autorização) |
| **DEBT-UX-001** (`DEBT-20261014-UX-001`) | **P1** | `DT-34` | PWA / autenticação | `Agente 09` | M | médio | Não iniciada (aguarda autorização) |

### Onda 02 — Integridade de Dados, Migrações e Confiabilidade de Recuperação (DR)

- **Objetivo:** Endurecer o critério de aprovação do drill automatizado de backup e restauração (run-backup-restore-drill.ts) para falhar obrigatoriamente quando o status de migração Prisma estiver inválido, quando tabelas falharem na contagem ou quando o tempo de restauração exceder a meta RTO de 900 segundos.
- **Agentes Responsáveis (Líderes):** `10, 01A`
- **Achados Incluídos (1):** `DEBT-OPS-004`
- **Arquivos e Módulos Afetados:** `scripts/backup/run-backup-restore-drill.ts`
- **Pré-requisitos:** Onda 01 concluída | Banco PostgreSQL descartável de homologação/teste disponível para ensaio de restore
- **Ordem Recomendada de Execução:** 1º Atualizar predicado pass e medição real de RPO/RTO em run-backup-restore-drill.ts (Agente 10) -> 2º Validar cenários de falha (migration failed, RTO 901s, tabela órfã) e sucesso (Agente 08/01A) -> 3º Revisão (Agente 24).
- **Critérios de Entrada:** Ambiente de banco descartável validado pelo Agente 14.
- **Critérios de Saída (Aprovação):** Predicado retorna false para migrateStatusOutput com erro, rtoMeasuredSec > 900 ou tableCounts vazio; drill real em banco descartável passa com exit 0 e comprova RLS pós-restore.
- **Testes Obrigatórios:** Ensaio de predicado isolado com entradas inválidas (migrateStatusOutput='migration failed', rtoMeasuredSec=901, tableCounts=[]) | Execução de npm run backup:drill contra container PostgreSQL descartável
- **Evidências Necessárias:** Artefato JSON do drill com RTO/RPO medidos e status PASS/FAIL | Parecer formal do Agente 24
- **Riscos de Regressão:** Execução acidental do drill apontando para banco não descartável caso variáveis de ambiente não sejam isoladas
- **Estratégia de Rollback:** Reverter alteração em scripts/backup/run-backup-restore-drill.ts; backups existentes permanecem intactos.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-OPS-004** (`DEBT-20261014-OPS-004`) | **P1** | `DT-22` | recuperação | `Agente 10` | M (1–3 dias de engenharia com ambiente disponível) | moderado | Não iniciada (aguarda autorização) |

### Onda 03 — Arquitetura, Backend, Contratos OpenAPI e Resiliência de Runtime

- **Objetivo:** Restaurar o contrato OpenAPI de /organization-modules removido no merge 2b918e0a, eliminar perda de atualização concorrente (read-modify-write) em módulos da organização, propagar erros reais no AnalyticsController em vez de retornar HTTP 200 com zeros, unificar calendário comercial Brasília no AnalyticsUseCases, corrigir paginação full-text de empresas com Meilisearch, exigir conteúdo válido em sequências de cadência, corrigir predicado tautológico em process-guards.ts, eliminar deadlock SSE no shutdown HTTP e limpar código legado/redundante em auth e billing.
- **Agentes Responsáveis (Líderes):** `18, 04, 16, 01, 17, 12`
- **Achados Incluídos (10):** `DEBT-API-001, DEBT-UX-003, DEBT-OPS-006, DEBT-OPS-007, DEBT-ONB-001, DEBT-UX-002, DEBT-UX-004, DEBT-CAD-001, DEBT-CODE-001, DEBT-BILL-003`
- **Arquivos e Módulos Afetados:** `docs/openapi.yaml`, `src/features/analytics/presentation/AnalyticsController.ts`, `src/features/analytics/application/AnalyticsUseCases.ts`, `src/features/companies/infra/PrismaCompanyRepository.ts`, `src/lib/search/index.ts`, `src/features/organization-modules/services/organizationModules.service.ts`, `src/features/organization-modules/infra/SettingOrganizationModulesRepository.ts`, `src/features/cadence/domain/cadence.ts`, `src/features/cadence/infra/dispatchers/CadenceDispatchers.ts`, `src/lib/process-guards.ts`, `src/bootstrap/shutdown.ts`, `src/lib/auth.ts`, `src/lib/voice-hub/services/billingService.ts`
- **Pré-requisitos:** Ondas 00 e 01 concluídas | Acordo de contrato de erro e paginação com Agente 18 antes de alterar respostas HTTP de Analytics e Busca
- **Ordem Recomendada de Execução:** 1º Restaurar docs/openapi.yaml (Agente 18) -> 2º Corrigir process-guards.ts e shutdown.ts (Agente 16) -> 3º Corrigir AnalyticsController, AnalyticsUseCases e paginação em PrismaCompanyRepository (Agente 04) -> 4º Aplicar transação/CAS em organizationModules.service.ts, remover user.count redundante em auth.ts e corrigir clamp de data em billingService.ts (Agente 01/12) -> 5º Integrar validação de conteúdo de cadência (Agente 17) -> 6º Revisão (Agente 24).
- **Critérios de Entrada:** Contratos de erro HTTP e paginação validados pelo Agente 18.
- **Critérios de Saída (Aprovação):** verify:openapi-drift passa com exit 0; verify-02.cjs, verify-06.cjs, verify-onboarding.mjs, verify-billing.mjs e verify-cadence.mjs passam 100% nos cenários corrigidos; parecer APROVADO do Agente 24.
- **Testes Obrigatórios:** npm run verify:openapi-drift | Reproduções de regressão para AnalyticsController (erro 500 vs banco vazio 200), Meilisearch (45 hits paginados 20/20/5), barrier test de enable(A)+enable(B) simultâneos, process-guards ECONNRESET não-Redis e SIGTERM com cliente SSE ativo
- **Evidências Necessárias:** Saídas de execução de todos os scripts de verificação com exit 0 | Teste de fuso horário America/Sao_Paulo na virada de mês (2026-10-01T01:00Z pertencente a setembro) | Parecer formal do Agente 24
- **Riscos de Regressão:** Frontend de Analytics deve tratar status HTTP 5xx exibindo estado de erro/retry em vez de quebrar ao deixar de receber 200 com zeros | Alteração da ordem de fechamento SSE/HTTP no shutdown exige teste de não regressão para requisições HTTP em voo
- **Estratégia de Rollback:** Reverter commits individuais por subdomínio (OpenAPI, Runtime, Analytics/Busca, Onboarding/Auth, Cadência) preservando independência entre os PRs.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-API-001** (`NEW-MERGE-2B918E0A-OPENAPI`) | **P1** | `DT-02` | Contratos / OpenAPI | `Agente 18` | P (< 1 dia) | Baixo (restauração de especificação OpenAPI) | Não iniciada (regressão ativa em main @ c7e33a91) |
| **DEBT-UX-003** (`DEBT-20261014-UX-003`) | **P1** | `DT-31` | Analytics | `Agente 04` | M | médio | Não iniciada (aguarda autorização) |
| **DEBT-OPS-006** (`DEBT-20261014-OPS-006`) | **P1** | `DT-19` | Runtime | `Agente 16` | P | Médio: fluxo de execução/falha | Não iniciada (aguarda autorização) |
| **DEBT-OPS-007** (`DEBT-20261014-OPS-007`) | **P1** | `DT-21` | Runtime HTTP | `Agente 16` | P | Médio: fluxo de execução/falha | Não iniciada (aguarda autorização) |
| **DEBT-ONB-001** (`DEBT-20261014-ONB-001`) | **P2** | `DT-29` | onboarding | `Agente 01` | Médio | Médio | Não iniciada (aguarda autorização) |
| **DEBT-UX-002** (`DEBT-20261014-UX-002`) | **P2** | `DT-36` | Empresas / busca | `Agente 04` | M | médio | Não iniciada (aguarda autorização) |
| **DEBT-UX-004** (`DEBT-20261014-UX-004`) | **P2** | `DT-32` | Analytics / calendário | `Agente 04` | M | médio | Não iniciada (aguarda autorização) |
| **DEBT-CAD-001** (`PROD-05`) | **P2** | `DT-04` | Cadência Comercial | `Agente 17` | P (< 1 dia) | Baixo | Patch candidato isolado (não integrado em main) |
| **DEBT-CODE-001** (`DEBT-20261014-CODE-001`) | **P3** | `DT-01` | auth | `Agente 01` | Baixo | Baixo | Não iniciada (aguarda autorização) |
| **DEBT-BILL-003** (`DEBT-20261014-BILL-003`) | **P3** | `DT-28` | billing | `Agente 12` | Baixo | Baixo | Não iniciada (aguarda autorização) |

### Onda 04 — Frontend, Design System, Resiliência de UI, Mobile e PWA

- **Objetivo:** Corrigir guarda de loading no Copiloto Executivo para exibir erro/retry na falha inicial, individualizar estado de leitura de notificações broadcast por usuário, sincronizar deep links nativos Android com o catálogo de rotas web, fornecer os ícones PNG oficiais declarados no manifest PWA e validar endpoint mobile Capacitor.
- **Agentes Responsáveis (Líderes):** `02, 07, 09, 11, 01`
- **Achados Incluídos (5):** `DEBT-UX-008, DEBT-NOT-001, DEBT-UX-005, DEBT-UX-006, DEBT-MOB-001`
- **Arquivos e Módulos Afetados:** `src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx`, `prisma/schema.prisma`, `src/features/notifications/notification.service.ts`, `android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java`, `src/App.tsx`, `src/lib/navigationBus.ts`, `vite.config.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `capacitor.config.ts`, `.github/workflows/android-build.yml`, `.github/workflows/ios-build.yml`
- **Pré-requisitos:** Handoff de schema concluído pelo Agente 01 para tabela/relação de leitura de notificação por usuário antes da alteração no serviço pelo Agente 02 | Fornecimento dos ícones PNG oficiais 192x192 e 512x512 pelo Agente 11
- **Ordem Recomendada de Execução:** 1º Corrigir guarda loading em EliteCommercialAgentWorkspace.tsx (Agente 07) -> 2º Migrar schema de estado de leitura de notificações broadcast (Agente 01) e atualizar notification.service.ts (Agente 02) -> 3º Adicionar ícones PWA em public/ (Agente 11/09) e alinhar MainActivity.java + capacitor.config.ts (Agente 09) -> 4º Revisão (Agente 24).
- **Critérios de Entrada:** Onda 03 concluída e ativos visuais de ícones disponibilizados pelo Agente 11.
- **Critérios de Saída (Aprovação):** Falha inicial da API exibe botão de retry no Copiloto; leitura de broadcast por Usuário A mantém unread=1 para Usuário B; paridade 100% entre VALID_TABS nativo e rotas web ativas; todos os caminhos do manifest PWA existem em public/ e dist/.
- **Testes Obrigatórios:** Teste unitário/componente de EliteCommercialAgentWorkspace com erro 500 inicial | Teste multi-usuário A/B de leitura de notificação broadcast | Script de paridade de sets entre MainActivity.java e navigationBus.ts + verificação de existência e dimensões de ícones PWA
- **Evidências Necessárias:** Screenshots desktop/mobile (1280px, 768px, 390px) dos estados de erro/retry e notificações | Saída do verificador de paridade de deep links e precache PWA (exit 0) | Parecer formal do Agente 24
- **Riscos de Regressão:** Migração de leitura de notificações broadcast deve preservar notificações diretas (userId != null) sem perda de histórico | Sincronização de deep links exige manter bloqueio explícito para rotas legadas desativadas
- **Estratégia de Rollback:** Reverter commits de UI/Mobile e, se necessário, manter fallback de leitura em Notification enquanto a tabela de recibos por usuário é desativada.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-UX-008** (`PROD-04`) | **P2** | `DT-03` | Frontend / Copiloto | `Agente 07` | P (< 1 dia) | Baixo | Patch candidato isolado (não integrado em main) |
| **DEBT-NOT-001** (`DEBT-20261014-NOT-001`) | **P2** | `DT-35` | Notificações | `Agente 02` | M | Médio: schema/contrato/UI | Não iniciada (aguarda autorização) |
| **DEBT-UX-005** (`DEBT-20261014-UX-005`) | **P2** | `DT-34` | Android / navegação | `Agente 09` | M | médio | Não iniciada (aguarda autorização) |
| **DEBT-UX-006** (`DEBT-20261014-UX-006`) | **P2** | `DT-34` | PWA / assets | `Agente 09` | M | médio | Não iniciada (aguarda autorização) |
| **DEBT-MOB-001** (`OPS-004`) | **P2** | `DT-16` | Mobile / Configuração | `Agente 09` | P (< 1 dia) | Baixo | Não iniciada (aguarda decisão de endpoint mobile) |

### Onda 05 — Integrações Externas, Bitrix24, Filas WhatsApp e Busca Híbrida

- **Objetivo:** Estender o escopo do AbortController de timeout do cliente Bitrix24 até o término do parsing do corpo (response.json), corrigir o detector de worker do Redis/WhatsApp para impedir reenfileiramento em loop e diferenciar falha de banco de dados de resultado vazio na busca textual/híbrida da base de conhecimento.
- **Agentes Responsáveis (Líderes):** `16, 06, 07`
- **Achados Incluídos (3):** `DEBT-QUEUE-001, DEBT-INT-001, DEBT-UX-007`
- **Arquivos e Módulos Afetados:** `src/lib/queue/redis.ts`, `src/features/integrations/whatsapp/whatsapp.service.ts`, `src/lib/queue/whatsappCommand.worker.ts`, `src/features/integrations/bitrix/service/client.ts`, `src/features/knowledge/search.service.ts`
- **Pré-requisitos:** Respeito ao slot exclusivo de filas entre Agentes 16, 06 e 07 | Onda 03 concluída
- **Ordem Recomendada de Execução:** 1º Integrar correção de regex em src/lib/queue/redis.ts e guarda em whatsappCommand.worker.ts (Agente 16/06) -> 2º Mover clearTimeout(timeout) para bloco finally após response.json() em bitrix/service/client.ts (Agente 06) -> 3º Propagar status de erro de busca textual em knowledge/search.service.ts (Agente 07) -> 4º Revisão (Agente 24).
- **Critérios de Entrada:** Slot de filas alocado sequencialmente pelo Agente 00.
- **Critérios de Saída (Aprovação):** verify-worker-detector.mjs passa 6/6; cliente Bitrix aborta em 15s quando mock entrega headers mas trava o stream do body; hybridSearch sinaliza erro explícito quando FTS e ILIKE falham simultaneamente com busca semântica indisponível.
- **Testes Obrigatórios:** node docs/audits/launch-2026-10-14/evidence/verify-worker-detector.mjs | Teste unitário com fake stream Bitrix que envia cabeçalhos HTTP 200 e retém o corpo além do timeout | Teste unitário de hybridSearch com falha simultânea de PostgreSQL e Qdrant/embeddings
- **Evidências Necessárias:** Logs de execução dos testes unitários e de integração isolada (exit 0) | Parecer formal do Agente 24
- **Riscos de Regressão:** Alteração de timeout no cliente Bitrix24 pode abortar payloads legítimos muito grandes se o limite de 15s for insuficiente para extrações pesadas (usar timeout configurável por operação)
- **Estratégia de Rollback:** Reverter commits individuais de cliente Bitrix, fila Redis ou busca de conhecimento sem impacto em schema.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-QUEUE-001** (`FND-02`) | **P1** | `DT-25` | Filas / WhatsApp | `Agente 16` | P (< 1 dia) | Baixo | Patch candidato isolado (não integrado em main) |
| **DEBT-INT-001** (`DEBT-20261014-INT-001`) | **P2** | `DT-09` | Bitrix | `Agente 06` | P | Médio: fluxo de execução/falha | Não iniciada (aguarda autorização) |
| **DEBT-UX-007** (`DEBT-20261014-UX-007`) | **P2** | `DT-36` | Base de conhecimento / busca | `Agente 07` | M | médio | Não iniciada (aguarda autorização) |

### Onda 06 — Inteligência Artificial, Copiloto Executivo, Enxame e Quotas por Tier

- **Objetivo:** Substituir métricas financeiras fabricadas por constantes no Copiloto Executivo por dados reais do tenant, conectar as ações de NBA (executar/adiar) e o trace de missão ao estado real persistido no banco com verificação LGPD verdadeira, e aplicar enforceTokenQuota antes do início de streamChatCompletion.
- **Agentes Responsáveis (Líderes):** `07, 23, 13, 04, 18`
- **Achados Incluídos (4):** `DEBT-AI-002, DEBT-AI-003, DEBT-AI-004, DEBT-AI-001`
- **Arquivos e Módulos Afetados:** `src/features/intelligence/routes/commercial-agent.routes.ts`, `src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx`, `src/lib/ai/gateway/streaming.ts`, `src/lib/ai/gateway/chat-model.ts`
- **Pré-requisitos:** Contratos de Analytics (Onda 03) e Resiliência de UI (Onda 04) concluídos | Definição de política de contabilização de tokens em streaming pelo Agente 23
- **Ordem Recomendada de Execução:** 1º Aplicar enforceTokenQuota em src/lib/ai/gateway/streaming.ts (Agente 07/23) -> 2º Conectar commercial-agent.routes.ts às fontes reais de Analytics/Metas, ledger de NBA e trace de missão por tenant (Agente 07/04/13/18) -> 3º Validar persistência real no banco (Agente 22) e Revisão (Agente 24).
- **Critérios de Entrada:** Onda 03 e Onda 05 concluídas.
- **Critérios de Saída (Aprovação):** Zero constantes financeiras hardcoded em commercial-agent.routes.ts; execução/adiamento de NBA gravado no banco e preservado após F5; trace de missão inexistente retorna 404; quota excedida bloqueia streaming antes do fetch ao provedor LLM.
- **Testes Obrigatórios:** Suíte de integração de commercial-agent.routes.ts com banco vazio, >10 leads reais, leads deletados e múltiplos tenants | Teste unitário de streamChatCompletion com quota de tier esgotada vs disponível
- **Evidências Necessárias:** Comprovação de paridade entre banco PostgreSQL e payload da API pelo Agente 22 | Parecer formal do Agente 24
- **Riscos de Regressão:** Tenants sem negócios cadastrados ou sem metas passarão a ver estado vazio/indisponível honesto em vez de R$ 200.000 fabricados (comportamento correto exigido por B-06) | Bloqueio de streaming para tenants que já excederam a quota de tokens premium do seu tier
- **Estratégia de Rollback:** Desabilitar temporariamente os botões de ação NBA na UI com badge honesta de 'Indisponível' caso o dispatcher apresente instabilidade; reverter commit da rota.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-AI-002** (`PROD-01`) | **P1** | `DT-10` | Inteligência Comercial / Copiloto | `Agente 07` | M (1–3 dias) | Médio (altera payload consumido pelo frontend do Copiloto) | Não iniciada (aguarda contrato 07+04+18 e autorização) |
| **DEBT-AI-003** (`PROD-02`) | **P1** | `DT-10` | Inteligência Comercial / Copiloto | `Agente 07` | M (1–3 dias) | Médio | Patch parcial UI candidato isolado; backend pendente |
| **DEBT-AI-004** (`PROD-03`) | **P1** | `DT-10` | Inteligência Comercial / Enxame | `Agente 07` | M (1–3 dias) | Médio | Não iniciada (aguarda autorização) |
| **DEBT-AI-001** (`DEBT-20261014-AI-001`) | **P2** | `DT-10` | IA streaming | `Agente 23` | P | Médio: fluxo de execução/falha | Não iniciada (aguarda autorização) |

### Onda 07 — Performance, Escalabilidade e Eficiência de Consultas

- **Objetivo:** Substituir o carregamento integral em memória de todas as linhas de AILog do período (findMany sem limite em PrismaUsageRepository.ts e agregação em JS no UsageUseCases.ts) por agregação SQL groupBy/SUM no PostgreSQL ou paginação estritamente limitada.
- **Agentes Responsáveis (Líderes):** `01, 23, 07`
- **Achados Incluídos (1):** `DEBT-PERF-001`
- **Arquivos e Módulos Afetados:** `src/features/billing/infra/PrismaUsageRepository.ts`, `src/features/billing/application/UsageUseCases.ts`
- **Pré-requisitos:** Onda 06 concluída
- **Ordem Recomendada de Execução:** 1º Implementar agregação SQL / groupBy no PrismaUsageRepository.ts (Agente 01) -> 2º Adaptar UsageUseCases.ts preservando o formato exato do DTO de resposta (Agente 01/23) -> 3º Executar benchmark comparativo de memória e latência (Agente 08/23) -> 4º Revisão (Agente 24).
- **Critérios de Entrada:** Especificação de fuso horário de faturamento confirmada entre Agente 01 e Agente 23.
- **Critérios de Saída (Aprovação):** Consumo de memória constante O(dias + modelos) independente do número total de linhas em AILog; paridade matemática exata com os totais anteriores.
- **Testes Obrigatórios:** Teste de integração comparando totais por modelo, prompt e dia em dataset sintético de 50.000 registros de AILog | Verificação de isolamento RLS por organizationId na query agregada
- **Evidências Necessárias:** Relatório de memória/latência antes e depois da agregação SQL | Parecer formal do Agente 24
- **Riscos de Regressão:** Divergência de agrupamento diário caso o truncamento de data no SQL use fuso horário diferente do esperado pelo contrato de billing
- **Estratégia de Rollback:** Reverter para consulta paginada por cursor com take máximo caso a query SQL agregada necessite de ajuste de índice.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-PERF-001** (`DEBT-20261014-PERF-001`) | **P2** | `DT-04` | usage | `Agente 01` | Médio | Médio | Não iniciada (aguarda autorização) |

### Onda 08 — QA, Descoberta Completa de Testes e Observabilidade PromQL

- **Objetivo:** Incluir os 62 arquivos de teste co-localizados em src/** (atualmente ignorados por vitest.unit.config.ts) na descoberta oficial de testes unitários sem mascarar falhas, e corrigir a incompatibilidade de labels nos vetores PromQL do alerta AIBudgetOverrun.
- **Agentes Responsáveis (Líderes):** `14, 08, 10, 23`
- **Achados Incluídos (2):** `DEBT-OPS-001, DEBT-FIN-001`
- **Arquivos e Módulos Afetados:** `vitest.unit.config.ts`, `infrastructure/observability/alert.rules.yml`, `src/lib/ai/metrics.ts`
- **Pré-requisitos:** Ondas 00 a 07 concluídas
- **Ordem Recomendada de Execução:** 1º Expandir test.include em vitest.unit.config.ts para cobrir src/**/*.test.{ts,tsx} e triar eventuais falhas nos 62 arquivos (Agente 14/08) -> 2º Ajustar expressão PromQL com sum() e correspondência de labels em alert.rules.yml (Agente 10/23) -> 3º Revisão (Agente 24).
- **Critérios de Entrada:** Ambiente de testes completo do Agente 14 ativo.
- **Critérios de Saída (Aprovação):** 100% dos arquivos *.test.ts e *.test.tsx sob src/ e tests/unit/ descobertos e aprovados (560+ arquivos de teste); promtool test rules aprovando o disparo de AIBudgetOverrun.
- **Testes Obrigatórios:** npm run test:unit verificando a contagem de arquivos executados (>= 560 suítes) | Teste negativo introduzindo falha sintética em arquivo co-localizado fora de __tests__ para provar bloqueio do runner | Validação sintática e de regras do alert.rules.yml
- **Evidências Necessárias:** Log completo do Vitest com todas as 62 suítes anteriormente excluídas passando | Parecer formal do Agente 24
- **Riscos de Regressão:** Alguns dos 62 testes co-localizados em src/features/voice-hub/** e src/lib/voice-hub/** podem exigir ajuste de mocks globais (ex. window.matchMedia) ao entrarem no gate unitário principal
- **Estratégia de Rollback:** Separar suítes legadas de voice-hub em job dedicado bloqueante caso haja conflito de ambiente JSDOM vs Node, nunca voltando a ignorá-las silenciosamente.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-OPS-001** (`DEBT-20261014-OPS-001`) | **P1** | `DT-08` | testes | `Agente 14` | M (1–3 dias de engenharia com ambiente disponível) | moderado | Não iniciada (aguarda autorização) |
| **DEBT-FIN-001** (`DEBT-20261014-FIN-001`) | **P2** | `DT-27` | Observabilidade IA | `Agente 10` | P | Médio: fluxo de execução/falha | Não iniciada (aguarda autorização) |

### Onda 09 — Governança, Documentação Operacional e Certificação de Release

- **Objetivo:** Alinhar a política Local-First com o gatilho automático de publicação de imagem no GHCR (.github/workflows/docker-publish.yml), corrigir a referência ao arquivo inexistente EXECUCAO-ONDAS.md sob decisão humana, atualizar os comandos de compose em LOCAL_FIRST.md/GO-LIVE-CHECKLIST.md, reconciliar os 13 handoffs históricos contraditórios e executar o gate final completo para certificação de release.
- **Agentes Responsáveis (Líderes):** `00, 08, 18, 24`
- **Achados Incluídos (4):** `DEBT-GOV-002, DEBT-DOC-001, DEBT-GOV-003, DEBT-GOV-001`
- **Arquivos e Módulos Afetados:** `.github/workflows/docker-publish.yml`, `docs/development/LOCAL_FIRST.md`, `docs/release/GO-LIVE-CHECKLIST.md`, `.agents/prompts/00-coordenador.md`, `.agents/README.md`, `.agents/handoffs/**`, `.agents/reviews/checklist-handoffs.html`
- **Pré-requisitos:** Decisão humana explícita sobre: (a) manter ou desabilitar workflow_run automático em docker-publish.yml durante o modo Local-First, e (b) atualizar a referência a EXECUCAO-ONDAS.md em .agents/prompts/00-coordenador.md (AGENTS.md §5) | Ondas 00 a 08 concluídas e aprovadas
- **Ordem Recomendada de Execução:** 1º Aplicar ajustes em LOCAL_FIRST.md, GO-LIVE-CHECKLIST.md e docker-publish.yml conforme decisão humana (Agente 08/18) -> 2º Reconciliar cabeçalhos dos handoffs contraditórios e regenerar checklist-handoffs.html (Agente 00) -> 3º Executar todos os gates globais no mesmo commit SHA (Agente 08/14) -> 4º Emitir certificação final independente (Agente 24).
- **Critérios de Entrada:** Todas as ondas técnicas (00 a 08) aprovadas e decisões humanas de governança registradas.
- **Critérios de Saída (Aprovação):** Zero links obrigatórios quebrados; zero handoffs com contradição entre cabeçalho e resolução; todos os 46 checks anteriormente 'Não verificados' executados no ambiente integrado com exit 0; parecer final APROVADO do Agente 24.
- **Testes Obrigatórios:** Execução completa de npm run release:check (lint, typecheck, test:architecture, test:unit, test:integration, test:e2e, build, npm audit, gitleaks) | node scripts/generate-handoffs-checklist.cjs
- **Evidências Necessárias:** Logs completos de todos os gates verdes no HEAD candidato | Parecer final de certificação de release assinado pelo Agente 24
- **Riscos de Regressão:** Edição de arquivos em .agents/prompts/ sem autorização humana violaria AGENTS.md §5 — executar exclusivamente após confirmação do usuário
- **Estratégia de Rollback:** Reverter alterações documentais/workflows via Git; nenhuma operação de deploy em produção ocorre sem acionamento explícito posterior do Agente 08A.

| ID do Achado | Prioridade | Categoria | Módulo | Agente Dono | Esforço | Risco de Regressão | Status Atual |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **DEBT-GOV-002** (`DEBT-20261014-GOV-002`) | **P2** | `DT-13` | CI/documentação | `Agente 00` | M (1–3 dias de engenharia com ambiente disponível) | moderado | Não iniciada (aguarda autorização) |
| **DEBT-DOC-001** (`OPS-003`) | **P2** | `DT-11` | Documentação / DevOps | `Agente 08` | P (< 1 dia) | Baixo | Patch candidato isolado (não integrado em main) |
| **DEBT-GOV-003** (`HANDOFFS-20261009-13-REPROVADOS`) | **P2** | `DT-13` | Governança / Handoffs | `Agente 00` | P (< 1 dia) | Baixo | Parcialmente saneado (2 de 13 reconciliados em e13b53dc; 11 permanecem abertos) |
| **DEBT-GOV-001** (`DEBT-20261014-GOV-001`) | **P3** | `DT-11` | governança | `Agente 00` | M (1–3 dias de engenharia com ambiente disponível) | moderado | Não iniciada (aguarda autorização) |

## 3. Backlog Consolidado Ordenado por Prioridade, Risco e Dependência (40 Achados)

| Ordem | ID Canônico | Ref. Origem | Prioridade | Onda | Categoria | Agente | Título Objetivo | Arquivo Principal | Esforço |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: |
| 1 | **DEBT-GATE-001** | `OPS-001` | **P1** | Onda 00 | `DT-08` | `08` | Gate local de lançamento (scripts/release-gate.js) emite STATUS: GO mesmo com typecheck e lint falhando | [`scripts/release-gate.js:38-65`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/release-gate.js#L38-L65) | P (< 1 dia) |
| 2 | **DEBT-DB-001** | `OPS-002` | **P1** | Onda 01 | `DT-05` | `01` | Guia canônico LOCAL_FIRST.md orienta aplicação a conectar no PostgreSQL com superusuário de bootstrap (bypass de RLS) | [`docs/development/LOCAL_FIRST.md:35-45`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/development/LOCAL_FIRST.md#L35-L45) | P (< 1 dia) |
| 3 | **DEBT-DB-002** | `NEW-MERGE-2B918E0A-DIALER-SQL` | **P1** | Onda 01 | `DT-05` | `01` | Repositórios SQL nativos do discador (PgCampaignRepository/PgLeadRepository) não filtram organization_id explicitamente | [`src/features/cadence/dialer/infrastructure/db/repositories/PgCampaignRepository.ts:57-71`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/cadence/dialer/infrastructure/db/repositories/PgCampaignRepository.ts#L57-L71) | M (1–3 dias) |
| 4 | **DEBT-LGPD-001** | `FND-01` | **P1** | Onda 01 | `DT-06` | `01` | Exclusão LGPD pode concluir sem gravar supressão multicanal (OptOutRecord) | [`src/shared/services/dataSubjectErasure.service.ts:115-135`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/services/dataSubjectErasure.service.ts#L115-L135) | P (< 1 dia) |
| 5 | **DEBT-LGPD-002** | `FND-03` | **P1** | Onda 01 | `DT-06` | `01A` | Memória de agentes (AgentMemory) não pode ser localizada por titular para exclusão individual LGPD | [`prisma/schema.prisma:1766-1782`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/schema.prisma#L1766-L1782) | M (1–3 dias) |
| 6 | **DEBT-SEC-001** | `DEBT-20261014-SEC-001` | **P1** | Onda 01 | `DT-06` | `15` | URLs de autenticação sensíveis são escritas em logs no fallback sem SMTP | [`src/lib/auth.ts:127-132`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L127-L132) | Baixo |
| 7 | **DEBT-UX-001** | `DEBT-20261014-UX-001` | **P1** | Onda 01 | `DT-34` | `09` | Cache PWA de CRM não é particionado por identidade autenticada | [`vite.config.ts:61-66`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vite.config.ts#L61-L66) | M |
| 8 | **DEBT-OPS-004** | `DEBT-20261014-OPS-004` | **P1** | Onda 02 | `DT-22` | `10` | Aceite do restore drill ignora status Prisma e limite RTO | [`scripts/backup/run-backup-restore-drill.ts:298-302`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/backup/run-backup-restore-drill.ts#L298-L302) | M (1–3 dias de engenharia com ambiente disponível) |
| 9 | **DEBT-API-001** | `NEW-MERGE-2B918E0A-OPENAPI` | **P1** | Onda 03 | `DT-02` | `18` | Merge de stash antigo (2b918e0a) removeu 124 linhas de /organization-modules do docs/openapi.yaml | [`docs/openapi.yaml:10225-10235`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/openapi.yaml#L10225-L10235) | P (< 1 dia) |
| 10 | **DEBT-OPS-006** | `DEBT-20261014-OPS-006` | **P1** | Onda 03 | `DT-19` | `16` | Guard classifica falhas de qualquer origem como Redis | [`src/lib/process-guards.ts:48-52`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/process-guards.ts#L48-L52) | P |
| 11 | **DEBT-OPS-007** | `DEBT-20261014-OPS-007` | **P1** | Onda 03 | `DT-21` | `16` | Shutdown HTTP espera fechar conexão SSE antes de encerrá-la | [`src/bootstrap/shutdown.ts:69-73`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/bootstrap/shutdown.ts#L69-L73) | P |
| 12 | **DEBT-UX-003** | `DEBT-20261014-UX-003` | **P1** | Onda 03 | `DT-31` | `04` | Analytics devolve sucesso e zeros após erro de agregação | [`src/features/analytics/presentation/AnalyticsController.ts:24-54`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/presentation/AnalyticsController.ts#L24-L54) | M |
| 13 | **DEBT-QUEUE-001** | `FND-02` | **P1** | Onda 05 | `DT-25` | `16` | Worker é classificado como processo web e pode reenfileirar mensagens WhatsApp sem enviar | [`src/lib/queue/redis.ts:8-14`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/queue/redis.ts#L8-L14) | P (< 1 dia) |
| 14 | **DEBT-AI-002** | `PROD-01` | **P1** | Onda 06 | `DT-10` | `07` | Copiloto Executivo exibe receita, meta, pipeline e forecast fabricados por constantes | [`src/features/intelligence/routes/commercial-agent.routes.ts:35-85`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/routes/commercial-agent.routes.ts#L35-L85) | M (1–3 dias) |
| 15 | **DEBT-AI-003** | `PROD-02` | **P1** | Onda 06 | `DT-10` | `07` | Botões de executar e adiar Next Best Action (NBA) afirmam ação concluída sem execução ou persistência | [`src/features/intelligence/routes/commercial-agent.routes.ts:210-245`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/routes/commercial-agent.routes.ts#L210-L245) | M (1–3 dias) |
| 16 | **DEBT-AI-004** | `PROD-03` | **P1** | Onda 06 | `DT-10` | `07` | Trace de missão do Copiloto e aprovação de consentimento LGPD são retornados de forma sintética/fictícia | [`src/features/intelligence/routes/commercial-agent.routes.ts:140-208`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/routes/commercial-agent.routes.ts#L140-L208) | M (1–3 dias) |
| 17 | **DEBT-OPS-001** | `DEBT-20261014-OPS-001` | **P1** | Onda 08 | `DT-08` | `14` | 62 testes co-localizados ficam fora da descoberta unitária | [`vitest.unit.config.ts:35-39`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vitest.unit.config.ts#L35-L39) | M (1–3 dias de engenharia com ambiente disponível) |
| 18 | **DEBT-GOV-004** | `PR-741-FALSE-POSITIVES` | **P2** | Onda 00 | `DT-14` | `08A` | PR #741 aberto (tech-debt-audit) contém 176 falsos positivos por grep textual cego e altera formatação de código | [`scripts/run-tech-debt-audit.ts:10-102`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/run-tech-debt-audit.ts#L10-L102) | P (< 1 hora) |
| 19 | **DEBT-OPS-002** | `DEBT-20261014-OPS-002` | **P2** | Onda 00 | `DT-17` | `08` | Reinstalação Prisma na imagem permite resolver versão fora lock | [`Dockerfile:43-47`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/Dockerfile#L43-L47) | M (1–3 dias de engenharia com ambiente disponível) |
| 20 | **DEBT-OPS-003** | `DEBT-20261014-OPS-003` | **P2** | Onda 00 | `DT-07` | `08` | Contexto Docker não exclui cópias e artefatos temporários locais | [`.dockerignore:1-5`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.dockerignore#L1-L5) | M (1–3 dias de engenharia com ambiente disponível) |
| 21 | **DEBT-CAD-001** | `PROD-05` | **P2** | Onda 03 | `DT-04` | `17` | API permite criar cadência sem conteúdo e dispatcher envia texto placeholder para leads reais | [`src/features/cadence/cadence.routes.ts:55-68`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/cadence/cadence.routes.ts#L55-L68) | P (< 1 dia) |
| 22 | **DEBT-ONB-001** | `DEBT-20261014-ONB-001` | **P2** | Onda 03 | `DT-29` | `01` | Mutações concorrentes de módulos podem sobrescrever seleção anterior | [`src/features/organization-modules/services/organizationModules.service.ts:69-74`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/organization-modules/services/organizationModules.service.ts#L69-L74) | Médio |
| 23 | **DEBT-UX-002** | `DEBT-20261014-UX-002` | **P2** | Onda 03 | `DT-36` | `04` | Paginação full-text de empresas restringe resultados ao primeiro lote | [`src/features/companies/infra/PrismaCompanyRepository.ts:44-50`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/companies/infra/PrismaCompanyRepository.ts#L44-L50) | M |
| 24 | **DEBT-UX-004** | `DEBT-20261014-UX-004` | **P2** | Onda 03 | `DT-32` | `04` | Analytics ativo usa calendário UTC apesar do contrato comercial Brasília | [`src/features/analytics/application/AnalyticsUseCases.ts:22-30`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/application/AnalyticsUseCases.ts#L22-L30) | M |
| 25 | **DEBT-MOB-001** | `OPS-004` | **P2** | Onda 04 | `DT-16` | `09` | Build mobile padrão embute URL fallback do Render documentado como desativado | [`capacitor.config.ts:38-46`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/capacitor.config.ts#L38-L46) | P (< 1 dia) |
| 26 | **DEBT-NOT-001** | `DEBT-20261014-NOT-001` | **P2** | Onda 04 | `DT-35` | `02` | Leitura broadcast silencia unread para colegas | [`src/features/notifications/notification.service.ts:94-98`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/notifications/notification.service.ts#L94-L98) | M |
| 27 | **DEBT-UX-005** | `DEBT-20261014-UX-005` | **P2** | Onda 04 | `DT-34` | `09` | Deep links nativos Android divergem do catálogo de rotas web | [`android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java:55-65`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java#L55-L65) | M |
| 28 | **DEBT-UX-006** | `DEBT-20261014-UX-006` | **P2** | Onda 04 | `DT-34` | `09` | Ícones declarados no manifest PWA não existem em public | [`vite.config.ts:30-40`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vite.config.ts#L30-L40) | M |
| 29 | **DEBT-UX-008** | `PROD-04` | **P2** | Onda 04 | `DT-03` | `07` | Falha inicial da API prende o Copiloto Executivo em estado de carregamento infinito (spinner permanente) | [`src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx:124-145`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx#L124-L145) | P (< 1 dia) |
| 30 | **DEBT-INT-001** | `DEBT-20261014-INT-001` | **P2** | Onda 05 | `DT-09` | `06` | Timeout Bitrix encerra antes leitura do corpo | [`src/features/integrations/bitrix/service/client.ts:159-216`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/bitrix/service/client.ts#L159-L216) | P |
| 31 | **DEBT-UX-007** | `DEBT-20261014-UX-007` | **P2** | Onda 05 | `DT-36` | `07` | Busca textual da base retorna lista vazia quando banco falha | [`src/features/knowledge/search.service.ts:178-180`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/knowledge/search.service.ts#L178-L180) | M |
| 32 | **DEBT-AI-001** | `DEBT-20261014-AI-001` | **P2** | Onda 06 | `DT-10` | `23` | Streaming não aplica quota por tier | [`src/lib/ai/gateway/streaming.ts:32-36`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/gateway/streaming.ts#L32-L36) | P |
| 33 | **DEBT-PERF-001** | `DEBT-20261014-PERF-001` | **P2** | Onda 07 | `DT-04` | `01` | Resumo de consumo carrega todas as linhas AILog do período | [`src/features/billing/infra/PrismaUsageRepository.ts:11-16`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/billing/infra/PrismaUsageRepository.ts#L11-L16) | Médio |
| 34 | **DEBT-FIN-001** | `DEBT-20261014-FIN-001` | **P2** | Onda 08 | `DT-27` | `10` | Alerta orçamento IA usa vetores incompatíveis | [`infrastructure/observability/alert.rules.yml:260-264`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/infrastructure/observability/alert.rules.yml#L260-L264) | P |
| 35 | **DEBT-DOC-001** | `OPS-003` | **P2** | Onda 09 | `DT-11` | `08` | Instrução de subir stack em LOCAL_FIRST.md e GO-LIVE-CHECKLIST.md omite overlay do PostgreSQL obrigatório para migrations | [`docs/development/LOCAL_FIRST.md:65-74`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/development/LOCAL_FIRST.md#L65-L74) | P (< 1 dia) |
| 36 | **DEBT-GOV-002** | `DEBT-20261014-GOV-002` | **P2** | Onda 09 | `DT-13` | `00` | Política local-first conflita com publicação automática GHCR | [`.github/workflows/docker-publish.yml:11-15`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.github/workflows/docker-publish.yml#L11-L15) | M (1–3 dias de engenharia com ambiente disponível) |
| 37 | **DEBT-GOV-003** | `HANDOFFS-20261009-13-REPROVADOS` | **P2** | Onda 09 | `DT-13` | `00` | 13 handoffs históricos marcam 'Status: resolvido' no cabeçalho em contradição com o corpo (Postponed / Deploy Simulado) | [`.agents/reviews/handoffs-2026-10-09-24.md:28-55`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/reviews/handoffs-2026-10-09-24.md#L28-L55) | P (< 1 dia) |
| 38 | **DEBT-BILL-003** | `DEBT-20261014-BILL-003` | **P3** | Onda 03 | `DT-28` | `12` | Função legada de renovação normaliza mês inválido e salta mês previsto | [`src/lib/voice-hub/services/billingService.ts:149-154`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/voice-hub/services/billingService.ts#L149-L154) | Baixo |
| 39 | **DEBT-CODE-001** | `DEBT-20261014-CODE-001` | **P3** | Onda 03 | `DT-01` | `01` | Signup executa user.count redundante para decidir ADMIN idêntico nos dois ramos | [`src/lib/auth.ts:345-350`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L345-L350) | Baixo |
| 40 | **DEBT-GOV-001** | `DEBT-20261014-GOV-001` | **P3** | Onda 09 | `DT-11` | `00` | Leitura obrigatória referencia plano de ondas ausente | [`.agents/prompts/00-coordenador.md:13-17`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/prompts/00-coordenador.md#L13-L17) | M (1–3 dias de engenharia com ambiente disponível) |
