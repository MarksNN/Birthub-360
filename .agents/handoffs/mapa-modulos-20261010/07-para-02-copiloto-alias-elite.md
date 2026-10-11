De: 07 — IA e Automações
Para: 02 — Produto e UX
Onda: mapa-modulos-20261010
Status: resolvido
Prioridade: alto
Bloqueador-ref: P0 #693 item 7 (Coordenador 00)
Sprint destino: onda atual

## Problema

A tab `copiloto_ia` e o item de nav "Copilot" / rótulo tabMeta "Copiloto IA" sugerem um hub separado, mas `App.tsx` monta `EliteCommercialAgentWorkspace` em `/app/copiloto_ia` e em `/app/intelligence/elite-agent`. Existe `CopilotoIaHub` + `/api/copiloto-ia` sem rota de nav — risco de **falso recurso**.

Decisão do Coordenador 00: **Copiloto IA é alias do Elite Agent** — alinhar rótulo, rota e expectativa; sem hub separado falso. Não reapontar a tab para `CopilotoIaHub` sem nova decisão.

## Arquivo(s) envolvido(s)

Propriedade 02:
- `src/App.tsx` (rotas `copiloto_ia` / `intelligence/elite-agent`)
- `src/components/layout/tabMeta.ts` (`copiloto_ia: { label: 'Copiloto IA' }`)
- `src/components/layout/sidebarSections.ts` (item `Copilot` → `primaryTab: copiloto_ia`)
- `src/components/layout/MacDock.tsx`, `FuturisticSidebar.tsx`
- `src/components/ui/CommandPalette.tsx`, `ModuleAgentWidget.tsx`

Referência 07 (já documentado nesta entrega):
- `docs/architecture/BRAIN_TRUTH_MAP.md` (BT-020)
- `src/features/intelligence/AGENTS.md`
- `src/features/copiloto-ia/AGENTS.md`

## Evidência

- `App.tsx`: ambas as rotas → `EliteCommercialAgentWorkspace`
- MAPA-MODULOS (#693 / Cartógrafo) linha 27: alias; P0 produto
- UI Elite: título "Copiloto Comercial de Elite"

## Alteração necessária

1. Unificar rótulos nav/tabMeta/dock/palette com o nome canônico do Elite (ex.: "Copiloto Comercial de Elite" ou o label que 02 padronizar com o topbar "Assistente de Vendas" — um só contrato de expectativa).
2. Opcional: `Navigate` de `/app/copiloto_ia` → `/app/intelligence/elite-agent` (canônico), mantendo alias só se RBAC `canAccessCopilotoIa` exigir path estável.
3. **Não** montar `CopilotoIaHub` na tab `copiloto_ia` sem decisão explícita 00.

## Teste esperado

- Clicar "Copilot"/tab `copiloto_ia` abre o mesmo workspace Elite; rótulo não promete hub de conversas.
- Deep link `/app/copiloto_ia` continua acessível (redirect ou mesmo componente).
- Smoke visual: Sidebar + Command Palette + MacDock.

## Contexto adicional

Branch 07: `agente/07-copiloto-alias-elite`. Handoff de nav é bloqueador de UX; código de inteligência/docs já alinhados nesta PR.

## Resolução (2026-10-10)

Agente 02 montou `CopilotoIaHub` em `/app/copiloto_ia` na branch `agente/02-p0-falso-salvo-setup-copiloto` (Elite só em `intelligence/elite-agent`).
Marks Orquestrador priorizou **módulo completo na nav** — supersede a hipótese de alias Elite.
07 confirmou OK ao 02 e atualizou BT-020/AGENTS.
Residuais para 02: label Sidebar "Copilot"→"Copiloto IA"; `RequireRole` na rota.
