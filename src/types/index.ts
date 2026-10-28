export type {
  ACTIVITY_STATUS,
  ACTIVITY_TYPE,
  ActivityStatus,
  ActivityType,
  COMPANY_STATUS,
  CONTACT_STATUS,
  CompanyStatus,
  ContactStatus,
  LEAD_STATUS,
  LEAD_TEMPERATURE,
  LeadStatus,
  LeadTemperature,
} from '../lib/zod.js';

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

import type { CompanyStatus, ContactStatus, LeadStatus, LeadTemperature } from '../lib/zod.js';
import type {
  Activity as DomainActivity,
  Attachment as DomainAttachment,
  Company as DomainCompany,
  Contact as DomainContact,
  Lead as DomainLead,
  Note as DomainNote,
  TimelineEvent as DomainTimelineEvent,
  LeadQualification,
} from '../shared/types/crm.js';

export type { LeadQualification };

export interface Company extends Omit<DomainCompany<string>, 'status'> {
  status: CompanyStatus;
}

export interface Contact extends Omit<DomainContact<string>, 'status'> {
  status: ContactStatus;
}

export interface Lead extends Omit<DomainLead<string>, 'status' | 'temperature'> {
  status: LeadStatus;
  temperature?: LeadTemperature | null;
}

export interface Activity extends DomainActivity<string> {}

export type TimelineEvent = DomainTimelineEvent<string>;
export type Note = DomainNote<string>;
export type Attachment = DomainAttachment<string>;
