-- REMED-06 v5 (#35, pedido do Agente 15): a cadeia de consentimento só sai por passo EXPLÍCITO de
-- retenção — nem cascata de Organization, nem o migrator por acidente.
-- 1) FKs ConsentAuditRecord/ConsentAuditChainHead → Organization: CASCADE -> RESTRICT. Apagar uma
--    Organization que tem cadeia falha (23503) para qualquer papel.
-- 2) Triggers da cadeia e do head: sem exceção de cascata. DELETE só com o marcador de retenção
--    `app.lgpd_chain_retention_org` = organizationId da linha, numa sessão que NÃO é do app
--    (session_user <> prospector_app). O app também não tem DELETE nessas tabelas (REVOKE).
-- 3) prospector_app perde DELETE/TRUNCATE em Organization (também em scripts/db/create-app-role.sql).

ALTER TABLE "ConsentAuditRecord" DROP CONSTRAINT "ConsentAuditRecord_organizationId_fkey";
ALTER TABLE "ConsentAuditRecord" ADD CONSTRAINT "ConsentAuditRecord_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentAuditChainHead" DROP CONSTRAINT "ConsentAuditChainHead_organizationId_fkey";
ALTER TABLE "ConsentAuditChainHead" ADD CONSTRAINT "ConsentAuditChainHead_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION consent_audit_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  -- Passo explícito de retenção (runbook ADR-006, passo 5): só DELETE, só da org marcada, nunca do app.
  IF TG_OP = 'DELETE'
     AND OLD."organizationId" = current_setting('app.lgpd_chain_retention_org', true)
     AND session_user::text <> 'prospector_app' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'ConsentAuditRecord é append-only (% bloqueado)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;

CREATE OR REPLACE FUNCTION consent_chain_head_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'ConsentAuditChainHead: TRUNCATE bloqueado' USING ERRCODE = 'insufficient_privilege';
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD."organizationId" = current_setting('app.lgpd_chain_retention_org', true)
       AND session_user::text <> 'prospector_app' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'ConsentAuditChainHead: DELETE bloqueado' USING ERRCODE = 'insufficient_privilege';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
       OR NEW."genesisId" IS DISTINCT FROM OLD."genesisId"
       OR NEW."genesisHash" IS DISTINCT FROM OLD."genesisHash" THEN
      RAISE EXCEPTION 'ConsentAuditChainHead: gênese é imutável' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW."lastSequence" <= OLD."lastSequence" THEN
      RAISE EXCEPTION 'ConsentAuditChainHead: lastSequence só cresce (% -> %)', OLD."lastSequence", NEW."lastSequence"
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END
$$;

REVOKE ALL ON FUNCTION consent_audit_immutable() FROM PUBLIC;
REVOKE ALL ON FUNCTION consent_chain_head_guard() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prospector_app') THEN
    REVOKE DELETE, TRUNCATE ON TABLE "Organization" FROM prospector_app;
    REVOKE ALL ON FUNCTION consent_audit_immutable() FROM prospector_app;
    REVOKE ALL ON FUNCTION consent_chain_head_guard() FROM prospector_app;
  END IF;
END
$$;
