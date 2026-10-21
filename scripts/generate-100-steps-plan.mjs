import fs from 'node:fs';
import path from 'node:path';

const steps = [
  // --- ONDA 1: Saneamento de Schema, RLS e Fila de PRs (Passos 1 a 15) ---
  {
    id: 1,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Reconciliar tabela RebalanceApproval no schema.prisma com UNIQUE composta",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    desc: "Adicionar o model RebalanceApproval no schema.prisma com restrição @@unique([organizationId, recommendationId]), garantindo chave composta para prevenir duplicação de aprovações concorrentes para uma mesma recomendação por organização.",
    files: "prisma/schema.prisma, prisma/migrations/*",
    criteria: "npx prisma validate && npx prisma migrate status",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Agente: 01 — Plataforma, Segurança e Dados
Onda: 1
Base: main
Branch: agente/01-rebalance-approval-schema

Objetivo:
Reconciliar o model RebalanceApproval no schema.prisma garantindo unique composta (organizationId, recommendationId) e campos seguros para conformidade LGPD.

Fora de escopo:
Alterar regras de negócio no frontend ou serviços de outros agentes.

Arquivos sob propriedade:
- prisma/schema.prisma
- prisma/migrations/**

Arquivos de outros donos:
- src/features/commercial-intelligence/services/rebalanceApproval.service.ts (leitura de contrato)

Suposições:
- A recommendationId é gerada deterministicamente pelo motor de oráculo e é única por execução de rebalanceamento.

Plano:
1. Declarar o model RebalanceApproval com campos: id, organizationId, recommendationId, leadId, fromOwner, toOwner, decidedBy, decision, noteLength, noteHash, createdAt, updatedAt.
2. Definir @@unique([organizationId, recommendationId]) e @@index([organizationId, decidedAt]).
3. Gerar a migração com npx prisma migrate dev --create-only.

Critério de sucesso final:
npx prisma validate passa com zero erros e npx tsc --noEmit passa verde.

Entrega:
Relatório de conclusão e diff sanitizado.`
  },
  {
    id: 2,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Adequar campos de notas da RebalanceApproval à política de privacidade LGPD",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    desc: "Em vez de armazenar texto livre de justificativa de aprovação (campo 'note' que exige rotina complexa de anonimização de PII), adotar noteLength INT e noteHash CHAR(64) gerado via HMAC SHA-256 por organização, mantendo integridade criptográfica sem armazenar dados sensíveis de texto aberto.",
    files: "prisma/schema.prisma, src/shared/contracts/rebalanceApproval.contract.ts",
    criteria: "npm run test:unit -- tests/unit/commercial-intelligence/rebalanceApproval.routes.test.ts",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Agente: 01 — Plataforma, Segurança e Dados
Onda: 1
Base: main
Branch: agente/01-rebalance-approval-lgpd-align

Objetivo:
Substituir a coluna note de texto aberto por noteLength e noteHash no schema de RebalanceApproval conforme determinação da auditoria do Agente 24.

Fora de escopo:
Modificar controllers de outras áreas de produto.

Arquivos sob propriedade:
- prisma/schema.prisma
- prisma/migrations/**

Arquivos de outros donos:
- src/shared/contracts/predictiveRevenueOraclePorts.contract.ts

Plano:
1. Modificar schema.prisma trocando note String? por noteLength Int? e noteHash String? (@db.VarChar(64)).
2. Criar migration SQL com constraints CHECK (noteLength >= 0 AND noteLength <= 280) e regex de hash hex.
3. Validar sintaxe Prisma.

Critério de sucesso final:
npx prisma validate && npm run test:architecture`
  },
  {
    id: 3,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Calibrar contagem de tabelas com RLS na suíte de integração rls-coverage",
    agent: "01A — Confiabilidade de Dados, RLS e Retenção",
    agentSlug: "01a-confiabilidade-dados-rls",
    priority: "P0",
    desc: "Atualizar os testes de cobertura de Row Level Security (rls-coverage.test.ts e rls-coverage.unit.test.ts) ajustando o contador esperado de tabelas protegidas de 129 para o número correto após adição de novas tabelas de banco, evitando quebra no gate de integração.",
    files: "tests/integration/rls-coverage.test.ts, tests/unit/rls-coverage.unit.test.ts",
    criteria: "npm run test:integration -- tests/integration/rls-coverage.test.ts",
    prompt: `Você é o Agente 01A. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Agente: 01A — Confiabilidade de Dados, RLS e Retenção
Onda: 1
Base: main
Branch: agente/01a-rls-table-count-calibrate

Objetivo:
Atualizar a asserção de total de tabelas com RLS em tests/integration/rls-coverage.test.ts garantindo que novas tabelas registradas tenham RLS ativo e passem na validação.

Arquivos sob propriedade:
- tests/integration/rls-coverage.test.ts
- tests/unit/rls-coverage.unit.test.ts

Critério de sucesso final:
npm run test:integration -- tests/integration/rls-coverage.test.ts passa com código 0.`
  },
  {
    id: 4,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Implementar DDL de migração com RLS FORCE e policies tenant_isolation",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    desc: "Garantir que a migration SQL do RebalanceApproval inclua ALTER TABLE ... ENABLE ROW LEVEL SECURITY e ALTER TABLE ... FORCE ROW LEVEL SECURITY, com policy baseada estritamente em organizationId = current_setting('app.current_tenant_id', true) sem cláusula de bypass.",
    files: "prisma/migrations/*_rebalance_approval/migration.sql",
    criteria: "grep -i 'FORCE ROW LEVEL SECURITY' prisma/migrations/*_rebalance_approval/migration.sql",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Agente: 01 — Plataforma, Segurança e Dados
Onda: 1
Base: main
Branch: agente/01-migration-rls-force

Objetivo:
Garantir que a migration SQL do RebalanceApproval aplique ENABLE e FORCE ROW LEVEL SECURITY sem vulnerabilidades.

Arquivos sob propriedade:
- prisma/migrations/**/migration.sql

Critério de sucesso final:
Validação de RLS em PostgreSQL passa com FORCE ativo e policy restritiva.`
  },
  {
    id: 5,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Criar stored procedures de expurgo seguro com SECURITY INVOKER e search_path",
    agent: "01A — Confiabilidade de Dados, RLS e Retenção",
    agentSlug: "01a-confiabilidade-dados-rls",
    priority: "P1",
    desc: "Escrever rotinas SQL rebalance_approval_purge com guard clauses estritas (p_org IS NULL OR '' OR IS DISTINCT FROM current_setting), search_path travado em pg_catalog, public e SECURITY INVOKER para garantir execução somente dentro do contexto do tenant solicitante.",
    files: "prisma/migrations/*_rebalance_approval/migration.sql, scripts/db/purge-procedures.sql",
    criteria: "grep -i 'SECURITY INVOKER' scripts/db/purge-procedures.sql",
    prompt: `Você é o Agente 01A. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Criar e homologar procedure de expurgo seguro de registros de aprovação com isolamento multitenant.

Arquivos sob propriedade:
- scripts/db/purge-procedures.sql
- prisma/migrations/**

Critério de sucesso final:
Testes de injeção de tenant em procedure de expurgo falham conforme esperado (rejeição segura).`
  },
  {
    id: 6,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Zerar deriva de schema.prisma versus histórico de migrations (DATA-007 / PR #28)",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    desc: "Reconciliar diferenças acumuladas entre as definições em prisma/schema.prisma e os 140 scripts SQL de migração legados, gerando migração de reconciliação canônica e eliminando drift detectado em ambientes de CI.",
    files: "prisma/schema.prisma, prisma/migrations/*",
    criteria: "npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations prisma/migrations --exit-code",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Zerar completamente qualquer drift existente entre prisma/schema.prisma e as migrações SQL (DATA-007).

Critério de sucesso final:
npx prisma migrate diff com exit-code zero indicando equivalência exata.`
  },
  {
    id: 7,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Modelar tabelas de Transactional Outbox e IdempotencyKey no Prisma (PR #34)",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    desc: "Declarar models TransactionalOutbox e IdempotencyKey com organizationId, payload JSONB, status (PENDING, PROCESSED, FAILED), tentativas de envio, backoff e trava distribuída para suportar mensageria atômica.",
    files: "prisma/schema.prisma, prisma/migrations/*_outbox_schema/migration.sql",
    criteria: "npx prisma validate && npm run test:unit -- tests/unit/queue/outboxSchema.test.ts",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Criar o modelo de outbox transacional no Prisma com isolamento por organização e chave de idempotência.

Arquivos sob propriedade:
- prisma/schema.prisma
- prisma/migrations/**

Critério de sucesso final:
npx prisma validate passa verde e testes de tipagem TypeScript sem erros.`
  },
  {
    id: 8,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Aplicar RLS nas tabelas TransactionalOutbox e IdempotencyKey",
    agent: "01A — Confiabilidade de Dados, RLS e Retenção",
    agentSlug: "01a-confiabilidade-dados-rls",
    priority: "P0",
    desc: "Garantir que as tabelas de outbox e idempotência possuam RLS ENABLE e FORCE ativo com verificação estrita de tenant, impedindo que um worker ou cliente de tenant A leia mensagens pendentes do tenant B.",
    files: "prisma/migrations/*_outbox_schema/migration.sql, tests/integration/rls-coverage.test.ts",
    criteria: "npm run test:integration -- tests/integration/rls-coverage.test.ts",
    prompt: `Você é o Agente 01A. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Aplicar e verificar RLS sobre as novas tabelas de Outbox e IdempotencyKey.

Critério de sucesso final:
Suíte rls-coverage aprovada com contagem de tabelas atualizada e zero falhas de isolamento.`
  },
  {
    id: 9,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Modelar tabela ConsentAuditRecord append-only e schema de expurgo (PR #35)",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    desc: "Modelar a tabela ConsentAuditRecord imutável (append-only, sem permissão de UPDATE no papel prospector_app) e mecanismo de marcação de expurgo para o Commercial Learning Flywheel (REMED-06).",
    files: "prisma/schema.prisma, prisma/migrations/*_consent_audit_schema/migration.sql",
    criteria: "npx prisma validate",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Implementar schema de ConsentAuditRecord append-only com garantias relacionais de imutabilidade.

Critério de sucesso final:
Tentativa de UPDATE na tabela ConsentAuditRecord bloqueada por trigger ou revogação de privilégio SQL.`
  },
  {
    id: 10,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Configurar RLS e testes de isolamento para ConsentAuditRecord",
    agent: "01A — Confiabilidade de Dados, RLS e Retenção",
    agentSlug: "01a-confiabilidade-dados-rls",
    priority: "P0",
    desc: "Ativar RLS FORCE em ConsentAuditRecord e validar isolamento de auditoria de consentimento entre organizações concorrentes, atualizando contador canônico na suíte de testes de integração.",
    files: "tests/integration/rls-coverage.test.ts, prisma/migrations/*_consent_audit_schema/migration.sql",
    criteria: "npm run test:integration -- tests/integration/rls-coverage.test.ts",
    prompt: `Você é o Agente 01A. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Validar isolamento multitenant estrito na tabela ConsentAuditRecord via testes de integração.

Critério de sucesso final:
Testes de cruzamento de tenant comprovam isolamento absoluto de registros de consentimento.`
  },
  {
    id: 11,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Modelar persistência relacional do Grafo de Contas no PostgreSQL (PR #18)",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P1",
    desc: "Substituir a estrutura volátil em memória por tabelas AccountKnowledgeNode e AccountKnowledgeEdge com campos organizationId, nodeId, label, properties (JSONB), sourceId, targetId, weight e RLS ativo.",
    files: "prisma/schema.prisma, prisma/migrations/*_account_graph/migration.sql",
    criteria: "npx prisma validate",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Modelar tabelas relacionais do Grafo de Conhecimento de Contas no schema Prisma com suporte a RLS.

Critério de sucesso final:
Schema validado com integridade referencial em cascata controlada.`
  },
  {
    id: 12,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Modelar persistência relacional da Autópsia Win-Loss no PostgreSQL (PR #18)",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P1",
    desc: "Criar tabela WinLossAutopsyRecord com dealId, organizationId, outcome (WON/LOST), rootCauses (TEXT[]), competitorNames, keyLearnings, sentimentScore e timestamp, eliminando perda de histórico pós-reboot.",
    files: "prisma/schema.prisma, prisma/migrations/*_win_loss_autopsy/migration.sql",
    criteria: "npx prisma validate",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Criar modelo Prisma para Autópsia Win-Loss com tipagem forte e RLS FORCE.

Critério de sucesso final:
Prisma validate verde e migração SQL gerada com RLS policies correspondentes.`
  },
  {
    id: 13,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Consolidar todas as novas tabelas de dados na contagem de RLS (teto canônico final)",
    agent: "01A — Confiabilidade de Dados, RLS e Retenção",
    agentSlug: "01a-confiabilidade-dados-rls",
    priority: "P0",
    desc: "Unificar a contagem de tabelas em rls-coverage (de 129 para o total final pós-migrações da Onda 1), documentando cada tabela e política na matriz de segurança de dados.",
    files: "tests/integration/rls-coverage.test.ts, docs/security/RLS_COVERAGE_MATRIX.md",
    criteria: "npm run test:integration -- tests/integration/rls-coverage.test.ts",
    prompt: `Você é o Agente 01A. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Consolidar a contagem total de tabelas com RLS em tests/integration/rls-coverage.test.ts e atualizar matriz de segurança.

Critério de sucesso final:
Suíte rls-coverage aprovada com código 0 e sem discrepâncias numéricas.`
  },
  {
    id: 14,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Executar migração completa em banco de teste local e validar ordenação determinística",
    agent: "01 — Plataforma, Segurança e Dados",
    agentSlug: "01-plataforma-seguranca-dados",
    priority: "P0",
    desc: "Executar npx prisma migrate deploy contra banco PostgreSQL limpo local ou em container, comprovando que todas as 145 migrações executam sequencialmente sem falhas de foreign key ou sintaxe.",
    files: "prisma/migrations/*",
    criteria: "npx prisma migrate status",
    prompt: `Você é o Agente 01. Leia AGENTS.md e .agents/prompts/01-plataforma-seguranca-dados.md antes de planejar.

Objetivo:
Verificar a execução limpa de todas as migrações sequenciais desde o baseline inicial.

Critério de sucesso final:
npx prisma migrate status retorna 'Database schema is up to date!'.`
  },
  {
    id: 15,
    wave: 1,
    waveTitle: "Onda 1: Saneamento de Schema, RLS e Fila de Migrações",
    title: "Auditoria independente e emissão de parecer APROVADO para o bloco de dados (Onda 1)",
    agent: "24 — Revisão Independente",
    agentSlug: "24-revisao-independente",
    priority: "P0",
    desc: "O Agente 24 audita o diff acumulado da Onda 1: validação de schemas, conferência de RLS sem bypass, teste rls-coverage verde e ordenação de migrações, emitindo parecer APROVADO em .agents/reviews/.",
    files: ".agents/reviews/24-parecer-onda-01-dados-unificados.md",
    criteria: "test -f .agents/reviews/24-parecer-onda-01-dados-unificados.md",
    prompt: `Você é o Agente 24. Leia AGENTS.md e .agents/prompts/24-revisao-independente.md antes de planejar.

Missão: Auditar o bloco unificado de dados e migrações da Onda 1.
Critérios de aceite:
1. Schema Prisma validado sem divergências de chave composta.
2. 100% das novas tabelas com ENABLE e FORCE ROW LEVEL SECURITY.
3. Testes rls-coverage passando verde no CI.
4. Nenhuma credencial ou segredo em fixtures.

Emita o parecer formal em .agents/reviews/24-parecer-onda-01-dados-unificados.md.`
  }
];

// Generate remaining 85 steps programmatically for structured, comprehensive coverage
const waveDefinitions = [
  { wave: 2, title: "Onda 2: Eliminação de Estado em Memória e Persistência Real", start: 16, count: 15 },
  { wave: 3, title: "Onda 3: Transações Seguras, Outbox Pattern e Hardening de Segurança", start: 31, count: 15 },
  { wave: 4, title: "Onda 4: Inteligência Preditiva Real e Revenue Oracle Histórico", start: 46, count: 15 },
  { wave: 5, title: "Onda 5: Conectores e Gateways de Produção Resilientes", start: 61, count: 15 },
  { wave: 6, title: "Onda 6: Design System, Acessibilidade WCAG 2.2 AA e Interface", start: 76, count: 13 },
  { wave: 7, title: "Onda 7: Otimização de Performance, Gates e Estabilidade de CI", start: 89, count: 7 },
  { wave: 8, title: "Onda 8: Homologação Comercial, Certificação LGPD e Deploy AWS", start: 96, count: 5 }
];

const waveDetails = {
  2: [
    { title: "Criar PrismaAccountKnowledgeGraphRepository substituindo Map em memória", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P0", files: "src/features/intelligence/accountKnowledgeGraph.service.ts, src/features/intelligence/infra/PrismaAccountGraphRepository.ts", test: "npm run test:unit -- tests/unit/intelligence/accountKnowledgeGraph.service.test.ts", desc: "Substituir coleções Map<string, Node> por chamadas assíncronas ao repositório Prisma com persistência durável em PostgreSQL." },
    { title: "Implementar busca semântica de relacionamentos no Grafo com filtro de tenant", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", files: "src/features/intelligence/infra/PrismaAccountGraphRepository.ts", test: "npm run test:unit -- tests/unit/intelligence/accountKnowledgeGraph.service.test.ts", desc: "Permitir busca relacional entre contas coligadas com filtro estrito de organizationId." },
    { title: "Criar PrismaWinLossAutopsyRepository eliminando estado volátil", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P0", files: "src/features/intelligence/winLossAutopsy.service.ts, src/features/intelligence/infra/PrismaWinLossAutopsyRepository.ts", test: "npm run test:unit -- tests/unit/intelligence/winLossAutopsy.service.test.ts", desc: "Persistir causas-raiz de perdas e ganhos de deals diretamente no banco PostgreSQL com RLS." },
    { title: "Implementar cálculo agregado de padrões de perda/ganho no PostgreSQL", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", files: "src/features/intelligence/services/winLossAnalytics.service.ts", test: "npm run test:unit -- tests/unit/intelligence/winLossAutopsy.service.test.ts", desc: "Executar agregações de frequência e impacto financeiro via queries SQL em vez de loops em memória." },
    { title: "Criar PrismaBehavioralEngineRepository para gamificação comercial", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P0", files: "src/features/gamification/behavioralEngine.service.ts, src/features/gamification/infra/PrismaBehavioralEngineRepository.ts", test: "npm run test:unit -- tests/unit/gamification/behavioralEngine.service.test.ts", desc: "Persistir pontos, streaks, conquistas e níveis dos vendedores no banco evitando reset ao reiniciar servidor." },
    { title: "Garantir idempotência na concessão de badges e pontuações de gamificação", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", files: "src/features/gamification/services/gamificationAward.service.ts", test: "npm run test:unit -- tests/unit/gamification/behavioralEngine.service.test.ts", desc: "Evitar pontuação duplicada para o mesmo evento de conversão ou avanço de oportunidade no CRM." },
    { title: "Criar PrismaSelfDrivingCrmRepository para cadências multicanal", agent: "17 — Cadência Multicanal e Ciclo de Receita", slug: "17-cadencia-multicanal", p: "P0", files: "src/features/cadence/selfDrivingCrm.service.ts, src/features/cadence/infra/PrismaSelfDrivingCrmRepository.ts", test: "npm run test:unit -- tests/unit/cadence/selfDrivingCrm.service.test.ts", desc: "Substituir Maps temporários por tabelas relacionais de passos de cadência, fila de execução e status de entrega." },
    { title: "Conectar PrismaRebalanceApprovalStore ao serviço de RebalanceApproval", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P0", files: "src/features/commercial-intelligence/services/rebalanceApproval.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/rebalanceApproval.routes.test.ts", desc: "Persistir decisões de aprovação ou rejeição de rebalanceamento na tabela dedicada RebalanceApproval." },
    { title: "Persistir abordagens geradas no Social Selling vinculadas a Lead e Org", agent: "05 — Prospecção", slug: "05-prospeccao", p: "P1", files: "src/features/social-selling/services/socialSellingApproach.service.ts", test: "npm run test:unit -- tests/unit/features/social-selling/socialSelling.service.test.ts", desc: "Armazenar rascunhos de abordagem comercial gerados por IA com data de expiração e isolamento por tenant." },
    { title: "Criar repositório Prisma para missões do Enxame Tático de Agentes", agent: "13 — Enxame Autônomo e Governança de Runtime", slug: "13-enxame-autonomo", p: "P1", files: "src/features/swarm/infra/PrismaTacticalSwarmRepository.ts", test: "npm run test:unit -- tests/unit/tactical/tacticalSwarm.agents.test.ts", desc: "Registrar ciclo de vida, mensagens trocadas e conclusões de agentes táticos em banco de dados durável." },
    { title: "Persistir sessões de roleplay comercial com transcrição anonimizada", agent: "07 — IA e Automações", slug: "07-ia-automacoes", p: "P1", files: "src/features/roleplay/services/roleplaySession.service.ts", test: "npm run test:unit -- tests/unit/roleplay/multimodalRoleplaySimulator.service.test.ts", desc: "Salvar histórico de simulação de vendas, notas de desempenho e feedback sem dados de voz em texto aberto." },
    { title: "Persistir telemetria de chamadas de voz e transcrições com redação prévia", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P0", files: "src/features/voice-hub/services/callRecord.service.ts", test: "npm run test:unit -- tests/unit/ai-voice/conversationalIntelligence.service.test.ts", desc: "Gravar métricas de duração, latência de IA e transcrições sanitizadas (sem PII) no PostgreSQL." },
    { title: "Implementar fila relacional de sincronização de campo no Mobile (Offline Sync)", agent: "09 — Mobile", slug: "09-mobile", p: "P1", files: "src/features/mobile/services/offlineSyncQueue.service.ts", test: "npm run test:unit -- tests/unit/mobile/mobileEdgeAi.service.test.ts", desc: "Mapear sincronização de anotações e áudios gravados em modo offline com resolução determinística de conflitos." },
    { title: "Executar Reboot Test para comprovar persistência de dados pós-reinício", agent: "22 — Verificação de Realidade", slug: "22-verificacao-realidade", p: "P0", files: "tests/integration/persistenceReboot.integration.test.ts", test: "npm run test:integration -- tests/integration/persistenceReboot.integration.test.ts", desc: "Criar dados em todos os módulos, reiniciar o processo Node e verificar recuperação de 100% dos dados." },
    { title: "Auditoria independente de persistência real e parecer de encerramento da Onda 2", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", files: ".agents/reviews/24-parecer-onda-02-persistencia-real.md", test: "test -f .agents/reviews/24-parecer-onda-02-persistencia-real.md", desc: "Comprovar que zero Maps/Sets de domínio atuam como armazenamento primário em produção." }
  ],
  3: [
    { title: "Separar credenciais: prospector_migrator (DDL) e prospector_app (DML só)", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P0", files: "scripts/db/create-app-role.sql, docs/development/LOCAL_FIRST.md", test: "npm run test:unit -- tests/unit/security/dbRoleSeparation.test.ts", desc: "Garantir que a aplicação comum não consiga executar comandos DDL (DROP, CREATE, ALTER TABLE)." },
    { title: "Configurar verificação fatal de boot do papel do banco no server.ts (PR #41)", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P0", files: "src/server.ts, src/lib/db/bootRoleCheck.ts", test: "npm run test:unit -- tests/unit/security/bootRoleCheck.test.ts", desc: "Abortar inicialização em produção se a conexão do banco possuir privilégios de superusuário ou proprietário." },
    { title: "Implementar runInTransaction com propagação obrigatória do tenantId (PR #40)", agent: "01 — Plataforma, Segurança e Dados", slug: "01-plataforma-seguranca-dados", p: "P0", files: "src/lib/prisma.ts, src/lib/db/transactionContext.ts", test: "npm run test:unit -- tests/unit/security/prismaTxPropagation.test.ts", desc: "Garantir que transações aninhadas e clientes estendidos herdem current_setting('app.current_tenant_id')." },
    { title: "Adicionar guard de runtime contra escape de transação e queries sem contexto", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P0", files: "src/lib/db/uowRuntimeGuard.ts", test: "npm run test:unit -- tests/unit/security/uowRuntimeGuard.test.ts", desc: "Bloquear execução de Unit of Work sem helper aprovado ou queries raw sem tenantId definido." },
    { title: "Implementar worker Outbox Relay com backoff exponencial e dead-letter (PR #32)", agent: "16 — Runtime, Workers e Escala", slug: "16-runtime-workers-escala", p: "P0", files: "src/lib/queue/outboxRelay.worker.ts, src/lib/queue/outboxRelay.service.ts", test: "npm run test:unit -- tests/unit/queue/outboxRelay.service.test.ts", desc: "Worker resiliente que processa mensagens transacionais do banco e envia para os destinos de mensageria." },
    { title: "Implementar barramento de idempotência durável no PostgreSQL", agent: "16 — Runtime, Workers e Escala", slug: "16-runtime-workers-escala", p: "P0", files: "src/lib/queue/idempotencyManager.ts", test: "npm run test:unit -- tests/unit/queue/idempotencyManager.test.ts", desc: "Garantir que operações de escrita de eventos e webhooks sejam processadas no máximo uma vez (exactly-once semantics)." },
    { title: "Criar canal global de auditoria de segurança desacoplado de tenant sentinela (PR #38)", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P0", files: "src/lib/security/globalSecurityAuditChannel.ts", test: "npm run test:unit -- tests/unit/security/globalSecurityAuditChannel.test.ts", desc: "Canal de log para eventos globais do sistema sem poluir a outbox de organizações clientes." },
    { title: "Implementar serviço de cadeia de consentimento durável LGPD com SHA-256 (PR #33)", agent: "21 — Privacidade e LGPD", slug: "21-privacidade-lgpd", p: "P0", files: "src/shared/services/consentAuditChain.service.ts", test: "npm run test:unit -- tests/unit/security/consentAuditChain.test.ts", desc: "Garantir integridade encadeada de logs de consentimento imutáveis para conformidade com a ANPD." },
    { title: "Implementar algoritmo de k-anonymity (k=5) em relatórios analíticos (PR #33)", agent: "21 — Privacidade e LGPD", slug: "21-privacidade-lgpd", p: "P1", files: "src/shared/services/kAnonymityFilter.service.ts", test: "npm run test:unit -- tests/unit/security/kAnonymityFilter.test.ts", desc: "Suprimir agregações com menos de 5 entidades para impedir reidentificação indireta de indivíduos." },
    { title: "Implementar sanitização e proteção contra prompt injection no gateway de IA", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P0", files: "src/lib/ai/gateway/untrustedContentGuard.ts", test: "npm run test:unit -- tests/unit/ai/untrustedContentGuard.test.ts", desc: "Envolver inputs externos em tags XML seguras e instrução anti-jailbreak no LLM Gateway." },
    { title: "Implementar rotina de rotação de segredos e tokens de webhook", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P1", files: "scripts/security/rotate-secrets.ts", test: "npm run test:unit -- tests/unit/security/secretRotation.test.ts", desc: "Permitir rotação atômica de chaves secretas sem derrubar conexões ativas de usuários." },
    { title: "Configurar PgBouncer e calibrar pool de conexões para alta concorrência", agent: "16 — Runtime, Workers e Escala", slug: "16-runtime-workers-escala", p: "P1", files: "docker/pgbouncer/pgbouncer.ini, src/lib/prisma.ts", test: "npm run test:load -- tests/load/k6-db-pool-saturation.js", desc: "Evitar estouro de conexões simultâneas no PostgreSQL durante picos de carga ou extrações pesadas." },
    { title: "Aplicar cabeçalhos de segurança HTTP e CSP restritiva no Express", agent: "15 — Segurança Aplicada e Rotação de Segredos", slug: "15-seguranca-aplicada", p: "P1", files: "src/server.ts, src/middleware/securityHeaders.ts", test: "npm run test:unit -- tests/unit/security/securityHeaders.test.ts", desc: "Configurar Content-Security-Policy, HSTS, X-Frame-Options e Cross-Origin-Resource-Policy." },
    { title: "Criar suíte de testes de penetração simulando bypass de RLS e vazamento", agent: "14 — Ambiente de Execução e Test Harness", slug: "14-ambiente-execucao-testes", p: "P0", files: "tests/security/rlsPenetration.test.ts", test: "npm run test:integration -- tests/security/rlsPenetration.test.ts", desc: "Simular ataques de injeção de SQL e tentativa de leitura de dados de outro tenant via query direta." },
    { title: "Parecer independente e homologação da esteira de transações e segurança (Onda 3)", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", files: ".agents/reviews/24-parecer-onda-03-transacional-seguranca.md", test: "test -f .agents/reviews/24-parecer-onda-03-transacional-seguranca.md", desc: "Validar que nenhuma brecha de segurança ou vulnerabilidade transacional permaneça aberta." }
  ],
  4: [
    { title: "Substituir constantes estáticas no Revenue Oracle por cálculo sobre pipeline real", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P0", files: "src/features/commercial-intelligence/services/predictiveRevenueOracle.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Eliminar valores fixos (145k/485k/980k) e calcular projeções reais a partir das oportunidades no banco." },
    { title: "Implementar algoritmo de regressão linear ponderada no histórico de fechamentos", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P0", files: "src/features/commercial-intelligence/services/predictiveRegression.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Calcular taxa de conversão histórica real por estágio do funil ponderada pela recência dos deals." },
    { title: "Implementar cálculo dinâmico de MAPE (Mean Absolute Percentage Error)", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", files: "src/features/commercial-intelligence/services/mapeCalculator.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Calcular a acurácia do oráculo comparando projeções anteriores com a receita real faturada no período." },
    { title: "Implementar motor de simulação What-If baseado em histórico operacional", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", files: "src/features/commercial-intelligence/services/whatIfSimulator.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Calcular cenários otimistas e conservadores com base na dispersão padrão dos dados reais de vendas." },
    { title: "Implementar algoritmo de balanceamento de carga de carteiras de clientes", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", files: "src/features/commercial-intelligence/services/portfolioRebalancer.service.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/rebalanceApproval.routes.test.ts", desc: "Gerar recomendações de redistribuição de contas entre vendedores considerando capacidade e pipeline." },
    { title: "Atualizar contrato canônico IPredictiveRevenueOraclePort V2 em src/shared/contracts/", agent: "18 — Contratos, API e Documentação Viva", slug: "18-contratos-api-docs", p: "P0", files: "src/shared/contracts/predictiveRevenueOraclePorts.contract.ts", test: "npm run typecheck", desc: "Refletir tipos estritos de histórico real, intervalos de confiança e ausência de mocks no contrato." },
    { title: "Documentar todas as rotas e schemas de inteligência preditiva no OpenAPI", agent: "18 — Contratos, API e Documentação Viva", slug: "18-contratos-api-docs", p: "P0", files: "docs/openapi.yaml", test: "npm run verify:openapi-drift", desc: "Registrar endpoints /commercial-intelligence/predictive/* com schemas de entrada e saída no openapi.yaml." },
    { title: "Validar e zerar qualquer drift no OpenAPI após novas rotas preditivas", agent: "08 — QA e Release", slug: "08-qa-release", p: "P0", files: "docs/openapi.yaml", test: "npm run verify:openapi-drift", desc: "Garantir código de saída 0 no verificador de drift OpenAPI do CI." },
    { title: "Implementar endpoint /commercial-intelligence/predictive/backtest", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P1", files: "src/features/commercial-intelligence/routes/predictive.routes.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Fornecer endpoint seguro com autenticação e RLS para cálculo de backtest de acurácia preditiva." },
    { title: "Implementar endpoint consolidado /commercial-intelligence/predictive/cockpit", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P0", files: "src/features/commercial-intelligence/routes/predictive.routes.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Disponibilizar endpoint com todos os KPIs preditivos reais necessários para o cockpit do gestor." },
    { title: "Conectar o componente de UI PredictiveRevenueCockpit.tsx às APIs reais", agent: "02 — Produto e UX", slug: "02-produto-ux", p: "P0", files: "src/features/commercial-intelligence/components/PredictiveRevenueCockpit.tsx", test: "npm run test:unit -- tests/unit/components/cockpitsAndPanels.unit.test.tsx", desc: "Eliminar dados mockados da interface, conectando o painel de visualização ao endpoint do backend." },
    { title: "Adicionar estados visuais explícitos de Loading, Vazio e Erro no Cockpit Preditivo", agent: "02 — Produto e UX", slug: "02-produto-ux", p: "P1", files: "src/features/commercial-intelligence/components/PredictiveRevenueCockpit.tsx", test: "npm run test:unit -- tests/unit/components/cockpitsAndPanels.unit.test.tsx", desc: "Garantir feedback honesto ao usuário quando a empresa ainda não possuir histórico suficiente de vendas." },
    { title: "Adicionar telemetria de latência e consumo FinOps nas inferências do Oráculo", agent: "23 — Custo, Performance e Limites de IA", slug: "23-custo-performance-ia", p: "P1", files: "src/lib/ai/gateway/pricing.ts, src/lib/telemetry/oracleMetrics.ts", test: "npm run test:unit -- tests/unit/ai/semanticCache.service.test.ts", desc: "Medir milissegundos de processamento e gasto de tokens em chamadas preditivas do oráculo." },
    { title: "Criar testes unitários para cenários de borda no cálculo do Revenue Oracle", agent: "04 — CRM e BI", slug: "04-crm-bi", p: "P0", files: "tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", test: "npm run test:unit -- tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts", desc: "Validar comportamento elegante com base zerada, apenas 1 deal, vendas esporádicas e sazonalidade." },
    { title: "Parecer de revisão independente do Revenue Oracle histórico e preditivo (Onda 4)", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", files: ".agents/reviews/24-parecer-onda-04-revenue-oracle.md", test: "test -f .agents/reviews/24-parecer-onda-04-revenue-oracle.md", desc: "Emitir parecer formal atestando a veracidade matemática e operacional do oráculo sem simulação." }
  ],
  5: [
    { title: "Implementar cliente Bitrix24 resiliente com rate limiting e tratamento de erro", agent: "06 — Integrações e Bitrix", slug: "06-integracoes-bitrix", p: "P0", files: "src/features/integrations/bitrix/client.ts", test: "npm run test:unit -- tests/unit/integrations/bitrix/client.timeout.test.ts", desc: "Prevenir erros 429 com fila de espaçamento de requisições de 500ms e retry com jitter." },
    { title: "Implementar sincronização bidirecional de Leads e Negócios com Bitrix24", agent: "06 — Integrações e Bitrix", slug: "06-integracoes-bitrix", p: "P0", files: "src/features/integrations/bitrix/syncActivityToBitrix.ts", test: "npm run test:unit -- tests/unit/integrations/bitrix/syncActivityToBitrix.test.ts", desc: "Sincronizar criação e atualização de leads no PostgreSQL para o Bitrix e vice-versa via webhooks." },
    { title: "Implementar extrações paginadas duráveis de dados históricos do Bitrix24", agent: "06A — Extrações Bitrix", slug: "06a-extracoes-bitrix", p: "P1", files: "src/features/integrations/bitrix/paginatedExtractor.ts", test: "npm run test:unit -- tests/unit/integrations/bitrix/paginatedExtractor.test.ts", desc: "Extrair lotes de 50 registros salvando checkpoint no banco para retomar em caso de queda de rede." },
    { title: "Conectar WebRTC do 3CX para telefonia em tempo real no VoiceHub", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P0", files: "src/features/voice-hub/services/threecxWebRtc.service.ts", test: "npm run test:unit -- tests/unit/integrations/threecx/threecx.service.test.ts", desc: "Estabelecer canal de áudio SIP/WebRTC real com central 3CX para chamadas ativas de consultores." },
    { title: "Implementar conector Twilio Voice com geração segura de JWT efêmero", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P0", files: "src/features/voice-hub/services/twilioVoice.service.ts", test: "npm run test:unit -- tests/unit/ai-voice/autonomousSdr.service.test.ts", desc: "Permitir discagem automática do SDR via Twilio com validação de assinatura de webhook HMAC." },
    { title: "Implementar detecção de voz ativa (VAD) e barge-in para interrupção de SDR", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P1", files: "src/features/voice-hub/services/vadBargeIn.service.ts", test: "npm run test:unit -- tests/unit/ai-voice/bimodalLiveVoice.service.test.ts", desc: "Interromper imediatamente o áudio sintetizado da IA quando o interlocutor começar a falar." },
    { title: "Implementar pipeline de transcrição de áudio com mascaramento de PII em voo", agent: "12 — Voz e Telefonia", slug: "12-voz-telefonia", p: "P0", files: "src/features/voice-hub/services/realtimeTranscription.service.ts", test: "npm run test:unit -- tests/unit/security/piiTokenizer.service.test.ts", desc: "Redigir CPFs, números de telefone e senhas do stream de transcrição antes de salvar no banco." },
    { title: "Implementar conector WhatsApp via Baileys com sessão persistida no Postgres", agent: "06 — Integrações e Bitrix", slug: "06-integracoes-bitrix", p: "P0", files: "src/features/integrations/whatsapp/baileysSession.service.ts", test: "npm run test:unit -- tests/unit/integrations/bitrixEventMeshBridge.test.ts", desc: "Manter chaves de autenticação do WhatsApp persistidas no PostgreSQL com recuperação automática." },
    { title: "Implementar disparador de cadência multicanal com verificação de opt-out LGPD", agent: "17 — Cadência Multicanal e Ciclo de Receita", slug: "17-cadencia-multicanal", p: "P0", files: "src/features/cadence/services/multichannelDispatcher.service.ts", test: "npm run test:unit -- tests/unit/cadence/adaptiveMultichannelCadence.service.test.ts", desc: "Bloquear disparo de qualquer mensagem caso o lead conste na tabela de OptOutRecord." },
    { title: "Integrar conector Apollo.io e BrasilAPI para enriquecimento cadastral de empresas", agent: "05 — Prospecção", slug: "05-prospeccao", p: "P1", files: "src/features/prospecting/services/companyEnrichment.service.ts", test: "npm run test:unit -- tests/unit/crm/PrismaCompanyRepository.search.test.ts", desc: "Buscar dados cadastrais oficiais de empresas a partir do CNPJ com cache local de 30 dias." },
    { title: "Implementar gerador e verificador de propostas comerciais em PDF com hash", agent: "17 — Cadência Multicanal e Ciclo de Receita", slug: "17-cadencia-multicanal", p: "P1", files: "src/features/proposals/services/proposalDocument.service.ts", test: "npm run test:unit -- tests/unit/proposals/proposalAutomation.service.test.ts", desc: "Gerar proposta comercial em PDF com assinatura digital SHA-256 e trilha de auditoria." },
    { title: "Configurar roteamento dinâmico e fallback automático de provedores de LLM", agent: "07 — IA e Automações", slug: "07-ia-automacoes", p: "P0", files: "src/lib/ai/gateway/model-routing.ts", test: "npm run test:unit -- tests/unit/ai/modelCascade.test.ts", desc: "Redirecionar requisições para backup caso o provedor principal (ex: Groq) apresente indisponibilidade." },
    { title: "Exportar métricas de saúde e latência de integrações para o Prometheus", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P1", files: "src/lib/metrics/prometheusExporter.ts, prometheus.yml", test: "npm run verify:integrations", desc: "Coletar métricas de tempo de resposta e taxa de sucesso de cada conector externo." },
    { title: "Criar Test Harness local com stubs de alta fidelidade para execução de testes", agent: "14 — Ambiente de Execução e Test Harness", slug: "14-ambiente-execucao-testes", p: "P0", files: "tests/harness/externalGatewaysStub.ts", test: "npm run test:integration", desc: "Permitir que desenvolvedores e agentes rodem testes de integração sem chaves de API pagas." },
    { title: "Auditoria independente de conectores de produção e parecer de encerramento da Onda 5", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", files: ".agents/reviews/24-parecer-onda-05-conectores-gateways.md", test: "test -f .agents/reviews/24-parecer-onda-05-conectores-gateways.md", desc: "Atestar que nenhum gateway opera de forma puramente cenográfica ou sem tratamento de falha." }
  ],
  6: [
    { title: "Auditar e calibrar contraste de cores nos modos Claro e Escuro (WCAG 2.2 AA)", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P0", files: "src/index.css, src/contexts/ThemeContext.tsx", test: "npx playwright test tests/e2e/accessibility.spec.ts", desc: "Garantir contraste de texto mínimo de 4.5:1 para texto normal e 3:1 para elementos de interface nos 2 temas." },
    { title: "Implementar anéis de foco visíveis universais (focus-visible:ring-2) na UI", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P0", files: "src/components/ui/*.tsx, src/index.css", test: "npm run test:unit -- tests/unit/components/ui/Card.test.tsx", desc: "Assegurar que todo botão, link e controle receba indicador de foco nítido ao navegar por teclado." },
    { title: "Corrigir hierarquia de cabeçalhos semânticos e marcos ARIA em todas as telas", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P1", files: "src/components/layout/AppLayout.tsx, src/App.tsx", test: "npx playwright test tests/e2e/accessibility.spec.ts", desc: "Organizar estrutura com apenas um h1 por tela, marcos header, nav, main e aside para leitores de tela." },
    { title: "Alinhar tokens semânticos na Sidebar e AppBreadcrumbs eliminando cores fixas", agent: "02 — Produto e UX", slug: "02-produto-ux", p: "P0", files: "src/components/layout/Sidebar.tsx, src/components/layout/AppBreadcrumbs.tsx", test: "npm run build", desc: "Usar var(--surface), var(--ink), var(--line) garantindo consistência visual em todos os módulos." },
    { title: "Implementar navegação por teclado acessível no Kanban de Negócios", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P1", files: "src/features/crm/components/KanbanBoard.tsx", test: "npx playwright test tests/e2e/crm-kanban.spec.ts", desc: "Permitir mover cards entre colunas do funil usando atalhos de teclado (Espaço/Enter e Setas)." },
    { title: "Adicionar atributos aria-expanded e aria-controls em menus dropdown e modais", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P1", files: "src/components/ui/DropdownMenu.tsx, src/components/ui/Modal.tsx", test: "npm run test:unit -- tests/unit/components/cockpitsAndPanels.unit.test.tsx", desc: "Informar tecnologias assistivas sobre abertura e fechamento de elementos flutuantes." },
    { title: "Padronizar estados de Empty State, Loading Skeleton e Error em todos os módulos", agent: "02 — Produto e UX", slug: "02-produto-ux", p: "P1", files: "src/components/ui/EmptyState.tsx, src/components/ui/Skeleton.tsx", test: "npm run test:unit -- tests/unit/components/cockpitsAndPanels.unit.test.tsx", desc: "Evitar telas brancas ou congeladas durante carregamento ou falha de requisição de dados." },
    { title: "Aplicar respeito à diretiva prefers-reduced-motion nas animações do Framer Motion", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P1", files: "src/lib/motion.ts", test: "npm run test:unit -- tests/unit/components/ui/Card.test.tsx", desc: "Desativar transições de movimento bruscas para usuários com sensibilidade vestibular." },
    { title: "Otimizar validação inline de formulários comerciais com mensagens em português", agent: "02 — Produto e UX", slug: "02-produto-ux", p: "P1", files: "src/components/ui/FormField.tsx", test: "npm run build", desc: "Exibir erros de campo amigáveis e prevenir submissão acidental de formulário incompleto." },
    { title: "Garantir layout responsivo fluido em dispositivos móveis (360px a 1920px)", agent: "09 — Mobile", slug: "09-mobile", p: "P1", files: "src/components/layout/AppLayout.tsx", test: "npx playwright test tests/e2e/responsive.spec.ts", desc: "Eliminar barras de rolagem horizontais indesejadas e garantir gaveta lateral fluida no celular." },
    { title: "Executar varredura completa axe-core em todas as rotas da aplicação web", agent: "08 — QA e Release", slug: "08-qa-release", p: "P0", files: "tests/e2e/accessibility.spec.ts", test: "npx playwright test tests/e2e/accessibility.spec.ts", desc: "Zerar violações críticas e sérias da norma WCAG 2.2 nível AA comprovado em relatório do Playwright." },
    { title: "Criar catálogo vivo de componentes de UI (Design System Birth Hub 360°)", agent: "03 — Design e Acessibilidade", slug: "03-design-acessibilidade", p: "P2", files: "docs/design-system/COMPONENT_GUIDE.md", test: "test -f docs/design-system/COMPONENT_GUIDE.md", desc: "Documentar padrões de uso de tipografia, cores, botões, modais e badges para novos agentes." },
    { title: "Parecer independente de aprovação de UX, Design e Acessibilidade (Onda 6)", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", files: ".agents/reviews/24-parecer-onda-06-design-acessibilidade.md", test: "test -f .agents/reviews/24-parecer-onda-06-design-acessibilidade.md", desc: "Homologar conformidade de acessibilidade e consistência visual de ponta a ponta." }
  ],
  7: [
    { title: "Investigar e corrigir causas-raiz das falhas na suíte E2E do Playwright", agent: "08 — QA e Release", slug: "08-qa-release", p: "P0", files: "tests/e2e/accessibility.spec.ts, tests/e2e/cadence.spec.ts", test: "npx playwright test", desc: "Sanear testes de ponta a ponta quebrados (login contrast, drawer e atalhos de teclado)." },
    { title: "Implementar retries determinísticos e isolamento de banco para testes de CI", agent: "08 — QA e Release", slug: "08-qa-release", p: "P0", files: "vitest.integration.config.ts, playwright.config.ts", test: "npm run test:integration", desc: "Evitar falhas intermitentes (flakiness) por disputa de porta ou concorrência de banco no GitHub Actions." },
    { title: "Otimizar code-splitting no Vite mantendo bundle compactado abaixo de 2.5 MB", agent: "16 — Runtime, Workers e Escala", slug: "16-runtime-workers-escala", p: "P1", files: "vite.config.ts", test: "npm run check:bundle-budget", desc: "Separar bibliotecas pesadas (Three.js, Lucide, Framer Motion) em chunks sob demanda." },
    { title: "Configurar compressão Brotli e políticas granulares de cache no Nginx", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P1", files: "nginx/nginx.conf, setup-nginx-ssl.sh", test: "nginx -t -c nginx/nginx.conf", desc: "Reduzir tempo de carregamento de assets estáticos e tempo até primeiro byte (TTFB)." },
    { title: "Executar teste de carga k6 garantindo latência p95 < 200ms em pico de tráfego", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P0", files: "tests/load/k6-ai-voice-stress.js", test: "npm run load:k6:ai-voice", desc: "Comprovar estabilidade de rotas críticas de telemetria e IA sob 500 chamadas simultâneas." },
    { title: "Blindar workflow central de CI no GitHub Actions (.github/workflows/release.yml)", agent: "08 — QA e Release", slug: "08-qa-release", p: "P0", files: ".github/workflows/release.yml", test: "gh workflow view 'Central Birth Hub 360 Release'", desc: "Garantir execução paralela e fail-fast de lint, types, arquitetura, testes e varredura de segredos." },
    { title: "Parecer independente de liberação do Quality Gate Central 100% verde (Onda 7)", agent: "24 — Revisão Independente", slug: "24-revisao-independente", p: "P0", files: ".agents/reviews/24-parecer-onda-07-gates-performance.md", test: "test -f .agents/reviews/24-parecer-onda-07-gates-performance.md", desc: "Certificar que todos os 10 quality gates automatizados passam com código de retorno zero." }
  ],
  8: [
    { title: "Concluir inventário ROPA e fluxo automatizado de direitos do titular (DSR)", agent: "21 — Privacidade e LGPD", slug: "21-privacidade-lgpd", p: "P0", files: "docs/lgpd/INVENTARIO_TRATAMENTO_ROPA.md, src/shared/services/dataSubjectErasure.service.ts", test: "npm run test:unit -- tests/unit/security/dataSubjectErasure.unit.test.ts", desc: "Comprovar capacidade técnica de exportação e esquecimento de titular em conformidade com a LGPD." },
    { title: "Validar jornada de ponta a ponta com o End-to-End Flow Validator", agent: "22 — Verificação de Realidade", slug: "22-verificacao-realidade", p: "P0", files: "tests/e2e/completeCustomerJourney.e2e.test.ts", test: "npm run test:e2e", desc: "Verificar jornada completa: Prospecção -> Enriquecimento -> Cadência -> Reunião -> Proposta -> Fechamento." },
    { title: "Provisionar infraestrutura de produção na nuvem AWS (ECS, RDS Multi-AZ, ALB)", agent: "10 — Infraestrutura, Observabilidade e SRE", slug: "10-infraestrutura-sre", p: "P0", files: "infrastructure/terraform/*, k8s/production/*", test: "terraform plan -no-color", desc: "Configurar containers gerenciados em alta disponibilidade com TLS 1.3 e backups automatizados." },
    { title: "Executar ensaio de deploy (deploy rehearsal) em ambiente espelho com migrações", agent: "08A — Operações Git e Deploy AWS", slug: "08a-operacoes-git-deploy", p: "P0", files: "scripts/deploy/staging-rehearsal.sh", test: "bash scripts/deploy/staging-rehearsal.sh --dry-run", desc: "Simular o deploy de produção garantindo aplicação limpa de migrações e zero downtime." },
    { title: "Emissão do Selo de Prontidão Go-Live, corte da tag v1.0.0 e push final", agent: "00 — Coordenador", slug: "00-coordenador", p: "P0", files: ".agents/reviews/24-selo-prontidao-go-live-v1.0.0.md", test: "git tag -v v1.0.0-release", desc: "Concluir a ativação oficial da plataforma comercial Birth Hub 360° para operação de mercado." }
  ]
};

// Populate steps 16 to 100
for (const [wStr, items] of Object.entries(waveDetails)) {
  const w = parseInt(wStr);
  const waveDef = waveDefinitions.find(wd => wd.wave === w);
  items.forEach((item, idx) => {
    const stepId = waveDef.start + idx;
    steps.push({
      id: stepId,
      wave: w,
      waveTitle: waveDef.title,
      title: item.title,
      agent: item.agent,
      agentSlug: item.slug,
      priority: item.p,
      desc: item.desc,
      files: item.files,
      criteria: item.test,
      prompt: `Você é o ${item.agent.split('—')[0].trim()}. Leia AGENTS.md e .agents/prompts/${item.slug}.md antes de planejar.

Agente: ${item.agent}
Onda: ${w}
Base: main
Branch: agente/${item.slug}-passo-${String(stepId).padStart(3, '0')}

Objetivo:
${item.title}.

Descrição e Rationale:
${item.desc}

Arquivos sob propriedade:
${item.files.split(',').map(f => `- ${f.trim()}`).join('\n')}

Critério de verificação:
${item.test}

Entrega:
Relatório de conclusão com evidências, comandos executados e diff cirúrgico sem quebra de gates.`
    });
  });
}

console.log(`Generated total steps: ${steps.length}`);

// Generate HTML
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plano de 100 Passos de Engenharia — Birth Hub 360°</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --card-border: #1f293d;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --brand: #00d4ff;
      --brand-glow: rgba(0, 212, 255, 0.25);
      --violet: #8b5cf6;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #f43f5e;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace;
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
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.8));
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }

    header::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, var(--brand-glow), transparent 70%);
      pointer-events: none;
    }

    .badge-header {
      display: inline-block;
      background: rgba(0, 212, 255, 0.12);
      color: var(--brand);
      border: 1px solid rgba(0, 212, 255, 0.3);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    h1 span {
      background: linear-gradient(90deg, #00d4ff, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    p.subtitle {
      color: var(--text-muted);
      font-size: 15px;
      max-width: 900px;
      margin-bottom: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .stat-card {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
    }

    .stat-card .label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    .stat-card .value {
      font-size: 24px;
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
      position: relative;
    }

    .progress-bar-fill {
      background: linear-gradient(90deg, var(--brand), var(--emerald));
      height: 100%;
      width: 0%;
      transition: width 0.4s ease;
      box-shadow: 0 0 12px var(--brand-glow);
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
      color: #0b0f19;
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
      background: linear-gradient(90deg, rgba(31, 41, 55, 0.6), rgba(17, 24, 39, 0.4));
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
      margin-bottom: 12px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      position: relative;
    }

    .step-card:hover {
      border-color: rgba(0, 212, 255, 0.4);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .step-card.completed {
      background: rgba(16, 185, 129, 0.03);
      border-color: rgba(16, 185, 129, 0.25);
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
      background: rgba(244, 63, 94, 0.15);
      color: var(--rose);
      border: 1px solid rgba(244, 63, 94, 0.3);
    }

    .priority-p1 {
      background: rgba(245, 158, 11, 0.15);
      color: var(--amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .priority-p2 {
      background: rgba(139, 92, 246, 0.15);
      color: var(--violet);
      border: 1px solid rgba(139, 92, 246, 0.3);
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
      color: #e5e7eb;
      word-break: break-all;
    }

    .prompt-box {
      margin-top: 12px;
      display: none;
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 16px;
      position: relative;
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
      max-height: 350px;
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
      <div class="badge-header">Roteiro Canônico de Execução — 100 Passos</div>
      <h1>Engenharia & Go-Live: <span>Birth Hub 360°</span></h1>
      <p class="subtitle">
        Plano integral de engenharia colaborativa cobrindo 8 ondas sequenciais, 100 passos auditáveis com critérios de verificação matemáticos, conformidade com AGENTS.md e prompts canônicos para cada agente do sistema.
      </p>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">Total de Passos</div>
          <div class="value">100</div>
        </div>
        <div class="stat-card">
          <div class="label">Ondas Estratégicas</div>
          <div class="value">8</div>
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
      <input type="text" id="search-input" class="search-input" placeholder="🔍 Buscar por passo, arquivo, comando ou agente...">
      
      <select id="wave-filter" class="filter-select">
        <option value="all">Todas as Ondas (1 a 8)</option>
        <option value="1">Onda 1: Saneamento de Schema & RLS</option>
        <option value="2">Onda 2: Persistência Real & Memória</option>
        <option value="3">Onda 3: Transações & Outbox Pattern</option>
        <option value="4">Onda 4: Revenue Oracle & Predição</option>
        <option value="5">Onda 5: Conectores & Gateways</option>
        <option value="6">Onda 6: Design System & A11y</option>
        <option value="7">Onda 7: Performance & CI Gates</option>
        <option value="8">Onda 8: Homologação & Deploy AWS</option>
      </select>

      <select id="priority-filter" class="filter-select">
        <option value="all">Todas as Prioridades</option>
        <option value="P0">Prioridade P0 (Crítica)</option>
        <option value="P1">Prioridade P1 (Alta)</option>
        <option value="P2">Prioridade P2 (Média)</option>
      </select>

      <button class="btn btn-secondary" onclick="exportProgress()">📥 Exportar Progresso</button>
      <button class="btn btn-secondary" onclick="resetProgress()">🔄 Resetar Checklist</button>
    </div>

    <div id="steps-container">
      ${[1, 2, 3, 4, 5, 6, 7, 8].map(wNum => {
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
            ${wSteps.map(s => `
              <div class="step-card" id="step-${s.id}" data-step="${s.id}" data-wave="${s.wave}" data-priority="${s.priority}" data-agent="${s.agent}">
                <div class="step-header">
                  <div class="checkbox-wrapper">
                    <input type="checkbox" class="custom-checkbox" id="chk-${s.id}" onchange="toggleStep(${s.id})">
                  </div>
                  <div class="step-content">
                    <div class="step-top">
                      <span class="step-id">PASSO #${String(s.id).padStart(3, '0')}</span>
                      <span class="step-priority priority-${s.priority.toLowerCase()}">${s.priority}</span>
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
                    </div>

                    <div class="actions">
                      <button class="btn btn-secondary btn-sm" onclick="togglePrompt(${s.id})">👁️ Ver Prompt do Agente</button>
                      <button class="btn btn-sm" onclick="copyPrompt(${s.id})">📋 Copiar Prompt Canônico</button>
                    </div>

                    <div class="prompt-box" id="prompt-box-${s.id}">
                      <div class="prompt-header">
                        <span>PROMPT OFICIAL CONFORME /AGENTS.md</span>
                        <button class="btn btn-secondary btn-sm" onclick="copyPrompt(${s.id})">Copiar</button>
                      </div>
                      <div class="prompt-text" id="prompt-text-${s.id}">${s.prompt}</div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        `;
      }).join('')}
    </div>

    <footer>
      Birth Hub 360° — Plataforma de Inteligência Comercial e Autonomia SDR | Gerado em 21/10/2026<br>
      Conforme regras de governança global <code>AGENTS.md</code> e pareceres formais do Agente 24.
    </footer>
  </div>

  <script>
    const totalSteps = 100;
    const STORAGE_KEY = 'birthhub360_100_steps_progress';

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
        alert('Prompt do Passo #' + id + ' copiado para a área de transferência com sucesso!');
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
      a.download = 'birthhub360-progresso-' + new Date().toISOString().slice(0,10) + '.json';
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

      // Hide empty wave groups
      document.querySelectorAll('.wave-group').forEach(group => {
        const visibleSteps = group.querySelectorAll('.step-card[style="display: block;"]');
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
