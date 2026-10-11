- De: 01 (Dados / Prisma)
- Para: 08 (QA Release / Git / CI)
- Onda: saneamento-onda-3 (follow-up de DATA-002 / DATA-007)
- Status: aberto
- Prioridade: alto

## Problema

O gate de deriva schema↔migration **ainda não é bloqueante** no CI.

Estado atual em `origin/main` (`.github/workflows/ci.yml`, job `build-and-test`):

- Passo: `Verificar deriva de schema/migration (DATA-007, não-bloqueante)`
- Comando: `npm run verify:migration-drift`
  (`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`)
- Flag: `continue-on-error: true`

Ou seja: o check **roda e aparece no log**, mas **não falha o application gate**. Drift novo pode
passar silenciosamente — a mesma classe de falha que produziu DATA-007 (#578).

A onda 3 documental (#471) e a reaplicação NOT NULL (#578) já fecharam o trabalho de schema; o
que falta é pipeline. Por isso este handoff é **01 → 08**.

## Arquivo(s) envolvido(s)

- `.github/workflows/ci.yml` — passo `verify:migration-drift` (hoje `continue-on-error: true`)
- `package.json` — script `verify:migration-drift` (já existe; não precisa reinventar)
- `prisma/schema.prisma` + `prisma/migrations/**` — dívida estrutural que impede flip bloqueante
  (índices renomeados por truncamento de 63 bytes do Postgres; `KnowledgeChunk` ainda no schema
  após migration de remoção; outros diffs pré-existentes — ver comentário no próprio passo do CI
  e o corpo do PR #578)

## Alteração necessária

1. **Inventário do drift atual**: rodar `npm run verify:migration-drift` (local ou CI log) e
   classificar o que é dívida estrutural legítima vs. drift real a corrigir.
2. **Limpeza coordenada com 01** (se o inventário apontar schema/migration):
   - 01 gera migration(ões) ou alinha schema para zerar o diff;
   - branch sugerida para a parte Prisma: `agente/01-migration-drift-cleanup` (sem main).
3. **Flip do gate** (ownership 08): remover `continue-on-error: true` do passo em `ci.yml`
   **somente depois** do diff estar limpo em main — senão todo PR quebra.
4. Opcional (08): se a limpeza for grande, manter o passo não-bloqueante mas falhar só em
   *novos* diffs (ex.: baseline conhecida / allowlist) — só com ok do 00.

## Teste esperado

- Em PR de teste: alterar `schema.prisma` sem migration → CI **vermelho** no passo de drift.
- Em main limpa: `npm run verify:migration-drift` exit 0; passo do CI sem `continue-on-error`.
- `npx prisma migrate deploy` contra banco descartável continua passando (não regressar DATA-002).

## Contexto adicional

- Fonte: handoff `00-para-patricia-relatorio-onda-3.md` (agora **resolvido**; 24 aprovou documental).
- PRs de referência da onda: #471 (docs DATA-002/003/DOCBRAND-013), #578 (NOT NULL + nota explícita
  de que o gate bloqueante ficou de fora), #589 (brand).
- Coordenador 00 (2026-10-10): "Gate CI migrate diff ainda ausente — handoff 01→08 se for pipeline."
- 01 **não** edita `.github/workflows/` nesta entrega; só abre o contrato para 08.

## Resolução

(preenchido pelo Agente 08 ao resolver)
