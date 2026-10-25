# Parecer de auditoria independente — PR #67 (fix(deps): fechar CVEs HIGH do trivy fs)

| Campo | Valor |
|---|---|
| Missão | Fechar os HIGH do `trivy fs` que derrubam o Release na main, sem waiver |
| Autor | Agente GHA (branch `agente/gha-trivy-fs`) |
| Auditor | Agente 24 (AGENTS.md §40) |
| PR | https://github.com/MarksNN/Birthub-360/pull/67 |
| Head auditado | `d07b006b3fc63c613709977bf6605fcacde417d3` (1 commit) |
| Base | `main`, merge-base `02d1a46e`. A main atual (`7871e6f0`) só acrescenta `.agents/reviews/docs-jules-report-pr63-*.md`, então o PR está mergeable e sem conflito |
| Data | 2026-10-25 |
| **Decisão** | **BLOQUEADO** (o conteúdo do PR passa em todos os critérios estáticos; falta evidência de CI do application gate por causa de uma falha herdada da main) |

> O veredito vale só para o SHA acima. Qualquer commit novo o invalida.

## Critérios e resultado
| # | Critério | Resultado |
|---|---|---|
| 0 | Base = main; diff só em lockfiles (sem package.json, .trivyignore, waiver ou workflow) | OK: 2 arquivos (`package-lock.json` +12/-12, `agente-codigo-local/package-lock.json` +3/-3) |
| 1 | Fecha CVE-2026-111181, CVE-2026-109869 e todos os HIGH/CRITICAL da main | OK |
| 2 | Sem mudança transitiva indevida | OK |
| 3 | CI: trivy verde, application gate executado e verde, demais gates | **Falha**: o trivy está verde, mas o application gate executou e falhou no Lint (herdado) |

## 1. CVEs da main e o que muda no head
- O log do job trivy das runs 40163351229 (`02d1a46e`) e 40062255761 (`03fa29a6`) não lista as vulnerabilidades, porque a saída é SARIF. Os achados estão no code scanning, categoria `trivy-fs`, com `limit-severities-for-sarif` (só HIGH/CRITICAL). Nas duas runs, a análise de main tem `results_count=3`, e as 3 open alerts Trivy em `refs/heads/main` são estas:

| Alerta | CVE | Arquivo | Pacote | Instalado | Fixed |
|---|---|---|---|---|---|
| #104 | CVE-2026-109869 | package-lock.json | undici | 6.29.0 | 6.29.1, 7.30.1, 8.12.2 |
| #103 | CVE-2026-111181 | package-lock.json | body-parser | 2.3.0 | 2.4.0, 1.20.9 |
| #102 | CVE-2026-111181 | agente-codigo-local/package-lock.json | body-parser | 1.20.8 | 2.4.0, 1.20.9 |

- No head: undici 6.29.1, body-parser 2.4.0 (raiz) e body-parser 1.20.9 (agente-codigo-local). Isso cobre as 3 alertas, e não há outro HIGH/CRITICAL na main.
- No CI do PR, as análises Trivy de `refs/pull/67/merge` têm `results_count=0`, e as open alerts em `refs/pull/67/merge` = 0.
  - `Central Birth Hub 360 / trivy scan` = success.
  - `Trivy — gate de PR` = success.
  - `Trivy` (code scanning) = success.
  - Os mesmos checks no #68 e no #69, que não mexem em lockfile, continuam acusando as 3 CVEs. Isso funciona como controle negativo.
- Não rodei trivy localmente: o resultado do CI do head é a evidência usada.

## 2. Diff dos lockfiles (head vs main, comparação de `packages`)
- **Raiz:**
  - `lockfileVersion` 3 → 3; 2537 → 2537 pacotes; nenhum pacote novo ou removido.
  - Só 3 entradas mudaram: `node_modules/body-parser` 2.3.0→2.4.0, `node_modules/qs` 6.16.0→6.16.1, `node_modules/undici` 6.29.0→6.29.1.
- **agente-codigo-local:**
  - `lockfileVersion` 3 → 3; 393 → 393 pacotes.
  - Só `node_modules/body-parser` mudou (1.20.8→1.20.9).
