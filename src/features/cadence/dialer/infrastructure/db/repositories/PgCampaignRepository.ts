import { Prisma, type PrismaClient } from '@prisma/client';
import { getTenantId, TenantContextMissingError } from '../../../../../../lib/async-context.js';
import {
  Campaign,
  type CampaignProps,
  type CampaignStatus,
} from '../../../domain/entities/Campaign.js';
import type { CampaignRepository } from '../../../application/ports/CampaignRepository.js';

interface CampaignRow {
  id: string;
  organization_id?: string;
  name: string;
  status: CampaignStatus;
  created_at: Date;
  updated_at: Date;
}

function rowToProps(row: CampaignRow): CampaignProps {
  return {
    id: row.id,
    ...(row.organization_id ? { organizationId: row.organization_id } : {}),
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgCampaignRepository implements CampaignRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly defaultOrganizationId?: string,
  ) {}

  private resolveOrganizationId(explicitOrgId?: string, entityOrgId?: string): string {
    const resolved = explicitOrgId ?? entityOrgId ?? this.defaultOrganizationId ?? getTenantId();
    if (!resolved || resolved.trim() === '') {
      throw new TenantContextMissingError(
        'PgCampaignRepository requires organizationId via argument, entity, constructor, or requestContext',
      );
    }
    return resolved.trim();
  }

  async save(campaign: Campaign, organizationId?: string): Promise<void> {
    const props = campaign.toProps();
    const orgId = this.resolveOrganizationId(organizationId, props.organizationId);
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO campaigns (id, organization_id, name, status, created_at, updated_at)
      VALUES (
        ${props.id}::uuid,
        ${orgId},
        ${props.name},
        ${props.status},
        ${props.createdAt},
        ${props.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
      WHERE campaigns.organization_id = ${orgId}`);
  }

  async findById(id: string, organizationId?: string): Promise<Campaign | null> {
    const orgId = this.resolveOrganizationId(organizationId);
    const rows = await this.prisma.$queryRaw<CampaignRow[]>(Prisma.sql`
      SELECT id, organization_id, name, status, created_at, updated_at
      FROM campaigns
      WHERE id = ${id}::uuid
        AND organization_id = ${orgId}`);
    const row = rows[0];
    return row === undefined ? null : Campaign.restore(rowToProps(row));
  }

  async findActive(organizationId?: string): Promise<Campaign[]> {
    const orgId = this.resolveOrganizationId(organizationId);
    const rows = await this.prisma.$queryRaw<CampaignRow[]>(Prisma.sql`
      SELECT id, organization_id, name, status, created_at, updated_at
      FROM campaigns
      WHERE organization_id = ${orgId}
        AND status = 'active'
      ORDER BY created_at DESC`);
    return rows.map((row) => Campaign.restore(rowToProps(row)));
  }

  async findAll(organizationId?: string): Promise<Campaign[]> {
    const orgId = this.resolveOrganizationId(organizationId);
    const rows = await this.prisma.$queryRaw<CampaignRow[]>(Prisma.sql`
      SELECT id, organization_id, name, status, created_at, updated_at
      FROM campaigns
      WHERE organization_id = ${orgId}
      ORDER BY created_at DESC`);
    return rows.map((row) => Campaign.restore(rowToProps(row)));
  }
}
