De: gha — Agente de CI/GitHub Actions (workflows sob 08 — QA e Release)
Para: 06 — Integrações
Onda: 52
Status: aberto
Prioridade: alto
Bloqueador-ref: GHA-TYPECHECK-06 (run 40204212570)
Sprint destino: desbloqueio do application gate (`Run Type Check`) após #67 → #71 → #72

## Problema

`Run Type Check` falha no application gate (herdado da main). Os serviços de integração acessam delegates do Prisma Client que não existem no schema atual: `calendlyConnection`, `googleSheetsConnection`, `hubspotConnection`, `notionConnection` e `zoomConnection`. A decisão entre modelo + migration e correção de código é do 01 (`gha-para-01-typecheck-schema-prisma.md`). Se o 01 decidir que o schema está correto, a correção do código é do 06.

## Arquivo(s) envolvido(s)

- `src/features/integrations/calendly/calendly.service.ts`
- `src/features/integrations/googleSheets/googleSheets.service.ts`
- `src/features/integrations/hubspot/hubspot.service.ts`
- `src/features/integrations/notion/notion.service.ts`
- `src/features/integrations/zoom/zoom.service.ts`

## Evidência

- Run de validação combinada `40204212570` (Central Birth Hub 360 Release, branch `agente/gha-validate-67-71-72-v2`, head `def647989e60b922b5fec2c12ab29e48e3f93a73` = main `6d63eb39` + #67 + #71 + #72), job `121201704278` (application gate): `audit`, `prisma generate`, `lint`, `format` e `clean-tree` verdes; **`Run Type Check` (`npm run typecheck` = `tsc --noEmit`) falha** com 99 erros únicos em 38 arquivos. https://github.com/MarksNN/Birthub-360/actions/runs/40204212570
- Reprodução local com o mesmo comando e o mesmo Node do CI (v22.23.3, `npm ci` + `npx prisma generate` + `npm run typecheck`):
  - main pura `6d63eb39`: **107** erros únicos (42 arquivos);
  - validação `def64798`: **99** erros únicos (38 arquivos), lista idêntica à do job de CI;
  - comparação por arquivo+código+mensagem (ignorando linha/coluna deslocada pela formatação): **0 erros novos**; 8 erros da main somem com o #72 (`WhatsAppIcon`, `calendly connectionId`, `supervisor sessionId`, `chat-model logger`).
  - Os 99 restantes são **herdados da main** (nenhum introduzido por #67/#71/#72). Arquivos criados nos commits `20eed2c8`, `cdea0bc9`, `d9ea7a3a`, `0c4fe2fd`, `dfe7517c` e `58e9fd87`.
- Formato das linhas abaixo: `arquivo:linha:coluna` na main `6d63eb39` e, entre colchetes, a posição equivalente após #71/#72 (validação `def64798`).

```
src/features/integrations/calendly/calendly.service.ts:43:35  [pós #71/#72: :43:35]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:67:17  [pós #71/#72: :67:17]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:79:35  [pós #71/#72: :77:35]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:119:35  [pós #71/#72: :117:35]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:188:35  [pós #71/#72: :189:35]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:202:16  [pós #71/#72: :203:16]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/googleSheets/googleSheets.service.ts:9:35  [pós #71/#72: :9:35]  TS2339 Property 'googleSheetsConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/hubspot/hubspot.service.ts:24:35  [pós #71/#72: :24:35]  TS2339 Property 'hubspotConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/notion/notion.service.ts:19:35  [pós #71/#72: :19:35]  TS2551 Property 'notionConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'. Did you mean 'omieConnection'?
src/features/integrations/zoom/zoom.service.ts:38:35  [pós #71/#72: :38:35]  TS2551 Property 'zoomConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'. Did you mean 'omieConnection'?
src/features/integrations/zoom/zoom.service.ts:61:35  [pós #71/#72: :61:35]  TS2551 Property 'zoomConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'. Did you mean 'omieConnection'?
```

Já fechados pelo #72 (sem ação do 06): `calendly.service.ts:166:9` e `:172:32` TS18004 `connectionId`, corrigidos para `params.connectionId`.

## Alteração necessária

1. Aguardar a decisão do 01 por modelo.
2. Se não houver migration, adaptar os serviços para persistência existente, por exemplo o padrão de `omieConnection` ou uma tabela genérica de conexões, ou desativar a integração atrás de flag.
3. Sem `@ts-ignore` e sem `any`.

## Teste esperado

- `npm run typecheck` sem os 11 erros acima e sem erros novos.
- Testes unitários das integrações afetadas.

## Contexto adicional

O nome sugerido pelo próprio tsc (`Did you mean 'omieConnection'?`) mostra que só a conexão Omie tem modelo no schema.
