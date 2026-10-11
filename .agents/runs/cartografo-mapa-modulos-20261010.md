# Run — Cartógrafo de Produto — mapa de módulos

- **Data:** 2026-10-10
- **Agente:** Cartógrafo de Produto
- **Missão:** inventário estrutural de módulos (rotas/páginas/features)
- **Repo canônico:** MaarkssN/Birthub-360 (Marks-Mah/Birthub-360 redireciona 301 para o mesmo HEAD)
- **Base lida:** main @ `33edc320f0e60394ac56994bc6f47e1eb48bdd3d`
- **Branch de entrega:** `agente/02-mapa-modulos`

## Entrega

- `docs/product/MAPA-MODULOS.md` — índice estrutural; colunas Propósito/Status/Melhorias = Agente 02
- Este run

## Contagem (evidência em código)

| Item | Qtd |
| --- | ---: |
| Tabs (`tabMeta.ts`) | 54 |
| Rotas `/app/*` | 59 |
| Rotas fora de `/app` | 16 |
| Pastas `src/features/` | 49 |
| Rotas API registradas | 88 |

Cobertura Tab ↔ rota ↔ `navigationBus`: **100%** (nenhuma tab sem rota; nenhuma rota `/app` órfã de tab no inventário).

## Achados estruturais priorizados (sem runtime)

1. **Front aberto / back fechado:** `/app/outbound/*`, `/app/voice-hub`, `/app/dialer` — API **503 MODULE_NOT_READY** (`legacyModuleGate.ts`). Voice-hub/outbound chamam APIs não montadas (`/api/chat`, `/api/campaigns`, `/api/billing`…); outbound aponta `localhost:11434`. `dialer` reusa `CadenceHub`.
2. **Previsibilidade com números fixos:** Forecast, Metas, Pipeline Ponderado — sem chamada de API; valores R$ hardcoded. Forecast/Metas no menu.
3. **`/setup` → API ausente:** chama `/api/organization-modules/*` sem rota registrada (provável 404).
4. **Drift RBAC usage:** front só ADMIN; API ADMIN+GESTOR.
5. **Navegação:** Sidebar ativa alcança ≤21/54 tabs; resto via URL/Command Palette. 8× `settings_*` = `PillarSettingsPlaceholder`. Convergência 3 pilares ainda "planejada". `FuturisticSidebar` / `MacDock` / `FuturisticLayout` aparentam código morto.

## Docs desatualizados

- `documentacao-aplicacao/inventario/mapa-de-navegacao.md` — grupos Captar/Qualificar…
- Inventário visual cita `/ldr` e `/app/sdr-diagnostic-joao` (inexistentes)
- Rótulos Sidebar ≠ `tabMeta` em casos (ex. roleplay → "Gamificação")
- README ainda cita clone Marks-Mah

## Convivência

- Sem editar App.tsx, Sidebar, ui/**, styles/**, voice-hub, prisma, workflows.
- Status operacional por módulo: Agente 02.
- PR draft: aguardando Submit do formulário (Marcelo); branch pronta.

## Fora de escopo deste run

- Status ok/parcial/quebrado por módulo (runtime)
- Feature nova (freeze → handoff)
