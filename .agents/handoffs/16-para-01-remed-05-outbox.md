# Handoff 16 → 01 — REMED-05: tabelas da outbox transacional e da idempotência durável

Bloqueador: a implementação Prisma de `OutboxRepository`/`ConsumptionStore`
(`src/lib/queue/outbox/outbox.ports.ts`) depende destas tabelas. O 16 não altera `schema.prisma` nem migrações.

## Enum `DomainEventOutboxStatus`
`PENDING | PROCESSING | DISPATCHED | FAILED | DEAD_LETTER`

## Tabela `DomainEventOutbox`
| coluna | tipo Postgres | nulo | default |
|---|---|---|---|
| id | text (uuid) PK | não | gen_random_uuid() |
| organizationId | text FK → Organization(id) ON DELETE CASCADE | não | |
| eventId | text | não | |
| eventType | text | não | |
| eventVersion | text | não | '1.0.0' |
| aggregateId | text | não | |
| correlationId | text | não | |
| causationId | text | sim | |
| producer | text | não | |
| idempotencyKey | text | sim | |
| envelope | jsonb (envelope completo, inclui payload) | não | |
| status | DomainEventOutboxStatus | não | 'PENDING' |
| retryCount | integer | não | 0 |
| maxAttempts | integer | não | 8 |
| nextAttemptAt | timestamptz(3) | não | now() |
| lockedBy | text | sim | |
| lockedUntil | timestamptz(3) | sim | |
| lastError | text (truncado em 2000 chars pela aplicação) | sim | |
| createdAt | timestamptz(3) | não | now() |
| dispatchedAt | timestamptz(3) | sim | |

Índices / uniques:
- `UNIQUE (eventId)`
- `UNIQUE (organizationId, idempotencyKey)` — parcial `WHERE "idempotencyKey" IS NOT NULL`
- `INDEX (status, nextAttemptAt)` — parcial `WHERE status IN ('PENDING','FAILED')` (varredura do relay)
- `INDEX (status, lockedUntil)` — parcial `WHERE status = 'PROCESSING'` (recuperação de lease)
- `INDEX (organizationId, createdAt)`
- RLS por `organizationId` conforme padrão do 01A; o relay roda com papel de sistema.

Claim esperado (o 16 implementa no adaptador): `UPDATE ... SET status='PROCESSING', lockedBy=$w, lockedUntil=now()+lease
WHERE id IN (SELECT id ... WHERE (status IN ('PENDING','FAILED') AND nextAttemptAt<=now()) OR (status='PROCESSING' AND lockedUntil<=now())
ORDER BY createdAt LIMIT $n FOR UPDATE SKIP LOCKED) RETURNING *`.

## Tabela `DomainEventConsumption` (revisada após parecer 24 do PR #32 — reserva atômica)
| coluna | tipo | nulo | default |
|---|---|---|---|
| id | text (uuid) PK | não | gen_random_uuid() |
| organizationId | text FK → Organization(id) ON DELETE CASCADE | não | |
| eventId | text | não | |
| consumer | text | não | |
| reservedBy | text | não | |
| reservedUntil | timestamptz(3) | não | |
| completedAt | timestamptz(3) | sim | |
| createdAt | timestamptz(3) | não | now() |

- `UNIQUE (organizationId, eventId, consumer)`.
- reserva: `INSERT ... ON CONFLICT (organizationId, eventId, consumer) DO UPDATE SET reservedBy=EXCLUDED.reservedBy,
  reservedUntil=EXCLUDED.reservedUntil WHERE "DomainEventConsumption"."completedAt" IS NULL AND "DomainEventConsumption"."reservedUntil" < now() RETURNING id`
  (sem linha retornada = já concluído ou reservado por outro).
- `complete`: `UPDATE SET completedAt=now() WHERE (org,event,consumer) AND reservedBy=$owner`.
- `release`: `DELETE WHERE (org,event,consumer) AND reservedBy=$owner AND completedAt IS NULL`.
- `INDEX (completedAt)` para retenção.

## Retenção / DLQ (adicionado)
- `purge`: `DELETE FROM "DomainEventOutbox" WHERE status IN ('DISPATCHED','DEAD_LETTER') AND COALESCE(dispatchedAt, createdAt) < $olderThan`
  → pede `INDEX (status, dispatchedAt)`. Prazo default 30 dias no código; prazo final a definir com o 01A (LGPD, envelope contém payload).
