# Parecer 24 — Recuperação SonarQube Cloud, PR #148

Missão / onda: `ci-recovery-final-20261101`, handoff 03 V2, recuperação SonarQube Cloud de `MarksNN/Birthub-360` (não `Birthub-360-Regeneration`).

Autor: agente da recuperação Sonar (sessão do Coordenador/08). Não é o auditor.

Auditor: Agente 24. Este parecer não aprova trabalho do próprio auditor. O auditor não alterou produto, testes, `sonar-project.properties`, handoff, HTML nem qualquer outro arquivo da entrega. Não houve commit, push, merge nem deploy.

Base: `main` `519855cf5c679ed568d19a132f69c3dafdc35c61`.

Branch: `agente/08-sonarqube-recovery`.

Revisão exata: `a0179086a82335629394052f6273218759a3bf1a` (`fix(sonar): trata o gate de código novo sem mascarar métrica`, 2026-11-01 21:29:18 -0300). `git rev-parse HEAD` neste worktree detached devolveu esse SHA. A árvore de trabalho suja do usuário não foi tocada.

PR: https://github.com/MarksNN/Birthub-360/pull/148 — `state=OPEN`, `isDraft=false`, `mergeable=MERGEABLE`, `mergeStateStatus=UNSTABLE`, `headRefOid` igual à revisão acima, base `main`. Não mergeado.

Escopo exato deste parecer: somente o quality gate de código novo do commit `a0179086a` no PR #148, mais a leitura do diff `519855cf..a0179086a` e do CI desse SHA. Não aprova o HTML, o handoff, a `main`, release nem deploy. O parecer sobre o HTML não aprova o trabalho que o HTML descreve.

Qualquer commit novo, ou qualquer alteração do conteúdo auditado, invalida este parecer e exige nova revisão.

## Arquivos auditados

Diff `519855cf..a0179086a` (23 arquivos, +1910/−76), conferido com `git show --stat --oneline -1` e `git diff --name-only`:

- `.agents/handoffs/ci-recovery-final-20261101/03-SONARQUBE-COVERAGE.md`
- `docs/homologacao/SONARQUBE-RECUPERACAO-FINAL.html`
- `scripts/ci/report-sonarqube-qualitygate.mjs`
- `sonar-project.properties`
- `src/features/intelligence/commercial-v3/services/commercialContextBuilder.service.ts`
- `src/features/intelligence/commercial-v3/assets/07_RUNTIME/MONTAR_CONTEXT.py`
- `src/hooks/useCrmBoardController.ts`
- `src/features/intelligence/agents/supervisor.agent.ts`
- testes novos ou ampliados no mesmo diff, inclusive `tests/unit/features/intelligence/commercial-v3/montar-context-cli.test.ts` e `tests/unit/scripts/report-sonarqube-qualitygate.test.ts`

Não há `NOSONAR` introduzido no diff. Não há `sonar.sca.allowRedundantLockfiles=true`. Não há `sonar.coverage.exclusions` nem `sonar.python.coverage.reportPaths` no diff. As menções a `NOSONAR` e `allowRedundantLockfiles` no diff são proibições escritas no handoff, no HTML e no comentário de `sonar-project.properties`.

## O que este PR mede e o que não mede

O scanner deste SHA gravou `SCM revision ID a0179086a82335629394052f6273218759a3bf1a` e `Merge base sha1: 519855cf5c679ed568d19a132f69c3dafdc35c61`. A API do PR #148 descreve só o código novo desse diff.

Esta análise de PR não remede o período `previous_version` da `main` (desde 2026-10-27). Os números 39,6%, rating D e rating C que o HTML e o handoff atribuem à `main` em `519855cf` ficam como alegação documental do autor. Este auditor não os reconsultou e não os repete como medição própria.

## Critérios e resultados