- **`resolved`:** todos em `https://registry.npmjs.org/`. A integrity de body-parser@2.4.0, qs@6.16.1, undici@6.29.1 e body-parser@1.20.9 confere com `dist.integrity` do registry.
- **Novas faixas do body-parser 2.4.0** (iguais ao manifest publicado no registry): `content-type ^2.1.0`, `iconv-lite ^0.7.3`, `qs ^6.16.1`. Todas são satisfeitas sem precisar mudar outras entradas:
  - `node_modules/body-parser/node_modules/content-type` 2.1.0
  - `node_modules/iconv-lite` 0.7.3
  - `node_modules/qs` 6.16.1
- **Dependentes:**
  - Raiz: `express` (5.x) `body-parser ^2.2.1` → 2.4.0 OK, `qs ^6.14.0` OK.
  - Também `superagent qs ^6.14.1`, `elevenlabs qs ^6.13.1`, raiz `undici ^6.20.0`, `million undici ^6.3.0` e `openai` (peer `undici >=5 <9`): todos OK.
  - agente-codigo-local: `express` 4.22.3 `body-parser ~1.20.5` → 1.20.9 OK. O body-parser 1.20.9 pede `qs ~6.16.0`, satisfeito por qs 6.16.0, que não mudou.
- **Violações de faixa:** comparei a lista inteira, main vs head. O PR não introduz nenhuma violação nova.
  - Já existem na main, e continuam iguais (fora do escopo, P3 informativo): `@ai-sdk/provider-utils` pede `undici ^7.29.0`, `@qdrant/js-client-rest` pede `undici 7.29.0` e `testcontainers` pede `undici ^8.9.0`, mas todos resolvem para o undici 6.x da raiz.
  - Há outras divergências antigas (brace-expansion, uuid, eslint peer etc.). O PR não as piora nem as corrige.

## 3. CI no head `d07b006b` (consulta em 2026-10-25 às 11:30 BRT)
- **Verdes:** trivy scan, Trivy — gate de PR, Trivy, secret scan, dependency review, Dependency Review, CodeQL (js/ts e python), Frontend bundle budget, Visual Regression.
- **SonarQube:** ainda em andamento.
- **`Central Birth Hub 360 / application gate`:** **EXECUTADO**, ou seja, deixou de ser skipped, mas **falhou** em `Run Lint` (`npm run lint:ci` → `biome lint src`: 10 errors, 704 warnings).
  - Todos os passos seguintes ficaram skipped: Prettier, Type Check, Unit, Migrations, Integration, Build, Smoke, E2E.
  - `build` (Consolidar veredito) = failure em consequência.
- **A falha de Lint é herdada, não vem do PR:**
  - O PR não altera `src/**`, `biome.json` nem a versão do `@biomejs`, porque o diff contém só as 4 entradas de lockfile acima.
  - O application gate da main já falhava em `Run Lint` na run 40017040602 (`cdea0bc9`, 23/10 17:09 BRT), com 6 errors.
  - Depois, a partir de `a96bb68d`, o trivy passou a derrubar o Release e o gate ficou skipped. A regressão de lint seguiu escondida e cresceu de 6 para 10 errors.
  - O último application gate verde em main é o da run 39933278673 (`acde89e3`, 23/10 06:38 BRT).
- **Consequência:** não há evidência de que unit, integração, build e E2E passam com body-parser 2.4.0, qs 6.16.1 e undici 6.29.1, porque esses passos nunca rodaram neste head. Por isso o veredito é BLOQUEADO, e não APROVADO.

## Achados
- **B-1 (bloqueio externo):** o application gate está vermelho por Lint herdado da main, e os testes e o build não rodaram com as novas versões.
- **P3-1 (informativo, fora do escopo):** há divergências antigas de faixa no lockfile raiz (undici 7/8 pedidos por `@ai-sdk/provider-utils`, `@qdrant/js-client-rest` e `testcontainers`). O PR não as altera.
- Nenhum P1 ou P2 no conteúdo do PR.

## Para destravar
1. Corrigir os 10 errors de `biome lint src` na main, num PR separado do dono de `src/**`.
2. Depois disso, atualizar o #67 com a main (rebase ou merge, gerando um SHA novo, que pede nova auditoria) ou re-rodar o workflow sobre um head que já contenha a correção.
3. Com o application gate executado e verde (Unit, Integration, Build, E2E), mais SonarQube concluído, o 24 reaudita.

Se o Marks decidir, como decisão humana, mergear antes para destravar o trivy, o registro deve deixar explícito que unit, integração e E2E não foram exercitados com as novas versões.
