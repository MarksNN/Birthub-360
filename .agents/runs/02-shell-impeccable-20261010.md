# Run 02 — Shell Impeccable Operate (2026-10-10)

Branch: `agente/02-shell-impeccable-operate` · base `0801e68f` = tip de `agente/03-audit-a11y-ui` (#692 tokens a11y sobre main `88eb0efe`; inclui o fix KpiCard).
Separada de `agente/02-p0-falso-salvo-setup-copiloto` (#698, congelada) — nenhum arquivo do P0 tocado além do rótulo idêntico `Copiloto IA` em `sidebarSections.ts` (mesma linha, mesmo texto → merge limpo).

## Escopo (handoff 03 → 02 + handoff 05 nav)
NÃO tocado: `src/components/ui/**`, `src/styles/**`, `src/App.tsx`.

| Arquivo | Mudança |
|---|---|
| `layout/Sidebar.tsx` (montada via MainLayout) | Reescrita Operate: só tokens (`bg-surface-elevated`, `bg-surface`, `text-ink`/`text-ink-2`, `border-line`, `border-input`, `border-brand`, `bg-brand`, `text-primary`=brand-text, `ring-focus-ring`). Removidos orbs/gradientes/glow `rgba(...)`/itálico/`el-*` gold. Densidade: itens h-8, w-60 / rail w-16. Títulos de seção visíveis em `font-display`; labels `font-sans`. Ativo = borda+barra brand + ring focus-ring. `aria-current`/`aria-expanded`, focus-visible ring em todos os botões. Rodapé: removido "7 sinais" hardcoded (contagem fabricada) → atalho honesto "Ver sinais e riscos" (testids mantidos). |
| `layout/sidebarSections.ts` | `NavSubItem.path?` (sub-rota real). Inteligência de Mercado → sub: Pesquisa LDR (`market-intelligence`) + Hub de Inteligência (`market-intelligence/hub`). Prospecção → sub: Prospecção + Prospecção Inteligente (`prospect/inteligente`). `Copilot` → `Copiloto IA` (pedido 07, igual #698). |
| `layout/hooks/useSidebarState.ts` | `openTab(tab, path?)` / `selectTab(tab, e, path?)` / launch carrega `path`; auto-expande grupos MI e Prospecção. Compatível com chamadas antigas. |
| `layout/MainLayout.tsx` | **Bug real:** App monta `<MainLayout>` sem `activeTab` → Sidebar nunca marcava item ativo e Topbar caía sempre em `dashboard`. Agora deriva de `/app/<tab>` (prop explícita tem precedência). Canvas `bg-bg font-sans text-ink` (antes gradiente `from-background to-surface-2`). |
| `layout/MobileNavDrawer.tsx` | `bg-[#0B132B] border-white/10` → `bg-surface-elevated border-line`. |
| `layout/MacDock.tsx` (não montado hoje) | `bg-midnight`/`text-white`/`border-white/5` → tokens; foco visível; `subRoutes` com Hub de MI + Prospecção Inteligente no Pilar 02. |
| `layout/FuturisticSidebar.tsx` (só via FuturisticLayout, não montado hoje) | Removido shimmer `rgba(212,175,55)`, glows, gradientes; densidade Operate; `font-display` nos títulos; Hub MI + Prospecção Inteligente no grupo Prospecção. |
| `tests/unit/components/layout/SidebarNavDestinations.test.tsx` | Novo: hub/prospect inteligente navegam e marcam `aria-current`; LDR não acende no hub; rótulo Copiloto IA; sem "7 sinais". |

Tema: ThemeToggle já existe no `AppTopbar` (ThemeContext põe `.dark` no root); o shell agora só usa tokens que o `.dark` redefine → responde aos dois temas. `AppTopbar` ainda usa `--el-*` (variáveis do elegance.css, que também são tematizadas) — não alterado nesta run (P1 se 03 quiser unificar).

## Evidência
- `vitest run tests/unit/components/layout`: 7 files / 35 tests ✅ (inclui Sidebar RBAC, SidebarLaunch, useSidebarState).
- `tsc --noEmit`: limpo ✅ (o erro `ui/KpiCard.tsx(231)` que existia em `bc341a24` já foi corrigido pelo 03 em `5b30656e`/`0801e68f`).
- Prettier aplicado nos arquivos tocados. ESLint do repo sem `eslint.config.*` (não executável).

## Pendências
- Evidência visual light/dark (screenshot) — não feita nesta run.
- App.tsx não editado (evita conflito com #698 RequireRole copiloto).
