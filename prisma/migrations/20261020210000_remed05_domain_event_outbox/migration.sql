-- REMED-05 (handoff 16→01: .agents/handoffs/16-para-01-remed-05-outbox.md, PR #32): tabelas da
-- outbox transacional e da idempotência durável do DomainEventMesh. Só schema; adaptador = Agente 16.
-- Ordem: depois de 20261020190000 (REMED-02, #18) e 20261020200000 (drift-fix, #28).
-- Decisões (relay por organização, retenção) em docs/ADR/ADR-006-Outbox-Relay-Tenant-Loop-e-Retencao.md.
-- Rollback (sem down-migration no Prisma): DROP FUNCTION domain_event_outbox_purge(text,integer,integer,integer);
--   DROP TABLE "DomainEventConsumption"; DROP TABLE "DomainEventOutbox"; DROP TYPE "DomainEventOutboxStatus";
--   e remover a linha de _prisma_migrations.

-- CreateEnum
CREATE TYPE "DomainEventOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISPATCHED', 'FAILED', 'DEAD_LETTER');
-- CreateTable
CREATE TABLE "DomainEventOutbox" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "aggregateId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "producer" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "envelope" JSONB NOT NULL,
    "status" "DomainEventOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedBy" TEXT,
    "lockedUntil" TIMESTAMPTZ(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DomainEventOutbox_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "DomainEventConsumption" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservedBy" TEXT NOT NULL DEFAULT '',
    "reservedUntil" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DomainEventConsumption_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "DomainEventOutbox_organizationId_createdAt_idx" ON "DomainEventOutbox"("organizationId", "createdAt");
-- CreateIndex
CREATE INDEX "DomainEventOutbox_organizationId_status_dispatchedAt_idx" ON "DomainEventOutbox"("organizationId", "status", "dispatchedAt");
-- CreateIndex
CREATE INDEX "DomainEventOutbox_organizationId_status_createdAt_idx" ON "DomainEventOutbox"("organizationId", "status", "createdAt");
-- CreateIndex
CREATE UNIQUE INDEX "DomainEventOutbox_organizationId_eventId_key" ON "DomainEventOutbox"("organizationId", "eventId");
-- CreateIndex
CREATE INDEX "DomainEventConsumption_organizationId_completedAt_idx" ON "DomainEventConsumption"("organizationId", "completedAt");
-- CreateIndex
CREATE UNIQUE INDEX "DomainEventConsumption_organizationId_eventId_consumer_key" ON "DomainEventConsumption"("organizationId", "eventId", "consumer");
-- AddForeignKey
ALTER TABLE "DomainEventOutbox" ADD CONSTRAINT "DomainEventOutbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DomainEventConsumption" ADD CONSTRAINT "DomainEventConsumption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Índices PARCIAIS (não representáveis no schema.prisma; Prisma os ignora no diff).
CREATE UNIQUE INDEX "DomainEventOutbox_organizationId_idempotencyKey_key"
    ON "DomainEventOutbox"("organizationId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
-- Relay por organização: claim de PENDING/FAILED vencidos ordenado por nextAttemptAt.
CREATE INDEX "DomainEventOutbox_relay_due_idx"
    ON "DomainEventOutbox"("organizationId", "status", "nextAttemptAt") WHERE "status" IN ('PENDING', 'FAILED');
-- Recuperação de lease expirada.
CREATE INDEX "DomainEventOutbox_lease_recovery_idx"
    ON "DomainEventOutbox"("organizationId", "status", "lockedUntil") WHERE "status" = 'PROCESSING';

-- Reclaim de reserva vencida (lease) por tenant: só linhas ainda não concluídas.
CREATE INDEX "DomainEventConsumption_lease_reclaim_idx"
    ON "DomainEventConsumption"("organizationId", "reservedUntil") WHERE "completedAt" IS NULL;

-- Invariantes (também ignorados pelo diff do Prisma).
ALTER TABLE "DomainEventOutbox"
    ADD CONSTRAINT "DomainEventOutbox_retryCount_check" CHECK ("retryCount" >= 0),
    ADD CONSTRAINT "DomainEventOutbox_maxAttempts_check" CHECK ("maxAttempts" >= 1),
    ADD CONSTRAINT "DomainEventOutbox_retry_le_max_check" CHECK ("retryCount" <= "maxAttempts"),
    ADD CONSTRAINT "DomainEventOutbox_lastError_len_check" CHECK ("lastError" IS NULL OR char_length("lastError") <= 2000);

-- Uma reserva com prazo precisa de dono; e todo consumo não concluído precisa de prazo.
ALTER TABLE "DomainEventConsumption"
    ADD CONSTRAINT "DomainEventConsumption_lease_owner_check" CHECK ("reservedUntil" IS NULL OR "reservedBy" <> ''),
    -- Consumo não concluído sempre tem lease (senão `reservedUntil < now()` nunca vale e a linha
    -- jamais é retomada). Compatível com o adaptador do 16: reserve grava reservedUntil; complete
    -- grava completedAt (e zera reservedUntil) na mesma instrução; release apaga a linha.
    ADD CONSTRAINT "DomainEventConsumption_unfinished_has_lease_check" CHECK ("completedAt" IS NOT NULL OR "reservedUntil" IS NOT NULL);

-- RLS: tenant_isolation estrito, FORCE, sem cláusula de bypass (padrão 01A pós-20260825120000).

ALTER TABLE "DomainEventOutbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DomainEventOutbox" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "DomainEventOutbox";
CREATE POLICY "tenant_isolation" ON "DomainEventOutbox" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "DomainEventConsumption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DomainEventConsumption" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "DomainEventConsumption";
CREATE POLICY "tenant_isolation" ON "DomainEventConsumption" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

-- Retenção/purge por tenant (LGPD: envelope carrega payload). SECURITY INVOKER: roda sob a RLS de
-- quem chama, e exige que p_org seja o tenant da sessão. Prazos default PROVISÓRIOS (01A/21
-- confirmam): DISPATCHED 30d (por dispatchedAt), DEAD_LETTER 90d (por createdAt), consumo concluído 30d (por completedAt).
-- PENDING/PROCESSING/FAILED nunca são purgados.
CREATE OR REPLACE FUNCTION domain_event_outbox_purge(
    p_org text,
    p_dispatched_days integer DEFAULT 30,
    p_dead_letter_days integer DEFAULT 90,
    p_consumption_days integer DEFAULT 30
) RETURNS TABLE (dispatched_deleted bigint, dead_letter_deleted bigint, consumption_deleted bigint)
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
    -- IS DISTINCT FROM: tenant ausente (NULL/'') também falha, em vez de passar com NULL.
    IF p_org IS NULL OR p_org = '' OR p_org IS DISTINCT FROM current_setting('app.current_tenant_id', true) THEN
        RAISE EXCEPTION 'domain_event_outbox_purge: p_org deve ser o tenant da sessão';
    END IF;
    IF p_dispatched_days < 1 OR p_dead_letter_days < 1 OR p_consumption_days < 1 THEN
        RAISE EXCEPTION 'domain_event_outbox_purge: prazos devem ser >= 1 dia';
    END IF;

    DELETE FROM "DomainEventOutbox"
     WHERE "organizationId" = p_org AND "status" = 'DISPATCHED'
       AND "dispatchedAt" < now() - make_interval(days => p_dispatched_days);
    GET DIAGNOSTICS dispatched_deleted = ROW_COUNT;

    DELETE FROM "DomainEventOutbox"
     WHERE "organizationId" = p_org AND "status" = 'DEAD_LETTER'
       AND "createdAt" < now() - make_interval(days => p_dead_letter_days);
    GET DIAGNOSTICS dead_letter_deleted = ROW_COUNT;

    -- Só consumos CONCLUÍDOS; reservas pendentes/vencidas nunca são purgadas (seriam reexecutadas).
    DELETE FROM "DomainEventConsumption"
     WHERE "organizationId" = p_org
       AND "completedAt" IS NOT NULL
       AND "completedAt" < now() - make_interval(days => p_consumption_days);
    GET DIAGNOSTICS consumption_deleted = ROW_COUNT;

    RETURN NEXT;
END;
$$;
