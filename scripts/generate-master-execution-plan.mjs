import fs from 'node:fs';
import path from 'node:path';

// Master Execution and Homologation Plan (Birth Hub 360)
// Re-architected based on the Forensic Audit of Open PRs, Schema Dependencies, and AGENTS.md Governance.
// 9 Waves (Onda 0 to Onda 8), 100 Calibrated Steps with Real GitHub PR Tracking.

const steps = [
  // =========================================================================
  // ONDA 0: Reconciliação Forense, Desbloqueio e Auditoria dos PRs Abertos (Passos 1 a 10)
  // =========================================================================
  {
    id: 1,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Auditar e resolver conflitos de rebase do PR #18 (Persistência Grafo e Win-Loss)",
    agent: "00 — Coordenador",
    agentSlug: "00-coordenador",
    priority: "P0",
    status: "PR ABERTO (#18) — COM CONFLITOS",
    githubPr: 18,
    desc: "O PR #18 implementa accountGraphRepository e winLossAutopsyRepository com migração 20261020190000, mas possui conflitos com a main atual (8dff1dde). Fazer rebase limpo preservando os repositórios reais sem reimplementar do zero.",
    files: "prisma/schema.prisma, src/features/knowledge/infra/accountGraphRepository.ts, src/features/intelligence/infra/winLossAutopsyRepository.ts",
    criteria: "git rebase origin/main em agente/01-remed-02-persist-graph-winloss com zero conflitos residuais",
    prompt: `Você é o Agente 00. Leia AGENTS.md e .agents/prompts/00-coordenador.md antes de planejar.

Agente: 00 — Coordenador
Onda: 0
Base: origin/main
Branch: agente/00-reconcilia-pr18-graph-winloss

Objetivo:
Resolver conflitos de rebase do PR #18 contra a main atual garantindo que os repositórios reais de Grafo e Autópsia sejam preservados.

Fora de escopo:
Criar novos modelos ou alterar a lógica dos repositórios já criados no PR.

Arquivos sob propriedade:
- .agents/runs/**

Arquivos de outros donos:
- prisma/schema.prisma (Agente 01)
- src/features/knowledge/infra/accountGraphRepository.ts (Agente 04)

Suposições:
- Os modelos AccountKnowledgeNode e WinLossAutopsyRecord definidos no PR #18 estão aprovados pelo Agente 24 em parecer preliminar.

Plano:
1. Checkout da branch agente/01-remed-02-persist-graph-winloss.
2. Git rebase origin/main resolvendo conflitos em schema.prisma e lockfiles.
3. Executar npx prisma validate e npm run typecheck.
4. Push com lease e solicitação de reavaliação do Agente 24.

Critério de sucesso final:
PR #18 sem conflitos na interface do GitHub e typecheck 100% verde.

Entrega:
Relatório de rebase em .agents/runs/ e branch atualizada.`
  },
  {
    id: 2,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Auditar PR #28 (Zerar drift schema x migrations DATA-007) e rebasear sobre PR #18",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    status: "PR ABERTO (#28) — AGUARDANDO REBASE",
    githubPr: 28,
    desc: "O PR #28 zera a deriva de migração com 20261020200000_fix_schema_migration_drift. Deve ser encadeado imediatamente após o PR #18 para validar a árvore combinada de migrações via npm run verify:migration-drift.",
    files: "prisma/migrations/20261020200000_fix_schema_migration_drift/migration.sql, prisma/schema.prisma",
    criteria: "npm run verify:migration-drift com exit code 0",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Agente: 01 — Plataforma, Segurança e Dados
Onda: 0
Base: agente/01-remed-02-persist-graph-winloss
Branch: agente/01-migration-drift

Objetivo:
Rebasear o PR #28 sobre o PR #18 e comprovar ausência de drift entre schema e histórico de migrações.

Fora de escopo:
Adicionar tabelas novas fora do inventário canônico.

Arquivos sob propriedade:
- prisma/schema.prisma
- prisma/migrations/**

Arquivos de outros donos:
- scripts/verify-migration-drift.mjs (Agente 08)

Suposições:
- As migrações 190000 e 200000 são sequenciais e não colidem em constraints.

Plano:
1. Rebase sobre a branch do PR #18.
2. Executar npm run verify:migration-drift.
3. Atualizar rls-coverage unit se necessário.

Critério de sucesso final:
npm run verify:migration-drift passa com código 0.

Entrega:
Relatório de conclusão em .agents/handoffs/ e commit assinado.`
  },
  {
    id: 3,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Auditar PR #34 e unificar nomes canônicos de DomainEventOutbox e Idempotency",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    status: "PR ABERTO (#34) — AGUARDANDO REBASE",
    githubPr: 34,
    desc: "O PR #34 implementou DomainEventOutbox e DomainEventConsumption (ADR-006). Ratificar esses nomes canônicos em vez de TransactionalOutbox genérico, rebaseando sobre o PR #28 com testes de isolamento.",
    files: "prisma/schema.prisma, docs/ADR/ADR-006-Outbox-Relay-Tenant-Loop-e-Retencao.md, tests/integration/remed05-outbox-schema.test.ts",
    criteria: "npm run test:integration -- tests/integration/remed05-outbox-schema.test.ts",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Agente: 01 — Plataforma, Segurança e Dados
Onda: 0
Base: agente/01-migration-drift
Branch: agente/01-remed-05-outbox-schema

Objetivo:
Rebasear o PR #34 confirmando a nomenclatura canônica DomainEventOutbox e DomainEventConsumption conforme ADR-006.

Fora de escopo:
Implementar o relay em background (escopo do Agente 16 no PR #32).

Arquivos sob propriedade:
- prisma/schema.prisma
- prisma/migrations/20261020210000_remed05_domain_event_outbox/**
- tests/integration/remed05-outbox-schema.test.ts

Arquivos de outros donos:
- docs/ADR/ADR-006-Outbox-Relay-Tenant-Loop-e-Retencao.md

Suposições:
- A outbox atende ao padrão relacional multitenant com RLS FORCE.

Plano:
1. Rebase sobre a base unificada de dados.
2. Executar npx prisma validate e testes de integração remed05.
3. Atualizar rls-coverage para a nova tabela.

Critério de sucesso final:
npm run test:integration -- tests/integration/remed05-outbox-schema.test.ts 100% verde.

Entrega:
Relatório formal de conformidade com ADR-006.`
  },
  {
    id: 4,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Auditar PR #35 (ConsentAuditRecord + Flywheel) e rebasear em cadeia",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    status: "PR ABERTO (#35) — AGUARDANDO REBASE",
    githubPr: 35,
    desc: "Rebasear o PR #35 (migrações 20261020220000, 240000 e 20261021000000) sobre o PR #34, validando a proteção append-only contra DELETE/UPDATE no papel prospector_app.",
    files: "prisma/migrations/*_lgpd_consent_audit_chain_flywheel/**, tests/integration/lgpd-consent-flywheel-rls.test.ts",
    criteria: "npm run test:integration -- tests/integration/lgpd-consent-flywheel-rls.test.ts",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Agente: 01 — Plataforma, Segurança e Dados
Onda: 0
Base: agente/01-remed-05-outbox-schema
Branch: agente/01-lgpd-consent-flywheel-schema

Objetivo:
Rebasear o PR #35 preservando as migrações LGPD e validando os testes de RLS do Flywheel.

Fora de escopo:
Modificar controllers de consentimento no frontend.

Arquivos sob propriedade:
- prisma/schema.prisma
- prisma/migrations/*_lgpd*/**
- tests/integration/lgpd-*.test.ts

Critério de sucesso final:
npm run test:integration -- tests/integration/lgpd-consent-flywheel-rls.test.ts passa verde.`
  },
  {
    id: 5,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Decisão e alinhamento LGPD da coluna note no PR #37 (RebalanceApproval)",
    agent: "21 — Privacidade e LGPD",
    agentSlug: "21-privacidade-lgpd",
    priority: "P0",
    status: "PR ABERTO (#37) — BLOQUEADO PELO 24",
    githubPr: 37,
    desc: "Resolver a divergência entre note VARCHAR(280) com rotina de anonimização (PR #37) versus noteLength + noteHash HMAC SHA-256 (política do PR #23). Emitir decisão formal do Agente 21 autorizando o schema final.",
    files: "docs/lgpd/DECISAO-REBALANCE-APPROVAL-NOTE.md, prisma/schema.prisma",
    criteria: "test -f docs/lgpd/DECISAO-REBALANCE-APPROVAL-NOTE.md",
    prompt: `Você é o Agente 21. Leia AGENTS.md e .agents/prompts/21-privacidade-lgpd.md antes de planejar.

Agente: 21 — Privacidade e LGPD
Onda: 0
Base: main
Branch: agente/21-decisao-rebalance-approval-note

Objetivo:
Formalizar a diretriz de privacidade para o campo de notas de RebalanceApproval: texto livre com expurgo ativo ou hash determinístico.

Fora de escopo:
Alterar código SQL ou DDL diretamente.

Arquivos sob propriedade:
- docs/lgpd/**

Suposições:
- O oráculo comercial não requer leitura reversível da justificativa por humanos após aprovação.

Plano:
1. Avaliar risco de PII em justificativas de transferência de leads.
2. Emitir parecer aprovando noteLength + noteHash ou note sanitizada com trigger de expurgo.
3. Registrar aceite formal no handoff para os Agentes 01 e 04.

Critério de sucesso final:
Parecer do Agente 21 publicado e consensual com Agente 24.`
  },
  {
    id: 6,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Rebasear PR #37 aplicando a decisão de privacidade e corrigindo rls-coverage (130)",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    status: "PR ABERTO (#37) — BLOQUEADO PELO 24",
    githubPr: 37,
    desc: "Rebasear o PR #37 sobre o PR #35, incorporar a decisão do Agente 21 e corrigir o teste tests/integration/rls-coverage.test.ts para contemplar a tabela RebalanceApproval, eliminando o erro 'expected 130 to be 129'.",
    files: "prisma/schema.prisma, tests/integration/rls-coverage.test.ts, tests/integration/rebalance-approval-schema.test.ts",
    criteria: "npm run test:integration -- tests/integration/rls-coverage.test.ts",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Agente: 01 — Plataforma, Segurança e Dados
Onda: 0
Base: agente/01-lgpd-consent-flywheel-schema
Branch: agente/01-rebalance-approval-schema

Objetivo:
Rebasear PR #37, alinhar coluna note conforme diretriz do 21 e atualizar contador em rls-coverage.test.ts de 129 para 130.

Critério de sucesso final:
Testes de integração rls-coverage e rebalance-approval 100% verdes.`
  },
  {
    id: 7,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Auditar e integrar PR #39 (Separação prospector_migrator vs prospector_app)",
    agent: "15 — Segurança Aplicada e Rotação de Segredos",
    agentSlug: "15-seguranca-aplicada",
    priority: "P0",
    status: "PR ABERTO (#39) — EM REVISÃO",
    githubPr: 39,
    desc: "O PR #39 cria o script de separação de papéis SQL no PostgreSQL, garantindo que o usuário de aplicação prospector_app possua estritamente DML com NOBYPASSRLS.",
    files: "scripts/db/create-app-role.sql, docs/development/LOCAL_FIRST.md",
    criteria: "grep -i 'NOBYPASSRLS' scripts/db/create-app-role.sql",
    prompt: `Você é o Agente 15. Leia AGENTS.md e .agents/prompts/15-seguranca-aplicada.md antes de planejar.

Agente: 15 — Segurança Aplicada e Rotação de Segredos
Onda: 0
Base: main
Branch: agente/01-db-owner-role-separation

Objetivo:
Validar que prospector_app tenha apenas privilégios DML nas tabelas do schema public com NOBYPASSRLS forçado.

Critério de sucesso final:
Script create-app-role.sql aprovado e testado em container PostgreSQL.`
  },
  {
    id: 8,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Auditar e integrar PR #40 (runInTransaction e propagação de tenantId)",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    status: "PR ABERTO (#40) — EM REVISÃO",
    githubPr: 40,
    desc: "O PR #40 adiciona suporte a transações aninhadas no Prisma Client com herança garantida do contexto de organização em current_setting('app.current_tenant_id').",
    files: "src/lib/prisma.ts, src/lib/db/transactionContext.ts",
    criteria: "npm run test:unit -- tests/unit/security/prismaTxPropagation.test.ts",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Agente: 01 — Plataforma, Segurança e Dados
Onda: 0
Base: main
Branch: agente/01-prisma-tx-propagation

Objetivo:
Garantir que runInTransaction propague o tenant context para todas as operações transacionais sem perda de isolamento.

Critério de sucesso final:
npm run test:unit -- tests/unit/security/prismaTxPropagation.test.ts aprovado sem falhas.`
  },
  {
    id: 9,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Auditar e integrar PR #41 (Verificação fatal de boot do papel do banco)",
    agent: "15 — Segurança Aplicada e Rotação de Segredos",
    agentSlug: "15-seguranca-aplicada",
    priority: "P0",
    status: "PR ABERTO (#41) — EM REVISÃO",
    githubPr: 41,
    desc: "O PR #41 adiciona verificação no boot do server.ts abortando a inicialização caso a DATABASE_URL esteja conectando como superusuário ou dono do banco em produção.",
    files: "src/server.ts, src/lib/db/bootRoleCheck.ts",
    criteria: "npm run test:unit -- tests/unit/security/bootRoleCheck.test.ts",
    prompt: `Você é o Agente 15. Leia AGENTS.md e .agents/prompts/15-seguranca-aplicada.md antes de planejar.

Agente: 15 — Segurança Aplicada e Rotação de Segredos
Onda: 0
Base: main
Branch: agente/15-db-role-boot-check

Objetivo:
Implementar verificação fail-fast de papel de banco no boot do server.ts para ambientes de produção.

Critério de sucesso final:
Simulação de boot com superusuário em NODE_ENV=production aborta com erro fatal documentado.`
  },
  {
    id: 10,
    wave: 0,
    waveTitle: "Onda 0: Reconciliação Forense e Auditoria dos PRs Abertos",
    title: "Parecer formal consolidado do Agente 24 sobre a Onda 0 de Reconciliação",
    agent: "24 — Revisão Independente",
    agentSlug: "24-revisao-independente",
    priority: "P0",
    status: "AGUARDANDO CONCLUSÃO ONDA 0",
    desc: "Auditar o conjunto dos PRs #18, #28, #34, #35, #37, #39, #40 e #41 após os rebases sequenciais, liberando a leva de merges para a main em conformidade com o AGENTS.md.",
    files: ".agents/reviews/24-parecer-onda-00-reconciliacao-prs.md",
    criteria: "test -f .agents/reviews/24-parecer-onda-00-reconciliacao-prs.md",
    prompt: `Você é o Agente 24. Leia AGENTS.md e .agents/prompts/24-revisao-independente.md antes de planejar.

Missão: Auditar a reconciliação e encadeamento dos PRs da Onda 0.
Critérios de aceite:
1. Zero conflitos em git rebase nas branches de dados.
2. Migrações sequenciais ordenadas sem falhas de foreign key.
3. RLS testado em 100% das tabelas novas com cobertura validada.
4. Parecer formal APROVADO publicado em .agents/reviews/.`
  }
];

// Definition of subsequent waves (Waves 1 to 8, steps 11 to 100)
const postReconWaves = [
  {
    wave: 1,
    title: "Onda 1: Consolidação do Banco, Schema Unificado e RLS Parity",
    start: 11,
    items: [
      { id: 11, title: "Executar merge sequencial do PR #18 na main após rebase verde", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", status: "ENCADEADO (#18)", files: "prisma/schema.prisma", test: "git merge --ff-only agente/01-remed-02-persist-graph-winloss", desc: "Integrar o PR #18 na main incorporando AccountKnowledgeNode e WinLossAutopsyRecord." },
      { id: 12, title: "Executar merge sequencial do PR #28 na main", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", status: "ENCADEADO (#28)", files: "prisma/migrations/*", test: "git merge --ff-only agente/01-migration-drift", desc: "Integrar o PR #28 zerando qualquer drift de migração na main." },
      { id: 13, title: "Executar merge sequencial do PR #34 na main", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", status: "ENCADEADO (#34)", files: "prisma/migrations/*_remed05_domain_event_outbox/**", test: "git merge --ff-only agente/01-remed-05-outbox-schema", desc: "Integrar DomainEventOutbox e DomainEventConsumption na main." },
      { id: 14, title: "Executar merge sequencial do PR #35 na main", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", status: "ENCADEADO (#35)", files: "prisma/migrations/*_lgpd_consent_audit_chain_flywheel/**", test: "git merge --ff-only agente/01-lgpd-consent-flywheel-schema", desc: "Integrar ConsentAuditRecord append-only na main." },
      { id: 15, title: "Executar merge sequencial do PR #37 na main", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", status: "ENCADEADO (#37)", files: "prisma/migrations/*_rebalance_approval/**", test: "git merge --ff-only agente/01-rebalance-approval-schema", desc: "Integrar RebalanceApproval com chave composta na main." },
      { id: 16, title: "Atualizar contagem total definitiva de RLS para 134 tabelas protegidas", agent: "01A — Confiabilidade de Dados, RLS e Retenção", slug: "01a-confiabilidade-dados-rls", p: "P0", status: "PLANEJADO", files: "tests/integration/rls-coverage.test.ts, docs/security/RLS_COVERAGE_MATRIX.md", test: "npm run test:integration -- tests/integration/rls-coverage.test.ts", desc: "Ajustar o assert canônico para refletir exatamente as 134 tabelas do schema consolidado." },
      { id: 17, title: "Executar validação limpa de todas as migrações em container PostgreSQL local", agent: "01 — Plataforma, Segurança e Dados", slug: "01-plataforma-seguranca-dados", p: "P0", status: "PLANEJADO", files: "prisma/migrations/**", test: "npx prisma migrate status && npm run verify:migration-drift", desc: "Garantir aplicação sequencial perfeita de migrações 001 a 145 sem qualquer erro de foreign key." },
      { id: 18, title: "Parecer formal do Agente 24 liberando o fechamento da Onda 1", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", status: "PLANEJADO", files: ".agents/reviews/24-parecer-onda-01-schema-consolidado.md", test: "test -f .agents/reviews/24-parecer-onda-01-schema-consolidado.md", desc: "Certificar banco de dados 100% íntegro, livre de drift e com RLS ativo em todas as tabelas." }
    ]
  },
  {
    wave: 2,
    title: "Onda 2: Hardening de Transações, Outbox Relay e Segurança DDL/DML",
    start: 19,
    items: [
      { id: 19, title: "Integrar PR #39 (create-app-role.sql) na main", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", status: "ENCADEADO (#39)", files: "scripts/db/create-app-role.sql", test: "git merge --ff-only agente/01-db-owner-role-separation", desc: "Consolidar a separação estrita de dono de banco vs usuário de aplicação." },
      { id: 20, title: "Integrar PR #40 (runInTransaction) na main", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", status: "ENCADEADO (#40)", files: "src/lib/prisma.ts", test: "git merge --ff-only agente/01-prisma-tx-propagation", desc: "Consolidar suporte a transações seguras com herança de tenant context." },
      { id: 21, title: "Integrar PR #41 (check de boot fatal) na main", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", status: "ENCADEADO (#41)", files: "src/server.ts", test: "git merge --ff-only agente/15-db-role-boot-check", desc: "Bloquear conexões com privilégios de superusuário no server.ts em produção." },
      { id: 22, title: "Rebasear e integrar PR #32 (Outbox Relay com backoff e dead-letter)", agent: "16 — Runtime, Workers e Escala", slug: "16-runtime-workers-escala", p: "P1", status: "PR ABERTO (#32) — REBASE PENDENTE", files: "src/lib/queue/outboxRelay.worker.ts", test: "npm run test:unit -- tests/unit/queue/outboxRelay.service.test.ts", desc: "Worker resiliente que processa DomainEventOutbox com retry exponencial e DLQ." },
      { id: 23, title: "Integrar PR #38 (Canal global de auditoria fora da outbox de tenant)", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P1", status: "PR ABERTO (#38) — EM REVISÃO", files: "src/lib/security/globalSecurityAuditChannel.ts", test: "npm run test:unit -- tests/unit/security/globalSecurityAuditChannel.test.ts", desc: "Canal isolado de auditoria de sistema para evitar poluição da outbox de organizações." },
      { id: 24, title: "Implementar barramento de idempotência durável sobre DomainEventConsumption", agent: "16 — Runtime, Workers e Escala", slug: "16-runtime-workers-escala", p: "P1", status: "PLANEJADO", files: "src/lib/queue/idempotencyManager.ts", test: "npm run test:unit -- tests/unit/queue/idempotencyManager.test.ts", desc: "Garantir processamento exactly-once de mensagens recebidas de webhooks e filas." },
      { id: 25, title: "Rebasear e integrar PR #33 (Cadeia de consentimento LGPD e k-anonymity)", agent: "21 — Privacidade e LGPD", slug: "21-privacidade-lgpd", p: "P1", status: "PR ABERTO (#33) — REBASE PENDENTE", files: "src/shared/services/consentAuditChain.service.ts", test: "npm run test:unit -- tests/unit/security/consentAuditChain.test.ts", desc: "Integrar assinatura SHA-256 encadeada e filtro k=5 para anonimização analítica." },
      { id: 26, title: "Implementar sanitização com restrição de permissão de ferramentas no Gateway IA", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P1", status: "PLANEJADO", files: "src/lib/ai/gateway/untrustedContentGuard.ts", test: "npm run test:unit -- tests/unit/ai/untrustedContentGuard.test.ts", desc: "Proteger LLM contra injeção de prompt limitando chamadas de tools e validando schemas estritos." },
      { id: 27, title: "Configurar cabeçalhos de segurança HTTP e CSP restritiva no server.ts", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P2", status: "PLANEJADO", files: "src/server.ts, src/middleware/securityHeaders.ts", test: "npm run test:unit -- tests/unit/security/securityHeaders.test.ts", desc: "Configurar Content-Security-Policy, HSTS e X-Frame-Options no Express." },
      { id: 28, title: "Configurar PgBouncer e calibrar pool de conexões para concorrência", agent: "16 — Runtime, Workers e Escala", slug: "16-runtime-workers-escala", p: "P2", status: "PLANEJADO", files: "docker/pgbouncer/pgbouncer.ini, src/lib/prisma.ts", test: "npm run test:load -- tests/load/k6-db-pool-saturation.js", desc: "Gerenciar pool de 100 conexões concorrentes prevenindo sobrecarga do PostgreSQL." },
      { id: 29, title: "Suíte de testes de penetração simulando bypass de RLS e injeção de tenant", agent: "14 — Ambiente de Execução e Test Harness", slug: "14-ambiente-execucao-testes", p: "P1", status: "PLANEJADO", files: "tests/security/rlsPenetration.test.ts", test: "npm run test:integration -- tests/security/rlsPenetration.test.ts", desc: "Executar testes adversariais tentando ler dados entre tenants sem permissão." },
      { id: 30, title: "Parecer formal do Agente 24 para a Onda 2 (Segurança e Transações)", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", status: "PLANEJADO", files: ".agents/reviews/24-parecer-onda-02-transacoes-seguranca.md", test: "test -f .agents/reviews/24-parecer-onda-02-transacoes-seguranca.md", desc: "Auditar a robustez transacional e conformidade de segurança da base unificada." }
    ]
  },
  {
    wave: 3,
    title: "Onda 3: Persistência Real de Domínio (Fim de Maps/Sets em Memória)",
    start: 31,
    items: [
      { id: 31, title: "Conectar accountKnowledgeGraph.service.ts ao repositório real do PR #18", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", status: "PR #18 EM RECONCILIAÇÃO", files: "src/features/knowledge/services/accountKnowledgeGraph.service.ts", test: "npm run test:unit -- tests/unit/knowledge/accountKnowledgeGraph.service.test.ts", desc: "Substituir Map em memória pelas chamadas a accountGraphRepository persistidas no PostgreSQL." },
      { id: 32, title: "Conectar winLossAutopsy.service.ts ao repositório real do PR #18", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", status: "PR #18 EM RECONCILIAÇÃO", files: "src/features/intelligence/services/winLossAutopsy.service.ts", test: "npm run test:unit -- tests/unit/intelligence/winLossAutopsy.service.test.ts", desc: "Substituir Map de autópsias por winLossAutopsyRepository persistido com RLS." },
      { id: 33, title: "Implementar PrismaBehavioralEngineRepository para gamificação comercial", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", status: "PLANEJADO", files: "src/features/gamification/behavioralEngine.service.ts", test: "npm run test:unit -- tests/unit/gamification/behavioralEngine.service.test.ts", desc: "Persistir pontos, níveis e conquistas dos vendedores no banco de dados." },
      { id: 34, title: "Garantir idempotência na atribuição de pontos de gamificação", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P2", status: "PLANEJADO", files: "src/features/gamification/services/gamificationAward.service.ts", test: "npm run test:unit -- tests/unit/gamification/behavioralEngine.service.test.ts", desc: "Evitar pontuação duplicada para o mesmo evento de conversão ou deal ganho." },
      { id: 35, title: "Criar PrismaSelfDrivingCrmRepository para cadências multicanal", agent: "17 — Cadência Multicanal e Ciclo de Receita", slug: "17-cadencia-multicanal", p: "P1", status: "PLANEJADO", files: "src/features/cadence/selfDrivingCrm.service.ts", test: "npm run test:unit -- tests/unit/cadence/selfDrivingCrm.service.test.ts", desc: "Substituir estado em memória por tabelas relacionais de passos e filas de cadência." },
      { id: 36, title: "Conectar PrismaRebalanceApprovalStore ao rebalanceApproval.service.ts", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", status: "PR #37 REQUISITO", files: "src/features/commercial-intelligence/services/rebalanceApproval.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/rebalanceApproval.routes.test.ts", desc: "Persistir decisões de aprovação na tabela RebalanceApproval em vez do AuditLog." },
      { id: 37, title: "Persistir rascunhos de abordagem do Social Selling com expiração automática", agent: "05 — Prospecção", slug: "05-prospeccao", p: "P2", status: "PLANEJADO", files: "src/features/social-selling/services/socialSellingApproach.service.ts", test: "npm run test:unit -- tests/unit/features/social-selling/socialSelling.service.test.ts", desc: "Armazenar mensagens geradas por IA com chave de expurgo e tenant isolado." },
      { id: 38, title: "Persistir sessões de Roleplay comercial com feedback e nota do avaliador", agent: "07 — IA e Automações", slug: "07-ia-automacoes", p: "P2", status: "PLANEJADO", files: "src/features/roleplay/services/roleplaySession.service.ts", test: "npm run test:unit -- tests/unit/roleplay/multimodalRoleplaySimulator.service.test.ts", desc: "Gravar sessões de treino com pontuação de objeções e transcrição sanitizada." },
      { id: 39, title: "Persistir telemetria de chamadas de voz com redação de dados sensíveis", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P1", status: "PLANEJADO", files: "src/features/voice-hub/services/callRecord.service.ts", test: "npm run test:unit -- tests/unit/ai-voice/conversationalIntelligence.service.test.ts", desc: "Salvar dados de duração, latência e transcrições sem PII no banco de dados." },
      { id: 40, title: "Implementar fila de sincronização offline no aplicativo Mobile (Capacitor)", agent: "09 — Mobile", slug: "09-mobile", p: "P1", status: "PLANEJADO", files: "src/features/mobile/services/offlineSyncQueue.service.ts", test: "npm run test:unit -- tests/unit/mobile/mobileEdgeAi.service.test.ts", desc: "Gerenciar fila SQLite local e envio assíncrono para o servidor com Last-Write-Wins." },
      { id: 41, title: "Executar Reboot Test comprovando persistência de dados após reinício forçado", agent: "22 — Verificação de Realidade", slug: "22-verificacao-realidade", p: "P0", status: "PLANEJADO", files: "tests/integration/persistenceReboot.integration.test.ts", test: "npm run test:integration -- tests/integration/persistenceReboot.integration.test.ts", desc: "Criar dados de ponta a ponta, derrubar o processo Node e comprovar 100% de integridade." },
      { id: 42, title: "Parecer formal do Agente 24 sobre a eliminação de estados voláteis (Onda 3)", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", status: "PLANEJADO", files: ".agents/reviews/24-parecer-onda-03-persistencia-real.md", test: "test -f .agents/reviews/24-parecer-onda-03-persistencia-real.md", desc: "Homologar que nenhum dado de negócio seja perdido em reinicializações do servidor." }
    ]
  },
  {
    wave: 4,
    title: "Onda 4: Revenue Oracle, Previsões Reais e Inteligência Comercial",
    start: 43,
    items: [
      { id: 43, title: "Ratificar integração do PR #15 (Revenue Oracle com dados reais de pipeline)", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", status: "JÁ INTEGRADO (#15)", githubPr: 15, files: "src/features/commercial-intelligence/services/predictiveRevenueOracle.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "O PR #15 já eliminou valores fixos e implementou leitura do histórico de fechamentos reais." },
      { id: 44, title: "Ratificar contrato IPredictiveRevenueOraclePort V2 e rotas no OpenAPI (#17, #19)", agent: "18 — Contratos, API e Documentação Viva", slug: "18-contratos-api-docs", p: "P1", status: "JÁ INTEGRADO (#17, #19)", githubPr: 19, files: "docs/openapi.yaml, src/shared/contracts/predictiveRevenueOraclePorts.contract.ts", test: "npm run verify:openapi-drift", desc: "Os PRs #17 e #19 já registraram o contrato e os caminhos OpenAPI na main." },
      { id: 45, title: "Implementar cálculo dinâmico de MAPE (Mean Absolute Percentage Error)", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P2", status: "PLANEJADO", files: "src/features/commercial-intelligence/services/mapeCalculator.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Calcular acurácia das previsões passadas confrontando projeção com faturamento real." },
      { id: 46, title: "Implementar simulação What-If baseada na dispersão padrão dos fechamentos", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P2", status: "PLANEJADO", files: "src/features/commercial-intelligence/services/whatIfSimulator.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Calcular cenários otimistas e conservadores com base matemática real sem números inventados." },
      { id: 47, title: "Implementar algoritmo de balanceamento de carga de carteiras de clientes", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P2", status: "PLANEJADO", files: "src/features/commercial-intelligence/services/portfolioRebalancer.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/rebalanceApproval.routes.test.ts", desc: "Gerar recomendações de redistribuição de contas entre vendedores considerando capacidade." },
      { id: 48, title: "Implementar endpoint /commercial-intelligence/predictive/backtest", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P2", status: "PLANEJADO", files: "src/features/commercial-intelligence/routes/predictive.routes.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Endpoint para teste retrospectivo de acurácia de modelos preditivos por organização." },
      { id: 49, title: "Implementar endpoint consolidado /commercial-intelligence/predictive/cockpit", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", status: "PLANEJADO", files: "src/features/commercial-intelligence/routes/predictive.routes.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Disponibilizar KPIs preditivos consolidados para alimentação direta da interface web." },
      { id: 50, title: "Conectar PredictiveRevenueCockpit.tsx aos endpoints reais de predição", agent: "02 — Produto e UX", slug: "02-produto-ux", p: "P1", status: "PLANEJADO", files: "src/features/commercial-intelligence/components/PredictiveRevenueCockpit.tsx", test: "npm run test:unit -- tests/unit/components/cockpitsAndPanels.unit.test.tsx", desc: "Conectar painel React aos dados do backend com tratamento honesto de base vazia." },
      { id: 51, title: "Adicionar telemetria FinOps nas inferências preditivas do Oráculo", agent: "23 — Custo, Performance e Limites de IA", slug: "23-custo-performance-ia", p: "P2", status: "PLANEJADO", files: "src/lib/ai/gateway/pricing.ts", test: "npm run test:unit -- tests/unit/ai/semanticCache.service.test.ts", desc: "Medir milissegundos e custo de tokens em chamadas preditivas do oráculo." },
      { id: 52, title: "Parecer formal do Agente 24 para a Onda 4 (Revenue Oracle Real)", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", status: "PLANEJADO", files: ".agents/reviews/24-parecer-onda-04-revenue-oracle.md", test: "test -f .agents/reviews/24-parecer-onda-04-revenue-oracle.md", desc: "Homologar que o motor de predição opera estritamente com histórico de banco de dados." }
    ]
  },
  {
    wave: 5,
    title: "Onda 5: Conectores e Gateways de Comunicação Resilientes",
    start: 53,
    items: [
      { id: 53, title: "Implementar cliente Bitrix24 com rate limiting inteligente e retry com backoff", agent: "06 — Integrações e Bitrix", slug: "06-integracoes-bitrix", p: "P1", status: "PLANEJADO", files: "src/features/integrations/bitrix/client.ts", test: "npm run test:unit -- tests/unit/integrations/bitrix/client.timeout.test.ts", desc: "Garantir espaçamento de 500ms entre requisições evitando 429 da API do Bitrix24." },
      { id: 54, title: "Implementar sincronização bidirecional de Leads e Negócios com Bitrix24", agent: "06 — Integrações e Bitrix", slug: "06-integracoes-bitrix", p: "P1", status: "PLANEJADO", files: "src/features/integrations/bitrix/syncActivityToBitrix.ts", test: "npm run test:unit -- tests/unit/integrations/bitrix/syncActivityToBitrix.test.ts", desc: "Sincronizar criação e atualização de registros entre PostgreSQL e CRM Bitrix." },
      { id: 55, title: "Implementar extrações paginadas duráveis de histórico Bitrix24 com checkpoint", agent: "06A — Extrações Bitrix", slug: "06a-extracoes-bitrix", p: "P2", status: "PLANEJADO", files: "src/features/integrations/bitrix/paginatedExtractor.ts", test: "npm run test:unit -- tests/unit/integrations/bitrix/paginatedExtractor.test.ts", desc: "Extrair lotes de 50 registros salvando checkpoint para recuperação em queda de conexão." },
      { id: 56, title: "Decisão Arquitetural: 3CX SIP/WebRTC vs Twilio Voice (Arquitetura de Telefonia)", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P1", status: "PLANEJADO", files: "docs/architecture/ADR-007-TELEFONIA-3CX-TWILIO.md", test: "test -f docs/architecture/ADR-007-TELEFONIA-3CX-TWILIO.md", desc: "Definir fornecedor primário de telefonia (3CX WebRTC com custos previsíveis vs Twilio sob demanda)." },
      { id: 57, title: "Conectar conector de telefonia primário aprovado ao VoiceHub", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P1", status: "PLANEJADO", files: "src/features/voice-hub/services/telephonyProvider.service.ts", test: "npm run test:unit -- tests/unit/ai-voice/autonomousSdr.service.test.ts", desc: "Estabelecer chamadas ativas de consultores e SDR com suporte a eventos de tarifação e áudio." },
      { id: 58, title: "Implementar detecção de voz ativa (VAD) e barge-in para interrupção fluida de SDR", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P2", status: "PLANEJADO", files: "src/features/voice-hub/services/vadBargeIn.service.ts", test: "npm run test:unit -- tests/unit/ai-voice/bimodalLiveVoice.service.test.ts", desc: "Interromper fala da IA instantaneamente quando o interlocutor começar a falar." },
      { id: 59, title: "Implementar pipeline de transcrição de áudio com mascaramento de PII em voo", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P1", status: "PLANEJADO", files: "src/features/voice-hub/services/realtimeTranscription.service.ts", test: "npm run test:unit -- tests/unit/security/piiTokenizer.service.test.ts", desc: "Redigir CPFs, cartões e telefones do stream de áudio antes de gravar no banco." },
      { id: 60, title: "Decisão e conector WhatsApp: Baileys (Sessão Postgres) vs API Oficial Cloud", agent: "06 — Integrações e Bitrix", slug: "06-integracoes-bitrix", p: "P1", status: "PLANEJADO", files: "docs/architecture/ADR-008-WHATSAPP-CONECTOR.md, src/features/integrations/whatsapp/*", test: "npm run test:unit -- tests/unit/integrations/bitrixEventMeshBridge.test.ts", desc: "Definir e homologar o conector de mensageria com suporte a reconexão automática e conformidade." },
      { id: 61, title: "Implementar disparador de cadência multicanal com bloqueio prévio de opt-out LGPD", agent: "17 — Cadência Multicanal e Ciclo de Receita", slug: "17-cadencia-multicanal", p: "P0", status: "PLANEJADO", files: "src/features/cadence/services/multichannelDispatcher.service.ts", test: "npm run test:unit -- tests/unit/cadence/adaptiveMultichannelCadence.service.test.ts", desc: "Bloqueio estrito de envio para contatos que exerceram direito de oposição LGPD." },
      { id: 62, title: "Integrar conector Apollo.io e BrasilAPI com cache relacional de 30 dias", agent: "05 — Prospecção", slug: "05-prospeccao", p: "P2", status: "PLANEJADO", files: "src/features/prospecting/services/companyEnrichment.service.ts", test: "npm run test:unit -- tests/unit/crm/PrismaCompanyRepository.search.test.ts", desc: "Buscar dados cadastrais oficiais de empresas com controle de quota e cache local." },
      { id: 63, title: "Implementar gerador e verificador de propostas em PDF com hash SHA-256", agent: "17 — Cadência Multicanal e Ciclo de Receita", slug: "17-cadencia-multicanal", p: "P2", status: "PLANEJADO", files: "src/features/proposals/services/proposalDocument.service.ts", test: "npm run test:unit -- tests/unit/proposals/proposalAutomation.service.test.ts", desc: "Gerar propostas comerciais em PDF com assinatura digital e trilha de auditoria." },
      { id: 64, title: "Configurar roteamento dinâmico e fallback automático de provedores de LLM", agent: "07 — IA e Automações", slug: "07-ia-automacoes", p: "P1", status: "PLANEJADO", files: "src/lib/ai/gateway/model-routing.ts", test: "npm run test:unit -- tests/unit/ai/modelCascade.test.ts", desc: "Redirecionar requisições para backup caso o provedor primário apresente instabilidade." },
      { id: 65, title: "Exportar métricas de saúde e latência de integrações para o Prometheus", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P2", status: "PLANEJADO", files: "src/lib/metrics/prometheusExporter.ts", test: "npm run verify:integrations", desc: "Monitorar taxa de erro e tempo de resposta de cada serviço externo conectado." },
      { id: 66, title: "Parecer formal do Agente 24 para a Onda 5 (Conectores e Gateways)", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", status: "PLANEJADO", files: ".agents/reviews/24-parecer-onda-05-conectores-gateways.md", test: "test -f .agents/reviews/24-parecer-onda-05-conectores-gateways.md", desc: "Atestar que nenhum gateway opera de forma puramente simulada ou sem tratamento de falha." }
    ]
  },
  {
    wave: 6,
    title: "Onda 6: Identidade Visual, Design System e Acessibilidade WCAG 2.2 AA",
    start: 67,
    items: [
      { id: 67, title: "Auditar e calibrar contraste de cores nos modos Claro e Escuro (WCAG 2.2 AA)", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P1", status: "PLANEJADO", files: "src/index.css, src/contexts/ThemeContext.tsx", test: "npx playwright test tests/e2e/accessibility.spec.ts", desc: "Garantir contraste de texto mínimo de 4.5:1 para texto normal e 3:1 para elementos de UI." },
      { id: 68, title: "Implementar anéis de foco visíveis universais (focus-visible:ring-2) na UI", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P1", status: "PLANEJADO", files: "src/components/ui/*.tsx, src/index.css", test: "npm run test:unit -- tests/unit/components/ui/Card.test.tsx", desc: "Indicador de foco nítido em todos os botões, links, cards e inputs ao navegar por teclado." },
      { id: 69, title: "Corrigir hierarquia de cabeçalhos semânticos e marcos ARIA em todas as telas", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P2", status: "PLANEJADO", files: "src/components/layout/AppLayout.tsx, src/App.tsx", test: "npx playwright test tests/e2e/accessibility.spec.ts", desc: "Apenas um h1 por tela, marcos header, nav, main e aside para leitores de tela." },
      { id: 70, title: "Alinhar tokens semânticos na Sidebar e AppBreadcrumbs eliminando cores fixas", agent: "02 — Produto e UX", slug: "02-produto-ux", p: "P2", status: "PLANEJADO", files: "src/components/layout/Sidebar.tsx, src/components/layout/AppBreadcrumbs.tsx", test: "npm run build", desc: "Usar var(--surface), var(--ink), var(--line) garantindo consistência visual em todos os módulos." },
      { id: 71, title: "Implementar navegação por teclado acessível no Kanban de Negócios", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P2", status: "PLANEJADO", files: "src/features/crm/components/KanbanBoard.tsx", test: "npx playwright test tests/e2e/crm-kanban.spec.ts", desc: "Mover cards entre colunas do funil usando atalhos de teclado (Espaço/Enter e Setas)." },
      { id: 72, title: "Adicionar atributos aria-expanded e aria-controls em menus dropdown e modais", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P2", status: "PLANEJADO", files: "src/components/ui/DropdownMenu.tsx, src/components/ui/Modal.tsx", test: "npm run test:unit -- tests/unit/components/cockpitsAndPanels.unit.test.tsx", desc: "Informar tecnologias assistivas sobre abertura e fechamento de elementos flutuantes." },
      { id: 73, title: "Padronizar estados de Empty State, Loading Skeleton e Error em todos os módulos", agent: "02 — Produto e UX", slug: "02-produto-ux", p: "P1", status: "PLANEJADO", files: "src/components/ui/EmptyState.tsx, src/components/ui/Skeleton.tsx", test: "npm run test:unit -- tests/unit/components/cockpitsAndPanels.unit.test.tsx", desc: "Evitar telas brancas ou congeladas durante carregamento ou falha de requisição de dados." },
      { id: 74, title: "Aplicar respeito à diretiva prefers-reduced-motion nas animações do Framer Motion", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P2", status: "PLANEJADO", files: "src/lib/motion.ts", test: "npm run test:unit -- tests/unit/components/ui/Card.test.tsx", desc: "Desativar transições de movimento bruscas para usuários com sensibilidade vestibular." },
      { id: 75, title: "Garantir layout responsivo fluido em dispositivos móveis (360px a 1920px)", agent: "09 — Mobile", slug: "09-mobile", p: "P1", status: "PLANEJADO", files: "src/components/layout/AppLayout.tsx", test: "npx playwright test tests/e2e/responsive.spec.ts", desc: "Eliminar barras de rolagem horizontais indesejadas e garantir gaveta lateral fluida no celular." },
      { id: 76, title: "Executar varredura completa axe-core em todas as rotas da aplicação web", agent: "08 — QA e Release", slug: "08-qa-release", p: "P1", status: "PLANEJADO", files: "tests/e2e/accessibility.spec.ts", test: "npx playwright test tests/e2e/accessibility.spec.ts", desc: "Zerar violações críticas e sérias da norma WCAG 2.2 nível AA no Playwright." },
      { id: 77, title: "Parecer formal do Agente 24 para a Onda 6 (Design e Acessibilidade)", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", status: "PLANEJADO", files: ".agents/reviews/24-parecer-onda-06-design-acessibilidade.md", test: "test -f .agents/reviews/24-parecer-onda-06-design-acessibilidade.md", desc: "Homologar conformidade de acessibilidade e consistência visual de ponta a ponta." }
    ]
  },
  {
    wave: 7,
    title: "Onda 7: Performance, E2E Playwright, Segurança e CI/CD",
    start: 78,
    items: [
      { id: 78, title: "Sanear testes E2E Playwright herdados (accessibility.spec.ts e cadence.spec.ts)", agent: "08 — QA e Release", slug: "08-qa-release", p: "P0", status: "BLOQUEADOR CI", files: "tests/e2e/accessibility.spec.ts, tests/e2e/cadence.spec.ts", test: "npx playwright test", desc: "Corrigir falhas que cancelavam a execução do CI (run 39527009503)." },
      { id: 79, title: "Implementar retries determinísticos e isolamento de banco para testes de CI", agent: "08 — QA e Release", slug: "08-qa-release", p: "P1", status: "PLANEJADO", files: "vitest.integration.config.ts, playwright.config.ts", test: "npm run test:integration", desc: "Eliminar flakiness por concorrência de banco no GitHub Actions." },
      { id: 80, title: "Otimizar code-splitting no Vite mantendo bundle compactado abaixo de 2.5 MB", agent: "16 — Runtime, Workers e Escala", slug: "16-runtime-workers-escala", p: "P1", status: "PLANEJADO", files: "vite.config.ts", test: "npm run check:bundle-budget", desc: "Separar bibliotecas pesadas (Three.js, Lucide, Framer Motion) em chunks dinâmicos." },
      { id: 81, title: "Configurar compressão Brotli e políticas granulares de cache no Nginx", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P2", status: "PLANEJADO", files: "nginx/nginx.conf", test: "nginx -t -c nginx/nginx.conf", desc: "Reduzir tempo de carregamento de assets estáticos e tempo até primeiro byte (TTFB)." },
      { id: 82, title: "Executar teste de carga k6 garantindo latência p95 < 200ms em pico", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P2", status: "PLANEJADO", files: "tests/load/k6-ai-voice-stress.js", test: "npm run load:k6:ai-voice", desc: "Comprovar estabilidade de rotas críticas de telemetria e IA sob 500 chamadas simultâneas." },
      { id: 83, title: "Validar workflow Central Birth Hub 360 Release (.github/workflows/production.yaml)", agent: "08 — QA e Release", slug: "08-qa-release", p: "P0", status: "PLANEJADO", files: ".github/workflows/production.yaml", test: "gh workflow view 'Central Birth Hub 360 Release'", desc: "Garantir execução paralela e fail-fast de lint, types, arquitetura, testes e secret scan." },
      { id: 84, title: "Parecer formal do Agente 24 liberando o Quality Gate Central 100% verde", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", status: "PLANEJADO", files: ".agents/reviews/24-parecer-onda-07-gates-performance.md", test: "test -f .agents/reviews/24-parecer-onda-07-gates-performance.md", desc: "Certificar que todos os 10 quality gates automatizados passam com código de retorno zero." }
    ]
  },
  {
    wave: 8,
    title: "Onda 8: Homologação Comercial, Decisão LOCAL-FIRST vs AWS e Go-Live",
    start: 85,
    items: [
      { id: 85, title: "Concluir inventário ROPA e fluxo automatizado de direitos do titular (DSR)", agent: "21 — Privacidade e LGPD", slug: "21-privacidade-lgpd", p: "P0", status: "PLANEJADO", files: "docs/lgpd/INVENTARIO_TRATAMENTO_ROPA.md, src/shared/services/dataSubjectErasure.service.ts", test: "npm run test:unit -- tests/unit/security/dataSubjectErasure.unit.test.ts", desc: "Comprovar capacidade técnica de exportação e esquecimento de titular em conformidade com a LGPD." },
      { id: 86, title: "Validar jornada de ponta a ponta com o End-to-End Flow Validator", agent: "22 — Verificação de Realidade", slug: "22-verificacao-realidade", p: "P0", status: "PLANEJADO", files: "tests/e2e/completeCustomerJourney.e2e.test.ts", test: "npm run test:e2e", desc: "Verificar jornada completa: Prospecção -> Enriquecimento -> Cadência -> Reunião -> Fechamento." },
      { id: 87, title: "Decisão Arquitetural Formal: Manter LOCAL-FIRST vs Migrar para AWS", agent: "00 — Coordenador", slug: "00-coordenador", p: "P0", status: "GATE ARQUITETURAL", files: "docs/architecture/ADR-009-LOCAL-FIRST-OU-AWS.md", test: "test -f docs/architecture/ADR-009-LOCAL-FIRST-OU-AWS.md", desc: "Registrar a decisão executiva: operar em infraestrutura local controlada (conforme production.yaml) ou migrar para AWS ECS/RDS." },
      { id: 88, title: "Configuração do ambiente de produção aprovado (Local Container ou AWS Cloud)", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P1", status: "PLANEJADO", files: "docker-compose.yml, infrastructure/*", test: "docker compose config", desc: "Provisionar infraestrutura com alta disponibilidade, SSL/TLS e backups automatizados." },
      { id: 89, title: "Executar ensaio de deploy (deploy rehearsal) em ambiente espelho com migrações", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", status: "PLANEJADO", files: "scripts/deploy/staging-rehearsal.sh", test: "bash scripts/deploy/staging-rehearsal.sh --dry-run", desc: "Simular o deploy de produção garantindo aplicação limpa de migrações e zero downtime." },
      { id: 90, title: "Emissão do Selo de Prontidão Go-Live, corte da tag v1.0.0 e push final", agent: "00 — Coordenador", slug: "00-coordenador", p: "P0", status: "PLANEJADO", files: ".agents/reviews/24-selo-prontidao-go-live-v1.0.0.md", test: "git tag -v v1.0.0-release", desc: "Concluir a ativação oficial da plataforma comercial Birth Hub 360° para operação de mercado." },
      // Steps 91 to 100: Operational readiness and post-launch verification
      { id: 91, title: "Configurar monitoramento de erros em tempo real (Sentry/OpenTelemetry) em produção", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P1", status: "PLANEJADO", files: "src/lib/observability/telemetry.ts", test: "npm run test:unit -- tests/unit/observability/telemetry.test.ts", desc: "Capturar exceções não tratadas e tracing distribuído em chamadas de API." },
      { id: 92, title: "Validar rotina diária de backup criptografado do banco de dados PostgreSQL", agent: "01A — Confiabilidade de Dados, RLS e Retenção", slug: "01a-confiabilidade-dados-rls", p: "P0", status: "PLANEJADO", files: "scripts/db/backup-encrypted.sh", test: "bash scripts/db/backup-encrypted.sh --dry-run", desc: "Garantir backup automatizado com chave AES-256 e teste de restauração periódica." },
      { id: 93, title: "Executar simulação de Disaster Recovery e restauração de dados a quente", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P1", status: "PLANEJADO", files: "docs/ops/DISASTER_RECOVERY_PLAYBOOK.md", test: "test -f docs/ops/DISASTER_RECOVERY_PLAYBOOK.md", desc: "Medir RTO (< 15 minutos) e RPO (< 1 minuto) em simulação de corrupção ou queda de storage." },
      { id: 94, title: "Configurar painel de alertas do Prometheus e Grafana para latência de IA e filas", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P2", status: "PLANEJADO", files: "monitoring/grafana/dashboards/*.json", test: "test -d monitoring/grafana", desc: "Alertas no Slack/WhatsApp para latência de gateway > 2s ou backlog de outbox > 500." },
      { id: 95, title: "Homologar portal de transparência e atendimento ao titular LGPD", agent: "21 — Privacidade e LGPD", slug: "21-privacidade-lgpd", p: "P1", status: "PLANEJADO", files: "src/features/privacy/PrivacyPortal.tsx", test: "npm run test:unit -- tests/unit/privacy/privacyPortal.test.ts", desc: "Disponibilizar interface amigável para titulares solicitarem consulta ou exclusão de dados." },
      { id: 96, title: "Publicar manual operacional e termos de uso comercial da plataforma", agent: "11 — Marca e Ativos Institucionais", slug: "11-marca-ativos", p: "P2", status: "PLANEJADO", files: "docs/manual/MANUAL_OPERACIONAL_2026.md", test: "test -f docs/manual/MANUAL_OPERACIONAL_2026.md", desc: "Guia de uso de IA responsável para equipes de vendas e clientes institucionais." },
      { id: 97, title: "Executar varredura final de segredos no diff acumulado da branch main", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P0", status: "PLANEJADO", files: "scripts/security/secret-scan-diff.sh", test: "bash scripts/security/secret-scan-diff.sh origin/main", desc: "Varredura automatizada com Gitleaks garantindo 0 chaves ou tokens expostos no histórico." },
      { id: 98, title: "Auditoria de custos e limites de quotas dos provedores de IA (FinOps)", agent: "23 — Custo, Performance e Limites de IA", slug: "23-custo-performance-ia", p: "P2", status: "PLANEJADO", files: "docs/finops/RELATORIO_FINOPS_LANCAMENTO.md", test: "test -f docs/finops/RELATORIO_FINOPS_LANCAMENTO.md", desc: "Modelar projeção de custo de tokens por usuário ativo para precificação sustentável." },
      { id: 99, title: "Verificação de realidade final pelo Agente 22 em ambiente de staging", agent: "22 — Verificação de Realidade", slug: "22-verificacao-realidade", p: "P0", status: "PLANEJADO", files: ".agents/reviews/22-verificacao-realidade-final.md", test: "test -f .agents/reviews/22-verificacao-realidade-final.md", desc: "Comprovar que todas as ações de UI persistem e não há comportamento simulado." },
      { id: 100, title: "Assinatura do Certificado de Auditoria e Liberação para Clientes Piloto", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", status: "PLANEJADO", files: ".agents/reviews/24-CERTIFICADO-GO-LIVE-PRODUCAO.md", test: "test -f .agents/reviews/24-CERTIFICADO-GO-LIVE-PRODUCAO.md", desc: "Parecer final irrevogável autorizando a comercialização da plataforma Birth Hub 360°." }
    ]
  }
];

// Populate steps 11 to 100 with strict AGENTS.md compliant prompts
for (const w of postReconWaves) {
  for (const item of w.items) {
    steps.push({
      id: item.id,
      wave: w.wave,
      waveTitle: `Onda ${w.wave}: ${w.title}`,
      title: item.title,
      agent: item.agent,
      agentSlug: item.slug,
      priority: item.p,
      status: item.status,
      githubPr: item.githubPr || null,
      desc: item.desc,
      files: item.files,
      criteria: item.test,
      prompt: `Você é o ${item.agent.split('—')[0].trim()}. Leia AGENTS.md e .agents/prompts/${item.slug}.md antes de planejar.

Agente: ${item.agent}
Onda: ${w.wave}
Base: origin/main
Branch: agente/${item.slug}-passo-${String(item.id).padStart(3, '0')}

Objetivo:
${item.title}.

Fora de escopo:
Alterações fora dos arquivos sob sua propriedade estrita ou modificações não relacionadas à meta deste passo.

Arquivos sob propriedade:
${item.files.split(',').map(f => `- ${f.trim()}`).join('\n')}

Arquivos de outros donos:
- docs/openapi.yaml (Agente 18)
- prisma/schema.prisma (Agente 01)

Suposições:
- Os quality gates da onda anterior foram homologados e aprovados pelo Agente 24.
- As dependências externas utilizam stubs em ambiente local de teste.

Plano:
1. Analisar código existente e identificar pontos de intervenção cirúrgica → verificar: ausência de quebras.
2. Implementar a alteração necessária com o mínimo de código exigido → verificar: typecheck verde.
3. Executar o comando de teste específico da área → verificar: ${item.test}.

Critério de sucesso final:
${item.test} executado com código 0 e sem regressões de segurança ou tenancy.

Entrega:
Relatório de conclusão em formato canônico e diff auditável pronto para revisão do Agente 24.`
    });
  }
}

// Calculate priority distribution
const countP0 = steps.filter(s => s.priority === 'P0').length;
const countP1 = steps.filter(s => s.priority === 'P1').length;
const countP2 = steps.filter(s => s.priority === 'P2').length;

console.log('--- DISTRIBUIÇÃO CALIBRADA ---');
console.log(`P0 (Crítico / Bloqueador): ${countP0} (${Math.round((countP0/steps.length)*100)}%)`);
console.log(`P1 (Alto / Core Operacional): ${countP1} (${Math.round((countP1/steps.length)*100)}%)`);
console.log(`P2 (Médio / Otimização & Escala): ${countP2} (${Math.round((countP2/steps.length)*100)}%)`);
console.log(`Total: ${steps.length} passos`);

// Generate HTML Content
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plano Mestre de Execução e Homologação — Birth Hub 360°</title>
  <style>
    :root {
      --bg: #070a12;
      --card-bg: #0d1322;
      --card-border: #1a243a;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --brand: #00d4ff;
      --brand-glow: rgba(0, 212, 255, 0.25);
      --violet: #c084fc;
      --emerald: #34d399;
      --amber: #fbbf24;
      --rose: #fb7185;
      --blue: #60a5fa;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: var(--font-sans);
      line-height: 1.5;
      padding: 24px;
    }

    .container {
      max-width: 1440px;
      margin: 0 auto;
    }

    header {
      background: linear-gradient(135deg, rgba(13, 19, 34, 0.98), rgba(26, 36, 58, 0.8));
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 36px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    }

    header::after {
      content: '';
      position: absolute;
      top: -40%;
      right: -10%;
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, var(--brand-glow), transparent 70%);
      pointer-events: none;
    }

    .badge-header {
      display: inline-block;
      background: rgba(0, 212, 255, 0.12);
      color: var(--brand);
      border: 1px solid rgba(0, 212, 255, 0.3);
      padding: 4px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    h1 {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    h1 span {
      background: linear-gradient(90deg, #00d4ff, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    p.subtitle {
      color: var(--text-muted);
      font-size: 15px;
      max-width: 950px;
      margin-bottom: 24px;
    }

    /* Calibrated Distribution Banner */
    .priority-banner {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      padding: 18px;
      border-radius: 12px;
    }

    .prio-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .prio-badge {
      font-size: 12px;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 6px;
      min-width: 65px;
      text-align: center;
      letter-spacing: 0.05em;
    }

    .prio-info strong {
      color: var(--text-main);
      display: block;
      font-size: 14px;
    }

    .prio-info span {
      color: var(--text-muted);
      font-size: 12px;
    }

    /* Strategic Decision Alert */
    .alert-decision {
      background: rgba(251, 191, 36, 0.08);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-left: 4px solid var(--amber);
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 13.5px;
      color: #fef3c7;
    }

    .alert-decision strong {
      color: var(--amber);
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .stat-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
    }

    .stat-card .label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .stat-card .value {
      font-size: 26px;
      font-weight: 800;
      color: var(--text-main);
      margin-top: 4px;
    }

    .progress-bar-container {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      border-radius: 999px;
      height: 12px;
      overflow: hidden;
      margin-top: 24px;
    }

    .progress-bar-fill {
      background: linear-gradient(90deg, var(--brand), var(--emerald));
      height: 100%;
      width: 0%;
      transition: width 0.4s ease;
      box-shadow: 0 0 14px var(--brand-glow);
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 8px;
      font-weight: 600;
    }

    /* Controls */
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 24px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 16px;
      border-radius: 12px;
      align-items: center;
    }

    .search-input {
      flex: 1;
      min-width: 250px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text-main);
      font-size: 14px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--brand);
      box-shadow: 0 0 0 2px var(--brand-glow);
    }

    .filter-select {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text-main);
      font-size: 14px;
      outline: none;
      cursor: pointer;
    }

    .btn {
      background: var(--brand);
      color: #070a12;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      border: 1px solid var(--card-border);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    /* Wave section */
    .wave-group {
      margin-bottom: 32px;
    }

    .wave-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(90deg, rgba(26, 36, 58, 0.8), rgba(13, 19, 34, 0.6));
      border-left: 4px solid var(--brand);
      border-top: 1px solid var(--card-border);
      border-right: 1px solid var(--card-border);
      border-bottom: 1px solid var(--card-border);
      padding: 14px 20px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .wave-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .wave-badge {
      font-size: 12px;
      background: rgba(0, 212, 255, 0.15);
      color: var(--brand);
      padding: 2px 8px;
      border-radius: 999px;
    }

    /* Step Card */
    .step-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 14px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .step-card:hover {
      border-color: rgba(0, 212, 255, 0.4);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
    }

    .step-card.completed {
      background: rgba(52, 211, 153, 0.04);
      border-color: rgba(52, 211, 153, 0.3);
    }

    .step-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .checkbox-wrapper {
      margin-top: 4px;
    }

    .custom-checkbox {
      width: 20px;
      height: 20px;
      accent-color: var(--emerald);
      cursor: pointer;
    }

    .step-content {
      flex: 1;
    }

    .step-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .step-id {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      color: var(--brand);
      background: rgba(0, 212, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .step-priority {
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .priority-p0 {
      background: rgba(251, 113, 133, 0.15);
      color: var(--rose);
      border: 1px solid rgba(251, 113, 133, 0.3);
    }

    .priority-p1 {
      background: rgba(251, 191, 36, 0.15);
      color: var(--amber);
      border: 1px solid rgba(251, 191, 36, 0.3);
    }

    .priority-p2 {
      background: rgba(192, 132, 252, 0.15);
      color: var(--violet);
      border: 1px solid rgba(192, 132, 252, 0.3);
    }

    .step-status {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(96, 165, 250, 0.15);
      color: var(--blue);
      border: 1px solid rgba(96, 165, 250, 0.3);
    }

    .step-status.integrated {
      background: rgba(52, 211, 153, 0.15);
      color: var(--emerald);
      border-color: rgba(52, 211, 153, 0.3);
    }

    .step-status.conflict {
      background: rgba(251, 113, 133, 0.15);
      color: var(--rose);
      border-color: rgba(251, 113, 133, 0.3);
    }

    .step-agent {
      font-size: 12px;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }

    .step-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 8px;
    }

    .step-desc {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 14px;
    }

    .step-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 12px;
      margin-bottom: 14px;
    }

    .meta-item strong {
      color: var(--brand);
      display: block;
      margin-bottom: 2px;
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .meta-item code {
      font-family: var(--font-mono);
      color: #e2e8f0;
      word-break: break-all;
    }

    .meta-item a {
      color: var(--brand);
      text-decoration: underline;
    }

    .prompt-box {
      margin-top: 12px;
      display: none;
      background: #050811;
      border: 1px solid #1a243a;
      border-radius: 8px;
      padding: 16px;
    }

    .prompt-box.open {
      display: block;
    }

    .prompt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .prompt-text {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.6;
      max-height: 380px;
      overflow-y: auto;
      padding-right: 8px;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    footer {
      text-align: center;
      margin-top: 48px;
      padding: 24px;
      color: var(--text-muted);
      font-size: 13px;
      border-top: 1px solid var(--card-border);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge-header">Plano Mestre de Execução e Homologação — 100 Passos</div>
      <h1>Engenharia & Go-Live: <span>Birth Hub 360°</span></h1>
      <p class="subtitle">
        Roadmap canônico de 9 ondas estratégicas ancorado no estado real do GitHub (Pull Requests #15 a #41), com reconciliação forense, eliminação de estados voláteis, modelos canônicos e prompts 100% aderentes ao formato de missão do AGENTS.md.
      </p>

      <!-- Pirâmide de Prioridades Calibrada -->
      <div class="priority-banner">
        <div class="prio-item">
          <div class="prio-badge priority-p0">P0: ${countP0}</div>
          <div class="prio-info">
            <strong>Crítico / Bloqueador (${Math.round((countP0/steps.length)*100)}%)</strong>
            <span>Corrupção de banco, RLS, DDL/DML, boot fatal, gates bloqueantes e aprovações do 24.</span>
          </div>
        </div>
        <div class="prio-item">
          <div class="prio-badge priority-p1">P1: ${countP1}</div>
          <div class="prio-info">
            <strong>Alto / Core Operacional (${Math.round((countP1/steps.length)*100)}%)</strong>
            <span>Persistência real Postgres, outbox relay, conectores Bitrix/Twilio/WhatsApp e WCAG AA.</span>
          </div>
        </div>
        <div class="prio-item">
          <div class="prio-badge priority-p2">P2: ${countP2}</div>
          <div class="prio-info">
            <strong>Médio / Refinamento & Escala (${Math.round((countP2/steps.length)*100)}%)</strong>
            <span>Simulações What-If, tuning de rede/Brotli, testes de estresse k6 e docs Storybook.</span>
          </div>
        </div>
      </div>

      <!-- Alerta de Decisão Estratégica -->
      <div class="alert-decision">
        <strong>⚠️ DECISÃO ARQUITETURAL EM ABERTO: ESTRATÉGIA LOCAL-FIRST vs AWS CLOUD</strong>
        O repositório declara em <code>.github/workflows/production.yaml</code> uma estratégia <strong>LOCAL-FIRST</strong>, com liberação de produção condicionada a disparo manual e aprovação de CI para o SHA exato. O provisionamento de infraestrutura gerenciada AWS (ECS, RDS Multi-AZ, ALB) foi posicionado na <strong>Onda 8</strong> como um gate decisório explícito (Passo #087 — ADR-009).
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">Total de Passos</div>
          <div class="value">100</div>
        </div>
        <div class="stat-card">
          <div class="label">Ondas de Execução</div>
          <div class="value">9 (0 a 8)</div>
        </div>
        <div class="stat-card">
          <div class="label">PRs GitHub Mapeados</div>
          <div class="value">17 Abertos / 9 Mergeados</div>
        </div>
        <div class="stat-card">
          <div class="label">Passos Concluídos</div>
          <div class="value" id="completed-count">0</div>
        </div>
        <div class="stat-card">
          <div class="label">Progresso Geral</div>
          <div class="value" id="progress-percent">0%</div>
        </div>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar-fill" id="progress-bar-fill"></div>
      </div>
      <div class="progress-label">
        <span id="progress-text">0 de 100 passos concluídos</span>
        <span>Meta: 100% Homologado em Produção</span>
      </div>
    </header>

    <div class="controls">
      <input type="text" id="search-input" class="search-input" placeholder="🔍 Buscar por passo, PR, arquivo, comando ou agente...">
      
      <select id="wave-filter" class="filter-select">
        <option value="all">Todas as Ondas (0 a 8)</option>
        <option value="0">Onda 0: Reconciliação dos PRs Abertos</option>
        <option value="1">Onda 1: Consolidação de Banco & RLS</option>
        <option value="2">Onda 2: Hardening & Transações</option>
        <option value="3">Onda 3: Persistência Real de Domínio</option>
        <option value="4">Onda 4: Revenue Oracle & Predição</option>
        <option value="5">Onda 5: Conectores & Gateways</option>
        <option value="6">Onda 6: Design System & A11y</option>
        <option value="7">Onda 7: Performance & CI Gates</option>
        <option value="8">Onda 8: Homologação & Go-Live</option>
      </select>

      <select id="priority-filter" class="filter-select">
        <option value="all">Todas as Prioridades</option>
        <option value="P0">Prioridade P0 (${countP0} Bloqueadores)</option>
        <option value="P1">Prioridade P1 (${countP1} Altos)</option>
        <option value="P2">Prioridade P2 (${countP2} Médios)</option>
      </select>

      <button class="btn btn-secondary" onclick="exportProgress()">📥 Exportar Progresso</button>
      <button class="btn btn-secondary" onclick="resetProgress()">🔄 Resetar Checklist</button>
    </div>

    <div id="steps-container">
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(wNum => {
        const wSteps = steps.filter(s => s.wave === wNum);
        const wTitle = wSteps[0]?.waveTitle || `Onda ${wNum}`;
        return `
        <div class="wave-group" data-wave="${wNum}">
          <div class="wave-header">
            <div class="wave-title">
              <span>${wTitle}</span>
              <span class="wave-badge">${wSteps.length} Passos</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="copyWavePrompts(${wNum})">📋 Copiar Todos os Prompts da Onda ${wNum}</button>
          </div>
          <div class="wave-steps">
            ${wSteps.map(s => {
              const statusStr = s.status || 'PLANEJADO';
              const statusClass = statusStr.includes('INTEGRADO') ? 'integrated' : (statusStr.includes('CONFLITO') ? 'conflict' : '');
              return `
              <div class="step-card" id="step-${s.id}" data-step="${s.id}" data-wave="${s.wave}" data-priority="${s.priority}" data-agent="${s.agent}">
                <div class="step-header">
                  <div class="checkbox-wrapper">
                    <input type="checkbox" class="custom-checkbox" id="chk-${s.id}" onchange="toggleStep(${s.id})">
                  </div>
                  <div class="step-content">
                    <div class="step-top">
                      <span class="step-id">PASSO #${String(s.id).padStart(3, '0')}</span>
                      <span class="step-priority priority-${s.priority.toLowerCase()}">${s.priority}</span>
                      <span class="step-status ${statusClass}">${statusStr}</span>
                      <span class="step-agent">${s.agent}</span>
                    </div>
                    <div class="step-title">${s.title}</div>
                    <div class="step-desc">${s.desc}</div>
                    
                    <div class="step-meta">
                      <div class="meta-item">
                        <strong>ARQUIVOS ENVOLVIDOS:</strong>
                        <code>${s.files}</code>
                      </div>
                      <div class="meta-item">
                        <strong>CRITÉRIO DE ACEITE / TESTE:</strong>
                        <code>${s.criteria}</code>
                      </div>
                      ${s.githubPr ? `
                      <div class="meta-item">
                        <strong>REFERÊNCIA GITHUB:</strong>
                        <a href="https://github.com/MarksNN/Birthub-360/pull/${s.githubPr}" target="_blank">Pull Request #${s.githubPr} no GitHub ↗</a>
                      </div>
                      ` : ''}
                    </div>

                    <div class="actions">
                      <button class="btn btn-secondary btn-sm" onclick="togglePrompt(${s.id})">👁️ Ver Prompt do Agente</button>
                      <button class="btn btn-sm" onclick="copyPrompt(${s.id})">📋 Copiar Prompt Canônico</button>
                    </div>

                    <div class="prompt-box" id="prompt-box-${s.id}">
                      <div class="prompt-header">
                        <span>PROMPT CANÔNICO CONFORME AGENTS.MD (SEÇÃO 11)</span>
                        <button class="btn btn-secondary btn-sm" onclick="copyPrompt(${s.id})">Copiar</button>
                      </div>
                      <div class="prompt-text" id="prompt-text-${s.id}">${s.prompt}</div>
                    </div>
                  </div>
                </div>
              </div>
              `;
            }).join('')}
          </div>
        </div>
        `;
      }).join('')}
    </div>

    <footer>
      Birth Hub 360° — Plataforma de Inteligência Comercial e Autonomia SDR | Gerado em 21/10/2026<br>
      Plano Mestre de Homologação em conformidade com as regras globais <code>AGENTS.md</code> e governança de releases.
    </footer>
  </div>

  <script>
    const totalSteps = 100;
    const STORAGE_KEY = 'birthhub360_master_plan_progress';

    function loadProgress() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const completed = JSON.parse(saved);
          completed.forEach(id => {
            const chk = document.getElementById('chk-' + id);
            const card = document.getElementById('step-' + id);
            if (chk) chk.checked = true;
            if (card) card.classList.add('completed');
          });
        } catch (e) {
          console.error(e);
        }
      }
      updateStats();
    }

    function toggleStep(id) {
      const chk = document.getElementById('chk-' + id);
      const card = document.getElementById('step-' + id);
      if (chk.checked) {
        card.classList.add('completed');
      } else {
        card.classList.remove('completed');
      }
      saveProgress();
      updateStats();
    }

    function saveProgress() {
      const completed = [];
      document.querySelectorAll('.custom-checkbox:checked').forEach(chk => {
        const id = parseInt(chk.id.replace('chk-', ''));
        completed.push(id);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    }

    function updateStats() {
      const completedCount = document.querySelectorAll('.custom-checkbox:checked').length;
      const percent = Math.round((completedCount / totalSteps) * 100);

      document.getElementById('completed-count').innerText = completedCount;
      document.getElementById('progress-percent').innerText = percent + '%';
      document.getElementById('progress-bar-fill').style.width = percent + '%';
      document.getElementById('progress-text').innerText = completedCount + ' de ' + totalSteps + ' passos concluídos';
    }

    function togglePrompt(id) {
      const box = document.getElementById('prompt-box-' + id);
      box.classList.toggle('open');
    }

    function copyPrompt(id) {
      const text = document.getElementById('prompt-text-' + id).innerText;
      navigator.clipboard.writeText(text).then(() => {
        alert('Prompt do Passo #' + id + ' copiado com sucesso no formato canônico do AGENTS.md!');
      });
    }

    function copyWavePrompts(waveNum) {
      const waveEl = document.querySelector('.wave-group[data-wave="' + waveNum + '"]');
      const prompts = [];
      waveEl.querySelectorAll('.prompt-text').forEach(pt => {
        prompts.push(pt.innerText);
      });
      const fullText = prompts.join('\\n\\n========================================\\n\\n');
      navigator.clipboard.writeText(fullText).then(() => {
        alert('Todos os ' + prompts.length + ' prompts da Onda ' + waveNum + ' foram copiados para a área de transferência!');
      });
    }

    function resetProgress() {
      if (confirm('Tem certeza que deseja resetar todo o progresso do checklist?')) {
        localStorage.removeItem(STORAGE_KEY);
        document.querySelectorAll('.custom-checkbox').forEach(chk => chk.checked = false);
        document.querySelectorAll('.step-card').forEach(card => card.classList.remove('completed'));
        updateStats();
      }
    }

    function exportProgress() {
      const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const data = {
        project: 'Birth Hub 360',
        exportedAt: new Date().toISOString(),
        totalSteps: 100,
        completedSteps: completed.length,
        percent: Math.round((completed.length / 100) * 100),
        completedIds: completed
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'birthhub360-master-plan-progresso-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
    }

    // Filter and search
    const searchInput = document.getElementById('search-input');
    const waveFilter = document.getElementById('wave-filter');
    const priorityFilter = document.getElementById('priority-filter');

    function applyFilters() {
      const query = searchInput.value.toLowerCase();
      const wave = waveFilter.value;
      const prio = priorityFilter.value;

      document.querySelectorAll('.step-card').forEach(card => {
        const text = card.innerText.toLowerCase();
        const cardWave = card.getAttribute('data-wave');
        const cardPrio = card.getAttribute('data-priority');

        const matchQuery = !query || text.includes(query);
        const matchWave = wave === 'all' || cardWave === wave;
        const matchPrio = prio === 'all' || cardPrio === prio;

        if (matchQuery && matchWave && matchPrio) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });

      document.querySelectorAll('.wave-group').forEach(group => {
        const allSteps = group.querySelectorAll('.step-card');
        const anyVisible = Array.from(allSteps).some(s => s.style.display !== 'none');
        group.style.display = anyVisible ? 'block' : 'none';
      });
    }

    searchInput.addEventListener('input', applyFilters);
    waveFilter.addEventListener('change', applyFilters);
    priorityFilter.addEventListener('change', applyFilters);

    window.addEventListener('DOMContentLoaded', loadProgress);
  </script>
</body>
</html>
`;

// Destination paths
const gDriveDest = 'G:\\Meu Drive\\Birthub 360\\PLANO-100-PASSOS-BIRTHUB360.html';
const localDest = 'C:\\Github\\Birthub-360\\.agents\\plans\\PLANO-100-PASSOS-BIRTHUB360.html';

fs.writeFileSync(localDest, html, 'utf-8');
console.log('Saved local copy to:', localDest);

try {
  fs.writeFileSync(gDriveDest, html, 'utf-8');
  console.log('Saved Google Drive copy to:', gDriveDest);
} catch (err) {
  console.error('Error saving to G Drive:', err);
}
