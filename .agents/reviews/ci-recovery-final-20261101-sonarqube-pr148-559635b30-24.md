# Parecer 24 — Recuperação SonarQube Cloud, PR #148, SHA 559635b30

Missão / onda: `ci-recovery-final-20261101`, handoff 03 V2, recuperação SonarQube Cloud de `MarksNN/Birthub-360` (não `Birthub-360-Regeneration`).

Autor: agente da recuperação Sonar (commit de `marcelinhomarkss-rgb`, sessão do Coordenador/08). Não é o auditor. Este auditor não aprova trabalho próprio.

Auditor: Agente 24. Não alterou produto, testes, workflow, `sonar-project.properties`, handoff, HTML nem qualquer outro arquivo da entrega. Gravou somente este parecer. Não houve commit, push, merge nem deploy.

Base: `main` `519855cf5c679ed568d19a132f69c3dafdc35c61`.

Branch: `agente/08-sonarqube-recovery`.

Revisão exata: `559635b308ce6647bb6ea20ca6f3408252a548fe` (`fix(sonar): cobre o Python e as linhas novas do pipeline`, 2026-11-01 22:09:12 -0300). `git rev-parse HEAD` neste worktree devolveu esse SHA. Pai: `2f2e5a28677b5bbc21aba58a08a2f3bf6d96e627`, que contém o parecer REPROVADO de `a0179086a82335629394052f6273218759a3bf1a`. Aquele parecer não cobre este SHA.

PR: https://github.com/MarksNN/Birthub-360/pull/148 — `state=OPEN`, `isDraft=false`, `mergeable=MERGEABLE`, `mergeStateStatus=UNSTABLE`, `headRefOid` e `baseRefOid` iguais aos SHAs acima. Não mergeado na hora desta consulta.

Escopo exato deste parecer: o quality gate de código novo do commit `559635b308ce6647bb6ea20ca6f3408252a548fe` no PR #148, confrontado com o diff `2f2e5a286..559635b30` e com o diff `519855cf..559635b30` no que muda localeCompare, UTF-8 do hook, `confined_output`, exclusão SCA e o reporter. Não aprova o HTML, o handoff, a `main`, o período `previous_version`, release nem deploy. O parecer sobre o HTML não aprova o trabalho que o HTML descreve.

Este arquivo não faz parte do commit auditado. Qualquer commit novo, ou qualquer alteração do conteúdo auditado, invalida este parecer e exige nova revisão.

## Arquivos auditados

Diff incremental `2f2e5a286..559635b30` (7 arquivos, +193/−8), conferido com `git show --stat --oneline -1`:

- `.agents/handoffs/ci-recovery-final-20261101/03-SONARQUBE-COVERAGE.md`
- `.github/workflows/sonarqube.yml` — passo `Python coverage for MONTAR_CONTEXT` antes do scan
- `docs/homologacao/SONARQUBE-RECUPERACAO-FINAL.html`
- `scripts/ci/cover-montar-context.py` — novo
- `sonar-project.properties` — `sonar.python.coverage.reportPaths=coverage/python/coverage.xml`
- `tests/unit/ci/validate-sonarqube-config.test.ts` — uma asserção desse caminho
- `tests/unit/hooks/useCrmBoardController.test.tsx` — novo

Diff completo `519855cf..559635b30` (28 caminhos) inclui, além desses, o parecer antigo, o reporter, `MONTAR_CONTEXT.py`, `commercialContextBuilder.service.ts`, `useCrmBoardController.ts`, `supervisor.agent.ts` e os testes da recuperação anterior. Não foi reescrito aqui.

Não há `NOSONAR` em código deste intervalo. A busca `-G` por `NOSONAR`, `allowRedundantLockfiles` e `sonar.coverage.exclusions` só atinge o handoff, o HTML, o parecer antigo e o comentário de `sonar-project.properties`. Não há `sonar.sca.allowRedundantLockfiles=true`. Não há `sonar.coverage.exclusions`. A exclusão SCA adicionada no intervalo é só `sonar.sca.exclusions=pnpm-lock.yaml`. `package-lock.json` não foi excluído. Nenhum arquivo produtivo foi excluído para mover a métrica. O limiar publicado pela API continua `80`.

