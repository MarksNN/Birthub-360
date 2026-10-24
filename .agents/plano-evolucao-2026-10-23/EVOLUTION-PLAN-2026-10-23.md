# Plano de Evolução da Plataforma
**Data:** 2026-10-23
**Baseado em:** Análise do código existente e PLAN-V4

## Resumo Executivo

A plataforma Birth Hub 360° possui uma arquitetura técnica sofisticada com:
- **~40 agentes de IA** implementados (BDR, Closer, CRM, Ops, SDR, etc.)
- **Gateway de IA** decomposto em arquivos especializados (providers, circuit breaker, retry, fallback)
- **Motor de automações** com idempotência, retry e histórico
- **Sistemas de memória** (AgentMemory, Checkpointer LangGraph, VectorStore)
- **Integrações** (Bitrix24, WhatsApp, Birth Voice, Google Workspace)

Este plano foca em evoluir significativamente os módulos existentes, priorizando:
1. Consolidação e limpeza arquitetural
2. Melhoria de motores e fluxos
3. Aprimoramento de memórias e conexões
4. Observabilidade e governança

---

## P1: Arquitetura de Agentes - Consolidação

### Estado Atual
- **40+ agentes** em `src/features/intelligence/agents/`
- **BaseAgent** como classe base com `run()` e `runWithTools()`
- **AgentRuntime** para execução governada
- **AgentBuilder** para construção customizada
- **Capability Engine** já implementado (27 capabilities PROMPT_READY de 379)

### Problemas Identificados
1. **Duplicação de lógica:**
   - `run()` vs `runWithTools()` têm gate de LGPD duplicado (AI-007)
   - Fallback logic duplicado em BDR/Closer (extraído para `fallback.util.ts`)
   - Budget check duplicado (AI-011)

2. **Checkpointer inconsistente:**
   - Alguns agentes usam `MemorySaver` (RAM)
   - Outros usam `PostgresSaver` (checkpointer.ts)
   - Thread_id prefixado por tenant, mas sem TTL (acúmulo indefinido)

3. **Agentes sem prompt real:**
   - 27 de 379 agentes têm `systemPrompt` configurado
   - 352 agentes falham fechado sem fabricar resposta

### Ações Prioritárias

#### 1.1 Unificar execução de agentes
**Arquivo:** `src/features/intelligence/agents/execution/AgentExecutor.ts` (novo)

```typescript
// Facade unificado para execução de agentes
// Centraliza: LGPD gate, budget check, checkpointer, fallback, memory
// Remove duplicação entre run() e runWithTools()
```

**Benefícios:**
- Single source of truth para execução
- Gates aplicados uniformemente
- Facilita adicionar novos gates (ex: rate limiting por tenant)

#### 1.2 Migrar todos para PostgresSaver
**Arquivo:** `src/lib/ai/checkpointer.ts` (já existe)

**Ação:**
- Remover `MemorySaver` de todos os agentes
- Usar `checkpointer` de `checkpointer.ts` em todos
- Adicionar TTL job para limpeza de threads antigas

**Benefícios:**
- Estado persistente entre restarts/deploy
- Debug de execuções em andamento
- Base para time travel e resume

#### 1.3 Implementar TTL de checkpoints
**Arquivo:** `src/features/intelligence/jobs/checkpointCleanup.worker.ts` (novo)

```typescript
// Job agendado (ex: diário)
// Deleta threads com updatedAt > 30 dias
// Usa checkpointer.deleteThread(threadId)
```

**Benefícios:**
- Evita acúmulo indefinido
- Reduz tamanho do banco
- Política de retenção explícita

#### 1.4 Catálogo de agentes v2
**Arquivo:** `src/features/intelligence/agents/agentCatalog.ts` (refinar)

**Ação:**
- Marcar PROMPT_READY explicitamente
- Documentar agentes com/sem tools
- Mapear capabilities por agente
- Adicionar metadados (latência alvo, custo por execução)

**Benefícios:**
- Discovery inteligente
- Filtros por capability
- Estimativa de custo/latência

---

## P2: Motores de IA - Evolução

