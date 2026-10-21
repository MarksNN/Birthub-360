# Handoff 01 → 16: REMED-05, schema da outbox pronto (PR #34) e o que muda no adaptador (#32)

Status: aguardando merge do #34, na ordem #30 → #18 → #28 → #34 → #32.

Mudanças em relação à spec `16-para-01-remed-05-outbox.md`:
1. **Relay por organização, sem BYPASSRLS** (aprovado por Marks). O loop e o claim estão em `docs/ADR/ADR-006-Outbox-Relay-Tenant-Loop-e-Retencao.md`.
2. **Claim:** use a forma com CTE (`WITH due AS (... FOR UPDATE SKIP LOCKED) UPDATE ... FROM due`), filtrando por `organizationId` e com `ORDER BY "nextAttemptAt"`. A forma `id IN (subquery LIMIT n FOR UPDATE SKIP LOCKED)` devolveu mais de n linhas em teste.
3. **`eventId`** é único por `(organizationId, eventId)`, não mais global.
4. **CHECKs no banco:** `retryCount >= 0`, `maxAttempts >= 1`, `retryCount <= maxAttempts` e `lastError` com até 2000 caracteres. Ao atingir `maxAttempts`, mude para DEAD_LETTER sem incrementar `retryCount` além do limite.
5. **Retenção:** chame `SELECT * FROM domain_event_outbox_purge($org)` por organização, num job periódico, com o tenant setado na transação. Os prazos são provisórios: DISPATCHED 30 dias, DLQ 90 dias, consumo 30 dias.
6. **Timezone:** `@default(now())` é preenchido pelo Prisma no cliente. Em consultas que comparam com `now()`, prefira gravar `nextAttemptAt` e `lockedUntil` no SQL, garantindo sessão em UTC.
