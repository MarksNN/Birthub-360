De: Agente 00 — Coordenador Global
Para: Agentes 07 (IA e Automações) & 18 (Contratos e API)
Onda: Evolução Enxame IA
Status: aberto
Prioridade: alto
Bloqueador-ref: N/A
Sprint destino: Sprint 1

## Problema
351 dos 394 agentes possuem apenas bindings universais (`agent.discover`, `agent.execute`, `agent.request_cross_role`), operando via prompt puro sem ferramentas executáveis. Além disso, 5 tool bindings do catálogo permanecem com status não verificados (2 SOURCE_REQUIRED, 2 FUTURE_TOOL, 1 TOOL_UNAVAILABLE).

## Arquivo(s) envolvido(s)
- `src/features/job-roles/config/tool-bindings.ts`
- `scripts/capability-import/build-capability-catalog.ts`
- `src/features/job-roles/catalog/capabilities.normalized.json`
- `src/features/job-roles/catalog/agentCapabilities.normalized.json`

## Evidência
Resumo do artefato `capabilities.normalized.json`:
- 25 AVAILABLE
- 2 SOURCE_REQUIRED (ex.: `billing.read`)
- 2 FUTURE_TOOL
- 1 TOOL_UNAVAILABLE

## Alteração necessária
1. Mapear ferramentas reais tipadas para as capacidades pendentes (implementando ou conectando os adaptadores de dados).
2. Definir tool bindings de domínio para grupos prioritários de agentes (ex.: Marketing e CS).
3. Atualizar `build-capability-catalog.ts` e regenerar os artefatos normalizados.

## Teste esperado
- `node ./node_modules/vitest/vitest.mjs run tests/unit/features/job-roles/capabilitiesNormalizedArtifact.test.ts`
- Zero quebra no teste de OpenAPI drift (`npm run verify:openapi-drift`).