### Estado Atual
- **Gateway decomposto** em 12 arquivos especializados
- **Providers:** Groq, OpenAI, LiteLLM, Ollama
- **Circuit breaker** com Redis + fallback local
- **Retry** com backoff exponencial
- **Budget** mensal com tiers
- **Token quota** com alertas

### Problemas Identificados
1. **Provider routing estático:**
   - `model-routing.ts` com aliases fixos
   - Sem routing dinâmico por custo/latência/disponibilidade

2. **Stream sem fallback:**
   - `streaming.ts` só suporta Groq
   - Se Groq falha, não tenta próximo provider

3. **Embeddings legado:**
   - LiteLLM ainda existe como fallback
   - Local embeddings via Xenova/transformers

### Ações Prioritárias

#### 2.1 Dynamic Model Routing
**Arquivo:** `src/lib/ai/gateway/dynamic-routing.ts` (novo)

```typescript
// Seleciona provider/model baseado em:
// - Custo (USD por 1M tokens)
// - Latência (últimas N execuções)
// - Disponibilidade (circuit breaker state)
// - Tenant tier (quota disponível)
```

**Benefícios:**
- Otimização automática de custo
- Resiliência a indisponibilidade
- Routing inteligente por tenant

#### 2.2 Streaming com fallback
**Arquivo:** `src/lib/ai/gateway/streaming-fallback.ts` (novo)

```typescript
// Tenta provider A (ex: Groq)
// Se falhar (429/5xx), aborta stream e tenta provider B
// Apresenta ao usuário: "Mudando para provedor mais rápido..."
```

**Benefícios:**
- Streaming não é single point of failure
- Experiência contínua mesmo com falhas
- Maximiza uso de streaming (UX melhor)

#### 2.3 Consolidar embeddings
**Arquivo:** `src/lib/ai/gateway/embeddings-consolidated.ts` (novo)

```typescript
// Usa local embeddings por padrão (Xenova)
// Fallback para LiteLLM só se local falhar
// Cache de embeddings por tenant (Redis)
```

**Benefícios:**
- Reduz custo (local = grátis)
- Mantém fallback (LiteLLM)
- Cache reduz chamadas repetidas

#### 2.4 Provider health dashboard
**Arquivo:** `src/features/intelligence/components/ProviderHealth.tsx` (novo)

```typescript
// Dashboard administrativo
// Mostra: latência p50/p95, taxa de erro, circuit breaker state
// Por provider, por tenant, por dia
```

**Benefícios:**
- Observabilidade de IA
- Debug de problemas
- Base para alertas proativos

---

## P3: Fluxos de Automação - Otimização

### Estado Atual
- **AutomationEngine** com triggers/actions
- **Idempotência** via Redis (claimAutomationTrigger)
- **Retry** com backoff linear (MAX_ACTION_ATTEMPTS = 3)
- **Histórico** em AutomationHistory
- **Scanners:** estagnação, cold leads

### Problemas Identificados
1. **Tipos limitados:**
   - Apenas 4 triggers (Lead criado, Lead mudou status, Atividade concluída, Lead estagnado)
   - Apenas 3 actions (Notificar equipe, Criar atividade, Ligar via SDR de Voz)

2. **Sem preview:**
   - Usuário não sabe o que vai acontecer antes de salvar
   - Sem dry-run real

3. **Escanners isolados:**
   - Estagnação scanner job separado
   - Cold leads scanner job separado
   - Lógica duplicada

### Ações Prioritárias

#### 3.1 Expandir triggers/actions
**Arquivo:** `src/features/automations/automation.types.ts` (novo)

```typescript
// Triggers adicionais:
// - Deal mudou de estágio
// - Reunião agendada
// - Proposta enviada
// - Contrato assinado
// - Score de risco mudou

// Actions adicionais:
// - Atualizar campo customizado
// - Enrich lead
// - Chamar webhook externo
// - Mover para outra etapa de cadência
```

**Benefícios:**
- Cobertura de mais cenários
- Automações mais poderosas
- Menos necessidade de código custom

#### 3.2 Dry-run real
**Arquivo:** `src/features/automations/automation-dry-run.service.ts` (já existe, refinar)

**Ação:**
- Mostrar exatamente o que vai acontecer
- Simular condições com dados reais
- Calcular custo estimado (se envolver IA)

