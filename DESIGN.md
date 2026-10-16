# DESIGN.md — Birth Hub 360° (Sistema Operacional de Revenue Intelligence)

<!-- impeccable:design-schema 1 -->

Escopo: produto web autenticado (`/app/*`) — modo **Operate**.  
Autoridade normativa: Manual Oficial de Identidade Visual 2026 e Manual de Identidade do Produto (Nova pasta).  
Regra expressa de governança: Landing Page e Tela de Login permanecem intocadas.

## Mundo visual

Central de comando 360° de Revenue Intelligence: alta densidade executiva, interfaces hiper-responsivas, tipografia com toque arredondado, cards com acabamento impecável e contraste WCAG 2.2 AA inegociável. Operação fluida tanto no tema claro quanto no tema escuro.

## Paleta Oficial Neon & Superfícies

Fonte normativa: `src/styles/official-identity.css` e `src/styles/globals.css`.

| Papel | Dark Oficial | Light Oficial | Descrição |
|---|---|---|---|
| Fundo Canvas `--bg` | Preto Neon `#0D0D0D` | Canvas Claro `#F8FAFC` | Fundo principal da aplicação |
| Fundo Cards `--surface` | Fundo Cards `#14141A` | Branco Puro `#FFFFFF` | Superfície de cartões e modais |
| Superfície 2 `--surface2` | `#1C1C24` | `#F1F5F9` | Elementos aninhados, tabelas e pílulas |
| Texto Principal `--ink` | Branco Neon `#F8F9FF` | Azul Escuro `#0B132B` | Leitura de alto contraste |
| Texto Secundário `--muted` | `#A1A1B5` / `#9EADC8` | `#475569` | Metadados contextuais e descrições |
| Azul Neon (Brand) | `#00D4FF` | `#0284C7` (adaptado AA) | Inovação, confiança, halos da órbita |
| Rosa Neon (Brand 2) | `#FF2D9B` | `#D91B7C` | Energia, conversão e ações CTA |
| Dourado Neon (Warn/Meta) | `#FFC107` | `#D97706` | Prosperidade, ARR, métricas e alertas |
| Sucesso / Ok | `#22C55E` | `#16A34A` | Metas batidas e sincronização ativa |
| Crítico / Risco | `#EF4444` | `#DC2626` | Perdas de negócio e desconexão de API |
| Informativo / Info | `#3B82F6` | `#2563EB` | Avisos de andamento e dicas contextuais |
| Íris / Inteligência IA | `#8B7DFF` | `#7C3AED` | Copiloto IA e agentes autônomos |

## Gradientes Oficiais de Assinatura

- **Gradiente de Títulos (Brand):** `linear-gradient(135deg, #00D4FF 0%, #FF2D9B 50%, #FFC107 100%)`
- **Gradiente de Ação (CTA Neon):** `linear-gradient(135deg, #FF2D9B 0%, #00D4FF 100%)`
- **Anel de Órbita Cônico 360°:** `conic-gradient(from 0deg, #FFC107, #FF2D9B, #00D4FF, #FFC107)`
- **Glows Oficiais:** `0 0 24px rgba(0, 212, 255, 0.45)` (Azul), `0 0 24px rgba(255, 45, 155, 0.45)` (Rosa)

## Trinca Tipográfica Exclusiva

1. **Sora** (`--font-display`): Títulos (H1–H6), Heros de impacto, botões de ação e números de destaque comercial. Pesos: 400, 600, 700, 800. Tracking: `-0.02em`.
2. **Inter** (`--font-interface`): Interface de alta densidade (menus, tabelas, modais, formulários). Configurada obrigatoriamente com `font-feature-settings: "cv05", "cv11", "ss01"` (toque arredondado) e tracking `-0.012em`.
3. **IBM Plex Mono** (`--font-mono`): Dados tabulares, contadores de receita (R$ 1.482.000), logs de IA e badges técnicos.

## Geometria e Raios de Borda

- Controles e Inputs: `12px` (`--radius-control` / `--r-control`)
- Cards e Superfícies: `16px` (`--radius-card` / `--r-card`)
- Modais e Diálogos: `20px` (`--radius-modal` / `--r-modal`)
- Botões e Pílulas Segmentadas: `9999px` (`--radius-pill` / `--r-pill`)

## Os 4 Estados Obrigatórios de Todo Módulo (Capítulo 5)

Todo painel, dashboard ou lista deve implementar de forma explícita e testada:
1. **Loading State:** Skeletons pulsantes no formato exato dos cards (`<Skeleton>`).
2. **Empty State:** Visual zero-state com Call-to-Action claro (`<EmptyState>`).
3. **Error State:** Causa raiz transparente e ação de retentativa rápida sem deslogar o operador.
4. **Stale State:** Informar timestamp da última sincronização mantendo dados prévios visíveis em cache.
Padronizado no componente global: `<OperationalStateContainer>`.

## Catálogo de Componentes Oficiais (30 componentes)

1. Marca & Logos: `BirthHubOfficialLogoHorizontal`, `BirthHubOfficialEmblem`, `BirthHubLogo`
2. Ícones: `PillarIcons` (8 ícones dos pilares), `BrandIcons` (24x24 traço redondo)
3. Ações: `Button` (variantes brand CTA neon e vancouver outline), `IconButton`, `ButtonGroup`, `ToggleButtonGroup`, `Fab`
4. Formulários: `CyberInput`, `Input`, `Textarea`, `Select`, `Switch`, `Slider`, `DatePicker`
5. Navegação: `Sidebar`, `Tabs`, `Stepper`, `Breadcrumbs`
6. Dados & Métricas: `BentoMetric`, `Badge` (Coolors), `Table`, Gráficos Neon
7. Feedback & Alertas: `Alert`, `Dialog`, `CommandPalette` (⌘K)
8. Efeitos: `bh-glass`, `border-glow-brand`, `OrbitRing` (anel cônico 360°)
