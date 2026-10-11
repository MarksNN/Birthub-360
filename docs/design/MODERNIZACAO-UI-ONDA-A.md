# Modernização Visual — Onda A (Diagnóstico e Arquitetura)

Agente 00 · Branch `agente/00-ui-modernizacao-inventario` (base `main` @ `e7c26e92f`) · 2026-10-11
Escopo desta onda: **somente diagnóstico e planejamento. Nenhuma dependência instalada, nenhum código de produto alterado.**

## 1. Inventário real (medido no repositório)

| Item | Achado | Evidência |
|---|---|---|
| Stack | React 19, Vite 6, Tailwind 4 (CSS-first, `@tailwindcss/vite`), TS 6, react-router 7 | `package.json` |
| Primitivos UI | 71 `.tsx` em `src/components/ui/` (Button, Card, Dialog, Drawer, Select, Table, Toaster, CommandPalette, Skeleton…) | `Get-ChildItem` |
| Radix | Só `@radix-ui/react-slot` declarado; `Dialog.tsx` importa `@radix-ui/react-dialog` **transitivamente** (via `vaul`) — dependência implícita já registrada como P2-05 pelo 03 | `Dialog.tsx`, handoff 03→00 |
| shadcn/ui | **Não instalado**: sem `components.json`; uso de `cva` em 7 arquivos, `tailwind-merge` em `lib/utils` | grep |
| Toast / Command Palette | Implementações próprias (`Toaster.tsx` + `lib/toast`, `CommandPalette.tsx` ~17 KB). Sem `sonner`/`cmdk` | arquivos |
| Gráficos | **Duas libs já em uso**: Recharts (10 arquivos), ECharts (13 arquivos) + Three.js (4) | grep |
| Motion | `framer-motion` (104 arquivos) **e** pacote `motion` ambos declarados — redundância | `package.json` |
| Ícones | `lucide-react` (353 arquivos) | grep |
| Storybook | v10 + addon-a11y/vitest; **apenas 4 stories** (Badge, Button, Card, Input) para 71 primitivos | `*.stories.tsx` |
| Testes visuais/a11y | Playwright (`test:visual`, `playwright.visual.config.ts`), `@axe-core/playwright`, `e2e/visual*.spec.ts` | `package.json`, `e2e/` |
| Gates existentes | `lint` (biome), `test:architecture`, `check:bundle-budget`, `test:unit/integration/e2e/visual` | `package.json` |
| Shell | `Sidebar`, `FuturisticSidebar`, `AppTopbar`, `MobileNavDrawer`, `MacDock`, `FloatingDock`, `MainLayout`, `FuturisticLayout` — **vários shells coexistem** | `src/components/layout/` |
| Design Lab | `src/features/design-lab/DesignLabPage.tsx` | arquivo |
| Documentação de DS | `docs/DESIGN_SYSTEM.md`, `docs/design/*`, `.agents/BIRTH_HUB_DESIGN_CONSTITUTION.md`, `.agents/FRONTEND_DESIGN_RECONSTRUCTION_REPORT.md` | arquivos |

### Achados críticos de diagnóstico

1. **Drift de marca (decisão humana/11 necessária).** `src/styles/globals.css` define `--brand:#00d4ff` / `--brand-2:#ff2d9b` (azul/rosa neon), mas `docs/DESIGN_SYSTEM.md` e `docs/design/*` documentam ouro `#D4AF37`, e `elegance.css` (importado globalmente) redefine `--brand: var(--el-gold)`. A paleta efetiva depende da cascata. O pedido ("azul neon, rosa neon, dourado") coincide com a mistura atual, não com a documentação. → **Decidir uma única paleta oficial antes de qualquer migração visual.**
2. **`elegance.css` (P0-02 do 03) ainda parcial**: Google Fonts (quebra offline Capacitor), `h1–h3 !important`, scrollbar. Bloqueia consistência tipográfica.
3. **Shells concorrentes** (`Sidebar` vs `FuturisticSidebar`, `MacDock`/`FloatingDock`): dívida de arquitetura antes de "modernizar sidebar".
4. **Cobertura de Storybook ~6 %** (4/71) — sem isso, regressão visual de primitivos depende só de Playwright de páginas.
5. **GA visual pendente (08)**: axe nos dois temas com modais abertos e re-golden dos snapshots (handoff 03→00, P1-11).
6. **Working tree de `main` está sujo** com trabalho de outros agentes (prospecting, telemetry, reviews). Esta onda usa worktree próprio (`c:\Github\birthub-ui-00`) para não tocar neles.

