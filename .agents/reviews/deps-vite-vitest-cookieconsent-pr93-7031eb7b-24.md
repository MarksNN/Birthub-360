# Revisão independente — PR #93 @ 7031eb7b — Agente 24

- **Veredito: REPROVADO @ `7031eb7bc8b30cbab77a956e003c45b46002a379`**
- Data: 2026-10-25 (BRT)
- Missão: auditar o PR #93 "feat: add CookieConsent component" (branch `feature/cookie-consent-10930403997844158244`). Escopo: aderência entre descrição e diff, supply chain do lockfile, coerência entre package.json e lockfile, CI e nota LGPD.
- Autor: `google-labs-jules[bot]` (Jules), aberto em nome de MarksNN. Commit único `7031eb7b`, de 19:06 UTC (16:06 BRT).
- Base do PR: `67677295`, main antiga, anterior a #67/#71/#72. A main atual é `58f1895b`. O merge-tree com a main atual não tem conflito (tree `7e024e87`), e esse tree é idêntico ao do ref `pull/93/merge` `356ba939` (pais `58f1895b` e `7031eb7b`) que o CI testou.
- Este veredito vale só para o SHA acima. Qualquer commit novo o invalida.

## Critérios
1. O diff entrega o que a descrição promete. Promessa sem entrega reprova.
2. Supply chain, pacote a pacote: versão, `resolved` em registry.npmjs.org, `integrity`, dependências novas ou removidas e scripts de instalação.
3. vite 6.4.5 e vitest 4.1.12 existem no npm (checado com `npm view`, sem instalar).
4. package.json e lockfile coerentes, incluindo os peers.
5. CI: trivy, dependency review e application gate.
6. Nota LGPD.

## Comandos executados (sem npm ci, sem checkout do código auditado)
- `git diff --stat 67677295 7031eb7b`, `git ls-tree -r 7031eb7b | grep -i cookie`
- `git merge-tree --write-tree origin/main 7031eb7b`, comparado com `git log -1 --format=%T pull/93/merge`
- `jq` sobre `package-lock.json` da base e da head: diff de `.packages`, peers da família `@vitest/*`
- `npm view <pkg>@<ver> dist.integrity dist.tarball scripts time` para cada entrada alterada
- `gh pr view 93 --json statusCheckRollup`, `gh api repos/MarksNN/Birthub-360/actions/jobs/121262991279` e `.../logs`
- Comparação da lista de erros de tsc com o job `121247466311` (push da main `58f1895b`)

## Evidências
- **Descrição contra diff.** A descrição promete um componente CookieConsent com framer-motion, persistência em localStorage, integração no `App.tsx` e testes. O diff tem só `package.json` (4 linhas) e `package-lock.json`. Nenhum arquivo `*CookieConsent*` ou `*cookie*` existe no tree de `7031eb7b`, e o `App.tsx` não foi alterado.
- **package.json:** `vite` foi de `^6.4.4` para `^6.4.5` e `vitest` de `^4.1.11` para `^4.1.12`. A raiz do lock (`packages[""]`) bate com essas versões.
- **Lockfile, mudanças:**
  - `vite` 6.4.5, `vitest` 4.1.12, `@vitest/{expect,runner,snapshot}` 4.1.12 e `chai` 6.2.2 → 6.3.0.
  - Foram adicionadas cópias aninhadas 4.1.12 de `@vitest/{utils,pretty-format,spy,mocker}` sob `vitest`, `@vitest/expect`, `@vitest/runner` e `@vitest/snapshot`.
  - Nenhum pacote foi removido. Nenhuma dependência nova fora da família vite/vitest/chai.
- **Supply chain:**
  - Todas as entradas alteradas têm `resolved` em `https://registry.npmjs.org/`, e o `integrity` confere com o `dist.integrity` do `npm view`.
  - Nenhuma delas tem script `preinstall`, `install`, `postinstall` ou `prepare`.
  - Datas de publicação: vite 6.4.5 em 2026-10-21, vitest 4.1.12 em 2026-10-15 e chai 6.3.0 em 2026-09-30. As duas versões pedidas existem no npm.
