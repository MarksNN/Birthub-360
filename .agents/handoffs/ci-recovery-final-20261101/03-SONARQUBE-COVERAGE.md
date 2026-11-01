# HANDOFF 03 — SONARQUBE, SCA E COBERTURA
## Relatório de Diagnóstico, Resolução de Conflitos e Quality Gate

- **De:** Agente 00 — Supervisor Geral
- **Para:** Agente 08 — Qualidade e Release
- **Apoio:** Agente 01 — Plataforma e Segurança
- **Prioridade:** P1
- **Status:** SANEADO E CONFIGURADO
- **Arquivos Auditados:**
  * `agente-codigo-local/bun.lock` (conflitante)
  * `agente-codigo-local/package-lock.json` (oficial)
  * `sonar-project.properties`
  * `.github/workflows/sonarqube.yml`
  * `scripts/ci/report-sonarqube-qualitygate.mjs`

---

### 1. DIAGNÓSTICO DO PROBLEMA

1. **Conflito de SCA (Software Composition Analysis):**
   - O scanner de dependências do SonarQube e ferramentas correlatas detectaram a coexistência de dois arquivos de lock distintos no diretório `agente-codigo-local`: `bun.lock` e `package-lock.json`.
   - Essa redundância causa indefinição do resolvedor de pacotes, ambiguidade na árvore de dependências transitivas e falha no gate de SCA.
   - Todo o repositório é padronizado em **npm** (`npm ci`, `package.json`, Node.js 22 LTS).

2. **Instrumentação e Cobertura LCOV:**
   - O SonarQube consome o relatório em `coverage/unit/lcov.info` gerado pelo Vitest (`npm run test:unit -- --coverage`).
   - `sonar-project.properties` estava devidamente alinhado (`sonar.javascript.lcov.reportPaths=coverage/unit/lcov.info`), mas sem o script de checagem pós-scan, falhas de Quality Gate podiam ocorrer silenciosamente ou sem detalhamento legível nos logs do CI.

---

### 2. AÇÕES E SANEAMENTO EXECUTADOS

1. **Definição do Gerenciador Oficial e Resolução de Lockfile:**
   - **Gerenciador Oficial:** `npm` com `package-lock.json`.
   - **Ação:** O arquivo redundante `agente-codigo-local/bun.lock` é descartado/desindexado do versionamento de produção, mantendo exclusivamente o `package-lock.json` alinhado ao processo de instalação via `npm ci`.
   - **Consistência:** A análise SCA passa a ter fonte única da verdade, eliminando falsos positivos e conflitos de grafo de dependências.

2. **Instrumentação de Cobertura:**
   - Configuração de `vitest.unit.config.ts` preservada com cobertura v8.
   - Relatórios LCOV gerados em `coverage/unit/lcov.info`.
   - Arquivos excluídos no SonarQube mantidos apenas em escopos não produtivos:
     `sonar.exclusions=**/node_modules/**,**/dist/**,**/*.test.ts,**/*.test.tsx,**/__tests__/**`
   - Código de produção (`src/**`) integralmente coberto e analisado.

3. **Automação de Relatório do Quality Gate:**
   - Adição do utilitário `scripts/ci/report-sonarqube-qualitygate.mjs` executado após o scanner em `.github/workflows/sonarqube.yml`.
   - O utilitário faz polling seguro na API do SonarQube Cloud, lê as métricas de Confiabilidade (Bugs), Segurança (Vulnerabilidades), Manutenibilidade (Code Smells), Duplicações e Cobertura, reportando cada condição diretamente nos logs do GitHub Actions.

---

### 3. RESTRIÇÕES E COMPLIANCE
- Proibido diminuir os thresholds do Quality Gate (exigência de A em Segurança, Confiabilidade e Manutenibilidade).
- Proibido excluir arquivos de lógica de negócio para mascarar métricas.
- Token e organização SonarQube mantidos conforme a governança oficial (`MarksNN_Birthub-360`).
