Agente / Onda / Branch: Jules / Missão 10 (Workflows Github Actions e Governança CI) / `jules/ci-10-workflow-governance-20261024`

**SHA inicial:** `03fa29a6fb6b1ccf8668bb5b13a9a41e673bba9a`
**SHA do commit proposto:** `0583c87aadb132d3204d4d04d86cb7be13f9a67a`

**Problema Comprovado:**
A documentação no arquivo `.github/workflows/ci.yml` (linhas 16 a 21) estabelece uma regra de governança vital sobre concorrência:
```yaml
concurrency:
  # PRs: cancela o run anterior da mesma PR ao receber um novo push (feedback rápido).
  # push em main/master/develop: fila por SHA sem cancelamento — merges próximos no tempo não
  # podem cancelar a verificação de integração um do outro, ou o estado combinado de main fica
  # sem gate verde confirmado (mesmo modo de falha do incidente da Onda 5, RLS do AILog só
  # visível no gate de integração).
```
Isso exige que execuções na branch `main` não sejam canceladas, de modo que todo merge receba os checks obrigatórios e não camuflem erros ao longo da esteira.
Ao analisar a pasta `.github/workflows/`, foi detectado que os pipelines "Budget" (`endpoint-latency-budget.yml`, `frontend-bundle-budget.yml` e `public-assets-budget.yml`) violavam essa regra por definirem `cancel-in-progress: true` globalmente (independentemente do trigger). Se dois merges/pushes na `main` ocorressem sequencialmente (como pode ocorrer com auto-merge e deploys automáticos de PRs concorrentes), a execução desses workflows para o merge inicial seria cancelada antes de sua conclusão, produzindo status perdidos.

**Arquivos Modificados:**
- `.github/workflows/endpoint-latency-budget.yml`
- `.github/workflows/frontend-bundle-budget.yml`
- `.github/workflows/public-assets-budget.yml`

**Justificativa:**
Os três arquivos foram atualizados para que a diretiva utilize exatamente a mesma condição de avaliação condicional da governança canônica no repositório: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
Isso impede que merges e automações sofram cancelamento indevido na `main` e passem checks invisíveis (false-green por falta de observação real) ao mesmo tempo que assegura feedback rápido no ambiente de CI para os desenvolvedores abrindo PRs.
Adicionalmente, padronizou-se o valor de `group` em `public-assets-budget.yml` para conter o número do Pull Request (via expressão `github.event.pull_request.number || github.ref`) deixando os três workflows com semânticas idênticas e isolando a concorrência PR a PR.

**Testes Executados Efetivamente:**
- Execução local via `node scripts/ci/check-public-budget.mjs` com sucesso (`{"status": "ok"...}`).
- Build do ViteJS e ESBuild com o output `✓ built in 42.37s`.
- Execução local via `node scripts/ci/check-bundle-budget.mjs` testada.
- Lint dos YAMLs via `actionlint` baixado em `/app/actionlint` retornando `exit code 0` (sucesso).

**Testes Não Executados e Limitações:**
Não houveram afirmações/modificações sobre infraestrutura AWS nem testes que a utilizem, mantendo o estrito escopo da política de testes e infra `LOCAL-FIRST`.

**Dependências/Conflitos:**
Sem impacto direto, exceto a manutenção do cumprimento com a Governança CI exigida na Missão 10 e nas auditorias prévias. O waiver list não foi afetado, bem como triggers, jobs requeridos, proteção da main e permissões.

**Riscos residuais:**
Baixos. Comportamento restabelecido perfeitamente com os preceitos do CI Canônico, exigindo, como estipulado, análise independente humana (Handoff) antes do envio definitivo de qualquer mudança sobre workflows à main (Agente 24).
