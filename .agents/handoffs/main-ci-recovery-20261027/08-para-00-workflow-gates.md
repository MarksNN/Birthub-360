# Gates obrigatórios da main — entrega 08 para 00

De: 08 — QA e Release
Para: 00 — Coordenação / 24 — Revisão Independente
Onda: main-ci-recovery-20261027
Status: em-andamento
Prioridade: bloqueador
Bloqueador-ref: sucesso enganoso de checks e scanner essencial ignorado
Sprint destino: correção de CI antes de homologação e endurecimento administrativo

## Escopo e propriedade

Base `6a00acd1094ea0d7185a096c24eb474aad5a008d`.
Branch `agente/08-workflow-enforcement-20261027`, worktree `Birthub-360-workflows`.
Propriedade atribuída pelo 00: `.github/workflows/**`,
`tests/unit/ci-main-protection-workflows.test.ts` e, adicionalmente, `sonar-project.properties`.
Nenhum merge, push, deploy, mudança administrativa, secret ou waiver foi realizado.

## Causas e correções implementadas

1. `ci.yml` e `dependency-review.yml` toleravam falha do Dependency Review. Removida tolerância,
   preservando os advisories aceitos e o limite HIGH. O consolidado `build` agora exige success
   para dependency review em PR; skipped/cancelled/failure/resultado ausente reprovam. Push ainda
   permite o skipped legítimo do job exclusivo de PR. Status dos demais três gates também são exigidos.
2. `visual-regression.yml` tolerava falhas do Playwright. Removida tolerância, mantendo relatório
   em `always()`. Baseline manual e verificação agora usam os mesmos serviços PG16, Redis e Meili.
   O glob do artefato manual passou de `*-chromium-linux.png`, incompatível com os nomes reais do
   config visual, para `visual-regression/baselines/**/*.png`; ausência continua sendo erro.
3. `sonarqube.yml` ignorava scanner sem SONAR_TOKEN e produzia check verde. Preflight exige token;
   SonarCloud também exige a organização verificada em `vars.SONAR_ORGANIZATION`.
   Scanner não possui condição de skip e espera o quality gate real (`sonar.qualitygate.wait=true`).
   O host usa secret/variável existente ou default Cloud; a organização não foi inventada.
4. `sonar-project.properties` apontava para `prospector-atlas`, embora o check externo observado
   seja do projeto `MarksNN_Birthub-360`. Corrigidos somente projectKey e nome, com autorização 00.
   Exclusões, fontes, testes, cobertura, encoding e thresholds foram preservados.
5. O script CodeQL aceita diretório sem SARIF no uso local. O workflow agora exige relatório SARIF
   não vazio antes de chamá-lo, e a ausência de artefatos é erro. Não alterado o script local nem
   seus testes. A análise e a avaliação de achados continuam bloqueantes.

## Evidência executada

Node `22.23.4`, dependências do mesmo lockfile instaladas pelo 00 em checkout principal.
Comando: `NODE_ENV=test npx vitest run -c vitest.unit.config.ts tests/unit/ci-main-protection-workflows.test.ts tests/unit/security/trivy-pr-gate.test.ts`.
Resultado: **2 arquivos, 29 testes aprovados, exit 0**.

O teste novo executa os scripts Bash reais do consolidado e do preflight: combinações de sucesso,
falha, cancelamento, skip e ausência; credencial/organização ausentes; guard SARIF sem diretório,
arquivo vazio e relatório não vazio. Também verifica ausência de tolerância nos passos essenciais,
limiar HIGH, paridade dos serviços, glob do artefato e preservação do manual/weekly legítimos.
Não executa o scanner remoto nem representa aprovação do quality gate do serviço.

`git diff --check`: exit 0. O Biome do projeto ignora `tests/**` e não processou o novo teste;
formatação aplicada apenas ao arquivo novo via Prettier instalado, sem alterar configuração global.

Typecheck/lint/build integrados estão sob execução do 00. Nesta entrega não são anunciados como
aprovados pelo 08. CI remoto, integração/E2E e scanner remoto: **NÃO EXECUTADOS nesta entrega**.
Requer revisão independente 24 sobre conteúdo exato e gates combinados antes de aceitação.

## Pendências que impedem homologação

- Configurar credencial Sonar legítima e a organização real; não há organização no conteúdo
  pesquisado do repo. PRs de forks/Dependabot não recebem automaticamente secrets de Actions:
  precisam de estratégia autorizada de análise; não trocar para pull_request_target executando
  código não confiável para contornar esse limite. Ausência agora reprova explicitamente.
- API/UI SonarCloud está bloqueada por 403 CloudFront no ambiente do 00. A duplicação real de
  29,4% na main (limite 3%) continua pendente de acesso/evidência por arquivo e correção de fonte.
- A documentação oficial informa que scanner de CI falha se Automatic Analysis estiver habilitado.
  Antes de habilitar credencial, um humano deve conferir o método do projeto e autorizar a transição
  para análise por CI quando necessária. Nenhuma mudança no serviço foi tomada nem salva.
  Fonte conferida pelo 00: https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/overview-of-integrated-cis.
  A importação inicial por Automatic Analysis considera até cinco PRs recentes; isso é uma hipótese
  para checks ausentes nos PRs antigos, não diagnóstico confirmado deste projeto.
  Fonte: https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/pull-request-analysis.
- Agente 14 confirmou ausência das 88 referências da suíte visual atual. Precisam de geração Linux
  no CI e revisão visual; nenhum snapshot foi fabricado, aprovado ou adicionado pelo 08.
- Os dois jobs de Dependency Review continuam redundantes; ambos agora bloqueiam. Não foi
  removida cobertura nem selecionado novo check obrigatório administrativamente.

## Aprendizado reutilizável

Conclusão success do job não comprova scanner/teste executado. Inspecionar os outcomes internos,
logs e artefatos. Um upload SARIF tolerante é distinto do scan/gate; falhas de publicação não devem
permitir ausência silenciosa da evidência local usada pelo gate.
