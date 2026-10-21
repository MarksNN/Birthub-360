-- REMED-06 (handoff 21→01, specs PR #33 @43922b4e + parecer 24 @7a6da4bd).
-- Somente objetos novos; não corrige drift pré-existente (isso é o PR #28).
-- Decisão (Marks, igual ao outbox REMED-05): policies SEM cláusula app.bypass_rls e SEM papel
-- dedicado de bypass. Workers (ex.: ConsentPurgeTask) iteram POR ORGANIZAÇÃO setando
-- app.current_tenant_id. Ver docs/ADR/ADR-006-LGPD-Cadeia-Consentimento-Append-Only.md.

-- CreateEnum
CREATE TYPE "ConsentAuditStatus" AS ENUM ('GRANTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentRevocationReason" AS ENUM ('TITULAR_REQUEST', 'ERASURE_REQUEST', 'PURPOSE_FULFILLED', 'LEGAL_OBLIGATION', 'OPERATOR_CORRECTION');

-- CreateEnum
CREATE TYPE "ConsentPurgeTaskStatus" AS ENUM ('PENDING', 'DONE', 'DEAD');

-- CreateEnum
CREATE TYPE "ConsentChainEventKind" AS ENUM ('GENESIS', 'CONSENT', 'REVOCATION', 'RETRACTION');

-- CreateTable
CREATE TABLE "ConsentAuditRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formatVersion" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" "ConsentChainEventKind" NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "status" "ConsentAuditStatus" NOT NULL,
    "reasonCode" "ConsentRevocationReason",
    "previousHash" CHAR(64) NOT NULL,
    "currentHash" CHAR(64) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "operatorUserId" TEXT,
    "retentionUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "ConsentAuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentAuditChainHead" (
    "organizationId" TEXT NOT NULL,
    "genesisId" TEXT NOT NULL,
    "genesisHash" CHAR(64) NOT NULL,
    "lastSequence" INTEGER NOT NULL,
    "lastHash" CHAR(64) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "ConsentAuditChainHead_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "ConsentSubjectKey" (
    "organizationId" TEXT NOT NULL,
    "lookupId" CHAR(64) NOT NULL,
    "keyMaterial" BYTEA NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "ConsentSubjectKey_pkey" PRIMARY KEY ("organizationId","lookupId")
);

-- CreateTable
CREATE TABLE "ConsentEventDetail" (
    "eventId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subjectLookupId" CHAR(64) NOT NULL,
    "detail" TEXT NOT NULL,
    "retentionUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "ConsentEventDetail_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "ConsentPurgeTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "revocationEventId" TEXT NOT NULL,
    "subjectRef" TEXT,
    "shredSubjectKey" BOOLEAN NOT NULL DEFAULT false,
    "status" "ConsentPurgeTaskStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "retainUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "ConsentPurgeTask_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "ConsentAuditRecord_organizationId_currentHash_key" ON "ConsentAuditRecord"("organizationId", "currentHash");

-- CreateIndex
CREATE INDEX "ConsentEventDetail_organizationId_subjectLookupId_idx" ON "ConsentEventDetail"("organizationId", "subjectLookupId");

-- CreateIndex
CREATE INDEX "ConsentEventDetail_retentionUntil_idx" ON "ConsentEventDetail"("retentionUntil");

-- CreateIndex
CREATE INDEX "ConsentPurgeTask_status_nextAttemptAt_idx" ON "ConsentPurgeTask"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "ConsentPurgeTask_organizationId_status_nextAttemptAt_idx" ON "ConsentPurgeTask"("organizationId", "status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentPurgeTask_organizationId_revocationEventId_key" ON "ConsentPurgeTask"("organizationId", "revocationEventId");

-- CreateIndex
CREATE INDEX "FlywheelApproachRecord_organizationId_leadId_idx" ON "FlywheelApproachRecord"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "FlywheelFewShotExample_organizationId_leadId_idx" ON "FlywheelFewShotExample"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "FlywheelFewShotExample_organizationId_channel_isActive_idx" ON "FlywheelFewShotExample"("organizationId", "channel", "isActive");

-- AddForeignKey
ALTER TABLE "ConsentAuditRecord" ADD CONSTRAINT "ConsentAuditRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditChainHead" ADD CONSTRAINT "ConsentAuditChainHead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentSubjectKey" ADD CONSTRAINT "ConsentSubjectKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEventDetail" ADD CONSTRAINT "ConsentEventDetail_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ConsentAuditRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEventDetail" ADD CONSTRAINT "ConsentEventDetail_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentPurgeTask" ADD CONSTRAINT "ConsentPurgeTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlywheelApproachRecord" ADD CONSTRAINT "FlywheelApproachRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlywheelFewShotExample" ADD CONSTRAINT "FlywheelFewShotExample_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- subjectRef pseudonimizado com HMAC por titular (F2/F3 do #33); GENESIS não tem titular.
ALTER TABLE "ConsentAuditRecord" ADD CONSTRAINT "ConsentAuditRecord_subjectRef_hs256_check"
  CHECK (kind = 'GENESIS' OR "subjectRef" ~ '^hs256:[a-f0-9]{64}$');

-- ─── RLS por organização (GUC app.current_tenant_id, policy tenant_isolation, ENABLE+FORCE, sem bypass)
ALTER TABLE "ConsentAuditRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentAuditRecord" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ConsentAuditChainHead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentAuditChainHead" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ConsentSubjectKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentSubjectKey" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ConsentEventDetail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentEventDetail" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ConsentPurgeTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentPurgeTask" FORCE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelApproachRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelApproachRecord" FORCE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelFewShotExample" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FlywheelFewShotExample" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ConsentAuditRecord" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON "ConsentAuditChainHead" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON "ConsentSubjectKey" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON "ConsentEventDetail" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON "ConsentPurgeTask" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON "FlywheelApproachRecord" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON "FlywheelFewShotExample" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

-- ─── Cadeia: append-only. O trigger vale para QUALQUER papel via DML (inclusive owner/superuser).
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

-- ─── Âncora de cabeça: gênese imutável, lastSequence estritamente crescente, sem DELETE/TRUNCATE.
-- Única exceção: DELETE em cascata vindo de Organization (pg_trigger_depth() > 1 = disparado pela
-- ação RI ON DELETE CASCADE). Isso só ocorre se a org não tiver mais ConsentAuditRecord (FK
-- Restrict), i.e. no offboarding (ver runbook) — nunca por DML direto da aplicação.
CREATE OR REPLACE FUNCTION consent_chain_head_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'ConsentAuditChainHead: TRUNCATE bloqueado' USING ERRCODE = 'insufficient_privilege';
  ELSIF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1 THEN
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

CREATE TRIGGER consent_chain_head_guard_row
BEFORE UPDATE OR DELETE ON "ConsentAuditChainHead"
FOR EACH ROW EXECUTE FUNCTION consent_chain_head_guard();

CREATE TRIGGER consent_chain_head_no_truncate
BEFORE TRUNCATE ON "ConsentAuditChainHead"
FOR EACH STATEMENT EXECUTE FUNCTION consent_chain_head_guard();

-- ─── Tombstone de crypto-shredding: todo DELETE em ConsentSubjectKey deixa prova (sem material de
-- chave) em ConsentSubjectKeyTombstone, que é append-only. O INSERT é feito por função SECURITY
-- DEFINER, então o app só precisa de SELECT no tombstone. RLS (FORCE) continua valendo para o dono.
CREATE TABLE "ConsentSubjectKeyTombstone" (
    "organizationId" TEXT NOT NULL,
    "lookupId" CHAR(64) NOT NULL,
    "keyCreatedAt" TIMESTAMPTZ(3) NOT NULL,
    "shreddedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shreddedBy" TEXT NOT NULL DEFAULT CURRENT_USER,

    CONSTRAINT "ConsentSubjectKeyTombstone_pkey" PRIMARY KEY ("organizationId","lookupId","shreddedAt")
);
ALTER TABLE "ConsentSubjectKeyTombstone" ADD CONSTRAINT "ConsentSubjectKeyTombstone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentSubjectKeyTombstone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentSubjectKeyTombstone" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ConsentSubjectKeyTombstone" FOR ALL
USING ("organizationId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', true));

CREATE OR REPLACE FUNCTION consent_subject_key_tombstone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Em cascata de Organization (offboarding) a org inteira some; não há o que provar por titular.
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  INSERT INTO "ConsentSubjectKeyTombstone" ("organizationId","lookupId","keyCreatedAt","shreddedBy")
  VALUES (OLD."organizationId", OLD."lookupId", OLD."createdAt", session_user);
  RETURN OLD;
END
$$;
REVOKE ALL ON FUNCTION consent_subject_key_tombstone() FROM PUBLIC;

CREATE TRIGGER consent_subject_key_shred_tombstone
AFTER DELETE ON "ConsentSubjectKey"
FOR EACH ROW EXECUTE FUNCTION consent_subject_key_tombstone();

-- Tombstone append-only (mesma função da cadeia). Cascata de Organization é permitida.
CREATE OR REPLACE FUNCTION consent_tombstone_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'ConsentSubjectKeyTombstone é append-only (% bloqueado)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;
CREATE TRIGGER consent_tombstone_no_mutation
BEFORE UPDATE OR DELETE ON "ConsentSubjectKeyTombstone"
FOR EACH ROW EXECUTE FUNCTION consent_tombstone_immutable();
CREATE TRIGGER consent_tombstone_no_truncate
BEFORE TRUNCATE ON "ConsentSubjectKeyTombstone"
FOR EACH STATEMENT EXECUTE FUNCTION consent_tombstone_immutable();

-- ─── Privilégios mínimos (Agente 15): função idempotente, re-aplicada também por
-- scripts/db/create-app-role.sql depois do bootstrap (que faz GRANT ALL ON ALL TABLES e
-- transfere posse — as tabelas LGPD ficam FORA dessa transferência).
--   Record ........ SELECT, INSERT                    (append-only)
--   ChainHead ..... SELECT, INSERT, UPDATE            (UPDATE só avança lastSequence — trigger)
--   SubjectKey .... SELECT, INSERT, DELETE            (crypto-shredding; tombstone automático)
--   KeyTombstone .. SELECT                            (INSERT só via trigger SECURITY DEFINER)
--   EventDetail ... SELECT, INSERT, DELETE            (texto livre expurgável)
--   PurgeTask ..... SELECT, INSERT, UPDATE, DELETE    (outbox; DELETE = retenção DONE/DEAD)
--   Flywheel* ..... SELECT, INSERT, UPDATE, DELETE    (expurgo por titular no #33)
CREATE OR REPLACE FUNCTION lgpd_apply_consent_privileges() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  g record;
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
      ('FlywheelFewShotExample',     'SELECT, INSERT, UPDATE, DELETE')
    ) AS v(tbl, privs)
  LOOP
    CONTINUE WHEN to_regclass(format('public.%I', g.tbl)) IS NULL;
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', g.tbl);
    IF has_app THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM prospector_app', g.tbl);
      EXECUTE format('GRANT %s ON public.%I TO prospector_app', g.privs, g.tbl);
    END IF;
  END LOOP;
END
$$;
REVOKE ALL ON FUNCTION lgpd_apply_consent_privileges() FROM PUBLIC;

SELECT lgpd_apply_consent_privileges();
