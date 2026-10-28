import type { Repository } from '../../../shared/domain/Repository.js';

export type AttachmentEntityType = 'lead' | 'company' | 'contact';

import type { Attachment } from '../../../shared/types/crm.js';

export type { Attachment };

export interface CreateAttachmentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  objectKey: string;
  uploadedBy: string | null;
}

export interface AttachmentRepository extends Repository<Attachment> {
  verifyEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<boolean>;
  findByEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<Attachment[]>;
  createForEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
    input: CreateAttachmentInput,
  ): Promise<Attachment>;
  findOwned(organizationId: string, attachmentId: string): Promise<Attachment | null>;
}
