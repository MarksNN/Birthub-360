import type { LeadFunnel, LeadStatus, LeadTemperature } from '@prisma/client';
import type { Repository } from '../../../shared/domain/Repository.js';

import type { Lead } from '../../../shared/types/crm.js';

export type { Lead };

export interface LeadRepository extends Repository<Lead> {
  findAllWithFilters(
    organizationId: string,
    status?: string,
    page?: number,
    limit?: number,
    funnel?: LeadFunnel,
    query?: string,
  ): Promise<{ data: Lead[]; meta: unknown }>;
  updateStatus(organizationId: string, id: string, newStatus: string): Promise<Lead>;
  findAllForExport(organizationId: string): Promise<Lead[]>;
}
