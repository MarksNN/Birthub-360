import { describe, expect, it, vi } from 'vitest';
import {
  calculateSellerLevel,
  calculateSellerPoints,
  evaluateBadges,
  type GamificationRepository,
  type SellerScore,
} from '@/features/gamification/domain/Gamification';
import { GamificationUseCases } from '@/features/gamification/application/GamificationUseCases';

describe('Gamification — Regras de Pontuação e Leveling', () => {
  it('calcula pontos com ponderação exata de ligações, reuniões, qualificados e receita', () => {
    const points = calculateSellerPoints({
      callsCount: 10,       // 10 * 10 = 100
      meetingsCount: 4,     // 4 * 30 = 120
      qualifiedCount: 2,    // 2 * 50 = 100
      dealsClosed: 1,       // 1 * 200 = 200
      wonRevenue: 50000,    // 50000 / 1000 = 50
    });
    expect(points).toBe(570);
  });

  it('classifica níveis corretamente conforme faixas de XP', () => {
    expect(calculateSellerLevel(100)).toEqual({ level: 1, title: 'Consultor Trainee' });
    expect(calculateSellerLevel(800)).toEqual({ level: 2, title: 'Consultor Pleno' });
    expect(calculateSellerLevel(2000)).toEqual({ level: 3, title: 'Closer Sênior' });
    expect(calculateSellerLevel(4000)).toEqual({ level: 4, title: 'Especialista de Receita' });
    expect(calculateSellerLevel(10000)).toEqual({ level: 5, title: 'Titã Comercial' });
  });

  it('desbloqueia badges baseadas em metas atingidas', () => {
    const badges = evaluateBadges({
      callsCount: 55,
      meetingsCount: 12,
      qualifiedCount: 25,
      dealsClosed: 3,
      wonRevenue: 120000,
      overdueCount: 0,
    });

    const unlockedIds = badges.filter((b) => b.unlocked).map((b) => b.id);
    expect(unlockedIds).toContain('FIRST_BLOOD');
    expect(unlockedIds).toContain('CALL_MASTER');
    expect(unlockedIds).toContain('MEETING_PRO');
    expect(unlockedIds).toContain('CLOSER_ELITE');
    expect(unlockedIds).toContain('QUALIFICATION_HERO');
    expect(unlockedIds).toContain('DISCIPLINE_STREAK');
  });
});

describe('GamificationUseCases', () => {
  it('retorna ranking ordenado da organização', async () => {
    const mockRepo: GamificationRepository = {
      getLeaderboard: vi.fn().mockResolvedValue([
        { sellerName: 'Alice', totalPoints: 1200 } as SellerScore,
        { sellerName: 'Bob', totalPoints: 800 } as SellerScore,
      ]),
      getSellerScore: vi.fn(),
    };

    const useCases = new GamificationUseCases(mockRepo);
    const result = await useCases.getLeaderboard('org-1', 'month');

    expect(result.period).toBe('month');
    expect(result.rankings).toHaveLength(2);
    expect(result.rankings[0].sellerName).toBe('Alice');
  });

  it('retorna fallback limpo quando consultor não tem dados prévios', async () => {
    const mockRepo: GamificationRepository = {
      getLeaderboard: vi.fn().mockResolvedValue([]),
      getSellerScore: vi.fn().mockResolvedValue(null),
    };

    const useCases = new GamificationUseCases(mockRepo);
    const profile = await useCases.getSellerProfile('org-1', 'Novo Consultor');

    expect(profile.totalPoints).toBe(0);
    expect(profile.level).toBe(1);
    expect(profile.levelTitle).toBe('Consultor Trainee');
  });

  it('enriquece o leaderboard com métricas de performance agregadas', async () => {
    const mockRepo: GamificationRepository = {
      getLeaderboard: vi.fn().mockResolvedValue([
        { sellerName: 'Carlos', totalPoints: 1500 } as SellerScore,
      ]),
      getSellerScore: vi.fn().mockResolvedValue({
        sellerName: 'Carlos',
        totalPoints: 1500,
        level: 3,
        levelTitle: 'Closer Sênior',
        callsCount: 30,
        meetingsCount: 8,
        qualifiedCount: 15,
        dealsClosed: 4,
        wonRevenue: 80000,
        badges: [],
        streakDays: 5,
      } as SellerScore),
    };

    const mockAggregator = {
      compute: vi.fn().mockResolvedValue({
        callsMade: 30,
        meetingsScheduled: 8,
        dealsClosed: 4,
        avgTicket: 20000,
        conversionRatePercent: 26.7,
        topLossReason: 'Preço',
      }),
    };

    const useCases = new GamificationUseCases(mockRepo, mockAggregator as any);
    const leaderboard = await useCases.getLeaderboard('org-1', 'month');

    expect(leaderboard.rankings[0].performance).toBeDefined();
    expect(leaderboard.rankings[0].performance?.conversionRatePercent).toBe(26.7);
    expect(leaderboard.rankings[0].performance?.avgTicket).toBe(20000);

    const profile = await useCases.getSellerProfile('org-1', 'Carlos');
    expect(profile.performance).toBeDefined();
    expect(profile.performance?.topLossReason).toBe('Preço');
  });
});
