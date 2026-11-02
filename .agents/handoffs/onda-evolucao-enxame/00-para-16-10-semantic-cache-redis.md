De: Agente 00 — Coordenador Global
Para: Agentes 16 (Runtime) & 10 (Infraestrutura/SRE) & 23 (FinOps)
Onda: Evolução Enxame IA
Status: resolvido
Prioridade: normal
Bloqueador-ref: N/A
Sprint destino: Sprint 3

## Problema
Pesquisas firmográficas repetidas e diagnósticos de conta executados por múltiplos usuários consomem chamadas repetidas a LLMs externas, gerando latência de 3-5s e consumo desnecessário do orçamento mensal de tokens do tenant.

## Arquivo(s) envolvido(s)
- `src/lib/redis/client.ts`
- `src/lib/ai/gateway.ts`
- `src/lib/ai/gateway/semanticCache.ts` (novo)

## Evidência
Logs de telemetria `logAiUsage` mostrando requisições idênticas para domínios de inteligência comercial em intervalos curtos.

## Alteração necessária
1. Implementar chave de cache baseada no hash normalizado de entrada + tenantId (`organizationId`).
2. Configurar TTL dinâmico (ex.: 24 horas para enriquecimento; 7 dias para dados firmográficos públicos).
3. Respeitar o isolamento de tenant no Redis (namespace por `organizationId`).

## Teste esperado
- Testes unitários comprovando retorno do cache em < 100ms.
- Testes de isolamento garantindo que Tenant B não lê chaves cacheadas de Tenant A.

## Resolução
- **Status:** **RESOLVIDO E TESTADO**
- **Data:** 2026-11-01
- **Executores:** Agentes 16 (Runtime e Escala), 10 (Infraestrutura/SRE) & 23 (FinOps de IA)
- **Branch:** `agente/16-semantic-cache-redis`

### Ações Implementadas:
1. **Cliente Redis Centralizado (`src/lib/redis/client.ts`):**
   - Encapsulamento de conexão otimizada para cache via `cacheConnection` com fail-safe, timeout curto e fail-fast.
   - Suporte a injeção determinística para testes unitários (`setRedisClientForTesting`, `resetRedisClientForTesting`).
2. **Semantic Cache com Isolamento Multi-Tenant (`src/lib/ai/gateway/semanticCache.ts`):**
   - Namespace estrito por tenant: `semcache:{organizationId}:{compositeHash}` conforme ameaça TH-03.
   - Validação imediata de Tenancy: lança `Tenancy violation: Cache semântico exige organizationId na chave` se `organizationId` for nulo ou vazio.
   - Normalização determinística de entradas: suporte a `normalizePrompt` e `normalizeFirmographicInput` (colapsa whitespace, remove protocolos/www de domínios, sanitiza CNPJs e ordena keys).
   - TTL dinâmico configurável:
     - 7 dias (`604.800s`) para dados firmográficos públicos (`FIRMOGRAPHIC_PUBLIC`, CNPJ, Receita Federal).
     - 24 horas (`86.400s`) para enriquecimento de leads e empresas (`ENRICHMENT`).
     - 12 horas (`43.200s`) para diagnósticos de conta (`ACCOUNT_DIAGNOSTIC`).
     - Suporte a TTL customizado (`ttlSeconds`).
   - FinOps & Governança (Agente 23):
     - Rastreamento de tokens salvos (`totalTokensSaved`), custo poupado (`totalCostSavedUsd`) e latência média via `getFinOpsMetrics()`.
   - LGPD & Segurança (Agentes 15 e 21):
     - Descarte intencional de cache para respostas `CONFIDENTIAL`.
     - Invalidação segura em massa de tenant (`invalidateTenant(orgId)`) via `SCAN` assíncrono e batch `DEL`.
   - Alta Disponibilidade e Resiliência (Agentes 16 e 10):
     - Fallback gracioso para cache local em memória caso o Redis esteja indisponível.
3. **Integração no AI Gateway (`src/lib/ai/gateway.ts` e `src/lib/ai/cache/semanticCache.service.ts`):**
   - Re-exports de `semanticCache`, `SemanticCacheService` e `CACHE_TTL`.
   - Suporte a caching opcional em `generateTextOutput` e `generateStructuredOutput`.

### Evidências dos Testes:
- `tests/unit/ai/gateway/semanticCache.test.ts`: **8/8 testes PASS**
  - Hit comprovado em **< 1ms** (ex: 0.23ms, bem abaixo do teto de 100ms).
  - Isolamento multi-tenant garantido: Tenant B recebe `null` para requisição idêntica de Tenant A.
  - Normalização firmográfica comprovada.
  - Resiliência comprovada com Redis fora do ar.
- `tests/unit/ai/semanticCache.service.test.ts`: **4/4 testes PASS**
- `tests/integration/onda-01/intelligenceCoreFlow.integration.test.ts`: **3/3 testes PASS**
