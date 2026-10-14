# Birthub 360° — Relatório Técnico Completo da Auditoria Forense de Dívidas Técnicas

**Orquestrador:** Agente 00 | **Controle de Qualidade:** Agente 08 | **Revisão Independente:** Agente 24  
**Repositório:** [`MaarkssN/Birthub-360`](https://github.com/MaarkssN/Birthub-360) | **Branch:** `main` | **Commit Auditado:** [`c7e33a911b734ddb3131a3ad08d421efbc823fd4`](https://github.com/MaarkssN/Birthub-360/commit/c7e33a911b734ddb3131a3ad08d421efbc823fd4)  
**Total de Categorias:** 40 (`DT-01` a `DT-40`) | **Total de Verificações:** 216 | **Total de Achados Canônicos Confirmados:** 40

## 1. Reconhecimento Forense, Governança e Stack Tecnológica Real (Fase 00)

### 1.1 Estado do Git, Branches e Relação entre Commits

- **Branch Principal (`main`):** Protegida (`protected: true`), posicionada no commit SHA [`c7e33a911b734ddb3131a3ad08d421efbc823fd4`](https://github.com/MaarkssN/Birthub-360/commit/c7e33a911b734ddb3131a3ad08d421efbc823fd4) (`Merge remote-tracking branch 'origin/agente/03-identidade-plataforma-20261013'`, de `2026-10-14T13:42:55Z`).
- **Snapshot Base dos Especialistas:** [`9373fb224a8aba30a39f7d10d1a3ad08d421efbc823fd4` / `9373fb224a8aba30a39f7d10d1a2be639c35af78`](https://github.com/MaarkssN/Birthub-360/commit/9373fb224a8aba30a39f7d10d1a2be639c35af78) (`arquivos novas (#735)`).
- **Merges Subsequentes Inspecionados até o HEAD:**
  - [`23a61ea0519b`](https://github.com/MaarkssN/Birthub-360/commit/23a61ea0519b4154403e71e932901077960f036f): Incorporou artefatos parciais em `docs/audits/debt-2026-10-14/` e `docs/audits/launch-2026-10-14/` (sem o painel HTML `birthub360-checklist-dividas-tecnicas.html`).
  - [`9ae65b1ae691`](https://github.com/MaarkssN/Birthub-360/commit/9ae65b1ae691df553f8c549c30310a657feefbe9) (`0bbc2674d7f3`): Aplicou componentes de layout, brand, login e landing revisados pelo Agente 02.
  - [`2b918e0aefab`](https://github.com/MaarkssN/Birthub-360/commit/2b918e0aefab924d9594b06ad7ce7a46451992ae) (`2512d2b86e61`): Merge de `origin/backup-stash/20261013-4-pg-repositories`, que parametrizou queries em `PgCampaignRepository.ts` e `PgLeadRepository.ts`, porém **removeu acidentalmente 124 linhas de `docs/openapi.yaml`** (`DEBT-API-001`) e manteve SQL do dialer sem predicado `organization_id` (`DEBT-DB-002`).
  - [`c7e33a911b73`](https://github.com/MaarkssN/Birthub-360/commit/c7e33a911b734ddb3131a3ad08d421efbc823fd4) (`2034a143a5a7`): Aplicou tokens e componentes oficiais da identidade visual pelo Agente 03 (`Card`, `Button`, `Dialog`, `Input`, `KpiCard`, `PageTitleCard`, `official-identity.css`).
- **Pull Request Aberto Inspecionado:** [PR `#741`](https://github.com/MaarkssN/Birthub-360/pull/741) (`tech-debt-audit-1898280509423632042`, HEAD [`f0f7bc14fdac`](https://github.com/MaarkssN/Birthub-360/commit/f0f7bc14fdacfab8658cc7bf157d596590f67a8a)) — **REPROVADO** (`DEBT-GOV-004`) por usar script `git grep` superficial que rotulou 176 ocorrências textuais como dívidas e executou `npm run format` alterando código fora de escopo.

### 1.2 Stack Tecnológica Real e Módulos da Plataforma

- **Runtime & Linguagem:** Node.js `22.x` (`.nvmrc` / `.node-version`), TypeScript `5.9` (`tsconfig.json`, `tsconfig.core.json`, `tsconfig.voice.json`).
- **Frontend (`src/`):** React 19, Vite 6 (`vite.config.ts` com `VitePWA`), Tailwind CSS (`src/styles/globals.css`, `src/styles/official-identity.css`), Radix UI (`Dialog`), Floating UI (`Tooltip`), Framer Motion, `@tanstack/react-virtual` (`VirtualTable`), ECharts.
- **Backend (`server.ts`, `src/bootstrap/`, `src/features/`):** Express, Better Auth (`src/lib/auth.ts`), BullMQ (`worker.ts`, `worker-core.ts`, `worker-crm.ts`, `worker-extracoes.ts`, `worker-ia.ts`, `worker-mercado.ts`, `worker-prospecting.ts`), Server-Sent Events (`src/features/notifications/sse.service.ts`).
- **Persistência e Busca (`prisma/`, `src/lib/`):** PostgreSQL 16 (`pgvector`, `pg_trgm`, Row-Level Security) + Prisma ORM `^7.10.0` (`prisma/schema.prisma` com 259 KB, 147 tabelas e 139 migrations), extensão de isolamento multi-tenant (`src/lib/prisma.ts`, `src/lib/tenant-prisma.ts`) e criptografia de campos sensíveis (`src/lib/crypto/secretFields.ts`), Redis (`ioredis`), Meilisearch (`src/lib/search/index.ts`), Qdrant (`src/lib/qdrant/`) e MinIO (`prospector-assets`).
- **Módulos de Domínio (`src/features/` — 51 diretórios):** `activities`, `ai-voice`, `analytics`, `attachments`, `auth`, `automations`, `billing`, `bug-reports`, `cadence`, `calendar`, `chatbook`, `commercial-intelligence`, `companies`, `contacts`, `copilot`, `copiloto-ia`, `crm`, `crm360`, `dashboard`, `design-lab`, `document-editor`, `feature-flags`, `gamification`, `hub`, `integrations` (`bitrix`, `birth-voice`, `email`, `google`, `omie`, `slack`, `stripe`, `threecx`, `whatsapp`), `intelligence`, `job-roles`, `knowledge`, `landing`, `lgpd`, `market-intelligence`, `mesa-tratamento`, `mobile`, `module-access`, `notes`, `notifications`, `onboarding`, `organization-modules`, `playbook`, `predictability`, `prospecting`, `roleplay`, `sales-orchestration`, `settings`, `signals-risks`, `social-selling`, `team`, `temporal-workers`, `voice-hub`, `voice`, `workspace`.

### 1.3 Comandos Oficiais de Qualidade e Auditoria (`package.json`)

- **Typecheck:** `npm run typecheck` (`node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit`)
- **Lint e Formatação:** `npm run lint` (`biome lint src`), `npm run lint:ci`, `npm run format:check`
- **Arquitetura e Contratos:** `npm run test:architecture` (`depcruise` + `verify:architecture-coverage` + `check:hotspots`), `npm run verify:openapi-drift`
- **Testes Automatizados:** `npm run test:unit` (`vitest run -c vitest.unit.config.ts`), `npm run test:integration` (`vitest run -c vitest.integration.config.ts`), `npm run test:e2e` (`playwright test`)
- **Build e Diagnóstico Operacional:** `npm run build` (`vite build` + `esbuild server.ts` + `verify:pwa-precache`), `npm run release:check` (`node scripts/release-gate.js`), `npm run backup:drill`, `npm run local:doctor`, `npm run verify:integrations`, `npm run verify:ai`

## 2. Resumo das 40 Categorias Auditadas (`DT-01` a `DT-40`)

| ID | Categoria | Agente Líder | Total Checks | Conforme | Não Conforme | Parcial | Não Verificado | Achados Associados |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **DT-01** | Código-fonte | `01` | 5 | 1 | **1** | 2 | 1 | `DEBT-CODE-001` |
| **DT-02** | Arquitetura | `01` | 6 | 4 | **1** | 0 | 1 | `DEBT-API-001` |
| **DT-03** | Frontend e UX | `02` | 6 | 4 | **1** | 0 | 1 | `DEBT-UX-008` |
| **DT-04** | Backend e APIs | `01` | 6 | 3 | **2** | 0 | 1 | `DEBT-CAD-001`, `DEBT-PERF-001` |
| **DT-05** | Banco de dados | `01A` | 7 | 3 | **2** | 0 | 2 | `DEBT-DB-001`, `DEBT-DB-002` |
| **DT-06** | Segurança e privacidade | `15` | 7 | 3 | **3** | 0 | 1 | `DEBT-LGPD-001`, `DEBT-LGPD-002`, `DEBT-SEC-001` |
| **DT-07** | Infraestrutura e DevOps | `10` | 5 | 4 | **1** | 0 | 0 | `DEBT-OPS-003` |
| **DT-08** | Testes e QA | `08` | 6 | 3 | **2** | 0 | 1 | `DEBT-GATE-001`, `DEBT-OPS-001` |
| **DT-09** | Integrações externas | `06` | 5 | 4 | **1** | 0 | 0 | `DEBT-INT-001` |
| **DT-10** | Inteligência artificial | `07` | 8 | 3 | **4** | 0 | 1 | `DEBT-AI-002`, `DEBT-AI-003`, `DEBT-AI-004`, `DEBT-AI-001` |
| **DT-11** | Documentação | `18` | 6 | 2 | **3** | 0 | 1 | `DEBT-DOC-001`, `DEBT-GOV-001` |
| **DT-12** | Conhecimento técnico | `00` | 5 | 4 | **0** | 0 | 1 | — |
| **DT-13** | Governança | `00` | 6 | 4 | **1** | 0 | 1 | `DEBT-GOV-002`, `DEBT-GOV-003` |
| **DT-14** | Git e versionamento | `08A` | 6 | 4 | **1** | 0 | 1 | `DEBT-GOV-004` |
| **DT-15** | Revisão de código | `24` | 5 | 3 | **0** | 0 | 2 | — |
| **DT-16** | Configuração | `10` | 6 | 4 | **1** | 0 | 1 | `DEBT-MOB-001` |
| **DT-17** | Build | `08` | 5 | 3 | **1** | 0 | 1 | `DEBT-OPS-002` |
| **DT-18** | Compatibilidade | `02` | 5 | 3 | **1** | 0 | 1 | — |
| **DT-19** | Observabilidade | `10` | 5 | 2 | **2** | 0 | 1 | `DEBT-OPS-006` |
| **DT-20** | Manutenção | `14` | 5 | 4 | **0** | 0 | 1 | — |
| **DT-21** | Disponibilidade | `16` | 5 | 4 | **1** | 0 | 0 | `DEBT-OPS-007` |
| **DT-22** | Recuperação | `10` | 5 | 1 | **1** | 0 | 3 | `DEBT-OPS-004` |
| **DT-23** | Desempenho | `23` | 5 | 4 | **0** | 0 | 1 | — |
| **DT-24** | Cache | `01` | 5 | 4 | **0** | 0 | 1 | — |
| **DT-25** | Filas e eventos | `16` | 6 | 4 | **1** | 0 | 1 | `DEBT-QUEUE-001` |
| **DT-26** | Custos cloud | `10` | 5 | 2 | **0** | 0 | 3 | — |
| **DT-27** | FinOps | `23` | 5 | 4 | **0** | 0 | 1 | `DEBT-FIN-001` |
| **DT-28** | Billing | `01` | 5 | 2 | **1** | 0 | 2 | `DEBT-BILL-003` |
| **DT-29** | Onboarding | `01` | 5 | 3 | **1** | 0 | 1 | `DEBT-ONB-001` |
| **DT-30** | Identidade e permissões | `01` | 5 | 5 | **0** | 0 | 0 | — |
| **DT-31** | Analytics | `04` | 5 | 3 | **1** | 0 | 1 | `DEBT-UX-003` |
| **DT-32** | Internacionalização | `04` | 5 | 3 | **1** | 0 | 1 | `DEBT-UX-004` |
| **DT-33** | SEO | `02` | 5 | 2 | **0** | 0 | 3 | — |
| **DT-34** | Mobile e PWA | `09` | 5 | 2 | **2** | 0 | 1 | `DEBT-UX-001`, `DEBT-UX-005`, `DEBT-UX-006` |
| **DT-35** | Notificações | `06` | 5 | 3 | **1** | 1 | 0 | `DEBT-NOT-001` |
| **DT-36** | Busca | `04` | 5 | 2 | **2** | 0 | 1 | `DEBT-UX-002`, `DEBT-UX-007` |
| **DT-37** | Arquivos | `01` | 5 | 3 | **0** | 1 | 1 | — |
| **DT-38** | Migrações | `01A` | 5 | 4 | **0** | 0 | 1 | — |
| **DT-39** | Produto | `02` | 5 | 4 | **0** | 0 | 1 | — |
| **DT-40** | Continuidade operacional | `00` | 5 | 1 | **1** | 0 | 3 | — |

## 3. Catálogo Forense dos 40 Achados Canônicos Confirmados (Fase 04, 05 e 06)

Todos os 40 achados abaixo foram deduplicados (Fase 06) e comprovados por evidência técnica reproduzível sem expor segredos ou dados pessoais.

### 3.1 [DEBT-GATE-001] Gate local de lançamento (scripts/release-gate.js) emite STATUS: GO mesmo com typecheck e lint falhando

- **Referência Cruzada:** `OPS-001` | **Tipo de Registro:** Risco operacional | **Estado:** Confirmado / Aberto (`Patch candidato isolado (não integrado em main)`)
- **Categoria Principal:** `DT-08` (Testes e QA) | **Categorias Relacionadas:** `DT-13`, `DT-17`
- **Módulo Afetado:** QA / Release Gate | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 porque mascara erros de compilação e lint como aprovação formal de lançamento (STATUS: GO).
- **Agente Responsável Principal:** `Agente 08` | **Agentes Participantes:** `08`, `00`, `24` | **Onda Recomendada:** **Onda 00** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** O script scripts/release-gate.js (invocado por npm run release:check) configura lint e typecheck como opcionais (optional: true) e não executa test:architecture, test:integration, test:e2e nem npm audit. Na reprodução controlada, quando typecheck retorna exit code 1, o script ainda imprime STATUS: GO e encerra com exit 0.
- **Evidência Técnica Reproduzível:**
  - [`scripts/release-gate.js:38-65`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/release-gate.js#L38-L65) — Flags optional: true em checks obrigatórios e ausência de gates de arquitetura/integração/E2E.
  - [`docs/release/GO-LIVE-CHECKLIST.md:1-15`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/release/GO-LIVE-CHECKLIST.md#L1-L15) — Documentação de go-live apoia decisão no comando release:check.
- **Causa Raiz:** Flexibilização temporária de checks no script local nunca revertida para refletir os gates obrigatórios do AGENTS.md §28.
- **Impacto e Risco:** Falsa certificação de prontidão de release em execuções locais antes de integração ou deploy.
- **Dependências da Correção:** Revisão independente Agente 24
- **Estratégia de Remediação:** Tornar lint e typecheck estritamente obrigatórios em scripts/release-gate.js, incluir test:architecture, test:integration, test:e2e e npm audit, e falhar se qualquer script estiver ausente em package.json.
- **Critério de Aprovação (Aceite):** verify-release-gate.mjs comprova exit 1 (NO-GO) para falha individual em qualquer um dos 8 gates obrigatórios ou script ausente.
- **Testes de Regressão Necessários:** Teste automatizado com 11 cenários de spawnSync simulando falha individual de cada gate e sucesso global
- **Grau de Confiança:** Alta (reproduzido via verify-release-gate.mjs) | **Limitações da Verificação:** Lógica do gate validada em VM Node; execução completa dos comandos subjacentes requer ambiente com dependências instaladas.

### 3.2 [DEBT-DB-001] Guia canônico LOCAL_FIRST.md orienta aplicação a conectar no PostgreSQL com superusuário de bootstrap (bypass de RLS)

- **Referência Cruzada:** `OPS-002` | **Tipo de Registro:** Risco operacional | **Estado:** Confirmado / Aberto (`Patch candidato isolado (não integrado em main)`)
- **Categoria Principal:** `DT-05` (Banco de dados) | **Categorias Relacionadas:** `DT-06`, `DT-11`, `DT-30`
- **Módulo Afetado:** Banco de Dados / RLS | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 porque induz configuração que desativa efetivamente o isolamento RLS no banco de dados.
- **Agente Responsável Principal:** `Agente 01` | **Agentes Participantes:** `01`, `01A`, `08`, `18` | **Onda Recomendada:** **Onda 01** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** O guia docs/development/LOCAL_FIRST.md:39 instrui configurar DATABASE_URL com o usuário prospector. No entanto, docker-compose.postgres-local.yml define prospector como POSTGRES_USER (superusuário de bootstrap, que ignora Row-Level Security no PostgreSQL), enquanto scripts/db/create-app-role.sql cria especificamente o papel restrito prospector_app (NOSUPERUSER, NOBYPASSRLS) para o runtime.
- **Evidência Técnica Reproduzível:**
  - [`docs/development/LOCAL_FIRST.md:35-45`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/development/LOCAL_FIRST.md#L35-L45) — DATABASE_URL configurada com papel prospector no guia.
  - [`docker-compose.postgres-local.yml:20-28`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docker-compose.postgres-local.yml#L20-L28) — prospector é superuser do container Postgres.
  - [`scripts/db/create-app-role.sql:1-18`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/db/create-app-role.sql#L1-L18) — Papel correto para aplicação com RLS ativo é prospector_app.
- **Causa Raiz:** Documentação de setup local não foi atualizada após a introdução da segregação entre conta de migração/bootstrap e conta de runtime sujeita a RLS.
- **Impacto e Risco:** Ambientes configurados segundo o guia executam a aplicação com privilégio de superusuário, neutralizando a defesa em profundidade do PostgreSQL RLS entre tenants.
- **Dependências da Correção:** Alinhamento documental com Agente 18 e Agente 08
- **Estratégia de Remediação:** Atualizar docs/development/LOCAL_FIRST.md para especificar prospector_app em DATABASE_URL e documentar DIRECT_URL apenas para execução de migrations/bootstrap.
- **Critério de Aprovação (Aceite):** Documentação consistente com scripts/db/create-app-role.sql e prisma.config.ts, sem expor credenciais reais.
- **Testes de Regressão Necessários:** Verificação automatizada de contrato documental e teste de integração RLS confirmando que current_user não possui rolsuper/rolbypassrls
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Confirmado nos arquivos versionados; instância PostgreSQL de produção não inspecionada.

### 3.3 [DEBT-DB-002] Repositórios SQL nativos do discador (PgCampaignRepository/PgLeadRepository) não filtram organization_id explicitamente

- **Referência Cruzada:** `NEW-MERGE-2B918E0A-DIALER-SQL` | **Tipo de Registro:** Risco operacional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-05` (Banco de dados) | **Categorias Relacionadas:** `DT-02`, `DT-06`, `DT-30`
- **Módulo Afetado:** Cadência / Discador SQL | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 por violar o princípio de defesa em profundidade de multi-tenancy (AGENTS.md §26 exige filtro por organizationId além de RLS).
- **Agente Responsável Principal:** `Agente 01` | **Agentes Participantes:** `01`, `01A`, `17`, `22` | **Onda Recomendada:** **Onda 01** (Esforço: `M (1–3 dias)`, Risco de Regressão: `Médio (altera contrato das portas CampaignRepository e LeadRepository)`)
- **Descrição Objetiva:** Embora o merge 2b918e0a (commit 2512d2b8) tenha substituído $queryRawUnsafe por Prisma.sql parametrizado em PgCampaignRepository.ts e PgLeadRepository.ts, as queries SQL continuam selecionando e atualizando registros nas tabelas campaigns e leads (ex.: findActive, findAll, claimNextEligible) sem coluna ou filtro organization_id. Como $queryRaw opera diretamente no PrismaClient injetado, chamadas fora de withTenantContext ou sob conexão sem RLS estrito não possuem isolamento em nível de query.
- **Evidência Técnica Reproduzível:**
  - [`src/features/cadence/dialer/infrastructure/db/repositories/PgCampaignRepository.ts:57-71`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/cadence/dialer/infrastructure/db/repositories/PgCampaignRepository.ts#L57-L71) — findActive() e findAll() executam SELECT ... FROM campaigns sem cláusula WHERE organization_id.
  - [`src/features/cadence/dialer/infrastructure/db/repositories/PgLeadRepository.ts:84-103`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/cadence/dialer/infrastructure/db/repositories/PgLeadRepository.ts#L84-L103) — claimNextEligible() faz UPDATE leads ... RETURNING leads.* filtrando apenas campaign_id.
- **Causa Raiz:** Entidades de domínio do sub-módulo dialer (Campaign e Lead) foram modeladas sem propriedade obrigatória organizationId e persistidas via SQL cru fora do interceptor de modelos do tenant-prisma.ts.
- **Impacto e Risco:** Risco de vazamento ou listagem cruzada de campanhas/leads entre organizações caso os repositórios sejam instanciados com o cliente Prisma padrão fora de uma transação RLS.
- **Dependências da Correção:** Alinhamento de schema/entidade entre Agente 01 e Agente 17
- **Estratégia de Remediação:** Incluir organizationId nas assinaturas de leitura/escrita de CampaignRepository e LeadRepository (ou migrar para modelos Prisma gerenciados por tenant-prisma.ts) e adicionar cláusula WHERE organization_id = ${organizationId} em todas as queries SQL.
- **Critério de Aprovação (Aceite):** Teste de integração multi-tenant comprova que findAll/findActive/claimNextEligible de Tenant A jamais retornam ou modificam campanhas/leads de Tenant B.
- **Testes de Regressão Necessários:** Teste negativo entre Tenant A e Tenant B em PgCampaignRepository e PgLeadRepository
- **Grau de Confiança:** Alta (confirmado no código de PgCampaignRepository.ts e PgLeadRepository.ts) | **Limitações da Verificação:** Confirmado estaticamente; impacto em produção mitigado apenas se o módulo dialer não estiver exposto ou se RLS bloquear na camada de sessão.

### 3.4 [DEBT-LGPD-001] Exclusão LGPD pode concluir sem gravar supressão multicanal (OptOutRecord)

- **Referência Cruzada:** `FND-01` | **Tipo de Registro:** Vulnerabilidade de segurança | **Estado:** Confirmado / Aberto (`Patch candidato isolado (não integrado em main)`)
- **Categoria Principal:** `DT-06` (Segurança e privacidade) | **Categorias Relacionadas:** `DT-04`, `DT-05`, `DT-35`
- **Módulo Afetado:** LGPD / Privacidade | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 por risco direto à conformidade LGPD e perda de capacidade de supressão em retry; não classificado como P0 pois requer falha concorrente na escrita de OptOutRecord.
- **Agente Responsável Principal:** `Agente 01` | **Agentes Participantes:** `01`, `21`, `17`, `00` | **Onda Recomendada:** **Onda 01** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** Em main, eraseDataSubject anonimiza email/telefone do Contact antes de gravar OptOutRecord e ignora exceções em blocos catch vazios. Caso a criação de OptOutRecord falhe, o retry subsequente já não possui os identificadores originais para registrar a supressão.
- **Evidência Técnica Reproduzível:**
  - [`src/shared/services/dataSubjectErasure.service.ts:115-135`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/services/dataSubjectErasure.service.ts#L115-L135) — Destruição de identificadores precede gravação de OptOutRecord com catch silencioso.
  - [`src/features/prospecting/services/cold-email.service.ts:88-96`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/prospecting/services/cold-email.service.ts#L88-L96) — Verificação de opt-out depende de OptOutRecord persistido.
- **Causa Raiz:** Persistência de supressão multicanal tratada como efeito colateral opcional após mutação destrutiva dos identificadores do titular.
- **Impacto e Risco:** Risco de violação LGPD e reabordagem comercial indevida via cold-email caso a gravação de OptOutRecord falhe durante o expurgo.
- **Dependências da Correção:** Validação de contrato com Agente 21 (LGPD) e Agente 17 (Cadência); Revisão independente Agente 24
- **Estratégia de Remediação:** Gravar OptOutRecord obrigatoriamente antes de anonimizar os identificadores do Contact/Lead e propagar qualquer erro de persistência (integrar candidato validado em .agents/handoffs/onda-lancamento-20261014/00-para-01-fnd-01.md).
- **Critério de Aprovação (Aceite):** Teste automatizado comprova que falha em optOutRecord.create impede anonimização e propaga erro, e caminho feliz grava supressão antes de limpar PII.
- **Testes de Regressão Necessários:** Cenário de falha em optOutRecord.create preserva identificadores para retry; Cenário de sucesso grava OptOutRecord e bloqueia envio em cold-email.service.ts
- **Grau de Confiança:** Alta (reproduzido isoladamente via verify-lgpd-optout.mjs) | **Limitações da Verificação:** Testado isoladamente com função extraída; fluxo HTTP/banco Postgres real não executado nesta sessão.

### 3.5 [DEBT-LGPD-002] Memória de agentes (AgentMemory) não pode ser localizada por titular para exclusão individual LGPD

- **Referência Cruzada:** `FND-03` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-06` (Segurança e privacidade) | **Categorias Relacionadas:** `DT-05`, `DT-10`
- **Módulo Afetado:** IA / LGPD | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 por lacuna estrutural de conformidade LGPD no atendimento imediato a requisição de exclusão de titular.
- **Agente Responsável Principal:** `Agente 01A` | **Agentes Participantes:** `01A`, `01`, `07`, `21`, `00` | **Onda Recomendada:** **Onda 01** (Esforço: `M (1–3 dias)`, Risco de Regressão: `Médio (envolve migration de banco e store de IA)`)
- **Descrição Objetiva:** O modelo AgentMemory armazena histórico conversacional em JSON (messages) escopado apenas por organizationId e sessionId, sem chave estrangeira ou índice para contactId/leadId. Embora exista retenção temporal de 90 dias (AGENT_MEMORY_RETENTION_DAYS), eraseDataSubject não consegue localizar memórias de um titular específico antes do expurgo temporal.
- **Evidência Técnica Reproduzível:**
  - [`prisma/schema.prisma:1766-1782`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/schema.prisma#L1766-L1782) — Ausência de contactId/leadId no model AgentMemory.
  - [`src/features/intelligence/agents/agentMemory.store.ts:75-95`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/agents/agentMemory.store.ts#L75-L95) — Persistência de mensagens por sessionId sem vínculo estruturado ao titular.
  - [`src/shared/services/dataSubjectErasure.service.ts:78-114`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/services/dataSubjectErasure.service.ts#L78-L114) — Fluxo de exclusão LGPD não abrange AgentMemory.
- **Causa Raiz:** Modelagem inicial de memória episódica de agentes orientada apenas a sessão, sem rastreabilidade de proveniência por titular de dados.
- **Impacto e Risco:** Se mensagens persistidas em AgentMemory contiverem dados pessoais do lead/contato, o atendimento imediato ao direito de exclusão (Art. 18 LGPD) fica incompleto até o ciclo do worker de retenção.
- **Dependências da Correção:** Migration de schema pelo Agente 01/01A; Atualização dos produtores de memória pelo Agente 07; Validação LGPD pelo Agente 21
- **Estratégia de Remediação:** Adicionar vínculo opcional indexado (contactId/leadId) em AgentMemory via migration, propagar identificadores nos produtores do Agente 07 e incluir deleção/redação em eraseDataSubject.
- **Critério de Aprovação (Aceite):** Ao executar eraseDataSubject para um contactId/leadId, todas as entradas associadas em AgentMemory são expurgadas ou redigidas na mesma transação.
- **Testes de Regressão Necessários:** Teste de integração criando AgentMemory vinculada a contato e verificando remoção após eraseDataSubject; Preservação de memórias de outros titulares do mesmo tenant
- **Grau de Confiança:** Alta (confirmado no schema.prisma e dataSubjectErasure.service.ts) | **Limitações da Verificação:** Retenção temporal de 90 dias já existe; não foi inspecionado banco de produção para medir ocorrência real de PII em messages.

### 3.6 [DEBT-SEC-001] URLs de autenticação sensíveis são escritas em logs no fallback sem SMTP

- **Referência Cruzada:** `DEBT-20261014-SEC-001` | **Tipo de Registro:** Vulnerabilidade de segurança | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-06` (Segurança e privacidade) | **Categorias Relacionadas:** `DT-19`, `DT-30`
- **Módulo Afetado:** auth | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P1** — *Justificativa:* P1 por credencial transitória de autenticação em sink de logs sob falha SMTP; não P0 pois exposição/log access efetivos não medidos.
- **Agente Responsável Principal:** `Agente 15` | **Agentes Participantes:** `01` | **Onda Recomendada:** **Onda 01** (Esforço: `Baixo`, Risco de Regressão: `Médio`)
- **Descrição Objetiva:** Fallback MailerNotConfiguredError registra objeto email/url e interpola URL em msg; redaction do logger não cobre esses campos nem texto da mensagem.
- **Evidência Técnica Reproduzível:**
  - [`src/lib/auth.ts:127-132`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L127-L132) — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta.
  - [`src/lib/logger.ts:36-41`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/logger.ts#L36-L41) — Lista de redaction omite url/email/msg e não modifica URL interpolada em texto.
  - [`src/lib/auth.ts:179-184`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L179-L184) — Mesmo padrão no ramo SMTP ausente da verificação.
- **Causa Raiz:** Logs recebem credencial transitória e PII; não há sanitização de msg/url/email no sink.
- **Impacto e Risco:** Leitor de logs com URL válida pode recuperar/verificar conta; condição SMTP ausente demonstrada por ramo estático, exposição efetiva de produção não verificada.
- **Dependências da Correção:** 15; 21; 12
- **Estratégia de Remediação:** Remover URL e e-mail dos logs, emitir apenas userId/código de configuração ausente, falhar de modo observável.
- **Critério de Aprovação (Aceite):** SMTP ausente não emite URL/token nem e-mail, inclusive msg serializada
- **Testes de Regressão Necessários:** SMTP ausente para reset e verificação não escreve token/URL/email; capturar objeto e msg; SMTP disponível mantém envio válido
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Não medidos dados/configuração real de produção nem serviços externos; conclusão limitada à evidência citada.

### 3.7 [DEBT-UX-001] Cache PWA de CRM não é particionado por identidade autenticada

- **Referência Cruzada:** `DEBT-20261014-UX-001` | **Tipo de Registro:** Risco operacional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-34` (Mobile e PWA) | **Categorias Relacionadas:** `DT-24`, `DT-06`, `DT-30`
- **Módulo Afetado:** PWA / autenticação | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P1** — *Justificativa:* Em navegador compartilhado, resposta antiga pode ser servida antes da resposta da nova sessão; risco de confidencialidade e de mostrar informação obsoleta. Evidência do caminho atual, sem inferir exploração em produção.
- **Agente Responsável Principal:** `Agente 09` | **Agentes Participantes:** `02`, `09` | **Onda Recomendada:** **Onda 01** (Esforço: `M`, Risco de Regressão: `médio`)
- **Descrição Objetiva:** Configuração StaleWhileRevalidate guarda respostas CRM por origem/URL no mesmo cache; logout não remove o conteúdo.
- **Evidência Técnica Reproduzível:**
  - [`vite.config.ts:61-66`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vite.config.ts#L61-L66) — Cache fixo para GET CRM, por URL, sem identidade do usuário.
  - [`src/contexts/AuthContext.tsx:118-128`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/contexts/AuthContext.tsx#L118-L128) — Logout encerra sessão e redireciona; não limpa CacheStorage.
- **Causa Raiz:** Cache de respostas autenticadas tratado como cache público de assets.
- **Impacto e Risco:** Em navegador compartilhado, resposta antiga pode ser servida antes da resposta da nova sessão; risco de confidencialidade e de mostrar informação obsoleta.
- **Dependências da Correção:** 08: regressão isolada; 00: autorização específica de saneamento
- **Estratégia de Remediação:** Evitar cache SW de dados autenticados ou particionar e invalidar explicitamente por sessão/tenant.
- **Critério de Aprovação (Aceite):** Usuário B não recebe dados de A ao trocar sessão online/offline; estado stale é explícito.
- **Testes de Regressão Necessários:** Duas contas e organizações sintéticas; mesma URL; logout/login; offline; verificar CacheStorage e corpo retornado.
- **Grau de Confiança:** alta (código); comportamento operacional não medido | **Limitações da Verificação:** Configuração e ausência de limpeza no caminho de logout confirmadas; acesso cruzado real NÃO DEMONSTRADO, requer build e navegador isolado.

### 3.8 [DEBT-OPS-004] Aceite do restore drill ignora status Prisma e limite RTO

- **Referência Cruzada:** `DEBT-20261014-OPS-004` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-22` (Recuperação) | **Categorias Relacionadas:** `DT-08`, `DT-19`, `DT-38`
- **Módulo Afetado:** recuperação | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P1** — *Justificativa:* P1: Ferramenta pode reportar PASS apesar de migration status em erro ou restauração acima SLA; não foi executado restore real. Escopo comprovado estático; ocorrência de produção não medida.
- **Agente Responsável Principal:** `Agente 10` | **Agentes Participantes:** `00` | **Onda Recomendada:** **Onda 02** (Esforço: `M (1–3 dias de engenharia com ambiente disponível)`, Risco de Regressão: `moderado`)
- **Descrição Objetiva:** Predicate pass omite status de migration e limiteRTO900;RPO é string fixa e contagem de tabelas pode omitir falhas por catch.
- **Evidência Técnica Reproduzível:**
  - [`scripts/backup/run-backup-restore-drill.ts:298-302`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/backup/run-backup-restore-drill.ts#L298-L302) — Predicate pass omite status de migration e limiteRTO900;RPO é string fixa e contagem de tabelas pode omitir falhas por catch.
- **Causa Raiz:** Predicate pass omite status de migration e limiteRTO900;RPO é string fixa e contagem de tabelas pode omitir falhas por catch.
- **Impacto e Risco:** Ferramenta pode reportar PASS apesar de migration status em erro ou restauração acima SLA; não foi executado restore real.
- **Dependências da Correção:** Autorização específica para remediação; Ambiente descartável do14; Revisão independente24
- **Estratégia de Remediação:** Bloquear erro de schema/tabelas e extrapolaçãoRTO; medirRPO por backup real; separar referencial de provaRLS.
- **Critério de Aprovação (Aceite):** Mocks migrationFAIL/restore901s/tabela ausente=>FAIL;cenário completo900s=>PASS; banco descartável prova RLS A/B.
- **Testes de Regressão Necessários:** Mocks migrationFAIL/restore901s/tabela ausente=>FAIL;cenário completo900s=>PASS; banco descartável prova RLS A/B.
- **Grau de Confiança:** alta para contrato estático | **Limitações da Verificação:** Produto e infraestrutura não executados; Nenhuma correção aplicada

### 3.9 [DEBT-API-001] Merge de stash antigo (2b918e0a) removeu 124 linhas de /organization-modules do docs/openapi.yaml

- **Referência Cruzada:** `NEW-MERGE-2B918E0A-OPENAPI` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (regressão ativa em main @ c7e33a91)`)
- **Categoria Principal:** `DT-02` (Arquitetura) | **Categorias Relacionadas:** `DT-11`, `DT-14`, `DT-18`
- **Módulo Afetado:** Contratos / OpenAPI | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 porque introduz regressão direta em main que quebra o gate de contrato OpenAPI do CI (resolvido anteriormente no PR #724).
- **Agente Responsável Principal:** `Agente 18` | **Agentes Participantes:** `18`, `01`, `08`, `08A` | **Onda Recomendada:** **Onda 03** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo (restauração de especificação OpenAPI)`)
- **Descrição Objetiva:** Em 2026-10-14T13:41:59Z, o commit 2b918e0aefab924d9594b06ad7ce7a46451992ae fez merge da branch origin/backup-stash/20261013-4-pg-repositories (2512d2b86e6112460803d59abaeb6e8bdca126e0, criada antes do PR #724). Esse merge reverteu acidentalmente 124 linhas em docs/openapi.yaml, apagando a documentação dos endpoints /organization-modules, /organization-modules/onboarding/complete e /organization-modules/{moduleKey}.
- **Evidência Técnica Reproduzível:**
  - [`docs/openapi.yaml:10225-10235`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/openapi.yaml#L10225-L10235) — Remoção das 124 linhas dos paths /organization-modules* no diff do commit 2512d2b8 / 2b918e0a.
  - [`src/bootstrap/routes.ts:193-198`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/bootstrap/routes.ts#L193-L198) — Rotas /api/organization-modules permanecem montadas em runtime, gerando deriva OpenAPI.
- **Causa Raiz:** Merge direto de branch de backup-stash defasada (2026-10-11) sobre main sem resolução seletiva do arquivo docs/openapi.yaml nem execução prévia do gate verify:openapi-drift.
- **Impacto e Risco:** Quebra a paridade contratual OpenAPI e faz o gate de CI verify:openapi-drift falhar na branch main.
- **Dependências da Correção:** Coordenação com Agente 08 para validação do gate verify:openapi-drift
- **Estratégia de Remediação:** Restaurar as 124 linhas dos endpoints /organization-modules em docs/openapi.yaml (conforme PR #724 / commit c357daa9) e validar com npm run verify:openapi-drift.
- **Critério de Aprovação (Aceite):** npm run verify:openapi-drift retorna exit 0 com 0 endpoints não documentados.
- **Testes de Regressão Necessários:** Execução de npm run verify:openapi-drift no gate de CI antes de qualquer merge em main
- **Grau de Confiança:** Alta (comprovado pelo diff exato do commit 2512d2b8 / 2b918e0a) | **Limitações da Verificação:** Nenhuma limitação; diff confirmado no histórico Git de main.

### 3.10 [DEBT-OPS-006] Guard classifica falhas de qualquer origem como Redis

- **Referência Cruzada:** `DEBT-20261014-OPS-006` | **Tipo de Registro:** Risco operacional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-19` (Observabilidade) | **Categorias Relacionadas:** `DT-21`
- **Módulo Afetado:** Runtime | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P1** — *Justificativa:* Afeta confiabilidade operacional de processo/encerramento por caminho demonstrado;sem prova de risco imediato para classificarP0.
- **Agente Responsável Principal:** `Agente 16` | **Agentes Participantes:** `06`, `00` | **Onda Recomendada:** **Onda 03** (Esforço: `P`, Risco de Regressão: `Médio: fluxo de execução/falha`)
- **Descrição Objetiva:** matchesKnownPattern && (looksLikeIoredis || matchesKnownPattern) reduz a matchesKnownPattern; ECONNRESET de serviço não Redis segue processo.
- **Evidência Técnica Reproduzível:**
  - [`src/lib/process-guards.ts:48-52`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/process-guards.ts#L48-L52) — Fonte direta no snapshot auditado; escopo do controle limitado ao título.
  - [`src/lib/process-guards.ts:48-52`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/process-guards.ts#L48-L52) — Evidência complementar da causa/contrato.
- **Causa Raiz:** Predicado origem tornado tautológico por repetição do termo.
- **Impacto e Risco:** Bugs não tratados de outros clientes seguem execução em estado possivelmente inconsistente;log continua existindo.
- **Dependências da Correção:** Ambiente isolado homologação; Revisão24; Autorização específica correção
- **Estratégia de Remediação:** Exigir proveniência Redis com mensagem compatível;caso desconhecido fatal.
- **Critério de Aprovação (Aceite):** Erro application ECONNRESET termina fatal;erro Redis conhecido segue log.error.
- **Testes de Regressão Necessários:** Erro application ECONNRESET termina fatal;erro Redis conhecido segue log.error.
- **Grau de Confiança:** alta (fonte direta;runtime limitado aos mocks especificados) | **Limitações da Verificação:** Reprodução da função pura; não mede incidente ou ambiente real.

### 3.11 [DEBT-OPS-007] Shutdown HTTP espera fechar conexão SSE antes de encerrá-la

- **Referência Cruzada:** `DEBT-20261014-OPS-007` | **Tipo de Registro:** Risco operacional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-21` (Disponibilidade) | **Categorias Relacionadas:** `DT-19`
- **Módulo Afetado:** Runtime HTTP | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P1** — *Justificativa:* Afeta confiabilidade operacional de processo/encerramento por caminho demonstrado;sem prova de risco imediato para classificarP0.
- **Agente Responsável Principal:** `Agente 16` | **Agentes Participantes:** `06`, `00` | **Onda Recomendada:** **Onda 03** (Esforço: `P`, Risco de Regressão: `Médio: fluxo de execução/falha`)
- **Descrição Objetiva:** Await httpServer.close callback precede sseService.closeAll;SSE mantém callback pendente e código não tem deadline.
- **Evidência Técnica Reproduzível:**
  - [`src/bootstrap/shutdown.ts:69-73`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/bootstrap/shutdown.ts#L69-L73) — Fonte direta no snapshot auditado; escopo do controle limitado ao título.
  - [`src/features/notifications/sse.service.ts:55-59`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/notifications/sse.service.ts#L55-L59) — Evidência complementar da causa/contrato.
- **Causa Raiz:** Ordem de dreno com ciclo e falta de limite/best-effort prometido em comentário.
- **Impacto e Risco:** Deploy pode exigir kill e perder encerramento ordenado;falha em closeAll/worker também impede cleanup posterior.
- **Dependências da Correção:** Ambiente isolado homologação; Revisão24; Autorização específica correção
- **Estratégia de Remediação:** Iniciar fechamento HTTP,fechar SSE,drenar com deadline e cleanup best-effort.
- **Critério de Aprovação (Aceite):** SIGTERM com SSE ativo fecha SSE e HTTP dentro deadline;uma etapa falha não impede restantes.
- **Testes de Regressão Necessários:** SIGTERM com SSE ativo fecha SSE e HTTP dentro deadline;uma etapa falha não impede restantes.
- **Grau de Confiança:** alta (fonte direta;runtime limitado aos mocks especificados) | **Limitações da Verificação:** Fake dependências reproduz espera; não usa socket real nem simula deployment.

### 3.12 [DEBT-UX-003] Analytics devolve sucesso e zeros após erro de agregação

- **Referência Cruzada:** `DEBT-20261014-UX-003` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-31` (Analytics) | **Categorias Relacionadas:** `DT-04`, `DT-19`, `DT-39`
- **Módulo Afetado:** Analytics | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P1** — *Justificativa:* Usuário e monitoramento interpretam indisponibilidade como métricas reais zeradas; erro não observável nesses handlers. Evidência do caminho atual, sem inferir exploração em produção.
- **Agente Responsável Principal:** `Agente 04` | **Agentes Participantes:** `02`, `04` | **Onda Recomendada:** **Onda 03** (Esforço: `M`, Risco de Regressão: `médio`)
- **Descrição Objetiva:** Endpoints metrics/overview/dashboard capturam qualquer exceção e devolvem dados vazios ou zerados com success:true.
- **Evidência Técnica Reproduzível:**
  - [`src/features/analytics/presentation/AnalyticsController.ts:24-54`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/presentation/AnalyticsController.ts#L24-L54) — Catch substitui falha por success:true/HTTP200.
  - [`src/features/analytics/presentation/AnalyticsController.ts:56-96`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/presentation/AnalyticsController.ts#L56-L96) — Catch gera zeros e nulls sem propagar/logar erro.
  - [`src/features/analytics/presentation/AnalyticsController.ts:87-147`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/presentation/AnalyticsController.ts#L87-L147) — Catch gera isEmpty:true em caso de indisponibilidade.
  - [`src/features/analytics/presentation/AnalyticsController.ts:24-54`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/presentation/AnalyticsController.ts#L24-L54) — Reprodução Node isolada exit0: Repository.overview rejeita:status=200,success=true,totalCompanies=0.
- **Causa Raiz:** Confusão entre banco vazio e falha de banco/consulta.
- **Impacto e Risco:** Usuário e monitoramento interpretam indisponibilidade como métricas reais zeradas; erro não observável nesses handlers.
- **Dependências da Correção:** 08: regressão isolada; 00: autorização específica de saneamento
- **Estratégia de Remediação:** Propagar erro ao middleware e manter vazio apenas quando consulta bem-sucedida devolve vazio.
- **Critério de Aprovação (Aceite):** Falha do repository retorna erro observável; banco vazio continua 200 com estado empty verdadeiro.
- **Testes de Regressão Necessários:** Repository rejeita overview/dashboard/getMetrics; confirmar status não2xx/log e UI error/retry; repository vazio não gera erro.
- **Grau de Confiança:** alta; reprodução isolada com corpos atuais de função e dependências sintéticas | **Limitações da Verificação:** Corpo atual executado após remover somente tipos TypeScript; mocks de serviços. HTTP,DB real e navegador NÃO EXECUTADOS.

### 3.13 [DEBT-QUEUE-001] Worker é classificado como processo web e pode reenfileirar mensagens WhatsApp sem enviar

- **Referência Cruzada:** `FND-02` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Patch candidato isolado (não integrado em main)`)
- **Categoria Principal:** `DT-25` (Filas e eventos) | **Categorias Relacionadas:** `DT-09`, `DT-21`
- **Módulo Afetado:** Filas / WhatsApp | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 por causar loop silencioso de jobs em fila e reportar falso sucesso operacional em canal crítico de comunicação.
- **Agente Responsável Principal:** `Agente 16` | **Agentes Participantes:** `16`, `06`, `07`, `00` | **Onda Recomendada:** **Onda 05** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** Em src/lib/queue/redis.ts:10, a expressão regular que detecta se o processo atual é um worker possui escape incorreto e avalia como false para worker.cjs e worker.ts. Quando a sessão WhatsApp não está ativa, o próprio whatsappCommand.worker.ts chama sendWhatsAppMessage, que julga estar no processo web, enfileira um novo job na fila BullMQ e retorna true.
- **Evidência Técnica Reproduzível:**
  - [`src/lib/queue/redis.ts:8-14`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/queue/redis.ts#L8-L14) — Regex baseline retorna false para /app/dist/worker.cjs e C:/app/worker.ts.
  - [`src/features/integrations/whatsapp/whatsapp.service.ts:408-420`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/whatsapp/whatsapp.service.ts#L408-L420) — Enfileiramento condicional baseado na classificação de processo.
  - [`src/lib/queue/whatsappCommand.worker.ts:22-30`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/queue/whatsappCommand.worker.ts#L22-L30) — Consumer invoca sendWhatsAppMessage diretamente.
- **Causa Raiz:** Escape duplo acidental na literal RegExp de detecção de entrypoint do worker combinada com reutilização do método de serviço entre web e worker.
- **Impacto e Risco:** Reenfileiramento em loop e falso positivo de job concluído quando sessão WhatsApp do tenant está desconectada.
- **Dependências da Correção:** Coordenação slot de filas entre Agentes 16 e 06; Revisão independente Agente 24
- **Estratégia de Remediação:** Corrigir a expressão regular de detecção de worker em src/lib/queue/redis.ts:10 (patch de 1 linha já validado em verify-worker-detector.mjs) e garantir que o worker falhe explicitamente quando a sessão estiver indisponível.
- **Critério de Aprovação (Aceite):** verify-worker-detector.mjs passa 6/6 cenários (Unix/Windows, .ts/.cjs/.js) e job do worker sem sessão ativa falha sem criar novo job recursivo.
- **Testes de Regressão Necessários:** Matriz de 6 caminhos de entrypoint (Unix/Windows, worker vs server); Teste unitário de whatsappCommand.worker com sessão ausente
- **Grau de Confiança:** Alta (reproduzido isoladamente em Node) | **Limitações da Verificação:** Reprodução isolada confirmada; broker Redis/BullMQ em runtime não executado.

### 3.14 [DEBT-AI-002] Copiloto Executivo exibe receita, meta, pipeline e forecast fabricados por constantes

- **Referência Cruzada:** `PROD-01` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda contrato 07+04+18 e autorização)`)
- **Categoria Principal:** `DT-10` (Inteligência artificial) | **Categorias Relacionadas:** `DT-04`, `DT-31`, `DT-39`
- **Módulo Afetado:** Inteligência Comercial / Copiloto | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 por violação direta do bloqueador prioritário B-06 (dados fictícios misturados a dados reais em tela produtiva).
- **Agente Responsável Principal:** `Agente 07` | **Agentes Participantes:** `07`, `04`, `18`, `22` | **Onda Recomendada:** **Onda 06** (Esforço: `M (1–3 dias)`, Risco de Regressão: `Médio (altera payload consumido pelo frontend do Copiloto)`)
- **Descrição Objetiva:** A rota GET /api/commercial-agent/workspace (em src/features/intelligence/routes/commercial-agent.routes.ts:40) busca apenas os 10 leads mais recentes sem filtrar por deletedAt ou mês comercial, e calcula métricas financeiras multiplicando contagens por valores fixos (wonLeads.length * 25000, openLeads.length * 30000, meta fixa 200000, forecasts 60%/75% e score default 85).
- **Evidência Técnica Reproduzível:**
  - [`src/features/intelligence/routes/commercial-agent.routes.ts:35-85`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/routes/commercial-agent.routes.ts#L35-L85) — Cálculo sintético de receita, meta e forecast sobre take: 10 leads.
  - [`src/bootstrap/routes.ts:138-145`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/bootstrap/routes.ts#L138-L145) — Rota montada ativamente em /api/commercial-agent.
  - [`src/App.tsx:398-405`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/App.tsx#L398-L405) — Tela EliteCommercialAgentWorkspace registrada na navegação da aplicação.
- **Causa Raiz:** Implementação de rota do Copiloto Executivo com fórmulas demonstrativas hardcoded em vez de consumir o serviço canônico de Analytics e Metas (Bloqueador B-06 do AGENTS.md).
- **Impacto e Risco:** Apresenta indicadores financeiros fictícios como se fossem dados reais da organização, induzindo decisões comerciais incorretas.
- **Dependências da Correção:** Contrato de métricas com Agente 04 (CRM/BI) e Agente 18 (OpenAPI); Verificação de realidade pelo Agente 22
- **Estratégia de Remediação:** Substituir os cálculos fixos em commercial-agent.routes.ts pelo consumo das agregações reais do tenant (respeitando deletedAt: null e calendário Brasília) e retornar contrato explícito de unavailable quando metas não estiverem configuradas.
- **Critério de Aprovação (Aceite):** Valores exibidos no Copiloto coincidem exatamente com os negócios reais do banco para o tenant, com >10 leads, respeitando soft-delete e mês comercial.
- **Testes de Regressão Necessários:** Teste de integração com base vazia, negócios reais de valores variados, >10 leads e leads soft-deleted
- **Grau de Confiança:** Alta (leitura direta da rota ativa) | **Limitações da Verificação:** Confirmado no código-fonte; navegador não executado.

### 3.15 [DEBT-AI-003] Botões de executar e adiar Next Best Action (NBA) afirmam ação concluída sem execução ou persistência

- **Referência Cruzada:** `PROD-02` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Patch parcial UI candidato isolado; backend pendente`)
- **Categoria Principal:** `DT-10` (Inteligência artificial) | **Categorias Relacionadas:** `DT-03`, `DT-04`, `DT-39`
- **Módulo Afetado:** Inteligência Comercial / Copiloto | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 por violar a diretriz de honestidade de produto (falso sucesso sem persistência real).
- **Agente Responsável Principal:** `Agente 07` | **Agentes Participantes:** `07`, `13`, `17`, `18`, `22` | **Onda Recomendada:** **Onda 06** (Esforço: `M (1–3 dias)`, Risco de Regressão: `Médio`)
- **Descrição Objetiva:** Os endpoints POST /api/commercial-agent/nba/:actionId/execute e /feedback retornam apenas JSON de sucesso sem acionar nenhum dispatcher de voz/cadência nem gravar estado no banco. No código de main, o componente EliteCommercialAgentWorkspace.tsx ainda exibia mensagem 'Discando para...' até mesmo no bloco catch de erro de rede e ignorava res.ok no feedback.
- **Evidência Técnica Reproduzível:**
  - [`src/features/intelligence/routes/commercial-agent.routes.ts:210-245`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/routes/commercial-agent.routes.ts#L210-L245) — Handlers retornam res.json sem persistência ou chamada de serviço.
  - [`src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx:70-115`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx#L70-L115) — Falso sucesso na UI e divergência de propriedade decision vs feedbackType.
- **Causa Raiz:** Endpoints stubbed e tratamento otimista incondicional na interface do Copiloto.
- **Impacto e Risco:** O operador acredita que disparou uma ligação ou adiou uma tarefa comercial, mas nenhuma ação é executada nem salva após recarregar a página.
- **Dependências da Correção:** Integração com ledger/dispatcher dos Agentes 13 e 17; Contrato OpenAPI Agente 18; Verificação Agente 22
- **Estratégia de Remediação:** Integrar os endpoints /execute e /feedback ao dispatcher/ledger real com escopo de tenant e idempotência, alinhar o contrato de payload (decision/feedbackType) e aplicar o tratamento de erro honesto na UI.
- **Critério de Aprovação (Aceite):** Ação executada/adiada persiste após reload da página e respeita isolamento de tenant; erro HTTP/rede exibe alerta de erro real.
- **Testes de Regressão Necessários:** verify-elite.mjs (sucesso HTTP, erro HTTP e falha de rede); Teste de integração validando persistência no banco após POST
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Confirmado no código-fonte e via verify-elite.mjs.

### 3.16 [DEBT-AI-004] Trace de missão do Copiloto e aprovação de consentimento LGPD são retornados de forma sintética/fictícia

- **Referência Cruzada:** `PROD-03` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-10` (Inteligência artificial) | **Categorias Relacionadas:** `DT-06`, `DT-19`, `DT-39`
- **Módulo Afetado:** Inteligência Comercial / Enxame | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P1** — *Justificativa:* P1 porque fabrica evidência de conformidade LGPD e de execução de missão na interface.
- **Agente Responsável Principal:** `Agente 07` | **Agentes Participantes:** `07`, `13`, `18`, `21`, `22` | **Onda Recomendada:** **Onda 06** (Esforço: `M (1–3 dias)`, Risco de Regressão: `Médio`)
- **Descrição Objetiva:** O endpoint GET /api/commercial-agent/mission/:missionId/trace retorna um objeto JSON estático com status COMPLETED e passos como 'Nenhum risco de consentimento detectado — Aprovado' para qualquer missionId informado, sem realizar consulta ao banco de dados, ao estado do enxame ou à tabela de consentimento LGPD.
- **Evidência Técnica Reproduzível:**
  - [`src/features/intelligence/routes/commercial-agent.routes.ts:140-208`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/routes/commercial-agent.routes.ts#L140-L208) — Payload de trace e validação LGPD 100% hardcoded no handler HTTP.
  - [`src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx:48-56`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx#L48-L56) — Chamada fixa para mission/default/trace.
- **Causa Raiz:** Simulação de observabilidade de missão e compliance LGPD deixada em rota de produção.
- **Impacto e Risco:** Exibe falsa comprovação de auditoria LGPD e de execução de agentes autônomos para o usuário.
- **Dependências da Correção:** Integração com estado real de missão do Agente 13; Contrato OpenAPI Agente 18
- **Estratégia de Remediação:** Consultar execuções reais de missão por organizationId, retornar 404 quando missionId não existir (ou estado vazio honesto quando nenhuma missão tiver rodado) e remover afirmações sintéticas de aprovação LGPD.
- **Critério de Aprovação (Aceite):** ID inexistente ou de outro tenant retorna 404; tela sem missão ativa exibe estado vazio honesto sem forjar aprovação LGPD.
- **Testes de Regressão Necessários:** Teste de integração para missionId inexistente, missionId de outro tenant e missão real persistida
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Confirmado estaticamente no handler da rota.

### 3.17 [DEBT-OPS-001] 62 testes co-localizados ficam fora da descoberta unitária

- **Referência Cruzada:** `DEBT-20261014-OPS-001` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-08` (Testes e QA) | **Categorias Relacionadas:** `DT-15`
- **Módulo Afetado:** testes | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P1** — *Justificativa:* P1: Regressões nesses arquivos não são exercitadas pelo gate test:unit atual. Escopo comprovado estático; ocorrência de produção não medida.
- **Agente Responsável Principal:** `Agente 14` | **Agentes Participantes:** `00` | **Onda Recomendada:** **Onda 08** (Esforço: `M (1–3 dias de engenharia com ambiente disponível)`, Risco de Regressão: `moderado`)
- **Descrição Objetiva:** Três globs incluem tests/unit e src/**/__tests__/**/*.test.ts;62 arquivos src de teste co-localizados fora __tests__ não correspondem.
- **Evidência Técnica Reproduzível:**
  - [`vitest.unit.config.ts:35-39`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vitest.unit.config.ts#L35-L39) — Três globs incluem tests/unit e src/**/__tests__/**/*.test.ts;62 arquivos src de teste co-localizados fora __tests__ não correspondem.
- **Causa Raiz:** Três globs incluem tests/unit e src/**/__tests__/**/*.test.ts;62 arquivos src de teste co-localizados fora __tests__ não correspondem.
- **Impacto e Risco:** Regressões nesses arquivos não são exercitadas pelo gate test:unit atual.
- **Dependências da Correção:** Autorização específica para remediação; Ambiente descartável do14; Revisão independente24
- **Estratégia de Remediação:** Inventariar suites e incluir testes de produto no runner adequado,sem mascarar falhas novas.
- **Critério de Aprovação (Aceite):** Descoberta lista todos testes previstos; sentinela em co-localizado falha runner; happy path passa.
- **Testes de Regressão Necessários:** Descoberta lista todos testes previstos; sentinela em co-localizado falha runner; happy path passa.
- **Grau de Confiança:** alta para contrato estático | **Limitações da Verificação:** Produto e infraestrutura não executados; Nenhuma correção aplicada

### 3.18 [DEBT-GOV-004] PR #741 aberto (tech-debt-audit) contém 176 falsos positivos por grep textual cego e altera formatação de código

- **Referência Cruzada:** `PR-741-FALSE-POSITIVES` | **Tipo de Registro:** Risco operacional | **Estado:** Confirmado / Aberto (`Bloqueado para merge pelo Agente 24`)
- **Categoria Principal:** `DT-14` (Git e versionamento) | **Categorias Relacionadas:** `DT-13`, `DT-15`
- **Módulo Afetado:** Git / Governança de PRs | **Commit Auditado:** `f0f7bc14fdacfab8658cc7bf157d596590f67a8a (PR #741 sobre main c7e33a91)`
- **Prioridade:** **P2** — *Justificativa:* P2 porque o PR #741 está aberto contra main e introduziria ruído severo na governança técnica caso sofresse merge.
- **Agente Responsável Principal:** `Agente 08A` | **Agentes Participantes:** `08A`, `00`, `08`, `24` | **Onda Recomendada:** **Onda 00** (Esforço: `P (< 1 hora)`, Risco de Regressão: `Nenhum`)
- **Descrição Objetiva:** O PR #741 (branch tech-debt-audit-1898280509423632042) adicionou scripts/run-tech-debt-audit.ts que executa 'git grep -n -m 5 -i' para termos genéricos ('any', 'px', 'main', 'HEAD', 'build', 'meta', 'feature', 'user'), classificando 176 ocorrências textuais normais como dívidas P1/P2 atribuídas apenas ao Agente 01, além de rodar 'npm run format' no commit 0d10c785 modificando arquivos do repositório.
- **Evidência Técnica Reproduzível:**
  - [`scripts/run-tech-debt-audit.ts:10-102`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/run-tech-debt-audit.ts#L10-L102) — No commit abbe7a0e (PR #741), busca textual sem análise de contexto nem mapeamento real de agentes.
  - [`.agents/reviews/birthub360-auditoria-dividas.json:1-50`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/reviews/birthub360-auditoria-dividas.json#L1-L50) — No PR #741, 176 achados artificiais gerados sem causa raiz nem evidência de defeito.
- **Causa Raiz:** Execução automatizada superficial que violou as regras 'Não presuma que uma ocorrência textual é uma dívida' e 'Não altere código de produção'.
- **Impacto e Risco:** Se integrado em main, poluiria .agents/reviews/ com 176 falsos positivos e sobrescreveria o diagnóstico forense real.
- **Dependências da Correção:** Autorização humana para encerramento do PR #741
- **Estratégia de Remediação:** Não realizar merge do PR #741; encerrar o PR #741 e utilizar exclusivamente os artefatos forenses consolidados e auditados pelos Agentes 08 e 24.
- **Critério de Aprovação (Aceite):** PR #741 encerrado sem merge e .agents/reviews/ populado apenas com verificações contextuais auditadas.
- **Testes de Regressão Necessários:** Validação do Agente 24 exigindo causa raiz e confirmação contextual para 100% dos achados
- **Grau de Confiança:** Alta (inspeção direta dos commits abbe7a0e, 0d10c785 e f0f7bc14 no PR #741) | **Limitações da Verificação:** Nenhuma limitação.

### 3.19 [DEBT-OPS-002] Reinstalação Prisma na imagem permite resolver versão fora lock

- **Referência Cruzada:** `DEBT-20261014-OPS-002` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-17` (Build) | **Categorias Relacionadas:** `DT-07`, `DT-20`
- **Módulo Afetado:** build | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* P2: Imagem pode variar entre builds do mesmo commit e divergir CLI/client. Escopo comprovado estático; ocorrência de produção não medida.
- **Agente Responsável Principal:** `Agente 08` | **Agentes Participantes:** `00` | **Onda Recomendada:** **Onda 00** (Esforço: `M (1–3 dias de engenharia com ambiente disponível)`, Risco de Regressão: `moderado`)
- **Descrição Objetiva:** npm prune remove CLI e npm install --no-save utiliza range do manifesto(^7.10.0),sem versão exata do lock.
- **Evidência Técnica Reproduzível:**
  - [`Dockerfile:43-47`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/Dockerfile#L43-L47) — npm prune remove CLI e npm install --no-save utiliza range do manifesto(^7.10.0),sem versão exata do lock.
- **Causa Raiz:** npm prune remove CLI e npm install --no-save utiliza range do manifesto(^7.10.0),sem versão exata do lock.
- **Impacto e Risco:** Imagem pode variar entre builds do mesmo commit e divergir CLI/client.
- **Dependências da Correção:** Autorização específica para remediação; Ambiente descartável do14; Revisão independente24
- **Estratégia de Remediação:** Preservar CLI necessária ou instalar versão exata e árvore determinada pelo lock.
- **Critério de Aprovação (Aceite):** Build isolado sem resolução semver adicional; CLI/client iguais ao lock; migrate falha bloqueia boot.
- **Testes de Regressão Necessários:** Build isolado sem resolução semver adicional; CLI/client iguais ao lock; migrate falha bloqueia boot.
- **Grau de Confiança:** alta para contrato estático | **Limitações da Verificação:** Produto e infraestrutura não executados; Nenhuma correção aplicada

### 3.20 [DEBT-OPS-003] Contexto Docker não exclui cópias e artefatos temporários locais

- **Referência Cruzada:** `DEBT-20261014-OPS-003` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-07` (Infraestrutura e DevOps) | **Categorias Relacionadas:** `DT-17`, `DT-23`
- **Módulo Afetado:** container | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* P2: Build pode transferir cópias de repo e artefatos não necessários,aumentando contexto e prejudicando reprodutibilidade. Segredos nesses diretórios não foram examinados nem alegados. Escopo comprovado estático; ocorrência de produção não medida.
- **Agente Responsável Principal:** `Agente 08` | **Agentes Participantes:** `00` | **Onda Recomendada:** **Onda 00** (Esforço: `M (1–3 dias de engenharia com ambiente disponível)`, Risco de Regressão: `moderado`)
- **Descrição Objetiva:** Exclusões não cobrem .worktrees/ e .tmp/ e builder usa COPY . .; checkout local possui esses diretórios.
- **Evidência Técnica Reproduzível:**
  - [`.dockerignore:1-5`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.dockerignore#L1-L5) — Exclusões não cobrem .worktrees/ e .tmp/ e builder usa COPY . .; checkout local possui esses diretórios.
- **Causa Raiz:** Exclusões não cobrem .worktrees/ e .tmp/ e builder usa COPY . .; checkout local possui esses diretórios.
- **Impacto e Risco:** Build pode transferir cópias de repo e artefatos não necessários,aumentando contexto e prejudicando reprodutibilidade. Segredos nesses diretórios não foram examinados nem alegados.
- **Dependências da Correção:** Autorização específica para remediação; Ambiente descartável do14; Revisão independente24
- **Estratégia de Remediação:** Excluir diretórios efêmeros do contexto e verificar manifest de arquivos de build.
- **Critério de Aprovação (Aceite):** Fixture .tmp/.worktrees desaparece do contexto enquanto migrations e fontes necessárias permanecem.
- **Testes de Regressão Necessários:** Fixture .tmp/.worktrees desaparece do contexto enquanto migrations e fontes necessárias permanecem.
- **Grau de Confiança:** alta para contrato estático | **Limitações da Verificação:** Produto e infraestrutura não executados; Nenhuma correção aplicada

### 3.21 [DEBT-CAD-001] API permite criar cadência sem conteúdo e dispatcher envia texto placeholder para leads reais

- **Referência Cruzada:** `PROD-05` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Patch candidato isolado (não integrado em main)`)
- **Categoria Principal:** `DT-04` (Backend e APIs) | **Categorias Relacionadas:** `DT-35`, `DT-39`
- **Módulo Afetado:** Cadência Comercial | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P2** — *Justificativa:* P2 por risco de dano à reputação comercial caso sequência sem template seja disparada via API.
- **Agente Responsável Principal:** `Agente 17` | **Agentes Participantes:** `17`, `00` | **Onda Recomendada:** **Onda 03** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** Enquanto o modal do frontend (NewSequenceDialog) exige preenchimento de conteúdo, a rota POST de criação de sequência permite templateRef vazio/omitido e validateSequence não rejeita passos de email ou WhatsApp sem texto. Ao executar o touch, CadenceDispatchers.ts utiliza o fallback 'Mensagem de cadência sem conteúdo configurado' e dispara a mensagem para o contato.
- **Evidência Técnica Reproduzível:**
  - [`src/features/cadence/cadence.routes.ts:55-68`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/cadence/cadence.routes.ts#L55-L68) — templateRef opcional na validação de entrada da API.
  - [`src/features/cadence/domain/cadence.ts:144-165`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/cadence/domain/cadence.ts#L144-L165) — Ausência de regra exigindo templateRef não vazio para email e whatsapp.
  - [`src/features/cadence/infra/dispatchers/CadenceDispatchers.ts:100-135`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/cadence/infra/dispatchers/CadenceDispatchers.ts#L100-L135) — Envio de placeholder interno para transporte externo.
- **Causa Raiz:** Assimetria de validação entre formulário React e domínio backend combinada com fallback inseguro no dispatcher.
- **Impacto e Risco:** Risco de enviar mensagem placeholder interna para clientes/leads reais em sequências criadas via API ou legadas.
- **Dependências da Correção:** Revisão independente Agente 24
- **Estratégia de Remediação:** Exigir templateRef não vazio para canais email e whatsapp em validateSequence (mantendo opcional para voice) e bloquear envio nos dispatchers antes de consultar banco ou provedor.
- **Critério de Aprovação (Aceite):** verify-cadence.mjs passa para entradas válidas, omitidas, vazias e espaços em branco, preservando canal de voz.
- **Testes de Regressão Necessários:** verify-cadence.mjs cobrindo validateSequence e guardas de whatsAppCadenceDispatcher/emailCadenceDispatcher
- **Grau de Confiança:** Alta (reproduzido em verify-cadence.mjs) | **Limitações da Verificação:** Validado em nível de função de domínio e guarda de dispatcher.

### 3.22 [DEBT-ONB-001] Mutações concorrentes de módulos podem sobrescrever seleção anterior

- **Referência Cruzada:** `DEBT-20261014-ONB-001` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-29` (Onboarding) | **Categorias Relacionadas:** `DT-04`, `DT-39`
- **Módulo Afetado:** onboarding | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* P2 por falha/custo recorrente de domínio sem comprovação de perda de dados, cobrança real ou violação multi-tenant.
- **Agente Responsável Principal:** `Agente 01` | **Agentes Participantes:** `01` | **Onda Recomendada:** **Onda 03** (Esforço: `Médio`, Risco de Regressão: `Médio`)
- **Descrição Objetiva:** mutate faz load->fn->save->get; repository.save usa upsertSetting integral sem versão/CAS no contrato. Reprodução isolada do corpo mutate original com repository in-memory e barrier: enable(optional-a)/enable(optional-b) ambos completam, resultado guarda optional-b e perde optional-a.
- **Evidência Técnica Reproduzível:**
  - [`src/features/organization-modules/services/organizationModules.service.ts:69-74`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/organization-modules/services/organizationModules.service.ts#L69-L74) — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta.
  - [`src/features/organization-modules/infra/SettingOrganizationModulesRepository.ts:33-37`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/organization-modules/infra/SettingOrganizationModulesRepository.ts#L33-L37) — save substitui JSON completo, sem versão no contrato do repositório.
  - [`src/lib/voice-hub/repositories/settingRepository.ts:19-23`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/voice-hub/repositories/settingRepository.ts#L19-L23) — Atualização substitui JSON inteiro sem compare-and-swap. Repositório importado pelo onboarding atual apesar de pasta legacy.
- **Causa Raiz:** Read-modify-write separado sem controle de versão ou trava por organização.
- **Impacto e Risco:** enable(A) e enable(B) simultâneos podem ambos ler S e última gravação perder A ou B; somente mesmo tenant, sem prova de acesso cruzado.
- **Dependências da Correção:** 02; 01; 18
- **Estratégia de Remediação:** Executar transformação dentro de transação com lock por Setting ou CAS com retry limitado.
- **Critério de Aprovação (Aceite):** Teste simultâneo de enable(A)/enable(B) preserva ambas via CAS/lock/transação
- **Testes de Regressão Necessários:** Barrier test dois enables independentes preserva ambos; Enable concorrente com completeOnboarding preserva timestamp e seleção
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Reprodução usa corpo original extraído e repositório em memória; banco/HTTP reais não executados. Teste prova algoritmo read-modify-write, não quantifica ocorrência em produção.

### 3.23 [DEBT-UX-002] Paginação full-text de empresas restringe resultados ao primeiro lote

- **Referência Cruzada:** `DEBT-20261014-UX-002` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-36` (Busca) | **Categorias Relacionadas:** `DT-04`, `DT-39`
- **Módulo Afetado:** Empresas / busca | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* Resultados além do primeiro lote tornam-se inalcançáveis; página 2 fica vazia quando Meili retorna no máximo limit IDs. Evidência do caminho atual, sem inferir exploração em produção.
- **Agente Responsável Principal:** `Agente 04` | **Agentes Participantes:** `02`, `04` | **Onda Recomendada:** **Onda 03** (Esforço: `M`, Risco de Regressão: `médio`)
- **Descrição Objetiva:** Com ENABLE_SEARCH=true, o repositório pede os mesmos primeiros limit IDs em todas as páginas e só depois aplica skip no banco. Também conta só os IDs recuperados.
- **Evidência Técnica Reproduzível:**
  - [`src/features/companies/infra/PrismaCompanyRepository.ts:44-50`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/companies/infra/PrismaCompanyRepository.ts#L44-L50) — Busca só limit IDs, sem page/offset.
  - [`src/features/companies/infra/PrismaCompanyRepository.ts:66-81`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/companies/infra/PrismaCompanyRepository.ts#L66-L81) — Aplica offset do PostgreSQL ao mesmo conjunto limitado; total também fica limitado.
  - [`src/lib/search/index.ts:85-90`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/search/index.ts#L85-L90) — Meili recebe limit sem offset.
  - [`src/features/companies/infra/PrismaCompanyRepository.ts:44-50`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/companies/infra/PrismaCompanyRepository.ts#L44-L50) — Reprodução Node isolada exit0: 45hits, limite20:page1=20,page2=0,total=20 esperado45.
- **Causa Raiz:** Paginação aplicada duas vezes em contratos incompatíveis; total de busca perdido.
- **Impacto e Risco:** Resultados além do primeiro lote tornam-se inalcançáveis; página 2 fica vazia quando Meili retorna no máximo limit IDs.
- **Dependências da Correção:** 08: regressão isolada; 00: autorização específica de saneamento
- **Estratégia de Remediação:** Propagar paginação/total ao motor e preservar ordenação de relevância ou obter conjunto adequado sem aplicar segundo offset.
- **Critério de Aprovação (Aceite):** Busca com 45 resultados e limite20 retorna páginas20/20/5, total45, sem duplicatas.
- **Testes de Regressão Necessários:** Meili mock45 hits; páginas1,2,3; fallback indisponível; zero resultados; tenant distinto.
- **Grau de Confiança:** alta; reprodução isolada com corpos atuais de função e dependências sintéticas | **Limitações da Verificação:** Corpo atual executado após remover somente tipos TypeScript; mocks de serviços. HTTP,DB real e navegador NÃO EXECUTADOS.

### 3.24 [DEBT-UX-004] Analytics ativo usa calendário UTC apesar do contrato comercial Brasília

- **Referência Cruzada:** `DEBT-20261014-UX-004` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-32` (Internacionalização) | **Categorias Relacionadas:** `DT-31`, `DT-02`
- **Módulo Afetado:** Analytics / calendário | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* Receita/contagem/cohort no início do mês divergem por três horas e pelo mês durante a virada; indicadores deixam de ser comparáveis. Evidência do caminho atual, sem inferir exploração em produção.
- **Agente Responsável Principal:** `Agente 04` | **Agentes Participantes:** `02`, `04` | **Onda Recomendada:** **Onda 03** (Esforço: `M`, Risco de Regressão: `médio`)
- **Descrição Objetiva:** Rotas analytics usam Controller/UseCases via DI; UseCases calcula monthStart/monthKey em UTC enquanto serviço legado usa helper canônico Brasília.
- **Evidência Técnica Reproduzível:**
  - [`src/features/analytics/application/AnalyticsUseCases.ts:22-30`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/application/AnalyticsUseCases.ts#L22-L30) — Mês inicia em UTC00:00.
  - [`src/features/analytics/analytics.service.ts:86-98`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/analytics.service.ts#L86-L98) — Serviço paralelo usa calendário Brasil.
  - [`src/shared/di/setup.ts:178`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/di/setup.ts#L178) — DI instancia implementação UTC.
  - [`src/shared/time/brazilCalendar.ts:1`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/time/brazilCalendar.ts#L1) — Contrato de calendário America/Sao_Paulo.
- **Causa Raiz:** Migração para camada hexagonal não preservou calendário comercial.
- **Impacto e Risco:** Receita/contagem/cohort no início do mês divergem por três horas e pelo mês durante a virada; indicadores deixam de ser comparáveis.
- **Dependências da Correção:** 08: regressão isolada; 00: autorização específica de saneamento
- **Estratégia de Remediação:** Reutilizar calendário canônico na implementação realmente registrada e eliminar divergência contratual.
- **Critério de Aprovação (Aceite):** Instante2026-10-01T01:00Z pertence a setembro comercial em todos os endpoints.
- **Testes de Regressão Necessários:** Virada mensal00:00Z/03:00Z; dezembro/janeiro; host TZ UTC e SãoPaulo; API e export CSV coincidem.
- **Grau de Confiança:** alta (código); comportamento operacional não medido | **Limitações da Verificação:** Reprodução HTTP/browser não executada; confirmação estática do fluxo.

### 3.25 [DEBT-MOB-001] Build mobile padrão embute URL fallback do Render documentado como desativado

- **Referência Cruzada:** `OPS-004` | **Tipo de Registro:** Configuração inconsistente | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda decisão de endpoint mobile)`)
- **Categoria Principal:** `DT-16` (Configuração) | **Categorias Relacionadas:** `DT-07`, `DT-34`
- **Módulo Afetado:** Mobile / Configuração | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P2** — *Justificativa:* P2 porque afeta exclusivamente a distribuição mobile (condicional à inclusão do app nativo no release).
- **Agente Responsável Principal:** `Agente 09` | **Agentes Participantes:** `09`, `08`, `10`, `00` | **Onda Recomendada:** **Onda 04** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** Em capacitor.config.ts:41, a constante PRODUCTION_URL utiliza como fallback o endereço antigo do Render, que o próprio comentário e docs/deploy/README.md:16 declaram desativado. Os workflows android-build.yml e ios-build.yml executam 'npx cap sync' sem injetar CAPACITOR_SERVER_URL.
- **Evidência Técnica Reproduzível:**
  - [`capacitor.config.ts:38-46`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/capacitor.config.ts#L38-L46) — Fallback para endpoint Render desativado.
  - [`.github/workflows/android-build.yml:65-75`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.github/workflows/android-build.yml#L65-L75) — Ausência de CAPACITOR_SERVER_URL no workflow Android.
  - [`.github/workflows/ios-build.yml:58-66`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.github/workflows/ios-build.yml#L58-L66) — Ausência de CAPACITOR_SERVER_URL no workflow iOS.
- **Causa Raiz:** Transição para arquitetura Local-First sem atualização do fallback mobile e das variáveis de CI Android/iOS.
- **Impacto e Risco:** Artefatos APK/IPA gerados pelos workflows padrão tentarão conectar a um backend desativado caso distribuídos.
- **Dependências da Correção:** Definição do endpoint HTTPS definitivo pelo Agente 00 e Agente 10
- **Estratégia de Remediação:** Exigir CAPACITOR_SERVER_URL explícita nos workflows de build mobile (falhando fast se ausente em release) e atualizar capacitor.config.ts após decisão de endpoint.
- **Critério de Aprovação (Aceite):** Workflow mobile falha se CAPACITOR_SERVER_URL não for fornecida ou sincroniza com o endpoint HTTPS ativo validado.
- **Testes de Regressão Necessários:** Validação estática da configuração gerada pelo cap sync com variável de ambiente controlada
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Avaliação estática; SDK Android/iOS não executados.

### 3.26 [DEBT-NOT-001] Leitura broadcast silencia unread para colegas

- **Referência Cruzada:** `DEBT-20261014-NOT-001` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-35` (Notificações) | **Categorias Relacionadas:** `DT-39`
- **Módulo Afetado:** Notificações | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* Degrada controle/feedback localizado;sem evidência de perda de dados ou incidente ativo.
- **Agente Responsável Principal:** `Agente 02` | **Agentes Participantes:** `06`, `00`, `01`, `18` | **Onda Recomendada:** **Onda 04** (Esforço: `M`, Risco de Regressão: `Médio: schema/contrato/UI`)
- **Descrição Objetiva:** Notification tem readAt único;markRead de broadcast altera mesmo registro para toda organização.
- **Evidência Técnica Reproduzível:**
  - [`src/features/notifications/notification.service.ts:94-98`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/notifications/notification.service.ts#L94-L98) — Fonte direta no snapshot auditado; escopo do controle limitado ao título.
  - [`prisma/schema.prisma:2048-2052`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/schema.prisma#L2048-L2052) — Evidência complementar da causa/contrato.
- **Causa Raiz:** Modelo mistura notificação e estado por destinatário.
- **Impacto e Risco:** Colegas deixam de receber indicação não lida de alerta que não abriram.
- **Dependências da Correção:** Agente01 schema leitura por usuário; Agente18 contrato API
- **Estratégia de Remediação:** Manter leitura por usuário com modelo01 e contrato18,sem alterar conteúdo broadcast.
- **Critério de Aprovação (Aceite):** UsuárioA lê broadcast;B continua unread até lê-lo;estado não compartilhado.
- **Testes de Regressão Necessários:** UsuárioA lê broadcast;B continua unread até lê-lo;estado não compartilhado.
- **Grau de Confiança:** alta (fonte direta;runtime limitado aos mocks especificados) | **Limitações da Verificação:** Função exata com mock persistência; não certifica DB/RLS real.

### 3.27 [DEBT-UX-005] Deep links nativos Android divergem do catálogo de rotas web

- **Referência Cruzada:** `DEBT-20261014-UX-005` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-34` (Mobile e PWA) | **Categorias Relacionadas:** `DT-18`, `DT-39`
- **Módulo Afetado:** Android / navegação | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* Link válido do diagnóstico é rejeitado nativamente; link com nome antigo é aceito mas rota web redireciona ao dashboard. Outros destinos web ativos não abrem via esquema custom. Evidência do caminho atual, sem inferir exploração em produção.
- **Agente Responsável Principal:** `Agente 09` | **Agentes Participantes:** `02`, `09` | **Onda Recomendada:** **Onda 04** (Esforço: `M`, Risco de Regressão: `médio`)
- **Descrição Objetiva:** Comparação executada de listas: nativeOnly sdr-diagnostic-joao; webOnly inclui sdr-diagnostic, forecast, metas, signals-risks e outros destinos existentes.
- **Evidência Técnica Reproduzível:**
  - [`android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java:55-65`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java#L55-L65) — Lista manual nativa inclui sdr-diagnostic-joao e omite destinos web.
  - [`src/App.tsx:460`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/App.tsx#L460) — Rota real é sdr-diagnostic.
  - [`src/lib/navigationBus.ts:67`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/navigationBus.ts#L67) — Contrato web usa sdr-diagnostic.
- **Causa Raiz:** Espelho manual desatualizado sem gate de paridade.
- **Impacto e Risco:** Link válido do diagnóstico é rejeitado nativamente; link com nome antigo é aceito mas rota web redireciona ao dashboard. Outros destinos web ativos não abrem via esquema custom.
- **Dependências da Correção:** 08: regressão isolada; 00: autorização específica de saneamento
- **Estratégia de Remediação:** Sincronizar catálogo nativo com os destinos suportados e criar verificação automática de paridade, explicitando módulos desabilitados.
- **Critério de Aprovação (Aceite):** Deep link diagnóstico válido abre tela; inválido mostra erro; catálogo de destinos ativos coincide.
- **Testes de Regressão Necessários:** Comparação de sets; dispositivo/emulador para diagnóstico/forecast; destino inválido e usuário sem permissão.
- **Grau de Confiança:** alta (código); comportamento operacional não medido | **Limitações da Verificação:** Reprodução HTTP/browser não executada; confirmação estática do fluxo.

### 3.28 [DEBT-UX-006] Ícones declarados no manifest PWA não existem em public

- **Referência Cruzada:** `DEBT-20261014-UX-006` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-34` (Mobile e PWA) | **Categorias Relacionadas:** `DT-16`, `DT-17`
- **Módulo Afetado:** PWA / assets | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* Manifest fornece URLs sem artefato correspondente; identidade/instalabilidade do PWA fica comprometida em clientes que exigem esses ícones. Evidência do caminho atual, sem inferir exploração em produção.
- **Agente Responsável Principal:** `Agente 09` | **Agentes Participantes:** `02`, `09` | **Onda Recomendada:** **Onda 04** (Esforço: `M`, Risco de Regressão: `médio`)
- **Descrição Objetiva:** Inventário executado: public/icons/icon-192.png e icon-512.png ausentes; também favicon.ico/apple-touch-icon.png incluídos em includeAssets ausentes. Há ícone SVG de marca, mas não os PNG referenciados no manifest.
- **Evidência Técnica Reproduzível:**
  - [`vite.config.ts:30-40`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vite.config.ts#L30-L40) — Ícones192/512 e atalhos apontam a arquivos ausentes.
- **Causa Raiz:** Manifest não acompanhado por assets versionados ou etapa explícita de geração no script build.
- **Impacto e Risco:** Manifest fornece URLs sem artefato correspondente; identidade/instalabilidade do PWA fica comprometida em clientes que exigem esses ícones.
- **Dependências da Correção:** 08: regressão isolada; 00: autorização específica de saneamento
- **Estratégia de Remediação:** Gerar/reutilizar os ícones oficiais nos caminhos manifest e verificar existência/tamanho no gate de PWA.
- **Critério de Aprovação (Aceite):** Todas URLs do manifest e atalhos resolvem arquivo real com dimensão declarada.
- **Testes de Regressão Necessários:** Existência de public e dist; dimensões192/512; instalação Chromium em origemHTTPS isolada.
- **Grau de Confiança:** alta (código); comportamento operacional não medido | **Limitações da Verificação:** Ausência na árvore fonte confirmada; build e resposta HTTP não executados, geração externa não foi presumida.

### 3.29 [DEBT-UX-008] Falha inicial da API prende o Copiloto Executivo em estado de carregamento infinito (spinner permanente)

- **Referência Cruzada:** `PROD-04` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Patch candidato isolado (não integrado em main)`)
- **Categoria Principal:** `DT-03` (Frontend e UX) | **Categorias Relacionadas:** `DT-10`, `DT-39`
- **Módulo Afetado:** Frontend / Copiloto | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P2** — *Justificativa:* P2 por degradar a resiliência de UX na tela do Copiloto sob falha de rede/API.
- **Agente Responsável Principal:** `Agente 07` | **Agentes Participantes:** `07`, `02` | **Onda Recomendada:** **Onda 04** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** Em EliteCommercialAgentWorkspace.tsx:127, a guarda de carregamento 'if (loading || !overview)' é avaliada antes do bloco 'if (error)'. Quando a carga inicial da API falha, loading passa para false, error recebe a mensagem de falha e overview permanece null — fazendo o componente renderizar o spinner eternamente e tornando o bloco de erro/retry inalcançável.
- **Evidência Técnica Reproduzível:**
  - [`src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx:124-145`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx#L124-L145) — Ordem de guardas if (loading || !overview) bloqueia o ramo if (error || !overview).
- **Causa Raiz:** Condição booleana disjuntiva (!overview) colocada no guard de loading em vez de ficar após o tratamento de erro.
- **Impacto e Risco:** Qualquer erro transitório de rede ou HTTP 500 na abertura da tela trava a interface em loading infinito sem opção de retry.
- **Dependências da Correção:** Revisão independente Agente 24
- **Estratégia de Remediação:** Alterar a primeira guarda na linha 127 para 'if (loading)' para que o bloco seguinte 'if (error || !overview)' seja alcançado e exiba o botão de retry.
- **Critério de Aprovação (Aceite):** Simulação de erro 500 na carga inicial renderiza a mensagem de erro e permite acionar retry com sucesso.
- **Testes de Regressão Necessários:** Asserção em verify-elite.mjs e teste de componente React com falha inicial da API
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Confirmado estaticamente no código-fonte.

### 3.30 [DEBT-INT-001] Timeout Bitrix encerra antes leitura do corpo

- **Referência Cruzada:** `DEBT-20261014-INT-001` | **Tipo de Registro:** Risco operacional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-09` (Integrações externas) | **Categorias Relacionadas:** `DT-21`
- **Módulo Afetado:** Bitrix | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* Degrada controle/feedback localizado;sem evidência de perda de dados ou incidente ativo.
- **Agente Responsável Principal:** `Agente 06` | **Agentes Participantes:** `06`, `00` | **Onda Recomendada:** **Onda 05** (Esforço: `P`, Risco de Regressão: `Médio: fluxo de execução/falha`)
- **Descrição Objetiva:** O timer é cancelado após headers antes response.json; corpo lento pode manter operação sem teto.
- **Evidência Técnica Reproduzível:**
  - [`src/features/integrations/bitrix/service/client.ts:159-216`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/bitrix/service/client.ts#L159-L216) — Timer removido na linha190 antes response.json214;reprodução exata com fake response e timeout encurtado5ms permanece pendente30ms.
  - [`src/features/integrations/bitrix/service/client.ts:92-96`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/bitrix/service/client.ts#L92-L96) — Evidência complementar da causa/contrato.
- **Causa Raiz:** Cancelamento antecipado do AbortController.
- **Impacto e Risco:** Job/requisição pode aguardar corpo indefinidamente apesar contrato15s.
- **Dependências da Correção:** Ambiente isolado homologação; Revisão24; Autorização específica correção
- **Estratégia de Remediação:** Preservar timer até consumir body em finally; aplicar também testWebhook.
- **Critério de Aprovação (Aceite):** Mock entrega headers e bloqueia corpo; operação deve abortar em15s.
- **Testes de Regressão Necessários:** Mock entrega headers e bloqueia corpo; operação deve abortar em15s.
- **Grau de Confiança:** alta (fonte direta;runtime limitado aos mocks especificados) | **Limitações da Verificação:** Função exata isolada com safeFetch fake;timer5ms;nenhum servidor/provedor real.

### 3.31 [DEBT-UX-007] Busca textual da base retorna lista vazia quando banco falha

- **Referência Cruzada:** `DEBT-20261014-UX-007` | **Tipo de Registro:** Defeito funcional | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-36` (Busca) | **Categorias Relacionadas:** `DT-19`, `DT-39`
- **Módulo Afetado:** Base de conhecimento / busca | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* Falha de banco é apresentada como ausência de conhecimento; usuário pode concluir que documento não existe. Evidência do caminho atual, sem inferir exploração em produção.
- **Agente Responsável Principal:** `Agente 07` | **Agentes Participantes:** `02`, `07` | **Onda Recomendada:** **Onda 05** (Esforço: `M`, Risco de Regressão: `médio`)
- **Descrição Objetiva:** Se FTS falha, tenta ILIKE; se fallback falha, retorna []. Quando busca semântica também indisponível, hybridSearch retorna hits[] indistinguíveis de nenhum documento encontrado.
- **Evidência Técnica Reproduzível:**
  - [`src/features/knowledge/search.service.ts:178-180`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/knowledge/search.service.ts#L178-L180) — Falha FTS e ILIKE é logada, mas resposta vira [] em vez de erro.
  - [`src/features/knowledge/search.service.ts:54-64`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/knowledge/search.service.ts#L54-L64) — Status relata disponibilidade semântica, não falha keyword.
- **Causa Raiz:** Contrato só distingue indisponibilidade semântica; não distingue erro da busca textual.
- **Impacto e Risco:** Falha de banco é apresentada como ausência de conhecimento; usuário pode concluir que documento não existe.
- **Dependências da Correção:** 08: regressão isolada; 00: autorização específica de saneamento
- **Estratégia de Remediação:** Propagar falha da busca textual ou declarar disponibilidade de ambas estratégias e sinalizar erro quando nenhuma executou.
- **Critério de Aprovação (Aceite):** Banco indisponível não gera falso empty; semântica indisponível com textual funcional mantém fallback claro.
- **Testes de Regressão Necessários:** FTS falha/ILIKE sucesso; ambos falham; embeddings falham e keywords sucesso; ambas estratégias indisponíveis.
- **Grau de Confiança:** alta (código); comportamento operacional não medido | **Limitações da Verificação:** Reprodução HTTP/browser não executada; confirmação estática do fluxo.

### 3.32 [DEBT-AI-001] Streaming não aplica quota por tier

- **Referência Cruzada:** `DEBT-20261014-AI-001` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-10` (Inteligência artificial) | **Categorias Relacionadas:** `DT-27`
- **Módulo Afetado:** IA streaming | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* Degrada controle/feedback localizado;sem evidência de perda de dados ou incidente ativo.
- **Agente Responsável Principal:** `Agente 23` | **Agentes Participantes:** `06`, `00` | **Onda Recomendada:** **Onda 06** (Esforço: `P`, Risco de Regressão: `Médio: fluxo de execução/falha`)
- **Descrição Objetiva:** streamChatCompletion chama orçamento monetário mas não enforceTokenQuota;invoke aplica o controle.
- **Evidência Técnica Reproduzível:**
  - [`src/lib/ai/gateway/streaming.ts:32-36`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/gateway/streaming.ts#L32-L36) — Fonte direta no snapshot auditado; escopo do controle limitado ao título.
  - [`src/lib/ai/gateway/chat-model.ts:144-148`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/gateway/chat-model.ts#L144-L148) — Evidência complementar da causa/contrato.
- **Causa Raiz:** Dois caminhos saída com controles distintos.
- **Impacto e Risco:** Quota de tokens premium por tier não cobre streaming; teto monetário continua existindo.
- **Dependências da Correção:** Ambiente isolado homologação; Revisão24; Autorização específica correção
- **Estratégia de Remediação:** Aplicar decisão quota antes streaming e registrar consumo por mesma fonte.
- **Critério de Aprovação (Aceite):** Quota excedida impede streaming premium antes fetch e usa mesma política do invoke.
- **Testes de Regressão Necessários:** Quota excedida impede streaming premium antes fetch e usa mesma política do invoke.
- **Grau de Confiança:** alta (fonte direta;runtime limitado aos mocks especificados) | **Limitações da Verificação:** Não prova consumo real/exploração nem ausência de limites monetários.

### 3.33 [DEBT-PERF-001] Resumo de consumo carrega todas as linhas AILog do período

- **Referência Cruzada:** `DEBT-20261014-PERF-001` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-04` (Backend e APIs) | **Categorias Relacionadas:** `DT-23`, `DT-27`
- **Módulo Afetado:** usage | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* P2 por falha/custo recorrente de domínio sem comprovação de perda de dados, cobrança real ou violação multi-tenant.
- **Agente Responsável Principal:** `Agente 01` | **Agentes Participantes:** `01` | **Onda Recomendada:** **Onda 07** (Esforço: `Médio`, Risco de Regressão: `Médio`)
- **Descrição Objetiva:** findLogsSince usa findMany sem take e UsageUseCases.summary soma/agrupa logs em JavaScript.
- **Evidência Técnica Reproduzível:**
  - [`src/features/billing/infra/PrismaUsageRepository.ts:11-16`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/billing/infra/PrismaUsageRepository.ts#L11-L16) — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta.
  - [`src/features/billing/application/UsageUseCases.ts:50-55`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/billing/application/UsageUseCases.ts#L50-L55) — Acumula toda lista obtida por findMany em memória.
- **Causa Raiz:** Agregação diária realizada em app em vez de SQL; consulta sem limite por período.
- **Impacto e Risco:** Memória e transferência O(n) por consulta conforme chamadas de IA crescem; latência absoluta e volume real não medidos.
- **Dependências da Correção:** 23; 07
- **Estratégia de Remediação:** Agregação groupBy de dia com SQL ou paginação bounded preservando totais por modelo/prompt.
- **Critério de Aprovação (Aceite):** Agregação diária SQL ou paginação bounded mantém resultados sem crescimento memória linear
- **Testes de Regressão Necessários:** Comparar totals/daily contra fixtures de dias e fusos; Orçamento memória/latência com dataset sintético volumoso
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Não medidos dados/configuração real de produção nem serviços externos; conclusão limitada à evidência citada.

### 3.34 [DEBT-FIN-001] Alerta orçamento IA usa vetores incompatíveis

- **Referência Cruzada:** `DEBT-20261014-FIN-001` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-27` (FinOps) | **Categorias Relacionadas:** `DT-19`
- **Módulo Afetado:** Observabilidade IA | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* Degrada controle/feedback localizado;sem evidência de perda de dados ou incidente ativo.
- **Agente Responsável Principal:** `Agente 10` | **Agentes Participantes:** `06`, `00`, `07`, `23` | **Onda Recomendada:** **Onda 08** (Esforço: `P`, Risco de Regressão: `Médio: fluxo de execução/falha`)
- **Descrição Objetiva:** Counter labels provider,tenant;budget Gauge sem esses labels.Divisão padrão não encontra correspondência,dados numerador não chegam resultado.
- **Evidência Técnica Reproduzível:**
  - [`infrastructure/observability/alert.rules.yml:260-264`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/infrastructure/observability/alert.rules.yml#L260-L264) — Fonte direta no snapshot auditado; escopo do controle limitado ao título.
  - [`src/lib/ai/metrics.ts:19-23`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/metrics.ts#L19-L23) — Evidência complementar da causa/contrato.
- **Causa Raiz:** Expressão PromQL sem agregação/explicit matching;contador lifetime também difere orçamento mensal.
- **Impacto e Risco:** AIBudgetOverrun pode permanecer vazio mesmo com custo emitido;não prova estado atual cloud.
- **Dependências da Correção:** Ambiente isolado homologação; Revisão24; Autorização específica correção
- **Estratégia de Remediação:** Construir métrica custo mensal alinhada budget global e expressão agregada;teste promtool positive/negative/mês.
- **Critério de Aprovação (Aceite):** promtool rule test com custos provider/tenant e gauge global deve disparar quando soma mensal>teto.
- **Testes de Regressão Necessários:** promtool rule test com custos provider/tenant e gauge global deve disparar quando soma mensal>teto.
- **Grau de Confiança:** alta (fonte direta;runtime limitado aos mocks especificados) | **Limitações da Verificação:** Regra inspecionada; promtool não instalado/executado.

### 3.35 [DEBT-DOC-001] Instrução de subir stack em LOCAL_FIRST.md e GO-LIVE-CHECKLIST.md omite overlay do PostgreSQL obrigatório para migrations

- **Referência Cruzada:** `OPS-003` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Patch candidato isolado (não integrado em main)`)
- **Categoria Principal:** `DT-11` (Documentação) | **Categorias Relacionadas:** `DT-07`, `DT-16`
- **Módulo Afetado:** Documentação / DevOps | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P2** — *Justificativa:* P2 por causar atrito de onboarding técnico e falha reproduzível no procedimento documentado de inicialização.
- **Agente Responsável Principal:** `Agente 08` | **Agentes Participantes:** `08`, `10`, `18` | **Onda Recomendada:** **Onda 09** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** O guia docs/development/LOCAL_FIRST.md:68 e o checklist docs/release/GO-LIVE-CHECKLIST.md:10 mandam executar 'docker compose up -d' seguido de 'npx prisma migrate deploy'. Contudo, o serviço postgres foi movido para o overlay docker-compose.postgres-local.yml, fazendo com que a porta 5434 não suba com o comando padrão.
- **Evidência Técnica Reproduzível:**
  - [`docs/development/LOCAL_FIRST.md:65-74`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/development/LOCAL_FIRST.md#L65-L74) — Comando omite -f docker-compose.postgres-local.yml.
  - [`docs/release/GO-LIVE-CHECKLIST.md:8-14`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/release/GO-LIVE-CHECKLIST.md#L8-L14) — Checklist repete comando incompleto.
- **Causa Raiz:** Extração do container PostgreSQL para arquivo compose de overlay sem atualização correspondente nos guias operacionais.
- **Impacto e Risco:** Falha imediata de conexão na etapa de migração ao provisionar ambiente novo seguindo a documentação oficial.
- **Dependências da Correção:** Revisão independente Agente 24
- **Estratégia de Remediação:** Atualizar LOCAL_FIRST.md e GO-LIVE-CHECKLIST.md para incluir '-f docker-compose.yml -f docker-compose.postgres-local.yml' e explicitar que o compose sobe apenas a infraestrutura.
- **Critério de Aprovação (Aceite):** Asserção automatizada confirma presença do comando composto nos dois documentos.
- **Testes de Regressão Necessários:** Asserção em verify-release-gate.mjs validando o comando documental exato
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Verificação estática documental.

### 3.36 [DEBT-GOV-002] Política local-first conflita com publicação automática GHCR

- **Referência Cruzada:** `DEBT-20261014-GOV-002` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-13` (Governança) | **Categorias Relacionadas:** `DT-11`, `DT-40`
- **Módulo Afetado:** CI/documentação | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P2** — *Justificativa:* P2: Operação externa de publicação pode ocorrer quando documentação afirma pipelines suspensos; política de distribuição torna-se ambígua. Escopo comprovado estático; ocorrência de produção não medida.
- **Agente Responsável Principal:** `Agente 00` | **Agentes Participantes:** `00` | **Onda Recomendada:** **Onda 09** (Esforço: `M (1–3 dias de engenharia com ambiente disponível)`, Risco de Regressão: `moderado`)
- **Descrição Objetiva:** GuiaLOCAL_FIRST afirma suspensão dos pipelines cloud; workflow de publicação tem gatilho workflow_run main ativo apósCI. Publicação de imagem não prova deploy.
- **Evidência Técnica Reproduzível:**
  - [`.github/workflows/docker-publish.yml:11-15`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.github/workflows/docker-publish.yml#L11-L15) — GuiaLOCAL_FIRST afirma suspensão dos pipelines cloud; workflow de publicação tem gatilho workflow_run main ativo apósCI. Publicação de imagem não prova deploy.
- **Causa Raiz:** GuiaLOCAL_FIRST afirma suspensão dos pipelines cloud; workflow de publicação tem gatilho workflow_run main ativo apósCI. Publicação de imagem não prova deploy.
- **Impacto e Risco:** Operação externa de publicação pode ocorrer quando documentação afirma pipelines suspensos; política de distribuição torna-se ambígua.
- **Dependências da Correção:** Autorização específica para remediação; Ambiente descartável do14; Revisão independente24
- **Estratégia de Remediação:** Decidir explicitamente se publicaçãoGHCR é permitida durante freeze e alinhar política/gatilho via08.
- **Critério de Aprovação (Aceite):** Fixture eventoCI main comprova publish habilitado/desabilitado conforme decisão;nenhum deploy real necessário.
- **Testes de Regressão Necessários:** Fixture eventoCI main comprova publish habilitado/desabilitado conforme decisão;nenhum deploy real necessário.
- **Grau de Confiança:** alta para contrato estático | **Limitações da Verificação:** Produto e infraestrutura não executados; Nenhuma correção aplicada

### 3.37 [DEBT-GOV-003] 13 handoffs históricos marcam 'Status: resolvido' no cabeçalho em contradição com o corpo (Postponed / Deploy Simulado)

- **Referência Cruzada:** `HANDOFFS-20261009-13-REPROVADOS` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Parcialmente saneado (2 de 13 reconciliados em e13b53dc; 11 permanecem abertos)`)
- **Categoria Principal:** `DT-13` (Governança) | **Categorias Relacionadas:** `DT-11`, `DT-12`, `DT-15`
- **Módulo Afetado:** Governança / Handoffs | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4`
- **Prioridade:** **P2** — *Justificativa:* P2 por comprometer a confiabilidade da memória operacional do repositório (AGENTS.md §8 e §40).
- **Agente Responsável Principal:** `Agente 00` | **Agentes Participantes:** `00`, `08`, `10`, `15`, `21`, `24` | **Onda Recomendada:** **Onda 09** (Esforço: `P (< 1 dia)`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** Conforme parecer independente em .agents/reviews/handoffs-2026-10-09-24.md, 13 handoffs em .agents/handoffs/** permanecem com cabeçalho 'Status: resolvido' enquanto suas seções de resolução declaram trabalho adiado (Postponed pós-Sprint 13, ex. downloads blob e voice command no app mobile, refatoração de legacy services), deploy apenas simulado no Render (onda-6 worker) ou decisão pendente (OPA middleware).
- **Evidência Técnica Reproduzível:**
  - [`.agents/reviews/handoffs-2026-10-09-24.md:28-55`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/reviews/handoffs-2026-10-09-24.md#L28-L55) — Tabela nominal dos 13 documentos reprovados documentalmente pelo Agente 24.
  - [`.agents/handoffs/onda-6/16-para-08-deploy-worker-service.md:1-25`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/handoffs/onda-6/16-para-08-deploy-worker-service.md#L1-L25) — Cabeçalho resolvido (Deploy Simulado no Render) contradiz ausência de deploy real.
  - [`.agents/handoffs/onda-1/00-para-01-legacy-services-repo-migration.md:1-30`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/handoffs/onda-1/00-para-01-legacy-services-repo-migration.md#L1-L30) — Cabeçalho resolvido enquanto resolução declara Postponed.
- **Causa Raiz:** Fechamento administrativo de ondas anteriores usando o marcador 'resolvido' para representar adiamento de escopo ou simulação documental.
- **Impacto e Risco:** Induz agentes e gestores a assumirem como implementadas funcionalidades que foram apenas adiadas ou simuladas.
- **Dependências da Correção:** Revisão independente Agente 24 após reconciliação dos cabeçalhos
- **Estratégia de Remediação:** Reconciliar os cabeçalhos dos 13 handoffs contraditórios (separando status 'adiado/bloqueado-freeze' ou 'parcial' de 'resolvido') e regenerar .agents/reviews/checklist-handoffs.html via node scripts/generate-handoffs-checklist.cjs.
- **Critério de Aprovação (Aceite):** Script de auditoria de handoffs reporta 0 contradições entre Status do cabeçalho e texto da seção Resolução.
- **Testes de Regressão Necessários:** Execução de node scripts/generate-handoffs-checklist.cjs e validação pelo Agente 24
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Escopo estritamente documental.

### 3.38 [DEBT-BILL-003] Função legada de renovação normaliza mês inválido e salta mês previsto

- **Referência Cruzada:** `DEBT-20261014-BILL-003` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-28` (Billing) | **Categorias Relacionadas:** `DT-39`
- **Módulo Afetado:** billing | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P3** — *Justificativa:* P3 por função defeituosa localizada em módulo legado desativado; sem exposição financeira atual comprovada.
- **Agente Responsável Principal:** `Agente 12` | **Agentes Participantes:** `01` | **Onda Recomendada:** **Onda 03** (Esforço: `Baixo`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** Execução da função pura computePeriodEnd extraída do fonte: 2026-01-31 mensal =>2026-03-03; 2026-03-31 mensal =>2026-05-01; 2024-02-29 anual =>2025-03-01.
- **Evidência Técnica Reproduzível:**
  - [`src/lib/voice-hub/services/billingService.ts:149-154`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/voice-hub/services/billingService.ts#L149-L154) — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta.
  - [`src/bootstrap/routes.ts:200-204`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/bootstrap/routes.ts#L200-L204) — Bootstrap expõe módulo legado como indisponível; serviços de billing voce-hub não possuem caminho HTTP ativo demonstrado.
- **Causa Raiz:** Date.setMonth/setFullYear normaliza dias inválidos para mês seguinte sem clamp.
- **Impacto e Risco:** Reutilizar serviço legado para faturamento carregaria cálculo incorreto de currentPeriodEnd. Bootstrap atual marca voice-hub indisponível; não há prova de efeito financeiro corrente.
- **Dependências da Correção:** 12; 18
- **Estratégia de Remediação:** Antes de reativar/reutilizar billing legado, fixar política de calendário e clamp de dia; não ampliar escopo nem reativar produto nesta auditoria.
- **Critério de Aprovação (Aceite):** 31 janeiro mensal resulta fim fevereiro; leap-day anual segue regra publicada
- **Testes de Regressão Necessários:** 31jan mensal encerra fevereiro; 31mar mensal encerra abril; 29fev anual segue regra explícita; Dias normais preservam dia e hora
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Função pura reproduzida; módulo indisponível em rota atual. Nenhum pagamento ou sessão real executado.

### 3.39 [DEBT-CODE-001] Signup executa user.count redundante para decidir ADMIN idêntico nos dois ramos

- **Referência Cruzada:** `DEBT-20261014-CODE-001` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-01` (Código-fonte) | **Categorias Relacionadas:** `DT-23`
- **Módulo Afetado:** auth | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P3** — *Justificativa:* P3 por custo localizado sem mudança funcional.
- **Agente Responsável Principal:** `Agente 01` | **Agentes Participantes:** `01` | **Onda Recomendada:** **Onda 03** (Esforço: `Baixo`, Risco de Regressão: `Baixo`)
- **Descrição Objetiva:** userCount é usado só por isFirstUser e ternário ADMIN/ADMIN.
- **Evidência Técnica Reproduzível:**
  - [`src/lib/auth.ts:345-350`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L345-L350) — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta.
  - [`src/lib/auth.ts:361-366`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L361-L366) — Ambos os ramos geram ADMIN; contagem é observacionalmente redundante.
- **Causa Raiz:** Lógica de primeiro usuário permaneceu após regra fundador sempre ADMIN.
- **Impacto e Risco:** Uma consulta ao banco dispensável em cada cadastro; aumenta manutenção e duração de seção bootstrap.
- **Dependências da Correção:** 01
- **Estratégia de Remediação:** Eliminar contagem e ternário redundante preservando regra aprovada de fundador.
- **Critério de Aprovação (Aceite):** Signup mantém ADMIN fundador sem consulta global redundante
- **Testes de Regressão Necessários:** Cadastro primeiro/segundo fundador gera mesmo papel e org própria sem user.count
- **Grau de Confiança:** Alta | **Limitações da Verificação:** Não medidos dados/configuração real de produção nem serviços externos; conclusão limitada à evidência citada.

### 3.40 [DEBT-GOV-001] Leitura obrigatória referencia plano de ondas ausente

- **Referência Cruzada:** `DEBT-20261014-GOV-001` | **Tipo de Registro:** Dívida técnica confirmada | **Estado:** Confirmado / Aberto (`Não iniciada (aguarda autorização)`)
- **Categoria Principal:** `DT-11` (Documentação) | **Categorias Relacionadas:** `DT-12`, `DT-13`
- **Módulo Afetado:** governança | **Commit Auditado:** `c7e33a911b734ddb3131a3ad08d421efbc823fd4 (base 9373fb224a8aba30a39f7d10d1a2be639c35af78)`
- **Prioridade:** **P3** — *Justificativa:* P3: Novo coordenador não consegue cumprir a sequência de reconhecimento obrigatória através da referência atual. Escopo comprovado estático; ocorrência de produção não medida.
- **Agente Responsável Principal:** `Agente 00` | **Agentes Participantes:** `00` | **Onda Recomendada:** **Onda 09** (Esforço: `M (1–3 dias de engenharia com ambiente disponível)`, Risco de Regressão: `moderado`)
- **Descrição Objetiva:** Prompt00 e README apontam EXECUCAO-ONDAS.md inexistente no snapshot/checkout; decisões de prompt são humanas.
- **Evidência Técnica Reproduzível:**
  - [`.agents/prompts/00-coordenador.md:13-17`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/prompts/00-coordenador.md#L13-L17) — Prompt00 e README apontam EXECUCAO-ONDAS.md inexistente no snapshot/checkout; decisões de prompt são humanas.
- **Causa Raiz:** Prompt00 e README apontam EXECUCAO-ONDAS.md inexistente no snapshot/checkout; decisões de prompt são humanas.
- **Impacto e Risco:** Novo coordenador não consegue cumprir a sequência de reconhecimento obrigatória através da referência atual.
- **Dependências da Correção:** Autorização específica para remediação; Ambiente descartável do14; Revisão independente24
- **Estratégia de Remediação:** Preparar decisão humana de governança para referência canônica;não editar prompt sem autorização.
- **Critério de Aprovação (Aceite):** Verificador de links obrigatórios resolve fonte versionada e revisão humana aprovada.
- **Testes de Regressão Necessários:** Verificador de links obrigatórios resolve fonte versionada e revisão humana aprovada.
- **Grau de Confiança:** alta para contrato estático | **Limitações da Verificação:** Produto e infraestrutura não executados; Nenhuma correção aplicada

## 4. Inventário Completo das 216 Verificações Técnicas (`DT-01` a `DT-40`)

| ID Check | Cat. | Descrição da Verificação | Agente | Módulo | Resultado | Achado / Prioridade | Evidência Principal | Critério de Aprovação |
| :--- | :---: | :--- | :---: | :--- | :---: | :---: | :--- | :--- |
| `DT-01-01` | `DT-01` | Isolar responsabilidades da extensão Prisma (tenancy, cifra, auditoria, soft-delete e indexação) | `01` | plataforma | **Parcialmente conforme** | — | [`src/lib/prisma.ts:135-140`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/prisma.ts#L135-L140) | Decomposição futura preserva RLS/cifra/auditoria sob testes; hotspot estático não comprova regressão |
| `DT-01-02` | `DT-01` | Rejeitar tipos implícitos no TypeScript configurado | `01` | código | **Conforme** | — | [`tsconfig.json:23-28`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/tsconfig.json#L23-L28) | Manter strict/noImplicitAny e executar typecheck offline em ambiente provisionado |
| `DT-01-03` | `DT-01` | Remover consulta de contagem cujo resultado não altera papel de fundador | `01` | auth | **Não conforme** | **DEBT-CODE-001** (P3) | [`src/lib/auth.ts:345-350`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L345-L350) | Signup mantém ADMIN fundador sem consulta global redundante |
| `DT-01-04` | `DT-01` | Restringir captura any em fronteiras de erro de autenticação | `01` | auth | **Parcialmente conforme** | — | [`src/lib/auth.ts:124-129`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L124-L129) | Capturar unknown e discriminar erro com tipos; typecheck garante consumidores |
| `DT-01-05` | `DT-01` | Verificar imports/variáveis mortos com ferramentas configuradas | `01` | código | **Não verificado** | — | [`tsconfig.json:30-35`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/tsconfig.json#L30-L35) | Rodar análise de código morto/unused e classificar cada ocorrência contextual |
| `DT-02-01` | `DT-02` | Verificar fonte única de hierarquia RBAC importada por middleware | `01` | auth | **Conforme** | — | [`src/lib/auth/authorization.ts:29-34`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth/authorization.ts#L29-L34) | Hierarquia permanece canônica e teste matriz positiva/negativa passa |
| `DT-02-02` | `DT-02` | Impedir dependências circulares por regra formal de arquitetura | `01` | arquitetura | **Conforme** | — | [`.dependency-cruiser.cjs:23-28`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.dependency-cruiser.cjs#L23-L28) | Regra presente; executar grafo completo sem novos ciclos antes saneamento |
| `DT-02-03` | `DT-02` | Medir violações arquiteturais aceitas por baseline sem confundi-las com gate verde | `01` | arquitetura | **Não verificado** | — | [`.dependency-cruiser-known-violations.json:6-11`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.dependency-cruiser-known-violations.json#L6-L11) | Reexecutar depcruise e deduplicar arestas atuais contra baseline |
| `DT-02-04` | `DT-02` | Separar regras billing de persistência em repositório próprio | `01` | billing | **Conforme** | — | [`src/lib/voice-hub/services/billingService.ts:11-16`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/voice-hub/services/billingService.ts#L11-L16) | Regras continuam no service e transação no repository, validar runtime separado |
| `DT-02-05` | `DT-02` | Resolver contratos de DI sem criar infraestrutura nova | `01` | arquitetura | **Conforme** | — | [`src/shared/di/container.ts:1-6`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/di/container.ts#L1-L6) | Container central presente; verificar wiringConsistency no ambiente de teste |
| `DT-02-06` | `DT-02` | Contrato OpenAPI (docs/openapi.yaml) preserva endpoints montados em /api/organization-modules após merges em main | `18` | Contratos / OpenAPI | **Não conforme** | **DEBT-API-001** (P1) | [`docs/openapi.yaml:10225-10235`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/openapi.yaml#L10225-L10235) | docs/openapi.yaml inclui integralmente os endpoints de /organization-modules e o script npm run verify:openapi-drift passa com exit 0. |
| `DT-03-01` | `DT-03` | Rotas de negócio são carregadas via lazy e Suspense | `02` | Frontend | **Conforme** | — | [`src/App.tsx:46`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/App.tsx#L46) | Todas rotas principais evitam import inicial eager de feature. |
| `DT-03-02` | `DT-03` | Layout principal possui landmark main | `03` | Layout | **Conforme** | — | [`src/components/layout/MainLayout.tsx:56`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/components/layout/MainLayout.tsx#L56) | Conteúdo principal exposto como landmark único do layout. |
| `DT-03-03` | `DT-03` | Modal compartilhado usa primitivas e nome de fechamento | `03` | UI / Dialog | **Conforme** | — | [`src/components/ui/Dialog.tsx:64`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/components/ui/Dialog.tsx#L64) | Contrato semântico de modal e nome de fechamento presentes; gesto verificado separadamente. |
| `DT-03-04` | `DT-03` | Foco visual global existe no CSS | `03` | Estilos | **Conforme** | — | [`src/styles/globals.css:1106`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/styles/globals.css#L1106) | Elementos focáveis possuem indicador de foco em estilos base. |
| `DT-03-05` | `DT-03` | Jornada de teclado e contraste em telas principais | `03` | Frontend | **Não verificado** | — | [`src/components/ui/Dialog.tsx:48`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/components/ui/Dialog.tsx#L48) | Tab/ShiftTab/Escape/restauração de foco e contraste WCAG2.2AA medidos. |
| `DT-03-06` | `DT-03` | Tela do Copiloto Executivo exibe estado de erro e botão de retry quando a primeira chamada de API falha | `07` | Frontend / Copiloto | **Não conforme** | **DEBT-UX-008** (P2) | [`src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx:124-145`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx#L124-L145) | Quando a requisição inicial falha (loading=false e error!=null), o bloco de erro com botão 'Tentar novamente' é renderizado imediatamente. |
| `DT-04-01` | `DT-04` | Validar payloads por schema parseAsync e encaminhar erro | `01` | backend | **Conforme** | — | [`src/shared/middlewares/validateRequest.ts:25-30`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/middlewares/validateRequest.ts#L25-L30) | Testar payload válido/inválido e erro de validação no handler |
| `DT-04-02` | `DT-04` | Limitar paginação CRM a inteiro positivo com cap central | `01` | backend | **Conforme** | — | [`src/shared/http/queryLimit.ts:11-16`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/http/queryLimit.ts#L11-L16) | limites negativos/ausentes/excessivos produzem 50/50/200 em teste |
| `DT-04-03` | `DT-04` | Padronizar códigos estáveis e indicação de retry nas respostas de erro | `01` | backend | **Conforme** | — | [`src/shared/middlewares/errorHandler.ts:17-22`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/middlewares/errorHandler.ts#L17-L22) | Erros conhecidos mantêm code/requestId/retryable em contrato HTTP |
| `DT-04-04` | `DT-04` | Evitar carga integral de AILog para totalizar consumo histórico | `01` | usage | **Não conforme** | **DEBT-PERF-001** (P2) | [`src/features/billing/infra/PrismaUsageRepository.ts:11-16`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/billing/infra/PrismaUsageRepository.ts#L11-L16) | Agregação diária SQL ou paginação bounded mantém resultados sem crescimento memória linear |
| `DT-04-05` | `DT-04` | Verificar sucesso/falha HTTP de usage sem chamar provedores reais | `01` | usage | **Não verificado** | — | [`src/features/billing/routes/usage.routes.ts:7-11`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/billing/routes/usage.routes.ts#L7-L11) | Executar contrato HTTP autenticado em app isolado com repositório stub |
| `DT-04-06` | `DT-04` | Validação de domínio e dispatchers de cadência bloqueiam passos de e-mail/WhatsApp sem conteúdo configurado | `17` | Cadência Comercial | **Não conforme** | **DEBT-CAD-001** (P2) | [`src/features/cadence/cadence.routes.ts:55-68`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/cadence/cadence.routes.ts#L55-L68) | validateSequence rejeita passos email/whatsapp sem conteúdo (retornando HTTP 400 na rota) e dispatchers abortam com resultado failed antes de acionar provedor externo. |
| `DT-05-01` | `DT-05` | Garantir FK de LeadTouchpoint para Lead no SQL versionado | `01` | dados | **Conforme** | — | [`prisma/migrations/20261012000000_add_missing_rls_and_fk_indexes/migration.sql:27-32`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/migrations/20261012000000_add_missing_rls_and_fk_indexes/migration.sql#L27-L32) | DDL presente; consultar pg_constraint no banco isolado para aplicação real |
| `DT-05-02` | `DT-05` | Garantir índice temporal por tenant em Wallet | `01` | billing | **Conforme** | — | [`prisma/schema.prisma:5399-5404`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/schema.prisma#L5399-L5404) | Verificar índice organizationId/createdAt presente schema e banco após migrate |
| `DT-05-03` | `DT-05` | Garantir unicidade de carteira por organização | `01` | billing | **Conforme** | — | [`prisma/schema.prisma:5401-5406`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/schema.prisma#L5401-L5406) | Schema e migration exigem uma Wallet por tenant; testar concorrência |
| `DT-05-04` | `DT-05` | Detectar órfãos reais e duplicidade nos registros comerciais | `01` | dados | **Não verificado** | — | [`prisma/schema.prisma:460-465`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/schema.prisma#L460-L465) | SQL LEFT JOIN/count executado em banco de teste sanitizado sem órfãos inesperados |
| `DT-05-05` | `DT-05` | Verificar que RLS é executada em conexão não superusuária | `01` | dados | **Não verificado** | — | [`tests/integration/rls-postgres-direct-enforcement.test.ts:2-7`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/tests/integration/rls-postgres-direct-enforcement.test.ts#L2-L7) | Teste direto de leitura/escrita cruzada executado com NOSUPERUSER e FORCE RLS |
| `DT-05-06` | `DT-05` | Documentação canônica de conexão PostgreSQL separa role superuser de bootstrap e role NOSUPERUSER da aplicação | `01` | Banco de Dados / RLS | **Não conforme** | **DEBT-DB-001** (P1) | [`docs/development/LOCAL_FIRST.md:35-45`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/development/LOCAL_FIRST.md#L35-L45) | Guia canônico e exemplos orientam DATABASE_URL com prospector_app (NOSUPERUSER) para a aplicação e DIRECT_URL separada apenas para migrações. |
| `DT-05-07` | `DT-05` | Repositórios SQL nativos do discador (PgCampaignRepository e PgLeadRepository) aplicam escopo explícito de tenant | `01A` | Cadência / Discador SQL | **Não conforme** | **DEBT-DB-002** (P1) | [`src/features/cadence/dialer/infrastructure/db/repositories/PgCampaignRepository.ts:32-71`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/cadence/dialer/infrastructure/db/repositories/PgCampaignRepository.ts#L32-L71) | Todas as queries SQL nativas do discador exigem organizationId explícito ou executam exclusivamente dentro de transação que define app.current_organization_id com teste negativo cross-tenant. |
| `DT-06-01` | `DT-06` | Evitar URLs de reset/verificação e PII em mensagens de log | `01` | auth | **Não conforme** | **DEBT-SEC-001** (P1) | [`src/lib/auth.ts:127-132`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L127-L132) | SMTP ausente não emite URL/token nem e-mail, inclusive msg serializada |
| `DT-06-02` | `DT-06` | Rejeitar segredo Better Auth ausente/fraco em produção | `01` | auth | **Conforme** | — | [`src/config/env.ts:437-442`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/config/env.ts#L437-L442) | Boot controlado aborta sem segredo/placeholder; não usar credencial real |
| `DT-06-03` | `DT-06` | Cifrar credenciais por AES-GCM com IV aleatório e authTag | `01` | segurança | **Conforme** | — | [`src/lib/crypto/secretFields.ts:55-60`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/crypto/secretFields.ts#L55-L60) | Testes de roundtrip/tamper comprovam não retorno de segredo em erro |
| `DT-06-04` | `DT-06` | Fixar destino externo validado contra DNS rebinding no guard compartilhado | `01` | segurança | **Conforme** | — | [`src/shared/security/urlGuard.ts:73-78`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/security/urlGuard.ts#L73-L78) | IPs privados/loopback e redirects revalidados em testes offline |
| `DT-06-05` | `DT-06` | Verificar cookie/sessão/CSRF e cross-tenant com teste negativo real | `01` | auth | **Não verificado** | — | [`src/shared/security/csrfGuard.ts:59-64`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/security/csrfGuard.ts#L59-L64) | Suíte isolada demonstra sessão expirada, Origin hostil e recurso cruzado negados |
| `DT-06-06` | `DT-06` | Exclusão LGPD grava supressão multicanal (OptOutRecord) antes de destruir identificadores | `01` | LGPD / Privacidade | **Não conforme** | **DEBT-LGPD-001** (P1) | [`src/shared/services/dataSubjectErasure.service.ts:115-135`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/services/dataSubjectErasure.service.ts#L115-L135) | Falha ao gravar OptOutRecord aborta anonimização e propaga erro; sucesso grava OptOutRecord antes de limpar campos PII. |
| `DT-06-07` | `DT-06` | Memória persistente de agentes (AgentMemory) possui vínculo por titular para expurgo LGPD | `01A` | IA / LGPD | **Não conforme** | **DEBT-LGPD-002** (P1) | [`prisma/schema.prisma:1766-1782`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/schema.prisma#L1766-L1782) | AgentMemory vincula titular (contactId/leadId) ou sanitiza PII na entrada, e eraseDataSubject remove/redige memórias do titular excluído. |
| `DT-07-01` | `DT-07` | Imagem executa processo com usuário não root | `08` | container | **Conforme** | — | [`Dockerfile:105-109`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/Dockerfile#L105-L109) | Inspeção da imagem comprova UID1001 e ausência de privilégios. |
| `DT-07-02` | `DT-07` | Migração bloqueia boot de imagem em caso de erro | `08` | container | **Conforme** | — | [`Dockerfile:132-133`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/Dockerfile#L132-L133) | Em container descartável migration com erro impede processo HTTP. |
| `DT-07-03` | `DT-07` | Config Prisma copiada para imagem runner | `08` | container | **Conforme** | — | [`Dockerfile:90-94`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/Dockerfile#L90-L94) | Container inspecionado contém config e migration CLI resolvida sem download. |
| `DT-07-04` | `DT-07` | Contexto Docker exclui cópias .worktrees e .tmp | `08` | container | **Não conforme** | **DEBT-OPS-003** (P2) | [`.dockerignore:1-5`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.dockerignore#L1-L5) | Contexto em fixture com .worktrees/.tmp não transporta esses caminhos. |
| `DT-07-05` | `DT-07` | Readiness Helm distinta de liveness | `10` | infra legado | **Conforme** | — | [`charts/birthhub-360/templates/deployment.yaml:58-62`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/charts/birthhub-360/templates/deployment.yaml#L58-L62) | Render Helm e simulação indisponibilidade DB tornam readiness false; escopo legado. |
| `DT-08-01` | `DT-08` | Suíte unitária descobre testes co-localizados fora de __tests__ | `14` | testes | **Não conforme** | **DEBT-OPS-001** (P1) | [`vitest.unit.config.ts:35-39`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vitest.unit.config.ts#L35-L39) | Inventário de descoberta inclui todos62 ou documenta exclusão explícita por suite. |
| `DT-08-02` | `DT-08` | Integração declara setup e execução serial | `14` | testes | **Conforme** | — | [`vitest.integration.config.ts:22-26`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vitest.integration.config.ts#L22-L26) | Banco descartável executa fixture limpa e isolamento sem dependência da ordem. |
| `DT-08-03` | `DT-08` | Cobertura inclui fontes não importadas e separa relatórios | `08` | testes | **Conforme** | — | [`vitest.unit.config.ts:64-68`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vitest.unit.config.ts#L64-L68) | Arquivo de produto sem import aparece no denominador e ambos relatórios coexistem. |
| `DT-08-04` | `DT-08` | Testes E2E usam servidor API real | `14` | testes | **Conforme** | — | [`playwright.config.ts:58-62`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/playwright.config.ts#L58-L62) | Login,CRUD,reload e autorização testados no banco descartável. |
| `DT-08-05` | `DT-08` | Resultado atual typecheck lint arquitetura unit e build | `08` | qualidade | **Não verificado** | — | [`package.json:91-95`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L91-L95) | Executar todos comandos locais após provisionamento autorizado sem alteração de fontes. |
| `DT-08-06` | `DT-08` | Script local de release gate (scripts/release-gate.js) bloqueia falha de typecheck/lint e exige suítes obrigatórias | `08` | QA / Release Gate | **Não conforme** | **DEBT-GATE-001** (P1) | [`scripts/release-gate.js:38-65`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/release-gate.js#L38-L65) | Qualquer falha em lint, typecheck, test:architecture, test:unit, test:integration, test:e2e, build ou npm audit resulta em STATUS: NO-GO e exit code != 0. |
| `DT-09-01` | `DT-09` | Timeout cobre também leitura de corpo Bitrix | `06` | Bitrix | **Não conforme** | **DEBT-INT-001** (P2) | [`src/features/integrations/bitrix/service/client.ts:159-216`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/bitrix/service/client.ts#L159-L216) | Mock entrega headers e bloqueia corpo; operação deve abortar em15s. |
| `DT-09-02` | `DT-09` | Retry diferencia429,5xx de401/403 | `06` | Bitrix | **Conforme** | — | [`src/features/integrations/bitrix/service/client.ts:192-196`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/bitrix/service/client.ts#L192-L196) | Testes client.test demonstram quatro tentativas transientes e nenhuma extra em401. |
| `DT-09-03` | `DT-09` | Paginação automática segue cursor e registra limite | `06` | Bitrix | **Conforme** | — | [`src/features/integrations/bitrix/service/leads.ts:186-190`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/bitrix/service/leads.ts#L186-L190) | Mock três páginas; alcançar terceira e sinalizar pagesExhausted false no limite. |
| `DT-09-04` | `DT-09` | OAuth renova token e delimita timeout | `06` | Google Workspace | **Conforme** | — | [`src/features/integrations/google/google.service.ts:221-225`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/google/google.service.ts#L221-L225) | Mock token expirado renova; provedor travado gera erro no timeout configurado. |
| `DT-09-05` | `DT-09` | Webhook voz exige assinatura e proteção replay | `12` | Birth Voice | **Conforme** | — | [`src/features/integrations/birth-voice/birthVoice.webhook.ts:299-303`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/birth-voice/birthVoice.webhook.ts#L299-L303) | Assinatura ausente/inválida e timestamp antigo negados; replay não duplica efeito. |
| `DT-10-01` | `DT-10` | Gateway fallback só por providers configurados | `07` | IA gateway | **Conforme** | — | [`src/lib/ai/gateway/chat-model.ts:78-82`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/gateway/chat-model.ts#L78-L82) | Mocks provedor indisponível e alternativo válido; resposta somente do alternativo real. |
| `DT-10-02` | `DT-10` | Streaming respeita quotas por tier como invoke | `23` | IA streaming | **Não conforme** | **DEBT-AI-001** (P2) | [`src/lib/ai/gateway/streaming.ts:32-36`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/gateway/streaming.ts#L32-L36) | Quota excedida impede streaming premium antes fetch e usa mesma política do invoke. |
| `DT-10-03` | `DT-10` | Circuit breaker registra falhas de streaming | `07` | IA streaming | **Conforme** | — | [`src/lib/ai/gateway/streaming.ts:68-72`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/gateway/streaming.ts#L68-L72) | Mock fetch e reader falhando; contador incrementa; circuito aberto impede chamada. |
| `DT-10-04` | `DT-10` | Saída IA tem checagem PII | `13` | IA gateway | **Conforme** | — | [`src/lib/ai/gateway/chat-model.ts:166-170`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/gateway/chat-model.ts#L166-L170) | Saída com PII sintética dispara bloqueio e saída sem PII mantém comportamento. |
| `DT-10-05` | `DT-10` | Avaliações reais de modelos no ambiente autorizado | `07` | IA avaliação | **Não verificado** | — | [`package.json:84-88`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L84-L88) | Executar dataset versionado com sandbox LLM e registrar precisão,latência,custo e falhas. |
| `DT-10-06` | `DT-10` | Workspace do Copiloto Executivo consome métricas reais de receita, meta e forecast do tenant | `07` | Inteligência Comercial / Copiloto | **Não conforme** | **DEBT-AI-002** (P1) | [`src/features/intelligence/routes/commercial-agent.routes.ts:35-85`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/routes/commercial-agent.routes.ts#L35-L85) | Rota /api/commercial-agent/workspace consulta agregações reais de analytics/metas do tenant ou sinaliza estado explícito de indisponibilidade, sem constantes fabricadas. |
| `DT-10-07` | `DT-10` | Ações de executar e adiar Next Best Action (NBA) no Copiloto acionam fluxo real e persistem estado | `07` | Inteligência Comercial / Copiloto | **Não conforme** | **DEBT-AI-003** (P1) | [`src/features/intelligence/routes/commercial-agent.routes.ts:210-245`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/routes/commercial-agent.routes.ts#L210-L245) | Execução/feedback de NBA persiste no banco/ledger com isolamento de tenant e aciona o dispatcher real, ou permanece explicitamente desabilitado até integração. |
| `DT-10-08` | `DT-10` | Endpoint de trace de missão autônoma e status de consentimento LGPD reflete estado real persistido | `07` | Inteligência Comercial / Enxame | **Não conforme** | **DEBT-AI-004** (P1) | [`src/features/intelligence/routes/commercial-agent.routes.ts:140-208`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/intelligence/routes/commercial-agent.routes.ts#L140-L208) | GET /mission/:missionId/trace consulta missão real escopada por tenant (retornando 404 quando inexistente) e valida registro real de consentimento LGPD. |
| `DT-11-01` | `DT-11` | Arquivo de ondas referido pelo coordenador existe | `00` | governança | **Não conforme** | **DEBT-GOV-001** (P3) | [`.agents/prompts/00-coordenador.md:13-17`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/prompts/00-coordenador.md#L13-L17) | Todas referências obrigatórias do prompt resolvem para documentos versionados. |
| `DT-11-02` | `DT-11` | Documentação identifica infraestrutura legada | `18` | documentação | **Conforme** | — | [`k8s/README.md:1-5`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/k8s/README.md#L1-L5) | Índices identificam o mesmo estado de ativação por ambiente. |
| `DT-11-03` | `DT-11` | Promessa de suspensão cloud coincide com publicação de imagem | `00` | CI/documentação | **Não conforme** | **DEBT-GOV-002** (P2) | [`docs/development/LOCAL_FIRST.md:3-7`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/development/LOCAL_FIRST.md#L3-L7) | Decisão de produto explicita se publicação de imagem permitida e gatilho corresponde. |
| `DT-11-04` | `DT-11` | Documento de dependências define gestão de vulnerabilidades | `15` | documentação | **Conforme** | — | [`docs/security/DEPENDENCY_POLICY.md:1-5`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/security/DEPENDENCY_POLICY.md#L1-L5) | Produzir SBOM por SHA e validar waiver expirado/sem dono bloqueante. |
| `DT-11-05` | `DT-11` | Histórico de milhares de alertas possui confirmação contextual | `00` | histórico | **Não verificado** | — | [`TECH_DEBT_REMEDIATION_PLAN.md:6-10`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/TECH_DEBT_REMEDIATION_PLAN.md#L6-L10) | Revalidar candidato por contexto,causa raiz e deduplicação antes de classificar. |
| `DT-11-06` | `DT-11` | Guia de inicialização local e checklist de go-live incluem o overlay docker-compose.postgres-local.yml antes das migrations | `08` | Documentação / DevOps | **Não conforme** | **DEBT-DOC-001** (P2) | [`docs/development/LOCAL_FIRST.md:65-74`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/development/LOCAL_FIRST.md#L65-L74) | Documentação especifica docker compose -f docker-compose.yml -f docker-compose.postgres-local.yml up -d antes de rodar migrations. |
| `DT-12-01` | `DT-12` | Topologia oficial possui entrada única documentada | `18` | conhecimento | **Conforme** | — | [`docs/operations/PRODUCTION_ARCHITECTURE.md:5-9`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/operations/PRODUCTION_ARCHITECTURE.md#L5-L9) | Onboarding operacional identifica cada serviço sem presumir cloud ativo. |
| `DT-12-02` | `DT-12` | Regras arquiteturais possuem racional vinculado | `18` | conhecimento | **Conforme** | — | [`docs/architecture/DEPENDENCY_RULES.md:6-10`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/architecture/DEPENDENCY_RULES.md#L6-L10) | Regra e exceção têm justificativa,dono e teste de violação. |
| `DT-12-03` | `DT-12` | Exceções de tamanho têm fonte rastreável | `00` | arquitetura | **Conforme** | — | [`scripts/architecture/check-hotspots.ts:26-30`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/architecture/check-hotspots.ts#L26-L30) | Exceção vencida ou limite ultrapassado retorna erro sem atualizar baseline. |
| `DT-12-04` | `DT-12` | Conhecimento de incidentes está presente em handoffs | `00` | conhecimento | **Conforme** | — | [`.agents/README.md:33-37`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/README.md#L33-L37) | Handoff novo documenta reprodução,proprietário,evidência e critério. |
| `DT-12-05` | `DT-12` | Runbook permite outro operador executar contingência | `10` | continuidade | **Não verificado** | — | [`docs/operations/RUNBOOKS.md:6-10`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/operations/RUNBOOKS.md#L6-L10) | Operador executa cenário de incidente em ambiente descartável e registra tempos/resultado. |
| `DT-13-01` | `DT-13` | Proprietários exclusivos declarados na governança | `00` | governança | **Conforme** | — | [`AGENTS.md:398-402`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/AGENTS.md#L398-L402) | Matriz da missão respeita donos e nenhuma mudança fora escopo. |
| `DT-13-02` | `DT-13` | Slots exclusivos e capacidade real respeitados | `00` | governança | **Conforme** | — | [`AGENTS.md:388-392`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/AGENTS.md#L388-L392) | Verificar paths e nenhum escritor concorrente sobre conteúdo de produto. |
| `DT-13-03` | `DT-13` | Decisões de prompt permanecem humanas | `00` | governança | **Conforme** | — | [`AGENTS.md:433-437`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/AGENTS.md#L433-L437) | Comparar hashes e diff antes/depois em todos prompts. |
| `DT-13-04` | `DT-13` | Fonte de checklist não confunde revisão pessoal com aprovação | `00` | governança | **Conforme** | — | [`.agents/README.md:48-52`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/README.md#L48-L52) | Painel da nova auditoria somente filtra/exporta; nenhum setter de estado oficial. |
| `DT-13-05` | `DT-13` | Auditor independente revisa esta exata entrega | `24` | revisão | **Não verificado** | — | [`AGENTS.md:903-907`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/AGENTS.md#L903-L907) | Parecer24 APROVADO para pacote final,sem conteúdo modificado após hashes. |
| `DT-13-06` | `DT-13` | Handoffs históricos encerrados com Status: resolvido possuem evidência compatível sem contradição documental | `24` | Governança / Handoffs | **Não conforme** | **DEBT-GOV-003** (P2) | [`.agents/reviews/handoffs-2026-10-09-24.md:28-55`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/reviews/handoffs-2026-10-09-24.md#L28-L55) | Todos os handoffs com adiamento, simulação ou resolução parcial exibem status fiel no cabeçalho e no checklist-handoffs.html. |
| `DT-14-01` | `DT-14` | Base branch SHA e relação com ref remota rastreados | `08A` | Git | **Conforme** | — | [`package.json:2-6`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L2-L6) | Manifest registra SHA completo,branch e distinção ref local de estado remoto vivo. |
| `DT-14-02` | `DT-14` | Alterações locais anteriores preservadas | `00` | Git | **Conforme** | — | [`AGENTS.md:458-462`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/AGENTS.md#L458-L462) | Comparação final dos hashes dos5214 caminhos e histórico local sem descarte. |
| `DT-14-03` | `DT-14` | Worktrees efêmeros excluídos do Git | `08A` | Git | **Conforme** | — | [`.gitignore:81-85`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.gitignore#L81-L85) | git check-ignore comprova fixture .worktrees e nenhum gitlink sem gitmodules. |
| `DT-14-04` | `DT-14` | Backups e arquivos env reais não fazem parte snapshot | `15` | Git | **Conforme** | — | [`.gitignore:9-13`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.gitignore#L9-L13) | Scanner de segredo no histórico e artefatos,com redaction,antes release. |
| `DT-14-05` | `DT-14` | Proteção main e revisões remotas em vigor | `08A` | Git remoto | **Não verificado** | — | [`AGENTS.md:558-562`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/AGENTS.md#L558-L562) | API read-only comprova checks required,reviewers e proibição force push. |
| `DT-14-06` | `DT-14` | Pull requests de auditoria preservam código funcional inalterado e exigem confirmação contextual de achados | `08A` | Git / Governança de PRs | **Não conforme** | **DEBT-GOV-004** (P2) | [`scripts/run-tech-debt-audit.ts:55-95`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/run-tech-debt-audit.ts#L55-L95) | PR #741 fechado/descartado sem merge em main, substituído pelo pacote forense validado pelo Agente 08 e Agente 24 sem alterações em código de produto. |
| `DT-15-01` | `DT-15` | Auditoria24 é obrigatória inclusive documentação | `24` | revisão | **Conforme** | — | [`AGENTS.md:907-911`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/AGENTS.md#L907-L911) | Parecer separado contém autor/auditor/revisão exata e decisão. |
| `DT-15-02` | `DT-15` | Aprovação histórica identifica hashes exatos | `24` | revisão | **Conforme** | — | [`.agents/prompts/24-revisao-independente.md:26-27`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/prompts/24-revisao-independente.md#L26-L27) | Mudar um arquivo invalida parecer anterior e exige nova revisão. |
| `DT-15-03` | `DT-15` | CI aplica dependency-review em pull requests | `15` | CI | **Conforme** | — | [`.github/workflows/ci.yml:40-44`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.github/workflows/ci.yml#L40-L44) | PR de fixture high sem waiver falha; exceção vigente rastreada. |
| `DT-15-04` | `DT-15` | Revisões e status históricos possuem evidência funcional atual | `24` | histórico | **Não verificado** | — | [`.agents/prompts/24-revisao-independente.md:18-22`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/prompts/24-revisao-independente.md#L18-L22) | Revisar cada handoff selecionado lendo resolução e teste atual,sem aceitar status apenas. |
| `DT-15-05` | `DT-15` | GitHub aplica owners automaticamente | `00` | revisão remota | **Não verificado** | — | [`.agents/README.md:4-8`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.agents/README.md#L4-L8) | Consultar políticas e estabelecer revisão de domínio verificável quando requerida. |
| `DT-16-01` | `DT-16` | NODE_ENV obrigatório validado por enum | `01` | Configuração | **Conforme** | — | [`src/config/env.ts:10-14`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/config/env.ts#L10-L14) | Subprocesso sem NODE_ENV ou valor inválido sai nãozero. |
| `DT-16-02` | `DT-16` | Bypass de auth proibido em produção | `01` | Configuração | **Conforme** | — | [`src/config/env.ts:355-359`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/config/env.ts#L355-L359) | Subprocesso produção+flag true aborta;test/dev seguem contrato. |
| `DT-16-03` | `DT-16` | Janela de discagem validada start<end | `12` | Configuração voz | **Conforme** | — | [`src/config/env.ts:337-341`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/config/env.ts#L337-L341) | start18/end9 rejeitado;start9/end18 aceito. |
| `DT-16-04` | `DT-16` | Retenção extração tem limite configurado | `06` | Configuração Bitrix | **Conforme** | — | [`src/config/env.ts:275-279`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/config/env.ts#L275-L279) | Zero/negativo rejeitado;positivo aceito e worker aplica prazo. |
| `DT-16-05` | `DT-16` | Consistência valores efetivos de env deploy | `10` | Configuração | **Não verificado** | — | [`src/config/env.ts:342-346`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/config/env.ts#L342-L346) | Comparar inventário sanitizado de nomes/defaults com ambiente autorizado sem revelar valores secretos. |
| `DT-16-06` | `DT-16` | Build mobile Capacitor e workflows Android/iOS apontam para endpoint de produção ativo | `09` | Mobile / Configuração | **Não conforme** | **DEBT-MOB-001** (P2) | [`capacitor.config.ts:38-46`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/capacitor.config.ts#L38-L46) | Builds mobile de distribuição exigem CAPACITOR_SERVER_URL explícita e validada ou apontam para endpoint HTTPS ativo autorizado. |
| `DT-17-01` | `DT-17` | Build utiliza npm ci no estágio de instalação | `08` | build | **Conforme** | — | [`Dockerfile:23-27`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/Dockerfile#L23-L27) | Build limpo em ambiente isolado repete árvore do lockfile. |
| `DT-17-02` | `DT-17` | CLI Prisma em runner segue versão exata lockfile | `08` | build | **Não conforme** | **DEBT-OPS-002** (P2) | [`Dockerfile:43-47`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/Dockerfile#L43-L47) | CLI runner coincide com versão exata lockfile; build não re-resolve dependências fora lock. |
| `DT-17-03` | `DT-17` | Budgets de bundles e arquivos públicos existem | `23` | build | **Conforme** | — | [`package.json:59-63`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L59-L63) | Fixture excedendo limite em cada eixo falha e limites possuem baseline aprovado. |
| `DT-17-04` | `DT-17` | Build contempla saída HTTP e worker | `08` | build | **Conforme** | — | [`Dockerfile:28-32`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/Dockerfile#L28-L32) | Imagem executa ambas entradas sem tsx de desenvolvimento. |
| `DT-17-05` | `DT-17` | Build atual é reproduzível no ambiente auditado | `14` | build | **Não verificado** | — | [`package.json:29-33`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L29-L33) | Duas builds autorizadas limpas do mesmoSHA produzem manifest de artefatos consistente. |
| `DT-18-01` | `DT-18` | Runtimes suportados declarados no manifesto | `08` | Runtime | **Conforme** | — | [`package.json:7`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L7) | Manifest declara runtime; compatibilidade efetiva verificada por CI separadamente. |
| `DT-18-02` | `DT-18` | Config PWA nega fallback HTML para API/webhook | `09` | PWA | **Conforme** | — | [`vite.config.ts:77`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vite.config.ts#L77) | Navegação de API/webhook não recebe fallback HTML do SW. |
| `DT-18-03` | `DT-18` | OCR apresenta fallback quando câmera não é permitida | `05` | OCR | **Conforme** | — | [`src/features/prospecting/components/prospecting-hub/OcrCapturePanel.tsx:116`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/prospecting/components/prospecting-hub/OcrCapturePanel.tsx#L116) | Falha camera gera instrução acionável e entrada de arquivo disponível. |
| `DT-18-04` | `DT-18` | Build Android e APIs WebView suportadas em dispositivo | `09` | Android | **Não verificado** | — | [`android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java:47`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java#L47) | Artefato Android inicia/login/camera e fluxo CRM real em dispositivo. |
| `DT-18-05` | `DT-18` | Nomes do diagnóstico coincidem entre web e deep link | `09` | Android / navegação | **Não conforme** | **DEBT-UX-005** (P2) | [`android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java:61`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java#L61) | Catálogo nativo e rota web possuem destino canônico idêntico. |
| `DT-19-01` | `DT-19` | Logs estruturados redigem chaves sensíveis | `15` | Logs | **Conforme** | — | [`src/lib/logger.ts:35-39`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/logger.ts#L35-L39) | Canário sintético password/token/headers não aparece em saída. |
| `DT-19-02` | `DT-19` | Classificação guard exige origem Redis | `16` | Runtime | **Não conforme** | **DEBT-OPS-006** (P1) | [`src/lib/process-guards.ts:48-52`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/process-guards.ts#L48-L52) | Erro application ECONNRESET termina fatal;erro Redis conhecido segue log.error. |
| `DT-19-03` | `DT-19` | Alerta orçamento compara vetores compatíveis | `10` | Observabilidade IA | **Não conforme** | **DEBT-FIN-001** (P2) | [`infrastructure/observability/alert.rules.yml:260-264`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/infrastructure/observability/alert.rules.yml#L260-L264) | promtool rule test com custos provider/tenant e gauge global deve disparar quando soma mensal>teto. |
| `DT-19-04` | `DT-19` | Instrumentação servidor precede bootstrap | `10` | Tracing | **Conforme** | — | [`server.ts:1-5`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/server.ts#L1-L5) | Iniciar sandbox e confirmar span HTTP com trace e duração;arquivo primeiro import verificado. |
| `DT-19-05` | `DT-19` | Alertas chegam operador | `10` | Alertas | **Não verificado** | — | [`infrastructure/observability/alert.rules.yml:54-58`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/infrastructure/observability/alert.rules.yml#L54-L58) | Em sandbox emitir alerta sintético e demonstrar entrega autorizada; não enviar nesta missão. |
| `DT-20-01` | `DT-20` | Atualizações dependências têm rotina semanal | `08` | Dependências | **Conforme** | — | [`.github/dependabot.yml:6-7`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.github/dependabot.yml#L6-L7) | Configuração semanal presente e validar execução em histórico CI. |
| `DT-20-02` | `DT-20` | Inventário detecta pré-release offline | `08` | Dependências | **Conforme** | — | [`scripts/security/dependency-inventory.ts:9-13`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/security/dependency-inventory.ts#L9-L13) | Rodar fixture lock com release/rc;rc identificado e release não marcado. |
| `DT-20-03` | `DT-20` | Waivers de auditoria têm checker dedicado | `15` | Dependências | **Conforme** | — | [`package.json:47-51`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L47-L51) | Checker deve falhar para waiver expirado e passar vigente. |
| `DT-20-04` | `DT-20` | SBOM com saída reproduzível declarado | `08` | Dependências | **Conforme** | — | [`package.json:48-52`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L48-L52) | Executar SBOM offline com deps instaladas;comparar arquivos duas execuções. |
| `DT-20-05` | `DT-20` | Vulnerabilidades/deprecações atuais | `15` | Dependências | **Não verificado** | — | [`package.json:205-209`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L205-L209) | npm audit no ambiente autorizado e inventário de deprecated com log install; sem rede/instalação nesta cópia. |
| `DT-21-01` | `DT-21` | Liveness separado de readiness | `10` | Saúde | **Conforme** | — | [`src/bootstrap/healthchecks.ts:85-89`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/bootstrap/healthchecks.ts#L85-L89) | DB offline liveness200/readiness503;com DB saudável readiness200. |
| `DT-21-02` | `DT-21` | Readiness valida DB e Redis habilitado | `10` | Saúde | **Conforme** | — | [`src/bootstrap/healthchecks.ts:31-35`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/bootstrap/healthchecks.ts#L31-L35) | Mocks DB/Redis recusando retornam503;filas desabilitadas não tentam ping. |
| `DT-21-03` | `DT-21` | Shutdown HTTP drena SSE sem deadlock | `16` | Runtime HTTP | **Não conforme** | **DEBT-OPS-007** (P1) | [`src/bootstrap/shutdown.ts:69-73`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/bootstrap/shutdown.ts#L69-L73) | SIGTERM com SSE ativo fecha SSE e HTTP dentro deadline;uma etapa falha não impede restantes. |
| `DT-21-04` | `DT-21` | PDB expressa disponibilidade mínima | `10` | Kubernetes | **Conforme** | — | [`charts/birthhub-360/values.yaml:110-114`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/charts/birthhub-360/values.yaml#L110-L114) | helm template e teste minAvailable1 em web+worker;drain sandbox preserva réplica. |
| `DT-21-05` | `DT-21` | Worker tem deadline explícito no shutdown | `16` | Runtime worker | **Conforme** | — | [`src/bootstrap/workerServer.ts:189-193`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/bootstrap/workerServer.ts#L189-L193) | Worker fake preso sai dentro SHUTDOWN_TIMEOUT_MS,job preservado por retry. |
| `DT-22-01` | `DT-22` | Restore drill bloqueia schema desatualizado e RTO acima meta | `10` | recuperação | **Não conforme** | **DEBT-OPS-004** (P1) | [`scripts/backup/run-backup-restore-drill.ts:298-302`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/backup/run-backup-restore-drill.ts#L298-L302) | Migration erro ou restore901s faz passfalse/exit1; RPO depende timestamp backup real. |
| `DT-22-02` | `DT-22` | Backup remoto automático tem ativação comprovada | `10` | recuperação | **Não verificado** | — | [`.github/workflows/backup-production.yml:12-16`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.github/workflows/backup-production.yml#L12-L16) | Evidenciar scheduler local/cópia offsite autorizada,último sucesso e alerta falha. |
| `DT-22-03` | `DT-22` | Dump externo requer criptografia antes upload | `15` | backup legado | **Conforme** | — | [`.github/workflows/backup-production.yml:68-72`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.github/workflows/backup-production.yml#L68-L72) | Fixture sem criptografia não é enviada; restore criptografado validado isoladamente. |
| `DT-22-04` | `DT-22` | Backup arquivos MinIO tem restauração mensurada | `10` | storage | **Não verificado** | — | [`docs/operations/PRODUCTION_ARCHITECTURE.md:33-37`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/operations/PRODUCTION_ARCHITECTURE.md#L33-L37) | Restaurar objeto e ACL em storage isolado com hash e tenant correto. |
| `DT-22-05` | `DT-22` | RLS após restauração é testada entre tenants | `01A` | recuperação/tenancy | **Não verificado** | — | [`scripts/backup/run-backup-restore-drill.ts:32-36`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/backup/run-backup-restore-drill.ts#L32-L36) | App-role restringe select/insert/update/delete deA/B no DB restaurado. |
| `DT-23-01` | `DT-23` | Paginação de empresas limita linhas renderizadas | `04` | Empresas | **Conforme** | — | [`src/features/companies/components/CompanyList.tsx:76`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/companies/components/CompanyList.tsx#L76) | Lista usa limite/paginação explícito; sem certificar custo das relações incluídas. |
| `DT-23-02` | `DT-23` | Paginação de contatos limita linhas renderizadas | `04` | Contatos | **Conforme** | — | [`src/features/contacts/components/ContactList.tsx:57`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/contacts/components/ContactList.tsx#L57) | Listagem não requisita todos contatos sem limite. |
| `DT-23-03` | `DT-23` | Vendor ECharts possui chunk dedicado | `23` | Build frontend | **Conforme** | — | [`vite.config.ts:159`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vite.config.ts#L159) | Pacote pesado de charts é separado no bundler; tamanho real exige build. |
| `DT-23-04` | `DT-23` | Tour não inicia import 3D para usuário que já o viu | `02` | Onboarding | **Conforme** | — | [`src/App.tsx:344`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/App.tsx#L344) | Tour ausente não dispara import do respectivo componente. |
| `DT-23-05` | `DT-23` | Latência e memória com carga isolada de CRM | `23` | CRM | **Não verificado** | — | [`src/features/companies/infra/PrismaCompanyRepository.ts:73`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/companies/infra/PrismaCompanyRepository.ts#L73) | P95/CPU/memória e query plan medidos com volume representativo autorizado. |
| `DT-24-01` | `DT-24` | Definir TTL configurável e positivo do cache de fornecedores | `01` | cache | **Conforme** | — | [`src/features/prospecting/services/providerCache.ts:30-35`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/prospecting/services/providerCache.ts#L30-L35) | Valores inválidos usam 1h e expiração observada em clock falso |
| `DT-24-02` | `DT-24` | Limitar crescimento do fallback de cache de fornecedores em memória | `01` | cache | **Conforme** | — | [`src/features/prospecting/services/providerCache.ts:61-66`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/prospecting/services/providerCache.ts#L61-L66) | 501 entradas expulsam mais antiga e cache expirado não é retornado |
| `DT-24-03` | `DT-24` | Vincular cache do orçamento de IA ao tenant e mês | `01` | cache | **Conforme** | — | [`src/lib/ai/budget.ts:178-183`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/budget.ts#L178-L183) | Dois tenants e meses distintos nunca compartilham custo cacheado |
| `DT-24-04` | `DT-24` | Propagar falha Redis como miss com fallback em memória explícito | `01` | cache | **Conforme** | — | [`src/features/prospecting/services/providerCache.ts:130-135`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/prospecting/services/providerCache.ts#L130-L135) | Teste Redis indisponível preserva fetcher e observabilidade sem lançar segredo |
| `DT-24-05` | `DT-24` | Validar consistência de invalidação entre múltiplos processos | `01` | cache | **Não verificado** | — | [`src/features/prospecting/services/providerCache.ts:66-71`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/prospecting/services/providerCache.ts#L66-L71) | Teste dois processos com Redis demonstra TTL/miss/invalidação consistente |
| `DT-25-01` | `DT-25` | Sync recorrente usa scheduler idempotente | `16` | Filas Bitrix | **Conforme** | — | [`src/lib/queue/bitrixSync.worker.ts:57-61`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/queue/bitrixSync.worker.ts#L57-L61) | Chamar scheduler duas vezes cria uma agenda de15min no Redis sandbox. |
| `DT-25-02` | `DT-25` | Falha final registra deadletter sanitizada | `16` | Filas | **Conforme** | — | [`src/lib/queue/deadLetter.ts:78-82`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/queue/deadLetter.ts#L78-L82) | Erro com segredo sintético não persiste segredo;chave reprocess estável para mesmo job. |
| `DT-25-03` | `DT-25` | Métricas profundidade e falhas implementadas | `10` | Filas | **Conforme** | — | [`src/lib/queue/metrics.ts:36-40`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/queue/metrics.ts#L36-L40) | Job sandbox waiting/active/failed/completed reflete respectivos instrumentos. |
| `DT-25-04` | `DT-25` | Tick Bitrix registra falhas por regra | `06` | Filas Bitrix | **Conforme** | — | [`src/features/integrations/bitrix/service/syncRules.ts:241-245`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/bitrix/service/syncRules.ts#L241-L245) | Mock regra falha e regra sucede;lastError/tentativa/métrica da falha persistem. |
| `DT-25-05` | `DT-25` | Entrega única concorrente sob restart | `16` | Filas | **Não verificado** | — | [`src/lib/queue/bitrixSync.worker.ts:28-32`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/queue/bitrixSync.worker.ts#L28-L32) | Dois workers Redis isolado+restart não duplicam efeitos de mesma chave de negócio. |
| `DT-25-06` | `DT-25` | Detector de processo diferencia corretamente entrypoint de worker e servidor web no envio WhatsApp | `16` | Filas / WhatsApp | **Não conforme** | **DEBT-QUEUE-001** (P1) | [`src/lib/queue/redis.ts:8-14`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/queue/redis.ts#L8-L14) | Regex classifica worker.ts, worker.cjs e worker-*.ts como worker em Windows e Linux; envio sem sessão no worker falha de modo observável sem reenfileirar em loop. |
| `DT-26-01` | `DT-26` | Requests e limits web/worker declarados | `10` | Cloud manifests | **Conforme** | — | [`charts/birthhub-360/values.yaml:68-72`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/charts/birthhub-360/values.yaml#L68-L72) | Validar requests<=limits e helm template CPU/memória; não prova dimensionamento ativo. |
| `DT-26-02` | `DT-26` | Autoscaling web delimita replicas | `10` | Cloud manifests | **Conforme** | — | [`charts/birthhub-360/values.yaml:79-83`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/charts/birthhub-360/values.yaml#L79-L83) | Renderizar HPA min2/max10; carga sandbox somente com autorização. |
| `DT-26-03` | `DT-26` | Recursos cloud ociosos medidos | `10` | Cloud custo | **Não verificado** | — | [`charts/birthhub-360/values.yaml:2-6`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/charts/birthhub-360/values.yaml#L2-L6) | Inventário cloud autorizado cruzado30dias utilização CPU/mem/storage para determinar ociosidade. |
| `DT-26-04` | `DT-26` | Custos storage egress retenção calculados | `10` | Cloud storage | **Não verificado** | — | [`src/config/env.ts:287-291`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/config/env.ts#L287-L291) | Usar billing cloud e volume real de arquivos,retenção/egress e moeda; não inferir por código. |
| `DT-26-05` | `DT-26` | Dimensionamento worker validado por telemetria | `23` | Cloud worker | **Não verificado** | — | [`charts/birthhub-360/values.yaml:115-119`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/charts/birthhub-360/values.yaml#L115-L119) | Comparar p95 backlog/tempo processamento/memória com requests reais em sandbox autorizado. |
| `DT-27-01` | `DT-27` | Custos IA atribuídos provider e tenant | `23` | FinOps IA | **Conforme** | — | [`src/lib/ai/metrics.ts:19-23`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/metrics.ts#L19-L23) | Mock duas organizações produz séries separadas; custos desconhecidos explicitamente marcados. |
| `DT-27-02` | `DT-27` | Teto mensal por org escopa consultas | `23` | FinOps IA | **Conforme** | — | [`src/lib/ai/budget.ts:165-169`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/budget.ts#L165-L169) | Mock A excedido bloqueia A sem afetarB;teste DB real posterior confirma RLS. |
| `DT-27-03` | `DT-27` | Quota uso mensal escopada e cache por org/mês | `23` | FinOps IA | **Conforme** | — | [`src/lib/ai/finops/tokenQuota.service.ts:187-191`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/finops/tokenQuota.service.ts#L187-L191) | Virada mês recalc e A/B não compartilham cache. |
| `DT-27-04` | `DT-27` | Preço não cadastrado sinaliza fallback | `23` | FinOps IA | **Conforme** | — | [`src/lib/ai/gateway/pricing.ts:35-39`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/gateway/pricing.ts#L35-L39) | Modelo desconhecido incrementa contador e warn; preço conhecido mantém cálculo. |
| `DT-27-05` | `DT-27` | Reconciliação estimativa IA e fatura real | `23` | FinOps IA | **Não verificado** | — | [`src/lib/ai/gateway/pricing.ts:11-15`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/ai/gateway/pricing.ts#L11-L15) | Comparar AILog agregado com billing sandbox autorizado e explicar divergência por modelo/moeda. |
| `DT-28-01` | `DT-28` | Verificar enforcement financeiro de voz em fluxo atual, distinguindo legado desativado | `01` | billing | **Não verificado** | — | [`src/lib/voice-hub/services/billingService.ts:263-268`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/voice-hub/services/billingService.ts#L263-L268) | Identificar produto/rota atual autorizada para cobrança e testar limite real antes de afirmar gap financeiro ativo. |
| `DT-28-02` | `DT-28` | Aplicar transação atômica de saldo e lançamento com incremento | `01` | billing | **Conforme** | — | [`src/lib/voice-hub/repositories/billingRepository.ts:102-107`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/voice-hub/repositories/billingRepository.ts#L102-L107) | Teste DB rollback/concor­rência comprova saldo e lançamentos consistentes |
| `DT-28-03` | `DT-28` | Retornar erro explícito para proração não suportada no serviço legado | `01` | billing | **Conforme** | — | [`src/lib/voice-hub/services/billingService.ts:196-201`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/voice-hub/services/billingService.ts#L196-L201) | next_cycle segue erro explícito enquanto módulo legado indisponível; promessa financeira ativa exige nova validação. |
| `DT-28-04` | `DT-28` | Manter fim de período dentro do próximo mês no dia válido mais próximo | `01` | billing | **Não conforme** | **DEBT-BILL-003** (P3) | [`src/lib/voice-hub/services/billingService.ts:149-154`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/voice-hub/services/billingService.ts#L149-L154) | 31 janeiro mensal resulta fim fevereiro; leap-day anual segue regra publicada |
| `DT-28-05` | `DT-28` | Verificar deduplicação concorrente de lançamento monetário por idempotencyKey | `01` | billing | **Não verificado** | — | [`src/lib/voice-hub/repositories/billingRepository.ts:67-72`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/voice-hub/repositories/billingRepository.ts#L67-L72) | Mesmo tenant/chave retorna lançamento original sem crédito duplo; diferente payload detectado |
| `DT-29-01` | `DT-29` | Exigir ADMIN nas mutações de módulos/onboarding por organização | `01` | onboarding | **Conforme** | — | [`src/features/organization-modules/routes/organizationModules.routes.ts:41-46`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/organization-modules/routes/organizationModules.routes.ts#L41-L46) | ADMIN autorizado e VISUALIZADOR/SDR negados em teste HTTP isolado |
| `DT-29-02` | `DT-29` | Rejeitar chave de módulo desconhecida e preservar módulos obrigatórios | `01` | onboarding | **Conforme** | — | [`src/features/organization-modules/services/organizationModules.service.ts:21-26`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/organization-modules/services/organizationModules.service.ts#L21-L26) | Chave inválida 400 e desativação obrigatório 409, teste service |
| `DT-29-03` | `DT-29` | Preservar duas alterações simultâneas de seleção de módulos | `01` | onboarding | **Não conforme** | **DEBT-ONB-001** (P2) | [`src/features/organization-modules/services/organizationModules.service.ts:69-74`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/organization-modules/services/organizationModules.service.ts#L69-L74) | Teste simultâneo de enable(A)/enable(B) preserva ambas via CAS/lock/transação |
| `DT-29-04` | `DT-29` | Persistir conclusão de onboarding com timestamp idempotente | `01` | onboarding | **Conforme** | — | [`src/features/organization-modules/services/organizationModules.service.ts:120-125`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/organization-modules/services/organizationModules.service.ts#L120-L125) | Repetir conclusão preserva timestamp original e reload lê banco |
| `DT-29-05` | `DT-29` | Comprovar rollback de provisionamento Organization se User falhar no signup | `01` | onboarding | **Não verificado** | — | [`src/lib/auth.ts:340-345`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L340-L345) | Teste falha de User após Organization não deixa tenant órfão ou documenta cleanup |
| `DT-30-01` | `DT-30` | Extrair tenant exclusivamente da sessão e rejeitar usuário sem organização | `01` | identidade | **Conforme** | — | [`src/shared/middlewares/authenticateToken.ts:55-60`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/middlewares/authenticateToken.ts#L55-L60) | Payload/header de tenant manipulado não altera tenant da sessão em teste negativo |
| `DT-30-02` | `DT-30` | Impedir atribuição de role/organizationId pelo payload público de signup | `01` | identidade | **Conforme** | — | [`src/lib/auth.ts:279-284`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L279-L284) | Signup com role ADMIN/tenant alheio ignorado/rejeitado salvo fundador próprio |
| `DT-30-03` | `DT-30` | Negar papel desconhecido por nível zero canônico | `01` | identidade | **Conforme** | — | [`src/lib/auth/authorization.ts:53-58`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth/authorization.ts#L53-L58) | Papel inválido nunca satisfaz nenhum allowedRole real |
| `DT-30-04` | `DT-30` | Bloquear login depois de cinco falhas e evitar reextensão indefinida | `01` | identidade | **Conforme** | — | [`src/lib/auth.ts:19-24`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L19-L24) | Clock falso prova 15min, sucesso limpa contador, tentativa bloqueada não reconta |
| `DT-30-05` | `DT-30` | Revogar sessões após reset de senha confirmado | `01` | identidade | **Conforme** | — | [`src/lib/auth.ts:104-109`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/auth.ts#L104-L109) | Teste offline do fornecedor comprova sessão anterior inválida após reset |
| `DT-31-01` | `DT-31` | Agregações excluem soft-delete e filtram tenant | `04` | Analytics | **Conforme** | — | [`src/features/analytics/infra/PrismaAnalyticsRepository.ts:13`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/infra/PrismaAnalyticsRepository.ts#L13) | Contratos lidos usam organização e soft-delete; teste cruzado separado. |
| `DT-31-02` | `DT-31` | Falhas de agregação devem ser observáveis | `04` | Analytics | **Não conforme** | **DEBT-UX-003** (P1) | [`src/features/analytics/presentation/AnalyticsController.ts:56`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/presentation/AnalyticsController.ts#L56) | Falha retorna estado error observável; vazio apenas após consulta válida. |
| `DT-31-03` | `DT-31` | CSV de cohort usa mesmas linhas da agregação | `04` | Analytics / export | **Conforme** | — | [`src/features/analytics/application/AnalyticsUseCases.ts:50`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/application/AnalyticsUseCases.ts#L50) | Export preserva valores da mesma agregação; teste HTTP separado. |
| `DT-31-04` | `DT-31` | SSE comercial restringe evento à organização | `04` | Eventos | **Conforme** | — | [`src/features/analytics/routes/events.routes.ts:25`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/routes/events.routes.ts#L25) | Eventos fora do tenant não são escritos pelo listener. |
| `DT-31-05` | `DT-31` | Consentimento/base legal e minimização da telemetria de produto | `21` | PostHog | **Não verificado** | — | [`src/lib/analytics/posthog-client.ts:5`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/analytics/posthog-client.ts#L5) | Mapear base legal, payload real, retenção e mecanismo de preferência. |
| `DT-32-01` | `DT-32` | Documento raiz define idioma pt-BR | `02` | Shell | **Conforme** | — | [`index.html:2`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/index.html#L2) | Leitor e browser recebem lang da página. |
| `DT-32-02` | `DT-32` | Moeda comercial possui formato pt-BR e BRL por padrão | `04` | Métricas | **Conforme** | — | [`src/features/commercial-intelligence/presentation/formatMetrics.ts:1`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/commercial-intelligence/presentation/formatMetrics.ts#L1) | Valores reais formatam BRL e null retorna Não disponível. |
| `DT-32-03` | `DT-32` | Mês financeiro da API respeita Brasília | `04` | Analytics | **Não conforme** | **DEBT-UX-004** (P2) | [`src/features/analytics/application/AnalyticsUseCases.ts:23`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/analytics/application/AnalyticsUseCases.ts#L23) | API/export/métricas agrupam mesmo instante pelo mês comercial. |
| `DT-32-04` | `DT-32` | Tabela temporal canônica define calendário comercial | `18` | Time utilities | **Conforme** | — | [`src/shared/time/brazilCalendar.ts:2`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/shared/time/brazilCalendar.ts#L2) | Contrato declara timezone e intervalo start/end; uso efetivo avaliado à parte. |
| `DT-32-05` | `DT-32` | Calendário renderiza datas em fusos de browser diferentes | `04` | Agenda | **Não verificado** | — | [`src/features/calendar/components/Calendar.tsx:299`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/calendar/components/Calendar.tsx#L299) | Mesmo agendamento conserva data/hora comercial UTC e SãoPaulo. |
| `DT-33-01` | `DT-33` | Página pública principal fornece title e description estáticos | `11` | Landing | **Conforme** | — | [`index.html:14`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/index.html#L14) | HTML inicial público tem metadados básicos legíveis sem JS. |
| `DT-33-02` | `DT-33` | Landing independente fornece idioma e description | `11` | Landing separada | **Conforme** | — | [`landing/index.html:8`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/landing/index.html#L8) | Documento de landing tem title/description/idioma. |
| `DT-33-03` | `DT-33` | Conteúdo público é indexável após renderização e sem vazamento autenticado | `11` | SEO / landing | **Não verificado** | — | [`src/App.tsx:595`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/App.tsx#L595) | Crawler recebe conteúdo público e não recebe PII de rotas protegidas. |
| `DT-33-04` | `DT-33` | URLs canônicas/sitemap/robots atendem domínio real | `11` | SEO | **Não verificado** | — | [`index.html:4`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/index.html#L4) | Validar sitemap/robots/canonical no host autorizado e domínio canônico. |
| `DT-33-05` | `DT-33` | Metadados de compartilhamento refletem página pública | `11` | SEO / social | **Não verificado** | — | [`landing/index.html:3`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/landing/index.html#L3) | Fetch de crawler social retorna og:title/description/image válidos e sem conteúdo autenticado. |
| `DT-34-01` | `DT-34` | Manifest referencia ícones presentes no inventário | `09` | PWA | **Não conforme** | **DEBT-UX-006** (P2) | [`vite.config.ts:30`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vite.config.ts#L30) | URLs192/512 e atalhos existem no artefato. |
| `DT-34-02` | `DT-34` | Cache offline não atravessa identidade autenticada | `09` | PWA / CRM | **Não conforme** | **DEBT-UX-001** (P1) | [`vite.config.ts:61`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/vite.config.ts#L61) | Cache autenticado isolado por usuário/tenant e limpo na troca. |
| `DT-34-03` | `DT-34` | Release Android evita cleartext na configuração manifest principal | `09` | Android | **Conforme** | — | [`android/app/src/main/AndroidManifest.xml:10`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/android/app/src/main/AndroidManifest.xml#L10) | Release não habilita tráfego HTTP indiscriminado; manifest merged verificado no build à parte. |
| `DT-34-04` | `DT-34` | Interface modal limita altura dinâmica no mobile | `03` | UI / Dialog | **Conforme** | — | [`src/components/ui/Dialog.tsx:23`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/components/ui/Dialog.tsx#L23) | Superfície usa viewport dinâmica e scroll interno; screenshot separado. |
| `DT-34-05` | `DT-34` | Responsividade real360/390/768/1440 e offline | `09` | Web / PWA | **Não verificado** | — | [`tests/e2e/mobile-sweep.spec.ts:1`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/tests/e2e/mobile-sweep.spec.ts#L1) | Sem overflow/perda de ação em breakpoints; offline explícito em telas críticas. |
| `DT-35-01` | `DT-35` | SMTP ausente retorna erro explícito | `05` | E-mail SMTP | **Conforme** | — | [`src/lib/email/mailer.ts:24-28`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/email/mailer.ts#L24-L28) | Mock sem SMTP lança erro;SMTP configurado permite sendMail,nenhuma mensagem real nesta missão. |
| `DT-35-02` | `DT-35` | Visibilidade notificação aplica tenant e destinatário | `01` | Notificações | **Conforme** | — | [`src/features/notifications/notification.service.ts:59-63`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/notifications/notification.service.ts#L59-L63) | A não lista organizaçãoB nem notificação pessoal de colega;broadcast visível no próprio tenant. |
| `DT-35-03` | `DT-35` | Leitura broadcast individual por destinatário | `02` | Notificações | **Não conforme** | **DEBT-NOT-001** (P2) | [`src/features/notifications/notification.service.ts:94-98`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/notifications/notification.service.ts#L94-L98) | UsuárioA lê broadcast;B continua unread até lê-lo;estado não compartilhado. |
| `DT-35-04` | `DT-35` | Exclusão broadcast restrita gerência | `01` | Notificações | **Conforme** | — | [`src/features/notifications/notification.service.ts:131-135`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/notifications/notification.service.ts#L131-L135) | Usuário sem gestão não exclui broadcast;ADMIN autorizado exclui;tenant estranho negado. |
| `DT-35-05` | `DT-35` | Inbound email adaptado provedor real | `06` | E-mail inbound | **Parcialmente conforme** | — | [`src/features/integrations/email/emailReply.webhook.ts:24-28`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/integrations/email/emailReply.webhook.ts#L24-L28) | Sandbox fornecedor valida assinatura/mapping tenant,replay e reply encerra cadência. |
| `DT-36-01` | `DT-36` | Meilisearch injeta filtro de tenant em empresas | `04` | Busca empresas | **Conforme** | — | [`src/lib/search/index.ts:86`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/search/index.ts#L86) | Consulta gerada contém organização fornecida pelo backend. |
| `DT-36-02` | `DT-36` | Falha Meili retorna sentinel distinto de zero resultados | `04` | Busca empresas | **Conforme** | — | [`src/lib/search/index.ts:94`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/search/index.ts#L94) | Falha usa Postgres e resposta vazia legítima não é sobrescrita. |
| `DT-36-03` | `DT-36` | Paginação e total são preservados no motor full-text | `04` | Busca empresas | **Não conforme** | **DEBT-UX-002** (P2) | [`src/features/companies/infra/PrismaCompanyRepository.ts:44`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/companies/infra/PrismaCompanyRepository.ts#L44) | Páginas1..N cobrem todos hits ordenados com total correto. |
| `DT-36-04` | `DT-36` | Busca textual indisponível não produz falso sem resultados | `07` | Conhecimento | **Não conforme** | **DEBT-UX-007** (P2) | [`src/features/knowledge/search.service.ts:178`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/knowledge/search.service.ts#L178) | Erro distingue indisponibilidade total de ausência de documento. |
| `DT-36-05` | `DT-36` | Relevância e recuperação cross-tenant de busca híbrida | `07` | Conhecimento | **Não verificado** | — | [`src/features/knowledge/search.service.ts:43`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/knowledge/search.service.ts#L43) | Golden dataset sintético mede relevância e garante nenhum hit de outro tenant. |
| `DT-37-01` | `DT-37` | Upload de conhecimento tem schema e papéis de escrita | `07` | Arquivos conhecimento | **Conforme** | — | [`src/features/knowledge/knowledge.routes.ts:293`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/knowledge/knowledge.routes.ts#L293) | Título/nome/payload e papéis validados; autorização raiz sob responsabilidade01. |
| `DT-37-02` | `DT-37` | Extração PDF limita páginas e conteúdo resultante | `07` | Arquivos conhecimento | **Conforme** | — | [`src/features/knowledge/knowledge.routes.ts:63`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/knowledge/knowledge.routes.ts#L63) | Parsing limita páginas/texto; carga/ZIP bomb exige teste separado. |
| `DT-37-03` | `DT-37` | Erro de formato de upload retorna400 e interrompe ingestão | `07` | Arquivos conhecimento | **Conforme** | — | [`src/features/knowledge/knowledge.routes.ts:305`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/knowledge/knowledge.routes.ts#L305) | Formato não suportado/extrator inválido não é apresentado como sucesso. |
| `DT-37-04` | `DT-37` | Exclusão de documento usa organização e cascade esperado | `07` | Arquivos conhecimento | **Parcialmente conforme** | — | [`src/features/knowledge/ingestion.service.ts:324`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/knowledge/ingestion.service.ts#L324) | Só tenant dono exclui documento e seus chunks desaparecem. |
| `DT-37-05` | `DT-37` | URLs de objeto aplicam acesso e expiração no fluxo real | `01` | Object storage | **Não verificado** | — | [`src/lib/storage/index.ts:49`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/lib/storage/index.ts#L49) | URL inacessível para tenant alheio, expira e respeita exclusão/retentiva. |
| `DT-38-01` | `DT-38` | Manter SQL novo aditivo/default em alterações ExternalCrmConnection | `01` | migrações | **Conforme** | — | [`prisma/migrations/20261013120000_external_crm_entity_links_stage_mapping/migration.sql:20-25`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/migrations/20261013120000_external_crm_entity_links_stage_mapping/migration.sql#L20-L25) | Dados existentes migrados preservam payload e outbound false |
| `DT-38-02` | `DT-38` | Forçar política tenant simétrica na criação ExternalEntityLink | `01` | migrações | **Conforme** | — | [`prisma/migrations/20261013120000_external_crm_entity_links_stage_mapping/migration.sql:108-113`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma/migrations/20261013120000_external_crm_entity_links_stage_mapping/migration.sql#L108-L113) | Banco isolado aplica FORCE e USING/WITH CHECK impede tenant cruzado |
| `DT-38-03` | `DT-38` | Revalidar inventário histórico de DROP sem editar migrations aplicadas | `01` | migrações | **Conforme** | — | [`docs/security/runbooks/DESTRUCTIVE_MIGRATIONS_INVENTORY.md:5-10`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/security/runbooks/DESTRUCTIVE_MIGRATIONS_INVENTORY.md#L5-L10) | Inventário/runbook existem; restore prático só considerado validado com drill autorizado |
| `DT-38-04` | `DT-38` | Comprovar schema/migration drift inexistente em banco isolado | `01` | migrações | **Não verificado** | — | [`package.json:83-88`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/package.json#L83-L88) | prisma migrate diff exit0 após histórico aplicado no banco de teste |
| `DT-38-05` | `DT-38` | Usar conexão CLI estável via DIRECT_URL/session pooler | `01` | migrações | **Conforme** | — | [`prisma.config.ts:18-23`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/prisma.config.ts#L18-L23) | DIRECT_URL preferida e endpoint transaction-mode convertido apenas para CLI |
| `DT-39-01` | `DT-39` | Rotas de configurações de pilar anunciam ausência de persistência | `02` | Configurações pilar | **Conforme** | — | [`src/features/settings/components/PillarSettingsPlaceholder.tsx:792`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/settings/components/PillarSettingsPlaceholder.tsx#L792) | Prévia não afirma que salvou; não contada como recurso entregue. |
| `DT-39-02` | `DT-39` | Administração equipe exige papel na rota frontend | `02` | Equipe | **Conforme** | — | [`src/App.tsx:478`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/App.tsx#L478) | URL direta encontra gate visual de papel; autorização backend testada separadamente. |
| `DT-39-03` | `DT-39` | Configuração inicial exige ADMIN na composição | `02` | Setup | **Conforme** | — | [`src/App.tsx:636`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/App.tsx#L636) | Sessão nãoADMIN recebe bloqueio; validação real separada. |
| `DT-39-04` | `DT-39` | Destino desconhecido gera fallback de navegação determinado | `02` | Navegação | **Conforme** | — | [`src/App.tsx:534`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/App.tsx#L534) | Rota desconhecida termina em destino existente sem tela branca; experiência erro dedicada não exigida. |
| `DT-39-05` | `DT-39` | Salvar CRM persiste e sobrevive reload com erro/retry | `22` | CRM | **Não verificado** | — | [`src/features/companies/infra/PrismaCompanyRepository.ts:93`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/src/features/companies/infra/PrismaCompanyRepository.ts#L93) | Entrada sintética salva/recarrega; inválida não salva; falha gera erro; tenant alheio negado. |
| `DT-40-01` | `DT-40` | Topologia single-node possui contingência validada | `10` | continuidade | **Não verificado** | — | [`docs/operations/PRODUCTION_ARCHITECTURE.md:5-9`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/operations/PRODUCTION_ARCHITECTURE.md#L5-L9) | Restaurar host alternativo autorizado em RTO/RPO e comprovar dados/serviços. |
| `DT-40-02` | `DT-40` | Runbook distribui responsabilidades de incidentes | `10` | continuidade | **Conforme** | — | [`docs/operations/RUNBOOKS.md:4-8`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/operations/RUNBOOKS.md#L4-L8) | Exercício registra responsáveis de plantão e sequência de escalonamento. |
| `DT-40-03` | `DT-40` | Rollback operacional tem execução independente comprovada | `08A` | continuidade | **Não verificado** | — | [`docs/operations/RUNBOOKS.md:6-10`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/docs/operations/RUNBOOKS.md#L6-L10) | Drill em ambiente descartável volta versão e contratoDB sem perda de dados. |
| `DT-40-04` | `DT-40` | Congelamento cloud evita publicação automática após CI | `00` | CI/continuidade | **Não conforme** | **DEBT-GOV-002** (P2) | [`.github/workflows/docker-publish.yml:11-15`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/.github/workflows/docker-publish.yml#L11-L15) | Decisão humana valida publicação e gatilhos seguem a política explicitada. |
| `DT-40-05` | `DT-40` | Retenção e exclusão de backups operam conforme política | `21` | recuperação | **Não verificado** | — | [`scripts/backup/run-backup-restore-drill.ts:89-93`](https://github.com/MaarkssN/Birthub-360/blob/c7e33a911b734ddb3131a3ad08d421efbc823fd4/scripts/backup/run-backup-restore-drill.ts#L89-L93) | Teste fixture confirma idade,tipos,backup recente preservado e cópia de recuperação íntegra. |

## 5. Registro de Comandos Executados e Limitações Operacionais (Fase 03 & Fase 11)

| # | Comando / Ensaio Executado | Ambiente | Exit Code | Resultado / Evidência Obtida |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `Inspeção da árvore raiz, branches (150+ branches), PRs (#722 a #741) e commits até HEAD c7e33a911b734ddb3131a3ad08d421efbc823fd4` | GitHub MCP / Repositório MaarkssN/Birthub-360 | `0` | Estado Git, merges recentes (2b918e0a, 9ae65b1a, c7e33a91) e PR #741 mapeados sem alteração do repositório. |
| 2 | `Leitura integral de AGENTS.md (Revisão 2026-10-09, 40 seções), .agents/README.md, .agents/COMO-CHAMAR-OS-AGENTES.md e 23 prompts em .agents/prompts/` | Análise Estática Forense | `0` | 26 papéis oficiais de agentes confirmados (00 a 18, incluindo 01A, 06A, 08A, e 21 a 24; 19 e 20 reservados/inexistentes). |
| 3 | `node .tmp/audit-00.cjs / verify-audit-00.cjs (Agente 00 — DT-07,08,11,12,13,14,15,17,22,40)` | Node.js v22.23.2 (ensaio isolado sobre snapshot) | `0` | 50 verificações concluídas; 62 testes co-localizados fora de vitest.unit.config.ts e predicado defeituoso de restore drill comprovados. |
| 4 | `node verify-billing.mjs & node verify-onboarding.mjs (Agente 01 — DT-01,02,04,05,06,24,28,29,30,38)` | Node.js v22.23.2 (funções puras extraídas do código de produção) | `0` | 50 verificações concluídas; salto de mês em computePeriodEnd (2026-01-31 -> 2026-03-03) e perda de mutação concorrente em organizationModules.service.ts reproduzidos. |
| 5 | `node verify-02.cjs & script Python de paridade de rotas/assets PWA (Agente 02 — DT-03,18,23,31,32,33,34,36,37,39)` | Node.js v22.23.2 + Python 3 (ensaio isolado) | `0` | 50 verificações concluídas; retorno HTTP 200 com zeros sob exceção em AnalyticsController, falha de página 2+ com Meilisearch (45 hits -> pág 2 vazia), divergência de deep links Android e ausência de ícones PNG do manifest comprovados. |
| 6 | `node verify-06.cjs (Agente 06 — DT-09,10,16,19,20,21,25,26,27,35)` | Node.js v22.23.2 (vm.runInContext com stripTypeScriptTypes) | `0` | 50 verificações concluídas; classificação falsa de ECONNRESET como Redis em process-guards.ts, deadlock de shutdown HTTP com SSE ativo, leitura broadcast global e cancelamento prematuro de timeout Bitrix reproduzidos. |
| 7 | `node verify-lgpd-optout.mjs, verify-worker-detector.mjs, verify-elite.mjs, verify-cadence.mjs, verify-release-gate.mjs` | Node.js v22.23.2 (ensaios isolados de lançamento) | `0` | Reproduzidos os achados abertos de supressão LGPD (FND-01), regex de worker WhatsApp (FND-02), falso GO no release-gate (OPS-001), handlers NBA/loading do Copiloto (PROD-02/04) e validação de cadência (PROD-05). |
| 8 | `Análise forense de diffs dos commits pós-9373fb22 (23a61ea0, 0bbc2674, 2034a143, 2512d2b8 / 2b918e0a, c7e33a91 e PR #741 f0f7bc14)` | Git Diff Inspection | `0` | Detectada regressão em docs/openapi.yaml (-124 linhas de /organization-modules no merge 2b918e0a), ausência de filtro organization_id no SQL do dialer e 176 falsos positivos no PR #741. |
| 9 | `npm run typecheck / lint / test:unit / test:architecture / build (no snapshot sem node_modules)` | Snapshot local sem node_modules / sem Docker daemon ativo | `1` | BLOQUEADO / NÃO EXECUTADO em runtime global por ausência de node_modules e containers ativos no ambiente de snapshot; registrado honestamente conforme Regra 6 e Regra 8. |

### Limitações Documentadas (Regra 6 e Regra 8)

- Análise executada em modo estritamente não-destrutivo e somente-leitura, respeitando a proibição de alterar código funcional, rodar migrations ou acionar provedores externos pagos.
- No snapshot de auditoria sem node_modules instalado e sem daemon Docker ativo, os gates dinâmicos globais (typecheck, lint, test:unit, test:integration, test:e2e, build) não puderam ser executados integralmente; mecanismos críticos foram comprovados via extração fiel de funções e execução isolada no runtime Node.js v22.
- 46 verificações que dependem de infraestrutura ativa, credenciais de produção, restauração física de banco ou tráfego real permanecem classificadas como 'Não verificado' até o provisionamento do ambiente isolado na Onda 00.
- Contratos marcados como 'Conforme' certificam exclusivamente a propriedade estática verificada na linha/arquivo citado, não substituindo o gate de integração/E2E antes do release.
