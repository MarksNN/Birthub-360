# Parecer Agente 24 — PR #83 (OpenAPI: 10 rotas `/agent` de `agent.routes.ts`)

- **Missão:** documentar em `docs/openapi.yaml` as 10 rotas de `src/features/intelligence/routes/agent.routes.ts` que fazem `verify:openapi-drift` falhar no `main`.
- **Autor:** Agente GHA (branch `agente/gha-openapi-agent-routes`)
- **Auditor:** Agente 24 — Revisão Independente
- **Data:** 2026-10-25 (America/Sao_Paulo)
- **Head auditado:** `08a1f6224d0d09761e166ffe67883f93fda42c9b` (não mudou durante a auditoria). São 2 commits: `482c73e6` (docs) e o merge de `main` 67677295.
- **Base / merge-base:** `main` @ `6767729580fda0f333cfb59b66271f5e0bf05c7e` (0 atrás)
- **Blob auditado:** `docs/openapi.yaml` = `daad1bc5b920452117ba652138012025afcc731e`
- **Decisão:** **BLOQUEADO @ 08a1f622**. O contrato confere com os handlers e nenhum defeito do PR impede a aprovação. Falta a evidência de CI: o application gate (que contém "Verificar deriva de OpenAPI") ficou *skipped* pela falha herdada do Trivy.

## Escopo
Docs-only: `docs/openapi.yaml` +179/−0. Nenhum código alterado.

## As 10 rotas (drift no `main` 67677295, exit 1)
1. GET `/agent/circuit-breaker/state`
2. GET `/agent/learning-heatmap`
3. GET `/agent/model-benchmark`
4. POST `/agent/success-prediction`
5. GET `/agent/proactive-alerts`
6. GET `/agent/prompt-ab-testing/experiments`
7. GET `/agent/realtime-dashboard`
8. GET `/agent/audit-logs`
9. GET `/agent/usage-heatmap`
10. GET `/agent/cost-analysis`

## Critérios e resultados

