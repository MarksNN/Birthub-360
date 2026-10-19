import { beforeEach, describe, expect, it } from 'vitest';
import { behavioralEngineService } from '../../../src/features/gamification/services/behavioralEngine.service.js';

describe('BehavioralEngineService — Eixo 4 (Gamificação Adaptativa)', () => {
  const orgA = 'org-test-alpha';
  const orgB = 'org-test-beta';

  beforeEach(() => {
    behavioralEngineService.clear();
  });

  describe('Detecção de Gargalos Comerciais Reais', () => {
    it('deve rejeitar julgamento precipitado quando a amostra for insuficiente (< 10 atividades)', async () => {
      const bottlenecks = await behavioralEngineService.detectBottlenecks({
        organizationId: orgA,
        sellerId: 'user-junior-01',
        sellerName: 'Vendedor Júnior',
        performanceMetrics: {
          callsCount: 4,
          meetingsCount: 1,
          qualifiedCount: 0,
          dealsClosed: 0,
          wonRevenue: 0,
          conversionRatePercent: 0,
        },
      });

      // Amostra insuficiente (5 atividades) -> nenhuma penalidade ou gargalo injusto
      expect(bottlenecks).toEqual([]);
    });

    it('deve identificar gargalo de conversão de cold calls quando amostra for suficiente mas conversão for baixa', async () => {
      const bottlenecks = await behavioralEngineService.detectBottlenecks({
        organizationId: orgA,
        sellerId: 'user-seller-02',
        sellerName: 'Lucas SDR',
        performanceMetrics: {
          callsCount: 30,
          meetingsCount: 1, // 3.3% conversão (< 8%)
          qualifiedCount: 1,
          dealsClosed: 0,
          wonRevenue: 0,
          conversionRatePercent: 3.3,
        },
      });

      expect(bottlenecks.length).toBeGreaterThanOrEqual(1);
      const callBottleneck = bottlenecks.find((b) => b.metric === 'cold_call_conversion');
      expect(callBottleneck).toBeDefined();
      expect(callBottleneck?.severity).toBe('HIGH');
      expect(callBottleneck?.observedValue).toBe(3.3);
      expect(callBottleneck?.context).toContain('benchmark do time: 12%');
    });

    it('deve identificar gargalo de contorno de objeção de preço a partir de motivos de perda', async () => {
      const bottlenecks = await behavioralEngineService.detectBottlenecks({
        organizationId: orgA,
        sellerId: 'user-closer-03',
        sellerName: 'Roberto Closer',
        performanceMetrics: {
          callsCount: 10,
          meetingsCount: 12,
          qualifiedCount: 8,
          dealsClosed: 1,
          wonRevenue: 15000,
          conversionRatePercent: 12.5,
          topLossReason: 'Preço acima do orçamento do cliente',
        },
      });

      const priceBottleneck = bottlenecks.find((b) => b.metric === 'price_objection_handling');
      expect(priceBottleneck).toBeDefined();
      expect(priceBottleneck?.severity).toBe('HIGH');
      expect(priceBottleneck?.context).toContain('ancoragem de valor');
    });

    it('deve bloquear execução sem organizationId por garantia de Tenancy', async () => {
      await expect(
        behavioralEngineService.detectBottlenecks({
          organizationId: '',
          sellerId: 'user-01',
          sellerName: 'Vendedor',
          performanceMetrics: {
            callsCount: 20,
            meetingsCount: 5,
            qualifiedCount: 2,
            dealsClosed: 1,
            wonRevenue: 10000,
            conversionRatePercent: 20,
          },
        }),
      ).rejects.toThrow(/Tenancy violation/);
    });
  });

  describe('Ciclo de Missões Adaptativas e Premiação Backend-Only', () => {
    it('deve gerar missão personalizada coerente com o gargalo detectado', async () => {
      const bottleneck = {
        id: 'btn-price-01',
        organizationId: orgA,
        sellerId: 'seller-roberto',
        sellerName: 'Roberto Closer',
        metric: 'price_objection_handling' as const,
        severity: 'HIGH' as const,
        observedValue: 1.0,
        benchmarkValue: 0.0,
        sampleSize: 15,
        detectedAt: new Date().toISOString(),
        confidence: 0.9,
        context: 'Objeção de preço recorrente',
      };

      const mission = await behavioralEngineService.generateAdaptiveMission({
        organizationId: orgA,
        bottleneck,
      });

      expect(mission.id).toBeDefined();
      expect(mission.title).toBe('Negociador de Elite');
      expect(mission.status).toBe('SUGGESTED');
      expect(mission.reward.xp).toBe(180);
      expect(mission.reward.badgeId).toBe('CLOSER_ELITE');
      expect(mission.verifiableCriteria.targetCount).toBe(3);
      expect(mission.verifiableCriteria.minScore).toBe(85);
    });

    it('deve permitir aceite da missão pelo vendedor legítimo', async () => {
      const bottleneck = {
        id: 'btn-qual-02',
        organizationId: orgA,
        sellerId: 'seller-lucas',
        sellerName: 'Lucas SDR',
        metric: 'opportunity_qualification' as const,
        severity: 'MEDIUM' as const,
        observedValue: 20.0,
        benchmarkValue: 50.0,
        sampleSize: 10,
        detectedAt: new Date().toISOString(),
        confidence: 0.85,
        context: 'Qualificação baixa',
      };

      const mission = await behavioralEngineService.generateAdaptiveMission({
        organizationId: orgA,
        bottleneck,
      });

      // Vendedor incorreto tenta aceitar -> erro
      await expect(
        behavioralEngineService.acceptMission(orgA, mission.id, 'outro-vendedor'),
      ).rejects.toThrow(/pertence a outro vendedor/);

      // Vendedor legítimo aceita
      const accepted = await behavioralEngineService.acceptMission(orgA, mission.id, 'seller-lucas');
      expect(accepted.status).toBe('IN_PROGRESS');
      expect(accepted.acceptedAt).toBeDefined();
    });

    it('deve validar conclusão e conceder XP/badge pelo backend com rigorosa idempotência', async () => {
      const bottleneck = {
        id: 'btn-price-03',
        organizationId: orgA,
        sellerId: 'seller-carla',
        sellerName: 'Carla Executiva',
        metric: 'price_objection_handling' as const,
        severity: 'HIGH' as const,
        observedValue: 1.0,
        benchmarkValue: 0.0,
        sampleSize: 20,
        detectedAt: new Date().toISOString(),
        confidence: 0.95,
        context: 'Objeção de preço',
      };

      const mission = await behavioralEngineService.generateAdaptiveMission({
        organizationId: orgA,
        bottleneck,
      });
      await behavioralEngineService.acceptMission(orgA, mission.id, 'seller-carla');

      // Tentativa com critério insuficiente (só 2 simulações em vez de 3) -> erro
      await expect(
        behavioralEngineService.claimMissionReward({
          organizationId: orgA,
          missionId: mission.id,
          sellerId: 'seller-carla',
          evidence: {
            completedCount: 2,
            averageScore: 90,
            evidenceHash: 'hash-evidencia-01',
            verifierSource: 'roleplay_engine',
          },
        }),
      ).rejects.toThrow(/Critério não satisfeito/);

      // Tentativa com nota média abaixo do mínimo (82 < 85) -> erro
      await expect(
        behavioralEngineService.claimMissionReward({
          organizationId: orgA,
          missionId: mission.id,
          sellerId: 'seller-carla',
          evidence: {
            completedCount: 3,
            averageScore: 82,
            evidenceHash: 'hash-evidencia-02',
            verifierSource: 'roleplay_engine',
          },
        }),
      ).rejects.toThrow(/Pontuação insuficiente/);

      // Reivindicação válida com evidência completa
      const rewardResult = await behavioralEngineService.claimMissionReward({
        organizationId: orgA,
        missionId: mission.id,
        sellerId: 'seller-carla',
        evidence: {
          completedCount: 3,
          averageScore: 88,
          evidenceHash: 'hash-evidencia-valida-01',
          verifierSource: 'roleplay_engine',
        },
      });

      expect(rewardResult.success).toBe(true);
      expect(rewardResult.awardedXp).toBe(180);
      expect(rewardResult.newTotalXp).toBe(180);
      expect(rewardResult.badgeUnlocked).toBe('CLOSER_ELITE');
      expect(rewardResult.mission.status).toBe('COMPLETED');

      // Re-execução da mesma conclusão com o mesmo hash -> TRAVA DE IDEMPOTÊNCIA
      await expect(
        behavioralEngineService.claimMissionReward({
          organizationId: orgA,
          missionId: mission.id,
          sellerId: 'seller-carla',
          evidence: {
            completedCount: 3,
            averageScore: 88,
            evidenceHash: 'hash-evidencia-valida-01',
            verifierSource: 'roleplay_engine',
          },
        }),
      ).rejects.toThrow(/já foi concluída/);
    });

    it('deve gerar plano de coaching adaptativo baseado nos gargalos', async () => {
      const coaching = await behavioralEngineService.getAdaptiveCoachingPlan({
        organizationId: orgA,
        sellerId: 'seller-carla',
        sellerName: 'Carla Executiva',
        bottlenecks: [
          {
            id: 'btn-1',
            organizationId: orgA,
            sellerId: 'seller-carla',
            sellerName: 'Carla Executiva',
            metric: 'price_objection_handling',
            severity: 'HIGH',
            observedValue: 1.0,
            benchmarkValue: 0.0,
            sampleSize: 15,
            detectedAt: new Date().toISOString(),
            confidence: 0.9,
            context: 'Objeção de preço recorrente',
          },
        ],
      });

      expect(coaching.headline).toContain('Carla Executiva');
      expect(coaching.suggestedRoleplay.focusObjection).toContain('concorrência');
      expect(coaching.objectionMatrixTopic).toContain('TCO');
      expect(coaching.microTrainingAction).toContain('ROI');
    });
  });
});
