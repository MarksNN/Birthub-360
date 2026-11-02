De: Agente 00 — Coordenador Global
Para: Agentes 07 (IA e Automações) & 18 (Contratos e API)
Onda: Evolução Enxame IA
Status: resolvido
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

## Resolução (Agentes 07 & 18)
1. **Saneamento e Resolução de Status das Ferramentas**:
   - `meeting.read`: promovida para `AVAILABLE`/`VERIFIED` via adaptador Google Workspace (`getUpcomingCalendarEvents`), zerando `TOOL_UNAVAILABLE`.
   - `copy.draft` e `churn.analyze`: adicionadas e verificadas no catálogo canônico e em `tool-bindings.ts` (apontando para `SDROutboundDraftAgent` e `ChurnPreventionAgent`), com validação formal em `tests/integration/tool-bindings.evidence.test.ts`.
   - `billing.read` e `billing.reconcile` permanecem tipadas e rigorosamente classificadas como `SOURCE_REQUIRED` (conforme contratos e testes de persistência real e isolamento, prevenindo fabricação de faturamento sem fonte ERP/venda real).
   - `contract.generate` e `signature.request` mantidas como `FUTURE_TOOL` (transporte externo stub, prevenindo execução não verificada).

2. **Mapeamento de Bindings de Domínio para Grupos Marketing e CS**:
   - `build-capability-catalog.ts` atualizado para mapear agentes de `Marketing` (`MARKETING_GROUP`) com capacidades `copy.draft`, `lead.read`, `lead.search`, `company.read`, `company.search`, `knowledge.search` e eventuais capacidades de seu `primaryJobRole`.
   - Mapeados agentes de `Customer Success` (`CS_GROUP`) com `churn.analyze`, `company.read`, `company.search`, `deal.read`, `meeting.read`, `meeting.analyze`, `knowledge.search` e capacidades de `primaryJobRole`.
   - Redução comprovada: agentes restritos a bindings universais reduzidos de 351 para 259 (135 agentes agora contam com capacidades de domínio ricas e tipadas).

3. **Regeneração e Validação de Artefatos**:
   - Artefatos normalizados (`capabilities.normalized.json`, `agentCapabilities.normalized.json`, `roleCapabilities.normalized.json`) regenerados.
   - Suíte de testes `capabilitiesNormalizedArtifact.test.ts` expandida e aprovada (5/5 testes verdes).
   - Verificação de OpenAPI drift executada com sucesso (`npm run verify:openapi-drift` verde com 0 divergências).
