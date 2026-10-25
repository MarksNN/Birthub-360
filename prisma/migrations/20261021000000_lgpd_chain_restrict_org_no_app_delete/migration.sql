-- REMED-06 v5 (#35, pedido do Agente 15): a cadeia de consentimento só sai por passo EXPLÍCITO de
-- retenção — nem cascata de Organization, nem o migrator por acidente.
-- 1) FKs ConsentAuditRecord/ConsentAuditChainHead → Organization: CASCADE -> RESTRICT. Apagar uma
--    Organization que tem cadeia falha (23503) para qualquer papel.
-- 2) Triggers da cadeia e do head: sem exceção de cascata. DELETE só com o marcador de retenção
--    `app.lgpd_chain_retention_org` = organizationId da linha, numa sessão que NÃO é do app
--    (session_user <> prospector_app). O app também não tem DELETE nessas tabelas (REVOKE).
-- 3) prospector_app perde DELETE/TRUNCATE em Organization. Re-rodar o bootstrap NÃO devolve o grant:
--    scripts/db/create-app-role.sql exclui Organization do DELETE no loop e re-aplica o REVOKE no
--    hook final db_apply_restricted_table_privileges (parecer 24 do PR #62; teste em
--    tests/integration/db-restricted-table-privileges.test.ts).

-- A migration anterior revoga EXECUTE destas funções no dono. No CI ou migrações subsequentes,
-- ALTER TABLE pode revalidar o trigger e falhar com 42501 se o EXECUTE não voltar para o dono.
-- O bloco abaixo verifica se o CURRENT_USER é dono da função ou superuser antes do GRANT/REVOKE,
-- evitando P3018 (permission denied) caso o executor não tenha autoridade de concessão.
DO $$
DECLARE
  f text;
  fn_oid oid;
  fn_owner text;
  is_admin boolean;
BEGIN
  SELECT COALESCE(rolsuper, false) INTO is_admin FROM pg_roles WHERE rolname = CURRENT_USER;
  FOREACH f IN ARRAY ARRAY[
    'consent_audit_immutable()',
    'consent_chain_head_guard()',
    'consent_audit_advance_head()',
    'consent_subject_key_tombstone()',
    'consent_tombstone_immutable()',
    'tenant_key_envelope_guard()',
    'lgpd_apply_consent_privileges()'
  ]
  LOOP
    fn_oid := to_regprocedure('public.' || f);
    IF fn_oid IS NOT NULL THEN
      SELECT pg_get_userbyid(proowner) INTO fn_owner FROM pg_proc WHERE oid = fn_oid;
      IF fn_owner = CURRENT_USER OR is_admin THEN
        EXECUTE format('GRANT ALL ON FUNCTION public.%s TO CURRENT_USER', f);
      END IF;
    END IF;
  END LOOP;
END
$$;

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

DO $$
DECLARE
  f text;
  fn_oid oid;
  fn_owner text;
  is_admin boolean;
  has_app boolean;
BEGIN
  SELECT COALESCE(rolsuper, false) INTO is_admin FROM pg_roles WHERE rolname = CURRENT_USER;
  has_app := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prospector_app');

  IF has_app AND EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Organization' AND relnamespace = 'public'::regnamespace) THEN
    REVOKE DELETE, TRUNCATE ON TABLE "Organization" FROM prospector_app;
  END IF;

  FOREACH f IN ARRAY ARRAY[
    'consent_audit_immutable()',
    'consent_chain_head_guard()',
    'consent_audit_advance_head()',
    'consent_subject_key_tombstone()',
    'consent_tombstone_immutable()',
    'tenant_key_envelope_guard()',
    'lgpd_apply_consent_privileges()'
  ]
  LOOP
    fn_oid := to_regprocedure('public.' || f);
    IF fn_oid IS NOT NULL THEN
      SELECT pg_get_userbyid(proowner) INTO fn_owner FROM pg_proc WHERE oid = fn_oid;
      IF fn_owner = CURRENT_USER OR is_admin THEN
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
        IF has_app THEN
          EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM prospector_app', f);
        END IF;
      END IF;
    END IF;
  END LOOP;
END
$$;