- **Coerência de peers (defeito):**
  - `vitest@4.1.12` exige como peer `@vitest/coverage-v8@4.1.12` e `@vitest/browser-playwright@4.1.12`.
  - O lock mantém `@vitest/coverage-v8` 4.1.11 (peer `vitest@4.1.11`, `@vitest/browser@4.1.11`), `@vitest/browser-playwright` 4.1.11 (peer `vitest@4.1.11`, fixado exatamente em `"4.1.11"` no package.json) e `@vitest/browser` 4.1.11.
  - `@vitest/{utils,spy,mocker,pretty-format}` ficam duplicados entre 4.1.11 (topo) e 4.1.12 (aninhado).
  - Resultado: peers inválidos nos dois sentidos e árvore vitest com versões misturadas. O bump precisa mover a família `@vitest/*` inteira junto.
- **CI (head `7031eb7b`, merge ref `356ba939`):**
  - Verdes: secret scan, Dependency Review (os dois), trivy scan, gate de PR do Trivy, CodeQL js e python, Frontend bundle budget.
  - Application gate (job `121262991279`): Install, Audit, Prisma generate, Lint, Prettier e clean-tree verdes. **Run Type Check falha** com 99 erros, lista idêntica (arquivo + código + mensagem) à da main `58f1895b` (job `121247466311`), ou seja, 0 erros novos.
  - O Install não mostra ERESOLVE nem aviso de peer, porque `npm ci` não valida peers do lock. **Unit, Integration, Build, Smoke e E2E não rodaram**, então vitest 4.1.12 nunca foi exercitado no CI.
  - `build` falhou. SonarQube e Visual Regression ainda estavam em andamento na coleta.

## Achados
1. **Bloqueante:** a descrição é enganosa. O CookieConsent prometido não existe no diff. O PR é, na prática, um bump de vite/vitest com título e descrição de feature.
2. **Bloqueante:** a família `@vitest/*` está incoerente. `coverage-v8`, `browser-playwright` e `browser` ficaram em 4.1.11 contra `vitest` 4.1.12, com peers inválidos e duplicação de `utils`, `spy`, `mocker` e `pretty-format`.
3. **Evidência faltando:** o teste unitário obrigatório não rodou (o gate para no Type Check herdado). Isso não conta como aprovação.
4. **Baixo:** a base `67677295` está desatualizada. Hoje o merge é limpo, mas convém rebasear.
5. **Supply chain limpa:** registry oficial, integrity conferido, sem install scripts, sem dependências estranhas.

## Nota LGPD
Um banner de cookies e consentimento é assunto do **Agente 21** (LGPD). Qualquer texto de consentimento, base legal ou finalidade exige aprovação do **DPO/Marcelo** antes do merge. Este PR não traz texto nenhum. Se o componente vier num PR futuro, ele precisa: passar pelo 21; integrar com o registro de consentimento existente em vez de só usar localStorage; e ter o texto aprovado pelo DPO/Marcelo. Nenhuma declaração de agente substitui essa aprovação.

## Condições para reavaliação (o autor deve)
- Separar os temas:
  - Um PR `chore(deps)` só com o bump, título e descrição honestos, movendo `vitest`, `@vitest/coverage-v8`, `@vitest/browser-playwright` e `@vitest/browser` juntos para 4.1.12. O `npm ls vitest @vitest/coverage-v8 @vitest/browser-playwright` deve sair sem `invalid` nem `ELSPROBLEMS`.
  - Ou fechar o #93 e abrir o CookieConsent como PR próprio, passando pelo Agente 21 e com o texto aprovado pelo DPO/Marcelo.
- Rebasear sobre a main atual.
- Apresentar evidência de Unit e Build verdes com vitest 4.1.12, numa run de validação que passe pelo Type Check herdado, como foi feito para o #72.