| # | Critério | Resultado |
|---|---|---|
| 1 | Docs-only, base atual, merge limpo | ✅ só `docs/openapi.yaml`; contém o `main` atual; `merge-tree` limpo (tree `612decaf`); GitHub `MERGEABLE` |
| 2 | Fidelidade aos handlers (`main`) | ✅ métodos e paths batem 10/10 (detalhes abaixo) |
| 3 | Convenções | ✅ paths sem `/api` (`servers: /api`); `tags: [Agent]`; segurança global `sessionCookie` sem override por operação (correto: as 10 passam por `authenticateToken` + `requireTenant`); `DataEnvelope` reutilizado em 9/10, `audit-logs` com schema inline `{success, data:{logs,total}}` (fiel ao handler); YAML sem chaves duplicadas (`yaml` uniqueKeys); 0 `$ref` não resolvidos; o arquivo não usa `operationId` (0, sem duplicatas) |
| 4 | Drift local | `main`: **exit 1**, com as 10 rotas acima. PR: **exit 0** (464 paths, 74 routers). Testes `lead-openapi-contract` e `openapiRouteInventory`: 10/10. Não há redocly/swagger-parser/spectral em `node_modules`; a validação estrutural foi feita com o `yaml` (parse estrito + resolução de `$ref`) |
| 5 | Interação com o PR #72 @ 91f3f138 | ✅ o #72 só reformata `agent.routes.ts` (quebra de linha em `await import(...)` e em `router.get('/prompt-ab-testing/experiments', …)`), sem mudar path, método ou body. Merge de rascunho #83+#72 (merge-tree limpo, tree `2f3e0444`, commit descartável `e3609d67`): drift **exit 0**. Mutação no rascunho (doc de `prompt-ab-testing/experiments` renomeado): drift **exit 1**, apontando exatamente essa rota, ou seja, o parser lê a forma multilinha do #72. Árvore revertida |
| 6 | Tenancy/LGPD | Os 10 handlers tiram `organizationId` (e o id do usuário) de `req.user`, nunca de body/query. Ver achados P2/P3 sobre `audit-logs` |
| 7 | CI do head | Release `40210562537`: secret scan ✅, dependency review ✅, **trivy ❌**, **application gate skipped**, build ❌. Trivy `40210562523` ❌ (herdado; o #67 corrige). CodeQL ✅, Dependency Review ✅, SonarQube/Visual em andamento (13:16 BRT). O passo "Verificar deriva de OpenAPI" **não executou** |

### Fidelidade rota a rota
- **POST `/success-prediction`** × `successPredictionSchema`: `agentRole` enum `[SDR,BDR,CLOSER,CRM,OPS,SUPERVISOR]` obrigatório ✅; `missionType` string min 1 obrigatório ✅ (zod faz `trim` antes; o OpenAPI não expressa isso); `leadId`/`leadStage` string opcional ✅; `leadScore` number 0–100 ✅; `timeSinceLastContact` number ✅; `previousAttempts` integer ≥0 ✅. Sem RBAC (`writeRoles` não se aplica) e o doc não alega RBAC ✅. 400 vem de `validateRequest` → `ZodError` → `errorHandler` 400 `VALIDATION_ERROR` ✅.
- **`audit-logs`**: query `agentType`, `action`, `result` ✅; resposta `{success, data:{logs,total}}` ✅. O enum `result` não é validado pelo handler (P4).
- **`usage-heatmap` / `cost-analysis`**: `days` com `parseInt`, default 30, sem limite. O doc declara isso explicitamente ✅.
- **`circuit-breaker/state`**: `data: state || null`, o doc cita o `null` ✅. **`proactive-alerts`**: o doc avisa do efeito colateral de um GET ✅.
- **Demais rotas**: `{success:true, data}` → `DataEnvelope` ✅.

## Achados
- **P2 (pré-existente, fora do escopo do PR, dono 07):** 4 das 10 rotas usam serviços que referenciam modelos/campos Prisma inexistentes no `schema.prisma` atual (`tsc` confirma). A expectativa é 500 em runtime; não verifiquei contra o banco.
  - `audit-logs`: `prisma.swarmAuditLog` não existe.
  - `prompt-ab-testing/experiments`: `prisma.promptExperiment` não existe.
  - `model-benchmark`: `AIPendingAction.modelName/status` não existem.
  - `proactive-alerts`: `AIPendingAction.status` não existe.
  - O contrato promete 200 para endpoints que hoje não funcionam. Não é erro do doc, mas o PR deveria sinalizar isso (descrição "não funcional até …" ou `deprecated`) ou abrir um handoff para o 07 corrigir ou remover as rotas.
- **P3 (LGPD latente, handler):** `getSwarmAuditLogs` devolve `ipAddress`, `userAgent`, `userId` e `parameters` de todos os usuários da organização para qualquer papel autenticado, sem `requireRole`. Hoje está latente, porque o modelo não existe. O doc modela os itens como `{type: object}` e esconde essa exposição.
- **P4:** o summary de `learning-heatmap` diz "na organização/tenant do usuário", mas o handler passa `req.user.id` como `tenantId` e o serviço lê `getLearningProfileHistory(org, userId)`, ou seja, o perfil do **próprio usuário**. O mesmo vale para o "tenant" de `success-prediction`.
- **P4:** o enum `result: [success, error]` em `audit-logs` não é imposto pelo handler (faz cast sem validar).
- **P4:** o 400 de `success-prediction` não referencia `#/components/schemas/ErrorResponse` (`code: VALIDATION_ERROR`, `details`). Segue o padrão das rotas vizinhas, então é inconsistência menor.
- **Ordem/CI (informativo):** no `ci.yml`, o passo de drift vem **depois** de `npm run typecheck` e de `test:architecture`. Com o `tsc` do `main` vermelho (ver os pareceres do #75/#79), o passo de drift não vai rodar em CI nem depois do #67. Para chegar a APROVADO também é preciso o typecheck verde, ou uma evidência de CI que execute esse passo.
- **Processo (informativo, corrigido):** o #79 recebeu APROVADO @ 6cfdc15c (commit 3bda8e28, 13:08:51 BRT) com evidência de CI da v4b (run 40209285892, Architecture verde) e foi mergeado depois, em 67677295 (13:09:24 BRT). Não houve merge sem parecer.

## Pendências para APROVADO
1. Application gate executado com "Verificar deriva de OpenAPI" verde num head que contenha o blob `daad1bc5…`. Se o head mudar só por merge/rebase com o mesmo blob, a revisão é só de CI. Mudança de conteúdo exige nova auditoria (§40).
2. Recomendado, não bloqueante: registrar o P2 (handoff para 07) e anotar as 4 rotas quebradas.

## Comandos principais
```
git merge-tree --write-tree origin/main origin/pr83
npx tsx scripts/verify-openapi-drift.ts      # main exit 1 (10 rotas) | PR exit 0 | main+#83+#72 exit 0 | mutação exit 1
node /tmp/oa-check.mjs                        # yaml estrito, $ref, tags, security, operationId
npx vitest run tests/unit/shared/contracts/lead-openapi-contract.test.ts tests/unit/shared/openapiRouteInventory.test.ts  # 10/10
npx tsc --noEmit | grep intelligence/services # P2
gh run list -R MarksNN/Birthub-360 --commit 08a1f6224d0d09761e166ffe67883f93fda42c9b
```
