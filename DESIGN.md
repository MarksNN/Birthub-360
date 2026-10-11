# DESIGN.md — Birth Hub 360° (App Operate)

<!-- impeccable:design-schema 1 -->

Escopo: produto web autenticado (`/app/*`) — modo **Operate**.  
O DESIGN do playbook editorial vive em `docs/strategy/DESIGN-playbook.md`.

## Mundo visual

Central de comando SaaS premium: densidade executiva, hierarquia clara, cards e tipografia moderna. Inspiração estrutural: [Vancouver+](https://vancouverplus-template.modulify.website/) (dashboard limpo) — **não** copiar só dark; light e dark são cidadãos de primeira classe.

Princípios: premium, executivo, preciso, alta densidade sem poluição, próxima ação óbvia. Evitar landing marketing, hero centralizada e template genérico.

## Paleta (tokens semânticos)

Fonte normativa: `src/styles/globals.css` + overrides de canvas em `src/styles/elegance.css` (`--el-*`).

| Papel | Light (efetivo) | Dark (efetivo) |
|---|---|---|
| Canvas `--bg` | Pearl `#FBF8F3` | Ink deep `#0E0C12` |
| Surface | `#FFFFFF` / pearl-2 | pearl-2 / cream |
| Ink | `#141218` | `#F8F4EA` |
| Brand | Antique/Champagne gold `#C9A24C` | mesmo ouro (texto over → `--on-brand` escuro) |
| Accent | pink / soft sky / sage (`--el-*`) | idem calibrado |

Marca canônica Antique Gold `#D4AF37` permanece no brandbook; o canvas Operate usa ouro champagne como assinatura de UI sem inventar hex soltos nos componentes (`bg-brand`, `text-ink`, `border-line` / `border-input`).

## Tipografia

- **Sora** (`--font-brand-display`) — títulos, labels importantes, `font-display`
- **Inter** (`--font-brand-sans`) — corpo, UI, tabelas, dados
- Self-hosted em `public/fonts/` — **sem Google Fonts** no caminho crítico do app
- Fraunces / Instrument Sans **não** são tipografia do produto Operate

## Componentes

Primitivos em `src/components/ui/**`: Button, Input, Select, Textarea, Dialog, Drawer, Card, Table, Badge, EmptyState, Skeleton — tokens semânticos (PR #692).  
Shell (Sidebar/App) é propriedade do Agente 02 — redesign visual não altera navegação sem handoff.

## Temas

- Default: light (ThemeContext / `atlas_theme`)
- Dark: profundidade, contraste AA, glow só em foco/hover
- Focus: `--focus-ring` ≥ 3:1; inputs: `--border-input` ≥ 3:1
- Motion: respeitar `prefers-reduced-motion`

## Anti-referências

- Hex escuros fixos em primitivos UI (regressão 08–09/10)
- Google Fonts + `!important` em headings
- Landing Vancouver+ como UI do app; copiar só o dark

## Direção desta onda (`agente/03-impeccable-vancouver`)

1. Documentar sistema Operate (este arquivo + PRODUCT.md)
2. Alinhar `elegance.css` à Constituição (Sora/Inter self-hosted) mantendo canvas pearl/gold
3. Gaps vs Vancouver+ rastreados no run `.agents/runs/03-impeccable-vancouver-20261010.md`
