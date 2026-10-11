# Handoff pack — P0 do mapa de módulos (#693)

De: Cartógrafo + Agente 02 (inventário)
Para: Marks Orquestrador (distribuição) → donos por linha
Onda: mapa-modulos
Status: resolvido
Prioridade: bloqueador (honestidade de produto / nav)
Sprint destino: pós-merge #693

## Problema

O inventário em `docs/product/MAPA-MODULOS.md` marca módulos **mock/quebrados** ainda alcançáveis (Sidebar/URL). O PR #693 só documenta; a correção de produto fica nestes handoffs.

## Matriz

Ver seção **P0 — backlog distribuível** em `docs/product/MAPA-MODULOS.md`.

## Evidência

- Runs: `.agents/runs/02-mapa-modulos-20261010.md`, `.agents/runs/cartografo-mapa-modulos-20261010.md`
- PR: https://github.com/MaarkssN/Birthub-360/pull/693

## Alteração necessária (por dono)

1. **02** — settings_* falso-save; previsibilidade hardcoded; sales-orchestration seed
2. **05** — outbound 503/nav; prospect/inteligente + MI hub mocks
3. **12** — dialer alias + voice-hub 503/nav
4. **07** — copiloto_ia vs feature copiloto-ia
5. **01/16** — `/api/organization-modules` + `/setup`

## Teste esperado

- Item não aparece como “pronto” na nav se backend 503/mock
- Sem toast “salvo” sem persistência
- Setup não chama API inexistente silenciosamente

## Contexto adicional

Freeze: feature nova só via handoff. Não editar App/Sidebar neste pack sem coordenação 02↔03.

## Resolução — Entregas Agente 02 (2026-10-10 / 2026-10-11)

1. **Item 1 (settings_* falso-save): RESOLVIDO (PR #698 / commit 273af004)**
   - `PillarSettingsPlaceholder.tsx`: falso-save e toast removidos; botão desabilitado como "Salvar indisponível" com tooltip/aria-label `SAVE_UNAVAILABLE_MSG`; banner explicativo de pré-visualização; "100% Operacional" alterado para "Configuração não persistida".

2. **Item 2 (Previsibilidade hardcoded): RESOLVIDO (PRs #697 e #698 / commits 4c3bb13a, 43007e2b, c98914db)**
   - `ForecastHub.tsx`, `MetasHub.tsx` e `PipelinePonderadoHub.tsx` foram conectados ao `predictabilityApi` com o hook `usePredictabilityOverview`.
   - Eliminados todos os R$ hardcoded inventados; estados explícitos de `loading`, `error`, `noRealData`, `partial` e empty states adicionados via `PredictabilityStatusBanner`.

3. **Item 3 (Orquestração de vendas — seed e métricas fabricadas): RESOLVIDO (PRs #696 e #698 / commits 79e8ecdf, 84ff40ce, e06ebcf0)**
   - `SalesOrchestrationService.ts`: métricas sintéticas (`complianceRate: 88 + idx%10`, `aderenciaPlaybook: 88.4`) e playbooks seed removidos; quando vazio retorna lista vazia e `meta.source = 'none'`.
   - `PlaybooksHub.tsx`, `JornadasComerciaisHub.tsx`, `ProcessosVendasHub.tsx`, `RoteirosHub.tsx`: hubs agora consom `orchestrationApi` real via `useOrchestrationOverview` com badge `Sem dados` quando `meta.source === 'none'`, métricas `null` exibidas como "Indisponível", e empty states reais.

4. **Item 4 (Prospecção Inteligente / MI hubs sem listas fictícias): RESOLVIDO (commit 35358e58)**
   - Hubs de MI e Prospecção limpos de listas e candidatos sintéticos, adotando estados honestos de carregamento, erro e vazio com dados da API real.

5. **Item 5 (Outbound/Dialer/Voice Hub 503 e redirecionamentos): RESOLVIDO (PRs #709, #715, #717 / commits bd53c08f, 1ca89213, d118ae63)**
   - Redirecionamento `/app/dialer` → `/app/cadence` implementado e rotas 503 ocultadas/gated honestamente.
   - `Results.tsx` do Voice Hub agora trata estados explícitos de `MODULE_NOT_READY` e 503 sem fabricar chamadas ou métricas fictícias.
