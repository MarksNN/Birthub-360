# Parecer Agente 24 — PR #19 (docs/openapi.yaml: rotas predictive REMED-03/04)

- **Veredito: APROVADO** (condição de merge abaixo)
- PR: https://github.com/MarksNN/Birthub-360/pull/19 — autor Agente 04
- SHA auditado (tip confirmado): `f97209ce69ee1425f779b99a0375920be15eb73a`
- Base: main @ `27463513`
- Data: 2026-10-20 (UTC-3, São Paulo)

## Critérios
1. Diff só em `docs/openapi.yaml` — **OK** (`git diff main...pr19 --stat`: 1 arquivo, +105/-0).
2. YAML/OpenAPI válido — **OK sem regressão**. `npx @redocly/cli@1 lint docs/openapi.yaml`: PR = 5 erros / 706 warnings; main = 5 erros / 703 warnings. Os 5 erros (`struct`) são pré-existentes em `/market-intelligence/companies/{cnpj}` (fora do escopo). Os 3 warnings novos são `operation-operationId` nas 3 operações novas — padrão do arquivo (62 operações sem operationId).
3. Paths/métodos vs código (`src/features/commercial-intelligence/routes/predictive.routes.ts`, montado em `commercialIntelligence.routes.ts:118` sob `/predictive`) — **OK**: GET `/cockpit`, GET `/backtest`, POST `/rebalance/approvals`.
4. Schema do request vs Zod `rebalanceApprovalRequestSchema` (strict) — **OK**: recommendationId 1..128, leadId 1..64, fromOwner 1..200 nullable (obrigatório), toOwner 1..200, decision enum APPROVED|REJECTED, note ≤1000 opcional, `additionalProperties: false` = `.strict()`; refine `toOwner ≠ fromOwner` documentado em descrição.
5. Respostas vs código — **OK**: 201 (novo) / 200 (`alreadyRecorded`) com `RebalanceApprovalEnvelope` (bate com `RebalanceApprovalRecord`/`RebalanceApprovalResponse`, `appliedToCrm: false`); 403 (tenant ausente no handler e requireRole); 404 (`NOT_FOUND`); 409 (`CONFLICT`, `data.existing`); 422 (Zod, `details`=fieldErrors). 401 vem do `authenticateToken` no mount.
6. Segurança/roles — **OK**: `security` global `sessionCookie`; ADMIN/GESTOR (`requireRole(COMMERCIAL_INTELLIGENCE_ROLES)`, routes.ts:18) declarado em summary e comentário; aviso de PII em `note`.
7. verify:openapi-drift — ver evidências. **OK**.
8. CI — **vermelho por causa pré-existente** (ver abaixo).

## Comandos e evidências
- `npx tsx scripts/verify-openapi-drift.ts` (script original): main ✅ e PR ✅ — **falso verde** confirmado (o script não resolve `export const predictiveRoutes = createPredictiveRoutes()`).
- Cópia local temporária `scripts/verify-openapi-drift.patched.ts` (NÃO commitada, apagada após uso) com patch em `resolveRouterLocalVarName`: se `export const X = create*Routes(`/`create*Router(`, retorna o nome local de `const <v> = Router()`.
  - main: ❌ 11 rotas sem doc — 3 predictive + 8 market-intelligence.
  - PR #19: ❌ apenas as 8 market-intelligence → **as 3 rotas predictive ficam cobertas pelo yaml do #19**.
  - Observação: o patch só pega as 8 rotas se aceitar o sufixo `Router` também (`createAccountIntelligenceRouter`).
- CI do PR (run 39509458756): `application gate` falha em **Audit for vulnerabilities (waiver-aware)**, a mesma falha da main (`Central Birth Hub 360 Release` failure @ 27463513). Os jobs dependency review, secret scan, trivy, CodeQL python e Trivy passaram. SonarQube, CodeQL JS e Visual Regression estavam pendentes no momento da auditoria.

## Achados
- **P2 (GHA/08, fora do escopo)**: `verify-openapi-drift.ts::resolveRouterLocalVarName` dá falso verde para routers exportados via factory (`= createXRoutes()` / `= createXRouter()`). Corrigir o script.
- **P2 (GHA/08 + dono de market-intelligence, fora do escopo)**: 8 rotas sem doc em `/api/market-intelligence/accounts/{id}/…` (`accountIntelligence.routes.ts`): GET intelligence, POST refresh, GET signals, GET decision-makers, GET relationships, GET recommendations, GET evidence, POST recommendations/{recommendationId}/execute. Precisam ser documentadas antes (ou junto) do fix do script, senão o drift fica vermelho.
- P4: `ErrorResponse` usado no 409 não declara `data.existing` (está só na descrição). O `.trim()` do Zod não aparece no schema (limitação do OpenAPI). As operações novas não têm `operationId` (padrão do arquivo).
- P4: não há 500 documentado (padrão do arquivo nessas rotas).

## Condição de merge
Merge só manual, com o application gate verde (depois do fix do audit na main) ou com isenção explícita do Marks, por ser PR só de docs. Qualquer commit novo invalida este parecer.

## SHA-256
- `docs/openapi.yaml` @ f97209ce: `b1a4a2cf28b98aae5027f507c2284edcd52411f8d585db16b0fe34e2e604b022`
