import type {
  GamificationRepository,
  LeaderboardPeriod,
  LeaderboardRanking,
  SellerScore,
} from '../domain/Gamification.js';
import { prismaGamificationRepository } from '../infra/PrismaGamificationRepository.js';
import {
  type SellerPerformanceAggregatorService,
  sellerPerformanceAggregator,
} from '../services/sellerPerformanceAggregator.service.js';

export class GamificationUseCases {
  constructor(
    private repository: GamificationRepository = prismaGamificationRepository,
    private performanceAggregator: SellerPerformanceAggregatorService = sellerPerformanceAggregator,
  ) {}

  async getLeaderboard(
    organizationId: string,
    period: LeaderboardPeriod = 'month',
    now = new Date(),
  ): Promise<LeaderboardRanking> {
    let since: Date | undefined;
    if (period === 'month') {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      since = new Date(now.setDate(diff));
      since.setHours(0, 0, 0, 0);
    }

    const rawRankings = await this.repository.getLeaderboard(organizationId, since);

    const perfPeriod = {
      from: since ?? new Date(now.getFullYear(), 0, 1),
      to: now,
    };

    const rankings: SellerScore[] = await Promise.all(
      rawRankings.map(async (score) => {
        try {
          const perf = await this.performanceAggregator.compute(
            organizationId,
            score.sellerName,
            perfPeriod,
          );
          return { ...score, performance: perf };
        } catch {
          return score;
        }
      }),
    );

    return { period, rankings };
  }

  async getSellerProfile(organizationId: string, sellerName: string): Promise<SellerScore> {
    const profile = await this.repository.getSellerScore(organizationId, sellerName);
    if (!profile) {
      return {
        sellerName,
        totalPoints: 0,
        level: 1,
        levelTitle: 'Consultor Trainee',
        callsCount: 0,
        meetingsCount: 0,
        qualifiedCount: 0,
        dealsClosed: 0,
        wonRevenue: 0,
        badges: [],
        streakDays: 0,
      };
    }

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const perf = await this.performanceAggregator.compute(organizationId, sellerName, {
        from: monthStart,
        to: now,
      });
      return { ...profile, performance: perf };
    } catch {
      return profile;
    }
  }
}
