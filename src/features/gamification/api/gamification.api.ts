import { api } from '../../../lib/api.js';
import type { LeaderboardPeriod, LeaderboardRanking, SellerScore } from '../domain/Gamification.js';

export interface WeeklyCoachingReport {
  motivationalHeadline: string;
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  celebrationPoint: string;
  criticalGaps: string[];
  actionableMicroHabits: string[];
  suggestedTrainingTopic: string;
  nextWeekTargetFocus: string;
}

export interface SellerPerformanceSummary {
  callsMade: number;
  meetingsScheduled: number;
  dealsClosed: number;
  conversionRatePercent: number;
  avgTicket: number;
  topLossReason: string;
}

export interface CoachingData {
  metrics?: SellerPerformanceSummary;
  coaching?: string;
  report?: WeeklyCoachingReport;
  performance?: SellerPerformanceSummary;
  period?: string;
}

export const gamificationApi = {
  /**
   * Obtém ranking da organização por período ('all' | 'month' | 'week').
   * O endpoint /api/gamification/leaderboard retorna { success: true, data: LeaderboardRanking }.
   * O cliente api desempacota o payload data automaticamente.
   */
  async getLeaderboard(period: LeaderboardPeriod = 'month'): Promise<LeaderboardRanking> {
    try {
      const response = await api.get<any>(`/gamification/leaderboard?period=${period}`);
      const data = response?.rankings ? response : (response?.data ?? response);
      return {
        period: data?.period ?? period,
        rankings: Array.isArray(data?.rankings) ? data.rankings : [],
      };
    } catch (error) {
      console.warn('[GamificationApi] Falha ao obter leaderboard:', error);
      return { period, rankings: [] };
    }
  },

  /**
   * Obtém perfil gamificado do consultor (nível, pontos, métricas, badges).
   * O endpoint /api/gamification/profile?seller=... retorna { success: true, data: SellerScore | null }.
   */
  async getSellerProfile(seller?: string): Promise<SellerScore | null> {
    try {
      const query = seller ? `?seller=${encodeURIComponent(seller)}` : '';
      const response = await api.get<any>(`/gamification/profile${query}`);
      const data = response?.sellerName ? response : (response?.data ?? response);
      if (!data || typeof data !== 'object' || !data.sellerName) {
        return null;
      }
      return data as SellerScore;
    } catch (error) {
      console.warn('[GamificationApi] Falha ao obter perfil do vendedor:', error);
      return null;
    }
  },

  /**
   * Obtém coaching executivo e métricas do vendedor via IA.
   */
  async getCoaching(seller?: string): Promise<CoachingData | null> {
    try {
      const query = seller ? `?seller=${encodeURIComponent(seller)}` : '';
      const response = await api.get<any>(`/gamification/coaching${query}`);
      const data = response?.data ?? response;
      return data as CoachingData;
    } catch (error) {
      console.warn('[GamificationApi] Falha ao obter coaching:', error);
      return null;
    }
  },

  /**
   * Dispara geração de relatório estruturado de coaching semanal com IA.
   */
  async getWeeklyCoaching(role?: string): Promise<CoachingData | null> {
    try {
      const response = await api.post<any>('/gamification/coaching/weekly', { role });
      const data = response?.data ?? response;
      return data as CoachingData;
    } catch (error) {
      console.warn('[GamificationApi] Falha ao gerar coaching semanal:', error);
      return null;
    }
  },
};
