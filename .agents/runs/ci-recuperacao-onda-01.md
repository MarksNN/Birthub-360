# Relatório de Execução — ONDA 01: Governança, Inventário Forense e Priorização
**Missão:** Recuperação do GitHub Actions até 100% Verde  
**Projeto:** Birth Hub 360°  
**Data:** 2026-10-22  
**Agente:** 00 — Coordenador Técnico e Integrador Global  
**Base:** `main` (`3272351b36f434f780b561b12949ccd402397e76`)  
**Repositório:** https://github.com/MarksNN/Birthub-360  
**Issue-Mestre:** [#45 — CI recovery: inventário de falhas relevantes e critérios de GitHub Actions 100% verde](https://github.com/MarksNN/Birthub-360/issues/45)

---

## 1. Sumário Executivo e Diagnóstico de Entrada

A auditoria forense da `main` e de todas as 19 Pull Requests abertas confirmou que o repositório possui uma base sólida, com typecheck, testes unitários (4.938 testes em 627 arquivos), testes de arquitetura e verificação OpenAPI 100% verdes localmente.

No entanto, o CI no GitHub Actions encontra-se bloqueado por um conjunto encadeado de falhas conhecidas e sobreposições de código entre branches de agentes. A falha agregadora `build` (Consolidar veredito do repositório) é apenas o espelho das falhas upstream nos steps do job `application gate`.

### Status dos Gates Locais Verificados na `main` (`3272351b36f434f780b561b12949ccd402397e76`):
- `npm run format:check`: ❌ **FALHA** (1 erro em `src/shared/services/dataSubjectErasure.service.ts:119` — indentação).
- `npm run lint:ci`: ✅ **APROVADO** (0 erros, 575 avisos aceitos, 8 infos).
- `npm run typecheck`: ✅ **APROVADO** (0 erros).
- `npm run test:architecture`: ✅ **APROVADO** (1.748 módulos analisados, 0 violações, 0 hotspots não autorizados).
- `npm run verify:openapi-drift`: ✅ **APROVADO** (73 prefixos, 454 paths documentados, 0 derivas).
- `npm run test:unit`: ✅ **APROVADO** (627 arquivos de teste, 4.938 testes aprovados, 1 skipped).
- `npm run build`: ✅ **APROVADO** (Vite + esbuild `dist/server.cjs` + verify:pwa-precache 181 entries).
- `npm run check:bundle-budget`: ✅ **APROVADO** (status: ok, 0 violações de orçamento).

---

## 2. Matriz Completa de Workflows do GitHub Actions (.github/workflows)

| Workflow | Arquivo | Gatilhos / Eventos | Paths / Condições | Status / Papel no Gate |
|---|---|---|---|---|
| **Central Birth Hub 360 Release** | `ci.yml` | `push: [main, master, develop]`, `pull_request: [main, master]`, `workflow_dispatch` | Todos | **CANÔNICO OBRIGATÓRIO**: contém secret-scan, dependency-review, trivy-scan, application gate e job agregador `build`. |
| **Security - CodeQL** | `codeql.yml` | `pull_request`, `push`, `schedule` (segunda-feira) | JS/TS e Python | **OBRIGATÓRIO**: SAST de segurança. Verde nas últimas execuções. |
| **Security - Dependency Review** | `dependency-review.yml` | `pull_request: [main, master]` | `package-lock.json`, etc. | **OBRIGATÓRIO em PR**: Bloqueia dependências vulneráveis (High/Critical). |
| **Security - Trivy** | `security-trivy.yml` | `pull_request`, `schedule` | Filesystem | **OBRIGATÓRIO em PR**: Scan de vulnerabilidades de dependências. |
| **SonarQube Analysis** | `sonarqube.yml` | `push: [main]`, `pull_request` | Código-fonte | Informativo / Code Quality. Verde nas últimas execuções. |
| **Visual Regression Tests** | `visual-regression.yml` | `pull_request`, `workflow_dispatch` | UI | **OBRIGATÓRIO em PR visual**. Playwright visual. |
| **Frontend Bundle Budget** | `frontend-bundle-budget.yml` | `push`, `pull_request` | `src/**`, `public/**`, `vite.config.ts`, `package.json` | **OBRIGATÓRIO por path**. Garante teto de bundle JS/CSS. |
| **Endpoint Latency Budget** | `endpoint-latency-budget.yml` | `pull_request`, `push` | `server.ts`, `tests/load/**`, `.github/workflows/...` | **OBRIGATÓRIO por path**. Garante SLO de latência k6. |
| **Public Assets Budget** | `public-assets-budget.yml` | `push`, `pull_request` | `public/**` | **OBRIGATÓRIO por path**. Impede commits acidentais de datasets pesados. |
| **Build Android APK** | `android-build.yml` | `pull_request`, `workflow_dispatch` | `android/**` | Sob demanda / path mobile. |
| **Build iOS App** | `ios-build.yml` | `workflow_dispatch` | Manual | Sob demanda. |
| **Production CI/CD** | `production.yaml` | `workflow_dispatch` | Manual (input sha) | Deploy de produção (LOCAL-FIRST: trava de segurança). |
| **CD Homologation** | `cd-homolog.yml` | `workflow_dispatch` | Manual (input sha) | Deploy de homologação sob demanda autorizada. |
| **Publish private container image**| `docker-publish.yml` | `workflow_dispatch` | Manual | Publicação GHCR desacoplada. |
| **Deploy to GitHub Pages** | `deploy-pages.yml` | `workflow_dispatch` | Manual | Documentação estática sob demanda. |
| **E2E Playwright Tests** | `playwright-ci.yml` | `workflow_dispatch` | Manual | Execução manual canário (suite canônica roda em ci.yml). |
| **Code Quality (Lint)** | `qualidade-ci.yml` | `workflow_dispatch` | Manual | Diagnóstico rápido sob demanda. |
| **Backup de produção** | `backup-production.yml`| `workflow_dispatch` | Manual (cron desativado) | Aguardando infra Cloudflare R2 / SRE. |
| **Onda 2.5 Validation** | `onda-2.5-validation.yml`| `pull_request` | `validation/onda-2.5-base` | Workflow arquivado de validação da Onda 2.5. |
| **Deploy AWS** | `deploy-aws.yml.disabled` | Inativo (.disabled) | N/A | Desativado formalmente. |

---

## 3. Matriz Forense de Pull Requests Abertos e Sobreposição de Branches

A auditoria identificou um padrão estrutural crítico: **múltiplas branches de agentes foram criadas sobre o commit intermediário `cd09655`** e, como resultado, carregam entre 18 e 35 arquivos modificados, a maioria fora do seu domínio (Landing360, tokens neon, helpers E2E, package-lock.json).

| PR # | Branch | Autor / Agente | Arquivos Alterados | Domínio Real Pretendido | Arquivos Colaterais / Contaminados (Fora de Escopo) |
|---|---|---|---|---|---|
| **#44** | `fix/a11y-landing-light-contrast-20261021` | Agente 03 | 2 | `Landing360.css` (+15 linhas contraste) | Carrega 1 linha de `dataSubjectErasure.service.ts` |
| **#43** | `fix/ci-format-e2e-20261021` | Agente 08 / 21 | 2 | `dataSubjectErasure.service.ts` (1 linha) + `tests/e2e/workspace.spec.ts` (1 linha) | **LIMPO (2 arquivos cirúrgicos)** |
| **#41** | `agente/15-db-role-boot-check` | Agente 15 | 23 | `src/bootstrap/dbRoleCheck.ts`, `server.ts`, testes | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo, k6 |
| **#40** | `agente/01-prisma-tx-propagation` | Agente 01 | 25 | `src/lib/prisma.ts`, `src/lib/txEscapeGuard.ts`, testes | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#39** | `agente/01-db-owner-role-separation` | Agente 01 | 35 | `scripts/db/**`, migrations, `prisma.config.ts`, testes | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo, k6 |
| **#38** | `agente/15-security-audit-global-channel` | Agente 15 | 23 | `continuousSecurityAudit.service.ts`, ports, sinks | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#37** | `agente/01-rebalance-approval-schema` | Agente 01 | 24 | `prisma/schema.prisma`, migrations, testes RLS | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#35** | `agente/01-lgpd-consent-flywheel-schema` | Agente 01 | 32 | `prisma/schema.prisma`, migrations, ADR, testes RLS | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#34** | `agente/01-remed-05-outbox-schema` | Agente 01 | 26 | `prisma/schema.prisma`, migrations, testes outbox | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#33** | `agente/21-lgpd-consent-chain-kanon` | Agente 21 | 28 | `src/features/lgpd/**`, k-anonymity, consent chain | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo, k6 |
| **#32** | `agente/16-remed-05` | Agente 16 | 28 | `src/lib/queue/**`, outbox relay worker, dead letter | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#29** | `agente/gha-capabilities-normalized` | Agente 13 | 20 | `capabilities.normalized.json`, teste derivado | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo (**idêntico ao PR #25 + 2 arquivos**) |
| **#28** | `agente/01-migration-drift` | Agente 01 | 21 | `prisma/schema.prisma`, migration DATA-007 | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#26** | `agente/gha-openapi-drift-factory` | Agente 18 | 20 | `scripts/verify-openapi-drift.ts`, teste | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#25** | `agente/gha-agents-capabilities` | Agente 13 | 18 | `seed-multi-cargo.ts`, `build-capability-catalog.ts`, `agentCapabilities.normalized.json` | Landing360, tokens, E2E helpers, package.json |
| **#23** | `agente/04-predictive-rebalance-whatif` | Agente 04 | 24 | `src/features/commercial-intelligence/**` | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#22** | `agente/05-execute-tenancy` | Agente 05 | 22 | `src/features/prospecting/outbound/**` | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#20** | `agente/02-remed-04-08` (Draft) | Agente 02 | 26 | UI aprovação rebalanceamento, code-splitting | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |
| **#18** | `agente/01-remed-02-persist-graph-winloss`| Agente 01 | 25 | Schema grafo de contas e autópsia win-loss | Landing360, tokens, E2E helpers, package.json, seed-multi-cargo |

---

## 4. Cadeia Causal de Falhas e Erros-Radicais vs Cascatas

```
[ERRO-RADICAL 1] Formatação Prettier em dataSubjectErasure.service.ts:119
   │
   ▼ Bloqueia no CI: "Run Prettier check" (exit code 1)
   │
[ERRO-RADICAL 2] Ausência de cargo e capabilities para 3 agentes táticos (account-detective, promise-guardian, devils-advocate)
   │
   ▼ Bloqueia no CI (após format passar): "Run Integration Tests" (exit code 2)
   │   - AssertionError: cargo undefined do agente account-detective
   │   - AssertionError: agentes sem nenhuma capability: [...] expected []
   │   - AssertionError: expected 391 but got 394 AgentDefinitions
   │   - AssertionError: expected 15 but got 12 táticos
   │
[ERRO-RADICAL 3] E2E Playwright: violações de contraste WCAG AA + seletor ambíguo "Pipeline"
   │
   ▼ Bloqueia no CI (após integration passar): "Run E2E Tests"
   │   - 12 violações de contraste sérias na Landing Page clara
   │   - 9 violações no Dashboard
   │   - Selector ambíguo em tests/e2e/workspace.spec.ts
   │
[ERRO-RADICAL 4] k6 authenticated: sintaxe inválida com '#' em tests/load/k6-crm-authenticated.js:77
   │
   ▼ Bloqueia no CI das branches que tocam k6: Unexpected token ILLEGAL
   │
[ERRO-RADICAL 5] Migrações Prisma concorrentes e colisão de timestamps / drift
   │
   ▼ Bloqueia no CI: prisma migrate deploy P3018 (permission denied on function/immutable)
   │
[ERRO CASCATA] Job "build" (Consolidar veredito do repositório)
   │
   ▼ Falha meramente porque "application-gate=failure"
```

---

## 5. Matriz Canônica de Propriedade Exclusiva de Arquivos

Para cumprir estritamente AGENTS.md §2, §4, §15 e §16, a seguinte matriz rege todas as intervenções das Ondas 02 a 08:

| Caminhos de Arquivo | Proprietário Exclusivo | Restrições Rígidas |
|---|---|---|
| `prisma/schema.prisma`, `prisma/migrations/**` | **Agente 01 — Plataforma, Segurança e Dados** | Nenhum outro agente cria migration ou altera schema. Integrações abrem handoff. |
| `src/App.tsx`, navegação raiz, Sidebar, layout | **Agente 02 — Produto e UX** | Mudanças de rotas e componentes estruturais pertencem ao 02. |
| `src/features/landing/**`, CSS de marca, temas, design tokens | **Agente 03 — Design e Acessibilidade** | Garante conformidade WCAG 2.2 AA. |
| `src/features/commercial-intelligence/**`, BI | **Agente 04 — CRM e BI** | Métricas comerciais e oráculos. |
| `src/features/prospecting/**`, outbound | **Agente 05 — Prospecção** | Enriquecimento, busca CNPJ, leads. |
| `src/features/integrations/bitrix/**` | **Agente 06 — Integrações e Bitrix** | Webhooks, sincronização, timeout resiliente. |
| `src/features/integrations/bitrix/service/extraction.ts` | **Agente 06A — Extrações Bitrix** | Slot compartilhado com 06 (execução sequencial). |
| `src/features/intelligence/**` (IA, RAG, Swarm) | **Agente 07 — IA e Automações** | Prompts, fluxos LangGraph, rate limits de IA. |
| `.github/workflows/**`, Dockerfile, docker-compose*.yml | **Agente 08 — QA e Release** | Workflows de CI/CD e release gate. |
| Operações Git, PR merges, deploy | **Agente 08A — Git e Deploy AWS** | Mesma slot de 08; somente após parecer APROVADO do 24. |
| `android/**`, `capacitor.config.ts`, `ios/**` | **Agente 09 — Mobile** | Sincronização Capacitor e builds mobile. |
| Infraestrutura de rede, SRE, logs de containers | **Agente 10 — Infraestrutura, Observabilidade e SRE** | Containers de banco, redis, meilisearch, timeouts. |
| Ativos visuais, identidade institucional | **Agente 11 — Marca e Ativos Institucionais** | Logos, ícones, manuais visuais. |
| Telefonia, WebRTC, áudio | **Agente 12 — Voz e Telefonia** | Twilio, 3CX, processamento de áudio. |
| Catálogo de agentes, job roles, capabilities engine | **Agente 13 — Enxame Autônomo e Governança de Agentes**| AgentDefinitions, grants de capabilities, cargos. |
| Harness de testes, vitest configs, scripts/test/** | **Agente 14 — Ambiente de Execução e Test Harness** | Infraestrutura e runners de teste. |
| Criptografia, checagens de role, sanitização, secret scanning | **Agente 15 — Segurança Aplicada e Segredos** | Autenticação, CSRF, permissões de banco. |
| `src/lib/queue/**`, BullMQ, Workers | **Agente 16 — Runtime, Workers e Escala** | Filas, outbox relay worker, dead letter queues. |
| Cadências de vendas, disparos multicanal | **Agente 17 — Cadência Multicanal e Ciclo de Receita** | Sequências de contato, templates. |
| `docs/openapi.yaml`, contratos de API, schemas | **Agente 18 — Contratos, API e Documentação Viva** | Sincronismo de rota OpenAPI e contratos tipados. |
| LGPD, consentimento, k-anonimato, expurgo | **Agente 21 — Privacidade e LGPD** | Rastreio de base legal, cadeia de consentimento. |
| Testes de persistência real e sanitização | **Agente 22 — Verificação de Realidade** | Produção de evidências ponta a ponta. Não edita código. |
| Latência, orçamento de tokens, N+1 | **Agente 23 — Custo, Performance e Limites de IA** | Monitoramento de orçamento e complexidade. |
| Auditoria e aprovação independente | **Agente 24 — Revisão Independente** | Auditor obrigatório. Não altera código auditado. |
| `server.ts`, `package.json`, `package-lock.json` | **Exige aprovação prévia do Agente 00** | Mudanças globais sensíveis. |

---

## 6. Planejamento de Concorrência, Worktrees e Precedência (Ondas 02 a 08)

Conforme AGENTS.md §13, o Coordenador (00) ocupa 1 slot e até 8 especialistas podem executar simultaneamente, desde que atendam às condições:
1. Propriedade disjunta verificada.
2. Branches e worktrees dedicados (`git worktree add`).
3. Gate de integração a cada 2–3 merges.
4. Respeito aos slots exclusivos (01/01A, 06/06A, 08/08A).
5. Auditoria obrigatória do Agente 24 antes de qualquer merge.

### Dimensionamento das Ondas Subsequentes:

```
ONDA 02 — DESBLOQUEIO DE CI, CATÁLOGO E E2E (4 ESPECIALISTAS SIMULTÂNEOS)
├── Slot 1: Agente 08 — Merge cirúrgico do PR #43 (Formatação Prettier + seletor E2E)
├── Slot 2: Agente 13 — Cherry-pick limpo das capabilities dos 3 agentes (PRs #25/#29 despoluídos)
├── Slot 3: Agente 03 — Merge cirúrgico do PR #44 (Contraste WCAG AA na Landing)
└── Slot 4: Agente 14 — Estabilização dos seletores e helpers de E2E (helpers.ts race condition)
Gate Parcial: npm run format:check && npm run test:integration (4 assertions resolvidas)

ONDA 03 — CONVERGÊNCIA DE BANCO E MIGRAÇÕES (3 ESPECIALISTAS)
├── Slot 1: Agente 01 — Sequenciamento e unificação de migrations (PRs #28, #39, #34, #35, #37)
├── Slot 2: Agente 15 — Limpeza cirúrgica do boot check de role (PR #41 despoluído)
└── Slot 3: Agente 21 — Validação da cadeia de consentimento e expurgo LGPD (PR #33)
Gate Parcial: npx prisma migrate deploy && npm run verify:migration-drift && npm run test:integration

ONDA 04 — INFRAESTRUTURA DE RUNTIME, OUTBOX E FILAS (3 ESPECIALISTAS)
├── Slot 1: Agente 16 — Outbox relay durável e dead-letter queue (PR #32)
├── Slot 2: Agente 18 — OpenAPI drift resolver para factory routers (PR #26)
└── Slot 3: Agente 04 — Predictive rebalance e What-If (PR #23)
Gate Parcial: npm run test:architecture && npm run verify:openapi-drift

ONDA 05 — DOMÍNIOS COMERCIAIS E PROSPECÇÃO (3 ESPECIALISTAS)
├── Slot 1: Agente 05 — Execute tenancy e persistência fora de rollback (PRs #22 e #31)
├── Slot 2: Agente 02 — Interface de aprovação de rebalanceamento (PR #20)
└── Slot 3: Agente 06 — Resiliência de integração Bitrix e timeout handling
Gate Parcial: npm run test:unit && npm run test:integration

ONDA 06 — SEGURANÇA E HIGIENE (3 ESPECIALISTAS)
├── Slot 1: Agente 15 — Global security audit channel fora da outbox tenant (PR #38)
├── Slot 2: Agente 23 — Correção de sintaxe e validação dos budgets k6 (k6-crm-authenticated.js)
└── Slot 3: Agente 22 — Auditoria ponta a ponta de persistência real e sanitização de PII
Gate Parcial: CodeQL + Trivy + npm run check:bundle-budget

ONDA 07 — GATE COMPLETO DE INTEGRAÇÃO (2 ESPECIALISTAS)
├── Slot 1: Agente 08 — Execução da suíte completa de CI (Unit + Integration + E2E + Build)
└── Slot 2: Agente 24 — Auditoria independente de 100% dos diffs e emissão de parecer final
Gate de Saída: Todos os workflows aplicáveis verdes no SHA de integração.
```

---

## 7. Handoffs Oficiais Criados nesta Onda

Local: `.agents/handoffs/ci-recuperacao-onda-01/`
1. `00-para-08-format-prettier-gate.md` (Prioridade: Bloqueador)
2. `00-para-13-agentes-capabilities-dedup.md` (Prioridade: Bloqueador)
3. `00-para-01-prisma-migrations-sequencing.md` (Prioridade: Bloqueador)
4. `00-para-02-03-e2e-contrast-selectors.md` (Prioridade: Alto)

---

## 8. Parecer e Conclusão do Coordenador

- **STATUS DA ONDA 01:** APROVADA PARA TRANSIÇÃO (Inventário forense, mapeamento de causa-raiz, matriz de propriedade e plano de precedência concluídos e verificados).
- **Trabalho em Código Realizado:** Nenhum código de produto foi alterado (respeitado o princípio de auditoria sem modificações oportunistas concorrentes).
- **Encaminhamento Obrigatório:** Submeter este diagnóstico ao Agente 24 (`.agents/prompts/24-revisao-independente.md`) para emissão do Parecer Independente em `.agents/reviews/ci-recuperacao-onda-01-24.md`.
