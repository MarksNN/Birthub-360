# Run 07 — Copiloto IA = alias Elite Agent

- Data: 2026-10-10 (America/Sao_Paulo)
- Branch: `agente/07-copiloto-alias-elite`
- Gatilho: Coordenador 00 — P0 #693 item 7 (com 02)
- FYI: #691 NBA falso sucesso já no domínio intelligence

## Inventário

| Superfície | Fato |
|---|---|
| `/app/intelligence/elite-agent` | `EliteCommercialAgentWorkspace` |
| `/app/copiloto_ia` | **mesmo** componente (alias) |
| tabMeta `copiloto_ia` | label "Copiloto IA" |
| Sidebar | "Copilot" → tab `copiloto_ia` |
| `CopilotoIaHub` | existe; **não** roteado na nav |
| `/api/copiloto-ia` | módulo conversas/captura (07) |

## Decisão aplicada

Produto (00): alias do Elite Agent; sem falso hub separado.
07: documenta verdade em BRAIN_TRUTH_MAP BT-020 + AGENTS.md intelligence/copiloto-ia; handoff 07→02 para rótulos/redirect (App/Sidebar = 02).

## Fora de escopo

- Remontar `CopilotoIaHub` na nav
- Editar App.tsx / Sidebar / tabMeta (02)
- Alterar #691

## Entrega

- Handoff: `.agents/handoffs/mapa-modulos-20261010/07-para-02-copiloto-alias-elite.md`
- Docs: BT-020 + notas AGENTS
