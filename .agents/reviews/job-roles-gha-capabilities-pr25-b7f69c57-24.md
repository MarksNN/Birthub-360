# Parecer Agente 24 — PR #25 @ b7f69c57

- **Missão:** dar cargo e capabilities aos agentes táticos account-detective, promise-guardian e devils-advocate, zerando as 4 falhas herdadas (seed-multi-cargo 12→15; capability-engine 391→394).
- **Autor:** GHA (branch `agente/gha-agents-capabilities`).
- **Base:** main @ 8dff1dde (merge 00667c00 com o #30); behind 0.
- **SHA revisado:** b7f69c57c (head). Parecer anterior: APROVADO CONDICIONADO @ bb5c3d50 (commit 050ccb3).
- **Veredito: BLOQUEADO** — o application gate do run 39527009503 não concluiu verde (tentativa 1 cancelada durante o E2E com falhas; tentativa 2 em execução no momento do parecer). Ausência de gate verde não é aprovação.

## Critérios
1. Testes fixam literalmente 15 e 394, sem derivar do registry.
2. Os 3 agentes recebem só capabilities de leitura/análise.
3. Gate 100% verde: Architecture 0 violações, integração sem as 4 falhas, Build, Smoke e E2E verdes.

## Comandos (sem npm ci; box sobrecarregada)
- `gh pr view 25 --json headRefOid` → b7f69c57
- `gh api repos/MarksNN/Birthub-360/compare/bb5c3d50...b7f69c57`
- `gh pr diff 25`
- `gh run watch 39527009503 --exit-status`; `gh api .../actions/runs/39527009503/attempts/{1,2}`; `gh api .../actions/jobs/118984086472/logs`

## Evidências
- Diff (162 linhas): `build-capability-catalog.ts`, `seed-multi-cargo.ts`, `agentCapabilities.normalized.json`, 2 testes de integração.
- Literais: `expect(commercialCellCodes.length).toBe(15)`, `toBe(394)`, `expect(rows).toHaveLength(394)`, `expect(COMMERCIAL_AGENT_REGISTRY).toHaveLength(15)`, `expect(agentDefinitions).toHaveLength(15)` (antes `COMMERCIAL_AGENT_REGISTRY.length`, que não podia falhar). **Critério 1 atendido.**
- Capabilities de domínio: account-detective `company.read, lead.read`; promise-guardian `meeting.read, meeting.analyze, deal.read`; devils-advocate `deal.read, deal.analyze, forecast.read, pipeline.analyze`. Somadas apenas as universais `agent.discover, agent.execute, agent.request_cross_role`, idênticas às dos 351 agentes universal-only. Nenhuma `*.write/create/update/delete/manage`. **Critério 2 atendido.** Cargos: LDR, CLOSER, GERENTE_COMERCIAL.
- Gate, tentativa 1 (01:23–02:25 UTC = 22:23–23:25 BRT): Audit, Lint, Prettier, Typecheck, **Architecture** (`✔ no dependency violations found (1748 modules)`), OpenAPI drift, Unit (627 arquivos), Migrations, **Integration (94 arquivos, 660 passed, 2 skipped — as 4 falhas sumiram)**, Build e Smoke: success. **Run E2E Tests: cancelled** (`The runner has received a shutdown signal`) depois de dezenas de falhas Playwright.
- Falhas E2E observadas (com retries): `accessibility.spec.ts` (≥34 telas, axe `aria-required-children` crítico e `color-contrast` sério já na tela de login), `cadence.spec.ts`, `crm-kanban` (drawer/teclado/drop). O diff do #25 não toca frontend; tudo indica falha herdada da main, que nunca chegava ao step E2E antes (ciclos do #15, depois as 4 falhas de integração). Não confirmado contra a main.
- Tentativa 2 do mesmo run em execução às ~23:30 BRT; sem resultado neste parecer.

## Achados
- **P1 — Gate não verde:** E2E falhou/cancelou. A condição de merge do Marks (gate 100% verde, E2E incluso) não está satisfeita.
- **P2 — E2E provavelmente herdado (a11y/cadência/kanban):** precisa de dono e decisão do Marks (correção ou isenção registrada). Recomendo rodar o gate na main @ 8dff1dde (workflow_dispatch) para provar que é herdado.
- **P3:** nenhum novo.
- **P4:** `agent.execute`/`agent.request_cross_role` são universais; aceitável, mas o comentário "só leitura" deveria mencionar isso. Teste de que os 3 agentes não recebem escrita continua ausente (pendência P4 do parecer anterior).

## Condições para APROVADO
1. Application gate verde neste SHA (tentativa 2 ou nova), ou decisão explícita do Marks isentando E2E herdados com evidência de que a main falha igual.
2. Head inalterado (b7f69c57); qualquer push novo exige reauditoria.

Agente 24 — 2026-10-20 ~23:30 BRT. Sem comentários públicos no PR.
