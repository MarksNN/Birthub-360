# Parecer Agente 24 — PR #86 (teste da marca no Sidebar do voice-hub)

- **Missão:** corrigir a regressão do Unit em `src/features/voice-hub/components/Sidebar.test.tsx`. Desde `3505031f`, o "360" da marca é um `<span>` dentro do `<h1>`, e `getByText('Birth Hub 360')` deixou de achar o texto.
- **Autor:** Agente 02 (branch `agente/02-fix-sidebar-test-brand`)
- **Auditor:** Agente 24 — Revisão Independente
- **Data:** 2026-10-25 (America/Sao_Paulo)
- **Head auditado:** `1edff8b2199a60269c795c1f515c26643ecda981` (confere com `gh pr view`)
- **Base:** `main` @ `6767729580fda0f333cfb59b66271f5e0bf05c7e` (merge-base = main; 0 atrás, 1 à frente). `merge-tree` limpo (tree `cc53474a`); `MERGEABLE`.
- **Decisão:** **BLOQUEADO @ 1edff8b2.** Não há defeito no código. Falta a evidência de CI exigida pelo §40: o passo Unit não rodou no head, porque o application gate foi skipped (trivy).

## Escopo
`git diff --stat origin/main...origin/pr86`: 1 arquivo, `Sidebar.test.tsx` (+4/−1). A mudança é só de teste; nenhum arquivo de UI ou de `src` de produção foi alterado.

## Verificações
1. **Componente** (`Sidebar.tsx:252-257`, sem alteração): há um único `<h1>` no arquivo:
   `<h1>Birth Hub{' '}<span>360</span></h1>`. O espaço é explícito (`{' '}`), então `textContent` = "Birth Hub 360". O `getByRole` passou no head, o que prova que existe exatamente um heading nível 1 com esse nome (com 0 ou 2+, ele lança erro).
2. **Matcher estrito:** `name` recebe uma string, não um regex. A comparação é exata (após o normalizador padrão, que só colapsa espaços). A mutação 4 confirma.
3. **Execução local** (`vitest run -c vitest.unit.config.ts <arquivo>`):
   - head: **4/4 passed**.
   - main (teste antigo): **1 failed | 3 passed** — `TestingLibraryElementError: Unable to find an element with the text: Birth Hub 360. This could be because the text is broken up by multiple elements` (erro conhecido).
4. **Mutações** (cópia de trabalho; revertidas, `git status` limpo):

   | Mutação em `Sidebar.tsx` | Resultado |
   |---|---|
   | remover o `<span>360</span>` (fica "Birth Hub") | ❌ falha (`Unable to find an accessible element with the role "heading" and name "Birth Hub 360"`) — bom |
   | `<h1>` → `<h2>` | ❌ falha — bom |
   | "360" → "360 Pro" | ❌ falha (nome exato) — bom |
   | remover o `{' '}` (visualmente "Birth Hub360") | ✅ **passa** — limitação (P4) |

5. **Demais asserções do arquivo:** continuam significativas — navegação (`Agent Registry`, `Voice Studio`), usuário real da sessão, evento `open-command-palette`, stub do `NotificationCenter` e toast de favoritos. Nenhuma foi afrouxada.
6. **Outros testes com o texto da marca:** `src/components/ui/__tests__/Table.test.ts` usa "Birth Hub 360", mas renderiza o próprio texto numa célula, então não depende do Sidebar. As outras ocorrências estão em comentários, strings de dados ou testes de rota. Nenhum outro teste de unidade depende da marca do Sidebar.
7. **CI do head:**
   - Release `40214210078`: trivy ❌ (herdado), **application gate skipped** e, portanto, **Unit não rodou**; build ❌.
   - Trivy `40214210136` ❌. Dependency Review e Bundle Budget ✅.
   - SonarQube `40214210099`, CodeQL e Visual estavam in_progress na auditoria. O SonarQube roda `test:unit --coverage`, mas nos outros branches ele falha nesse passo por falhas herdadas; não substitui o gate.
8. **Validação v4e:** draft #85, `agente/gha-validate-v4e` @ `2e3d9138` (= main + #67/#71/#72/#75). **Não contém o #86**: ainda tem `getByText('Birth Hub 360')` na linha 80. A Release `40213239240` estava in_progress, com "Run Unit Tests" = success, mas esse passo usa `continue-on-error: true`; logs indisponíveis durante a execução. Portanto o v4e não valida o #86. Nenhum outro branch de validação do GHA inclui o #86.

## Achados
- **P4:** o jsdom não aplica `display: inline` real; com isso, o cálculo de nome acessível insere um separador entre os nós filhos. Por isso o teste não detecta a remoção do `{' '}` (em navegador real o nome seria "Birth Hub360"). Opcional: somar `expect(h1).toHaveTextContent(/^Birth Hub 360$/)`, que usa `textContent` e pegaria esse caso.
- **P4 (a11y, nota):** `<h1>` dentro de um sidebar persistente concorre com o `<h1>` das páginas: pode haver dois h1 por tela. Sugestão para a UI (fora do escopo): marca como `<p>`/`<span>` ou `<h2>`, ou um `aria-label` no landmark `<nav>`/`<aside>`. Se isso mudar, este teste precisa acompanhar.
- **P4:** o comentário em PT no teste está correto e explica a causa.

## Para virar APROVADO
O passo Unit precisa rodar no CI com o #86 incluído e com este arquivo verde: o application gate após o fix do trivy (#67) ou uma validação descartável que contenha `1edff8b2`. Isso precisa acontecer sem mudança de conteúdo no arquivo; se o head mudar, a reauditoria é obrigatória.

## Comandos principais
```
git fetch origin pull/86/head:refs/remotes/origin/pr86
git diff --stat origin/main...origin/pr86 ; git merge-tree --write-tree origin/main origin/pr86
node node_modules/vitest/vitest.mjs run -c vitest.unit.config.ts src/features/voice-hub/components/Sidebar.test.tsx   # head 4/4; main 1 failed
gh run list -R MarksNN/Birthub-360 --commit 1edff8b2199a60269c795c1f515c26643ecda981
git merge-base --is-ancestor origin/pr86 2e3d9138 || echo "v4e não contém #86"
```
