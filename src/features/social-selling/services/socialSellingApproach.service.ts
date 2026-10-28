/**
 * socialSellingApproach.service.ts (Passo 037)
 * Serviço de Social Selling com suporte a geração e persistência de rascunhos com expiração.
 */

import {
  InMemorySocialSellingRepository,
  type SocialSellingDraft,
  type SocialSellingRepository,
} from '../infra/PrismaSocialSellingRepository.js';
import { SocialSellingApproachService as CoreService } from '../server/socialSellingApproach.service.js';

export class SocialSellingService extends CoreService {
  constructor(
    private readonly repo: SocialSellingRepository = new InMemorySocialSellingRepository(),
  ) {
    super();
  }

  async createDraft(params: {
    organizationId: string;
    targetCompany: string;
    targetRole: string;
    channel: string;
    content: string;
    ttlHours?: number;
  }): Promise<SocialSellingDraft> {
    if (!params.organizationId) {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }
    return this.repo.saveDraft(params);
  }

  async getDraft(organizationId: string, id: string): Promise<SocialSellingDraft | null> {
    return this.repo.findDraft(organizationId, id);
  }

  async listActiveDrafts(organizationId: string): Promise<SocialSellingDraft[]> {
    return this.repo.listDrafts(organizationId);
  }

  async purgeExpiredDrafts(organizationId: string): Promise<number> {
    return this.repo.deleteExpired(organizationId);
  }
}

export const socialSellingService = new SocialSellingService();
