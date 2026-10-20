# Parecer Agente 24 — PR #28 (Agente 01) drift schema.prisma × migrations

| Campo | Valor |
|---|---|
| PR | https://github.com/MarksNN/Birthub-360/pull/28 (branch agente/01-migration-drift) |
| Tip auditado | 686a55e26057036a1eee58cc72dcc4ecdeecf4f9 (confirmado) |
| Base | merge-base e0683477; main atual 985d8586 (sem mudanças em prisma/ entre as duas) |
| Veredito | **APROVADO COM CONDIÇÕES** |
| Data | 2026-10-20 (America/Sao_Paulo) |

## Escopo
3 arquivos: migration `20261020200000_fix_schema_migration_drift/migration.sql` (nova), `prisma/schema.prisma`, `tests/unit/db/rls-coverage.test.ts`. Nenhuma migration antiga editada. Nenhum DROP/DELETE/ALTER COLUMN: só 6 `CREATE INDEX IF NOT EXISTS`, 2 `ALTER TABLE ... RENAME CONSTRAINT` e 7 `ALTER INDEX IF EXISTS ... RENAME`. Sem perda de dados, sem mexer em policy, nenhuma FK criada ou removida (as 2 FKs só trocam de nome). As mudanças no schema (gin/trgm, Attachment onDelete Cascade, default de DocumentEmbedding.updatedAt, KnowledgeChunk @@ignore, remoção dos @@index dos únicos parciais) só alinham o schema ao que as migrations já criam. Conferido no banco: Attachment_organizationId_fkey já é CASCADE (confdeltype=c) e os 6 índices gin/trgm já existem.

## Evidência (Postgres 17 local, role prospector_app: não superuser, não bypassrls)
| Verificação | main 985d8586 | PR 686a55e2 |
|---|---|---|
| `prisma migrate deploy` do zero | ok | ok (inclui a nova) |
| `npm run verify:migration-drift` | **exit 2** (68 linhas de diff) | **exit 0** "No difference detected" |
| `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code` (shadow DB superuser) | exit 2 | **exit 0** |
| RLS (relrowsecurity/relforcerowsecurity) em Activity, Lead, Contact, Note, AccountRecommendation, EconomicRelationship, AccountIntelligenceSnapshot, AccountScore, MarketIntelligenceCompany, TemporaryCapabilityGrant, KnowledgeChunk | — | t/t em todas |

