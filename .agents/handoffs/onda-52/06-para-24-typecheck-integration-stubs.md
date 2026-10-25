- De: 06 — Integrações e Bitrix
- Para: 24 — Revisão Independente
- Onda: 52
- Status: aberto
- Prioridade: alto
- Bloqueador-ref: GHA-TYPECHECK-06 (run 40204212570)
- Referências: `gha-para-06-typecheck-integrations.md`, `01-para-24-typecheck-integrations-schema-decision.md` (#91, merge `791b932d`)

## Problema

`Run Type Check` falha na main. 11 dos 99 erros vêm de 5 services stub em `src/features/integrations/**`, que acessam delegates do Prisma que não existem: `calendlyConnection`, `googleSheetsConnection`, `hubspotConnection`, `notionConnection` e `zoomConnection`. O 01 decidiu no #91 que o schema está correto e que não haverá DDL (freeze). Marks decidiu **apagar** os stubs em vez de adaptá-los.

## Alteração feita

Arquivos removidos:

| Arquivo | Erros tsc | Motivo |
|---|---|---|
| `src/features/integrations/calendly/calendly.service.ts` | 6 | Modelo inexistente, 0 importadores. **Segurança:** faz chamadas HTTP reais a `https://api.calendly.com` (`/event_types` e `/scheduled_events`) e gravaria `accessToken`/`refreshToken` em texto puro. |
| `src/features/integrations/zoom/zoom.service.ts` | 2 | Modelo inexistente, 0 importadores, gravaria `apiKey`/`apiSecret` em texto puro. |
| `src/features/integrations/googleSheets/googleSheets.service.ts` | 1 | Modelo inexistente, 0 importadores, `apiKey` em texto puro, retorno placeholder. |
| `src/features/integrations/hubspot/hubspot.service.ts` | 1 | Modelo inexistente, 0 importadores, `apiKey` em texto puro, `syncLeadToHubspot` com retorno fake. |
| `src/features/integrations/notion/notion.service.ts` | 1 | Modelo inexistente, 0 importadores, `apiKey` em texto puro, retorno placeholder. |

Ficou **intacto**: `src/features/integrations/hubspot/HubspotProvider.ts`, que é o HubSpot real sobre `ExternalCrmConnection` com `config` cifrada e é usado por `shared/ExternalCrmService.ts` e `routes/integrationsPing.routes.ts`. Também ficaram intactos o catálogo e as configurações de Calendly e Zoom via `organizationSetting` (`integration.calendly`) em `intelligence/tools/universalMeetingsTool.ts` e `universalConnectors.service.ts`, que não importavam os stubs.

Doc: `docs/migration/INTEGRACOES_E_VARIAVEIS.md` deixou de apontar para `hubspot.service.ts` e passou a apontar para `HubspotProvider.ts`.

Não há schema, migration, `@ts-ignore` nem `any`.

## Interação com o PR #72

O #72 (já mergeado na main, `ef40a9e`) corrigiu `calendly.service.ts:166/172` (`connectionId` → `params.connectionId`). Este PR **apaga o arquivo inteiro** e, com isso, substitui aquela correção. Não há conflito de merge, porque a branch saiu da main já com o #72 e o #91. A correção do #72 simplesmente deixa de existir junto com o arquivo.

## Evidência

- Busca de importadores: `rg -w` pelas 14 funções exportadas (`createCalendlyConnection`, `listCalendlyConnections`, `listCalendlyEventTypes`, `createCalendlyEvent`, `updateCalendlyConnection`, `deleteCalendlyConnection`, `createZoomConnection`, `createZoomMeeting`, `createGoogleSheetsConnection`, `exportToSheet`, `createHubspotConnection`, `syncLeadToHubspot`, `createNotionConnection`, `createNotionPage`) e pelos paths `integrations/(calendly|googleSheets|hubspot|notion|zoom)` em `src/`, `tests/`, `server.ts`, `worker*.ts`, routes, registries e frontend. Resultado: **0 referências** fora dos próprios arquivos. As únicas referências ao diretório `hubspot/` são do `HubspotProvider.ts`, que foi mantido.
- `npm run typecheck` (Node 20.19.2, `npm ci` + `prisma generate`):
  - main `791b932d`: **99** erros, 11 deles nos 5 arquivos acima;
  - esta branch: **88** erros (−11). O `diff` dos 88 restantes contra a baseline, sem os 11, é **idêntico linha a linha**, ou seja, há 0 erros novos.
- `npm run lint` (biome): 0 erros. Os warnings e infos são os pré-existentes.
- `vitest run -c vitest.unit.config.ts tests/unit/features/integrations src/features/integrations`: 55 arquivos e 586 testes passando, incluindo `ExternalCrmProviders.test.ts` e `integrationsPing.routes.test.ts`.
- `lint:architecture` (depcruise) não rodou localmente porque exige Node ≥ 22. Fica para o CI.

## Teste esperado (24)

1. `npm run typecheck`: sem nenhum erro em `src/features/integrations/**` e com o total da main menos 11.
2. `rg -n "calendlyConnection|zoomConnection|notionConnection|googleSheetsConnection|hubspotConnection" src tests` não retorna nada.
3. Os testes unitários de integrações passam.

## Contexto adicional

Se o produto quiser mesmo Calendly, Zoom, Sheets ou Notion nativos, o 06 abre `06-para-01` depois do freeze. O 01 cria então os modelos com RLS e `piiFields`, ou as integrações passam a usar `ExternalCrmConnection`/`organizationSetting` com config cifrada.

## Resolução
(preenchido pelo agente destino ao resolver)
