# Run — Cartógrafo de Produto · Mapa de Módulos · 2026-10-10

- **Agente:** Cartógrafo de Produto (braço de inventário), em par com o Agente 02 (43d81b6c), sob coordenação do 00 (a15cb526); auditoria do 24.
- **Escopo:** inventário somente leitura das rotas/páginas/módulos. Nenhum código foi alterado, nenhum push feito.
- **Snapshot:** `MaarkssN/Birthub-360@main` = `33edc320f0e60394ac56994bc6f47e1eb48bdd3d` (2026-10-10 00:13 BRT, "Merge … agente/24-auditoria-handoffs-20261009"). Clone raso e anônimo (`git clone --depth 1`) em `/workspace/birthub` no box.
- **Confirmação do remoto:** a API do GitHub responde `Moved Permanently` para `Marks-Mah/Birthub-360` e `https://github.com/Marks-Mah/Birthub-360` → `301` para `MaarkssN/Birthub-360`. `git ls-remote` traz o mesmo HEAD nos dois nomes. Conclusão: o repo é **um só**; o canônico é MaarkssN (público, não é fork, default `main`). `Marks-Mah/BIRTHUB-360-INNOVATION` é outro repo e ficou fora do escopo.

## Método
1. Li as fontes de produto: PLAN-V4 `03-PRODUCT-SURFACE-MAP.md` e `04-THREE-PILLARS-NAVIGATION-CONVERGENCE.md`, `VISUAL_ARCHITECTURE_INVENTORY.md`, `documentacao-aplicacao/inventario/mapa-de-navegacao.md` e o `README.md`.
2. Extraí as rotas reais de `src/App.tsx`, separando as top-level das aninhadas em `/app/*`, e associei cada uma ao componente lazy e ao arquivo.
3. Fiz o cruzamento automático `TabType` (tabMeta.ts) ↔ rotas do App.tsx ↔ `TAB_ROUTE_SET` (navigationBus.ts). Paridade total: 54 tabs, nenhuma órfã.
4. Comparei a Sidebar ativa (`MainLayout` → `Sidebar.tsx` → `sidebarSections.ts`) com os layouts alternativos (`FuturisticSidebar`/`MacDock`).
5. Mapeei o backend pelos `app.use('/api/...')` em `src/bootstrap/routes.ts`, `auth.ts`, `webhooks.ts` e `rateLimiters.ts`, incluindo `legacyModuleGate.ts` (que devolve 503).
6. Levantei sinais por feature: chamadas `/api` no código do front, valores hardcoded, nomes `*Placeholder*`, contagem de arquivos e LOC, testes que referenciam a feature e referências de rota nas specs e2e.
7. Não executei nada em runtime: não subi o app nem rodei testes. Por isso todo status operacional ficou "não verificado" ou `(02 preenche)`.

## Contagem
- 54 TabTypes · 59 rotas sob `/app/*` · 16 rotas top-level (incluindo catch-alls e redirects) · 49 pastas em `src/features/`.
- 88 mounts `app.use('/api…')` em `src/` + `server.ts`.

## Entregáveis
- `docs/product/MAPA-MODULOS.md`: índice por pilar e tabelas no formato Tab | Rota | Feature | Componente | Evidência, com propósito/status/melhorias marcados `(02 preenche)`.
- `birthhub-mapa-modulos.md` (raiz do workspace, fora do repo): relatório estendido com status **preliminar** baseado só em evidência estática e o mapa priorizado. Serve de insumo ao 02, não é documento canônico.

## Riscos de colisão evitados
- Zero edição em `src/App.tsx`, `Sidebar.tsx`/`sidebarSections.ts`/`tabMeta.ts` (pertencem ao Agente 02), `src/components/ui/**`, `src/styles/**`, `src/features/voice-hub/**`, `prisma/**` e `.github/workflows/**`.
- Os arquivos novos ficam em `docs/product/` (pasta já existente, com `PRODUCT_PILLARS.md` e `LANDING_CONTENT_OFFICIAL.md`) e em `.agents/runs/`. Nenhum arquivo existente foi sobrescrito.
- Nada foi commitado ou enviado. Os arquivos estão em `/workspace/docs/...` e `/workspace/.agents/...`, prontos para o 02/00 levarem a uma branch de PR contra `MaarkssN/Birthub-360`.
- Os achados que pedem correção de código foram registrados como divergência/evidência. Nenhum foi corrigido aqui, porque os donos são outros agentes.

## Achados que pedem dono
| Achado | Evidência | Dono provável |
|---|---|---|
| `/app/outbound/*`, `/app/voice-hub` e `/app/dialer` têm rota de front ativa, mas o backend devolve **503 MODULE_NOT_READY** | `src/bootstrap/legacyModuleGate.ts`, `routes.ts` L196-203 | 00 decide (esconder ou aposentar rota) / voice-hub owner |
| `/setup` (SetupWizard) chama `/api/organization-modules/*` e nenhum mount foi encontrado | `rg organization-modules` fora de features/onboarding = 0 | backend |
| Forecast, Metas e Pipeline Ponderado usam **valores R$ hardcoded**, sem API, e Forecast/Metas aparecem na Sidebar | `src/features/predictability/components/*.tsx` | 02 |
| 8 rotas `settings_*` renderizam `PillarSettingsPlaceholder` | App.tsx L474-505 | 02 |
| `/app/usage`: front permite só ADMIN e back permite ADMIN+GESTOR | App.tsx L441-448 × routes.ts L181-188 | 02 + segurança |
| Doc de navegação (26/08) e inventário visual desatualizados | ver MAPA-MODULOS §Divergências | 02 / docs |
| Layout alternativo (Futuristic/MacDock) aparentemente morto | sem import a partir de MainLayout/App | 02 / 03 |

## Bloqueios
- O `gh` CLI não está autenticado no box e o `cursor-github` dá `scm_not_connected`. Não afetou o trabalho: o repo é público e a leitura foi feita por clone anônimo.
- Nenhuma verificação em runtime (app, banco e testes não executados).
