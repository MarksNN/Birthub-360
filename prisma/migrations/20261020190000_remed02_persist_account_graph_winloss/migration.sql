-- REMED-02 (auditoria forense @281cfcd3): persistir Grafo de Contas e Autópsia Win-Loss
-- (antes Map em memória). Tabelas tenant-scoped com RLS FORCE + policy tenant_isolation.

-- CreateTable
CREATE TABLE "AccountGraphNode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountGraphNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountGraphEdge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "properties" JSONB,

    CONSTRAINT "AccountGraphEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WinLossAutopsyReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "humanReviewStatus" TEXT NOT NULL,
    "report" JSONB NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WinLossAutopsyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountGraphNode_organizationId_type_idx" ON "AccountGraphNode"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AccountGraphNode_organizationId_nodeId_key" ON "AccountGraphNode"("organizationId", "nodeId");

-- CreateIndex
CREATE INDEX "AccountGraphEdge_organizationId_sourceId_idx" ON "AccountGraphEdge"("organizationId", "sourceId");

-- CreateIndex
CREATE INDEX "AccountGraphEdge_organizationId_targetId_idx" ON "AccountGraphEdge"("organizationId", "targetId");

-- CreateIndex
CREATE INDEX "WinLossAutopsyReport_organizationId_dealId_idx" ON "WinLossAutopsyReport"("organizationId", "dealId");

-- CreateIndex
CREATE INDEX "WinLossAutopsyReport_organizationId_analyzedAt_idx" ON "WinLossAutopsyReport"("organizationId", "analyzedAt");

-- AddForeignKey
ALTER TABLE "AccountGraphNode" ADD CONSTRAINT "AccountGraphNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGraphEdge" ADD CONSTRAINT "AccountGraphEdge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinLossAutopsyReport" ADD CONSTRAINT "WinLossAutopsyReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountGraphNode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountGraphNode" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "AccountGraphNode";
CREATE POLICY "tenant_isolation" ON "AccountGraphNode" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "AccountGraphEdge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountGraphEdge" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "AccountGraphEdge";
CREATE POLICY "tenant_isolation" ON "AccountGraphEdge" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "WinLossAutopsyReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WinLossAutopsyReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "WinLossAutopsyReport";
CREATE POLICY "tenant_isolation" ON "WinLossAutopsyReport" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));
