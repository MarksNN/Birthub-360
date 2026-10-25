# Parecer do Agente 24: PR #83, re-auditoria @ 83790e7f (OpenAPI das 10 rotas `/agent`)

**Decisão: APROVADO @ `83790e7fb03d7062eb16cb7dd1d5582dc7fad236`.** Cobre só o conteúdo de `docs/openapi.yaml` (blob `489fa89d`). A seção Pendências traz a ressalva de CI.

## Identificação

| Campo | Valor |
|---|---|
| Missão | Documentar em `docs/openapi.yaml` as 10 rotas de `src/features/intelligence/routes/agent.routes.ts` que faltavam (deriva herdada da `main`) e descrever o comportamento **atual** delas |
| PR | https://github.com/MarksNN/Birthub-360/pull/83, branch `agente/gha-openapi-agent-routes` |
| Autor | Agente GHA |
| Auditor | Agente 24 (Revisão Independente) |
| Data | 2026-10-25, 14:35 BRT (America/Sao_Paulo) |
| Head auditado | `83790e7fb03d7062eb16cb7dd1d5582dc7fad236`. Confere com o informado e não mudou durante a auditoria. Commits: `482c73e6`, `08a1f622` (merge da main), `9ae2f613`, `83790e7f` |
| Base | `main` @ `6767729580fda0f333cfb59b66271f5e0bf05c7e`, com 4 commits à frente e 0 atrás. Estado `MERGEABLE` / `UNSTABLE` |
| Arquivo auditado (único tocado) | `docs/openapi.yaml`, blob `489fa89dd63187d6c2a1f1e73a74150f038c8ce3` (confere com o informado `489fa89d`), sha256 `6e8b4629492fca7040c8463d6f1f5b001589910825844aa94c9e7bdfef5b9e95`, 12337 linhas (+300 / −0 sobre a `main`) |
| Pareceres anteriores | BLOQUEADO @ `08a1f622`; REPROVADO @ `9ae2f613` (`.agents/reviews/openapi-agent-routes-pr83-9ae2f613-24.md`, branch `agente/24-review-pr83-9ae2f613`) |

Qualquer mudança nesse blob invalida este parecer (AGENTS.md §40).

## Escopo e critérios

- Só documentação: o PR toca um arquivo e não altera código.
- Critérios: as 4 correções exigidas no parecer @ 9ae2f613; causas declaradas exatas frente ao código da `main` (handlers, services e `prisma/schema.prisma`); YAML válido com `$ref` resolvidos; conjunto de paths e métodos coerente com as rotas reais (drift); nenhum efeito fora das 10 rotas; ponto de LGPD em `audit-logs`.

## Comandos (só leitura: `gh api` e Python local em /tmp; sem clone e sem npm ci)

```
gh pr view 83 --json headRefOid,commits,files,mergeable,mergeStateStatus
gh api repos/MarksNN/Birthub-360/contents/docs/openapi.yaml?ref={83790e7f,9ae2f613,08a1f622,67677295}   # blobs e conteúdo
diff oa_9ae2f613.yaml oa_83790e7f.yaml                                                                  # 175 linhas de diff, só nas 7 rotas
gh api repos/.../compare/67677295...83790e7f                                                            # 1 arquivo, +300/-0
gh api .../contents/{agent.routes.ts, 10 services, schema.prisma, errorHandler.ts, verify-openapi-drift.ts}?ref=67677295
python3 (PyYAML 6.0.3, loader estrito contra chaves duplicadas) chk.py                                  # estrutura, $ref, paths
gh run view 40211137038 --json jobs ; gh api actions/jobs/121222584945                                  # run v4d
gh api .../compare/67677295...cdc9f5ef ; extração com a regex do drift sobre as rotas v4d e main        # equivalência das entradas do drift
gh run list --commit 83790e7fb03d7062eb16cb7dd1d5582dc7fad236
```

## Verificação das correções exigidas

### (1) 500 → `ErrorResponse` nas 7 rotas, "falha sempre", causa exata, deprecated

Resultado: ✅