## 2. Matriz de decisão de ferramentas

Licenças: MIT de `shadcn-admin` e `shadcndashboard` **verificadas** nos `LICENSE` do GitHub em 2026-10-11. As demais vêm de conhecimento do agente e **devem ser reconfirmadas no `LICENSE` antes de instalar/copiar** (NÃO EXECUTADO).

| Ferramenta | Existente? | Compatível? | Licença | Ganho real | Ação |
|---|---|---|---|---|---|
| shadcn/ui (CLI + padrão copy-in) | Parcial: Tailwind 4 + `cva` + `cn` + Radix Slot/Dialog; sem `components.json` | Sim (React 19, Tailwind 4, Vite). Verificar alias `@/` vs imports relativos `.js` do projeto | MIT (a reconfirmar) | Médio: Tabs, Dropdown, Tooltip, Sheet, Select acessíveis (Radix) em vez de variantes próprias. Alto risco de duas bibliotecas | **AVALIAR → INSTALAR seletivo**: adotar *componente a componente*, **dentro de `src/components/ui/`**, mesclando com primitivos atuais (sem pasta paralela). Declarar `@radix-ui/react-dialog` explicitamente (já pendente) |
| Shadcn Admin | Não | Referência (Vite + shadcn + TanStack) | MIT ✔ verificada | Referência de sidebar recolhível, breadcrumbs, tabela com filtros, settings | **AVALIAR (só referência)** — não copiar template; ao copiar trecho, manter aviso de copyright MIT |
| Shadcn Dashboard | Não | Referência | MIT ✔ verificada (Copyright 2026 Shadcn Dashboard) | Blocos de perfil/forms/auth; sobrepõe Shadcn Admin | **AVALIAR (só referência)**; preferir um só como fonte por tela |
| Magic UI | Parcial: `BorderBeam`, `Magnetic`, `ClickSpark`, `ParticleSystem` próprios | Sim (copy-in, framer-motion/`motion`) | MIT (a reconfirmar) | Baixo no app autenticado; relevante só em landing/institucional | **AVALIAR p/ Onda E apenas** (landing). Não aplicar no app. Obrigatório `prefers-reduced-motion` |
| Tremor | Não | Apache-2.0 (a reconfirmar); traz mais Radix + Recharts por baixo | Apache-2.0 | **Nulo/negativo**: já há Recharts + ECharts; Tremor seria 3ª camada | **DESCARTAR** (reabrir só com protótipo mostrando ganho mensurável) |
| Onlook | Não | Foco em Next/Vite-React experimental; compat. a validar em spike | Apache-2.0 | Ferramenta de dev local, não dependência do produto | **AVALIAR (spike fora do repo)** — nada em `package.json` |
| Screenshot-to-Code | Não | Serviço externo; envia imagens a LLM | MIT | Protótipo inicial apenas; risco LGPD/segredo se screenshot tiver dados reais | **AVALIAR (uso manual, só mockups sem PII)**; saída passa por revisão 03 + a11y |
| Playwright (visual) | Sim | Sim | Apache-2.0 | Alto | **REUTILIZAR** (re-golden consciente) |
| axe-core | Sim (`@axe-core/playwright`, `addon-a11y`, `jsx-a11y`) | Sim | MPL-2.0 | Alto | **REUTILIZAR**; ampliar para dark + modais (08) |
| Storybook | Sim (v10) | Sim | MIT | Alto, subutilizado | **REUTILIZAR/EXPANDIR** stories dos primitivos migrados |
| shadcn/lint | Não | Requer validar versão do shadcn | n/d | Incerto | **AVALIAR** após decidir adoção shadcn; não instalar agora |
| Análise de bundle | Sim (`check:bundle-budget`) | Sim | — | Alto | **REUTILIZAR**; rodar antes/depois de cada onda |
| `motion` + `framer-motion` | Ambos | Redundante | MIT | Reduz bundle | **ATUALIZAR/CONSOLIDAR** (handoff ao 00 por `package.json`; fora desta onda) |
| Recharts vs ECharts | Ambos | — | MIT / Apache-2.0 | Consolidar reduz custo | **REUTILIZAR** ambos; sem 3ª lib; consolidação = decisão do 04 |

