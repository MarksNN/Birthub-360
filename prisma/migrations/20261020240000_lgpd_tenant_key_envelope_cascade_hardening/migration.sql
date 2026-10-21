-- REMED-06 v4 (#35): parecer 24 (pr35) + parecer 15 do #39 (A2, B, B1, C) + pedido do Agente 21 (#33).
-- 1) Cascata real de Organization: os triggers append-only deixavam passar DELETE com
--    pg_trigger_depth() > 1, o que qualquer trigger (ex.: em tabela criada pelo app) satisfaz. Agora a
--    exceção exige que a linha de Organization JÁ NÃO EXISTA (estado em que só uma ação RI ON DELETE
--    CASCADE de Organization deleta filhos) E profundidade > 1. Sem a org apagada, nada passa.
-- 2) ConsentAuditRecord → Organization passa de RESTRICT para CASCADE (e EventDetail → Record também),
--    para o offboarding/cleanup funcionar sem conceder DELETE ao app (a ação RI roda como dono da
--    tabela filha). DML direto continua bloqueado para qualquer papel.
-- 3) consent_subject_key_tombstone(): tenant guard explícito; continua SECURITY DEFINER (o app só tem
--    SELECT no tombstone — INVOKER exigiria INSERT do app e permitiria forjar provas), search_path
--    fixo pg_catalog, public, pg_temp.
-- 4) Nenhuma função própria fica com EXECUTE para PUBLIC/app (inventário B/B1/C do #39).
-- 5) TenantKeyEnvelope (Agente 21) e FKs Flywheel.leadId → Lead ON DELETE CASCADE.

-- ─── Predicado de cascata real (inline em cada trigger; INVOKER, sem EXECUTE para o app).
-- Por que é seguro mesmo sob RLS de Organization: um DELETE não-cascata em tabela filha exige passar
-- pela RLS FORCE da filha (tenant = OLD.organizationId) e, com esse tenant, a policy de Organization
-- mostra a própria org — logo "org não existe" é falso e o DELETE é recusado.

-- ConsentAuditRecord: append-only; só a cascata de Organization apaga.
CREATE OR REPLACE FUNCTION consent_audit_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1
     AND NOT EXISTS (SELECT 1 FROM public."Organization" o WHERE o.id = OLD."organizationId") THEN
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
    IF pg_trigger_depth() > 1
       AND NOT EXISTS (SELECT 1 FROM public."Organization" o WHERE o.id = OLD."organizationId") THEN
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

CREATE OR REPLACE FUNCTION consent_tombstone_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1
     AND NOT EXISTS (SELECT 1 FROM public."Organization" o WHERE o.id = OLD."organizationId") THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'ConsentSubjectKeyTombstone é append-only (% bloqueado)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;

-- Tombstone de crypto-shredding (A2 + B do parecer 15).
CREATE OR REPLACE FUNCTION consent_subject_key_tombstone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  -- Cascata real de Organization: a org não existe mais (o tombstone também seria apagado pela
  -- mesma cascata; a FK falharia). Trigger AFTER roda com pg_trigger_depth() = 1 mesmo em cascata,
  -- por isso o critério aqui é só a ausência da org. Com a org viva, o tombstone é SEMPRE gravado.
  IF NOT EXISTS (SELECT 1 FROM public."Organization" o WHERE o.id = OLD."organizationId") THEN
    RETURN OLD;
  END IF;
  -- Tenant guard explícito: DEFINER não pode gravar prova em nome de outro tenant.
  IF OLD."organizationId" IS DISTINCT FROM current_setting('app.current_tenant_id', true) THEN
    RAISE EXCEPTION 'consent_subject_key_tombstone: tenant não confere'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO public."ConsentSubjectKeyTombstone" ("organizationId","lookupId","keyCreatedAt","shreddedBy")
  VALUES (OLD."organizationId", OLD."lookupId", OLD."createdAt", session_user);
  RETURN OLD;
END
$$;

-- consent_audit_advance_head: mesmo corpo, só fixa search_path com pg_catalog primeiro.
ALTER FUNCTION consent_audit_advance_head() SET search_path = pg_catalog, public, pg_temp;

-- A migration anterior revoga REFERENCES do dono (prospector_app, no CI). Sem isso,
-- a FK abaixo falha com 42501 mesmo sendo o dono da tabela. O SELECT final
-- (lgpd_apply_consent_privileges) volta a deixar só SELECT, INSERT.
GRANT REFERENCES ON TABLE "ConsentAuditRecord" TO CURRENT_USER;

