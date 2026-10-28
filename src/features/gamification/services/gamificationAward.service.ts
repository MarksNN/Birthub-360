/**
 * gamificationAward.service.ts (Passo 034)
 * Atribuição idempotente de pontos e medalhas de gamificação por deal ganho.
 */

import { logger } from '../../../lib/logger.js';
import { InMemoryConsumptionStore } from '../../../lib/queue/outbox/inMemory.js';
import type { ConsumptionStore } from '../../../lib/queue/outbox/outbox.ports.js';
import { behavioralEngineService } from './behavioralEngine.service.js';

export interface GamificationAwardResult {
  awarded: boolean;
  isDuplicate: boolean;
  xpGranted: number;
  sellerId: string;
  totalXp: number;
  level: number;
}

export class GamificationAwardService {
  constructor(
    private readonly consumptionStore: ConsumptionStore = new InMemoryConsumptionStore(),
    private readonly behavioralService = behavioralEngineService,
  ) {}

  /**
   * Concede XP por fechamento de negócio garantindo idempotência estrita via DomainEventConsumption.
   */
  async awardDealWon(params: {
    organizationId: string;
    dealId: string;
    sellerId: string;
    dealValue: number;
    idempotencyKey?: string;
  }): Promise<GamificationAwardResult> {
    const { organizationId, dealId, sellerId, dealValue } = params;
    if (!organizationId || !sellerId || !dealId) {
      throw new Error('Parâmetros obrigatórios ausentes para concessão de gamificação');
    }

    const eventId = params.idempotencyKey || `deal-won:${dealId}`;
    const consumer = 'gamification-award-processor';
    const owner = `worker-${sellerId}`;
    const now = new Date();

    // 1. Tentar reservar o consumo para garantir idempotência contra reenvios
    const reserved = await this.consumptionStore.reserve({
      organizationId,
      eventId,
      consumer,
      owner,
      now,
      leaseMs: 60000,
    });

    if (!reserved) {
      logger.info(
        { org: organizationId, dealId, sellerId, eventId },
        '[GamificationAward] Reenvio duplicado ignorado por idempotência',
      );
      return {
        awarded: false,
        isDuplicate: true,
        xpGranted: 0,
        sellerId,
        totalXp: 0,
        level: 1,
      };
    }

    try {
      // 2. Calcular XP: base 500 XP + 1 XP por R$ 100 de valor ganho (teto 2000 XP)
      const bonusXp = Math.min(1500, Math.floor(dealValue / 100));
      const totalAwardXp = 500 + bonusXp;

      const reward = await this.behavioralService.rewardSellerXp({
        organizationId,
        sellerId,
        xpAmount: totalAwardXp,
        reason: `Deal ganho #${dealId}`,
        activityType: 'DEAL_WON',
      });

      // 3. Confirmar consumo com sucesso
      await this.consumptionStore.complete({
        organizationId,
        eventId,
        consumer,
        owner,
        now: new Date(),
      });

      return {
        awarded: true,
        isDuplicate: false,
        xpGranted: totalAwardXp,
        sellerId,
        totalXp: reward.newXp,
        level: reward.level,
      };
    } catch (err) {
      // 4. Liberar em caso de falha transitória
      await this.consumptionStore.release({
        organizationId,
        eventId,
        consumer,
        owner,
      });
      throw err;
    }
  }
}

export const gamificationAwardService = new GamificationAwardService();
