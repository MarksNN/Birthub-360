# Proveniência — inventário forense 2026-10-14

## 1. Conteúdo importado diretamente do pacote forense

Origem: `birthub360-pacote-auditoria-forense.zip`, em `C:/Github/Pacote de auditoria de 14-10-2026/`.
Cópias byte a byte em `source/`. Hashes SHA-256 no `manifest.json`.

Importados sem reescrita de evidência:

- `birthub360-auditoria-dividas.json` (40 achados, 216 verificações, 40 categorias, 10 ondas)
- `birthub360-auditoria-dividas-executivo.md`
- `birthub360-auditoria-dividas-tecnicas.md`
- `birthub360-matriz-agentes-dividas.md`
- `birthub360-plano-saneamento-dividas.md`
- `birthub360-checklist-dividas-tecnicas.html` (painel autocontido)

Os relatórios em `reports/` são as mesmas bytes dos Markdown de origem, com outro nome de arquivo.
O painel em `dashboard/index.html` acrescenta apenas um aviso no topo. O objeto `AUDIT_DATA` embutido permanece o JSON de origem.

Commit auditado declarado pelo pacote: `c7e33a911b734ddb3131a3ad08d421efbc823fd4`.
Snapshot base declarado pelo pacote: `9373fb224a8aba30a39f7d10d1a2be639c35af78`.

## 2. Conteúdo confirmado no GitHub nesta importação

- No início do registro, `origin/main` apontava para `c7e33a911b734ddb3131a3ad08d421efbc823fd4`. Antes do commit desta branch, `origin/main` passou a `3afbae334492da6f13289f1af193f0856c326c72`. A branch foi avançada até esse SHA e não reescreve o commit.
- A branch `docs/registro-dividas-forenses-2026-10-14` adiciona somente o inventário em cima dessa base.
- O PR #741 estava aberto: base `main`, head `tech-debt-audit-1898280509423632042`, URL https://github.com/MaarkssN/Birthub-360/pull/741. Não foi integrado.
- O parecer embutido no pacote classifica esse PR como reprovado por falsos positivos. Isso é texto do pacote. A consulta `gh pr view 741` confirmou apenas que o PR seguia aberto.

## 3. Conteúdo ainda não revalidado

- Comportamento de runtime, testes, lint, typecheck e build não foram reexecutados nesta missão de registro.
- As 46 verificações `Não verificado` continuam não verificadas.
- Os patches candidatos não foram inspecionados nem integrados.
- As linhas citadas não foram reabertas uma a uma. O índice de evidências só conferiu se o caminho existia na árvore do commit auditado.
- Citações de arquivo ausentes nessa árvore: 4. As quatro são `scripts/run-tech-debt-audit.ts` e os relatórios `.agents/reviews/birthub360-auditoria-dividas*` do PR #741. Elas existem no head `f0f7bc14fdacfab8658cc7bf157d596590f67a8a`, não em `main`. O índice aponta o permalink para esse SHA. O conteúdo do PR #741 não foi importado como achado.
- O parecer do Agente 24 que está dentro do JSON aprova o diagnóstico forense original. Não aprova este commit de importação.

## 4. Dados normalizados apenas por estrutura

- Divisão do JSON único em `data/findings.json`, `data/checks.json`, `data/categories.json`, `data/waves.json` e `data/agent-assignments.json`.
- Campos novos de estado: `auditStatus`, `remediationStatus`, `validationStatus`, `releaseStatus`.
- `progress/remediation-status.json` espelha o estado inicial. Nenhum `fixCommit`, PR ou teste foi inventado.
- Ondas receberam `status: NOT_STARTED`.
- O índice `evidence/evidence-index.json` numera citações já presentes. Não cria evidência nova.
- Mapeamento de estado: texto com "patch candidato" ou "patch parcial" vira `PATCH_PROPOSED`; "Bloqueado para merge" vira `BLOCKED`; o restante aberto vira `OPEN`.

## 5. Informações ausentes ou divergentes, preservadas sem reconstrução

- O resumo do pacote declara `candidatePatchesInWorktreesCount: 6`. O campo `correctionState` marca 8 achados como patch candidato ou patch parcial: DEBT-GATE-001, DEBT-DB-001, DEBT-LGPD-001, DEBT-QUEUE-001, DEBT-AI-003, DEBT-CAD-001, DEBT-UX-008, DEBT-DOC-001. A diferença foi preservada. Nenhum desses achados foi contado como corrigido.
- A pasta solta `C:/Github/Pacote de auditoria de 14-10-2026/` também tem versões `.docx`. Elas não foram importadas. A fonte usada foi o ZIP com Markdown, JSON e HTML.
- `docs/audits/debt-2026-10-14/` já está no repositório e registra a passagem incremental de 24 achados e 200 verificações. Não foi sobrescrito. Não é o inventário canônico de 40/216.
- `docs/audits/technical-debt/v2/` permanece como hipótese histórica da varredura automática. Não é fonte deste inventário.
- O commit `3afbae334492da6f13289f1af193f0856c326c72`, mensagem `1`, já está em `origin/main`. Ele adiciona handoffs, reviews e runs da onda incremental. Esta missão não altera esses arquivos.
- Não há ZIP de evidências de runtime além dos textos já citados pelo pacote.

## Regra de citação

Use o permalink com o SHA `c7e33a911b734ddb3131a3ad08d421efbc823fd4`. Não use a branch `main` como única prova de uma linha.
