import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryConsumptionStore } from '../../../src/lib/queue/outbox/inMemory.js';
import {
  GamificationAwardService,
} from '../../../src/features/gamification/services/gamificationAward.service.js';
import { BehavioralEngineService } from '../../../src/features/gamification/services/behavioralEngine.service.js';

describe('Gamification Award Idempotency (Passo 034)', () => {
  let consumptionStore: InMemoryConsumptionStore;
  let behavioralService: BehavioralEngineService;
  let awardService: GamificationAwardService;

  const organizationId = 'org-gamification-test';
  const sellerId = 'seller-joao-silva';
  const dealId = 'deal-big-corp-001';
  const dealValue = 50000;

  beforeEach(() => {
    consumptionStore = new InMemoryConsumptionStore();
    behavioralService = new BehavioralEngineService();
    awardService = new GamificationAwardService(consumptionStore, behavioralService);
  });

  it('deve conceder XP na primeira execução de fechamento de negócio', async () => {
    const result = await awardService.awardDealWon({
      organizationId,
      dealId,
      sellerId,
      dealValue,
    });

    expect(result.awarded).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(result.xpGranted).toBeGreaterThan(500);
    expect(result.totalXp).toBe(result.xpGranted);
  });

  it('deve bloquear reenvios duplicados do mesmo deal sem duplicar a pontuação do vendedor', async () => {
    // 1º Envio
    const firstResult = await awardService.awardDealWon({
      organizationId,
      dealId,
      sellerId,
      dealValue,
    });
    expect(firstResult.awarded).toBe(true);
    expect(firstResult.isDuplicate).toBe(false);
    const initialXp = firstResult.totalXp;

    // 2º Envio (Reenvio idêntico)
    const secondResult = await awardService.awardDealWon({
      organizationId,
      dealId,
      sellerId,
      dealValue,
    });
    expect(secondResult.awarded).toBe(false);
    expect(secondResult.isDuplicate).toBe(true);
    expect(secondResult.xpGranted).toBe(0);

    // 3º Envio (Tentativa concorrente/repetida)
    const thirdResult = await awardService.awardDealWon({
      organizationId,
      dealId,
      sellerId,
      dealValue,
    });
    expect(thirdResult.awarded).toBe(false);
    expect(thirdResult.isDuplicate).toBe(true);
    expect(thirdResult.xpGranted).toBe(0);
  });

  it('deve isolar a idempotência por tenant diferente com mesmo dealId externo', async () => {
    const otherOrgId = 'org-gamification-beta';

    const resA = await awardService.awardDealWon({
      organizationId,
      dealId,
      sellerId,
      dealValue,
    });
    expect(resA.awarded).toBe(true);

    const resB = await awardService.awardDealWon({
      organizationId: otherOrgId,
      dealId,
      sellerId: 'seller-maria',
      dealValue,
    });
    expect(resB.awarded).toBe(true);
  });
});
