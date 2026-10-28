import type { Repository } from '../../../shared/domain/Repository.js';

export type NoteEntityType = 'lead' | 'company' | 'contact';

import type { Note } from '../../../shared/types/crm.js';

export type { Note };

export interface NoteRepository extends Repository<Note> {
  findByEntity(
    organizationId: string,
    entityType: NoteEntityType,
    entityId: string,
  ): Promise<Note[]>;
  createForEntity(
    organizationId: string,
    entityType: NoteEntityType,
    entityId: string,
    content: string,
    author: string,
  ): Promise<Note>;
  verifyEntity(
    organizationId: string,
    entityType: NoteEntityType,
    entityId: string,
  ): Promise<boolean>;
}