| Critério no mesmo commit | Resultado | Evidência |
| --- | --- | --- |
| `new_reliability_rating` A (≤ 1) | Atendido | API do gate: status OK, `actualValue` `1`. Medida `1.0`. |
| `new_security_rating` A (≤ 1) | Atendido | API do gate: status OK, `actualValue` `1`. Medida `1.0`. |
| `new_maintainability_rating` A | Atendido, embora não fosse o critério que falhava | API do gate: status OK, `actualValue` `1`. Medida `1.0`. |
| `new_coverage` ≥ 80% | Não atendido | Medida `4.166666666666667`. Gate: status ERROR, `actualValue` `4.2`, limiar `80`, comparador `LT`. |
| `new_duplicated_lines_density` | Atendido | Gate OK, `actualValue` `0.0`, limiar `3`. Medida `0.0`. |
| `new_security_hotspots_reviewed` | Atendido | Gate OK, `actualValue` `100.0`. Medida `100.0`. |
| SCA sem aborto `redundant lockfiles` | Atendido neste scan | `sonar.sca.exclusions=pnpm-lock.yaml` presente. `allowRedundantLockfiles` ausente. Upload SCA concluiu. Ocorrências de `redundant lockfiles` no log do run: 0. |
| Quality gate OK | Não atendido | `projectStatus.status` = `ERROR`. Scanner: `QUALITY GATE STATUS: FAILED`, exit 3. |
| Sem mascarar métrica | Atendido no diff | Sem `NOSONAR`, sem baixar o limiar de 80%, sem exclusão de arquivo produtivo para a métrica. |
| Reporter não trata o operador de falha como critério aceitável | Atendido | Código e log separam aceitável de falha. Para cobertura: aceitável `≥ 80.0%`, falha quando `< 80.0%`. Passo do reporter: `success`. |
| HTML e handoff não declaram o gate verde | Atendido | Ambos dizem `BLOCKED`. O handoff está `em-andamento` e diz para não fazer merge enquanto o scan não existir. Nenhum dos dois afirma gate verde deste commit. |

Conta da cobertura, confirmada pela API e não arredondada para parecer melhor: linhas a cobrir 22, descobertas 21, condições a cobrir 2, descobertas 2. Coberto = (1 linha + 0 condições) / (22 linhas + 2 condições) = 1/24 = 4,1666...%. O gate publica `4.2` e o reporter imprime `4.2%`.

Árvore de arquivos (`component_tree`, `total` 4, uma página):

| Arquivo | Linhas a cobrir | Linhas descobertas | Condições descobertas | Cobertura nova |
| --- | --- | --- | --- | --- |
| `commercialContextBuilder.service.ts` | 1 | 0 | 0 | 100% |
| `MONTAR_CONTEXT.py` | 18 | 18 | 0 | 0% |
| `useCrmBoardController.ts` | 3 | 3 | 2 | 0% |
| `supervisor.agent.ts` | 0 | 0 | 0 | sem linhas a cobrir |

1 + 18 + 3 = 22. Issues `BUG` e `VULNERABILITY` com status `OPEN` ou `CONFIRMED` no PR: `total` 0.

## Diff confrontado com as promessas

- `commercialContextBuilder.service.ts`: `.sort()` passou a `sort((left, right) => left.localeCompare(right))`. A única linha nova a cobrir está em 100%.
- `useCrmBoardController.ts`: três strings regravadas em UTF-8 (`Não foi possível`, `negócio`, `já`). São as 3 linhas novas e as 2 condições descobertas. Não há teste no diff, nem no repositório com esse nome, que execute o hook.
- `MONTAR_CONTEXT.py`: `confined_output` restringe `--output` a um nome de arquivo sob `./commercial-v3-out/`. O teste `montar-context-cli.test.ts` existe e rejeita travessia, mas é Vitest com `spawnSync`. Não gera relatório Cobertura. `sonar-project.properties` não define `sonar.python.coverage.reportPaths`. As 18 linhas novas ficaram em 0%.
- `supervisor.agent.ts`: `supervisorNode` foi exportado. A API conta 0 linhas novas a cobrir.
- SCA: só `sonar.sca.exclusions=pnpm-lock.yaml`. `package-lock.json` não foi excluído. `pnpm-lock.yaml` não foi apagado.
- Reporter: `formatAcceptance` inverte o comparador de falha do Sonar (`GT` → `≤`, `LT` → `≥`). `formatFailureRule` conserva o operador de falha em outro campo. O log do passo não imprime mais o operador de falha como se fosse o aceitável.

O HTML e o handoff, escritos dentro deste commit, ainda dizem que o scan do commit candidato não foi executado. Isso ficou desatualizado: o scan deste mesmo SHA rodou depois. Eles não declaram sucesso. A medição posterior é ERROR, então a desatualização não esconde um gate verde.

## Comandos e códigos de saída

