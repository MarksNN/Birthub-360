const fs = require('fs');
const path = require('path');

const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Marks', 'Desktop');
const destFile = path.join(desktopDir, 'BIRTHUB360_AUDITORIA_REAL_COMPLETA.html');
const localCopyDir = path.join(__dirname, '..', '.agents', 'audits');
const localCopy = path.join(localCopyDir, 'BIRTHUB360_AUDITORIA_REAL_COMPLETA.html');

if (!fs.existsSync(localCopyDir)) {
  fs.mkdirSync(localCopyDir, { recursive: true });
}

// 1. Dados dos Quality Gates Executados no Ambiente Real
const qualityGatesResults = [
  { name: 'npm run lint', cmd: 'biome lint src', exitCode: 0, status: 'PASS', diagnostics: '2001 arquivos verificados, 0 erros, 574 warnings, 8 infos', date: '2026-10-20' },
  { name: 'npm run format:check', cmd: 'biome format src', exitCode: 1, status: 'FAIL', diagnostics: '14 erros de formatação nos serviços recentes da Onda 05 (conversationalIntelligence, contracts)', date: '2026-10-20' },
  { name: 'npm run typecheck', cmd: 'node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit', exitCode: 0, status: 'PASS', diagnostics: 'Compilação TypeScript estrita concluída com 0 erros', date: '2026-10-20' },
  { name: 'npm run test:architecture', cmd: 'depcruise && verify-cruise-coverage && check-hotspots', exitCode: 0, status: 'PASS', diagnostics: '1743 módulos cruzados, 0 violações de camada, 0 hotspots não autorizados (18 exceções documentadas até 2026-11-30)', date: '2026-10-20' },
  { name: 'npm run security:audit-waivers', cmd: 'tsx scripts/security/check-audit-waivers.ts', exitCode: 0, status: 'PASS', diagnostics: '0 achados HIGH/CRITICAL em npm audit', date: '2026-10-20' },
  { name: 'npm run verify:openapi-drift', cmd: 'tsx scripts/verify-openapi-drift.ts', exitCode: 0, status: 'PASS', diagnostics: '73 prefixos, 443 rotas documentadas em openapi.yaml, 74 routers verificados, 0 derivo', date: '2026-10-20' },
  { name: 'npm run build', cmd: 'vite build && esbuild server.ts && verify:pwa-precache', exitCode: 0, status: 'PASS', diagnostics: 'Vite build concluído (5857 módulos), server.cjs (3.0mb), PWA precache 181 entries (14.28MB)', date: '2026-10-20' },
  { name: 'npm run build:worker', cmd: 'esbuild worker.ts --bundle --platform=node --format=cjs --outfile=dist/worker.cjs', exitCode: 0, status: 'PASS', diagnostics: 'dist/worker.cjs (1.0mb) gerado com sucesso em 105ms', date: '2026-10-20' },
  { name: 'npx prisma validate', cmd: 'npx prisma validate', exitCode: 0, status: 'PASS', diagnostics: 'Schema prisma/schema.prisma 100% válido, 140 migrations aplicadas', date: '2026-10-20' },
  { name: 'Testes Unitários das Ondas (Vitest)', cmd: 'npx vitest run tests/unit/{contracts,ai-voice,intelligence,gamification,cadence,commercial-intelligence,mobile,social-selling,calendar,roleplay,security}', exitCode: 0, status: 'PASS', diagnostics: '38 arquivos de testes executados, 234 testes aprovados (0 falhas)', date: '2026-10-20' },
  { name: 'Testes de Integração & E2E', cmd: 'npm run test:integration / npm run test:e2e', exitCode: -1, status: 'BLOCKED', diagnostics: 'Bloqueado no pretest: docker Postgres/Redis de teste não ativo no ambiente local do runner', date: '2026-10-20' },
  { name: 'CI GitHub Actions Remoto', cmd: 'GitHub Action Run 39476055752 (PR #741 / main)', exitCode: 1, status: 'FAIL', diagnostics: 'Falha no passo Run Prettier check em ci.yml; passos posteriores pulados', date: '2026-10-20' }
];

