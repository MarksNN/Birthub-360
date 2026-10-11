# Run — Agente 03 Impeccable Operate light+dark (2026-10-10)

**Branch:** `agente/03-impeccable-vancouver` (base a11y #692 @ 0e933e0 (parecer 24 vigente))  
**Repo:** MaarkssN/Birthub-360  
**Modo:** Operate · referência Vancouver+ · light + dark

## Gap checklist vs Vancouver+ / meta premium

| ID | Gap | Status | Nota |
|---|---|---|---|
| G1 | Tipografia produto (Sora+Inter self-hosted) vs Fraunces/Instrument via Google Fonts | **corrigindo** | elegance.css |
| G2 | Light mode realmente claro (pearl/white) | parcial | canvas elegance já pearl; validar telas shell (02) |
| G3 | Dark mode coerente (não “light invertido”) | parcial | elegance `.dark` pearl deep |
| G4 | Cards / hierarquia tipo dashboard Vancouver+ | **em curso** | shell/layout = 02; primitivos Card tokens OK |
| G5 | Contraste AA em brand/on-brand | feito no #692 | manter |
| G6 | Foco visível ≥ 3:1 | feito no #692 | manter |
| G7 | Densidade Operate (scan + próxima ação) | **em curso** | precisa surfaces com 02 |
| G8 | Evidências screenshots light/dark desktop/mobile | aberto | 08 / browser |
| G9 | Axe nos dois temas | aberto | 08 |
| G10 | Remover scan de classes inválidas em `.md` | feito no #689 | lição: não colar className quebrado em handoffs |

## Implementado nesta leva

- PRODUCT.md (usuários: operadores + gestores)
- DESIGN.md do app Operate; playbook movido para `docs/strategy/DESIGN-playbook.md`
- elegance.css: remove Google Fonts; body/display usam Inter/Sora self-hosted; sem `!important` Fraunces


## Superfícies prioritárias (Cartógrafo, 2026-10-10)

Ordem de evidência light+dark — mapa canônico PR #693:

**P0 (Command Center / entrada)**
1. `/app` + `/app/dashboard` — AdaptiveDashboard (cockpit)
2. `/app/workspace` — WorkspaceHome
3. `/app/daily-plan` — DailyPlanHub (foco SDR)

**P1 (pilares comerciais)**
4. `/app/crm` — CrmBoard
5. `/app/crm360` — CrmOverview
6. `/app/prospect` — ProspectingHub
7. `/app/intelligence` e `/app/copiloto_ia` — IntelligenceHub / EliteCommercialAgentWorkspace

**P2 — evitar como vitrine**
- voice-hub, outbound, dialer (503 MODULE_NOT_READY)
- forecast/metas/pipeline_ponderado (números hardcoded)
- settings_* (PillarSettingsPlaceholder)

Shell App/Sidebar = Agente 02 (handoff se precisar). Escopo 03: ui/** + styles/**.

## Fora de escopo

App.tsx, Sidebar, voice-hub, #689 MacDock/KpiCard/ThemeToggle, package.json, identidade-visual

## Implementação UI (2026-10-10 noite)

- `KpiCard` retokenizado: `bg-surface` / `text-ink` / `border-line` / tones semânticos (light+dark)
- `elegance.css`: helpers `.operate-dense` / `.operate-kpi-grid` / `.operate-panel`
- Shell App/Sidebar: Agente 02 em `agente/02-shell-impeccable-operate`
- Base a11y local merge `#692` @ bc341a2 (remoto impeccable ainda precisa sync via push de arquivos)