As 7 rotas têm agora `deprecated: true` e `'500'` → `$ref: '#/components/schemas/ErrorResponse'`, descrito como "Comportamento atual e determinístico: falha sempre". O `200` passou a dizer "contrato pretendido; hoje nunca é retornado (ver 500)". Conferi cada causa contra a `main`. O model `AILog` (`schema.prisma`) só tem `id, tokens, cost, latencyMs, model, promptId, organizationId, agentRole, createdAt`.

| Rota | Causa declarada | Código na `main` | Confere |
|---|---|---|---|
| GET `/model-benchmark` | `where.modelName` mais select de `success/costUsd/promptTokens/completionTokens` em `AILog` → PrismaClientValidationError | `modelBenchmark.service.ts:61-75` (`where: { modelName }`, `select: { success, latencyMs, costUsd, promptTokens, completionTokens }`), chamado via `Promise.all` de 6 papéis × 3 modelos (`:214-224`) | ✅ |
| POST `/success-prediction` | Depois do 400 de validação, `predictMissionSuccess` chama primeiro `getHistoricalMissionData`, que faz select de `success/costUsd` | `agent.routes.ts:210-229` (`validateRequest`); `successPrediction.service.ts:62` é a primeira `await`; `:123-134` faz select de `success, costUsd, latencyMs` | ✅ |
| GET `/proactive-alerts` | `calculateAgentHealthMetrics` para o primeiro papel (SDR) faz select de `success/costUsd` antes de criar alertas | `proactiveAlerts.service.ts:140-144` (laço que começa em `'SDR'`); `:66-77` | ✅ |
| GET `/prompt-ab-testing/experiments` | **TypeError**: o model `PromptExperiment` não existe | `promptAbTesting.service.ts:210` usa `prisma.promptExperiment.findMany`; 0 ocorrências de `PromptExperiment` em `schema.prisma` | ✅ |
| GET `/realtime-dashboard` | A 1ª consulta (`AgentMemory`) é válida e a 2ª falha (select de `costUsd/success` em `AILog`). Depois disso, `status: 'Running'` fora do enum também falharia | `swarmRealtimeDashboard.service.ts:55-60` (válida), `:67-77` (select inválido), `:85-91` (`'Running'`); o enum `AgentMemoryStatus` é `{Completed, Failed}` | ✅ (a ordem agora está certa) |
| GET `/audit-logs` | **TypeError**: o model `SwarmAuditLog` não existe | `swarmAudit.service.ts:91-98` (`Promise.all([prisma.swarmAuditLog.findMany(...), ...count(...)])`; o acesso a `undefined.findMany` lança dentro da função async e vira rejeição); 0 ocorrências em `schema.prisma` | ✅ |
| GET `/cost-analysis` | Select de `costUsd/promptTokens/completionTokens` (o `AILog` tem `cost/tokens`); não usa `'Running'` | `agentCostAnalysis.service.ts:34-45` | ✅ |

Os 7 handlers fazem `next(err)`. O `errorHandler.ts:181-187` converte esses erros (que não têm `statusCode`) em `sendError(500)`, com o envelope `{success:false, error, code:'INTERNAL_ERROR', retryable:true, requestId}`, compatível com `ErrorResponse` (`required: [success, error]`). Em produção a mensagem vira "Erro Interno do Servidor" e o formato continua o mesmo.

As falhas são determinísticas. PrismaClientValidationError e TypeError acontecem no client, antes de qualquer I/O, e não dependem dos dados. A sonda de runtime do parecer @ 9ae2f613 confirmou isso, e o código dos services é o mesmo, porque a `main` não mudou.

### (2) 501

Resultado: ✅

Nas 4 rotas que mantêm o 501 (`model-benchmark`, `proactive-alerts`, `prompt-ab-testing/experiments`, `audit-logs`), a description diz "Planejado — não implementado; hoje responde 500.". O schema é `allOf: [ErrorResponse, {required:[success], properties:{success:{type:boolean, enum:[false]}}}]`, o que exige `success:false` do 501 futuro e resolve a incompatibilidade com o padrão `voice-hub/routes/ai.routes.ts:21-31`, que não tem `success`. A description da operação também diz "falha sempre com 500 … 501 é o comportamento planejado". As 3 rotas deprecated nesta rodada não declaram 501, e isso é coerente porque ali não há plano de 501.