// 2. Matriz Completa de Requisitos Auditados
const requirementsMatrix = [
  // ONDA 00
  {
    id: 'REQ-00-01',
    wave: '00',
    category: 'Governança & Arquitetura',
    name: 'Inventário Arquitetural & Boundaries de Domínio',
    desc: 'Controle de dependências circulares e acoplamento entre domínios via dependency-cruiser.',
    criteria: 'depcruise sem violações não mapeadas; baseline atualizado.',
    agent: '08 — QA & 00 — Coordenador',
    files: '.dependency-cruiser.cjs, .dependency-cruiser-known-violations.json',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: 'Auditado via npm run test:architecture: 1743 módulos verificados com 0 violações.',
    action: 'Manter monitoramento contínuo em PRs.'
  },
  {
    id: 'REQ-00-02',
    wave: '00',
    category: 'Governança & Qualidade',
    name: 'Controle de Hotspots (> 1000 linhas)',
    desc: 'Auditoria de tamanho de arquivos para evitar monolitos e degradação de manutenção.',
    criteria: 'Nenhum arquivo >1000 linhas sem exceção explícita em HOTSPOT_EXCEPTIONS.md.',
    agent: '08 — QA & 00 — Coordenador',
    files: 'scripts/architecture/check-hotspots.ts, HOTSPOT_EXCEPTIONS.md',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: 'Auditado: 1692 arquivos inspecionados. 18 exceções ativas com donos mapeados até 2026-11-30.',
    action: 'Refatorar e modularizar os 18 arquivos em sprints de saneamento dedicadas.'
  },
  {
    id: 'REQ-00-03',
    wave: '00',
    category: 'Governança Git',
    name: 'Isolamento de Branches e Governança de Worktrees',
    desc: 'Políticas de branch por agente, integração em lote e proibição de push direto na main.',
    criteria: 'Branches agente/NN-*, integracao/onda-* com gates a cada 2-3 merges.',
    agent: '00 — Coordenador & 08A — Git/AWS',
    files: 'AGENTS.md, .agents/prompts/00-coordenador.md',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'não aplicáveis',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Ondas integradas via branches próprias, porém houve commits de refinamento acumulados diretamente na main após merge da Onda 05 sem gate PR formal.',
    action: 'Restabelecer proteção de branch rígida no GitHub (branch protection rules).'
  },
  {
    id: 'REQ-00-04',
    wave: '00',
    category: 'Segurança & RLS',
    name: 'Isolamento Multi-Tenant via RLS no PostgreSQL',
    desc: 'Políticas de Row-Level Security garantindo que nenhum tenant acerte dados de outro no DB.',
    criteria: 'RLS habilitado em todas as tabelas de tenant; testes de acesso cruzado rejeitados.',
    agent: '01 — Plataforma & 01A — Confiabilidade',
    files: 'prisma/migrations/*enable_rls*, tests/integration/rls-coverage.test.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'pendente',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Migrations de RLS criadas para tabelas do core, porém serviços recentes da Onda 02/03 operam em Map em memória sem RLS no PostgreSQL.',
    action: 'Criar tabelas Prisma e migrações de RLS para entidades de Grafo, Behavioral e Autópsia.'
  },
  {
    id: 'REQ-00-05',
    wave: '00',
    category: 'Segurança & RBAC',
    name: 'Unificação de Papéis e Permissões (RBAC)',
    desc: 'Controle de acesso granular baseado em papéis (Job Roles) em rotas e ações da API.',
    criteria: 'Nenhuma rota administrativa desprotegida; verificação no composition root.',
    agent: '01 — Plataforma & 15 — Segurança',
    files: 'src/features/job-roles/, src/lib/voice-hub/middlewares/rbac.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'RBAC presente em 41 arquivos, porém algumas rotas legadas utilizam validação permissiva local.',
    action: 'Consolidar middleware RBAC único em todas as 74 rotas documentadas em openapi.yaml.'
  },
  {
    id: 'REQ-00-06',
    wave: '00',
    category: 'Banco de Dados',
    name: 'Prisma Schema & Integridade de Migrations',
    desc: 'Schema declarativo de banco de dados e migrações relacionais auditadas.',
    criteria: '140 migrations válidas, schema sem drift e prisma validate aprovado.',
    agent: '01 — Plataforma, Segurança e Dados',
    files: 'prisma/schema.prisma, prisma/migrations/*',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Auditado: npx prisma validate exit code 0. 140 migrações estruturadas no histórico.',
    action: 'Manter freeze de schema sem handoff formal para o Agente 01.'
  },
  {
    id: 'REQ-00-07',
    wave: '00',
    category: 'Runtime & Filas',
    name: 'Runtime Assíncrono com BullMQ e Redis',
    desc: 'Processamento de tarefas em background, filas distribuídas e resiliência a picos.',
    criteria: 'worker.ts empacotado e rodando separadamente da API HTTP server.ts.',
    agent: '16 — Runtime & Filas',
    files: 'worker.ts, src/lib/queue/index.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'npm run build:worker compila com sucesso gerando dist/worker.cjs (1.0mb) em 105ms.',
    action: 'Garantir monitoramento do Bull-Board com senha e RLS em staging/prod.'
  },
  {
    id: 'REQ-00-08',
    wave: '00',
    category: 'Frontend & PWA',
    name: 'Build de Produção e Precache PWA',
    desc: 'Empacotamento com Vite, esbuild server.cjs e manifesto de serviço offline PWA.',
    criteria: 'npm run build exit 0; dist/sw.js com precache consistente.',
    agent: '02 — Produto & 08 — QA',
    files: 'vite.config.ts, server.ts, scripts/pwa/verify-precache.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: 'npm run build exit 0; Vite transformou 5857 módulos em 1m28s; 181 arquivos precacheados (14.28MB).',
    action: 'Otimizar chunks >500kB (Sparkles, vendor-excel, echarts) com lazy loading adicional.'
  },

  // ONDA 01
  {
    id: 'REQ-01-01',
    wave: '01',
    category: 'Data Flywheel (Eixo 1)',
    name: 'Extração Automática de Objeções Comerciais',
    desc: 'Detecção de objeções em transcrições e reuniões com proveniência e contextualização.',
    criteria: 'Objeções categorizadas e enviadas ao flywheel para análise pedagógica.',
    agent: '07 — IA e Automações',
    files: 'src/features/intelligence/services/commercialLearningFlywheel.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Serviço existe e extrai objeções por regex/heurística, mas promoção assume confiança fixa (0.85) e desfecho único, sem prova estatística com volume mínimo.',
    action: 'Conectar cálculo probabilístico bayesiano e amostragem mínima de 10 ocorrências para promoção.'
  },
  {
    id: 'REQ-01-02',
    wave: '01',
    category: 'Data Flywheel (Eixo 1)',
    name: 'Promoção e Retração no Playbook Comercial',
    desc: 'Ciclo de vida de abordagens comerciais aprendidas: promoção supervisionada e retração.',
    criteria: 'Abordagens ineficazes ou desatualizadas são removidas do Playbook.',
    agent: '07 — IA & 04 — CRM/BI',
    files: 'src/shared/contracts/dataFlywheel.contract.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Contrato prevê promoção/retração, mas operação em memória não propaga deleção para a tabela de Playbook persistida no PostgreSQL.',
    action: 'Implementar adapter Prisma para salvar itens promovidos na tabela PlaybookMatrixItem.'
  },
  {
    id: 'REQ-01-03',
    wave: '01',
    category: 'RAG Híbrido (Eixo 2)',
    name: 'Busca Textual e Recuperação Vetorial Híbrida',
    desc: 'Combinação de busca textual BM25/trigram com busca vetorial por embeddings.',
    criteria: 'Recuperação com peso balanceado e filtro obrigatório por organizationId.',
    agent: '07 — IA & 01 — Plataforma',
    files: 'src/features/knowledge/search.service.ts, vector-support.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Código implementado e com suporte a pgvector, porém validação completa depende de extensão pgvector instalada no PostgreSQL de produção.',
    action: 'Verificar script de migração setup-vector-db.ts em homologação e staging.'
  },
  {
    id: 'REQ-01-04',
    wave: '01',
    category: 'RAG Híbrido (Eixo 2)',
    name: 'Re-Ranking Semântico e Similar Deals',
    desc: 'Algoritmo de reclassificação de relevância e recomendação de negócios semelhantes.',
    criteria: 'Re-ranking aplicado antes do envio de contexto para a LLM.',
    agent: '07 — IA e Automações',
    files: 'src/features/knowledge/services/reranker.service.ts, similarDeals.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: 'Testes unitários dedicados em reranker.service.test.ts passando com sucesso.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-01-05',
    wave: '01',
    category: 'DomainEventMesh (Eixo 3)',
    name: 'Barramento de Eventos Unificado e Versionado',
    desc: 'Eventos de domínio tipados para orquestração assíncrona entre módulos.',
    criteria: 'Contratos estritos em domainEventMesh.contract.ts e publicação observável.',
    agent: '16 — Runtime & 18 — Contratos',
    files: 'src/shared/contracts/domainEventMesh.contract.ts, src/lib/queue/domainEventMesh.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Contratos e serviço de mensageria com tipagem estrita e validação de schema implementados e aprovados nos testes unitários.',
    action: 'Expandir publicação de eventos para os webhooks legados do Bitrix24.'
  },
  {
    id: 'REQ-01-06',
    wave: '01',
    category: 'DomainEventMesh (Eixo 3)',
    name: 'Outbox Transacional e Idempotência Durável',
    desc: 'Persistência de eventos antes do envio externo para evitar perda de dados em falhas.',
    criteria: 'Tabela de Outbox no PostgreSQL e processamento com backoff e retries.',
    agent: '16 — Runtime & 01 — Plataforma',
    files: 'src/lib/queue/domainEventMesh.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'DomainEventMesh opera com emissão de eventos em memória/logs sem tabela de Outbox persistente no banco relacional.',
    action: 'Criar migration Prisma DomainEventOutbox e worker de reenvio de falhas com BullMQ.'
  },
  {
    id: 'REQ-01-07',
    wave: '01',
    category: 'FinOps (Eixo 10)',
    name: 'Cache Semântico e Quotas de Tokens por Tenant',
    desc: 'Redução de custos de inferência de IA com cache e governança de orçamento.',
    criteria: 'Controle de limites por tenant e reuso de respostas para prompts repetidos.',
    agent: '23 — FinOps & 07 — IA',
    files: 'src/lib/ai/finops/tokenQuota.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: 'TokenQuotaService com controle de quotas mensais e testes unitários aprovados.',
    action: 'Integrar cache semântico diretamente no cluster Redis distribuído.'
  },
  {
    id: 'REQ-01-08',
    wave: '01',
    category: 'Privacidade & LGPD (Eixo 16)',
    name: 'Minimização de PII e Tokenização Criptográfica',
    desc: 'Sanitização de dados pessoais antes do envio para APIs externas e LLMs.',
    criteria: 'PII substituída por tokens opacos reversíveis apenas internamente.',
    agent: '21 — Privacidade & 15 — Segurança',
    files: 'src/lib/security/piiTokenizer.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Testes unitários em tests/unit/security/piiTokenizer.service.test.ts (4 testes) aprovados.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-01-09',
    wave: '01',
    category: 'Privacidade & LGPD (Eixo 16)',
    name: 'Cadeia de Auditoria de Consentimento (Audit Chain)',
    desc: 'Registro criptográfico imutável de termos de consentimento e opt-ins.',
    criteria: 'Hash encadeado em blocos sha-256 e verificação de integridade da cadeia.',
    agent: '21 — Privacidade & 15 — Segurança',
    files: 'src/lib/security/consentAuditChain.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Algoritmo criptográfico validado em testes unitários, mas a cadeia reside em memória e se perde no restart da API.',
    action: 'Persistir blocos da cadeia de consentimento em tabela PostgreSQL protegida por RLS.'
  },

  // ONDA 02
  {
    id: 'REQ-02-01',
    wave: '02',
    category: 'Grafo de Contas (Eixo 6)',
    name: 'Grafo Semântico de Contas, Decisores e Relações B2B',
    desc: 'Mapeamento de organogramas, comitê de compras e relacionamentos inter-empresas.',
    criteria: 'Descoberta de multi-threading e conexões formais/inferidas com scoring.',
    agent: '04 — CRM/BI & 07 — IA',
    files: 'src/features/knowledge/services/accountKnowledgeGraph.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Lógica algorítmica e testes em tests/unit/knowledge/accountKnowledgeGraph.service.test.ts (4 testes) aprovados, mas nós e arestas residem em Map em memória.',
    action: 'Mapear entidade AccountKnowledgeNode e arestas no schema Prisma.'
  },
  {
    id: 'REQ-02-02',
    wave: '02',
    category: 'Swarm Tático (Eixo 11)',
    name: 'Agente Detetive de Conta',
    desc: 'Agente autônomo que investiga histórico, faturamento e riscos antes de calls.',
    criteria: 'Registro no catálogo de agentes e geração de dossiê investigativo.',
    agent: '13 — Swarm & 07 — IA',
    files: 'src/features/intelligence/agents/tactical/accountDetective.agent.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Implementação existe com prompt e contrato em tacticalSwarm.contract.ts, mas endpoints dedicados de invocação na API REST pública estão ausentes.',
    action: 'Expor rota REST POST /api/v1/intelligence/agents/account-detective/investigate.'
  },
  {
    id: 'REQ-02-03',
    wave: '02',
    category: 'Swarm Tático (Eixo 11)',
    name: 'Agente Guardião de Promessas',
    desc: 'Monitora compromissos comerciais verbais e evita promessas técnicas irrealizáveis.',
    criteria: 'Identificação de promessas de prazo/preço em propostas e mensagens.',
    agent: '13 — Swarm & 07 — IA',
    files: 'src/features/intelligence/agents/tactical/promiseGuardian.agent.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Testes unitários aprovados, mas tarefas de confirmação são geradas como UUIDs em memória sem registrar tarefa no CRM.',
    action: 'Vincular compromissos aprovados à tabela Task do CRM relacional.'
  },
  {
    id: 'REQ-02-04',
    wave: '02',
    category: 'Swarm Tático (Eixo 11)',
    name: 'Agente Advogado do Diabo',
    desc: 'Simula objeções agressivas e contrapontos de concorrentes antes do fechamento.',
    criteria: 'Geração de stress test de propostas comerciais.',
    agent: '13 — Swarm & 07 — IA',
    files: 'src/features/intelligence/agents/tactical/devilsAdvocate.agent.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Lógica e testes unitários aprovados; geração sintética funcional, mas dependente de fallback local quando provider LLM não configurado.',
    action: 'Conectar provider Groq/OpenAI/Gemini com timeout resiliente de 3000ms.'
  },
  {
    id: 'REQ-02-05',
    wave: '02',
    category: 'Market Sensing (Eixo 12)',
    name: 'Monitoramento de Sinais Externos e Notícias de Mercado',
    desc: 'Captura de sinais de expansão, M&A e mudanças executivas para timing de abordagem.',
    criteria: 'Ingestão de feeds externos e correlação com contas do CRM.',
    agent: '05 — Prospecção & 07 — IA',
    files: 'src/features/market-intelligence/server/marketSensing.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P2',
    finding: 'Testes em tests/unit/market-intelligence/marketSensing.service.test.ts aprovados, mas coleta usa fixtures estáticas e armazenamento volátil.',
    action: 'Integrar crawler RSS e API de notícias reais com sanitização de fontes.'
  },
  {
    id: 'REQ-02-06',
    wave: '02',
    category: 'Win-Loss Autopsy (Eixo 19)',
    name: 'Autópsia Profunda de Negócios Ganhos e Perdidos',
    desc: 'Análise post-mortem de oportunidades com explicabilidade e hipóteses vs fatos.',
    criteria: 'Relatório estruturado com causa raiz de perda e aprendizados para o Playbook.',
    agent: '04 — CRM/BI & 07 — IA',
    files: 'src/features/intelligence/services/winLossAutopsy.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Lógica analítica completa em 455 linhas de código testadas, mas relatórios são persistidos em Map em memória sem tabela Prisma.',
    action: 'Criar migration Prisma WinLossReport e conectar ao gatilho de mudança de status no pipeline CRM.'
  },

  // ONDA 03
  {
    id: 'REQ-03-01',
    wave: '03',
    category: 'SDR Autônomo (Eixo 7)',
    name: 'SDR Autônomo com Discagem Ativa por Voz',
    desc: 'Agente que realiza chamadas de qualificação por voz e agenda reuniões.',
    criteria: 'Discagem conectada à telefonia e integração com agenda.',
    agent: '12 — Voz & 07 — IA',
    files: 'src/features/ai-voice/server/autonomousSdr.service.ts',
    status: 'SOMENTE BACKEND',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Testes unitários aprovados em testes sintéticos (autonomousSdr.service.test.ts), mas chamada real utiliza simulação sem tronco SIP/WebRTC externo ativo.',
    action: 'Conectar gateway Asterisk/3CX/Twilio para chamadas em ambiente staging.'
  },
  {
    id: 'REQ-03-02',
    wave: '03',
    category: 'Cadência Multicanal (Eixo 7)',
    name: 'Motor Adaptativo de Cadência Multicanal',
    desc: 'Alternância inteligente entre canais (email, WhatsApp, telefone) baseada em engajamento.',
    criteria: 'Toques adaptados de acordo com sinais de abertura e respostas do lead.',
    agent: '17 — Cadência & 06 — Integrações',
    files: 'src/features/cadence/services/adaptiveMultichannelCadence.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Serviço implementado e validado com testes unitários em adaptiveMultichannelCadence.service.test.ts.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-03-03',
    wave: '03',
    category: 'Privacidade & Cadência (Eixo 7)',
    name: 'Opt-Out Unificado e Respeito a Bloqueios',
    desc: 'Bloqueio imediato e transversal de contatos após solicitação de opt-out em qualquer canal.',
    criteria: 'Nenhuma mensagem adicional disparada após registro de descadastro.',
    agent: '21 — Privacidade & 17 — Cadência',
    files: 'src/features/cadence/services/adaptiveMultichannelCadence.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Testes unitários validam bloqueio estrito em múltiplos canais após chamada de optOut.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-03-04',
    wave: '03',
    category: 'Propostas Comerciais (Eixo 7)',
    name: 'Rascunho Automático de Propostas & Assinatura Digital',
    desc: 'Geração de PDF/HTML de proposta a partir de dados da oportunidade com link de aceite.',
    criteria: 'Criação de proposta versionada com rastreamento de abertura.',
    agent: '04 — CRM/BI & 18 — Contratos',
    files: 'src/features/proposals/services/proposalAutomation.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Geração de proposta e testes unitários aprovados, mas provedor externo de assinatura digital opera com mock sintético.',
    action: 'Integrar webhook de webhook de assinatura digital externa (ex: Clicksign/DocuSign).'
  },
  {
    id: 'REQ-03-05',
    wave: '03',
    category: 'Behavioral Engine (Eixo 4)',
    name: 'Motor Comportamental e Detecção de Gargalos',
    desc: 'Análise de métricas do vendedor e emissão de missões de coaching adaptativo.',
    criteria: 'Identificação de taxas baixas de conversão em etapas específicas e emissão de XP.',
    agent: '04 — CRM/BI & 02 — Produto',
    files: 'src/features/gamification/services/behavioralEngine.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: '504 linhas de implementação testadas em tests/unit/gamification/behavioralEngine.service.test.ts (8 testes aprovados).',
    action: 'Persistir saldo de XP em tabela Prisma GamificationUserStats.'
  },
  {
    id: 'REQ-03-06',
    wave: '03',
    category: 'Previsibilidade Financeira (Eixo 17/20)',
    name: 'Simulador de ROI e Realização de Valor',
    desc: 'Calculadora de retorno sobre investimento B2B e acompanhamento pós-venda de valor prometido.',
    criteria: 'Cálculo de payback, VPL e geração de business case em PDF.',
    agent: '04 — CRM/BI',
    files: 'src/features/commercial-intelligence/services/roiSimulator.service.ts, valueRealization.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: 'Testes unitários aprovados em roiSimulator.service.test.ts e valueRealization.service.test.ts.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-03-07',
    wave: '03',
    category: 'Previsibilidade Financeira (Eixo 20)',
    name: 'Revenue Oracle (Previsão P10/P50/P90 e Backtest)',
    desc: 'Motor estatístico de previsão de receitas multi-horizonte com distribuição de probabilidade.',
    criteria: 'Projeções derivadas de histórico real e métricas de erro (MAPE) calculadas.',
    agent: '04 — CRM/BI',
    files: 'src/features/commercial-intelligence/services/predictiveRevenueOracle.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Serviço existe e passa nos testes de contrato, mas valores 145k/485k/980k e MAPE 8.4% estão codificados como constantes sem cálculo sobre dados reais do banco.',
    action: 'Implementar cálculo estatístico de regressão temporal e desvio padrão com dados reais da tabela Lead/Deal.'
  },
  {
    id: 'REQ-03-08',
    wave: '03',
    category: 'Previsibilidade Financeira (Eixo 20)',
    name: 'Cockpit Executivo de Receita & Aprovação Humana',
    desc: 'Painel visual de simulação What-If e rebalanceamento de contas sob aprovação.',
    criteria: 'Rebalanceamento executado somente após clique de aprovação com persistência no DB.',
    agent: '02 — Produto & 04 — CRM/BI',
    files: 'src/features/predictability/components/PredictiveRevenueCockpit.tsx',
    status: 'SOMENTE FRONTEND',
    integration: 'ausente',
    tests: 'não executados',
    env: 'desenvolvimento',
    security: 'pendente',
    readiness: 'bloqueada',
    criticality: 'P1',
    finding: 'UI existe com gráficos de projeção, mas botão de aprovação dispara apenas setState e toast sem chamar endpoint backend para rebalancear contas.',
    action: 'Criar endpoint POST /api/v1/predictability/rebalance/approve e integrar chamada no frontend.'
  },

  // ONDA 04
  {
    id: 'REQ-04-01',
    wave: '04',
    category: 'Voz Bimodal (Eixo 5)',
    name: 'Streaming Bidirecional de Voz com Interrupção (Barge-In)',
    desc: 'Canal de voz contínuo via WebSocket com interrupção instantânea ao falar o usuário.',
    criteria: 'Latência de barge-in < 100ms; cancelamento imediato de geração de áudio.',
    agent: '12 — Voz & 07 — IA',
    files: 'src/features/ai-voice/server/bimodalLiveVoice.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Testes unitários em tests/unit/ai-voice/bimodalLiveVoice.service.test.ts (6 testes) comprovam interrupção em 85ms e fallback resiliente. Falta teste com servidor WebSocket real em execução.',
    action: 'Conectar gateway WebSocket em ambiente staging para teste de tráfego de áudio PCM.'
  },
  {
    id: 'REQ-04-02',
    wave: '04',
    category: 'Digital Twins (Eixo 8)',
    name: 'Gêmeos Digitais Metodológicos de Vendedores',
    desc: 'Extração consentida de padrões dos melhores vendedores para mentoria sintética.',
    criteria: 'Geração de orientações metodológicas sem expor a identidade pessoal do vendedor.',
    agent: '07 — IA & 02 — Produto',
    files: 'src/features/intelligence/services/methodologicalDigitalTwin.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: 'Testes unitários aprovados em tests/unit/intelligence/methodologicalDigitalTwin.service.test.ts.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-04-03',
    wave: '04',
    category: 'Mobile Edge AI (Eixo 9)',
    name: 'Briefings Comerciais Offline e Expurgo no Logout',
    desc: 'Cache criptografado de dados do cliente no dispositivo móvel com expurgo estrito.',
    criteria: 'Nenhum briefing persiste no dispositivo após o encerramento da sessão.',
    agent: '09 — Mobile & 15 — Segurança',
    files: 'src/features/mobile/mobileEdgeAi.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Testes unitários em tests/unit/mobile/mobileEdgeAi.service.test.ts (6 testes) comprovam expurgo completo de chaves e briefings no logout.',
    action: 'Validar build nativo Android via scripts de sincronização do Capacitor.'
  },
  {
    id: 'REQ-04-04',
    wave: '04',
    category: 'Mobile Edge AI (Eixo 9)',
    name: 'Geofencing Consentido e Proteção Anti-Vigilância',
    desc: 'Sugestão de briefing de visita apenas com consentimento prévio e sem rastreamento contínuo.',
    criteria: 'Proibição de captura de GPS em segundo plano sem ação ativa do vendedor.',
    agent: '09 — Mobile & 21 — Privacidade',
    files: 'src/features/mobile/mobileEdgeAi.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Testes unitários comprovam que requisições de geofencing sem opt-in explícito são rejeitadas com erro de permissão.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-04-05',
    wave: '04',
    category: 'War Room Arena (Eixo 14)',
    name: 'Arena de Resolução de Objeções em Duelos',
    desc: 'Gamificação cooperativa para treinamento de superação de objeções complexas.',
    criteria: 'IA avaliadora ética com feedback construtivo e atribuição de pontuação.',
    agent: '02 — Produto & 03 — Design',
    files: 'src/features/gamification/services/warRoomArena.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: 'Implementação de 301 linhas e testes unitários em warRoomArena.service.test.ts (4 testes) aprovados.',
    action: 'Persistir histórico de duelos em tabela relacional.'
  },
  {
    id: 'REQ-04-06',
    wave: '04',
    category: 'Shadow Copywriting (Eixo 15)',
    name: 'Assistente Estilístico com Trava Humana de Envio',
    desc: 'Redação de mensagens no tom de voz do vendedor, sem jamais disparar mensagens sem clique humano.',
    criteria: 'Proibição inviolável de envio autônomo e de adulteração de ofertas/preços.',
    agent: '04 — CRM/BI & 07 — IA',
    files: 'src/features/social-selling/server/shadowCopywriting.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Testes unitários em tests/unit/social-selling/shadowCopywriting.service.test.ts comprovam bloqueio de auto-envio e integridade de preços.',
    action: 'Nenhuma ação impeditiva.'
  },

  // ONDA 05
  {
    id: 'REQ-05-01',
    wave: '05',
    category: 'Análise Conversacional (Eixo 13)',
    name: 'Métricas Objetivas: Talk-to-Listen Ratio e Turnos',
    desc: 'Cálculo da proporção de fala entre vendedor e cliente e identificação de monólogos.',
    criteria: 'Cálculo matemático sobre marcas de tempo sem inferência de emoção.',
    agent: '12 — Voz & 07 — IA',
    files: 'src/features/ai-voice/server/conversationalIntelligence.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Implementação em 451 linhas e testes unitários em conversationalIntelligence.service.test.ts (6 testes) aprovados com sucesso.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-05-02',
    wave: '05',
    category: 'Análise Conversacional (Eixo 13)',
    name: 'Salvaguarda Ética: Proibição de Inferência Emocional ou Médica',
    desc: 'Proibição em código de detecção de estresse, ansiedade, burnout ou doenças mentais.',
    criteria: 'Nenhum campo ou métrica de saúde psicológica no contrato ou retorno.',
    agent: '12 — Voz & 21 — Privacidade',
    files: 'src/shared/contracts/conversationalCoaching.contract.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P0',
    finding: 'Auditoria de código e contratos comprova total ausência de atributos de emoção/psicologia; conformidade estrita com diretriz ética de AGENTS.md.',
    action: 'Manter linter/ast-check proibindo a inclusão desses termos em PRs.'
  },
  {
    id: 'REQ-05-03',
    wave: '05',
    category: 'Bem-Estar Operacional (Eixo 18)',
    name: 'Prevenção de Sobrecarga e Sugestão de Pausas',
    desc: 'Alerta privativo ao vendedor após 3 reuniões consecutivas sugerindo intervalo.',
    criteria: 'Dados de pausa pertencem exclusivamente ao vendedor, sem acesso punitivo da gestão.',
    agent: '04 — CRM/BI & 21 — Privacidade',
    files: 'src/features/calendar/services/workloadWellbeing.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Implementação de 378 linhas e testes unitários em workloadWellbeing.service.test.ts (6 testes) aprovados.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-05-04',
    wave: '05',
    category: 'Bem-Estar Operacional (Eixo 18)',
    name: 'Anonimização de Relatórios de Carga com K-Anonymity (k=5)',
    desc: 'Relatórios consolidados para gerência exigem no mínimo 5 vendedores distintos na amostra.',
    criteria: 'Se amostra < 5 vendedores, resultado suprimido para impedir dedução individual.',
    agent: '21 — Privacidade & 04 — CRM/BI',
    files: 'src/features/calendar/services/workloadWellbeing.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Código verifica total de reuniões/registros, mas deve garantir explicitamente 5 userIds distintos na agregação para cumprir k-anonymity estrito.',
    action: 'Ajustar agregação para Set(records.map(r => r.userId)).size >= 5 antes de emitir relatório.'
  },
  {
    id: 'REQ-05-05',
    wave: '05',
    category: 'Roleplay Multimodal (Evolução 17)',
    name: 'Simulador com Personas B2B Dinâmicas (CFO, CTO, COO)',
    desc: 'Treinamento de vendas multimodal com simulação de compradores executivos exigentes.',
    criteria: 'Personas reagem com objeções de preço, segurança e prazo conforme framework SPIN/BANT.',
    agent: '07 — IA & 02 — Produto',
    files: 'src/features/roleplay/services/multimodalRoleplaySimulator.service.ts',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P2',
    finding: '307 linhas de implementação testadas em tests/unit/roleplay/multimodalRoleplaySimulator.service.test.ts.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-05-06',
    wave: '05',
    category: 'Resiliência Multi-Região (Evolução 19)',
    name: 'Failover Automatizado entre sa-east-1 e us-east-1',
    desc: 'Detecção de degradação de tráfego e comutação automática de endpoints de IA e voz.',
    criteria: 'Failover simulado em menos de 500ms com preservação de estado da sessão.',
    agent: '10 — Infraestrutura & 16 — Runtime',
    files: 'src/lib/runtime/services/multiRegionResilience.service.ts',
    status: 'IMPLEMENTADO PARCIALMENTE',
    integration: 'parcial',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'condicionada',
    criticality: 'P1',
    finding: 'Testes unitários em multiRegionResilience.service.test.ts aprovam simulação de failover em 280ms, mas chaveamento real de DNS/Envoy em nuvem não foi testado ao vivo.',
    action: 'Executar rehearsal de failover em ambiente AWS staging.'
  },
  {
    id: 'REQ-05-07',
    wave: '05',
    category: 'Governança & SBOM (Evolução 20)',
    name: 'SBOM CycloneDX & Monitoramento de Vulnerabilidades',
    desc: 'Geração reprodutível de manifesto de software e auditoria automatizada de waivers.',
    criteria: 'cyclonedx-npm gera sbom.cdx.json; check-audit-waivers valida dependências.',
    agent: '15 — Segurança & 08 — QA',
    files: 'package.json, scripts/security/check-audit-waivers.ts, sbom.cdx.json',
    status: 'IMPLEMENTADO E VALIDADO',
    integration: 'conectada',
    tests: 'aprovados',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'liberável',
    criticality: 'P1',
    finding: 'Script security:audit-waivers exit code 0 sem achados HIGH/CRITICAL.',
    action: 'Nenhuma ação impeditiva.'
  },
  {
    id: 'REQ-05-08',
    wave: '05',
    category: 'Qualidade & Estilo',
    name: 'Conformidade de Formatação de Código (Biome)',
    desc: 'Checagem estrita de formatação de código em todo o repositório.',
    criteria: 'npm run format:check exit code 0.',
    agent: '08 — QA e Release',
    files: 'src/features/ai-voice/server/conversationalIntelligence.service.ts, src/shared/contracts/conversationalCoaching.contract.ts',
    status: 'COM FALHA',
    integration: 'conectada',
    tests: 'falhos',
    env: 'desenvolvimento',
    security: 'aprovada',
    readiness: 'bloqueada',
    criticality: 'P1',
    finding: 'Execução real de npm run format:check falhou com código 1 em 14 arquivos da Onda 05. Divergência direta com pareceres anteriores.',
    action: 'Executar npx biome format --write nos 14 arquivos afetados em PR formal de QA.'
  }
];

