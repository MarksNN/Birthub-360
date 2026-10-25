# Parecer Agente 24 — PR #83 re-auditoria (OpenAPI: 10 rotas `/agent`)

- **Missão:** documentar as 10 rotas de `agent.routes.ts` ausentes de `docs/openapi.yaml` (deriva herdada no `main`).
- **Autor:** Agente GHA (branch `agente/gha-openapi-agent-routes`)
- **Auditor:** Agente 24 — Revisão Independente
- **Data:** 2026-10-25 (America/Sao_Paulo)
- **Head auditado:** `9ae2f6139fd84d306e57739ef3a2dc6a58fb81f3` (confere com o informado). Parecer anterior: BLOQUEADO @ 08a1f622.
- **Base:** `main` @ `6767729580fda0f333cfb59b66271f5e0bf05c7e` (0 atrás, 3 à frente); `merge-tree` limpo (tree `561fa053`); `MERGEABLE`
- **Blob auditado:** `docs/openapi.yaml` = `ba9382f40fedd47bde80f202cd7c653a3254e476` (+232 vs `main`; +81/−28 vs 08a1f622; mesmos paths)
- **Decisão:** **REPROVADO @ 9ae2f613.** O contrato declara errado o comportamento **atual** de 3 rotas: diz "pode falhar", mas elas falham **sempre**, com 500. Além disso, documenta 501 em 4 rotas sem documentar o 500 que elas devolvem hoje. A CI também segue incompleta (application gate skipped).

## Escopo
Docs-only (`docs/openapi.yaml`). Nenhum código alterado.

## O que cada handler devolve hoje (prova em runtime)
Sonda descartável (`/tmp/probe/probe.mts`, fora do repo): importa os serviços reais com o client Prisma real (7.10.0), com `DATABASE_URL` apontando para uma porta inalcançável, e passa o erro pelo `errorHandler` real. O `PrismaClientValidationError` acontece no client, **antes** de qualquer conexão. Por isso essas falhas são determinísticas e não dependem dos dados.

| Rota | Erro hoje | HTTP (errorHandler) | Doc no head |
|---|---|---|---|
| GET `/audit-logs` | `TypeError` (`prisma.swarmAuditLog` undefined → `.findMany`) | 500 `INTERNAL_ERROR` | deprecated, 200 + 501; texto diz "PrismaClientValidationError" ✗ |
| GET `/prompt-ab-testing/experiments` | `TypeError` (`prisma.promptExperiment` undefined) | 500 | deprecated, 200 + 501; mesma atribuição errada ✗ |
| GET `/model-benchmark` | `PrismaClientValidationError` (`aILog.where.modelName`) | 500 | deprecated, 200 + 501 |
| GET `/proactive-alerts` | `PrismaClientValidationError` (`aILog.select.success`) | 500 | deprecated, 200 + 501 |
| POST `/success-prediction` (body válido) | `PrismaClientValidationError` (`aILog.select.success/costUsd`), chamada incondicional em `getHistoricalMissionData` | **500 sempre** | 200 + 400; texto "**pode** falhar" ✗ |
| GET `/realtime-dashboard` | 1ª query `agentMemory` passa; 2ª, `aILog.select.costUsd/success`, falha na validação; depois disso ainda há `status: 'Running'` (fora do enum `AgentMemoryStatus {Completed, Failed}`) | **500 sempre** | 200; texto "**pode** falhar" e atribui só ao `'Running'` ✗ |
| GET `/cost-analysis` | `PrismaClientValidationError` (`aILog.select.costUsd/...`; o `AILog` tem `cost`/`tokens`) | **500 sempre** | 200; texto "**pode** falhar" ✗ |
| GET `/usage-heatmap` | campos válidos (`agentType/status/createdAt`); só falhou por falta de banco | 200 esperado | 200 ✅ |
| GET `/learning-heatmap` | resolveu (`patterns: []`) | 200 | 200 ✅ |
| GET `/circuit-breaker/state` | estado em memória | 200 | 200 ✅ |

`errorHandler.ts`: erros genéricos e `PrismaClientValidationError` caem em `err.statusCode ?? 500` → `sendError(500)`, com o corpo `{success:false, error, code:'INTERNAL_ERROR', retryable:true, requestId}`. Hoje nenhum caminho devolve 501. Também não há PR aberto que implemente o 501 em `agent.routes.ts`.

