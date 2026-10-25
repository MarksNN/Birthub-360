# Parecer 24: PR #88 (draft): DATA-007, drift do RebalanceApproval @ eb3f108c

- **PR:** #88 (draft), autor Agente 01, branch `agente/01-rebalance-approval-drift` → `main`
- **Head auditado:** `eb3f108cbed7ae92079363a29676c0f674b692e5` (1 commit sobre a main)
- **Base:** merge-base = origin/main `4e9b9f979e31011b287d59bbe5700355df237cc6`, MERGEABLE
- **Missão:** alinhar `prisma/schema.prisma` (model `RebalanceApproval`) à migration aplicada `20261020230000_rebalance_approval` para zerar o drift do DATA-007, que deu exit 2 na v4e (run 40213239240, job 121228929627)
- **Handoff:** `.agents/handoffs/onda-52/01-para-24-rebalance-approval-drift-data-007.md`, lido no head
- **Data:** 25/10/2026, 15:00 BRT
- **Método:** git, `prisma` 7.10.0 já presente em node_modules (sem npm ci) e logs da CI via API. Não há Postgres server no box, por isso não rodei `migrate diff --from-migrations`, que exige shadow DB.

## Veredito: **BLOQUEADO @ eb3f108c**

O mérito estático está correto e completo. Falta a evidência obrigatória: o step DATA-007 nunca rodou no head, porque o gate para no Lint herdado da main, que o #72 corrige.

## 1. Escopo
- `git diff --stat origin/main...pr88` tem 2 arquivos:
  - `prisma/schema.prisma` (+3/−1)
  - o handoff (+48)
- `git diff --name-only origin/main pr88 -- prisma/migrations` → vazio. **Nenhuma migration nova ou editada; não há DDL nova.**

## 2. Schema × migration 20261020230000 (coluna por coluna)
| Item | migration.sql | schema no head | OK |
|---|---|---|---|
| id | TEXT NOT NULL, PK `RebalanceApproval_pkey` | `String @id @default(cuid())` | sim |
| organizationId | TEXT NOT NULL | `String` | sim |
| recommendationId, leadId, toOwner, decision, decidedBy | TEXT NOT NULL | `String` | sim |
| fromOwner, noteRef | TEXT (nullable) | `String?` | sim |
| decidedAt | TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP | `DateTime @default(now()) @db.Timestamptz(3)` | sim |
| noteLength | INTEGER (nullable) | `Int?` | sim |
| noteHash | CHAR(64) (nullable) | `String? @db.Char(64)` | sim |
| appliedToCrm | BOOLEAN NOT NULL DEFAULT false | `Boolean @default(false)` | sim |
| **updatedAt** | **TIMESTAMPTZ(3) NOT NULL** | **`DateTime @updatedAt @db.Timestamptz(3)`** (era `DateTime?` na main) | sim (corrigido) |
| idx (organizationId, leadId) | `RebalanceApproval_organizationId_leadId_idx` | `@@index([organizationId, leadId])` | sim |
| **idx (organizationId, decidedAt)** | **`RebalanceApproval_organizationId_decidedAt_idx`** | **`@@index([organizationId, decidedAt])`** (ausente na main) | sim (corrigido) |
| unique (organizationId, recommendationId) | `…_organizationId_recommendationId_key` | `@@unique([organizationId, recommendationId])` | sim |
| FK organizationId → Organization(id) | ON DELETE CASCADE ON UPDATE CASCADE | `@relation(…, onDelete: Cascade)` (onUpdate padrão = Cascade) | sim |

- O lado inverso continua `Organization.rebalanceApprovals RebalanceApproval[]` (l.1067), sem mudança.
- **Tenancy:** `organizationId` continua NOT NULL, com FK e compondo os índices e o unique. O PR não toca RLS (`ENABLE/FORCE` + policy `tenant_isolation`), os CHECKs nem as funções `rebalance_approval_purge`/`anonymize_lead_notes`, que só existem na migration.
- Só existe essa migration para a tabela (`grep -l RebalanceApproval prisma/migrations/**`).

## 3. Verificação mecânica (offline)
- `prisma validate --schema <schema do head>` → valid.
- `prisma format` em uma cópia → byte a byte igual (`cmp`).
- `prisma migrate diff --from-empty --to-schema <head> --script` → extraí o CREATE TABLE, os 3 índices e a FK do `RebalanceApproval` e comparei com o `migration.sql`: **idênticos** (`diff` de linhas ordenadas, DDL_IDENTICAL).
- `prisma migrate diff --from-schema <main> --to-schema <head> --script` →
  ```
  ALTER TABLE "RebalanceApproval" ALTER COLUMN "updatedAt" SET NOT NULL;
  CREATE INDEX "RebalanceApproval_organizationId_decidedAt_idx" ON "RebalanceApproval"("organizationId", "decidedAt");
  ```
  É exatamente o inverso do drift relatado pelo DATA-007 na v4e, e não há mais nada.
- **Não executado:** `migrate diff --from-migrations … --exit-code` (precisa de shadow DB e não há Postgres no box) e `verify:migration-drift`.

## 4. CI no head (run 40218547706, criada 14:52 BRT)
- **application gate, job 121244974844, headSha eb3f108c:** Install, Audit e Prisma generate passaram. **Run Lint: failure** ("Found 10 errors"). Todos os steps seguintes ficaram skipped, inclusive **Run Migrations** e **DATA-007 (step 19)**.
- A saída do Lint é idêntica à da main 4e9b9f97 (job 121241743454), só muda o tempo ("in 2s" × "in 3s"). A falha é herdada, e o PR não toca `src/`.
- Trivy scan: success.

## 5. Achados
- **P2 (evidência, bloqueante):** o DATA-007 e o Migrations não rodaram no head.
- **P3 (fora de escopo, registrado no handoff):** o `migration.sql` da main recebeu um bloco `GRANT EXECUTE … TO prospector_app` em b5a98d5f9, depois do head do #37. Um ambiente que tenha aplicado a versão do #37 terá checksum divergente. Recomendo que o 01 ou o 08 confirmem `_prisma_migrations` em staging e produção. Não bloqueia.
- **Risco de tipo:** `updatedAt` passa de `Date | null` para `Date`. O handoff afirma que nenhum consumidor em `src` lê esse campo. Não rodei o tsc no head do #88. O tsc entra no gate depois do #72.

## 6. Para APROVADO
1. Depois do merge do #72, o 01 faz merge da main no #88 (SHA novo).
2. A CI do novo head precisa mostrar **DATA-007 com exit 0 ("No difference detected")** e **Run Migrations verde**. Se o ci.yml real parar no Type Check herdado antes do DATA-007, vale uma run diagnóstica estilo v4e (continue-on-error no Type Check) com o head do #88.
3. O tsc tem que mostrar 0 erros novos contra a main da época.
4. Nova auditoria do 24 no SHA final. Por ser draft, o PR precisa sair de draft no mesmo SHA auditado.