// 3. Cálculos da Auditoria Forense
const totalReqs = requirementsMatrix.length;
const statusCounts = {};
requirementsMatrix.forEach(r => {
  statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
});

const validatedCount = statusCounts['IMPLEMENTADO E VALIDADO'] || 0;
const partialCount = statusCounts['IMPLEMENTADO PARCIALMENTE'] || 0;
const failCount = statusCounts['COM FALHA'] || 0;
const backendOnlyCount = statusCounts['SOMENTE BACKEND'] || 0;
const frontendOnlyCount = statusCounts['SOMENTE FRONTEND'] || 0;
const blockedCount = statusCounts['BLOQUEADO'] || 0;
const notVerifiedCount = statusCounts['NÃO VERIFICADO'] || 0;
const notImplementedCount = statusCounts['NÃO IMPLEMENTADO'] || 0;

const p0Count = requirementsMatrix.filter(r => r.criticality === 'P0' && r.status !== 'IMPLEMENTADO E VALIDADO').length;
const p1Count = requirementsMatrix.filter(r => r.criticality === 'P1' && r.status !== 'IMPLEMENTADO E VALIDADO').length;

const verifiedCount = totalReqs - notVerifiedCount;
const auditCoveragePercent = ((verifiedCount / totalReqs) * 100).toFixed(1);
const validatedPercent = ((validatedCount / totalReqs) * 100).toFixed(1);
const validatedPlusPartialPercent = (((validatedCount + partialCount) / totalReqs) * 100).toFixed(1);

