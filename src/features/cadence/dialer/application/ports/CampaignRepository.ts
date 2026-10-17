import type { Campaign } from '../../domain/entities/Campaign.js';

export interface CampaignRepository {
  save(campaign: Campaign, organizationId?: string): Promise<void>;
  findById(id: string, organizationId?: string): Promise<Campaign | null>;
  findActive(organizationId?: string): Promise<Campaign[]>;
  findAll(organizationId?: string): Promise<Campaign[]>;
}
