- De: 01 — Plataforma, Segurança e Dados
- Para: 24 — Revisão
- Onda: 52
- Status: aberto
- Prioridade: alto

## Problema

O passo DATA-007 (`npm run verify:migration-drift`, não-bloqueante) da Central Birth Hub 360 Release sai com exit 2 por drift em `RebalanceApproval`
(run 40213239240, job 121228929627, step 19/20):

```
[*] Changed the `RebalanceApproval` table
  [-] Removed index on columns (organizationId, decidedAt)
  [*] Altered column `updatedAt` (changed from Required to Nullable)
```

Causa: a migration `20261020230000_rebalance_approval` (aplicada) cria `RebalanceApproval_organizationId_decidedAt_idx` e
`"updatedAt" TIMESTAMPTZ(3) NOT NULL`. O schema do PR #37 (head `f0f48673`) tinha os dois. Na integração do #37 na main
(`aa21befe6`, passo 006 da onda 0) o bloco do model chegou sem `@@index([organizationId, decidedAt])` e com
`updatedAt DateTime?`. Nenhuma intenção de remover o índice ou tornar a coluna nullable foi registrada. O índice serve ao
`rebalance_approval_purge(p_org, p_retention_days)`, que filtra por `organizationId` + `decidedAt`.

## Arquivo(s) envolvido(s)

- `prisma/schema.prisma` (model `RebalanceApproval`). É o único arquivo de código alterado.
- Nenhuma migration nova e nenhuma migration editada (checksum preservado). Não há DDL.

## Alteração necessária

O schema passa a refletir as migrations: `updatedAt DateTime @updatedAt @db.Timestamptz(3)` (NOT NULL) e `@@index([organizationId, decidedAt])`.

## Teste esperado / como reproduzir

1. Banco vazio → `bash scripts/db/bootstrap-app-role.sh <host> <port> <superuser> <db>` → `npx prisma migrate deploy`.
2. `npm run verify:migration-drift`: o resultado esperado é exit 0, "No difference detected". Com o schema da main, sai com exit 2 e mostra o diff acima.
3. `SHADOW_DATABASE_URL=<scratch> npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`: o resultado esperado é exit 0.
4. `npx prisma validate` e `npx prisma format`, que não deve alterar o arquivo.
5. `npx prisma generate && npx tsc --noEmit`: os mesmos 107 erros herdados da main, com lista idêntica e nenhum erro novo nem em RebalanceApproval.

## Riscos

- Tipo gerado: `RebalanceApproval.updatedAt` passa de `Date | null` para `Date`. Nenhum consumidor em `src` lê ou escreve `updatedAt` desse model (o `@updatedAt` é preenchido pelo client), e o tsc não muda.
- Banco: nenhum. Produção já tem o índice e o NOT NULL, criados pela migration aplicada. O CI de main continua vermelho em `Run Lint`, erro herdado que o #72 corrige, então o DATA-007 só roda no CI depois do #72.
- Observação fora de escopo: o `migration.sql` da main tem um bloco `GRANT EXECUTE ... TO prospector_app` que não existia no head do #37 (`f0f48673`). Se algum ambiente aplicou a versão do #37, o checksum diverge. Não foi alterado aqui. Vale confirmar em `_prisma_migrations` de staging/produção.

## Resolução
(preenchido pelo agente destino ao resolver)
