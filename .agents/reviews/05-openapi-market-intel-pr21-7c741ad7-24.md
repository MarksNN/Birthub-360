# Parecer Agente 24 — PR #21 (Agente 05) — OpenAPI Account Intelligence

- **PR:** https://github.com/MarksNN/Birthub-360/pull/21
- **SHA auditado (tip):** `7c741ad7259f6354effd968629b12410f278fe1f` (base main `27463513`)
- **Data:** 2026-10-20 (America/Sao_Paulo)
- **Veredito: REPROVADO** (correção trivial de 1 linha; re-review rápida no novo tip)

## Critérios e evidências
| # | Critério | Resultado |
|---|---|---|
| 1 | Diff só em `docs/openapi.yaml` | OK — `git diff --stat origin/main...7c741ad7`: 1 arquivo, +273/−0 |
| 2 | YAML válido (parse, chaves únicas) | OK — `yaml.parseDocument(uniqueKeys)` 0 erros |
| 3 | Lint OpenAPI (`@redocly/cli lint`, recommended) | **FALHA** — main 5 erros `struct` (pré-existentes, `/market-intelligence/companies/{cnpj}`); PR **7 erros**: +2 novos introduzidos pelo PR (ver A1) |
| 4 | Paths/métodos/params/status x código | OK (salvo A1) — 8 rotas batem com `accountIntelligence.routes.ts`; params/enums/limites idênticos a `accountIntelligence.schemas.ts` (id/recommendationId 1–128, page≥1, limit 1–100 default 20, enums de status/evidenceType); envelope paginado bate com service; refresh 200/201 por `created` |
| 5 | Segurança/roles | OK — mount `authenticateToken, requireTenant` (routes.ts:251); `requireRole(['VISUALIZADOR'])` no router; refresh/execute `ADMIN,GESTOR,CLOSER,SDR` — documentado corretamente |
| 6 | `verify:openapi-drift` original | exit 0 (falso verde conhecido) |
| 7 | drift com patch local temporário (`= createXRoutes()` → var `Router()` do factory; diff sha256 `1ce063cb…4b2e5`, NÃO commitado) | No PR: as **8 rotas cobertas**; restam só as 3 `/commercial-intelligence/predictive/*` (escopo do #19). Sem patch na main as 8 aparecem como deriva. |
| 8 | Conflito #19 (`f97209ce`) x #21 | `git merge-tree` limpo; árvore combinada: drift com patch **exit 0, sem deriva** |
| 9 | CI | application gate **vermelho** no passo `Audit for vulnerabilities (waiver-aware)` (mesma falha da main); demais segurança verdes; build/Sonar/CodeQL-js/Visual pendentes no momento |

## Achados
- **A1 (P2, bloqueante deste PR — dono: Agente 05):** `execute` → `'400': { description: Parâmetros inválidos, já executada, Bitrix não conectado ou sem lead/sequência }` está em flow mapping sem aspas; as vírgulas quebram em chaves extras (`já executada`, `Bitrix não conectado…`), redocly `struct` error e description truncada. Correção: pôr a string entre aspas. (Mesmo padrão dos 5 erros pré-existentes em `companies/{cnpj}` — P4, dono Agente 05, fora de escopo.)
- **A2 (P3, código, fora do escopo — dono: Agente 05, com 01 para RLS):** POST execute sem filtro explícito de `organizationId`. Verificado: `withRlsContext` usa `requestContext.tenantId`, setado por `authenticateToken` (`tenantId: user.organizationId`); `AccountRecommendation`, `Company`, `Organization`, `BitrixConnection`, `Lead`, `CadenceSequence`, `CadenceRun` têm `ENABLE`+`FORCE ROW LEVEL SECURITY` com policy `current_setting('app.current_tenant_id') = "organizationId"`. **Sem caminho cross-tenant identificado → não é P1.** Defesa em profundidade recomendada: `findFirst({ where: { id, organizationId, companyId } })`.
- **A3 (P3, código — dono: Agente 05):** o catch marca `Failed` em qualquer erro, inclusive erros de validação (400 Bitrix não conectado / sem lead / 409 cadência ativa) e falha de DB após task Bitrix já criada (efeito externo sem `externalRef`, risco de duplicar ao reexecutar). Também `prismaCadenceRunRepository.save` usa o `prisma` global em transação separada (fora da tx do `withRlsContext`; contexto RLS via extensão, mas sem atomicidade com o update de status).
- **A4 (P4):** 8 operações sem `operationId` (warning, padrão do arquivo).

## Comandos
```
git diff --stat origin/main...pr21
npx @redocly/cli lint docs/openapi.yaml --format=json   # main vs PR
npm run verify:openapi-drift                            # original e com patch temporário
git merge-tree --write-tree pr21 f97209ce               # #19 x #21
gh pr checks 21; gh run view 39509810532
```

## SHA-256
- `docs/openapi.yaml` @7c741ad7: `9132d4e24e8d3ed884fe1e0691c5072f12d1787a212349edba559d8dc7969f45`
- diff `origin/main...7c741ad7`: `c46a0a24d0b371b68d7469bbb678d4660b03a246fbfe411ba7602f0a40ee9f1d`
- patch local drift (não commitado): `1ce063cbdbdd347a4ded6636def3c7979e6b0e70bfafb14d5f0e6645f1c4b2e5`

## Merge
Não mergear. Após A1 corrigido: re-review no novo tip; merge só manual com gate verde ou isenção do Marks (PR só docs). Novo commit invalida este parecer.
