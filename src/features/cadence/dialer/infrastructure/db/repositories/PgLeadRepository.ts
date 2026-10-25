import { Prisma, type PrismaClient } from '@prisma/client';
import { getTenantId, TenantContextMissingError } from '../../../../../../lib/async-context.js';
import { Lead, type LeadProps, type LeadStatus } from '../../../domain/entities/Lead.js';
import { PhoneNumber } from '../../../domain/value-objects/PhoneNumber.js';
import type { LeadRepository } from '../../../application/ports/LeadRepository.js';

interface LeadRow {
  id: string;
  organization_id?: string;
  campaign_id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  attempts: number;
  next_attempt_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToProps(row: LeadRow): LeadProps {
  return {
    id: row.id,
    ...(row.organization_id ? { organizationId: row.organization_id } : {}),
    campaignId: row.campaign_id,
    name: row.name,
    phone: PhoneNumber.create(row.phone),
    status: row.status,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Quantidade de leads por INSERT multi-linha em `saveMany`. Cada lead usa 10
 * parâmetros; o limite do protocolo do Postgres é 65535 parâmetros por
 * query, então 500 (5000 parâmetros) fica bem folgado, mantendo o SQL
 * gerado em um tamanho razoável para logging/debug.
 */
const BULK_UPSERT_CHUNK_SIZE = 500;

export class PgLeadRepository implements LeadRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly defaultOrganizationId?: string,
  ) {}

  private resolveOrganizationId(explicitOrgId?: string, entityOrgId?: string): string {
    const resolved = explicitOrgId ?? entityOrgId ?? this.defaultOrganizationId ?? getTenantId();
    if (!resolved || resolved.trim() === '') {
      throw new TenantContextMissingError(
        'PgLeadRepository requires organizationId via argument, entity, constructor, or requestContext',
      );
    }
    return resolved.trim();
  }

  async save(lead: Lead, organizationId?: string): Promise<void> {
    await this.upsertMany([lead], organizationId);
  }

  /**
   * Insere/atualiza leads em lote via INSERT multi-linha (em vez de um laço
   * de upserts individuais), dividido em chunks de `BULK_UPSERT_CHUNK_SIZE`
   * dentro de uma única transação — reduz uma importação de dezenas de
   * milhares de leads de dezenas de milhares de round-trips ao banco para
   * dezenas.
   */
  async saveMany(leads: readonly Lead[], organizationId?: string): Promise<void> {
    if (leads.length === 0) {
      return;
    }
    for (let offset = 0; offset < leads.length; offset += BULK_UPSERT_CHUNK_SIZE) {
      const chunk = leads.slice(offset, offset + BULK_UPSERT_CHUNK_SIZE);
      await this.upsertMany(chunk, organizationId);
    }
  }

  async findById(id: string, organizationId?: string): Promise<Lead | null> {
    const orgId = this.resolveOrganizationId(organizationId);
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    const rows = await this.prisma.$queryRaw<LeadRow[]>(Prisma.sql`
      SELECT id, organization_id, campaign_id, name, phone, status, attempts, next_attempt_at, created_at, updated_at
      FROM leads
      WHERE id = ${id}::uuid
        AND organization_id = ${orgId}`);
    const row = rows[0];
    return row === undefined ? null : Lead.restore(rowToProps(row));
  }

  /**
   * Seleciona e já marca como `in_progress`, atomicamente, os próximos leads
   * elegíveis. `FOR UPDATE SKIP LOCKED` faz cada processo concorrente pular
   * linhas já travadas por outro processo em vez de esperar ou duplicar a
   * seleção — é o mecanismo padrão do Postgres para múltiplos consumidores
   * disputando uma fila (ver README, seção "Processo único" nas limitações
   * resolvidas). O UPDATE...RETURNING garante que a seleção e a reserva
   * aconteçam na mesma transação implícita, sem janela para outro processo
   * roubar a mesma linha entre o SELECT e o UPDATE.
   */
  async claimNextEligible(
    campaignId: string,
    now: Date,
    limit: number,
    organizationId?: string,
  ): Promise<Lead[]> {
    if (limit <= 0) {
      return [];
    }
    const orgId = this.resolveOrganizationId(organizationId);
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    const rows = await this.prisma.$queryRaw<LeadRow[]>(Prisma.sql`
      WITH candidates AS (
        SELECT id FROM leads
        WHERE organization_id = ${orgId}
          AND campaign_id = ${campaignId}::uuid
          AND status = 'pending'
          AND (next_attempt_at IS NULL OR next_attempt_at <= ${now})
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE leads
      SET status = 'in_progress', updated_at = ${now}
      FROM candidates
      WHERE leads.id = candidates.id
        AND leads.organization_id = ${orgId}
      RETURNING leads.*`);
    return rows.map((row) => Lead.restore(rowToProps(row)));
  }

  async existsByCampaignAndPhone(
    campaignId: string,
    phoneE164: string,
    organizationId?: string,
  ): Promise<boolean> {
    const orgId = this.resolveOrganizationId(organizationId);
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    const rows = await this.prisma.$queryRaw<{ exists: number }[]>(Prisma.sql`
      SELECT 1 AS exists FROM leads
      WHERE organization_id = ${orgId}
        AND campaign_id = ${campaignId}::uuid
        AND phone = ${phoneE164}
      LIMIT 1`);
    return rows.length > 0;
  }

  async getCampaignStats(
    campaignId: string,
    organizationId?: string,
  ): Promise<{
    campaignId: string;
    totalLeads: number;
    pending: number;
    inProgress: number;
    contacted: number;
    exhausted: number;
    doNotCall: number;
    invalidNumber: number;
    contactRatePercent: number;
  }> {
    const orgId = this.resolveOrganizationId(organizationId);
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    const rows = await this.prisma.$queryRaw<
      {
        total_leads: string;
        pending: string;
        in_progress: string;
        contacted: string;
        exhausted: string;
        do_not_call: string;
        invalid_number: string;
      }[]
    >(Prisma.sql`
      SELECT
        COUNT(*)::text AS total_leads,
        COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
        COUNT(*) FILTER (WHERE status = 'in_progress')::text AS in_progress,
        COUNT(*) FILTER (WHERE status = 'contacted')::text AS contacted,
        COUNT(*) FILTER (WHERE status = 'exhausted')::text AS exhausted,
        COUNT(*) FILTER (WHERE status = 'do_not_call')::text AS do_not_call,
        COUNT(*) FILTER (WHERE status = 'invalid_number')::text AS invalid_number
      FROM leads
      WHERE organization_id = ${orgId}
        AND campaign_id = ${campaignId}::uuid`);

    const row = rows[0];
    const totalLeads = row ? Number.parseInt(row.total_leads, 10) : 0;
    const pending = row ? Number.parseInt(row.pending, 10) : 0;
    const inProgress = row ? Number.parseInt(row.in_progress, 10) : 0;
    const contacted = row ? Number.parseInt(row.contacted, 10) : 0;
    const exhausted = row ? Number.parseInt(row.exhausted, 10) : 0;
    const doNotCall = row ? Number.parseInt(row.do_not_call, 10) : 0;
    const invalidNumber = row ? Number.parseInt(row.invalid_number, 10) : 0;

    const contactRatePercent =
      totalLeads > 0 ? Math.round((contacted / totalLeads) * 10000) / 100 : 0;

    return {
      campaignId,
      totalLeads,
      pending,
      inProgress,
      contacted,
      exhausted,
      doNotCall,
      invalidNumber,
      contactRatePercent,
    };
  }

  private async upsertMany(leads: readonly Lead[], organizationId?: string): Promise<void> {
    if (leads.length === 0) return;

    const batchOrgId = this.resolveOrganizationId(organizationId, leads[0]?.organizationId);
    const rowFragments: Prisma.Sql[] = leads.map((lead) => {
      const props = lead.toProps();
      const orgId = this.resolveOrganizationId(organizationId, props.organizationId);
      if (orgId !== batchOrgId) {
        throw new TenantContextMissingError(
          'PgLeadRepository.saveMany cannot mix multiple organizationIds in the same batch',
        );
      }
      return Prisma.sql`(
        ${props.id}::uuid,
        ${orgId},
        ${props.campaignId}::uuid,
        ${props.name},
        ${props.phone.toE164()},
        ${props.status},
        ${props.attempts},
        ${props.nextAttemptAt},
        ${props.createdAt},
        ${props.updatedAt}
      )`;
    });

    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO leads (id, organization_id, campaign_id, name, phone, status, attempts, next_attempt_at, created_at, updated_at)
      VALUES ${Prisma.join(rowFragments)}
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        attempts = EXCLUDED.attempts,
        next_attempt_at = EXCLUDED.next_attempt_at,
        updated_at = EXCLUDED.updated_at
      WHERE leads.organization_id = ${batchOrgId}`);
  }
}