## Verificações
- **Drift local:** head **exit 0**. Merge de rascunho head + #72 @ 91f3f138 (tree `10ef1876`, commit descartável): **exit 0**. Árvore revertida.
- **Estrutura:** YAML estrito sem erros nem chaves duplicadas; 0 `$ref` não resolvidos; 0 `operationId`; paths sem `/api`. `deprecated: true` em operação é válido no OAS 3.0.3. `components/responses/BadRequest` existe e aponta para `ErrorResponse` (`required: [success, error]`, com `code`/`details`), compatível com o 400 `VALIDATION_ERROR` de `validateRequest`/`errorHandler` ✅.
- **Testes:** `lead-openapi-contract` + `openapiRouteInventory` 10/10.
- **Escopo do usuário:** a correção em `learning-heatmap` e `success-prediction` confere (`organizationId` + `id` do usuário autenticado) ✅.
- **`days`:** `minimum: 1` com a ressalva de que o handler não valida. Aceitável como orientação, porque está declarado.
- **LGPD:** os itens de `audit-logs` continuam `{type: object}`. A rota agora é deprecated, não funciona e tem nota de reativação com `requireRole(ADMIN, GESTOR)`. Não há regressão.
- **CI do head:** Release `40211948966`: trivy ❌, **application gate skipped**, build ❌. Trivy `40211948848` ❌ (herdado). SonarQube `40211948841` ❌ em "Run Tests with Coverage", mesma falha de outros branches. CodeQL, Dependency Review e Visual ✅. O passo "Verificar deriva de OpenAPI" não rodou.

## Achados
- **P2 (defeito; causa da reprovação):** `success-prediction`, `realtime-dashboard` e `cost-analysis` falham **sempre** com 500 em qualquer requisição válida, e o doc diz "hoje **pode** falhar". As três ficam fora do `deprecated`, embora quebradas pelo mesmo motivo das 4 marcadas: o critério ficou inconsistente. Em `realtime-dashboard`, a causa citada (`'Running'`) é secundária; o select de `AILog` falha antes.
- **P3:** nas 4 rotas deprecated, o `responses` lista 200 e 501, mas o comportamento atual (500 `INTERNAL_ERROR`) não aparece em `responses`. O 501 só está marcado como futuro na `description` da operação; a description da resposta 501 não diz que é planejada.
- **P3:** o padrão citado (`voice-hub/routes/ai.routes.ts:21-31`) devolve `{error, code}` **sem `success`**. Copiado como está, o 501 futuro viola o `ErrorResponse` referenciado (`required: [success, error]`).
- **P4:** `audit-logs` e `prompt-ab-testing/experiments` falham com `TypeError` (modelo inexistente), não com `PrismaClientValidationError`.
- **P4:** `minimum: 1` em `days` não é imposto pelo handler. Já está declarado; aceitável.

## Correção mínima para reavaliar
1. Nas 7 rotas quebradas (as 4 deprecated + `success-prediction`, `realtime-dashboard`, `cost-analysis`): adicionar `'500'` → `$ref ErrorResponse`, descrito como o comportamento **atual** e **determinístico**; trocar "pode falhar" por "falha sempre (…)" com a causa correta. Também: marcar as 3 restantes como `deprecated` ou justificar no doc por que não.
2. Na resposta `'501'`: description explícita, por exemplo "Planejado — ainda não implementado; hoje responde 500". Ou remover o 501 até existir o código. Se mantiver, o 501 futuro precisa devolver `success:false`.
3. Corrigir a classe de erro de `audit-logs`/`prompt-ab-testing` (TypeError).
4. Depois: o application gate precisa rodar "Verificar deriva de OpenAPI" verde num head com o conteúdo final (§40).

## Comandos principais
```
git diff 08a1f622 origin/pr83 -- docs/openapi.yaml
DATABASE_URL=postgresql://u:p@127.0.0.1:1/none node --import tsx /tmp/probe/probe.mts   # tabela acima
node --import tsx scripts/verify-openapi-drift.ts      # head exit 0 | head+#72 exit 0
node /tmp/oa-check.mjs                                  # yaml/$ref/operationId
vitest run tests/unit/shared/contracts/lead-openapi-contract.test.ts tests/unit/shared/openapiRouteInventory.test.ts  # 10/10
gh run list -R MarksNN/Birthub-360 --commit 9ae2f6139fd84d306e57739ef3a2dc6a58fb81f3
```