// Divergências Identificadas
const divergences = [
  {
    id: 'DIV-01',
    title: 'Format Check da Onda 05 declarado como Aprovado, mas na Realidade Falha',
    declared: 'Parecer do Agente 24 (19/10/2026) reportou: "npm run format:check | 1996 arquivos verificados, 0 pendências | APROVADO".',
    real: 'Execução forense real do comando em 20/10/2026 resultou em exit code 1 com 14 erros de formatação no Biome em arquivos de serviço e contratos da Onda 05.',
    doc: '.agents/reviews/24-onda-05-revisao-independente.md',
    severity: 'P1 — Alto',
    action: 'Executar npm run format no branch isolado de QA e submeter nova validação.'
  },
  {
    id: 'DIV-02',
    title: 'Persistência Real declarada como Pronta, mas Serviços Operam em Memória (Map/Set)',
    declared: 'Relatórios executivos das Ondas 02 e 03 declararam: "Grafo de Contas, Behavioral Engine, Autópsia Win-Loss e Swarm Tático totalmente integrados e persistidos".',
    real: 'Inspeção do código-fonte revelou que accountKnowledgeGraph.service.ts, behavioralEngine.service.ts e winLossAutopsy.service.ts armazenam estado em Map/Set locais em memória, perdendo dados ao reiniciar a API.',
    doc: '.agents/runs/programa-consolidado-ondas-00-a-05.md',
    severity: 'P1 — Alto',
    action: 'Agente 01 deve criar tabelas Prisma e repositórios PostgreSQL para substituir as coleções voláteis.'
  },
  {
    id: 'DIV-03',
    title: 'Revenue Oracle & Backtest rotulados como Calibrados usam Constantes Fixas',
    declared: 'Relatório declarou: "Backtest calibrado com MAPE 8.4% em 142 amostras históricas com projeções P10/P50/P90 baseadas em regressão".',
    real: 'predictiveRevenueOracle.service.ts codifica 145000, 485000, 980000 e MAPE 8.4% como constantes estáticas sem efetuar regressão estatística sobre o histórico real.',
    doc: 'src/features/commercial-intelligence/services/predictiveRevenueOracle.service.ts',
    severity: 'P1 — Alto',
    action: 'Agente 04 deve implementar cálculo estatístico real sobre negócios passados do banco de dados.'
  },
  {
    id: 'DIV-04',
    title: 'Aprovação de Rebalanceamento no Cockpit é apenas Frontend (Sem Backend)',
    declared: 'Relatório declarou: "Cockpit Executivo com rebalanceamento supervisionado de carteiras sob aprovação humana obrigatória".',
    real: 'PredictiveRevenueCockpit.tsx apenas atualiza estado local React (useState) e exibe toast de sucesso; nenhuma chamada de API é disparada para alterar o responsável no CRM.',
    doc: 'src/features/predictability/components/PredictiveRevenueCockpit.tsx',
    severity: 'P1 — Alto',
    action: 'Agente 02 e 18 devem criar a rota POST /api/v1/predictability/rebalance/approve e integrar o botão.'
  },
  {
    id: 'DIV-05',
    title: 'Execução de SDR e Assinatura Digital são Simulações Sintéticas',
    declared: 'Relatório declarou: "SDR Autônomo com Discagem Ativa por Voz e Propostas Comerciais com Assinatura Digital integrados".',
    real: 'autonomousSdr.service.ts e proposalAutomation.service.ts geram links e IDs UUID sintéticos em memória sem conexão ativa com gateways de telefonia ou provedores de assinatura.',
    doc: 'src/features/ai-voice/server/autonomousSdr.service.ts',
    severity: 'P1 — Alto',
    action: 'Documentar formalmente como ambiente de homologação simulado e planejar conectores de produção.'
  }
];

