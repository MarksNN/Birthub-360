-- REMED-05 (handoff 16→01: .agents/handoffs/16-para-01-remed-05-outbox.md, PR #32): tabelas da
-- outbox transacional e da idempotência durável do DomainEventMesh. Só schema; adaptador = Agente 16.
-- Ordem: depois de 20261020190000 (REMED-02, #18) e 20261020200000 (drift-fix, #28).

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

    CONSTRAINT "DomainEventConsumption_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "DomainEventOutbox_eventId_key" ON "DomainEventOutbox"("eventId");
-- CreateIndex
CREATE INDEX "DomainEventOutbox_organizationId_createdAt_idx" ON "DomainEventOutbox"("organizationId", "createdAt");
-- CreateIndex
CREATE INDEX "DomainEventConsumption_processedAt_idx" ON "DomainEventConsumption"("processedAt");
-- CreateIndex
CREATE UNIQUE INDEX "DomainEventConsumption_organizationId_eventId_consumer_key" ON "DomainEventConsumption"("organizationId", "eventId", "consumer");
-- AddForeignKey
ALTER TABLE "DomainEventOutbox" ADD CONSTRAINT "DomainEventOutbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DomainEventConsumption" ADD CONSTRAINT "DomainEventConsumption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Índices PARCIAIS (não representáveis no schema.prisma; Prisma os ignora no diff).
CREATE UNIQUE INDEX "DomainEventOutbox_organizationId_idempotencyKey_key"
    ON "DomainEventOutbox"("organizationId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
-- Varredura do relay (claim FOR UPDATE SKIP LOCKED de PENDING/FAILED vencidos).
CREATE INDEX "DomainEventOutbox_relay_due_idx"
    ON "DomainEventOutbox"("status", "nextAttemptAt") WHERE "status" IN ('PENDING', 'FAILED');
-- Recuperação de lease expirada.
CREATE INDEX "DomainEventOutbox_lease_recovery_idx"
    ON "DomainEventOutbox"("status", "lockedUntil") WHERE "status" = 'PROCESSING';

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
