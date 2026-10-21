# ADR-006: o relay da outbox roda por organização, sem BYPASSRLS, e define a retenção da outbox

- Status: aceito. O loop por organização foi aprovado por Marks em 2026-10-20. Os prazos de retenção são **provisórios** e dependem de confirmação do 01A e do 21.
- Contexto: REMED-05, PR #34 (schema, Agente 01) e PR #32 (adaptador, Agente 16). Parecer 24 `.agents/reviews/01-outbox-schema-pr34-2c7ccb28-24.md`.

## Decisão 1: relay por organização
As tabelas `DomainEventOutbox` e `DomainEventConsumption` têm RLS FORCE com `tenant_isolation` estrito, sem cláusula `app.bypass_rls`. Isso segue a migration 20260825120000, que retirou o bypass genérico das tabelas de negócio. O relay **não** usa role com BYPASSRLS. A cada ciclo:
1. Lista os ids de `Organization`. Organization está no allowlist de bypass de bootstrap em `src/lib/prisma.ts`, então isso não exige bypass na outbox.
2. Para cada org, abre uma transação com `set_config('app.current_tenant_id', org, true)` e faz o claim:
   ```sql
   WITH due AS (
     SELECT id FROM "DomainEventOutbox"
     WHERE "organizationId" = $org AND status IN ('PENDING','FAILED') AND "nextAttemptAt" <= now()
     ORDER BY "nextAttemptAt" LIMIT $n FOR UPDATE SKIP LOCKED)
   UPDATE "DomainEventOutbox" o SET status='PROCESSING', "lockedBy"=$worker, "lockedUntil"=now()+$lease
   FROM due WHERE o.id = due.id RETURNING o.*;
   ```
   Esse claim usa o índice parcial `DomainEventOutbox_relay_due_idx (organizationId, status, nextAttemptAt)`. A recuperação de lease é a mesma consulta com `status='PROCESSING' AND "lockedUntil" <= now()`, que usa `DomainEventOutbox_lease_recovery_idx`.
3. **Não use** `WHERE id IN (SELECT ... LIMIT n FOR UPDATE SKIP LOCKED)`. Em teste real essa forma devolveu 6 linhas com LIMIT 3, porque a subquery é reavaliada. A CTE acima não tem esse problema.

Custo: com N organizações são N consultas por ciclo, todas por índice. Para não esperar à toa, dá para filtrar antes as orgs com pendências, por um `SELECT DISTINCT organizationId` por tenant ou por um contador. Isso fica a critério do 16.

## Decisão 2: retenção e purge (LGPD, porque o `envelope` guarda o payload)
| Dado | Prazo (provisório) | Coluna | Índice |
|---|---|---|---|
| Outbox DISPATCHED | 30 dias | dispatchedAt | (organizationId, status, dispatchedAt) |
| Outbox DEAD_LETTER | 90 dias | createdAt | (organizationId, status, createdAt) |
| DomainEventConsumption **concluído** | 30 dias | completedAt | (organizationId, completedAt) |
| DomainEventConsumption com reserva aberta ou vencida | nunca purgado (será retomado) | | |
| PENDING / PROCESSING / FAILED | nunca purgados | | |

A função `domain_event_outbox_purge(p_org, p_dispatched_days=30, p_dead_letter_days=90, p_consumption_days=30)` é SECURITY INVOKER e roda sob a RLS de quem chama. Ela exige `p_org = app.current_tenant_id` e devolve as contagens apagadas. Deve ser chamada pelo mesmo loop por organização, por exemplo num job diário, que fica com o 16 ou o 10. Os prazos precisam ser confirmados pelo 01A e pelo 21 antes de produção. Se a política exigir mascarar o envelope da DLQ antes do purge, isso fica para um follow-up.

## Invariantes no banco
- `retryCount >= 0`, `maxAttempts >= 1`, `retryCount <= maxAttempts`.
- `char_length(lastError) <= 2000`.
- `eventId` é único **por tenant**, `(organizationId, eventId)`, para que não sirva de oráculo de existência entre tenants.

## Lease de consumo
`DomainEventConsumption` tem as colunas `reservedBy` (NOT NULL DEFAULT ''), `reservedUntil` e `completedAt` (timestamptz(3), nulos), além de `CHECK (reservedUntil IS NULL OR reservedBy <> '')`.
- Reserva e reclaim: `INSERT ... ON CONFLICT DO UPDATE ... WHERE completedAt IS NULL AND reservedUntil < now()`, conforme o handoff 16. Se um worker cair entre a reserva e a conclusão, a lease expira e outro worker retoma.
- Uma linha concluída nunca é retomada.
- Varredura de reservas vencidas por tenant: índice parcial `DomainEventConsumption_lease_reclaim_idx (organizationId, reservedUntil) WHERE completedAt IS NULL`.
- A reserva deve **sempre** gravar `reservedUntil`. Com valor NULL, o predicado `< now()` nunca é verdadeiro e a linha não é retomada.

## Rollback
O Prisma não tem down-migration. Para desfazer: `DROP FUNCTION domain_event_outbox_purge(text,integer,integer,integer); DROP TABLE "DomainEventConsumption"; DROP TABLE "DomainEventOutbox"; DROP TYPE "DomainEventOutboxStatus";` e remover a linha `20261020210000_remed05_domain_event_outbox` de `_prisma_migrations`. As tabelas são novas, então nenhum dado anterior se perde.
