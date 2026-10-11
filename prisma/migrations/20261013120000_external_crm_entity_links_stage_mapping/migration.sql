-- Onda 16 (handoff 06 -> 01): vínculos externos de CRM + mapeamento de etapas.
-- - ExternalCrmConnection: status/expiração/erro consultáveis sem decifrar `config`, externalAccountId,
--   fieldMapping, outboundEnabled (opt-in), lastSyncAt. Tokens NUNCA migram para colunas: `config`
--   continua cifrado via piiFields. Colunas novas têm default/nullable: conexões existentes recebem
--   status='active', fieldMapping='{}', outboundEnabled=false.
-- - ExternalCrmSyncLog: entityType + payloadHash + índice (connectionId, externalEntityId) — decisão 00.
-- - ExternalEntityLink (novo): fonte de verdade entidade interna <-> ID externo (uniques anti-duplicata).
-- - ExternalCrmStageMapping (novo): etapa externa <-> LeadStatus.
-- Importador (decisão 00): inbound sem match -> criar Lead (+Company/Contact) e links na MESMA transação.
-- RLS: ENABLE + FORCE + tenant_isolation simétrica (padrão 20261012000000_lead_touchpoint_rls), sem bypass.
-- Índice de FK connectionId coberto pelos uniques compostos iniciados por "connectionId".

-- AlterTable
ALTER TABLE "ExternalCrmConnection" ADD COLUMN     "externalAccountId" TEXT,
ADD COLUMN     "fieldMapping" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastErrorAt" TIMESTAMP(3),
ADD COLUMN     "lastRefreshAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "outboundEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ExternalCrmSyncLog" ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "payloadHash" TEXT;

-- CreateTable
CREATE TABLE "ExternalEntityLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "externalType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastDirection" TEXT,
    "lastPayloadHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalEntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCrmStageMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalPipelineId" TEXT NOT NULL,
    "externalStageId" TEXT NOT NULL,
    "externalStageLabel" TEXT,
    "internalStatus" "LeadStatus" NOT NULL,
    "outboundDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCrmStageMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalEntityLink_organizationId_idx" ON "ExternalEntityLink"("organizationId");

-- CreateIndex
CREATE INDEX "ExternalEntityLink_organizationId_entityType_internalId_idx" ON "ExternalEntityLink"("organizationId", "entityType", "internalId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalEntityLink_connectionId_externalType_externalId_key" ON "ExternalEntityLink"("connectionId", "externalType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalEntityLink_connectionId_entityType_internalId_key" ON "ExternalEntityLink"("connectionId", "entityType", "internalId");

-- CreateIndex
CREATE INDEX "ExternalCrmStageMapping_organizationId_idx" ON "ExternalCrmStageMapping"("organizationId");

-- CreateIndex
CREATE INDEX "ExternalCrmStageMapping_connectionId_internalStatus_idx" ON "ExternalCrmStageMapping"("connectionId", "internalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCrmStageMapping_connectionId_externalPipelineId_ext_key" ON "ExternalCrmStageMapping"("connectionId", "externalPipelineId", "externalStageId");

-- CreateIndex
CREATE INDEX "ExternalCrmConnection_status_tokenExpiresAt_idx" ON "ExternalCrmConnection"("status", "tokenExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCrmConnection_organizationId_provider_externalAccou_key" ON "ExternalCrmConnection"("organizationId", "provider", "externalAccountId");

-- CreateIndex
CREATE INDEX "ExternalCrmSyncLog_connectionId_externalEntityId_idx" ON "ExternalCrmSyncLog"("connectionId", "externalEntityId");

-- AddForeignKey
ALTER TABLE "ExternalEntityLink" ADD CONSTRAINT "ExternalEntityLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalEntityLink" ADD CONSTRAINT "ExternalEntityLink_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ExternalCrmConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCrmStageMapping" ADD CONSTRAINT "ExternalCrmStageMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCrmStageMapping" ADD CONSTRAINT "ExternalCrmStageMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ExternalCrmConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS: ExternalEntityLink
ALTER TABLE "ExternalEntityLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalEntityLink" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "ExternalEntityLink";
CREATE POLICY "tenant_isolation" ON "ExternalEntityLink" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

-- RLS: ExternalCrmStageMapping
ALTER TABLE "ExternalCrmStageMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalCrmStageMapping" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "ExternalCrmStageMapping";
CREATE POLICY "tenant_isolation" ON "ExternalCrmStageMapping" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));
