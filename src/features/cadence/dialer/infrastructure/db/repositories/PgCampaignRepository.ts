import { Prisma, type PrismaClient } from '@prisma/client';
import {
  Campaign,
  type CampaignProps,
  type CampaignStatus,
} from '../../../domain/entities/Campaign.js';
import type { CampaignRepository } from '../../../application/ports/CampaignRepository.js';

interface CampaignRow {
  id: string;
  name: string;
  status: CampaignStatus;
  created_at: Date;
  updated_at: Date;
}

function rowToProps(row: CampaignRow): CampaignProps {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgCampaignRepository implements CampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(campaign: Campaign): Promise<void> {
    const props = campaign.toProps();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO campaigns (id, name, status, created_at, updated_at)
      VALUES (
        ${props.id}::uuid,
        ${props.name},
        ${props.status},
        ${props.createdAt},
        ${props.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at`);
  }

  async findById(id: string): Promise<Campaign | null> {
    const rows = await this.prisma.$queryRaw<CampaignRow[]>(Prisma.sql`
      SELECT id, name, status, created_at, updated_at
      FROM campaigns
      WHERE id = ${id}::uuid`);
    const row = rows[0];
    return row === undefined ? null : Campaign.restore(rowToProps(row));
  }

  async findActive(): Promise<Campaign[]> {
    const rows = await this.prisma.$queryRaw<CampaignRow[]>(Prisma.sql`
      SELECT id, name, status, created_at, updated_at
      FROM campaigns
      WHERE status = 'active'
      ORDER BY created_at DESC`);
    return rows.map((row) => Campaign.restore(rowToProps(row)));
  }

  async findAll(): Promise<Campaign[]> {
    const rows = await this.prisma.$queryRaw<CampaignRow[]>(Prisma.sql`
      SELECT id, name, status, created_at, updated_at
      FROM campaigns
      ORDER BY created_at DESC`);
    return rows.map((row) => Campaign.restore(rowToProps(row)));
  }
}
