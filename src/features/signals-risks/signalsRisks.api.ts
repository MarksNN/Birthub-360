import { api } from '../../lib/api.js';
import type { NotificationItem } from '../notifications/notifications.api.js';

export interface SignalRiskHealthScore {
  overallScore: number | null;
  pillars: Array<{
    pillar:
      | 'pipeline'
      | 'conversao'
      | 'produtividade'
      | 'qualidadeCrm'
      | 'followUp'
      | 'confiabilidadeForecast';
    label: string;
    score: number | null;
  }>;
}

export interface SignalRiskExecutiveAlert {
  id: string;
  title: string;
  description: string;
}

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
        signalCoverage?: DataQualityReportData;
        data?: { signalCoverage?: DataQualityReportData };
      }>('/api/market-intelligence/data-quality-report');
      return response?.signalCoverage ?? response?.data?.signalCoverage ?? null;
    } catch (error) {
      console.warn('[signalsRisksApi] Falha ao obter cobertura de sinais de mercado', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },

  getHealthScore: async (): Promise<SignalRiskHealthScore | null> => {
    try {
      const response = await api.get<
        SignalRiskHealthScore | { success?: boolean; data?: SignalRiskHealthScore }
      >('/api/commercial-intelligence/health-score');
      if (!response) return null;
      if ('pillars' in response && 'overallScore' in response) {
        return response as SignalRiskHealthScore;
      }
      return (response as any).data ?? null;
    } catch (error) {
      console.warn('[signalsRisksApi] Falha ao obter health score de sinais e riscos', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },

  getExecutiveAlerts: async (): Promise<SignalRiskExecutiveAlert[]> => {
    try {
      const response = await api.get<
        SignalRiskExecutiveAlert[] | { data?: SignalRiskExecutiveAlert[] }
      >('/api/commercial-intelligence/alerts');
      if (Array.isArray(response)) return response;
      if (Array.isArray((response as any)?.data)) return (response as any).data;
      return [];
    } catch (error) {
      console.warn('[signalsRisksApi] Falha ao obter alertas executivos', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  },

  scanDealRisks: async (): Promise<DealRiskScanResult> => {
    const response = await api.post<
      DealRiskScanResult | { success?: boolean; data?: DealRiskScanResult }
    >('/api/commercial-intelligence/ai/deal-risk-scan');
    if (response && 'scanned' in response) {
      return response as DealRiskScanResult;
    }
    return ((response as any)?.data ?? response) as DealRiskScanResult;
  },

  getRiskNotifications: async (): Promise<NotificationItem[]> => {
    try {
      const response = await api.get<
        { items: NotificationItem[]; unread: number } | { data?: { items: NotificationItem[]; unread: number } }
      >('/api/notifications?unread=1');
      const items = (response as any)?.items ?? (response as any)?.data?.items ?? [];
      // Filtra notificações com teor de risco, sinal ou atenção comercial
      return items.filter(
        (n: NotificationItem) =>
          n.title.toLowerCase().includes('risco') ||
          n.title.toLowerCase().includes('silêncio') ||
          n.title.toLowerCase().includes('concorrente') ||
          n.title.toLowerCase().includes('tom') ||
          n.title.toLowerCase().includes('chamada') ||
          n.kind === 'Alerta' ||
          n.kind === 'Erro',
      );
    } catch (error) {
      console.warn('[signalsRisksApi] Falha ao obter notificações de risco', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  },
};
