# Parecer Agente 24 — PR #30 (remoção de ciclos depcruise) — BLOQUEADO

- Missão: remover os 2 ciclos `no-circular` herdados do #15 (REMED-03/04) sem mudar comportamento.
- Autor: MarksNN (branch agente/04-fix-depcruise-cycles)
- Base: main @ 91bffdf6 (squash #24 vite 6.4.4)
- SHA auditado: ddef534435792ae8dd50a07c48d837b58020f7e2
- Veredito: **BLOQUEADO** — o tip NÃO contém 91bffdf6 (`git merge-base --is-ancestor 91bffdf6 ddef5344` = falso). O CI no tip está vermelho.

## Critérios
1. O tip está sincronizado com a main e contém 91bffdf6.
2. Os ciclos são removidos sem mudança de comportamento, sem ciclo novo e sem tocar em código de negócio desnecessariamente.
3. O gate local e o de CI estão 100% verdes, com test:architecture em 0 ciclos.

## Diff (5 arquivos, +59/-36)
- Novo `src/shared/contracts/predictiveRevenueOraclePorts.contract.ts`, com as portas `OracleHistoryReader`, `OracleClosedWonDeal`, `OracleOpenDeal`, `OracleForecastSnapshot` e `RebalanceApprovalStore` e as constantes `REBALANCE_APPROVAL_ENTITY`/`ACTION`, com valores idênticos.
- `infra/PrismaOracleHistoryReader.ts` e `infra/PrismaRebalanceApprovalStore.ts` passam a importar do contrato, e não mais dos services. Isso quebra infra→services.
- Os services reexportam tipos e constantes, o que mantém a API pública compatível.
- O contrato só importa `predictiveRevenueOracle.contract.ts`, que não tem imports. Na análise estática, nenhum ciclo novo. Pela grep, nenhum arquivo de infra/ importa `../services/` do próprio módulo.
- Nenhuma lógica de negócio foi alterada. É só movimentação de tipos e constantes.

## Gates
| Gate | Resultado |
|---|---|
| CI application gate @ ddef5344 | FAIL no step 7 Audit (vite GHSA-698V/R825/587H, porque falta o sync com o #24). Os steps 8 a 25 foram pulados. |
| CI build (agregador) | FAIL |
| CI CodeQL, Sonar, Trivy, Dependency review, secret scan, bundle budget, Visual Regression | PASS |
| Local: audit, typecheck, biome, hotspots, vitest, test:architecture (node22), build, migration-drift, openapi-drift | NÃO EXECUTADOS. A box tinha cerca de 1,4 GB livres e o npm ci foi abortado. Pela orientação, priorizei o CI. |

Gate não executado não conta como aprovação.

## Comandos
```
gh pr view 30 --json headRefOid
git merge-base --is-ancestor 91bffdf6 ddef5344   # falso
git diff origin/main...pr30
gh api repos/MarksNN/Birthub-360/actions/jobs/118939106079
```

## Achados
- B1 (bloqueante): o tip está desatualizado em relação à main. Falta 91bffdf6, e por isso o Audit falha e o test:architecture nem chega a rodar no CI.
- P3: as reexportações nos services (`export type {...}`, `export {...}`) mantêm a compatibilidade. Elas podem ser removidas depois, migrando os consumidores para o contrato.

## Condições para APROVADO
1. Fazer rebase ou merge da main (91bffdf6 ou posterior) no #30, com o diff de código idêntico.
2. CI 100% verde no novo tip, incluindo o step 13 Architecture com 0 ciclos.
3. Nova revisão do Agente 24 no novo SHA. Qualquer commit novo invalida este parecer.