**Benefícios:**
- Usuário confia na automação
- Evita erros de configuração
- Reduz tickets de suporte

#### 3.3 Unificar scanners
**Arquivo:** `src/features/automations/scanners/unifiedScanner.service.ts` (novo)

```typescript
// Scheduler único
// Executa todos os scanners na mesma cadência
// Compartilha lógica de query de entidades
// Dedupe de jobs
```

**Benefícios:**
- Menos jobs de background
- Menos carga no banco
- Lógica centralizada

#### 3.4 Cadência-aware
**Arquivo:** `src/features/automations/cadenceIntegration.service.ts` (novo)

```typescript
// Automações podem manipular cadências
// Action: "Mover para etapa X da cadência Y"
// Action: "Pausar cadência por N dias"
// Action: "Reiniciar cadência do zero"
```

**Benefícios:**
- Integração nativa com cadências
- Fluxos de vendas mais sofisticados
- Menos necessidade de código custom

---

## P4: Sistemas de Memória - Aprimoramento

### Estado Atual
- **AgentMemory** (PostgreSQL) - mensagens por sessão
- **Checkpointer** (PostgreSQL LangGraph) - estado de grafo
- **VectorStore** (Qdrant/pgvector) - embeddings RAG
- **SemanticCache** (Redis) - cache de respostas semânticas

### Problemas Identificados
1. **AgentMemory sem TTL:**
   - Acumula mensagens indefinidamente
   - Sem política de retenção

2. **VectorStore inconsistente:**
   - RAG-001 corrigiu pipeline duplicado
   - Mas ainda há caminhos legados (vector.service.ts)

3. **Semantic cache subutilizado:**
   - Existe mas poucos consumidores
   - Sem métricas de hit rate

### Ações Prioritárias

#### 4.1 TTL de AgentMemory
**Arquivo:** `src/features/intelligence/jobs/agentMemoryCleanup.worker.ts` (já existe, refinar)

**Ação:**
- Job agendado (ex: semanal)
- Deleta sessões com updatedAt > 90 dias
- Opcional: preserva N sessões por agente por tenant

**Benefícios:**
- Controle de tamanho do banco
- Política de retenção explícita
- Melhora performance de queries

#### 4.2 Consolidar VectorStore
**Arquivo:** `src/lib/ai/vectorStore.ts` (já existe, remover dead code)

**Ação:**
- Remover `addDocumentChunk` (deprecated RAG-001)
- Garantir que tudo usa `searchService.hybridSearch`
- Remover `vector.service.ts` legado

**Benefícios:**
- Single source of truth
- RLS consistente
- Proveniência garantida

#### 4.3 Métricas de cache
**Arquivo:** `src/lib/ai/cache/semanticCacheMetrics.ts` (novo)

```typescript
// Registra: hit rate, miss rate, evictions
// Por tenant, por agente, por dia
// Expõe via Prometheus
```

**Benefícios:**
- Observabilidade de cache
- Otimização de TTL
- Decisões baseadas em dados

#### 4.4 Memória de longo prazo
**Arquivo:** `src/features/intelligence/memory/longTermMemory.service.ts` (novo)

```typescript
// Memória além da sessão atual
// Ex: "Lead X sempre responde melhor no período da manhã"
// Ex: "Cliente Y prefere comunicação por WhatsApp"
// Persiste insights aprendidos por agente
```

**Benefícios:**
- Agentes mais inteligentes
- Personalização por lead/cliente
- Aprendizado contínuo

---

## P5: Conexões e Integrações - Resiliência

### Estado Atual
- **Bitrix24:** extrações, sincronização, writeback
- **WhatsApp:** Baileys (socket.io)
- **Birth Voice:** 3CX integration
- **Google Workspace:** calendar, docs
- **Email:** SMTP (nodemailer)

### Problemas Identificados
1. **Sem circuit breaker em integrações:**
   - Se Bitrix falha, continua tentando
   - Sem backoff inteligente

2. **Sem idempotência:**
   - Webhooks podem ser reprocessados
   - Duplicação de dados possível

3. **Sem health check proativo:**
   - Só descobre problema quando usuário reclama
   - Sem alertas preventivos

### Ações Prioritárias