- `git rev-parse HEAD` → `a0179086a82335629394052f6273218759a3bf1a`. Exit 0. `git status`: `HEAD (no branch)`.
- `git show --stat --oneline -1` e `git diff 519855cf..a0179086a` dos arquivos prometidos. Exit 0.
- `gh run view 41367477339` → workflow SonarQube Analysis, evento `pull_request`, branch `agente/08-sonarqube-recovery`, `headSha` `a0179086a82335629394052f6273218759a3bf1a`, conclusão do run `failure`. O comando `gh` saiu 0; a falha é do run.
- Job `SonarQube` (`125030609408`): conclusão `failure`. Passo `Run Tests with Coverage`: `success`. Passo `SonarQube Scan`: `failure`. Passo `Report SonarQube Quality Gate Status`: `success`.
- Scanner: `##[error] ... sonar-scanner failed with exit code 3`, depois de `QUALITY GATE STATUS: FAILED`.
- Busca no log completo do run por `redundant lockfiles`: 0 ocorrências.
- `gh run view 41367476933` → Visual Regression Tests, mesmo SHA, conclusão `failure`. Comando `gh` saiu 0.
- `gh pr view 148`: `OPEN`, não mergeado. Comando saiu 0.
- APIs públicas abaixo responderam JSON. Nenhum token foi usado nem gravado. O log mascara `SONAR_TOKEN` como `***`. Segredos de ambiente não são reproduzidos aqui.

## Evidências

- Quality gate: https://sonarcloud.io/api/qualitygates/project_status?projectKey=MarksNN_Birthub-360&pullRequest=148
- Medidas: https://sonarcloud.io/api/measures/component?component=MarksNN_Birthub-360&pullRequest=148&metricKeys=new_reliability_rating,new_security_rating,new_coverage,new_lines_to_cover,new_uncovered_lines,new_conditions_to_cover,new_uncovered_conditions,new_duplicated_lines_density,new_security_hotspots_reviewed
- Issues abertas: https://sonarcloud.io/api/issues/search?componentKeys=MarksNN_Birthub-360&pullRequest=148&types=BUG,VULNERABILITY&statuses=OPEN,CONFIRMED&ps=20
- Árvore: https://sonarcloud.io/api/measures/component_tree?component=MarksNN_Birthub-360&pullRequest=148&metricKeys=new_uncovered_lines,new_lines_to_cover,new_uncovered_conditions,new_coverage&ps=100&qualifiers=FIL
- Lista de PRs do Sonar, commit `a0179086a`, `qualityGateStatus` `ERROR`: https://sonarcloud.io/api/project_pull_requests/list?project=MarksNN_Birthub-360
- Run Sonar: https://github.com/MarksNN/Birthub-360/actions/runs/41367477339
- Run visual adjacente: https://github.com/MarksNN/Birthub-360/actions/runs/41367476933
- PR: https://github.com/MarksNN/Birthub-360/pull/148
- Dashboard citado pelo scanner, sem token: `https://sonarcloud.io/dashboard?id=MarksNN_Birthub-360&pullRequest=148`

Trechos do log do run 41367477339, sem segredo:

- `Analysing [/home/runner/work/Birthub-360/Birthub-360/coverage/unit/lcov.info]`
- `Sensor Cobertura Sensor for Python coverage [python]` executou e terminou; não há `sonar.python.coverage.reportPaths` no properties commitado.
- `Successfully uploaded SCA dependency files`
- `SCM revision ID 'a0179086a82335629394052f6273218759a3bf1a'`
- `QUALITY GATE STATUS: FAILED` e exit 3 do `sonar-scanner`
- Reporter: `Status Global: REPROVADO (FAILED)`; cobertura `Atual: 4.2%`; `Aceitável: ≥ 80.0%`; `Falha quando: < 80.0%`. Confiabilidade, segurança e manutenibilidade `1 (A)` com aceitável `≤ 1 (A)`. Duplicação `0.0%` com aceitável `≤ 3.0%`. Hotspots `100.0%` com aceitável `≥ 100.0%`.

Durante o pré-processamento SCA, o scanner registrou que o Gradle não leu `android/capacitor-cordova-android-plugins/cordova.variables.gradle` porque o arquivo não existe, com `BUILD FAILED in 763ms`. O scan seguiu, carregou dependências e fez o upload. Isso não é a causa do exit 3.

CI adjacente, mesmo SHA: Visual Regression run 41367476933 falhou. A primeira causa no log é `Error: A snapshot doesn't exist at .../visual-regression/baselines/visual.spec.ts/login-light-desktop-linux.png`, em `toHaveScreenshot`. O mesmo padrão aparece para dashboard, workspace, CRM, prospecção, inteligência e analytics. Não é o critério Sonar e este auditor não corrige. Impede chamar o PR de verde. O `mergeStateStatus` `UNSTABLE` combina com isso.

