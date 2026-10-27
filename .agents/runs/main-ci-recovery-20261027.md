# Recuperação dos gates e auditoria da main — 2026-10-27

Coordenador: 00. Base: `6a00acd1094ea0d7185a096c24eb474aad5a008d`.
Estado: EM_EXECUCAO. Nenhuma aprovação de release ou homologação de CI.

## Autorização e restrições

O usuário autorizou investigar e corrigir as falhas identificadas na auditoria.
Sem merges, deploys, redução de thresholds, alteração de waivers ou aprovação automática de PRs.
Salvar proteção administrativa requer aprovação humana posterior à proposta concreta.

## Matriz de propriedade e isolamento

| Responsável | Branch/worktree | Propriedade exclusiva da missão |
| --- | --- | --- |
| 00 | agente/08-main-ci-reliable-gates-20261027 / Birthub-360 | coordenação, relatório, aprovação técnica de dependências |
| 08 | agente/08-workflow-enforcement-20261027 / Birthub-360-workflows | .github/workflows/**; sonar-project.properties; testes de regressão dos workflows em tests/unit/ci-main-protection-workflows.test.ts |
| 14 | agente/14-visual-ci-recovery-20261027 / Birthub-360-visual | visual-regression/**, playwright.visual.config.ts, scripts/test/**; tests/unit/visual-regression-state.test.ts; sem workflows |
| 24 | worktree de revisão a criar após diffs estáveis | somente parecer em .agents/reviews/**; não altera entrega auditada |

Não haverá git merge: qualquer transporte de alterações locais será sequencial, por patches revisados, preservando a base e o histórico. Limite: até três especialistas ativos. 08 e 08A não atuarão simultaneamente sobre arquivos compartilhados.

## Baseline remoto observado

- Main: application gate, build, Trivy, secrets e CodeQL verdes no SHA da base.
- SonarCloud Code Analysis: failure; duplicação de código novo 29,4%, limite 3%.
- SonarQube Actions: success, mas step SonarQube Scan skipped.
- PR 119 @43142103002013f95fc5b66f2b8692175bad1949: 14 success/2 skipped no nível dos checks; log visual contém 88 falhas mascaradas por continue-on-error.
- PR 118: visual bloqueante já proposto, porém 88 falhas reais continuam.
- Dependency review em ci.yml e dependency-review.yml tolera erros.
- CodeQL realmente produziu e verificou um SARIF por linguagem em main/PR119; script ainda aceita ausência de SARIF.
- PRs 93, 97, 114 e 56 conflitantes; nenhum dos 16 PRs abertos tinha aprovação registrada.
- Proteção clássica: PR/1 aprovação/conversas resolvidas/bypass desabilitado/sem force push/sem exclusão; strict desabilitado.
- Ruleset main-1: exclusão bloqueada, sem bypass. main-2: PR/1 aprovação, sem checks listados, bypass de Repository admin always.
- Acesso administrativo: zero colaboradores. Aprovação de PR do proprietário exige outro humano com write.

## Critérios verificáveis

1. Falha de dependency review e testes visuais deve propagar exit code.
2. Scanner Sonar ausente não pode gerar sucesso enganoso; executar análise/quality gate requer credencial válida e emissão consistente.
3. Baselines visuais devem vir de execução Linux/CI revisada; nunca aceitar snapshots só para obter verde.
4. Não reduzir cobertura, asserts, políticas de segurança ou isolamento de tenant.
5. Testes pertinentes, typecheck, lint e build; integração/E2E em ambiente que realmente forneça Postgres+pgvector, Redis e Meilisearch.
6. Parecer independente deve identificar hashes/revisão exata, comandos e limitações.
7. Publicação somente em branch/PR sem deploy, após revisão pertinente; CI remoto deve ser conferido no SHA publicado.

## Pendências externas

Permissão de escrita para revisor humano e credencial Sonar válida não podem ser inventadas ou substituídas por aprovação de agente. Não alterar acesso nem secrets sem dados/autorização específicos.

## Validação do diff combinado

- Typecheck: exit code 0.
- Lint: exit code 0, 655 warnings e 10 infos preexistentes.
- Testes focados: 50/50; Trivy adicional: 2/2.
- Audit gate: nenhum HIGH/CRITICAL, executado com node --import tsx para evitar IPC Unix bloqueado do CLI.
- Build equivalente: Vite, esbuild e verificação PWA executados separadamente com exit code 0; 177 entradas de precache. O comando npm original encontrou EPERM de IPC do tsx e não foi declarado aprovado.
- Visual: somente descoberta de 88 testes; geração e comparação real ainda bloqueadas.
- Revisão independente em andamento; nenhuma publicação, merge, deploy ou alteração administrativa até este registro.

## Adendo de configuração Sonar — leitura autenticada

A interface de Actions confirmou: `SONAR_TOKEN` não existe em Repository secrets; existe uma variável de repositório com esse nome. `SONAR_HOST_URL` também está em Variables e aponta para SonarCloud. Não há `SONAR_ORGANIZATION` entre os dois nomes de variáveis listados. O valor do token não é reproduzido, salvo em arquivo ou incorporado ao código. Sua validade não foi verificada. Isso explica o scanner ignorado: o workflow lê `secrets.SONAR_TOKEN`, não `vars.SONAR_TOKEN`.

A correção permanece lendo somente o secret, sem fallback para credencial em variável. Cadastrar uma credencial válida em Secrets, retirar a variável que contém credencial e avaliar sua rotação exigem a aprovação administrativa e a participação segura do usuário. Nenhuma dessas alterações foi salva. Esse novo achado altera somente a evidência documental; código auditado permanece idêntico.
