# Revisão independente — PR #91 @ a84d0853 — Agente 24

- **Veredito: APROVADO @ `a84d0853baf70da47672f124c7b52e44caeebbc0`** (só documentação; a decisão é aceita)
- Data: 2026-10-25 (BRT)
- Missão: revisar a decisão do Agente 01 de **não** criar modelo nem migration para os delegates `calendlyConnection`, `googleSheetsConnection`, `hubspotConnection`, `notionConnection` e `zoomConnection` (11 erros de `Run Type Check`). A correção de código volta ao Agente 06.
- Autor: Agente 01 (commits de MarksNN). PR draft, branch `agente/01-integration-models-typecheck`.
- Base: `58f1895b` (origin/main atual).
- Commits: `2ae3f51b` (decisão) e `a84d0853` (ajuste da expectativa de drift).
- Handoff: `.agents/handoffs/onda-52/01-para-24-typecheck-integrations-schema-decision.md`.
- Este veredito vale só para o SHA acima. Qualquer commit novo o invalida.

## Critérios
1. O diff tem só documentação.
2. Os 11 erros existem no tsc da main, com arquivos e códigos.
3. Os arquivos estão mortos: sem imports, sem registro de rota, sem fila ou worker.
4. A decisão não esconde funcionalidade prometida (PR ou plano do 06 que dependa dos stubs).
5. Existe caminho proposto para zerar os erros, com dono.

## Comandos executados
- `git diff --stat 58f1895b a84d0853`, `git diff --name-only origin/main pr91 | grep -v '\.md$'`
- `gh api --allow-escape-sequences repos/MarksNN/Birthub-360/actions/jobs/121247466311/logs` (push da main `58f1895b`) e `.../jobs/121249877246/logs` (gate do #91), com a extração e comparação dos erros `TS`
- `git grep` em `origin/main` sobre `src tests scripts server.ts`: imports dos 5 services, cada um dos 14 símbolos exportados, imports dinâmicos, rotas (`integrationsPing.routes.ts`), filas, workers e bootstrap
- `git grep -liE 'calendly|zoomconnection|...' origin/main -- prisma/migrations` e `git log --all -S <Modelo> -- prisma` para os 5 modelos
- `gh pr list --state all`, `git ls-remote --heads origin` e `git diff` das branches do 06 (`agente/06-bitrix-whatsapp-domain-sync`, `fix/debt-wave-05-integrations`)

## Evidências
- **Diff:** 2 arquivos `.md` em `.agents/handoffs/onda-52/`, +81/−1. Nenhum arquivo fora de `.md` (0 linhas). Não toca schema, migrations, `create-app-role.sql` nem `src/`.
- **Os 11 erros na main `58f1895b`** (job `121247466311`, run `40219355968`; total de 99 erros):
  - `calendly.service.ts` (43,35), (67,17), (77,35), (117,35), (189,35) e (203,16): TS2339 `calendlyConnection`, 6 erros.
  - `googleSheets.service.ts` (9,35): TS2339 `googleSheetsConnection`.
  - `hubspot.service.ts` (24,35): TS2339 `hubspotConnection`.
  - `notion.service.ts` (19,35): TS2551 `notionConnection`.
  - `zoom.service.ts` (38,35) e (61,35): TS2551 `zoomConnection`.
  - O gate do próprio #91 (job `121249877246`) tem lista idêntica à da main: o PR não muda o resultado do tsc.
- **Código morto:**
  - Os 14 exports têm 0 referências fora do próprio arquivo em `src`, `tests`, `scripts` e `server.ts`: `createCalendlyConnection`, `listCalendlyConnections`, `listCalendlyEventTypes`, `createCalendlyEvent`, `updateCalendlyConnection`, `deleteCalendlyConnection`, `createGoogleSheetsConnection`, `exportToSheet`, `createHubspotConnection`, `syncLeadToHubspot`, `createNotionConnection`, `createNotionPage`, `createZoomConnection` e `createZoomMeeting`.
  - Nenhum arquivo importa `*.service` desses diretórios, e nenhum import dinâmico os alcança.
  - `integrationsPing.routes.ts` importa só os providers (`../hubspot/HubspotProvider.js` e afins), não os services.
  - Não há fila, worker nem bootstrap que os referencie.
- **Funcionalidade vigente:** Calendly e Zoom aparecem para o produto via `universalConnectors.service.ts` e `universalMeetingsTool.ts`, que usam `OrganizationSetting` (`integration.calendly`). HubSpot aparece via `ExternalCrmConnection` + `HubSpotProvider`. Nada disso depende dos stubs, então a decisão não esconde funcionalidade entregue.
- **Sem DDL nem histórico:** nenhuma migration menciona essas tabelas, e `git log --all -S` deu 0 commits em `prisma/` para os 5 modelos.
- **06:** não há PR nem branch do 06 tocando esses arquivos ou o schema. O handoff `gha-para-06-typecheck-integrations.md` está `aberto`, aguardando justamente esta decisão.
- **Caminho e dono:** a resolução encaminha ao **06**, com três opções: remover os 5 services, migrar HubSpot para `ExternalCrmConnection`/`HubSpotProvider`, ou pôr as integrações atrás de flag. O critério é `npm run typecheck` sem os 11 erros, sem erros novos, sem `@ts-ignore` e sem `any`. Não propõe `exclude` no tsconfig, o que é correto, porque isso esconderia código em `src/`.
- **CI do #91:** secret scan, Dependency Review, Trivy, CodeQL e Visual Regression verdes. O application gate falha no Type Check herdado (idêntico à main), e `build` e SonarQube falham. Num PR só de docs, nenhum desses resultados é regressão causada pelo PR.

## Achados
1. **Baixo (imprecisão no texto):** o doc diz que os métodos de uso "retornam placeholders". Isso vale para hubspot, notion, zoom e googleSheets. `calendly.service.ts` faz chamadas HTTP reais (`fetch('https://api.calendly.com/event_types')` com `Bearer accessToken`). O código continua morto (0 chamadores), mas o 06 deve tratar o Calendly como integração parcial e não como placeholder puro. Também grava `accessToken` em texto puro, o que reforça o motivo de segurança. Não bloqueia.
2. **Observação:** o handoff `gha-para-01` fica `em-andamento` porque a parte de inteligência (07, 55 erros) segue aberta. Está correto.
3. Nenhum achado bloqueante. A decisão não cria dívida de schema e segue o freeze.

## Condições
- Este APROVADO cobre só a decisão documental. **Não** zera os 11 erros: o application gate só fica verde depois do PR do 06, que terá revisão própria.
- O 06 deve, de preferência, remover os 5 services mortos (opção mais simples dentro do freeze) ou adaptá-los, sem `exclude` no tsconfig, sem `@ts-ignore` e sem `any`. Se o produto quiser Calendly, Zoom, Notion ou Sheets nativos, deve abrir `06-para-01` depois do freeze.
- Opcional para o 01: corrigir a frase sobre "placeholders" para ressalvar o Calendly.
- O PR é draft. O merge depende de quem tem a decisão; a revisão do 24 não equivale a aprovação do usuário.
