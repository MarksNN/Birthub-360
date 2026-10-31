- De: 01 — Plataforma, Segurança e Dados
- Para: 24 — Revisão Independente
- Onda: 52
- Status: resolvido
- Prioridade: normal

## Problema

Revisar a decisão do 01 sobre os 11 erros de `Run Type Check` da parte de integrações, registrados em `gha-para-01-typecheck-schema-prisma.md`. São os delegates `calendlyConnection`, `googleSheetsConnection`, `hubspotConnection`, `notionConnection` e `zoomConnection`, ausentes no Prisma Client.

**Decisão: o schema está correto. Não há modelo nem migration novos. A correção de código volta ao 06.** Este PR é só de documentação: não altera `prisma/schema.prisma`, `prisma/migrations/`, `scripts/db/create-app-role.sql` nem `src/`.

## Arquivo(s) envolvido(s)

- `.agents/handoffs/onda-52/gha-para-01-typecheck-schema-prisma.md`: `Status: em-andamento` e seção `## Resolução` (só a parte de integrações; a parte de inteligência, do 07, segue aberta).
- `.agents/handoffs/onda-52/01-para-24-typecheck-integrations-schema-decision.md`: este arquivo.
- Código afetado, sem alteração neste PR: `src/features/integrations/{calendly,googleSheets,hubspot,notion,zoom}/*.service.ts`.

## Alteração necessária

O 24 deve conferir quatro pontos:

1. **Nenhuma migration cria essas tabelas:**
   `grep -rliE 'calendly|zoomconnection|notionconnection|googlesheetsconnection|hubspotconnection' prisma/migrations` não retorna nada.
2. **Os modelos nunca existiram no schema:**
   `git log --all -S CalendlyConnection -- prisma` e o mesmo para `ZoomConnection` não retornam nada.
3. **O código é morto:** as 14 funções exportadas pelos 5 services têm 0 referências fora do próprio arquivo, e os métodos de uso retornam placeholders.
4. **Freeze:** criar 5 tabelas é feature nova. Os stubs ainda gravariam `apiKey` e `apiSecret` em texto puro, o que contraria o contrato de credenciais. O caminho vigente é `ExternalCrmConnection`, com config cifrada, mais `HubSpotProvider`.

## Teste esperado

- `npx prisma validate` passa.
- `npm run verify:migration-drift` dá o mesmo resultado da main `58f1895b` porque este PR não muda o schema. Hoje a saída é exit 2, só pelo DATA-007 do `RebalanceApproval`, que o #88 corrige. Nenhuma diferença envolve as tabelas de integração.
- O `npm run typecheck` na main `58f1895b` mantém os mesmos 99 erros: a lista local bate com a do job `121247466311` da run `40219355968`.
- Os 11 erros só saem depois do PR do 06. O critério do 06 é `npm run typecheck` sem os 11 erros e sem erros novos, sem `@ts-ignore` e sem `any`.

## Contexto adicional

- Os services entraram nestes commits: `58e9fd87` (hubspot, 2026-10-08), `dfe7517c` (calendly, 2026-10-23), `20eed2c8` (googleSheets e notion, 2026-10-23) e `d9ea7a3a` (zoom, 2026-10-23). Não houve handoff ao 01.
- Se o produto quiser mesmo essas integrações, o 06 abre `06-para-01` depois do freeze. O 01 então cria os modelos com `organizationId`, RLS FORCE com isolamento por tenant, DML pelo regime do `create-app-role.sql` e `piiFields` para os tokens.

## Resolução
(preenchido pelo agente destino ao resolver)
