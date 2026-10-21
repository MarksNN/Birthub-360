-- REMED-06 (handoff 21→01, PR #33): cadeia de consentimento append-only + Flywheel durável.
-- Somente objetos novos; não corrige drift pré-existente (isso é o PR #28).

-- CreateEnum
CREATE TYPE "ConsentAuditStatus" AS ENUM ('GRANTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentChainEventKind" AS ENUM ('GENESIS', 'CONSENT', 'REVOCATION', 'RETRACTION');

-- CreateTable
CREATE TABLE "ConsentAuditRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" "ConsentChainEventKind" NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "status" "ConsentAuditStatus" NOT NULL,
    "previousHash" CHAR(64) NOT NULL,
    "currentHash" CHAR(64) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "operatorUserId" TEXT,
    "retentionUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "ConsentAuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlywheelApproachRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "approachText" TEXT NOT NULL,
    "sentAt" TIMESTAMPTZ(3) NOT NULL,

CONSTRAINT "FlywheelApproachRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlywheelFewShotExample" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dealId" TEXT,
    "channel" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "approachText" TEXT NOT NULL,
    "outcomeStatus" TEXT NOT NULL,
    "attributionEvidence" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "promotedAt" TIMESTAMPTZ(3) NOT NULL,

CONSTRAINT "FlywheelFewShotExample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentAuditRecord_organizationId_subjectRef_idx" ON "ConsentAuditRecord"("organizationId", "subjectRef");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentAuditRecord_organizationId_sequence_key" ON "ConsentAuditRecord"("organizationId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentAuditRecord_currentHash_key" ON "ConsentAuditRecord"("currentHash");

-- CreateIndex
CREATE INDEX "FlywheelApproachRecord_organizationId_leadId_idx" ON "FlywheelApproachRecord"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "FlywheelFewShotExample_organizationId_leadId_idx" ON "FlywheelFewShotExample"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "FlywheelFewShotExample_organizationId_channel_isActive_idx" ON "FlywheelFewShotExample"("organizationId", "channel", "isActive");

-- AddForeignKey
ALTER TABLE "ConsentAuditRecord" ADD CONSTRAINT "ConsentAuditRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlywheelApproachRecord" ADD CONSTRAINT "FlywheelApproachRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlywheelFewShotExample" ADD CONSTRAINT "FlywheelFewShotExample_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS por organização (padrão do repo: GUC app.current_tenant_id, policy tenant_isolation, ENABLE+FORCE)
ALTER TABLE "ConsentAuditRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentAuditRecord" FORCE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelApproachRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelApproachRecord" FORCE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelFewShotExample" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelFewShotExample" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ConsentAuditRecord" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON "FlywheelApproachRecord" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON "FlywheelFewShotExample" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

-- Cadeia de consentimento: append-only. O trigger vale para QUALQUER papel (inclusive owner/superuser
-- via DML); TRUNCATE também é bloqueado. Defesa em profundidade: REVOKE UPDATE/DELETE/TRUNCATE.
CREATE OR REPLACE FUNCTION consent_audit_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ConsentAuditRecord é append-only (% bloqueado)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;

CREATE TRIGGER consent_audit_no_mutation
BEFORE UPDATE OR DELETE ON "ConsentAuditRecord"
FOR EACH ROW EXECUTE FUNCTION consent_audit_immutable();

CREATE TRIGGER consent_audit_no_truncate
BEFORE TRUNCATE ON "ConsentAuditRecord"
FOR EACH STATEMENT EXECUTE FUNCTION consent_audit_immutable();

REVOKE UPDATE, DELETE, TRUNCATE ON "ConsentAuditRecord" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prospector_app') THEN
    EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON "ConsentAuditRecord" FROM prospector_app';
  END IF;
END
$$;
