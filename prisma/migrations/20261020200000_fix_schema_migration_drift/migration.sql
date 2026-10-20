-- Drift-fix (DATA-007 / CI "Verificar deriva de schema/migration"): alinha o banco migrado ao
-- prisma/schema.prisma sem DROP de objetos reais. Itens que a DSL do Prisma expressa (gin/trgm,
-- FK Attachment CASCADE, default de DocumentEmbedding.updatedAt, KnowledgeChunk legado @@ignore,
-- índices únicos parciais) foram resolvidos no schema; aqui só o que faltava no banco.
-- Depende de nada novo; aplicar DEPOIS de 20261020190000 (REMED-02, PR #18) se ambos entrarem.

-- Índices declarados no schema que nunca foram criados por nenhuma migration.
CREATE INDEX IF NOT EXISTS "Activity_leadId_idx" ON "Activity"("leadId");
CREATE INDEX IF NOT EXISTS "Activity_organizationId_status_idx" ON "Activity"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Contact_companyId_idx" ON "Contact"("companyId");
CREATE INDEX IF NOT EXISTS "Lead_companyId_idx" ON "Lead"("companyId");
CREATE INDEX IF NOT EXISTS "Lead_contactId_idx" ON "Lead"("contactId");
CREATE INDEX IF NOT EXISTS "Note_leadId_idx" ON "Note"("leadId");

-- Nomes > 63 bytes truncados silenciosamente pelo Postgres: renomeia para o nome truncado que o
-- Prisma calcula (mesmos objetos, só o nome muda).
ALTER TABLE "AccountRecommendation" RENAME CONSTRAINT "AccountRecommendation_accountScoreId_organizationId_companyId_f" TO "AccountRecommendation_accountScoreId_organizationId_compan_fkey";
ALTER TABLE "EconomicRelationship" RENAME CONSTRAINT "EconomicRelationship_snapshotId_organizationId_sourceCompanyId_" TO "EconomicRelationship_snapshotId_organizationId_sourceCompa_fkey";
ALTER INDEX IF EXISTS "AccountIntelligenceSnapshot_organizationId_companyId_generatedA" RENAME TO "AccountIntelligenceSnapshot_organizationId_companyId_genera_idx";
ALTER INDEX IF EXISTS "AccountIntelligenceSnapshot_organizationId_companyId_version_ke" RENAME TO "AccountIntelligenceSnapshot_organizationId_companyId_versio_key";
ALTER INDEX IF EXISTS "AccountRecommendation_organizationId_companyId_actionType_input" RENAME TO "AccountRecommendation_organizationId_companyId_actionType_i_key";
ALTER INDEX IF EXISTS "AccountRecommendation_organizationId_companyId_status_generated" RENAME TO "AccountRecommendation_organizationId_companyId_status_gener_idx";
ALTER INDEX IF EXISTS "AccountScore_organizationId_companyId_scoreVersion_inputHash_ke" RENAME TO "AccountScore_organizationId_companyId_scoreVersion_inputHas_key";
ALTER INDEX IF EXISTS "MarketIntelligenceCompany_datasetId_municipioIbge_situacao_idx" RENAME TO "MarketIntelligenceCompany_datasetId_municipioIbge_situacaoC_idx";
ALTER INDEX IF EXISTS "TemporaryCapabilityGrant_organizationId_granteeId_capabili_idx" RENAME TO "TemporaryCapabilityGrant_organizationId_granteeId_capabilit_idx";
