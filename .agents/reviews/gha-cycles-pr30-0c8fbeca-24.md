# Parecer Agente 24 — PR #30 (ciclos depcruise) @ 0c8fbeca

- **Missão:** remover os 2 ciclos de dependência herdados do #15 (ports do predictiveRevenueOracle).
- **Autor:** Agente 04 · **Branch:** agente/04-fix-depcruise-cycles · **Base:** main @ 91bffdf6
- **SHA revisado:** 0c8fbeca2675173373b9ef18499e8829705eb280 (merge de origin/main em ddef5344)
- **Parecer anterior:** BLOQUEADO @ ddef5344 (commit 5bcb45e), por falta de sync com a main. Este parecer o substitui.

## Veredito: APROVADO CONDICIONADO (exceção #30 → #25), não é aprovação limpa

Qualquer commit novo no #30 invalida o parecer.

## Critérios e evidências
1. **91bffdf6 é ancestral do tip:** OK. Pais de 0c8fbeca = ddef5344 + 91bffdf6. compare 91bffdf6...0c8fbeca: ahead 2, behind 0.
2. **O diff efetivo é igual ao de ddef5344:** OK. São os mesmos 5 arquivos, com os mesmos blob SHAs nos dois compares (`compare/91bffdf6...ddef5344` vs `...0c8fbeca`):
   - PrismaOracleHistoryReader.ts 57681745 · PrismaRebalanceApprovalStore.ts 55ec5b49
   - predictiveRevenueOracle.service.ts 7a98d24c · rebalanceApproval.service.ts 59e480f5
   - src/shared/contracts/predictiveRevenueOraclePorts.contract.ts (novo) 0576940a
3. **Resolução do merge:** é trivial, sem conflito, porque o #24 mexe só em package.json e lock, e nenhum desses 5 arquivos muda na resolução.
4. **CI, run 39523969939 (application gate)**, acompanhado com `gh run watch` até o fim:
   - SUCCESS: install, audit (waiver-aware), Prisma, lint, prettier, working tree, typecheck, **Architecture: "✔ no dependency violations found (1748 modules, 5780 dependencies cruised)"**, openapi-drift, unit **627/627 arquivos**, AI resilience, migrations, migration-drift.
   - **FAILURE: Integration (step 21):** 2 arquivos falharam e 92 passaram, com **exatamente 4 testes**:
     - capability-engine "não há sobreposição…": `expected 15 to be 12`
     - capability-engine "total real … é 391": `length of 391 but got 394`
     - capability-engine "todo agente tem ao menos um AgentCapabilityGrant": falta grant para account-detective, promise-guardian e devils-advocate
     - seed-multi-cargo "semeia os 12 cargos…": `cargo undefined do agente account-detective`
   - SKIPPED por causa da falha: Build, Smoke, Playwright, E2E. O Golden Dataset (18) é skipped por design.
   - Os demais checks (CodeQL, Trivy, secret scan, dependency review, bundle, visual) passaram. O SonarQube estava pending.
5. **As falhas são herdadas (fora do diff):** o diff do #30 não toca testes, o registry comercial, seed, catálogo nem JSON de capabilities. As asserções dependem apenas de COMMERCIAL_AGENT_REGISTRY (15 agentes) e do catálogo, que já estão na main. Ressalva: na main @ 91bffdf6 o gate para no step 13 (os ciclos), então a integração nunca rodou ali. A herança está comprovada por análise do diff, e não por um run na main.
6. **O #25 @ bb5c3d50 cobre os 4 testes:** sim.
   - Adiciona os grants dos 3 agentes em build-capability-catalog.ts e agentCapabilities.normalized.json, com `totalAgentsWithCapabilityGrants` 391 → **394**.
   - Mapeia os cargos em seed-multi-cargo.ts: account-detective→LDR, promise-guardian→CLOSER, devils-advocate→GERENTE_COMERCIAL.
   - **Porém os testes de contagem ficaram tautológicos:**
     - `toBe(12)` virou `toBe(new Set(codes).size)`;
     - `toBe(391)` virou `379 + COMMERCIAL_AGENT_REGISTRY.length`;
     - `toHaveLength(391)` virou `allCodes.length`;
     - `toHaveLength(12)` virou `JOB_ROLE_CATALOG.length`.
   - Ele não fixa 15/394. Os testes passam, mas deixam de detectar agente adicionado ou removido. Isso tem que ser corrigido no #25: fixar 15 e 394, ou comparar com o summary do JSON.
   - O #25 também está 2 commits atrás da main (base e0683477) e precisa de sync.

## Condições da exceção
1. Squash merge manual do #30 @ 0c8fbeca, desde que as **únicas** falhas sejam exatamente os 4 testes acima, em um run reexecutado no mesmo SHA.
2. O #25 entra **logo em seguida**, sincronizado com a main, com as contagens fixadas em 15/394 e o application gate **100% verde**, incluindo Build, Smoke e E2E, que não rodaram no #30. Nenhum outro PR de código entra entre os dois.
3. Se o #25 não fechar verde, faça o revert do #30 ou bloqueie a fila. Build, Smoke e E2E seguem **sem evidência** até o #25.

## Comandos
`gh pr view 30 --json headRefOid` · `gh api repos/MarksNN/Birthub-360/compare/91bffdf6...{ddef5344,0c8fbeca}` · `gh api .../commits/0c8fbeca` · `gh run watch 39523969939 --exit-status` · `gh api .../actions/jobs/<id>/logs` · `gh api .../compare/91bffdf6...bb5c3d50`

Nenhum npm ci local foi rodado, por falta de memória na box. Toda a evidência vem do CI e da API.