### (3) Classe de erro

Resultado: ✅

`audit-logs` e `prompt-ab-testing/experiments` agora citam TypeError ("Cannot read properties of undefined (reading 'findMany')"), tanto na operação quanto no 500.

### (4) Drift verde em CI

Resultado: ⚠️ Não rodou no head. Aceito a equivalência.

- **Não rodou no head final.** No Release `40213730273` (head `83790e7f`), o trivy scan falhou (`121230266387`), o application gate (`121230412830`) foi **skipped** e o build (`121230412202`) falhou em "Consolidar veredito". O passo "Verificar deriva de OpenAPI" **não executou** no head final, e eu não anuncio esse gate como verde.
- **O que o drift verifica** (`scripts/verify-openapi-drift.ts`, lido na `main`; npm `verify:openapi-drift`): o Passe 1 cobre prefixos `app.use('/api/…')` do composition root contra os paths do doc. O Passe 2 cobre `router.<método>('/subpath')` literais (regex `\.(get|post|…)\(\s*['"](\/[^'"]*)['"]`, que também pega quebras de linha) contra **path mais chave de método** do YAML. Ele **não lê** `responses`, `description`, `deprecated` nem schemas. A saída é só função do conjunto de paths e métodos mais o código das rotas.
- **O run v4d `40211137038` é evidência de drift** (branch `agente/gha-validate-v4d`, commit `cdc9f5ef`, 16:19 UTC = 13:19 BRT). Com o application gate `121222584945`, ele teve o passo 14 "Verificar deriva de OpenAPI" com **success**. (O job falhou depois, no passo 15 "Run Unit Tests", em material da v4d que não é do #83.) Conferi as entradas:
  - o `docs/openapi.yaml` da v4d é o blob `daad1bc5`, o mesmo de `08a1f622`;
  - os conjuntos path+método de `08a1f622`, `9ae2f613` e `83790e7f` são **idênticos** (523 operações cada; a `main` tem 513; +10 e −0, exatamente as 10 rotas);
  - a v4d está 0 atrás da `main`. Dos arquivos de rota, só mudaram `agent.routes.ts` e `universalEcosystem.routes.ts`, e só em formatação. A extração com a regex do drift dá conjuntos **iguais** (21/21 e 7/7). `server.ts` não mudou, e os 3 arquivos de `src/bootstrap/` alterados têm as mesmas chamadas de rota.

  Então as entradas do drift na v4d equivalem às do head final mais a `main`, e o resultado (exit 0) vale para `83790e7f`. **Aceito essa evidência.**
- **Testes relacionados:** `tests/unit/shared/openapiRouteInventory.test.ts` usa a mesma função de drift. `tests/unit/shared/contracts/lead-openapi-contract.test.ts` só lê `components.schemas` de Lead. No head, tudo fora de `paths` é **idêntico** à `main` e os paths fora das 10 rotas também. Logo, o resultado 10/10 do parecer @ 9ae2f613 continua válido.
- Não verifiquei o "drift local exit 0" que o GHA declarou para `83790e7f`: sem clone, não o executei. Ele fica como status declarado. A conclusão acima não depende dele.

## Outras verificações

- **YAML:** o parse com loader estrito (PyYAML 6.0.3, que rejeita chaves duplicadas) passou; `openapi: 3.0.3`. Há 82 `$ref` distintos e **0 sem resolução**. `ErrorResponse`, `DataEnvelope` e `components/responses/BadRequest` (→ `ErrorResponse`) existem. `deprecated: true` em Operation Object e `allOf` no schema são válidos no OAS 3.0.3. Ressalva: não rodei um validador OpenAPI completo (Spectral ou swagger-cli) por falta de recursos no box; a checagem foi estrutural.
- **Sem efeito colateral:** os blocos não-`paths` (components, security, tags e outros) e todos os paths fora das 10 rotas são idênticos à `main`.
- **3 rotas funcionais** (sem deprecated e só com `200` → `DataEnvelope`), todas ✅:
  - `circuit-breaker/state`: estado em memória (`autonomyCircuitBreaker.service.ts:206-208`); `data` pode ser `null`, o que o `DataEnvelope.data: {}` aceita.
  - `learning-heatmap`: escopo por organização e usuário autenticado (`agent.routes.ts:176-186`).
  - `usage-heatmap`: select válido em `AgentMemory` (`agentType/status/createdAt`, `agentUsageHeatmap.service.ts:33-42`).
- **LGPD em `audit-logs`:** os itens de `logs` continuam `{type: object}`, sem campos pessoais declarados. A rota está deprecated e não funciona (o model não existe). A nota de reativação pede `requireRole(ADMIN, GESTOR)`, zod na query e os campos definidos pelo Agente 21. Não há regressão nem exposição nova.

## CI do head `83790e7f` (consultado por volta de 14:30 BRT; sem watch)

| Run | Resultado | Leitura |
|---|---|---|
| Security - CodeQL `40213730279` | success | — |
| Security - Dependency Review `40213730288` | success | — |
| Visual Regression `40213730230` | success | — |
| Security - Trivy `40213730229` | failure ("Rodar Trivy", HIGH/CRITICAL) | **PRÉ-EXISTENTE**: a `main` @ 67677295 falha igual (Release `40210327388`); a correção está no #67. Não tem relação com um .yaml de docs |
| SonarQube `40213730342` | failure ("Run Tests with Coverage") | **PRÉ-EXISTENTE**: falha igual na `main` (`40210327416`) e em `333af2ab` |
| Release `40213730273` | trivy ✗ → application gate **skipped** → build ✗ | O drift **não executou** aqui; ver a correção (4) |

O `format:check` é `biome format src` e o Prettier de CI não cobre `docs/openapi.yaml`. Por isso a checagem de formatação **não se aplica** ao arquivo.

## Achados

- **P1:** nenhum.
- **P2:** nenhum.
- **P3-1 (CI, PRÉ-EXISTENTE):** o application gate não rodou no head final por causa do Trivy herdado. Isso não bloqueia o conteúdo, porque a equivalência do drift está demonstrada acima, mas precisa ficar registrado. Depois do #67 entrar na `main`, o PR deve ser atualizado e o gate rerodado. Se o drift falhar no rerun, o parecer cai.
- **P4-1:** `usage-heatmap`/`cost-analysis` com `days` não numérico (`parseInt` → NaN → `new Date(NaN)`) provavelmente geram 500. O parâmetro avisa "janela inválida/NaN", mas não há `'500'` documentado em `usage-heatmap`. Melhoria opcional.
- **P4-2:** a nota "ele tem `tokens`, `cost`, `latencyMs` e `model`" omite `agentRole`, `organizationId` e `promptId`. Não está errado no que afirma, só não é exaustivo.
- **P4-3 (para 07/21, código, fora do escopo):** na `main`, `GET /agent/audit-logs` não tem `requireRole`. Hoje é inócuo porque a rota falha sempre, mas a reativação **precisa** seguir a nota do doc.
- **P4-4:** os 401 e 403 não estão declarados nas 10 rotas. Seguem o `security: sessionCookie` global, como o resto do arquivo. É convenção, não erro.

## Pendências (não bloqueiam este APROVADO)

1. Rerodar a Central Release no PR depois do #67, com o application gate e o drift verdes. Se falhar, este parecer está invalidado.
2. O Agente 07 deve reimplementar as 7 rotas (models `SwarmAuditLog`/`PromptExperiment` ou remoção; campos `cost/tokens` do `AILog`; o enum `'Running'`) e trocar 500 por 501 com `success:false`. A cada mudança de comportamento, o doc precisa ser atualizado e reauditado.
3. O integrador (08A) só pode fazer o merge com a autorização da missão (§40). Este parecer não autoriza deploy.

## Decisão

**APROVADO @ `83790e7f`** (blob `489fa89d`). As 4 correções exigidas foram feitas, e as causas declaradas conferem com o código e o schema da `main`. O YAML é estruturalmente válido e as 3 rotas funcionais estão corretas. O drift está comprovado por equivalência de entradas com o run `40211137038`, mas **não** foi executado na CI do head final por causa de falha PRÉ-EXISTENTE do Trivy (P3-1).
