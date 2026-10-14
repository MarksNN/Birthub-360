import { api } from '../../lib/api.js';
import type {
  HealthScoreResult,
  ExecutiveAlert,
} from '../commercial-intelligence/commercialIntelligence.api.js';
import type { NotificationItem } from '../notifications/notifications.api.js';

export interface DataQualityReportData {
  available: boolean;
  reason: string | null;
  totalSignals: number;
  accountsWithSignals: number | null;
  byType: Record<string, number> | null;
  byStatus: Record<string, number> | null;
}

export interface DealRiskScanResult {
  scanned: number;
  alertsCreated: number;
  skippedCooldown: number;
  errors: number;
}

export interface MarketSignalItem {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: 'ALTA' | 'MEDIA' | 'BAIXA';
  source: string;
  detectedAt: string;
  companyName?: string;
  segment?: string;
  suggestedAction?: string;
}

export const signalsRisksApi = {
  getSignalCoverage: async (): Promise<DataQualityReportData | null> => {
    try {
      const response = await api.get<{
        success: boolean;
        data: { signalCoverage: DataQualityReportData };
      }>('/api/market-intelligence/data-quality-report');
      return response.data?.signalCoverage ?? null;
    } catch {
      return null;
    }
  },

  getHealthScore: async (): Promise<HealthScoreResult | null> => {
    try {
      const response = await api.get<{ success: boolean; data: HealthScoreResult }>(
        '/api/commercial-intelligence/health-score',
      );
      return response.data ?? null;
    } catch {
      return null;
    }
  },

  getExecutiveAlerts: async (): Promise<ExecutiveAlert[]> => {
    try {
      const response = await api.get<ExecutiveAlert[]>('/api/commercial-intelligence/alerts');
      return Array.isArray(response) ? response : [];
    } catch {
      return [];
    }
  },

  scanDealRisks: async (): Promise<DealRiskScanResult> => {
    const response = await api.post<{ success: boolean; data: DealRiskScanResult }>(
      '/api/commercial-intelligence/ai/deal-risk-scan',
    );
    return response.data;
  },

  getRiskNotifications: async (): Promise<NotificationItem[]> => {
    try {
      const response = await api.get<{ items: NotificationItem[]; unread: number }>(
        '/api/notifications?unread=1',
      );
      const items = response.items ?? [];
      // Filtra notificações com teor de risco, sinal ou atenção comercial
      return items.filter(
        (n) =>
          n.title.toLowerCase().includes('risco') ||
          n.title.toLowerCase().includes('silêncio') ||
          n.title.toLowerCase().includes('concorrente') ||
          n.title.toLowerCase().includes('tom') ||
          n.title.toLowerCase().includes('chamada') ||
          n.kind === 'Alerta' ||
          n.kind === 'Erro',
      );
    } catch {
      return [];
    }
  },
};