## Gates (worktree novo /workspace/b24-pr28, npm ci próprio)
| Gate | Resultado |
|---|---|
| typecheck (tsc) | exit 0, 0 erros |
| biome format src / biome lint src | exit 0 / exit 0 |
| check:hotspots | exit 0 |
| vitest unit tests/unit/db/rls-coverage.test.ts | 6/6 |
| vitest integração (banco b24_pr28_test migrado): rls-bypass-allowlist, tenant-isolation-db001, knowledge-rag-tenant-isolation | 3 arquivos, 10/10 |
| CI run 39512187235 | application gate falha só em "Audit for vulnerabilities (waiver-aware)". É **herdado da main** (Release em 985d8586 também falha; causa: vite, PR #24). Não é causado pelo PR. Os outros checks passam. |

## Riscos declarados
**(a) 6 índices sem CONCURRENTLY: P3 (sobe para P2 se as tabelas forem grandes em produção).** `CREATE INDEX` comum pega lock SHARE e bloqueia INSERT/UPDATE/DELETE em Activity, Lead, Contact e Note enquanto constrói (leitura continua). O Prisma migrate roda cada migration numa transação, e `CREATE INDEX CONCURRENTLY` não roda dentro de transação. Por isso o repo não tem nenhum precedente: zero ocorrências de CONCURRENTLY em prisma/migrations. Manter sem CONCURRENTLY dentro da migration é o padrão correto. Runbook: (1) antes do `migrate deploy`, criar os 6 índices à mão com `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...`, os mesmos nomes e colunas (um por vez, fora de transação, com `statement_timeout` alto e `lock_timeout` baixo); (2) conferir `pg_index.indisvalid = true` e, se algum ficar inválido, dar DROP INDEX CONCURRENTLY e recriar; (3) rodar `migrate deploy`. Os `IF NOT EXISTS` viram no-op e os renames são instantâneos, mas pegam ACCESS EXCLUSIVE breve, então convém `lock_timeout` ou horário de baixo tráfego. Sem o passo 1, usar janela de manutenção.

**(b) Renames assumem os nomes truncados: P3.** Simulando do zero, as migrations da main geram exatamente os nomes truncados que a migration renomeia, e o deploy passou. Re-executar o SQL num banco já migrado **falha** na linha 18 (`ALTER TABLE "AccountRecommendation" RENAME CONSTRAINT`): `RENAME CONSTRAINT` não tem IF EXISTS. Num ambiente com nomes diferentes (por exemplo um criado via `db push`), o comportamento é misto: as 2 FKs abortam a migration inteira (que é transacional, então não fica nada pela metade, mas ela fica marcada como failed e exige `migrate resolve`), enquanto os 7 `ALTER INDEX IF EXISTS` passam em silêncio e deixam o drift. Recomendação (não bloqueante): envolver os 2 RENAME CONSTRAINT num `DO $$ ... IF EXISTS (select 1 from pg_constraint where conname = ...)` para ficar idempotente, e checar `verify:migration-drift` em staging antes de produção.

**(c) KnowledgeChunk @@ignore: OK, sem achado.** Ninguém usa `prisma.knowledgeChunk`. As únicas referências são SQL cru em `scripts/migrateKnowledge.ts` (`$queryRaw` com SELECT em "KnowledgeChunk"), que não é afetado, e comentários em testes e em vector.service. A tabela continua com RLS t/t. A contagem tenant-scoped vai de 129 para 130.

**(d) Conflito com o #18: P4, trivial.** `git merge-tree pr18 pr28` dá CONFLICT em prisma/schema.prisma (os dois adicionam models no fim do arquivo) e em tests/unit/db/rls-coverage.test.ts (132 contra 130). Simulei #18 seguido de #28 com resolução por união e expect **133**: `prisma validate` ok, `migrate deploy` do zero ok (20261020190000 antes de 20261020200000), `verify:migration-drift` exit 0, `migrate diff --from-migrations` exit 0, rls-coverage 6/6.

## Achados
- P1: nenhum. P2: nenhum (condicional em (a), conforme o tamanho das tabelas em produção).
- P3-1: índices sem CONCURRENTLY bloqueiam escrita; seguir o runbook (a).
- P3-2: RENAME CONSTRAINT não idempotente; falha dura se os nomes divergirem (b).
- P4-1: conflito textual com o #18; resolver com 133.

## Condições
1. Merge manual, só com o application gate verde (depende do #24/vite), por squash.
2. Ordem: **#18 primeiro, depois #28** (rebase do #28 com união no schema e expect 133; rodar de novo verify:migration-drift e rls-coverage no tip rebaseado). A ordem dos timestamps das migrations já é essa.
3. Deploy em produção seguindo o runbook (a); antes, conferir em staging se os nomes truncados existem: `select conname from pg_constraint where conname like '%_f' or conname like '%Id_';`.

## Comandos
```
gh pr view 28 --json headRefOid,files,statusCheckRollup ; git merge-base pr28 origin/main
DATABASE_URL=.../b24_pr28_{main,pr} npx prisma migrate deploy ; npm run verify:migration-drift
SHADOW_DATABASE_URL=<superuser shadow> npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
psql -1 -f .../migration.sql   # rerun -> ERROR (não idempotente)
psql: pg_class relrowsecurity/relforcerowsecurity; pg_constraint confdeltype; pg_indexes trgm
rg knowledgeChunk src server scripts tests
git merge-tree --write-tree pr18 pr28 ; merge simulado + validate/deploy/drift/rls-coverage
npm run typecheck ; npx biome format src ; npm run lint ; npm run check:hotspots
npx vitest run -c vitest.unit.config.ts tests/unit/db/rls-coverage.test.ts
npx vitest run -c vitest.integration.config.ts --no-file-parallelism <3 arquivos RLS/tenant>
gh run view 39512187235 --json jobs
```

## SHA-256 (tip 686a55e2)
```
f2eb390758950933fbb94b010ec72ad3fed7a8beb881cd0c34ef83a1730f7c99  prisma/migrations/20261020200000_fix_schema_migration_drift/migration.sql
ae8b183038b1076a6932417e6f5fd06a859c3c5f972f230b5bd9a96da6da5b48  prisma/schema.prisma
b12d79c1e966853a8d549126858cf439cf7c01a1511a41e6734b6ad55bcc39d9  tests/unit/db/rls-coverage.test.ts
```