## O que este PR mede e o que não mede

O scanner deste SHA gravou `SCM revision ID '559635b308ce6647bb6ea20ca6f3408252a548fe'` e `Merge base sha1: 519855cf5c679ed568d19a132f69c3dafdc35c61`. A API do PR #148 descreve o código novo desse diff contra essa base, não o período `previous_version` da `main` desde 2026-10-27.

Este auditor não mediu o leak antigo da `main` e não inventa o número dela. Um gate OK deste PR não prova, sozinho, que esse período da `main` foi remediado. Esse limite não impede o APROVADO do critério deste PR, porque o critério pedido é o quality gate do PR #148 neste SHA. Impede aprovar a `main`, release ou deploy.

## Critérios e resultados

| Critério no mesmo commit | Resultado | Evidência |
| --- | --- | --- |
| `new_reliability_rating` A (≤ 1) | Atendido | Gate: status OK, `actualValue` `1`, limiar `1`, comparador `GT`. Medida `1.0`. |
| `new_security_rating` A (≤ 1) | Atendido | Gate: status OK, `actualValue` `1`. Medida `1.0`. |
| `new_coverage` ≥ 80% | Atendido | Gate: status OK, `actualValue` `100.0`, limiar `80`, comparador `LT`. Medida `100.0`. |
| `new_maintainability_rating` A | Atendido, embora não fosse o critério que falhava | Gate: status OK, `actualValue` `1`. Medida `1.0`. |
| `new_duplicated_lines_density` | Atendido | Gate OK, `actualValue` `0.0`, limiar `3`. Medida `0.0`. |
| `new_security_hotspots_reviewed` | Atendido | Gate OK, `actualValue` `100.0`, limiar `100`. Medida `100.0`. |
| SCA sem aborto `redundant lockfiles` | Atendido neste scan | `sonar.sca.exclusions=pnpm-lock.yaml`. `allowRedundantLockfiles` ausente. Log: `Successfully uploaded SCA dependency files`. Ocorrências de `redundant lockfiles`: 0. O scan não abortou. |
| Quality gate OK | Atendido | `projectStatus.status` = `OK`. `ignoredConditions` = false. Scanner: `QUALITY GATE STATUS: PASSED`. `project_pull_requests/list` do PR 148: `qualityGateStatus` `OK` no SHA deste parecer. |
| Sem mascarar métrica | Atendido no diff | Sem `NOSONAR`, sem baixar o limiar de 80%, sem `sonar.sca.allowRedundantLockfiles=true`, sem exclusão de arquivo produtivo. O relatório Python é caminho de cobertura, não exclusão. |
| Reporter separa aceitável de condição de falha | Atendido | No log deste run, a cobertura aprovada aparece como `100.0% (aceitável ≥ 80.0%)`. Confiabilidade, segurança e manutenibilidade como `1 (A) (aceitável ≤ 1 (A))`. Duplicação `aceitável ≤ 3.0%`. Hotspots `aceitável ≥ 100.0%`. O operador de falha do Sonar não é impresso como se fosse o aceitável. `formatFailureRule` conserva o operador (`< 80.0%` para cobertura) e o teste unitário exige `Falha quando:` nesse campo. Neste run verde o console não imprime `Falha quando`, porque esse bloco só sai para condição ERROR/WARN; a tabela do step summary do mesmo script tem as duas colunas. |

Conta da cobertura, confirmada pela API e não arredondada para parecer melhor: linhas a cobrir 22, descobertas 0, condições a cobrir 10, descobertas 0. Coberto = 32/32 = 100%. O gate publica `100.0`.

Árvore de arquivos (`component_tree`, `total` 4, `ps` 100, uma página):

| Arquivo | Linhas a cobrir | Linhas descobertas | Condições a cobrir | Condições descobertas | Cobertura nova |
| --- | --- | --- | --- | --- | --- |
| `commercialContextBuilder.service.ts` | 1 | 0 | 0 | 0 | 100% |
| `MONTAR_CONTEXT.py` | 18 | 0 | 8 | 0 | 100% |
| `useCrmBoardController.ts` | 3 | 0 | 2 | 0 | 100% |
| `supervisor.agent.ts` | 0 | 0 | 0 | 0 | sem linhas a cobrir; a API não devolveu `new_coverage` para este arquivo |

