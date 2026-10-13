import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import type { HealthScoreResult, ExecutiveAlert } from '../../commercial-intelligence/commercialIntelligence.api.js';
import type { NotificationItem } from '../../notifications/notifications.api.js';
import {
  type DealRiskScanResult,
  signalsRisksApi,
} from '../signalsRisks.api.js';

interface DealRisksTabProps {
  healthScore: HealthScoreResult | null;
  overviewAlerts: ExecutiveAlert[];
  notifications: NotificationItem[];
  onRefresh: () => void;
}

export function DealRisksTab({
  healthScore,
  overviewAlerts,
  notifications,
  onRefresh,
}: DealRisksTabProps) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DealRiskScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScanRisks = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    try {
      const res = await signalsRisksApi.scanDealRisks();
      setScanResult(res);
      onRefresh();
    } catch (err: any) {
      setScanError(err?.message ?? 'Erro ao executar escaneamento de riscos.');
    } finally {
      setScanning(false);
    }
  }, [onRefresh]);

  const overallScore = healthScore?.overallScore ?? null;
  const healthStatus =
    overallScore === null
      ? 'indefinido'
      : overallScore >= 70
        ? 'saudavel'
        : overallScore >= 40
          ? 'atencao'
          : 'critico';

  return (
    <div className="space-y-6">
      {/* ── Banner de Escaneamento em Tempo Real ── */}
      <div className="relative overflow-hidden rounded-2xl border border-warning/30 bg-gradient-to-r from-warning/[0.08] via-surface to-critical/[0.05] p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-warning/15 text-warning-active dark:text-warning">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-ink">
                Detecção Agêntica de Riscos de Negócios
              </h2>
            </div>
            <p className="text-xs text-ink-2 max-w-2xl leading-relaxed">
              O motor de IA monitora continuamente os três principais vetores de perda de negócios:
              <strong className="text-ink"> silêncio prolongado (&gt;5 dias)</strong>,
              <strong className="text-ink"> mudança de tom/frieza no WhatsApp</strong> e
              <strong className="text-ink"> citação de concorrentes</strong>.
            </p>
          </div>

          <Button
            onClick={handleScanRisks}
            disabled={scanning}
            className="shrink-0 bg-warning-active hover:bg-warning-active/90 text-slate-950 font-bold px-4 py-2"
          >
            {scanning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Escaneando Pipeline...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Escanear Riscos Agora
              </>
            )}
          </Button>
        </div>

        {/* Feedback do Scan */}
        {scanResult && (
          <div className="mt-4 pt-3 border-t border-line/60 flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="text-success-active dark:text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Escaneamento concluído
            </span>
            <span className="text-ink-2">
              Leads analisados: <strong className="text-ink">{scanResult.scanned}</strong>
            </span>
            <span className="text-warning-active dark:text-warning">
              Novos alertas criados: <strong>{scanResult.alertsCreated}</strong>
            </span>
            <span className="text-ink-3">
              Em cooldown (já alertados): {scanResult.skippedCooldown}
            </span>
          </div>
        )}

        {scanError && (
          <div className="mt-3 text-xs text-critical font-medium flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> {scanError}
          </div>
        )}
      </div>

      {/* ── Três Pilares de Risco Preventivo ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pilar 1: Silêncio */}
        <Card padding="default" className="border-warning/20 hover:border-warning/40 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-warning/10 text-warning-active dark:text-warning">
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-warning/10 text-warning-active dark:text-warning">
              LIMIAR: 5 DIAS
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Silêncio Prolongado</h3>
            <p className="text-xs text-ink-2 mt-1 leading-relaxed">
              Leads em negociação aberta sem nenhuma mensagem ou retorno do tomador de decisão há mais de 5 dias úteis.
            </p>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-ink-2 flex items-center justify-between">
            <span>Ação recomendada:</span>
            <strong className="text-warning-active dark:text-warning">Breakup e-mail ou ligação executiva</strong>
          </div>
        </Card>

        {/* Pilar 2: Mudança de Tom */}
        <Card padding="default" className="border-critical/20 hover:border-critical/40 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-critical/10 text-critical">
              <MessageSquare className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-critical/10 text-critical">
              ANÁLISE DE TOM
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Mudança de Tom & Frieza</h3>
            <p className="text-xs text-ink-2 mt-1 leading-relaxed">
              Detecção semântica de atrito, respostas monossilábicas ou evasivas nas mensagens trocadas via WhatsApp.
            </p>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-ink-2 flex items-center justify-between">
            <span>Ação recomendada:</span>
            <strong className="text-critical">Revisitar dor inicial e alinhar expectativas</strong>
          </div>
        </Card>

        {/* Pilar 3: Concorrentes */}
        <Card padding="default" className="border-iris/20 hover:border-iris/40 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-iris/10 text-accent-violet">
              <Users className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-iris/10 text-accent-violet">
              COMPETIÇÃO
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Concorrente Mencionado</h3>
            <p className="text-xs text-ink-2 mt-1 leading-relaxed">
              Identificação de citações a concorrentes diretos da logística durante conversas ou trocas de proposta.
            </p>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-ink-2 flex items-center justify-between">
            <span>Ação recomendada:</span>
            <strong className="text-accent-violet">Disparar Battlecard de Diferenciais</strong>
          </div>
        </Card>
      </div>

      {/* ── Health Score do Pipeline & Alertas em Tempo Real ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-brand" />
              <h3 className="text-sm font-bold text-ink">Health Score do Pipeline</h3>
            </div>
            {overallScore !== null && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                  healthStatus === 'saudavel'
                    ? 'bg-success/10 text-success-active dark:text-success'
                    : healthStatus === 'atencao'
                      ? 'bg-warning/10 text-warning-active dark:text-warning'
                      : 'bg-critical/10 text-critical'
                }`}
              >
                {overallScore}/100
              </span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-ink-2">
              O Health Score avalia a aderência do pipeline aos limiares de segurança:
            </p>
            {healthScore?.pillars?.map((p) => (
              <div key={p.pillar} className="flex items-center justify-between text-xs py-1 border-b border-line/40">
                <span className="text-ink-2">{p.label}</span>
                <span className="font-mono font-bold text-ink">
                  {p.score !== null ? `${p.score} pts` : 'N/D'}
                </span>
              </div>
            )) ?? (
              <p className="text-xs text-ink-3 italic py-2">
                Nenhum cálculo de pilar disponível no momento.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-surface-2 p-3 text-xs space-y-1">
            <span className="font-semibold text-ink">Diagnóstico Executivo:</span>
            <p className="text-ink-2 text-[11px]">
              {healthStatus === 'saudavel'
                ? 'Pipeline saudável. Nenhum deal em risco crítico de estagnação imediata.'
                : healthStatus === 'atencao'
                  ? 'Atenção requerida: existem negociações com velocidade de ciclo abaixo da média histórica.'
                  : 'Risco elevado de perda: múltiplos deals estagnados sem avanço recente.'}
            </p>
          </div>
        </Card>

        {/* Alertas Ativos e Detecções de Chamadas / Conversas */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-active dark:text-warning" />
              <h3 className="text-sm font-bold text-ink">Alertas Ativos & Ligações Monitoradas</h3>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs text-brand hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          </div>

          {/* Notificações reais de risco */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="rounded-xl border border-warning/20 bg-warning/[0.04] p-3.5 flex items-start gap-3"
                >
                  <AlertCircle className="w-4 h-4 text-warning-active dark:text-warning shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink">{notif.title}</p>
                    {notif.body && (
                      <p className="text-xs text-ink-2 leading-relaxed">{notif.body}</p>
                    )}
                    <span className="text-[10px] text-ink-3 font-mono block">
                      {new Date(notif.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            ) : overviewAlerts.length > 0 ? (
              overviewAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-line bg-surface p-3.5 flex items-start gap-3"
                >
                  <AlertTriangle className="w-4 h-4 text-warning-active shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink">{alert.title}</p>
                    <p className="text-xs text-ink-2">{alert.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <Card padding="default" className="border-success/20 bg-success/[0.04] text-center py-8">
                <CheckCircle2 className="w-7 h-7 text-success-active dark:text-success mx-auto mb-2" />
                <p className="text-xs font-bold text-ink">Nenhum deal em risco crítico ativo</p>
                <p className="text-[11px] text-ink-2 mt-0.5">
                  Execute o escaneamento acima para checar o estado atual de conversas e silêncio.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
