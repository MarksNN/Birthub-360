# Parecer independente — Correção de contraste de subtítulo em card

## Identificação

- **Missão:** corrigir o contraste insuficiente do subtítulo de cards no tema claro, identificado nos resultados axe do CI.
- **Onda:** correção de CI; número não informado.
- **Autor:** Agente 03 — Design e Acessibilidade.
- **Auditor:** Agente 24 — Revisão Independente (execução independente code-review).
- **Base:** `94d0ada5fe2fb42871e4f97b48c6639994ef4c75`.
- **Branch auditada:** `marksnn-fix-card-subtitle-contrast`.
- **Revisão:** alteração não commitada, exatamente uma linha em `src/styles/official-identity.css`.
- **SHA-256 do arquivo:** `06A012F2BE4AB423E9C583A365D7179890FE53AA5921B4FD39BD7A3BD1893071`.

## Escopo e critérios

O seletor de subtítulos de `.bh-platform-card` em `html.light` passa de `#0284c7` para `var(--subtitle-color-default)`. A regra geral de cards e o tema escuro não foram alterados.

| Critério | Resultado | Evidência |
|---|---|---|
| Alteração limitada ao seletor necessário | **VALIDADO** | `git diff` no worktree do Agente 03 mostrou somente a substituição da cor nessa regra. |
| Base e identidade da revisão | **VALIDADO** | Base `94d0ada5fe2fb42871e4f97b48c6639994ef4c75`; SHA-256 conferido independentemente e corresponde ao arquivo previamente auditado. |
| Contraste nos temas claro e escuro | **VALIDADO POR EVIDÊNCIA PRÉVIA** | O parecer `fix-ci-contrast-final-2026-10-26-24.md` registra axe em Chromium no card real, zero violações em ambos os temas e contraste claro entre 5,28:1 e 5,93:1. Essa execução não foi repetida nesta revisão. |
| `git diff --check` | **PASSOU** | Executado no worktree da alteração, exit 0. |
| Formatação/lint local do arquivo | **NÃO PASSOU COMO CHECK ISOLADO** | `biome check src/styles/official-identity.css` falhou: formatter reportou drift preexistente ao longo do arquivo e lintou usos de `!important` já existentes, inclusive a declaração antes da alteração. A verificação global não demonstra que o patch introduziu o problema; não foi aplicado reformat amplo por estar fora do escopo. |
| Typecheck/build/E2E autenticado | **NÃO EXECUTADOS NESTA REVISÃO** | O diff só altera CSS. O parecer anterior registra typecheck/build e testes públicos de login/welcome aprovados, mas o E2E autenticado não executou por indisponibilidade de Docker e serviços. |
| CI no SHA da correção | **PENDENTE** | Os runs recentes em `main` passaram, mas não contêm esta alteração. O CI da branch/PR ainda deve ser executado antes do merge. |

## Comandos e evidências desta revisão

- `git -C <worktree-Agente-03> status --short; git diff --check; git diff -- src/styles/official-identity.css; git rev-parse HEAD; Get-FileHash src\styles\official-identity.css -Algorithm SHA256` — **PASSOU**; diff de uma linha, base e hash conferidos.
- `node_modules\.bin\biome.cmd check src\styles\official-identity.css` — **FALHOU**; formatter propôs alterações extensas fora da linha alterada e lint reportou usos de `!important` preexistentes.
- `gh run list --repo MarksNN/Birthub-360 --branch main --limit 5` — mostrou os runs recentes de release central, CodeQL e SonarQube aprovados no SHA `94d0ada5fe2fb42871e4f97b48c6639994ef4c75`; eles não validam a correção ainda não publicada.
- `gh pr list --repo MarksNN/Birthub-360 --head marksnn-fix-card-subtitle-contrast` — nenhum PR existente para a branch.
- Revisão independente code-review: confirmou o escopo, o hash e as evidências de axe prévias; não reexecutou o browser.

## Achados, pendências e riscos

- **Pendência de gate:** CI da alteração exata ainda deve passar no PR antes da integração.
- **Limite de cobertura:** E2E autenticado amplo não foi executado e não está declarado como validado.
- **Limite local:** a tentativa de Biome encontrou drift de formatação e advertências preexistentes no arquivo; não se expandiu o diff para reformatá-lo.
- Nenhum risco novo de segurança, tenancy ou LGPD foi identificado no escopo exclusivamente visual.

## Decisão

**APROVADO**, estritamente para a única alteração em `src/styles/official-identity.css`, identificada pelo hash acima. A aprovação confirma a correção CSS e a evidência direta de axe já registrada para o mesmo conteúdo de arquivo; não substitui nem antecipa os checks do PR. A integração somente poderá avançar após o CI da revisão exata passar. Este parecer não autoriza release ou deploy.