## 3. Arquitetura proposta

- **Fonte única de tokens**: `src/styles/globals.css` (`@theme`). `elegance.css` é confinado/removido em onda posterior (P0-02), com decisão de paleta (§1.1).
- **Primitivos**: continuam em `src/components/ui/` (dono 03). shadcn entra *por componente*, reescrito para consumir tokens (`bg-surface`, `text-ink`, `border-input`, `ring-ring`). Sem `components/shadcn/` paralelo.
- **Shell**: dono 02. Decidir shell canônico entre os existentes e arquivar os demais antes de adicionar recolhimento/breadcrumbs (referência: Shadcn Admin).
- **Marca**: logos só via abstrações existentes; qualquer mudança → 11 + aprovação humana.
- **Dependências**: `package.json`/lockfile só com aprovação do 00 (protocolo §"server.ts/package.json"), uma dependência por PR.

## 4. Plano de ondas (dependências e aceite)

| Onda | Dono(s) | Dependências | Aceite verificável |
|---|---|---|---|
| A Diagnóstico (esta) | 00 (+24) | — | Este documento, matriz, handoffs, parecer 24 |
| B Design system | 03; 11 (paleta); 08 | Decisão de paleta (11 + humano); decidir P0-02 | Tokens únicos documentados; `tsc`, `lint`, `test:unit` de `components/ui`; Storybook dos primitivos migrados; axe light+dark sem violação nova; `check:bundle-budget` sem piora |
| C App Shell | 02; 03 | B | Rotas/guards inalterados (testes existentes); breadcrumbs; sidebar recolhível persistida; teclado/foco; 390/768/1366 |
| D Piloto | 02/03 + dono da página; 08; 24 | B, C | **Página-piloto sugerida: Integrações** (já teve erros de frontend B-09, escopo fechado, baixo risco tenant) — a confirmar com 02. Screenshots antes/depois, E2E da página, teste de permissão, axe |
| E Público/Auth | 00 (auth/landing), 03, 11 | D aprovado | Login/recuperação intactos (E2E); Magic UI só aqui, com reduced-motion |
| F Módulos | 04 (Dashboard/CRM/BI), 05, 07, 02, donos | D aprovado | Um módulo por PR com evidências próprias |
| G QA | 08, 14, 22, 24 | F | Gate de integração completo + `npm audit` + varredura de segredos |

Regra: nada de migração em massa antes do Piloto validado e aprovado pelo 24.

## 5. Backlog por agente (inicial)

| Agente | Item |
|---|---|
| 11 + humano | Decidir paleta oficial (neon azul/rosa vs ouro documentado) e reconciliar `docs/` |
| 03 | `@radix-ui/react-dialog` explícito; stories dos primitivos; plano para P0-02 (`elegance.css`); avaliar `Tabs/Tooltip/Dropdown` shadcn-based |
| 02 | Escolher shell canônico; arquivar shells redundantes; breadcrumbs; sidebar recolhível |
| 08 | axe dark + modais; re-golden visual consciente; baseline de bundle |
| 04 | Posição sobre Recharts vs ECharts (sem terceira lib) |
| 00 | Aprovar mudanças de `package.json`; consolidar `motion`/`framer-motion` |
| 24 | Parecer desta onda e de cada leva |

## 6. Riscos

- Duas paletas coexistem → qualquer componente novo pode herdar a errada.
- Copiar shadcn sem adaptar a tokens reintroduz hex fixos (regressão P0-01 do 03).
- Contraste de neon/ouro sobre claro precisa de cálculo WCAG por token (ver handoff 03).
- Sujeira em `main` de outros agentes: integração só por branch própria.

## 7. Verificações desta onda

- `tsc`, `lint`, `build`: **NÃO EXECUTADO** (nenhum código alterado; baseline não aplicável).
- Licenças MIT de shadcn-admin e shadcndashboard: **VERIFICADO** em `LICENSE` do GitHub. Demais: **NÃO EXECUTADO** (reconfirmar).
- Sem screenshots antes/depois nesta onda: **NÃO EXECUTADO** (sem mudança visual).
