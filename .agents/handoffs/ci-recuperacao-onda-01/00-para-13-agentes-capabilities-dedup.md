De: Agente 00 — Coordenador
Para: Agente 13 — Enxame Autônomo e Governança de Agentes de Runtime
Onda: Onda 01 — Governança e Inventário Forense
Status: aberto
Prioridade: bloqueador
Bloqueador-ref: B-CATALOG-01 / Issue #45
Sprint destino: Onda 02

## Problema
Os testes de integração (`npm run test:integration`) falham com 4 assertions na validação do motor de capabilities e seed multi-cargo:
1. `AssertionError: cargo undefined do agente account-detective deveria existir: expected undefined to be defined` em `tests/integration/seed-multi-cargo.test.ts:42`
2. `AssertionError: agentes sem nenhuma capability: account-detective, promise-guardian, devils-advocate: expected [ ... ] to deeply equal []` em `tests/integration/capability-engine.test.ts:151`
3. `AssertionError: expected [ ... ] to have a length of 391 but got 394` em `tests/integration/capability-engine.test.ts:134`
4. `AssertionError: expected 15 to be 12` em `tests/integration/capability-engine.test.ts:127`

Causa-raiz: O banco de dados possui 394 AgentDefinitions (379 core + 15 táticos), mas três agentes táticos novos (`account-detective`, `promise-guardian`, `devils-advocate`) foram adicionados sem cargo correspondente em `scripts/seed-multi-cargo.ts` e sem capabilities mapeadas em `build-capability-catalog.ts`.

Além disso, os PRs #25 (`agente/gha-agents-capabilities`) e #29 (`agente/gha-capabilities-normalized`) foram criados a partir de um commit intermediário contaminado (`cd09655`) e arrastam 18 a 22 arquivos alheios (Landing360, tokens de estilo, package.json, e2e helpers).

## Arquivo(s) envolvido(s)
- `scripts/seed-multi-cargo.ts`
- `scripts/capability-import/build-capability-catalog.ts`
- `src/features/job-roles/catalog/agentCapabilities.normalized.json`
- `src/features/job-roles/catalog/capabilities.normalized.json`
- `tests/integration/seed-multi-cargo.test.ts`
- `tests/integration/capability-engine.test.ts`
- `tests/unit/features/job-roles/capabilitiesNormalizedArtifact.test.ts`

## Evidência
Execução no GitHub Actions (runs 39700177365 e 39701247757 nos PRs #43 e #44):
Step `Run Integration Tests (auth, RBAC and tenant isolation)` falha exatamente nestas 4 asserções.
Diff dos PRs #25 e #29 contra a `main`:
Contém alterações de `Landing360.tsx`, `birthhub360.css`, `package-lock.json`, etc., violando o princípio P3 (Alterações Cirúrgicas) e a matriz de propriedade de arquivos.

## Alteração necessária
1. Extrair de forma estritamente cirúrgica (cherry-pick limpo sobre `main`):
   - Atribuição de cargos: `account-detective` -> `LDR`, `promise-guardian` -> `CLOSER`, `devils-advocate` -> `GERENTE_COMERCIAL` em `scripts/seed-multi-cargo.ts`.
   - Capabilities mínimas de leitura em `scripts/capability-import/build-capability-catalog.ts`.
   - Regenerar `agentCapabilities.normalized.json` e `capabilities.normalized.json`.
   - Atualizar asserts dos testes de integração para contagem dinâmica ou 394 (379+15).
   - Incluir o teste `capabilitiesNormalizedArtifact.test.ts` de PR #29.
2. Descartar as alterações colaterais de frontend/landing/e2e presentes nos PRs #25 e #29.

## Teste esperado
- `npx vitest run tests/integration/seed-multi-cargo.test.ts` -> PASS
- `npx vitest run tests/integration/capability-engine.test.ts` -> PASS
- `npx vitest run tests/unit/features/job-roles/capabilitiesNormalizedArtifact.test.ts` -> PASS
- `npm run verify:openapi-drift` -> PASS

## Contexto adicional
Tratar os 3 novos agentes como parte integrante e permanente do enxame (15 táticos), aplicando o princípio do menor privilégio (somente leitura / análise).
