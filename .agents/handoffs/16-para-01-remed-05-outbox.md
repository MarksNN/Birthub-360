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

## Tabela `DomainEventConsumption`
| coluna | tipo | nulo | default |
|---|---|---|---|
| id | text (uuid) PK | não | gen_random_uuid() |
| organizationId | text FK → Organization(id) ON DELETE CASCADE | não | |
| eventId | text | não | |
| consumer | text | não | |
| processedAt | timestamptz(3) | não | now() |

- `UNIQUE (organizationId, eventId, consumer)` — inserção com `ON CONFLICT DO NOTHING`
- `INDEX (processedAt)` para retenção (sugestão: purga após 30 dias de DISPATCHED/consumo; política com 01A).
