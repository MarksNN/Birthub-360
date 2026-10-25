# Parecer 24: PR #71 (style(format): biome format --write src 2.5.14)

- **PR:** #71, autor Agente GHA, branch `agente/gha-format-main`
- **Head auditado:** `64ec87e093850a4d247dc36024f928608e80b059` (1 commit)
- **Base:** main @ `6d63eb396421b1e5db7aaf1f76bedd6c351ef967`. Esse SHA é a main atual e também o merge-base (ahead 1 / behind 0). MERGEABLE.
- **Data:** 25/10/2026 ~11:47 BRT

## Veredito: **BLOQUEADO (aguardando CI)**. O mérito técnico está verificado e é aprovável.

- Não há prova em CI do `format:check`, e ela não pode existir neste head.
  - O `application gate` foi **skipped** por causa do trivy herdado (corrigido pelo #67).
  - Mesmo com o trivy verde, `Run Prettier check` (`npm run format:check`) só roda depois de `Run Lint`, que continua vermelho com 10 erros até o #72.
- A reprodução local é bit-a-bit e cobre o critério "100% saída do formatter".
- Qualquer commit novo invalida este parecer.

## 0. Base
A base é a main atual `6d63eb39`, a mesma citada na descrição do PR.

## 1. Reprodução: diff vazio
- **Binário:** standalone `@biomejs/cli-linux-x64@2.5.14`, obtido com `npm pack` (sem `npm ci`). O sha512 do tarball é **igual** ao `integrity` do `package-lock.json`.
- **Execução:** num worktree limpo em `6d63eb39`, rodei `biome format --write src` respeitando o `biome.json` do repo. Resultado: "Formatted 2131 files… Fixed 61 files."
- **Comparação:** `git diff --quiet pr71` dá **idêntico**. A árvore resultante é igual ao head do PR: 61 arquivos, +1001/-531, sem nenhuma edição manual.
- **format:check:**
  - Na base: falha, com os 61 arquivos.
  - No head: `biome format src` dá **exit 0** ("No fixes applied").

## 2. Nenhuma mudança semântica
- **Literais.** Comparei todos os literais string, template (head/middle/tail), no-substitution template e regex dos 60 arquivos TS/TSX, base contra head, via AST do TypeScript. São **idênticos**.
- **Texto JSX.** O texto JSX, com whitespace normalizado, é idêntico, exceto por 2 `{' '}` inseridos em quebras de linha. Nos dois casos havia um espaço no original:
  - `UniversalEcosystemPanel.tsx`: "…{connectors.length} Ativas)"
  - `ExternalCrmPanel.tsx`: "/> {displayName}"
  - A renderização é equivalente.
- **Tokens não-whitespace** (via `git diff -w` com word-diff):
  - +102/-20 vírgulas: trailing commas em listas e objetos quebrados.
  - Parênteses, +31/-31: a maioria é rewrap de chamadas.
  - 5 pares de parênteses redundantes removidos:
    - `${(X * 100)}` → `${X * 100}`, 2 casos em `autonomyCircuitBreaker.service.ts`. A mudança fica dentro da expressão `${}`, e o texto do template não muda.
    - `a - (b * c) - (d * e)`, em `modelBenchmark.service.ts`.
    - `1 - (a / b)`, em `successPrediction.service.ts`.
    - Todos são equivalentes pela precedência.
  - `;` adicionados (5): membros de type literal (`avgLatency: number;`, `{ id?: string };` …). Afetam só o tipo, sem ASI em runtime.
  - `|` inicial de union movido de linha (`proactiveAlerts`, `UniversalEcosystemPanel`). Afeta só o tipo.
- **CSS** (`globals.css`): `@import url('…')` virou `url("…")`, que é equivalente. Os valores de `--font-brand-*` foram quebrados em várias linhas, mas com os mesmos tokens. O seletor `*, *::before, *::after` também foi quebrado. Sem whitespace e aspas, o arquivo é idêntico.
- **Lint:** dá os mesmos 10 erros, 704 warnings e 13 infos na base e no head, ou seja, o format não mexe no lint.

## 3. Versão
`package.json` declara `"@biomejs/biome": "^2.5.14"`, e o lock resolve `@biomejs/biome` e todos os `cli-*` em **2.5.14**. Bate.

## 4. Escopo
São 61 arquivos, todos em `src/**`. Não há config, lock ou workflow, e `biome.json` e `package*.json` não foram tocados.

## 5. CI no head (11:43 BRT)
| Check | Estado | Natureza |
|---|---|---|
| trivy scan, Trivy — gate de PR, build | failure | herdado (3 alertas HIGH da main; corrige no #67) |
| application gate (Lint → Prettier check → …) | **skipped** | herdado, mas **impede a prova do format:check** |
| secret scan, dependency review, CodeQL js/py, Frontend bundle budget | success | n/a |
| k6, Visual Regression, SonarQube | in_progress | n/a (não dependem de formatação) |

Não esperei mais o CI: o gate já está concluído como skipped, e nenhum check pendente prova o format.

## 6. Achados
- **P2-1 (evidência).** O `format:check` não tem prova em CI. A cadeia é #67 (trivy) → #72 (lint) → só então o passo `Run Prettier check` roda.
  - **Desbloqueio:** (a) decisão humana de mergear o #71 com base nesta reprodução bit-a-bit, sendo a prova em CI o gate verde do #72 depois de #67 e #71; ou (b) reauditar quando o gate rodar.
- **P3-1.** O #72 conflita com o #71 em `calendly.service.ts` e `piiDetection.service.ts`, como o próprio autor já previu. A resolução tem de manter a árvore igual a "#71 + correções do #72" formatada pelo 2.5.14.
