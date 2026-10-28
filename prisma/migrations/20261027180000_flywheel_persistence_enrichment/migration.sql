-- Migration: 20261027180000_flywheel_persistence_enrichment
-- Responsável: Agente 01 (Plataforma, Segurança e Dados) & 01A
-- Onda: Evolução Enxame IA (Handoff 00-para-01-flywheel-persistence-schema)
--
-- Enriquecimento relacional das tabelas de persistência do Flywheel:
-- 1. FlywheelApproachRecord: agentSlug, feedback humano, embedding vetorial e índices tenant-aware.
-- 2. FlywheelFewShotExample: agentSlug, feedback humano, embedding vetorial e índices tenant-aware.
-- 3. RLS reforçado com FORCE ROW LEVEL SECURITY e tenant_isolation multi-tenant.

-- AlterTable FlywheelApproachRecord
ALTER TABLE "FlywheelApproachRecord" ADD COLUMN IF NOT EXISTS "agentSlug" TEXT;
ALTER TABLE "FlywheelApproachRecord" ADD COLUMN IF NOT EXISTS "humanFeedbackStatus" TEXT;
ALTER TABLE "FlywheelApproachRecord" ADD COLUMN IF NOT EXISTS "humanFeedbackNotes" TEXT;
ALTER TABLE "FlywheelApproachRecord" ADD COLUMN IF NOT EXISTS "embedding" vector(768);
ALTER TABLE "FlywheelApproachRecord" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FlywheelApproachRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FlywheelApproachRecord_organizationId_agentSlug_createdAt_idx" 
ON "FlywheelApproachRecord"("organizationId", "agentSlug", "createdAt");

-- AlterTable FlywheelFewShotExample
ALTER TABLE "FlywheelFewShotExample" ADD COLUMN IF NOT EXISTS "agentSlug" TEXT;
ALTER TABLE "FlywheelFewShotExample" ADD COLUMN IF NOT EXISTS "humanFeedbackStatus" TEXT;
ALTER TABLE "FlywheelFewShotExample" ADD COLUMN IF NOT EXISTS "humanFeedbackNotes" TEXT;
ALTER TABLE "FlywheelFewShotExample" ADD COLUMN IF NOT EXISTS "embedding" vector(768);
ALTER TABLE "FlywheelFewShotExample" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FlywheelFewShotExample" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FlywheelFewShotExample_organizationId_agentSlug_createdAt_idx" 
ON "FlywheelFewShotExample"("organizationId", "agentSlug", "createdAt");

-- ─── RLS: tenant_isolation estrito, FORCE, sem cláusula de bypass ───────────
ALTER TABLE "FlywheelApproachRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelApproachRecord" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "FlywheelApproachRecord";
DROP POLICY IF EXISTS "tenant_isolation_flywheel" ON "FlywheelApproachRecord";
CREATE POLICY "tenant_isolation" ON "FlywheelApproachRecord" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), NULLIF(current_setting('app.current_organization_id', true), '')))
    WITH CHECK ("organizationId" = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), NULLIF(current_setting('app.current_organization_id', true), '')));

ALTER TABLE "FlywheelFewShotExample" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelFewShotExample" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "FlywheelFewShotExample";
DROP POLICY IF EXISTS "tenant_isolation_flywheel" ON "FlywheelFewShotExample";
CREATE POLICY "tenant_isolation" ON "FlywheelFewShotExample" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), NULLIF(current_setting('app.current_organization_id', true), '')))
    WITH CHECK ("organizationId" = COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), NULLIF(current_setting('app.current_organization_id', true), '')));
