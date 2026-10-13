import {
  Radio,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageTitleCard } from '../../../components/ui/PageTitleCard.js';
import type { HealthScoreResult, ExecutiveAlert } from '../../commercial-intelligence/commercialIntelligence.api.js';
import type { NotificationItem } from '../../notifications/notifications.api.js';
import {
  type DataQualityReportData,
  signalsRisksApi,
} from '../signalsRisks.api.js';
import { DealRisksTab } from './DealRisksTab.js';
import { SignalsRadarTab } from './SignalsRadarTab.js';

export type SignalsAndRisksView = 'radar' | 'deal-risks';

interface SignalsAndRisksHubProps {
  initialView?: SignalsAndRisksView;
}

export function SignalsAndRisksHub({ initialView }: SignalsAndRisksHubProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determina a view ativa a partir da prop ou da URL atual
  const [activeView, setActiveView] = useState<SignalsAndRisksView>(() => {
    if (initialView) return initialView;
    if (location.pathname.includes('/deal-risks')) return 'deal-risks';
    return 'radar';
  });

  // Atualiza se a rota mudar
  useEffect(() => {
    if (location.pathname.includes('/deal-risks')) {
      setActiveView('deal-risks');
    } else if (location.pathname.includes('/radar')) {
      setActiveView('radar');
    }
  }, [location.pathname]);

  const handleSelectView = (view: SignalsAndRisksView) => {
    setActiveView(view);
    navigate(`/app/signals-risks/${view}`);
  };

  // Estados de dados compartilhados
  const [coverage, setCoverage] = useState<DataQualityReportData | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScoreResult | null>(null);
  const [overviewAlerts, setOverviewAlerts] = useState<ExecutiveAlert[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cov, hs, alerts, notifs] = await Promise.all([
        signalsRisksApi.getSignalCoverage(),
        signalsRisksApi.getHealthScore(),
        signalsRisksApi.getExecutiveAlerts(),
        signalsRisksApi.getRiskNotifications(),
      ]);
      setCoverage(cov);
      setHealthScore(hs);
      setOverviewAlerts(alerts);
      setNotifications(notifs);
    } catch {
      // Falha silenciosa com fallback seguro
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="flex-1 overflow-y-auto bg-transparent">
      <div className="bh-page bh-page-stack">
        {/* Cabeçalho Oficial */}
        <PageTitleCard
          eyebrow="INTELIGÊNCIA COMERCIAL & MERCADO"
          title="Sinais & Riscos"
          subtitle="Monitoramento contínuo de sinais de intenção de compra e detecção preventiva de riscos de perda no pipeline."
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="gold"
          actions={
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar Dados</span>
            </button>
          }
        />

        {/* Seletor de Abas Principais */}
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <button
            type="button"
            onClick={() => handleSelectView('radar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === 'radar'
                ? 'bg-brand/15 text-brand border border-brand/30 shadow-sm'
                : 'text-ink-2 hover:text-ink hover:bg-surface'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Radar de Sinais</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectView('deal-risks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === 'deal-risks'
                ? 'bg-warning/15 text-warning-active dark:text-warning border border-warning/30 shadow-sm'
                : 'text-ink-2 hover:text-ink hover:bg-surface'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Riscos de Deals</span>
          </button>
        </div>

        {/* Conteúdo da Aba Ativa */}
        {activeView === 'radar' ? (
          <SignalsRadarTab coverage={coverage} loading={loading} />
        ) : (
          <DealRisksTab
            healthScore={healthScore}
            overviewAlerts={overviewAlerts}
            notifications={notifications}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  );
}

export default SignalsAndRisksHub;