// Backlog Priorizado de Correções
const remediationBacklog = [
  { priority: 'P1', code: 'REMED-01', title: 'Correção dos 14 Erros de Formatação Biome da Onda 05', owner: 'Agente 08 — QA', files: 'conversationalIntelligence.service.ts, conversationalCoaching.contract.ts', effort: 'Baixo (15 min)' },
  { priority: 'P1', code: 'REMED-02', title: 'Persistência Relacional Prisma para Grafo de Contas e Autópsia', owner: 'Agente 01 — Plataforma & Dados', files: 'prisma/schema.prisma, accountKnowledgeGraph.service.ts, winLossAutopsy.service.ts', effort: 'Médio (2 dias)' },
  { priority: 'P1', code: 'REMED-03', title: 'Cálculo Estatístico Real no Revenue Oracle (Remoção de Constantes)', owner: 'Agente 04 — CRM & BI', files: 'predictiveRevenueOracle.service.ts', effort: 'Médio (1 dia)' },
  { priority: 'P1', code: 'REMED-04', title: 'Endpoint e Persistência de Aprovação de Rebalanceamento', owner: 'Agente 02 — Produto & 04 — CRM', files: 'PredictiveRevenueCockpit.tsx, predictive.routes.ts', effort: 'Baixo (4 horas)' },
  { priority: 'P1', code: 'REMED-05', title: 'Outbox Transacional e Idempotência Durável no DomainEventMesh', owner: 'Agente 16 — Runtime & 01 — Plataforma', files: 'domainEventMesh.service.ts, prisma/schema.prisma', effort: 'Médio (2 dias)' },
  { priority: 'P2', code: 'REMED-06', title: 'Persistência Durável da Cadeia de Consentimento Criptográfica', owner: 'Agente 21 — Privacidade & 15 — Segurança', files: 'consentAuditChain.service.ts', effort: 'Médio (1 dia)' },
  { priority: 'P2', code: 'REMED-07', title: 'Validação Estrita de K-Anonymity (5 Vendedores Distintos)', owner: 'Agente 21 — Privacidade & 04 — CRM', files: 'workloadWellbeing.service.ts', effort: 'Baixo (2 horas)' },
  { priority: 'P2', code: 'REMED-08', title: 'Otimização de Chunks Grandes no Bundle de Frontend (>500kB)', owner: 'Agente 02 — Produto & 08 — QA', files: 'vite.config.ts, src/App.tsx', effort: 'Médio (1 dia)' }
];

console.log('Requirements total:', totalReqs);
console.log('Validated:', validatedCount, 'Partial:', partialCount, 'Failures:', failCount);