- `requeueDeadLetters`: `UPDATE SET status='PENDING', retryCount=0, nextAttemptAt=now() WHERE status='DEAD_LETTER' [AND organizationId=$org] [AND id = ANY($ids)]`.
- `lastError` já chega mascarado (e-mail/números) e truncado em 2000 chars.

## Produtores atuais e migração para `publishInTransaction`
Nenhum produtor atual usa `prisma.$transaction` hoje, então não há migração "óbvia" possível sem um
`PrismaOutboxUnitOfWork` (que depende destas tabelas). Além disso, os arquivos pertencem a outros agentes.
Candidatos (escrevem no banco e publicam em seguida — dual-write), por dono a confirmar:
- `src/features/integrations/bitrix/bitrix.webhook.ts` (06/06A)
- `src/features/integrations/whatsapp/whatsappMessage.service.ts` (06)
- `src/features/knowledge/services/accountKnowledgeGraph.service.ts` (07)
- `src/features/proposals/services/proposalAutomation.service.ts` (17/04)
- `src/features/market-intelligence/server/marketSensing.service.ts` (07)
- `src/lib/security/services/continuousSecurityAudit.service.ts` (15)
Os demais 16 produtores não escrevem no banco no mesmo fluxo e podem continuar em `publish()` (inline com lock + relay).

## Status após PR #34 (2c7ccb28) — adaptador do 16 implementado (`src/lib/queue/outbox/prismaOutbox.repository.ts`)
- Claim com CTE `WITH due AS (... ORDER BY "createdAt" LIMIT n FOR UPDATE SKIP LOCKED) UPDATE ... FROM due` (regra do 01).
- RLS: toda query roda com `app.current_tenant_id`; o relay itera por tenant (descoberta via `Organization`, já na allowlist de bypass). Sem BYPASSRLS.
- Timestamps: só `now()` do Postgres (append, claim, lease, nextAttemptAt, dispatchedAt, requeue, purge).
- **Pendência para o 01 (não bloqueia o merge do #34, mas limita a garantia):** `DomainEventConsumption` do #34 não tem
  `reservedBy`, `reservedUntil`, `completedAt`. Sem elas, o adaptador usa `ON CONFLICT DO NOTHING` + DELETE em falha;
  um crash entre reserva e conclusão deixa a linha e aquele consumidor não reexecuta (at-most-once nesse caso).
  Pedido: adicionar `reservedBy text NOT NULL DEFAULT ''`, `reservedUntil timestamptz(3) NULL`, `completedAt timestamptz(3) NULL`
  e `INDEX (status, dispatchedAt)` na outbox para o purge (`DELETE ... COALESCE("dispatchedAt","createdAt") < now() - retenção`).

## Ajustes ao #34 @671d8d31 (handoff 01-para-16-remed-05-outbox-schema-relay.md)
- eventId único por (organizationId, eventId): append com `ON CONFLICT DO NOTHING` (cobre os dois únicos) e lookup do existente sempre filtrado pelo tenant.
- Claim: `ORDER BY "nextAttemptAt"` (casa com o índice parcial `(organizationId, status, nextAttemptAt)`).
- Purge: `relay.purgeExpired()` chama `SELECT * FROM domain_event_outbox_purge($org, 30, 90, 30)` por tenant (prazos provisórios).
- CHECK `retryCount <= maxAttempts`: o relay limita `retryCount` a `maxAttempts` ao ir para DEAD_LETTER.
- **Ainda pendente no 01:** `DomainEventConsumption` continua sem `reservedBy`/`reservedUntil`/`completedAt` em 671d8d31,
  então o adaptador mantém `ON CONFLICT DO NOTHING` + DELETE em falha (crash entre reserva e conclusão = consumidor não reexecuta).

## #34 @eaf0d4e7 — lease de consumo adotado
`PrismaConsumptionStore` usa reservedBy/reservedUntil/completedAt: reserva com `ON CONFLICT DO UPDATE ... WHERE completedAt IS NULL AND reservedUntil < now()`,
complete grava `completedAt=now()` (só o dono), falha apaga a linha não concluída do dono, "processado" = `completedAt IS NOT NULL`.
A limitação at-most-once em crash foi resolvida: após expirar o lease, outro worker retoma. Pendência do 01 sobre consumo: nenhuma.
