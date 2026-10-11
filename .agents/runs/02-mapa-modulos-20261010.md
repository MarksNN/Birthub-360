# Run — Agente 02 (Produto & UX) — mapa de módulos, colunas produto/UX

- **Data:** 2026-10-10 (BRT)
- **Agente:** 02 — Produto e UX (missão de inventário via Juni / Coordenador 00)
- **Repo:** MaarkssN/Birthub-360 (`Marks-Mah/Birthub-360` resolve para o mesmo repo; mesmo HEAD `33edc32`)
- **Branch:** `agente/02-mapa-modulos`, sobre `9643ef8` (esqueleto do Cartógrafo)
- **Mapa:** [`docs/product/MAPA-MODULOS.md`](../../docs/product/MAPA-MODULOS.md)

## Escopo

- Preencher Propósito / Status (`ok`/`parcial`/`mock`/`quebrado`) / Melhorias (P0/P1/P2) nas 75 linhas do índice do Cartógrafo (59 rotas `/app/*` + 16 fora de `/app`).
- Acrescentar seção “Leitura de produto/UX (Agente 02)”: legenda, contagem, P0 consolidados, posição sobre achados do Cartógrafo, status das features sem rota.
- **Não** editado: `src/**` (App.tsx, Sidebar, `components/ui/**`, `styles/**`), voice-hub, prisma, run do Cartógrafo, colunas estruturais.

## Método (verificação estática, sem runtime)

1. `src/App.tsx` → componente de cada rota; leitura do componente (imports de `*.api.ts`, `api.get/post`, hooks).
2. Prefixos `/api/*` usados no frontend × mounts em `src/bootstrap/routes.ts` + `legacyModuleGate.ts` (script `rg` comparando listas).
3. Busca de dados fixos (`R$` literal, arrays de demo, `Placeholder`, `STUB`, `TODO`) e de rotas/feature órfãs (imports externos = 0).
4. AGENTS.md de cada feature (dono/escopo) e testes em `tests/e2e`.

## Resultado

| | `/app/*` | fora de `/app` | Total |
|---|---|---|---|
| ok | 28 | 12 | 40 |
| parcial | 11 | 3 | 14 |
| mock | 17 | 0 | 17 |
| quebrado | 3 | 1 | 4 |

## Gaps principais (P0)

1. `settings_*` (8): “salvo com sucesso” sem persistir — `PillarSettingsPlaceholder.tsx:79-81`.
2. `forecast`/`metas`/`pipeline_ponderado`: R$ hardcoded, sem API, expostos na Sidebar.
3. `sales-orchestration` (4 telas): seed + métricas fabricadas em `SalesOrchestrationService.ts`.
4. `market-intelligence/hub` e `prospect/inteligente`: listas fictícias hardcoded.
5. `/setup`: `/api/organization-modules/*` sem mount; `useOrganizationModules` stub.
6. `outbound`, `dialer`, `voice-hub`: rotas abertas com backend 503 / alias.
7. `copiloto_ia` → Elite Agent; feature `copiloto-ia` sem tela.

## Limitações

- Nenhuma execução (app, testes, e2e) nesta rodada; `ok` = fiação verificada no código.
- `mobile` e workers (`worker-*.ts`) não avaliados.
- Status de integrações reais (Bitrix, Google, WhatsApp) depende de credenciais — não testado.

## Próximos passos

- 24 audita. Coordenador 00 distribui P0 aos donos (02: settings/predictability/orquestração UX; 05: outbound/prospect; 12: dialer/voice-hub; 07: copiloto-ia; 01/16: organization-modules).
- Atualizar/arquivar `documentacao-aplicacao/inventario/mapa-de-navegacao.md` e `VISUAL_ARCHITECTURE_INVENTORY.md` apontando para este mapa.