#### 5.1 Circuit breaker para integrações
**Arquivo:** `src/lib/integrations/circuitBreaker.ts` (novo)

```typescript
// Reúso do circuit breaker de IA
// Aplicado a: Bitrix, WhatsApp, Birth Voice, Google
// Estado: CLOSED → OPEN → HALF_OPEN
// Timeout configurável por integração
```

**Benefícios:**
- Fail fast em vez de timeout
- Proteção de recursos
- Recuperação automática

#### 5.2 Idempotência de webhooks
**Arquivo:** `src/lib/integrations/webhookIdempotency.ts` (novo)

```typescript
// Cada webhook tem idempotency key
// Redis TTL (ex: 24h)
// Se já processou, retorna 200 sem reprocessar
```

**Benefícios:**
- Segurança contra replay
- Sem duplicação de dados
- Retry seguro

#### 5.3 Health check proativo
**Arquivo:** `src/features/integrations/healthCheck.service.ts` (novo)

```typescript
// Job agendado (ex: a cada 5 min)
// Tenta operação simples em cada integração
// Registra resultado em Prometheus
// Alerta se > N falhas consecutivas
```

**Benefícios:**
- Descobre problema antes do usuário
- Métricas de uptime
- SLA medível

#### 5.4 Queue de retry de integrações
**Arquivo:** `src/lib/queue/integrationRetry.worker.ts` (novo)

```typescript
// BullMQ job para cada falha de integração
// Backoff exponencial
// Limite de tentativas
// Dead letter queue para falhas permanentes
```

**Benefícios:**
- Retries estruturados
- Não bloqueia request principal
- Observabilidade de falhas

---

## P6: Clean Architecture - Implementação

### Estado Atual
- **101 violações** de arquitetura conhecidas
- Prioridades: intelligence, job-roles, prospecting, reports, roleplay, settings, team, gamification

### Ações Prioritárias

#### 6.1 Intelligence (maior prioridade)
**Estrutura alvo:**
```
src/features/intelligence/
├── domain/
│   ├── Agent.ts
│   ├── AgentMemory.ts
│   ├── AgentVersion.ts
│   └── Capability.ts
├── application/
│   ├── AgentUseCases.ts
│   ├── AgentBuilderUseCases.ts
│   └── AgentRuntimeUseCases.ts
├── infrastructure/
│   ├── PrismaAgentRepository.ts
│   ├── PrismaAgentMemoryRepository.ts
│   └── AgentQueueDispatcher.ts
├── presentation/
│   ├── AgentController.ts
│   └── agent.routes.ts
└── shared/
    └── agent.types.ts
```

**Benefícios:**
- Separação de responsabilidades clara
- Testabilidade isolada
- Menos dependências cruzadas

#### 6.2 Job-roles (segunda prioridade)
**Estrutura alvo:**
```
src/features/job-roles/
├── domain/
│   ├── JobRole.ts
│   ├── RoleCapabilityGrant.ts
│   └── AgentCapability.ts
├── application/
│   ├── JobRoleUseCases.ts
│   ├── AgentBuilderUseCases.ts
│   └── AgentBusUseCases.ts
├── infrastructure/
│   ├── PrismaJobRoleRepository.ts
│   └── CapabilityEngine.ts
├── presentation/
│   ├── JobRoleController.ts
│   └── job-roles.routes.ts
└── shared/
    └── job-role.types.ts
```

**Benefícios:**
- Capability engine isolado
- Governança de agentes centralizada
- Testes de boundary claros

---

## P7: Workspaces por Persona - BRAIN REORG

### Estado Atual
- **WorkspaceHome** já existe
- **RoleWorkspaceDefinition** no schema
- Mas ainda não é source of truth da experiência

### Ação Prioritária

#### 7.1 Workspace como orquestrador
**Arquivo:** `src/features/workspace/workspaceOrchestrator.service.ts` (novo)

```typescript
// Dado JobRole do usuário
// Busca RoleWorkspaceDefinition
// Resolve WorkspaceLayout
// Renderiza Sections em ordem
// Cada Section tem Widgets configuráveis
// Permissions por Widget
```

**Benefícios:**
- Experiência contextual por cargo
- Configuração sem código
- Três pilares comerciais visíveis

