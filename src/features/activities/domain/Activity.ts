import type { ActivityStatus, ActivityType } from '../../../lib/zod.js';
import type { Repository } from '../../../shared/domain/Repository.js';

import type { Activity } from '../../../shared/types/crm.js';

export type { Activity };

export interface ActivityListFilters {
  leadId?: string;
  status?: ActivityStatus;
  type?: ActivityType;
}

export interface ActivityPage {
  data: Activity[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ActivityRepository extends Repository<Activity> {
  findAllWithFilters(organizationId: string, dateStr?: string): Promise<Activity[]>;
  findAllPaginated(
    organizationId: string,
    dateStr?: string,
    page?: number,
    limit?: number,
    filters?: ActivityListFilters,
  ): Promise<ActivityPage>;
  findRange(organizationId: string, from: Date, to: Date): Promise<Activity[]>;
  createWithTimeline(
    organizationId: string,
    data: Partial<Activity> & {
      type: ActivityType;
      status: ActivityStatus;
      leadId: string;
      date: string | Date;
    },
  ): Promise<Activity>;
  updateWithTimeline(
    organizationId: string,
    id: string,
    data: Partial<Activity> & {
      type?: ActivityType;
      status?: ActivityStatus;
      date?: string | Date;
    },
  ): Promise<Activity>;
}