1 + 18 + 3 = 22 linhas. 0 + 8 + 2 = 10 condições. As 8 condições novas de `MONTAR_CONTEXT.py` aparecem porque o Cobertura com `--branch` passou a contá-las; estão cobertas, não excluídas. Issues `BUG` e `VULNERABILITY` com status `OPEN` ou `CONFIRMED` no PR: `total` 0.

## Diff confrontado com as promessas

- `commercialContextBuilder.service.ts`, ainda no intervalo desde `519855cf`: `.sort((left, right) => left.localeCompare(right))`. A única linha nova a cobrir está em 100%. Este commit não a reabre.
- `useCrmBoardController.ts`: as três frases novas continuam em UTF-8 (`Não foi possível carregar o pipeline comercial.`, `Lead convertido em negócio e enviado ao pipeline comercial.`, `leads recentes já estavam no sistema.`). O teste novo executa o erro `Error`, o ramo que não é `Error`, a conversão e o import com `skipped`. A API marca 3 linhas e 2 condições, todas cobertas.
- `MONTAR_CONTEXT.py`: `confined_output` continua restringindo `--output` a um nome de arquivo sob `./commercial-v3-out/`. Este commit não altera o Python. O workflow gera `coverage/python/coverage.xml` com `coverage run --branch` sobre `scripts/ci/cover-montar-context.py` e falha o passo se o XML vier vazio. O scanner registrou `Parsing report '.../coverage/python/coverage.xml'` e o sensor Cobertura terminou. A API marca 18 linhas e 8 condições em 100%.
- `supervisor.agent.ts`: segue com 0 linhas novas a cobrir. Não é buraco de cobertura.
- SCA: só `sonar.sca.exclusions=pnpm-lock.yaml`. O lock do pnpm não foi apagado no diff incremental.
- Reporter: inalterado neste commit. `formatAcceptance` inverte o comparador de falha (`GT` → `≤`, `LT` → `≥`). `formatFailureRule` conserva o operador. O log deste SHA usa o aceitável, não o operador de falha, na linha de cobertura.

O HTML e o handoff deste commit ainda dizem que o gate deste SHA não foi medido e que o veredito da recuperação é `BLOCKED` até o scan e até um APROVADO do Agente 24. Não declaram gate verde. Ficaram atrás da medição posterior. Isso não esconde sucesso falso e não é corrigido aqui: um commit só para narrar este parecer invalidaria a revisão.

## Comandos e códigos de saída

- `git rev-parse HEAD` → `559635b308ce6647bb6ea20ca6f3408252a548fe`. Exit 0. `git status --short --branch`: `agente/08-sonarqube-recovery...origin/agente/08-sonarqube-recovery`, árvore limpa antes deste parecer.
- `git log -1` → pai `2f2e5a28677b5bbc21aba58a08a2f3bf6d96e627`. Exit 0.
- `git show --stat --oneline -1` e `git diff 2f2e5a286..559635b30`. Exit 0.
- `git diff --name-only 519855cf..559635b30` e busca de mascaramento nesse intervalo. Exit 0.
- `gh run view 41370946708` → workflow SonarQube Analysis, evento `pull_request`, branch `agente/08-sonarqube-recovery`, `headSha` `559635b308ce6647bb6ea20ca6f3408252a548fe`, `status` `completed`, `conclusion` `success`. Exit 0.
- Job `SonarQube` (`125041172226`): conclusão `success`, 13m46s. Passos `Run Tests with Coverage`, `Python coverage for MONTAR_CONTEXT`, `SonarQube Scan` e `Report SonarQube Quality Gate Status`: `success`. Exit 0 do `gh run view --job`.
- Busca no log desse job por `redundant lockfiles`: 0 ocorrências. `QUALITY GATE STATUS: PASSED`. `Wrote XML report to coverage/python/coverage.xml`.
- `gh run view 41370946754` → Visual Regression Tests, mesmo `headSha`, `conclusion` `failure`, `status` `completed`. Exit 0 do comando; a falha é do run.
- `gh pr view 148` → `OPEN`, não mergeado, `UNSTABLE` / `MERGEABLE`. Exit 0.
- `gh pr checks 148` → exit 1 porque há check com falha. A listagem foi obtida. SonarQube `pass`. SonarCloud Code Analysis `pass`. Visual Regression `fail`. `Central Birth Hub 360 / application gate` `pending`. Os demais checks listados estavam `pass` ou `skipping`. Nenhum `pending` foi tratado como falha.
- APIs públicas abaixo responderam JSON sem token. `SONAR_TOKEN`, `SONAR_HOST_URL` e `DATABASE_URL` aparecem no log mascarados como `***`. Valores de segredo não são reproduzidos aqui.

