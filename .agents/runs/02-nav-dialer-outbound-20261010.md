# 02 — Nav dialer→cadence + esconder outbound/voice-hub (P0 #693 item 6)

Data: 2026-10-10 (BRT) · Branch: `agente/02-nav-dialer-outbound-honest` (base `origin/main` @ 88eb0ef)
Handoff: 17→02 `.agents/handoffs/onda-enxuta/17-para-02-dialer-redirect-cadence.md` (branch `agente/17-prisma-call-dnc`, #713 — não misturado)
Evidência: `.agents/runs/08-503-outbound-dialer-voice-20261010.md` (08)

## Escopo (só front/nav — backend intocado)
- `legacyModuleGate` / `/api/dialer-3cx` / `/api/outbound` / `/api/voice-hub`: **não alterados** (503 MODULE_NOT_READY intencional).
- `src/components/ui/**` e `src/styles/**`: **não alterados**.

## Mudanças
1. `src/App.tsx`
   - `/app/dialer` → `<Navigate to="/app/cadence" replace />` (antes: CadenceHub disfarçado de "Discador 3CX").
   - `/app/voice-hub/*` e `/app/outbound/*` → `<Navigate to="/app/dashboard" replace />` com comentário: não existe UI honesta pro 503 (voice-hub caía em erro genérico; outbound chamava APIs não montadas → 404). Volta quando o 12 reabrir o gate.
   - Removidos lazy imports `VoiceStudioPage`, `OutboundApp`, `DialerFrontend` (sem uso). Código das features permanece.
2. `src/components/layout/tabMeta.ts`
   - Rótulo "Discador 3CX" removido → `Cadências (discador indisponível)`; `Voice Hub (indisponível)`, `Outbound AI (indisponível)`.
   - Novo `NAV_HIDDEN_TABS` (`voice-hub`, `outbound`, `dialer`), `NAV_TAB_ALIASES` (`dialer → cadence`), `isNavHiddenTab()`.
3. `src/components/layout/MacDock.tsx` — PILAR 08 sem voice-hub/outbound/dialer; filtro defensivo por `NAV_HIDDEN_TABS` + remove pilar vazio (VISUALIZADOR sem Mesa não vê ícone morto).
4. `src/lib/navigationBus.ts` — voz: `dialer` navega pra `cadence`; `voice-hub`/`outbound` retornam `false` (ack honesto, sem navegação falsa).
5. Sidebar (`sidebarSections.ts`) e `FuturisticSidebar.tsx`: já não listavam esses tabs — coberto por teste.

## Pendência fora da minha fatia (src/components/ui → 03)
- `src/components/ui/CommandPalette.tsx` (`MODULE_ORDER`) e `src/components/ui/ModuleAgentWidget.tsx` ainda listam `voice-hub`/`outbound`/`dialer`. Hoje mostram os rótulos honestos "(indisponível)" e o clique cai no redirect (dialer→Cadências; outros→dashboard). Para esconder de fato: filtrar com `isNavHiddenTab(tab)` de `layout/tabMeta.ts` (1 linha em cada). Handoff para 03.

## Testes
- Novo: `src/components/layout/__tests__/navHiddenTabs.unit.test.ts` (4) + 3 casos novos em `src/lib/__tests__/navigationBus.unit.test.ts`.
- `npx vitest run -c vitest.unit.config.ts` navigationBus + navHiddenTabs + useNavigationBusBridge + VoiceCommandWidget → **4 files / 18 tests pass**.
- `tests/unit/components/layout/` + `tests/unit/App*` → **6 files / 31 tests pass**.
- `npx tsc --noEmit`: 0 erros nos arquivos tocados (único erro do repo: `src/components/ui/KpiCard.tsx(231)` pré-existente em main, fatia 03 `agente/03-fix-kpicard-tsc`).
- `biome lint` nos arquivos tocados: sem erros (2 warnings pré-existentes de `button type` em MacDock). Formatação só ajustada nas linhas novas (MacDock/App já fora do biome format em main).