---

## P8: Unified Intelligence - Contextual AI

### Estado Atual
- **IntelligenceHub** em `/app/intelligence`
- **CopilotoIaHub** em `/app/copiloto_ia`
- **EliteCommercialAgentWorkspace** em `/app/intelligence/elite-agent`

### Ação Prioritária

#### 8.1 IntelligenceGateway
**Arquivo:** `src/features/intelligence/gateway/IntelligenceGateway.ts` (novo)

```typescript
// Facade unificado para toda inteligência
// Normaliza: provider, prompt, RAG, guardrails
// Context-aware: lead, deal, company, meeting
// Usa Capability Engine para autorização
```

**Benefícios:**
- Single source of truth
- Contexto consistente
- Menos duplicação

#### 8.2 Contextual AI nos três pilares
**Ação:**
- CRM: IA contextual no lead/deal
- Prospecção: IA contextual na lista/ICP
- Copiloto: IA contextual em toda navegação

**Benefícios:**
- IA não fica isolada
- Experiência fluida
- Maior valor percebido

---

## P9: Swarm Observability

### Estado Atual
- **Langfuse** para trace de IA
- **Prometheus** para métricas
- **AuditLog** para trilha de auditoria
- Mas sem dashboard unificado

### Ação Prioritária

#### 9.1 Swarm Dashboard
**Arquivo:** `src/features/intelligence/components/SwarmDashboard.tsx` (novo)

```typescript
// Dashboard administrativo
// Mostra: agentes ativos, latência, custo, erro rate
// Por tenant, por agente, por dia
// Drill-down para execução individual
```

**Benefícios:**
- Observabilidade do enxame
- Debug de problemas
- Base para alertas

#### 9.2 Alertas proativos
**Arquivo:** `src/features/intelligence/services/swarmAlerts.service.ts` (novo)

```typescript
// Alerta se:
// - Latência > threshold por N minutos
// - Custo > budget mensal
// - Erro rate > threshold
// - Agentes com PROMPT_READY mudando status
```

**Benefícios:**
- Descobre problema antes do usuário
- Resposta rápida
- SLA medível

---

## Ordem de Execução Sugerida

1. **P1.1** - Unificar execução de agentes (alto impacto, baixo risco)
2. **P1.2** - Migrar todos para PostgresSaver (alto impacto, médio risco)
3. **P5.2** - Idempotência de webhooks (alto impacto, baixo risco)
4. **P5.1** - Circuit breaker para integrações (alto impacto, médio risco)
5. **P2.1** - Dynamic Model Routing (médio impacto, baixo risco)
6. **P4.1** - TTL de AgentMemory (médio impacto, baixo risco)
7. **P3.1** - Expandir triggers/actions (médio impacto, médio risco)
8. **P6.1** - Clean Architecture - Intelligence (alto impacto, alto risco)
9. **P7.1** - Workspace como orquestrador (alto impacto, alto risco)
10. **P8.1** - IntelligenceGateway (alto impacto, alto risco)
11. **P9.1** - Swarm Dashboard (médio impacto, baixo risco)

---

## Critérios de Sucesso

- Cada item tem teste unitário/integração
- Cada item tem documentação atualizada
- Cada item tem handoff se afeta outro domínio
- Cada item tem evidência de funcionamento (screenshot/log)
- Gate local: `npx tsc --noEmit`, `npm run lint`, testes relevantes
- Gate de integração: testes e2e para fluxos críticos

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Regressão em agentes existentes | Média | Alto | Testes e2e para todos os agentes |
| Performance piora com PostgresSaver | Baixa | Médio | Benchmark antes/depois |
| Circuit breaker bloqueando demais | Baixa | Alto | Thresholds conservadores, monitor |
| Clean Architecture quebra código | Média | Alto | Migração incremental, não reescrita |
| Workspace reorg confunde usuários | Média | Médio | Onboarding, rollback ready |

---

## Próximos Passos

1. Revisar este plano com o Coordenador (Agente 00)
2. Priorizar itens com base em impacto/risco
3. Criar handoffs para agentes responsáveis
4. Executar em ondas com gates verdes
5. Documentar aprendizados em `.agents/runs/`