Typecheck, lint e testes locais deste auditor: NÃO EXECUTADOS. A evidência de teste deste SHA é o passo `Run Tests with Coverage` do run 41370946708, que concluiu `success` antes do scan. Não é declarado como suíte local reexecutada.

## Evidências

- Quality gate: https://sonarcloud.io/api/qualitygates/project_status?projectKey=MarksNN_Birthub-360&pullRequest=148
- Medidas: https://sonarcloud.io/api/measures/component?component=MarksNN_Birthub-360&pullRequest=148&metricKeys=new_reliability_rating,new_security_rating,new_coverage,new_lines_to_cover,new_uncovered_lines,new_conditions_to_cover,new_uncovered_conditions,new_duplicated_lines_density,new_security_hotspots_reviewed
- Árvore: https://sonarcloud.io/api/measures/component_tree?component=MarksNN_Birthub-360&pullRequest=148&metricKeys=new_uncovered_lines,new_lines_to_cover,new_uncovered_conditions,new_coverage&ps=100&qualifiers=FIL
- Issues abertas: https://sonarcloud.io/api/issues/search?componentKeys=MarksNN_Birthub-360&pullRequest=148&types=BUG,VULNERABILITY&statuses=OPEN,CONFIRMED&ps=20
- Lista de PRs do Sonar. PR `148`, commit `559635b308ce6647bb6ea20ca6f3408252a548fe`, `qualityGateStatus` `OK`, `analysisDate` `2026-11-02T01:20:17+0000`: https://sonarcloud.io/api/project_pull_requests/list?project=MarksNN_Birthub-360
- Run Sonar: https://github.com/MarksNN/Birthub-360/actions/runs/41370946708
- Run visual do mesmo SHA: https://github.com/MarksNN/Birthub-360/actions/runs/41370946754
- PR: https://github.com/MarksNN/Birthub-360/pull/148
- Dashboard citado pelo scanner, sem token: `https://sonarcloud.io/dashboard?id=MarksNN_Birthub-360&pullRequest=148`

Trechos do log do run 41370946708, sem segredo:

- `Wrote XML report to coverage/python/coverage.xml`
- `Sensor Cobertura Sensor for Python coverage [python]` e `Parsing report '/home/runner/work/Birthub-360/Birthub-360/coverage/python/coverage.xml'`
- `Analysing [/home/runner/work/Birthub-360/Birthub-360/coverage/unit/lcov.info]`
- `SCM revision ID '559635b308ce6647bb6ea20ca6f3408252a548fe'`
- `Merge base sha1: 519855cf5c679ed568d19a132f69c3dafdc35c61`
- `Successfully uploaded SCA dependency files`
- `QUALITY GATE STATUS: PASSED`
- Reporter: `Status Global: APROVADO (PASSED)`; cobertura `100.0% (aceitável ≥ 80.0%)`; confiabilidade, segurança e manutenibilidade `1 (A) (aceitável ≤ 1 (A))`; duplicação `0.0% (aceitável ≤ 3.0%)`; hotspots `100.0% (aceitável ≥ 100.0%)`.

## Achados

### 1. Visual Regression no mesmo SHA — prioridade alta, adjacente, fora do critério Sonar

Proprietário: quem detém o gate visual (08). Este auditor não corrige.