## Achados

### 1. Cobertura nova do PR em 4,17% — prioridade bloqueador

Proprietário da correção: agente da recuperação Sonar (08 / Coordenador que executou a recuperação). Não é o Agente 24. Este auditor não implementa a correção.

Evidência: API e CI acima. O percentual é puxado por `MONTAR_CONTEXT.py` (18 linhas, 0%, teste CLI sem relatório Cobertura e sem `sonar.python.coverage.reportPaths`) e por `useCrmBoardController.ts` (3 linhas e 2 condições, 0%, sem teste que as execute). `commercialContextBuilder.service.ts` não é o buraco.

Correção esperada, sem executar aqui: gerar Cobertura a partir do teste Python, apontar o relatório em `sonar.python.coverage.reportPaths` e cobrir as 3 linhas novas do hook com teste que as execute. Sem `NOSONAR`. Sem baixar o limiar de 80%. Sem excluir arquivo produtivo para mover a métrica. Depois, novo scan do mesmo critério, no commit novo.

Teste esperado: no quality gate desse commit novo, `new_coverage` ≥ 80 e status do gate OK; a árvore deve mostrar `MONTAR_CONTEXT.py` e `useCrmBoardController.ts` cobertos de verdade; confiabilidade, segurança, duplicação, hotspots e SCA sem `redundant lockfiles` continuam verdes; o reporter segue distinguindo aceitável de falha.

### 2. Regressão visual no mesmo SHA — prioridade alta, adjacente, fora do critério Sonar

Proprietário: quem detém o gate visual (08), não este auditor.

Evidência: run 41367476933, snapshots `-linux.png` ausentes sob `visual-regression/baselines/visual.spec.ts/`.

Correção: não faz parte deste parecer e não foi feita. Não transforma o PR em verde mesmo que um scan futuro feche só o Sonar, enquanto este job seguir falho.

Teste esperado: o job Visual Regression do SHA corrigido conclui `success`, ou a causa é classificada à parte com evidência, sem ser anunciada como gate verde.

### 3. HTML e handoff deste commit não registram o scan que já falhou — prioridade baixa

Proprietário: agente da recuperação, na próxima entrega.

Evidência: ambos dizem que o scan do commit candidato não foi executado e que o veredito é `BLOCKED`. Não há declaração falsa de gate verde. O scan do próprio SHA depois mediu ERROR em 4,2%.

Correção: na próxima revisão, atualizar handoff e HTML com a medição do commit novo. Não editar estes arquivos só para narrar esta reprovação.

Teste esperado: o documento do commit seguinte não afirma gate verde sem a API desse commit.

Observação, sem achar violação: o WARN/INFO de `cordova.variables.gradle` ausente não derrubou o scan nem o upload SCA. Não entra no veredito Sonar.

## Pendências

- Cobrir as 21 linhas e as 2 condições descobertas sem mascarar métrica e repetir o scan. A cobertura de 4,17% sozinha reprova a missão.
- Novo parecer do Agente 24 sobre o commit seguinte. Este não vale para ele.
- Regressão visual do run 41367476933 permanece aberta.
- O período `previous_version` da `main` não foi remedido aqui. Um gate verde futuro do PR não será, por este documento, prova de que a `main` saiu do erro de leak.

## Riscos

- Merge do PR #148 com quality gate ERROR viola o critério da missão e o prompt que proíbe merge com gate vermelho. O PR está mergeável no GitHub e instável no conjunto de checks. Mergeabilidade não é aprovação.
- Tratar os testes TypeScript novos como se cobrissem `MONTAR_CONTEXT.py` deixa as 18 linhas em zero. O teste CLI prova comportamento, não cobertura Python no Sonar.
- Corrigir só o diff do PR não demonstra o fechamento do período de leak já acumulado na `main`.

## Veredito

REPROVADO.

A falha de cobertura está confirmada pela API pública e pelo CI do commit `a0179086a82335629394052f6273218759a3bf1a`: quality gate ERROR, `new_coverage` 4,1666...% (gate `4.2`), abaixo de 80%. Confiabilidade, segurança, manutenibilidade, duplicação, hotspots, ausência de bug/vulnerabilidade aberta, SCA sem `redundant lockfiles` e o reporter corrigido não compensam o gate vermelho.

Merge do PR #148 NÃO autorizado. Release e deploy NÃO autorizados. Este parecer não aprova o trabalho descrito pelo HTML nem encerra o handoff.

Qualquer commit novo invalida este parecer.
