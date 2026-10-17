import { api } from '../../lib/api.js';
import type { LeaderboardPeriod, LeaderboardRanking, SellerScore } from './domain/Gamification.js';
import type { AggregatedSellerPerformance } from './domain/SellerPerformance.js';

export interface CoachingWeeklyReport {
  report: {
    motivationalHeadline: string;
    overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
    celebrationPoint: string;
    criticalGaps: string[];
    actionableMicroHabits: string[];
    suggestedTrainingTopic: string;
    nextWeekTargetFocus: string;
  };
  performance: AggregatedSellerPerformance;
  period: string;
}

export const gamificationApi = {
  getLeaderboard: async (period: LeaderboardPeriod = 'month'): Promise<LeaderboardRanking> => {
    const response = await api.get<
      { data?: LeaderboardRanking; success?: boolean } & LeaderboardRanking
    >(`/api/gamification/leaderboard?period=${period}`);
    if ('rankings' in response && Array.isArray(response.rankings)) {
      return response;
    }
    if (response?.data?.rankings) {
      return response.data;
    }
    return { period, rankings: [] };
  },

  getSellerProfile: async (sellerName?: string): Promise<SellerScore> => {
    const query = sellerName ? `?seller=${encodeURIComponent(sellerName)}` : '';
    const response = await api.get<{ data?: SellerScore; success?: boolean } & SellerScore>(
      `/api/gamification/profile${query}`,
    );
    if ('totalPoints' in response && typeof response.totalPoints === 'number') {
      return response;
    }
    if (response?.data?.totalPoints !== undefined) {
      return response.data;
    }
    return {
      sellerName: sellerName || 'Consultor',
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
  },

  getWeeklyCoaching: async (role?: string): Promise<CoachingWeeklyReport> => {
    const response = await api.post<
      { data?: CoachingWeeklyReport; success?: boolean } & CoachingWeeklyReport
    >('/api/gamification/coaching/weekly', { role: role || undefined });
    if ('report' in response && response.report) {
      return response;
    }
    if (response?.data?.report) {
      return response.data;
    }
    throw new Error('Formato inválido retornado pelo serviço de coaching');
  },
};