Evidência: run 41370946754, `headSha` `559635b308ce6647bb6ea20ca6f3408252a548fe`, conclusão `failure`. A primeira causa no log é `Error: A snapshot doesn't exist at .../visual-regression/baselines/visual.spec.ts/login-light-desktop-linux.png`, em `toHaveScreenshot`. O mesmo padrão aparece para dashboard, workspace, CRM, prospecção e inteligência no trecho lido. O diff incremental deste SHA não mexe em baseline visual. Não reprova o quality gate Sonar. Impede chamar o conjunto de checks do PR de verde. `mergeStateStatus` `UNSTABLE` combina com isso.

Correção esperada, não feita aqui: o job Visual Regression do SHA que for integrar conclui `success`, ou a causa é classificada à parte com evidência, sem ser anunciada como gate verde e sem ser dispensada por este parecer.

### 2. Application gate de release ainda não terminou — prioridade informativa

Proprietário: 08 / 00. Na consulta `gh pr checks 148` desta auditoria, `Central Birth Hub 360 / application gate` estava `pending` (run 41370946611, job 125045282346). Não foi convertido em falha nem em sucesso. Não entra no veredito Sonar.

### 3. HTML e handoff deste commit não registram o scan que depois passou — prioridade baixa, não bloqueadora

Proprietário: agente da recuperação, somente se houver outro commit. Este auditor não edita esses arquivos.

Evidência: ambos ainda dizem que o gate deste commit não foi medido e que o veredito é `BLOCKED` até o scan e até o APROVADO do Agente 24. Não há declaração falsa de gate verde. A API posterior deste mesmo SHA está OK.

Não corrigir dentro deste SHA. Um commit novo só para atualizar a narrativa invalidaria este parecer.

## Pendências

- Período `previous_version` da `main` desde 2026-10-27: NÃO MEDIDO. Fora do APROVADO.
- Visual Regression do SHA `559635b30`: FAILURE registrado, não corrigido, fora do critério Sonar.
- Application gate: `pending` na hora da consulta. Não é falha e não é sucesso.
- Handoff 03 V2, dentro do commit, continua `BLOCKED` até este parecer. Este arquivo não edita o handoff e não o declara encerrado por conta própria. O Coordenador pode usar este APROVADO como o parecer que o handoff esperava para este SHA, sem que isso aprove o texto do HTML.
- Release e deploy: não autorizados.

Nenhuma dessas pendências é falha do quality gate Sonar deste SHA. Não há pendência bloqueadora dentro do escopo Sonar.

## Riscos

- Tratar este APROVADO como prova de que o leak antigo da `main` fechou. Não é. A análise medida é o diff do PR contra `519855cf`.
- Integrar com override administrativo enquanto o Visual Regression segue FAILURE. Este parecer não autoriza esse override.
- Um commit novo, mesmo só de documentação, invalida a autorização abaixo.
- O reporter deste run verde não imprime `Falha quando` no console. A separação está no texto `aceitável ≥ 80.0%`, em `formatFailureRule` e no teste do caminho de falha. Não foi lido o markdown do step summary pela API.

## Veredito

APROVADO.

Os critérios do quality gate do PR #148 no commit `559635b308ce6647bb6ea20ca6f3408252a548fe` estão demonstrados pela API pública sem token e pelo CI desse SHA: status OK, confiabilidade 1, segurança 1, cobertura nova 100,0% sobre 22 linhas e 10 condições sem descoberta, duplicação 0,0, hotspots 100,0, SCA com upload e sem aborto `redundant lockfiles`, sem mascarar métrica, e o reporter mostra o aceitável (`≥ 80.0%`) em vez do operador de falha. O parecer REPROVADO de `a0179086a` não cobre este SHA.

Merge do PR #148: AUTORIZADO somente no SHA `559635b308ce6647bb6ea20ca6f3408252a548fe`, e somente para a recuperação Sonar cujo critério era esse quality gate. Qualquer commit novo invalida esta autorização. Release e deploy NÃO autorizados. O período `previous_version` da `main` NÃO aprovado. O FAILURE do Visual Regression e o application gate `pending` não são dispensados: se a proteção da `main` os exigir, o merge no GitHub continua sujeito a eles. Este parecer não manda contorná-los e não declara o conjunto de checks do PR verde.

Este parecer não aprova o trabalho descrito pelo HTML.
