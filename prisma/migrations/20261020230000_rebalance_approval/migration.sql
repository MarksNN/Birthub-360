-- REMED-04 (handoff 04→01: .agents/handoffs/onda-forense-20261020/04-para-01-rebalance-approval-unique.md,
-- PR #23): decisão de rebalanceamento com UNIQUE (organizationId, recommendationId) no banco — fecha a
-- corrida de findFirst+create concorrentes. Só schema; o store Prisma é do Agente 04.
-- Rollback: DROP FUNCTION rebalance_approval_purge(text,integer);
--   DROP FUNCTION rebalance_approval_anonymize_lead_notes(text,text); DROP TABLE "RebalanceApproval";
--   e remover a linha de _prisma_migrations. Tabela nova: sem impacto em dados existentes.

-- CreateTable
CREATE TABLE "RebalanceApproval" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromOwner" TEXT,
    "toOwner" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "note" VARCHAR(280),
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RebalanceApproval_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "RebalanceApproval_organizationId_leadId_idx" ON "RebalanceApproval"("organizationId", "leadId");
-- CreateIndex
CREATE INDEX "RebalanceApproval_organizationId_decidedAt_idx" ON "RebalanceApproval"("organizationId", "decidedAt");
-- CreateIndex
CREATE UNIQUE INDEX "RebalanceApproval_organizationId_recommendationId_key" ON "RebalanceApproval"("organizationId", "recommendationId");
-- AddForeignKey
ALTER TABLE "RebalanceApproval" ADD CONSTRAINT "RebalanceApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariantes (ignorados pelo diff do Prisma).
ALTER TABLE "RebalanceApproval"
    ADD CONSTRAINT "RebalanceApproval_note_len_check" CHECK ("note" IS NULL OR char_length("note") <= 280),
    ADD CONSTRAINT "RebalanceApproval_decision_check" CHECK ("decision" IN ('APPROVED', 'REJECTED'));

-- RLS: tenant_isolation estrito, FORCE, sem cláusula de bypass (padrão 01A pós-20260825120000).
ALTER TABLE "RebalanceApproval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RebalanceApproval" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "RebalanceApproval";
CREATE POLICY "tenant_isolation" ON "RebalanceApproval" AS PERMISSIVE FOR ALL TO public
    USING ("organizationId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

-- Retenção por tenant (LGPD). SECURITY INVOKER (roda sob a RLS de quem chama), search_path fixo e
-- guarda IS DISTINCT FROM: tenant ausente/diferente da sessão falha. Prazo SEM default de propósito:
-- a retenção da decisão segue a do AuditLog, ainda não definida — 21/01A decidem o valor.
CREATE OR REPLACE FUNCTION rebalance_approval_purge(p_org text, p_retention_days integer)
RETURNS bigint
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    n bigint;
BEGIN
    IF p_org IS NULL OR p_org = '' OR p_org IS DISTINCT FROM current_setting('app.current_tenant_id', true) THEN
        RAISE EXCEPTION 'rebalance_approval_purge: p_org deve ser o tenant da sessão';
    END IF;
    IF p_retention_days IS NULL OR p_retention_days < 1 THEN
        RAISE EXCEPTION 'rebalance_approval_purge: p_retention_days deve ser >= 1';
    END IF;
    DELETE FROM "RebalanceApproval"
     WHERE "organizationId" = p_org
       AND "decidedAt" < now() - make_interval(days => p_retention_days);
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;

-- Purge do titular (LGPD art. 18): anonimiza `note` das decisões ligadas ao lead, mantendo a decisão.
CREATE OR REPLACE FUNCTION rebalance_approval_anonymize_lead_notes(p_org text, p_lead_id text)
RETURNS bigint
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    n bigint;
BEGIN
    IF p_org IS NULL OR p_org = '' OR p_org IS DISTINCT FROM current_setting('app.current_tenant_id', true) THEN
        RAISE EXCEPTION 'rebalance_approval_anonymize_lead_notes: p_org deve ser o tenant da sessão';
    END IF;
    IF p_lead_id IS NULL OR p_lead_id = '' THEN
        RAISE EXCEPTION 'rebalance_approval_anonymize_lead_notes: p_lead_id obrigatório';
    END IF;
    UPDATE "RebalanceApproval" SET "note" = NULL
     WHERE "organizationId" = p_org AND "leadId" = p_lead_id AND "note" IS NOT NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;
