De: Agente 00 — Coordenador Global
Para: Agentes 16 (Runtime) & 10 (Infraestrutura/SRE) & 23 (FinOps)
Onda: Evolução Enxame IA
Status: aberto
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
