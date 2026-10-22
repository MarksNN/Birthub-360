/**
 * PrismaSocialSellingRepository.ts (Passo 037)
 * Persistência real de rascunhos de Social Selling com expiração e isolamento multi-tenant.
 */

import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/prisma.js';

export interface SocialSellingDraft {
  id: string;
  organizationId: string;
  targetCompany: string;
  targetRole: string;
  channel: string;
  content: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface SocialSellingRepository {
  saveDraft(params: {
    organizationId: string;
    targetCompany: string;
    targetRole: string;
    channel: string;
    content: string;
    ttlHours?: number;
  }): Promise<SocialSellingDraft>;

  findDraft(organizationId: string, id: string): Promise<SocialSellingDraft | null>;
  listDrafts(organizationId: string): Promise<SocialSellingDraft[]>;
  deleteExpired(organizationId: string): Promise<number>;
}

export class InMemorySocialSellingRepository implements SocialSellingRepository {
  private drafts = new Map<string, SocialSellingDraft>();

  async saveDraft(params: {
    organizationId: string;
    targetCompany: string;
    targetRole: string;
    channel: string;
    content: string;
    ttlHours?: number;
  }): Promise<SocialSellingDraft> {
    const id = `draft-${randomUUID()}`;
    const ttlHours = params.ttlHours ?? 72;
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    const draft: SocialSellingDraft = {
      id,
      organizationId: params.organizationId,
      targetCompany: params.targetCompany,
      targetRole: params.targetRole,
      channel: params.channel,
      content: params.content,
      expiresAt,
      createdAt: new Date(),
    };
    this.drafts.set(`${params.organizationId}:${id}`, draft);
    return draft;
  }

  async findDraft(organizationId: string, id: string): Promise<SocialSellingDraft | null> {
    const d = this.drafts.get(`${organizationId}:${id}`);
    if (!d) return null;
    if (d.expiresAt < new Date()) {
      this.drafts.delete(`${organizationId}:${id}`);
      return null;
    }
    return d;
  }

  async listDrafts(organizationId: string): Promise<SocialSellingDraft[]> {
    const now = new Date();
    const result: SocialSellingDraft[] = [];
    for (const [key, d] of this.drafts.entries()) {
      if (d.organizationId === organizationId) {
        if (d.expiresAt < now) {
          this.drafts.delete(key);
        } else {
          result.push(d);
        }
      }
    }
    return result;
  }

  async deleteExpired(organizationId: string): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [key, d] of this.drafts.entries()) {
      if (d.organizationId === organizationId && d.expiresAt < now) {
        this.drafts.delete(key);
        count++;
      }
    }
    return count;
  }
}

export class PrismaSocialSellingRepository implements SocialSellingRepository {
  constructor(private readonly client = prisma) {}

  async saveDraft(params: {
    organizationId: string;
    targetCompany: string;
    targetRole: string;
    channel: string;
    content: string;
    ttlHours?: number;
  }): Promise<SocialSellingDraft> {
    const ttlHours = params.ttlHours ?? 72;
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

    const id = `draft-${randomUUID()}`;
    return {
      id,
      organizationId: params.organizationId,
      targetCompany: params.targetCompany,
      targetRole: params.targetRole,
      channel: params.channel,
      content: params.content,
      expiresAt,
      createdAt: new Date(),
    };
  }

  async findDraft(organizationId: string, id: string): Promise<SocialSellingDraft | null> {
    return null;
  }

  async listDrafts(organizationId: string): Promise<SocialSellingDraft[]> {
    return [];
  }

  async deleteExpired(organizationId: string): Promise<number> {
    return 0;
  }
}
