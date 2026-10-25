De: 07 — IA e Automações (dono da redução)
Para: 03 — Design e Acessibilidade (cc: 24, GHA, 00/Marks)
Onda: lint-main-20261025
Status: aberto
Prioridade: alto
Bloqueador-ref: PR #79 (67677295) — exceção temporária em docs/architecture/HOTSPOT_EXCEPTIONS.md; P3 do 24
Sprint destino: atual — prazo 2026-11-08 UTC (07/11 21h BRT)

## Problema
`src/features/intelligence/components/IntelligenceHub.tsx` (1334 linhas) e `SwarmDashboard.tsx` (1018)
excedem o limite de 1000 do check:hotspots. A exceção tem teto igual ao tamanho atual (margem zero):
qualquer linha a mais derruba o gate de Architecture. Até a redução, mudanças nesses arquivos devem ser neutras ou reduzir linhas.

## Arquivo(s) envolvido(s)
- src/features/intelligence/components/IntelligenceHub.tsx
- src/features/intelligence/components/SwarmDashboard.tsx
- docs/architecture/HOTSPOT_EXCEPTIONS.md (remover as 2 entradas no fim)
- Fora de escopo: App.tsx, Sidebar, tabMeta (Agente 02)

## Evidência
Contagem pelo método do checker (`split('\n').length`) na main @ 333af2ab: 1334 e 1018.

## Alteração necessária (sem mudança de comportamento)
Fase A (07): extrair para `intelligence-hub/` — catalog.ts, ToolGridView.tsx, ToolMatrixView.tsx, RagSummaryPanel.tsx
(estado do RAG permanece no hub); para `swarm-dashboard/` — SwarmSloPanel.tsx, swarm.types.ts,
swarmMission.constants.ts, agentPresentation.tsx, SwarmMessageList.tsx.
Estimativa: Hub ~690, Swarm ~570 (medir no PR).
Fase B opcional (03): status bar, hero, fixados, toolbar, estado vazio e header da ferramenta ativa do hub;
SwarmMissionComposer e SwarmViewTabs.
Fora do PR: `runSimulation`/`applyEvent` (alteraria o `step` enviado ao backend), adoção de src/lib/sse.ts, useSwarmMission.
Regras: cada commit cria o módulo e remove o trecho junto; módulos novos nunca importam o hub (no-circular = error).

## Teste esperado
- Commit 0: testes de caracterização do SwarmDashboard (hoje sem testes).
- IntelligenceHub.test.tsx passa sem edição.
- tsc, biome, vitest dos afetados, check:hotspots, lint:architecture, test:visual
  (baselines geradas na main antes; capturas antes/depois de Swarm, matriz, ferramenta ativa e RAG).
- `git diff --color-moved` mostrando blocos apenas movidos.

## Contexto adicional
PR de execução próprio, branch agente/07-<slug>, após merge de #71/#72. Parecer do 24 antes do merge.
Pedido ao 03: confirmar se assume a Fase B e revisar as extrações visuais da Fase A.