// 4. Montagem do HTML Completo
const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BIRTH HUB 360° — Auditoria Forense Integral das 6 Ondas</title>
  <style>
    :root {
      --bg-dark: #070B14;
      --bg-card: #0D1527;
      --bg-surface: #131E36;
      --border-line: #1E2E4E;
      --brand-primary: #F59E0B;
      --brand-accent: #0D9488;
      --brand-indigo: #6366F1;
      --text-main: #F3F4F6;
      --text-muted: #9CA3AF;
      --status-pass: #10B981;
      --status-warn: #F59E0B;
      --status-fail: #EF4444;
      --status-block: #8B5CF6;
      --status-info: #3B82F6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      padding: 24px;
    }
    .container { max-width: 1440px; margin: 0 auto; }
    
    /* Header */
    header {
      background: linear-gradient(135deg, #0D1527 0%, #15203B 100%);
      border: 1px solid var(--border-line);
      border-radius: 12px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
    }
    .brand-title {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo-badge {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--brand-primary) 0%, #B45309 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 20px;
      color: #000;
    }
    h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #FFF; }
    .subtitle { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
    
    .verdict-badge {
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .verdict-staging {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid var(--brand-primary);
      color: var(--brand-primary);
    }
    .verdict-prod {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--status-fail);
      color: var(--status-fail);
      margin-left: 8px;
    }
    
    .header-metadata {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      background: rgba(7, 11, 20, 0.6);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 13px;
    }
    .meta-item strong { color: var(--brand-primary); display: block; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
    
    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--bg-card);
      border: 1px solid var(--border-line);
      border-radius: 10px;
      padding: 18px;
      position: relative;
      overflow: hidden;
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 4px; height: 100%;
      background: var(--brand-primary);
    }
    .metric-card.pass::before { background: var(--status-pass); }
    .metric-card.fail::before { background: var(--status-fail); }
    .metric-card.warn::before { background: var(--status-warn); }
    .metric-card.indigo::before { background: var(--brand-indigo); }
    
    .metric-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
    .metric-value { font-size: 28px; font-weight: 800; color: #FFF; }
    .metric-foot { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
    
    /* Tabs Navigation */
    .tabs-nav {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border-line);
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    .tab-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-line);
      color: var(--text-muted);
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }
    .tab-btn:hover { color: #FFF; background: var(--bg-surface); }
    .tab-btn.active {
      color: #000;
      background: var(--brand-primary);
      border-color: var(--brand-primary);
    }
    
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }
    
    /* Cards & Containers */
    .content-card {
      background: var(--bg-card);
      border: 1px solid var(--border-line);
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #FFF;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    /* Tables */
    .table-responsive { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      background: var(--bg-surface);
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border-line);
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: var(--text-main);
      vertical-align: top;
    }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    
    /* Badges */
    .pill {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .pill-pass { background: rgba(16, 185, 129, 0.2); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .pill-fail { background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .pill-warn { background: rgba(245, 158, 11, 0.2); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .pill-block { background: rgba(139, 92, 246, 0.2); color: #A78BFA; border: 1px solid rgba(139, 92, 246, 0.4); }
    .pill-info { background: rgba(59, 130, 246, 0.2); color: #60A5FA; border: 1px solid rgba(59, 130, 246, 0.4); }
    
    /* Filter Bar */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
      background: var(--bg-surface);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--border-line);
      align-items: center;
    }
    .filter-input {
      flex: 1;
      min-width: 240px;
      background: var(--bg-dark);
      border: 1px solid var(--border-line);
      color: #FFF;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
    }
    .filter-select {
      background: var(--bg-dark);
      border: 1px solid var(--border-line);
      color: #FFF;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-action {
      background: var(--bg-dark);
      border: 1px solid var(--border-line);
      color: #FFF;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: var(--brand-primary);
      color: #000;
      border-color: var(--brand-primary);
    }
    
    /* Accordion items */
    .req-item {
      background: var(--bg-surface);
      border: 1px solid var(--border-line);
      border-radius: 8px;
      margin-bottom: 10px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .req-item:hover { border-color: rgba(245, 158, 11, 0.4); }
    .req-header {
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      gap: 12px;
    }
    .req-title-area {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .req-id { font-family: monospace; font-weight: 700; color: var(--brand-primary); font-size: 12px; }
    .req-name { font-weight: 700; color: #FFF; font-size: 14px; }
    .req-details {
      padding: 16px 18px;
      background: rgba(7, 11, 20, 0.5);
      border-top: 1px solid var(--border-line);
      display: none;
      font-size: 13px;
    }
    .req-details.open { display: block; }
    
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
      margin-top: 10px;
    }
    .detail-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 12px;
      border-radius: 6px;
    }
    .detail-box strong { color: var(--text-muted); font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 4px; }
    
    /* SVG Charts */
    .chart-container {
      margin: 20px 0;
      background: rgba(7, 11, 20, 0.4);
      padding: 18px;
      border-radius: 8px;
      border: 1px solid var(--border-line);
    }
    
    /* Print Styles */
    @media print {
      body { background: #FFF !important; color: #000 !important; padding: 0 !important; }
      header, .content-card, .metric-card, .req-item { background: #FFF !important; color: #000 !important; border: 1px solid #CCC !important; box-shadow: none !important; }
      .tabs-nav, .filter-bar, .btn-action { display: none !important; }
      .tab-pane { display: block !important; margin-bottom: 30px; }
      .req-details { display: block !important; background: #FAFAFA !important; }
      h1, h2, .metric-value, .req-name { color: #000 !important; }
      .pill { border: 1px solid #888 !important; color: #000 !important; background: #EEE !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Executivo -->
    <header>
      <div class="header-top">
        <div class="brand-title">
          <div class="brand-logo-badge">360</div>
          <div>
            <h1>BIRTH HUB 360° — AUDITORIA FORENSE INTEGRAL DAS 6 ONDAS</h1>
            <div class="subtitle">Verificação Real de Implementação, Contratos, Banco de Dados, Testes e Prontidão de Release</div>
          </div>
        </div>
        <div>
          <span class="verdict-badge verdict-staging">STAGING: GO CONDICIONAL</span>
          <span class="verdict-badge verdict-prod">PRODUÇÃO: NO-GO</span>
        </div>
      </div>
      
      <div class="header-metadata">
        <div class="meta-item">
          <strong>Data da Auditoria</strong>
          20 de Outubro de 2026 — 18:45 BRT
        </div>
        <div class="meta-item">
          <strong>Repositório & Base</strong>
          MarksNN/Birthub-360 (main)
        </div>
        <div class="meta-item">
          <strong>SHA Auditado</strong>
          <code style="color:#FFF;">281cfcd3d4dbd0d9</code>
        </div>
        <div class="meta-item">
          <strong>Coordenador & Auditor</strong>
          Agente 00 & Agente 24 (Independente)
        </div>
        <div class="meta-item">
          <strong>Sincronização com Ondas</strong>
          Main +15 commits à frente de integracao/onda-05
        </div>
        <div class="meta-item">
          <strong>Destino Obrigatório</strong>
          Área de Trabalho (C:\\Users\\Marks\\Desktop)
        </div>
      </div>
    </header>

    <!-- Cards de Métricas e Indicadores -->
    <div class="metrics-grid">
      <div class="metric-card indigo">
        <div class="metric-label">Requisitos Totais Auditados</div>
        <div class="metric-value">${totalReqs}</div>
        <div class="metric-foot">Ondas 00 a 05 + 20 Eixos + 6 Capacidades</div>
      </div>
      <div class="metric-card pass">
        <div class="metric-label">Implementados & Validados</div>
        <div class="metric-value">${validatedCount}</div>
        <div class="metric-foot">${validatedPercent}% com código, contrato e teste comprovados</div>
      </div>
      <div class="metric-card warn">
        <div class="metric-label">Implementados Parcialmente</div>
        <div class="metric-value">${partialCount}</div>
        <div class="metric-foot">Operam em memória ou faltam requisitos ponta a ponta</div>
      </div>
      <div class="metric-card fail">
        <div class="metric-label">Falhas / Divergências</div>
        <div class="metric-value">${failCount + divergences.length}</div>
        <div class="metric-foot">14 erros de formatação + 5 divergências com relatórios</div>
      </div>
      <div class="metric-card fail">
        <div class="metric-label">Bloqueadores Críticos (P0/P1)</div>
        <div class="metric-value">${p0Count + p1Count}</div>
        <div class="metric-foot">${p0Count} P0 (Ética/Segurança) | ${p1Count} P1 (Persistência/Gates)</div>
      </div>
      <div class="metric-card pass">
        <div class="metric-label">Cobertura da Auditoria</div>
        <div class="metric-value">${auditCoveragePercent}%</div>
        <div class="metric-foot">Requisitos efetivamente inspecionados no código</div>
      </div>
    </div>

    <!-- Navegação por Abas -->
    <div class="tabs-nav">
      <button class="tab-btn active" onclick="openTab('visao-executiva')">1. Visão Executiva</button>
      <button class="tab-btn" onclick="openTab('divergencias')">2. Divergências Forenses (Obrigatório)</button>
      <button class="tab-btn" onclick="openTab('checklist-requisitos')">3. Matriz Completa de Requisitos</button>
      <button class="tab-btn" onclick="openTab('quality-gates')">4. Quality Gates Reais</button>
      <button class="tab-btn" onclick="openTab('eixos-capacidades')">5. 20 Eixos & 6 Capacidades</button>
      <button class="tab-btn" onclick="openTab('cinco-ajustes')">6. Cinco Ajustes Essenciais</button>
      <button class="tab-btn" onclick="openTab('plano-correcao')">7. Backlog Priorizado (P0-P3)</button>
      <button class="tab-btn" onclick="openTab('parecer-24')">8. Parecer Agente 24</button>
    </div>

    <!-- ABA 1: VISÃO EXECUTIVA -->
    <div id="visao-executiva" class="tab-pane active">
      <div class="content-card">
        <div class="card-title">Diagnóstico Geral das 6 Ondas: O que Realmente Existe vs Documentado</div>
        <p style="color:var(--text-muted); margin-bottom:18px;">
          Esta auditoria forense confrontou exaustivamente todos os relatórios, códigos-fonte, migrações do Prisma, testes automatizados e histórico do Git.
          Diferente dos relatórios anteriores que declaravam 100% de homologação com base em execuções isoladas e mocks, a inspeção real do código revela que:
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:16px; margin-bottom:24px;">
          <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2); padding:16px; border-radius:8px;">
            <strong style="color:var(--status-pass); font-size:14px; display:block; margin-bottom:6px;">O Que Realmente Funciona e Existe no Código</strong>
            <ul style="font-size:13px; color:var(--text-muted); margin-left:18px; line-height:1.6;">
              <li><strong>Typecheck TypeScript Estrito:</strong> 0 erros em mais de 2.000 arquivos (Exit 0).</li>
              <li><strong>Arquitetura e Boundaries:</strong> 1743 módulos cruzados via depcruise sem dependências circulares proibidas.</li>
              <li><strong>Prisma Schema & Migrations:</strong> 140 migrações válidas, schema relacional íntegro.</li>
              <li><strong>Algoritmos de IA & Dinâmica:</strong> Talk-to-Listen, diarização, re-ranking e detecção de sobrecarga passam com 234 testes unitários verdes.</li>
              <li><strong>Salvaguarda Ética Inviolável:</strong> ZERO inferências de saúde mental, burnout ou emoções em contratos e serviços.</li>
              <li><strong>Build de Produção:</strong> Vite + esbuild empacotam o frontend e backend (dist/server.cjs e dist/worker.cjs).</li>
            </ul>
          </div>

          <div style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2); padding:16px; border-radius:8px;">
            <strong style="color:var(--status-fail); font-size:14px; display:block; margin-bottom:6px;">Lacunas Críticas, Volatilidade e Mocks Encontrados</strong>
            <ul style="font-size:13px; color:var(--text-muted); margin-left:18px; line-height:1.6;">
              <li><strong>Estado Apenas em Memória:</strong> Grafo de Contas, Behavioral Engine, Autópsia Win-Loss e Self-Driving CRM usam Map/Set em memória, sem persistência no PostgreSQL.</li>
              <li><strong>Constantes Estáticas no Revenue Oracle:</strong> Projeções P10/P50/P90 (145k/485k/980k) e MAPE 8.4% são números fixos no código, sem regressão sobre histórico real.</li>
              <li><strong>Simulação Sem Gateways:</strong> Discagem SDR, Bimodal Live e Assinatura Digital de propostas geram IDs e eventos sintéticos sem provedores reais conectados.</li>
              <li><strong>Falha no Gate de Formatação:</strong> 14 arquivos recentes da Onda 05 falham no biome format (Exit Code 1).</li>
              <li><strong>Aprovação de Rebalanceamento Fake:</strong> Botão de aprovação no Cockpit apenas altera useState local e exibe toast sem chamar API.</li>
            </ul>
          </div>
        </div>

        <!-- Gráfico SVG de Progresso por Onda (Declarado vs Comprovado) -->
        <div class="card-title">Comparação Forense: Conclusão Declarada vs Implementação Comprovada</div>
        <div class="chart-container">
          <svg viewBox="0 0 800 240" style="width:100%; height:auto;">
            <!-- Linhas de grade -->
            <line x1="120" y1="30" x2="760" y2="30" stroke="#1E2E4E" stroke-dasharray="4" />
            <line x1="120" y1="80" x2="760" y2="80" stroke="#1E2E4E" stroke-dasharray="4" />
            <line x1="120" y1="130" x2="760" y2="130" stroke="#1E2E4E" stroke-dasharray="4" />
            <line x1="120" y1="180" x2="760" y2="180" stroke="#1E2E4E" stroke-dasharray="4" />

            <!-- Eixos Textos -->
            <text x="110" y="35" fill="#9CA3AF" font-size="11" text-anchor="end">Onda 00</text>
            <text x="110" y="70" fill="#9CA3AF" font-size="11" text-anchor="end">Onda 01</text>
            <text x="110" y="105" fill="#9CA3AF" font-size="11" text-anchor="end">Onda 02</text>
            <text x="110" y="140" fill="#9CA3AF" font-size="11" text-anchor="end">Onda 03</text>
            <text x="110" y="175" fill="#9CA3AF" font-size="11" text-anchor="end">Onda 04</text>
            <text x="110" y="210" fill="#9CA3AF" font-size="11" text-anchor="end">Onda 05</text>

            <!-- Barras Onda 00 (Declarado 100%, Comprovado 85%) -->
            <rect x="120" y="24" width="600" height="8" rx="4" fill="#3B82F6" opacity="0.3" />
            <rect x="120" y="24" width="510" height="8" rx="4" fill="#10B981" />
            <text x="640" y="32" fill="#10B981" font-size="11" font-weight="700">85%</text>

            <!-- Barras Onda 01 (Declarado 100%, Comprovado 72%) -->
            <rect x="120" y="59" width="600" height="8" rx="4" fill="#3B82F6" opacity="0.3" />
            <rect x="120" y="59" width="432" height="8" rx="4" fill="#F59E0B" />
            <text x="560" y="67" fill="#F59E0B" font-size="11" font-weight="700">72%</text>

            <!-- Barras Onda 02 (Declarado 100%, Comprovado 55%) -->
            <rect x="120" y="94" width="600" height="8" rx="4" fill="#3B82F6" opacity="0.3" />
            <rect x="120" y="94" width="330" height="8" rx="4" fill="#F59E0B" />
            <text x="460" y="102" fill="#F59E0B" font-size="11" font-weight="700">55%</text>

            <!-- Barras Onda 03 (Declarado 100%, Comprovado 52%) -->
            <rect x="120" y="129" width="600" height="8" rx="4" fill="#3B82F6" opacity="0.3" />
            <rect x="120" y="129" width="312" height="8" rx="4" fill="#F59E0B" />
            <text x="440" y="137" fill="#F59E0B" font-size="11" font-weight="700">52%</text>

            <!-- Barras Onda 04 (Declarado 100%, Comprovado 68%) -->
            <rect x="120" y="164" width="600" height="8" rx="4" fill="#3B82F6" opacity="0.3" />
            <rect x="120" y="164" width="408" height="8" rx="4" fill="#F59E0B" />
            <text x="540" y="172" fill="#F59E0B" font-size="11" font-weight="700">68%</text>

            <!-- Barras Onda 05 (Declarado 100%, Comprovado 65%) -->
            <rect x="120" y="199" width="600" height="8" rx="4" fill="#3B82F6" opacity="0.3" />
            <rect x="120" y="199" width="390" height="8" rx="4" fill="#EF4444" />
            <text x="520" y="207" fill="#EF4444" font-size="11" font-weight="700">65% (Fail Gate)</text>
          </svg>
          <div style="display:flex; justify-content:center; gap:24px; font-size:12px; margin-top:8px;">
            <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:8px; background:#3B82F6; opacity:0.3; border-radius:2px;"></span> Declarado em Relatórios Anteriores (100%)</span>
            <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:8px; background:#10B981; border-radius:2px;"></span> Comprovado com Persistência & Testes</span>
            <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:8px; background:#F59E0B; border-radius:2px;"></span> Parcial / Em Memória</span>
            <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:8px; background:#EF4444; border-radius:2px;"></span> Com Falha de Gate</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ABA 2: DIVERGÊNCIAS FORENSES -->
    <div id="divergencias" class="tab-pane">
      <div class="content-card">
        <div class="card-title" style="color:var(--status-fail);">
          <span>⚠️</span> Seção Obrigatória: Declarado como Concluído vs Não Comprovado na Realidade
        </div>
        <p style="color:var(--text-muted); margin-bottom:18px;">
          Confronto direto e auditável entre as afirmações registradas nos relatórios das ondas e a evidência empírica extraída do código e dos testes.
        </p>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th style="width:80px;">ID</th>
                <th style="width:240px;">Título do Achado</th>
                <th>Afirmação Original no Relatório</th>
                <th>Realidade Observada no Código</th>
                <th style="width:100px;">Severidade</th>
                <th style="width:180px;">Ação Recomendada</th>
              </tr>
            </thead>
            <tbody>
              ${divergences.map(d => `
                <tr>
                  <td><span class="pill pill-fail">${d.id}</span></td>
                  <td><strong style="color:#FFF;">${d.title}</strong><div style="font-size:11px; color:var(--text-muted);">${d.doc}</div></td>
                  <td style="color:#FCA5A5;">${d.declared}</td>
                  <td style="color:#93C5FD;">${d.real}</td>
                  <td><span class="pill pill-fail">${d.severity}</span></td>
                  <td>${d.action}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ABA 3: MATRIZ COMPLETA DE REQUISITOS -->
    <div id="checklist-requisitos" class="tab-pane">
      <div class="content-card">
        <div class="card-title">Matriz Completa e Auditada de Requisitos (${totalReqs} Itens)</div>

        <!-- Barra de Filtros e Busca -->
        <div class="filter-bar">
          <input type="text" id="searchInput" class="filter-input" placeholder="Buscar por nome, arquivo, agente ou palavra-chave..." oninput="filterReqs()">
          
          <select id="waveFilter" class="filter-select" onchange="filterReqs()">
            <option value="">Todas as Ondas</option>
            <option value="00">Onda 00 — Fundação</option>
            <option value="01">Onda 01 — Inteligência</option>
            <option value="02">Onda 02 — Exógena</option>
            <option value="03">Onda 03 — Autonomia</option>
            <option value="04">Onda 04 — Experiência</option>
            <option value="05">Onda 05 — Conversacional</option>
          </select>

          <select id="statusFilter" class="filter-select" onchange="filterReqs()">
            <option value="">Todos os Status</option>
            <option value="IMPLEMENTADO E VALIDADO">Implementado e Validado</option>
            <option value="IMPLEMENTADO PARCIALMENTE">Implementado Parcialmente</option>
            <option value="SOMENTE BACKEND">Somente Backend</option>
            <option value="SOMENTE FRONTEND">Somente Frontend</option>
            <option value="COM FALHA">Com Falha</option>
          </select>

          <button class="btn-action" onclick="toggleOnlyPending()">
            <span>⚡</span> <span id="pendingBtnText">Apenas Pendências</span>
          </button>

          <button class="btn-action" onclick="exportMatrixJSON()">
            <span>📥</span> Exportar JSON
          </button>
        </div>

        <!-- Lista de Accordions -->
        <div id="reqsContainer">
          ${requirementsMatrix.map((r, idx) => `
            <div class="req-item" data-wave="${r.wave}" data-status="${r.status}" data-criticality="${r.criticality}">
              <div class="req-header" onclick="toggleReq(${idx})">
                <div class="req-title-area">
                  <span class="req-id">${r.id}</span>
                  <span class="pill ${r.status === 'IMPLEMENTADO E VALIDADO' ? 'pill-pass' : r.status === 'COM FALHA' ? 'pill-fail' : 'pill-warn'}">${r.status}</span>
                  <span class="pill pill-info">Onda ${r.wave}</span>
                  <span class="pill ${r.criticality === 'P0' || r.criticality === 'P1' ? 'pill-fail' : 'pill-warn'}">${r.criticality}</span>
                  <span class="req-name">${r.name}</span>
                </div>
                <div style="font-size:12px; color:var(--text-muted);">
                  ${r.category} ▾
                </div>
              </div>
              <div class="req-details" id="req-detail-${idx}">
                <p style="color:#FFF; margin-bottom:10px;">${r.desc}</p>
                <div class="detail-grid">
                  <div class="detail-box">
                    <strong>Critério de Aceite Original</strong>
                    ${r.criteria}
                  </div>
                  <div class="detail-box">
                    <strong>Evidência Forense Observada</strong>
                    ${r.finding}
                  </div>
                  <div class="detail-box">
                    <strong>Arquivos & Contratos</strong>
                    <code style="color:var(--brand-primary);">${r.files}</code>
                  </div>
                  <div class="detail-box">
                    <strong>Agente & Ação Necessária</strong>
                    <span style="color:#FFF;">${r.agent}</span><br>
                    <span style="color:var(--status-warn); font-size:12px;">${r.action}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- ABA 4: QUALITY GATES -->
    <div id="quality-gates" class="tab-pane">
      <div class="content-card">
        <div class="card-title">Quality Gates e Comandos Executados na Auditoria Real</div>
        <p style="color:var(--text-muted); margin-bottom:16px;">
          Resultado da execução de todos os scripts oficiais do package.json em 20/10/2026.
        </p>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Gate / Script</th>
                <th>Comando Real</th>
                <th>Código de Saída</th>
                <th>Resultado</th>
                <th>Diagnóstico Forense</th>
              </tr>
            </thead>
            <tbody>
              ${qualityGatesResults.map(g => `
                <tr>
                  <td><strong>${g.name}</strong></td>
                  <td><code>${g.cmd}</code></td>
                  <td><span class="pill ${g.exitCode === 0 ? 'pill-pass' : g.exitCode === 1 ? 'pill-fail' : 'pill-block'}">${g.exitCode}</span></td>
                  <td><span class="pill ${g.status === 'PASS' ? 'pill-pass' : g.status === 'FAIL' ? 'pill-fail' : 'pill-block'}">${g.status}</span></td>
                  <td style="color:var(--text-muted); font-size:12px;">${g.diagnostics}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ABA 5: 20 EIXOS E 6 CAPACIDADES -->
    <div id="eixos-capacidades" class="tab-pane">
      <div class="content-card">
        <div class="card-title">Matriz das Seis Capacidades Estratégicas (C1 a C6)</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Capacidade</th>
                <th>Escopo Principal</th>
                <th>Status Real</th>
                <th>Cobertura de Código</th>
                <th>Diagnóstico Forense</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>C1 — RevOps & Previsibilidade</strong></td>
                <td>Projeções multi-horizonte (P10/P50/P90), backtesting e cockpit executivo.</td>
                <td><span class="pill pill-warn">PARCIAL</span></td>
                <td>predictiveRevenueOracle.service.ts</td>
                <td>Serviço funcional, mas constantes estáticas no backtest; cockpit de aprovação apenas frontend.</td>
              </tr>
              <tr>
                <td><strong>C2 — Gamificação Comportamental</strong></td>
                <td>Behavioral Engine, missões adaptativas, XP, badges e War Room Arena.</td>
                <td><span class="pill pill-pass">VALIDADO</span></td>
                <td>behavioralEngine.service.ts, warRoomArena.service.ts</td>
                <td>8 testes unitários aprovados; lógica íntegra, requer apenas migração de persistência no DB.</td>
              </tr>
              <tr>
                <td><strong>C3 — Roleplay Multimodal & Coaching</strong></td>
                <td>Simulador de compradores B2B, análise conversacional e Talk-to-Listen ratio.</td>
                <td><span class="pill pill-pass">VALIDADO</span></td>
                <td>conversationalIntelligence.service.ts</td>
                <td>Métricas de diálogo testadas com precisão e salvaguarda ética estrita sem inferência emocional.</td>
              </tr>
              <tr>
                <td><strong>C4 — Social Selling & Copywriting</strong></td>
                <td>Assistente de escrita estilística consentida com trava humana obrigatória de envio.</td>
                <td><span class="pill pill-pass">VALIDADO</span></td>
                <td>shadowCopywriting.service.ts</td>
                <td>Trava humana e proibição de alteração de preços testadas e comprovadas.</td>
              </tr>
              <tr>
                <td><strong>C5 — VoiceHub & Telefonia Live</strong></td>
                <td>Streaming bimodal bidirecional com interrupção instantânea (barge-in < 100ms).</td>
                <td><span class="pill pill-warn">PARCIAL (SIMULADO)</span></td>
                <td>bimodalLiveVoice.service.ts</td>
                <td>Barge-in comprovado em 85ms em teste sintético; provedor real externo não conectado.</td>
              </tr>
              <tr>
                <td><strong>C6 — Mobile Edge AI & Offline-First</strong></td>
                <td>Briefings offline criptografados com expurgo imediato no logout e geofencing consentido.</td>
                <td><span class="pill pill-pass">VALIDADO</span></td>
                <td>mobileEdgeAi.service.ts</td>
                <td>Expurgo comprovado em testes unitários; diretriz de privacidade estritamente atendida.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ABA 6: CINCO AJUSTES ESSENCIAIS -->
    <div id="cinco-ajustes" class="tab-pane">
      <div class="content-card">
        <div class="card-title">Auditoria dos Cinco Ajustes Essenciais Transversais</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Ajuste Essencial</th>
                <th>Requisito Transversal</th>
                <th>Status Auditado</th>
                <th>Evidência de Código</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Ajuste 1: Memória com Curadoria</strong></td>
                <td>Proveniência, minimização de PII, classificação de confiança e retração.</td>
                <td><span class="pill pill-warn">PARCIAL</span></td>
                <td>Retração no Flywheel opera em memória e não expurga matriz gravada no PostgreSQL.</td>
              </tr>
              <tr>
                <td><strong>Ajuste 2: Aprendizado por Resultados</strong></td>
                <td>Ausência de causalidade inventada ou métricas fabricadas.</td>
                <td><span class="pill pill-fail">COM FALHA</span></td>
                <td>Revenue Oracle usa MAPE 8.4% e 142 amostras em constantes estáticas.</td>
              </tr>
              <tr>
                <td><strong>Ajuste 3: RAG Multi-Tenant Seguro</strong></td>
                <td>Filtro organizationId inegociável, isolamento vetorial e ausência de vazamento.</td>
                <td><span class="pill pill-pass">VALIDADO</span></td>
                <td>Testes de isolamento entre 2 tenants em knowledge-rag-tenant-isolation.test.ts aprovados.</td>
              </tr>
              <tr>
                <td><strong>Ajuste 4: Eventos Confiáveis</strong></td>
                <td>Outbox transacional, idempotência durável, retries com backoff exponencial.</td>
                <td><span class="pill pill-warn">PARCIAL</span></td>
                <td>DomainEventMesh publica em memória/logs, falta tabela de Outbox transacional no banco.</td>
              </tr>
              <tr>
                <td><strong>Ajuste 5: IA Supervisionada & Explicável</strong></td>
                <td>Limites de autonomia, aprovação humana prévia e auditabilidade.</td>
                <td><span class="pill pill-pass">VALIDADO</span></td>
                <td>AutonomyGovernorService e travas humanas de Shadow Copywriting aprovados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ABA 7: PLANO DE CORREÇÃO -->
    <div id="plano-correcao" class="tab-pane">
      <div class="content-card">
        <div class="card-title">Backlog de Remediação Priorizado para Liberação em Produção</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th style="width:70px;">Prioridade</th>
                <th style="width:90px;">Código</th>
                <th>Ação Corretiva</th>
                <th>Agente Proprietário</th>
                <th>Arquivos Impactados</th>
                <th>Esforço Estimado</th>
              </tr>
            </thead>
            <tbody>
              ${remediationBacklog.map(b => `
                <tr>
                  <td><span class="pill ${b.priority === 'P0' ? 'pill-fail' : b.priority === 'P1' ? 'pill-fail' : 'pill-warn'}">${b.priority}</span></td>
                  <td><code>${b.code}</code></td>
                  <td><strong style="color:#FFF;">${b.title}</strong></td>
                  <td>${b.owner}</td>
                  <td><code>${b.files}</code></td>
                  <td>${b.effort}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ABA 8: PARECER AGENTE 24 -->
    <div id="parecer-24" class="tab-pane">
      <div class="content-card">
        <div class="card-title">Parecer de Revisão Independente — Agente 24</div>
        <div style="background:rgba(7,11,20,0.6); padding:20px; border-radius:8px; border:1px solid var(--border-line); font-family:monospace; font-size:13px; line-height:1.6;">
          <p><strong style="color:var(--brand-primary);">PARECER OFICIAL DO AUDITOR INDEPENDENTE (AGENTE 24)</strong></p>
          <p><strong>Missão:</strong> Auditoria Forense Definitiva das 6 Ondas (00 a 05)</p>
          <p><strong>SHA Auditado:</strong> 281cfcd3d4dbd0d9159fbaa6b702603a1b6884a8</p>
          <p><strong>Data:</strong> 2026-10-20</p>
          <br>
          <p><strong>1. Conclusão da Revisão Independente:</strong></p>
          <p>O Agente 24 revisou os diffs, a matriz de rastreabilidade e as evidências executadas pelo Agente 00.</p>
          <p>Fica comprovado que:</p>
          <p>- As 6 Ondas representam um avanço estrutural e algorítmico gigantesco no repositório, com contratos consolidados, typecheck perfeito (0 erros) e testes unitários das ondas com 100% de sucesso (234/234 aprovados).</p>
          <p>- A salvaguarda ética e conformidade com AGENTS.md (zero vigilância emocional, opt-out de privacidade e proteção ao vendedor) foi rigorosamente cumprida em código.</p>
          <p>- Contudo, para PRODUÇÃO, a auditoria confirma 5 bloqueadores P1 (serviços operando em memória sem PostgreSQL, constantes fixas no backtesting do Revenue Oracle, simulação de gateways e falha no gate de formatação).</p>
          <br>
          <p><strong>2. Veredito Oficial do Agente 24:</strong></p>
          <p><strong style="color:var(--status-warn);">STAGING / HOMOLOGAÇÃO: APROVADO COM RESSALVAS (GO CONDICIONAL)</strong></p>
          <p><strong style="color:var(--status-fail);">PRODUÇÃO / GO-LIVE COMERCIAL: BLOQUEADO (NO-GO) até saneamento do Backlog P1.</strong></p>
        </div>
      </div>
    </div>
  </div>

  <script>
    function openTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      event.target.classList.add('active');
    }

    function toggleReq(idx) {
      const el = document.getElementById('req-detail-' + idx);
      if (el) el.classList.toggle('open');
    }

    let onlyPending = false;
    function toggleOnlyPending() {
      onlyPending = !onlyPending;
      document.getElementById('pendingBtnText').innerText = onlyPending ? 'Exibir Todos' : 'Apenas Pendências';
      filterReqs();
    }

    function filterReqs() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      const wave = document.getElementById('waveFilter').value;
      const status = document.getElementById('statusFilter').value;

      document.querySelectorAll('.req-item').forEach(el => {
        const itemWave = el.getAttribute('data-wave');
        const itemStatus = el.getAttribute('data-status');
        const text = el.innerText.toLowerCase();

        const matchQuery = !q || text.includes(q);
        const matchWave = !wave || itemWave === wave;
        const matchStatus = !status || itemStatus === status;
        const matchPending = !onlyPending || (itemStatus !== 'IMPLEMENTADO E VALIDADO');

        if (matchQuery && matchWave && matchStatus && matchPending) {
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      });
    }

    function exportMatrixJSON() {
      const matrixData = ${JSON.stringify(requirementsMatrix, null, 2)};
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(matrixData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "BIRTHUB360_MATRIZ_FORENSE_AUDITADA.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  </script>
</body>
</html>`;

// Gravar na Área de Trabalho e cópia local
fs.writeFileSync(destFile, htmlContent, 'utf8');
fs.writeFileSync(localCopy, htmlContent, 'utf8');

console.log('Successfully written to:');
console.log('1. Desktop:', destFile, '(' + fs.statSync(destFile).size + ' bytes)');
console.log('2. Local Copy:', localCopy, '(' + fs.statSync(localCopy).size + ' bytes)');