-- ─── FKs: cascata de Organization alcança a cadeia (offboarding) sem DELETE para o app.
ALTER TABLE "ConsentAuditRecord" DROP CONSTRAINT "ConsentAuditRecord_organizationId_fkey";
ALTER TABLE "ConsentAuditRecord" ADD CONSTRAINT "ConsentAuditRecord_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentEventDetail" DROP CONSTRAINT "ConsentEventDetail_eventId_fkey";
ALTER TABLE "ConsentEventDetail" ADD CONSTRAINT "ConsentEventDetail_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "ConsentAuditRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Flywheel → Lead (P2-6 / #33): expurgo do lead expurga os derivados.
ALTER TABLE "FlywheelApproachRecord" ADD CONSTRAINT "FlywheelApproachRecord_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlywheelFewShotExample" ADD CONSTRAINT "FlywheelFewShotExample_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── TenantKeyEnvelope (Agente 21): DEK do tenant cifrada pela CMK no KMS.
CREATE TABLE "TenantKeyEnvelope" (
    "organizationId" TEXT NOT NULL,
    "ciphertext" BYTEA,
    "cmkId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destroyedAt" TIMESTAMPTZ(3),

    CONSTRAINT "TenantKeyEnvelope_pkey" PRIMARY KEY ("organizationId")
);
ALTER TABLE "TenantKeyEnvelope" ADD CONSTRAINT "TenantKeyEnvelope_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Viva <=> tem ciphertext não vazio; destruída <=> ciphertext NULL.
ALTER TABLE "TenantKeyEnvelope" ADD CONSTRAINT "TenantKeyEnvelope_tombstone_check"
  CHECK (("destroyedAt" IS NULL AND "ciphertext" IS NOT NULL AND octet_length("ciphertext") > 0)
      OR ("destroyedAt" IS NOT NULL AND "ciphertext" IS NULL));

ALTER TABLE "TenantKeyEnvelope" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantKeyEnvelope" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TenantKeyEnvelope" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

-- UPDATE: só a transição viva -> destruída (destroyedAt preenchido + ciphertext NULL), demais colunas
-- imutáveis; depois de destruída, nada muda. DELETE/TRUNCATE: só cascata real de Organization.
CREATE OR REPLACE FUNCTION tenant_key_envelope_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'TenantKeyEnvelope: TRUNCATE bloqueado' USING ERRCODE = 'insufficient_privilege';
  ELSIF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1
       AND NOT EXISTS (SELECT 1 FROM public."Organization" o WHERE o.id = OLD."organizationId") THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'TenantKeyEnvelope: DELETE bloqueado (use destroyedAt)' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- UPDATE
  IF OLD."destroyedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'TenantKeyEnvelope: envelope destruído é imutável' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW."destroyedAt" IS NULL OR NEW."ciphertext" IS NOT NULL
     OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
     OR NEW."cmkId" IS DISTINCT FROM OLD."cmkId"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'TenantKeyEnvelope: UPDATE só para destruir (destroyedAt + ciphertext NULL)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER tenant_key_envelope_guard_row
BEFORE UPDATE OR DELETE ON "TenantKeyEnvelope"
FOR EACH ROW EXECUTE FUNCTION tenant_key_envelope_guard();
CREATE TRIGGER tenant_key_envelope_no_truncate
BEFORE TRUNCATE ON "TenantKeyEnvelope"
FOR EACH STATEMENT EXECUTE FUNCTION tenant_key_envelope_guard();

-- ─── Privilégios mínimos (re-aplicáveis por scripts/db/create-app-role.sql após o bootstrap).
-- Agora também retira EXECUTE de PUBLIC e do app em TODAS as funções LGPD (o bootstrap faz
-- GRANT EXECUTE ON ALL FUNCTIONS; triggers não exigem EXECUTE de quem dispara).
CREATE OR REPLACE FUNCTION lgpd_apply_consent_privileges() RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  g record;
  f text;
  has_app boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prospector_app');
BEGIN
  FOR g IN SELECT * FROM (VALUES
      ('ConsentAuditRecord',         'SELECT, INSERT'),
      ('ConsentAuditChainHead',      'SELECT, INSERT, UPDATE'),
      ('ConsentSubjectKey',          'SELECT, INSERT, DELETE'),
      ('ConsentSubjectKeyTombstone', 'SELECT'),
      ('ConsentEventDetail',         'SELECT, INSERT, DELETE'),
      ('ConsentPurgeTask',           'SELECT, INSERT, UPDATE, DELETE'),
      ('FlywheelApproachRecord',     'SELECT, INSERT, UPDATE, DELETE'),
      ('FlywheelFewShotExample',     'SELECT, INSERT, UPDATE, DELETE'),
      ('TenantKeyEnvelope',          'SELECT, INSERT, UPDATE')
    ) AS v(tbl, privs)
  LOOP
    CONTINUE WHEN to_regclass(format('public.%I', g.tbl)) IS NULL;
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', g.tbl);
    IF has_app THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM prospector_app', g.tbl);
      EXECUTE format('GRANT %s ON public.%I TO prospector_app', g.privs, g.tbl);
    END IF;
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
      'consent_audit_immutable()', 'consent_chain_head_guard()', 'consent_audit_advance_head()',
      'consent_subject_key_tombstone()', 'consent_tombstone_immutable()', 'tenant_key_envelope_guard()',
      'lgpd_apply_consent_privileges()']
  LOOP
    CONTINUE WHEN to_regprocedure('public.' || f) IS NULL;
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    IF has_app THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM prospector_app', f);
    END IF;
  END LOOP;
END
$$;

SELECT lgpd_apply_consent_privileges();
