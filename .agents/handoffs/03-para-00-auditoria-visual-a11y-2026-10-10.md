- De: 03 (Design e Acessibilidade)
- Para: 00 (Coordenador) · cópia informativa: 02, 08, 11, 24
- Onda: freeze 2026-10-10 (só bug/a11y/consistência)
- Status: resolvido (código integrado em main @ 5fcf3724; parecer APROVADO do Agente 24)
- Prioridade: bloqueador (P0/P1 > 0 bloqueia o GA visual gate)

## Problema

Auditoria visual e de acessibilidade da `main` @ `33edc320` (MaarkssN/Birthub-360): **2 P0 · 11 P1 · 15 P2 · 10 P3**.
O tema padrão é o **claro** (`ThemeContext.tsx:19`), e duas mudanças fora do dono (08 e 09/10) quebraram a UI:

1. **A03-P0-01**: os primitivos `src/components/ui/**` foram reescritos com hex escuros fixos (`58e9fd8`, `34ed4b4`, `1075660`, `ee7942a`). Texto `text-ink` dentro de Dialog/Card ficava com **1.11:1** no claro.
2. **A03-P0-02**: `elegance.css`, importado globalmente em `main.tsx:12` (commit `c1bbc3d`, rotulado "fix(sync)"), redefine tokens, fontes (Google Fonts) e foco sem layer.

Relatório completo: `.agents/runs/03-audit-a11y-ui-20261010.md` (nesta mesma branch). A cópia local de trabalho fica em `/workspace/birthhub-03-audit/` (`CHECKLIST.md`, `RESUMO.md`, `MAPA-ARQUIVOS.md`).

## Top P0/P1 e status nesta branch (`agente/03-audit-a11y-ui`)

| ID | Problema | Status nesta branch |
|---|---|---|
| P0-01 | Primitivos de UI com hex escuro fixo | **corrigido**: Button, Input, Select, Textarea, Dialog, Drawer, Card, Table, EmptyState, Skeleton, Badge e Toggle voltaram para os tokens (`bg-surface*`, `text-ink*`, `border-line`/`border-input`, `ring-ring`, `ring-offset-bg`) |
| P0-02 | `elegance.css` sobrescreve tokens, fontes e foco | **parcial (decisão 00: manter o import)**: só correções cirúrgicas de a11y. `--on-brand` escuro (2.18:1 → ~7.8:1) e `*:focus-visible` → `var(--focus-ring)`. Fontes Google, paleta ouro, `h1-h3 !important` e scrollbar continuam **abertos** |
| P1-01 | Anel de foco < 3:1 no claro | **corrigido**: token `--focus-ring` (claro ≈ 6.7:1 sobre pearl; escuro = `--brand` ≈ 8:1), e `--color-ring`, `:focus-visible`, `.bh-focus` e `.bh-state-focus` apontam para ele |
| P1-02 | Inter não carregada | **corrigido**: `@font-face` Inter variável (latin/latin-ext). O body continua com Instrument Sans enquanto o `elegance.css` estiver ativo (P0-02) |
| P1-03 | `Button loading` não desabilita | **corrigido**: spread antes, depois `disabled`/`aria-busy`; sem spinner com `asChild` (teste unitário) |
| P1-04 | Dialog/Drawer estouram a viewport | **corrigido**: `w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto`; Drawer com `overflow-y-auto` (+`max-h-[85dvh]` em top/bottom) |
| P1-05 | Nome/descrição do Dialog/Drawer, `preventClose` | **corrigido**: `subtitle` → Description; título `sr-only` de fallback; `preventClose` bloqueia Esc/overlay (teste unitário) |
| P1-06 | Badges < AA | **corrigido**: tokens `*-active` (claro 5.7–9:1); `--ok-active` escuro recalibrado (4.04 → ~6:1 com o sage do elegance) |
| P1-07 | Destrutivo/link < AA | **corrigido**: `bg-btn-danger` (5.3:1) e link `text-brand-ink dark:text-brand` |
| P1-08 | CTA `.vancouver-btn-gradient` texto branco | **corrigido em CSS**: `color: var(--on-brand)` (≈7.8:1 no ouro e ≈6.1:1 no rosa efetivos); duplicata removida. Falta validar visualmente no login (auth: 00) |
| P1-09 | Bordas de controle < 3:1 | **corrigido**: `--border-input` (claro ≈3.3–3.5:1, escuro ≈4:1) e `--line-strong`; utilitários `border-input`/`border-line-strong` |
| P1-10 | `outline-none` sem substituto | **parcial**: `CyberInput` (03) corrigido. As features precisam de handoff aos donos (02 settings, 05 prospecting, 00 auth/landing; voice-hub é do 12) |
| P1-11 | Gate a11y só no claro, sem modais | **aberto**: handoff ao 08 |

Extras desta leva: os aliases `background/foreground/border/primary/muted` no `@theme` (P2-07). `primary` usa `--brand-text`, seguro como texto. `text-muted` → `text-ink-2` em `WorkspaceReadySection.tsx`, para o alias não deixar o texto invisível.

## Arquivo(s) envolvido(s)
`src/styles/globals.css`, `src/styles/elegance.css` (cirúrgico), `src/components/ui/*` (12 primitivos + CyberInput), `src/components/workspace/WorkspaceReadySection.tsx` (1 classe).

## Alteração necessária (decisões pendentes do 00)
1. **elegance.css (P0-02)**: o import foi mantido por decisão do 00. Continuam abertos: o Google Fonts (que quebra o offline do Capacitor e viola a Constituição), `font-family: Fraunces !important` em `h1-h3`, a paleta ouro × sky/violeta (reconciliar com o 11) e a scrollbar/`::selection`. Recomendação 03: confinar o arquivo a `el-*` em `@layer components`, ou trocar as fontes por self-hosted aprovadas.
2. **package.json** (P2-04 `tw-animate-css`, P2-05 `@radix-ui/react-dialog` explícito): fora desta PR, por decisão do 00.
3. **auth/landing**: validar o CTA de login (P1-08) e `LoginFormCard` `outline-none` (P1-10).

## Teste esperado
- `npx tsc --noEmit`, `biome lint`/`format` nos arquivos tocados e `vitest` de `components/ui` (rodados, ver o PR).
- **Pendente (08):** axe nos dois temas com Dialog/ConfirmDialog/Drawer abertos, em 390/768/1366/1440, e regolden visual consciente (os goldens são de 02/10).
- Parecer do **24** antes de "pronto".

## Contexto adicional
Os contrastes foram calculados pela fórmula WCAG sobre os tokens efetivos (cascata `globals.css` → `elegance.css`), **não medidos em navegador**.

## Resolução
- Código integrado à `main` no commit `5fcf3724832f0839693fef9b0005e53e15f3bdd5` (PR #692).
- Parecer do Agente 24 registrado em `.agents/reviews/03-audit-a11y-ui-20261010-24.md` (APROVADO para código, tokens, primitivos e gates locais).
- Pendência residual de GA visual (inspeção visual light/dark, axe-core em navegador aberto e regolden) permanece com o Agente 08 para a esteira de release.

