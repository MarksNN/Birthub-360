# Parecer Agente 24 — PR #23 (Agente 04) — REMED rebalance/recommendations + what-if V2

- **Veredito: REPROVADO**
- PR: https://github.com/MarksNN/Birthub-360/pull/23 — branch `agente/04-predictive-rebalance-whatif`
- Tip auditado: `22247ac57775d1a80f00959b1d06cef0ef61c7fb` (confirmado via gh)
- Merge-base: `e86f2b5c` (#19). **main avançou** para `e0683477` (#21, só openapi). `git merge-tree` main×PR: **sem conflito**.
- Data: 2026-10-20 (America/Sao_Paulo). Qualquer commit novo invalida este parecer.

## Motivo da reprovação
**P2 — o PR CRIA 2 ciclos `no-circular` novos** (`lint:architecture`, parte de `test:architecture`):
- `services/rebalanceRecommendation.service.ts → infra/PrismaRebalanceRecommendationReader.ts → (volta ao service)`
- `services/whatIfSimulation.service.ts → infra/PrismaWhatIfBaselineReader.ts → (volta ao service)`

Os 2 ciclos já existentes (`rebalanceApproval.service ↔ PrismaRebalanceApprovalStore`, `predictiveRevenueOracle.service ↔ PrismaOracleHistoryReader`, herdados do #15) são **mantidos** (nem resolvidos nem piorados). Main e0683477: 2 violações → PR: 4 violações (comando exato do script, com `--ignore-known`).
O PR replica o padrão do #15: o service faz `import()` dinâmico da infra, e a infra importa tipos/constantes do service.
**Correção sugerida:** mover as interfaces de porta (`RebalanceRecommendationReader`, `RebalanceOpenDeal/ClosedDeal/OrgUser`, `WhatIfBaselineReader`, `WhatIfClosedDeal`) e as constantes `REBALANCE_APPROVAL_ENTITY/ACTION` para um módulo `ports`/contract sem dependências. Assim a infra deixa de importar o service. Vale aplicar o mesmo aos 2 ciclos herdados.

## Critérios verificados (evidência)
| Critério | Resultado |
|---|---|
| Tenancy | OK. `organizationId` vem de `req.user` (`tenantOf`) → 403 sem org. Todas as queries Prisma novas filtram por `organizationId` (Lead, User), e AuditLog filtra por `tenantId`. `ownerIsOrgUser` usa `user.count({id, organizationId})`. `listDecisions` filtra de novo por org. RLS habilitada em Lead/user/AuditLog. |
| RBAC | OK. `/predictive` é montado sob `router.use(requireRole(COMMERCIAL_INTELLIGENCE_ROLES))`, que = ADMIN/GESTOR (teste unit de authorization). |
| Zod strict | OK. `whatIfRequestSchema` e `levers` usam `.strict()`, com limites finitos (-100..500 / -100..100) e horizon 30/90/180. O schema de approvals já era strict. |
| Sem números fabricados | OK. 6 constantes `REBALANCE_*` nomeadas, expostas em `rule` e documentadas no topo. Abaixo de 2 owners elegíveis → `insufficient_data` + `[]`. What-if usa `WHATIF_MIN_CLOSED_DEALS = ORACLE_MIN_CLOSED_WON_DEALS`. |
| recommendationId | OK. `rb_` + sha256(`org|leadId|from|to`)[0:32], determinístico. Recebe só ids, sem nome/e-mail (sem PII). |
| What-if | OK. A fórmula está em `formula`/`assumptions` e no JSDoc. P50 null, `status≠ok` ou ≤0 → `insufficient_data`. Win rate simulada fora de [0,1] → 422. Não usa elasticidades (o what-if legado do Port continua intacto). |
| LGPD | OK, com ressalva P4: a resposta GET expõe `name` de usuário e `tradeName/legalName` da empresa a ADMIN/GESTOR do mesmo tenant, o que é coerente com a finalidade. Não há PII em ids nem logs novos. |
| Contrato | OK, aditivo: só tipos V2 novos e `getRevenueBaseline` novo. O Port antigo não foi alterado e `isWon/isLost` só passaram a ser exportados. |
| OpenAPI | O tip isolado tem 5 erros no redocly, herdados e já corrigidos na main pelo #21. **O tree mergeado (main+PR) dá 0 erros ("valid")**. Drift original: sem deriva. Drift com patch temporário de factory (`= createXRoutes()`/`createXRouter()`, proposta do 04): só acusa as 8 rotas MI, que estão documentadas na main pelo #21. As 5 rotas predictive estão cobertas. O patch foi revertido, sem commit. |

## Gates (local, tip 22247ac5)
- `tsc --noEmit` (completo): **0 erros**
- `biome format src` (format:check): ok. `lint:ci`: exit 0 (573 warnings, sem errors)
- `check:hotspots`: ok
- `test:architecture` → `lint:architecture`: **FALHA, com 2 ciclos novos do PR** (main também falha, com os 2 herdados). Rodado com node 22 (`npx node@22`), porque o depcruise não suporta node 20.
- vitest dos arquivos tocados: 8 files / 50 tests ok, mais integração onda03/onda05/rbac-commercial 16/16
- Suíte unit completa: PR 630 files / 4957 passed, 1 skipped. Main e0683477: 627 / 4938. **0 falhas nas duas**, sem regressão.
- Integração Postgres 17 local (db `b24_pr23_test`, `prisma migrate deploy` com todas as migrações, extensões criadas como superuser): smoke real de `PrismaRebalanceRecommendationReader`, `PrismaWhatIfBaselineReader`, `ownerIsOrgUser` e dos services → queries válidas e `insufficient_data` com tenant vazio. **Não foi feito seed com dados reais**, então o caminho `ok` só foi validado por unit com doubles. O usuário de app é owner das tabelas, então a RLS não foi exercitada.

## CI (run 39510741524)
`application gate` está vermelho em **Audit for vulnerabilities (waiver-aware)**, o mesmo vermelho da main (Release e0683477 failure). Esse **vermelho é herdado**. Como o audit falha antes, o CI ainda não executou testes/arquitetura do PR; os ciclos novos são do PR e aparecerão quando o audit for corrigido.

## Achados
- **P2-1** Dois ciclos `no-circular` novos (acima). Bloqueia o merge.
- **P3-1 Limitação declarada (fromOwner não validado)**: o POST aceita `fromOwner` arbitrário e não confere `Lead.owner` atual nem se `recommendationId` = hash(org, lead, from, to). Um cliente pode gravar aprovação para uma recomendação obsoleta (o owner mudou) ou forjada com um id qualquer. **Sim, permite aprovação com estado obsoleto.** O impacto é limitado porque a decisão só vai para o AuditLog e nada é aplicado ao CRM, e o toOwner é restrito ao tenant. Por isso é P3, e vira P1 se algum consumidor futuro aplicar a decisão automaticamente. Sugestão: validar `lead.owner === fromOwner` (409 STALE) e recomputar o hash.
- **P3-2** O id não inclui estado, então uma decisão REJECTED antiga "gruda" para sempre no mesmo par lead/from/to (`listDecisions` pega a primeira). Documentar ou incluir época/janela.
- **P3-3** Drift não cobre factories (declarado). O patch do 04 resolve, e é preciso aplicá-lo via GHA/08.
- **P4-1** `JSON.parse(r.details)` sem try em `listDecisions`: um registro corrompido derruba o GET (500).
- **P4-2** What-if mistura o P50 do horizonte com winRate/ticket do lookback, o que está declarado nas assumptions. OK.

## Condições para reauditar e aprovar
1. Eliminar os 2 ciclos novos (lint:architecture sem violações novas em relação à main).
2. (Recomendado) Validar fromOwner atual e recomputar o recommendationId no POST (P3-1).
3. Merge só manual, com application gate verde (depende do fix do audit na main), feito por Marks ou 08.

## Comandos
`gh pr view 23`, `git merge-base`, `git merge-tree --write-tree origin/main 22247ac5`, `npx tsc --noEmit -p .`, `npm run format:check`, `npm run lint:ci`, `npm run check:hotspots`, `npx node@22 node_modules/.bin/depcruise --config .dependency-cruiser.cjs --ignore-known .dependency-cruiser-known-violations.json --output-type err src server.ts worker.ts` (tip e main), `npm run test:unit` (tip e main), `vitest -c vitest.integration.config.ts <3 arquivos>`, `prisma migrate deploy`, `npx @redocly/cli lint` (tip, main, merged), `npm run verify:openapi-drift` (com e sem patch).

## SHA-256 das evidências (logs locais)
```
725ae3a6be5dfd7e7aaaa243c4ac99e4e38927b939a2c60863b8daa127922ff4  p23-unit.log
59851ff4a95a4f52e0362abc6e2b8936ad67d13db1a12389e4c3109913841b56  main-e068-unit.log
3ccd431652a25ad58fe20e8f3e42dcb467c356255f09eb578a0c4ad8857e7f1e  b24-pr23-arch.log
b64a14cceb82aa0c1c69798a8b861d5db43e68d15a4581fb3fa906545f593066  b24-main-e068-arch.log
28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320  p23-tsc.log
8f4c0eaf0ede7e68183689610d0ceb70c30c9b5ffd24ebb4afffd8f093ba5c8f  p23-int.log
63e9ebad018406658dabdab89afdca95232b2a4d8e8613450746af82258ca84d  p23-mig.log
```
