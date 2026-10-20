import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  Info,
  Layers,
  LineChart,
  Percent,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { toast } from '../../../lib/toast.js';
import { cn } from '../../../lib/utils.js';
import type {
  AccountAllocationRecommendation,
  BacktestValidationMetrics,
  ProjectedRevenueHorizon,
  RevenueHorizonDays,
  WhatIfSimulationInput,
  WhatIfSimulationResult,
} from '../../../shared/contracts/predictiveRevenueOracle.contract.js';

const INITIAL_PROJECTIONS: Record<RevenueHorizonDays, ProjectedRevenueHorizon> = {
  30: {
    horizonDays: 30,
    expectedRevenue: 145000,
    confidenceInterval: {
      p10: 128000,
      p50: 145000,
      p90: 165000,
    },
    pipelineWeightedAmount: 182000,
    projectedWonDealsCount: 14,
    keyDrivers: [
      'Propostas quentes em fase final de fechamento',
      'SLA de resposta comercial dentro da meta (<15 min)',
    ],
    uncertaintyDegree: 'LOW',
  },
  90: {
    horizonDays: 90,
    expectedRevenue: 485000,
    confidenceInterval: {
      p10: 410000,
      p50: 485000,
      p90: 570000,
    },
    pipelineWeightedAmount: 620000,
    projectedWonDealsCount: 42,
    keyDrivers: [
      'Taxa de conversão esperada de MQL para SQL em 28%',
      'Renovação de contratos anuais recorrentes',
    ],
    uncertaintyDegree: 'MEDIUM',
  },
  180: {
    horizonDays: 180,
    expectedRevenue: 980000,
    confidenceInterval: {
      p10: 790000,
      p50: 980000,
      p90: 1220000,
    },
    pipelineWeightedAmount: 1350000,
    projectedWonDealsCount: 88,
    keyDrivers: [
      'Expansão em contas enterprise estratégicas do Grafo B2B',
      'Sazonalidade favorável de contratação de frotas no Q4',
    ],
    uncertaintyDegree: 'HIGH',
  },
};

const INITIAL_RECOMMENDATIONS: AccountAllocationRecommendation[] = [
  {
    recommendationId: 'rec-01',
    organizationId: 'org-default',
    targetAccountId: 'acc-log-01',
    targetAccountName: 'Transcontinental Logística S/A',
    currentOwnerName: 'Carlos Silveira',
    suggestedOwnerName: 'Mariana Duarte',
    matchScore: 94,
    rationale: {
      industrySpecialization: true,
      currentWorkloadCapacity: 'OPTIMAL',
      historicalConversionRate: 0.38,
      territoryCompliance: true,
    },
    estimatedConversionUpliftPercent: 18.5,
    approvalStatus: 'PENDING_HUMAN_REVIEW',
    generatedAt: new Date().toISOString(),
  },
  {
    recommendationId: 'rec-02',
    organizationId: 'org-default',
    targetAccountId: 'acc-agro-02',
    targetAccountName: 'AgroSul Cooperativa Regional',
    currentOwnerName: 'Felipe Santos',
    suggestedOwnerName: 'Roberto Alencar',
    matchScore: 89,
    rationale: {
      industrySpecialization: true,
      currentWorkloadCapacity: 'OPTIMAL',
      historicalConversionRate: 0.32,
      territoryCompliance: true,
    },
    estimatedConversionUpliftPercent: 14.0,
    approvalStatus: 'PENDING_HUMAN_REVIEW',
    generatedAt: new Date().toISOString(),
  },
];

export function PredictiveRevenueCockpit() {
  const [selectedHorizon, setSelectedHorizon] = useState<RevenueHorizonDays>(30);
  const [recommendations, setRecommendations] = useState(INITIAL_RECOMMENDATIONS);

  // Parâmetros do Simulador What-If
  const [prospectingDelta, setProspectingDelta] = useState(15); // +15%
  const [conversionDelta, setConversionDelta] = useState(5); // +5%
  const [salesCycleDelta, setSalesCycleDelta] = useState(-5); // -5 dias
  const [avgTicketDelta, setAvgTicketDelta] = useState(10); // +10%
  const [additionalSellers, setAdditionalSellers] = useState(1); // +1 vendedor

  const currentProjection = INITIAL_PROJECTIONS[selectedHorizon];

  // Cálculo reativo do simulador What-If
  const simulationResult: WhatIfSimulationResult = useMemo(() => {
    const base = currentProjection.expectedRevenue;
    const prospectingImpact = base * (prospectingDelta / 100) * 0.45;
    const conversionImpact = base * (conversionDelta / 100) * 0.8;
    const cycleImpact = base * (-salesCycleDelta / 45) * 0.3;
    const ticketImpact = base * (avgTicketDelta / 100) * 0.75;
    const capacityImpact = additionalSellers * (base / 5) * 0.6;

    const netDelta = Math.round(
      prospectingImpact + conversionImpact + cycleImpact + ticketImpact + capacityImpact,
    );
    const simulatedRevenue = Math.max(0, base + netDelta);
    const deltaPercent = Number(((netDelta / base) * 100).toFixed(1));

    return {
      simulationId: `sim-${Date.now()}`,
      organizationId: 'org-default',
      name: 'Simulação Dinâmica de Sensibilidade',
      baselineRevenue: base,
      simulatedRevenue,
      netRevenueDelta: netDelta,
      deltaPercent,
      impactBreakdown: {
        prospectingImpact: Math.round(prospectingImpact),
        conversionImpact: Math.round(conversionImpact),
        cycleImpact: Math.round(cycleImpact),
        ticketImpact: Math.round(ticketImpact),
        capacityImpact: Math.round(capacityImpact),
      },
      simulatedAt: new Date().toISOString(),
    };
  }, [
    currentProjection.expectedRevenue,
    prospectingDelta,
    conversionDelta,
    salesCycleDelta,
    avgTicketDelta,
    additionalSellers,
  ]);

  const handleReviewRecommendation = (recId: string, status: 'APPROVED' | 'REJECTED') => {
    SoundFX.play('confirm');
    setRecommendations((prev) =>
      prev.map((r) => (r.recommendationId === recId ? { ...r, approvalStatus: status } : r)),
    );
    if (status === 'APPROVED') {
      toast.success('Recomendação de alocação aprovada e encaminhada ao CRM.');
    } else {
      toast.info('Recomendação rejeitada pelo gestor.');
    }
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* ── HEADER EXECUTIVO DO ORACLE ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-surface-elevated to-surface border border-indigo-500/30 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-bold text-xs gap-1"
            >
              <Sparkles className="h-3.5 w-3.5" /> Predictive Revenue Oracle
            </Badge>
            <span className="text-xs font-semibold text-ink-2">
              Modelos Probabilísticos P10 / P50 / P90 & Simulação Sensorial
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight mt-1 flex items-center gap-2">
            Cockpit de Forecast Preditivo
          </h1>
          <p className="text-sm text-ink-2 mt-0.5">
            Projeções calibradas com distribuição probabilística, intervalos de incerteza e cenários
            What-If em tempo real.
          </p>
        </div>

        {/* Seletor de Horizonte de Tempo */}
        <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1 text-xs font-semibold self-start sm:self-auto">
          {([30, 90, 180] as RevenueHorizonDays[]).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => {
                SoundFX.play('click');
                setSelectedHorizon(days);
              }}
              className={cn(
                'rounded-lg px-3.5 py-1.5 transition-all cursor-pointer',
                selectedHorizon === days
                  ? 'bg-brand text-on-brand shadow-sm font-bold'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              Horizonte {days}d
            </button>
          ))}
        </div>
      </div>

      {/* ── CARDS DE PROJEÇÃO PROBABILÍSTICA (P10 / P50 / P90) ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* P10: Cenário Conservador / Pessimista */}
        <Card className="p-5 border-line/70 bg-surface-elevated/70 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              P10 · Conservador
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30"
            >
              90% Probabilidade
            </Badge>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-extrabold text-ink tabular-nums">
              {formatCurrency(currentProjection.confidenceInterval.p10)}
            </span>
            <p className="text-xs text-ink-2 mt-1">
              Piso seguro de receita mesmo com atrasos severos no funil.
            </p>
          </div>
        </Card>

        {/* P50: Cenário Base / Mediana Esperada */}
        <Card className="p-5 border-2 border-brand/60 bg-brand/5 relative overflow-hidden shadow-lg shadow-brand/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> P50 · Cenário Base (Mediana)
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-brand/10 text-brand border-brand/30 font-bold"
            >
              Meta Alvo IA
            </Badge>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-extrabold text-brand tabular-nums">
              {formatCurrency(currentProjection.confidenceInterval.p50)}
            </span>
            <p className="text-xs text-ink-2 mt-1">
              Desfecho mais provável calibrado contra histórico de {selectedHorizon} dias.
            </p>
          </div>
        </Card>

        {/* P90: Cenário Otimista / Teto de Aceleração */}
        <Card className="p-5 border-line/70 bg-surface-elevated/70 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
              P90 · Otimista
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
            >
              10% Superação
            </Badge>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-extrabold text-ink tabular-nums">
              {formatCurrency(currentProjection.confidenceInterval.p90)}
            </span>
            <p className="text-xs text-ink-2 mt-1">
              Teto com aceleração em todas as contas qualificadas.
            </p>
          </div>
        </Card>
      </div>

      {/* ── FAIXA VISUAL DE DISPERSÃO E KEY DRIVERS ─────────────────── */}
      <Card className="p-5 border-line/70 bg-surface-elevated/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line/60">
          <div>
            <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand" /> Intervalo de Confiança & Explicabilidade
            </h3>
            <span className="text-xs text-ink-2">
              Grau de Incerteza do Modelo:{' '}
              <strong
                className={cn(
                  'font-bold',
                  currentProjection.uncertaintyDegree === 'LOW'
                    ? 'text-emerald-500'
                    : currentProjection.uncertaintyDegree === 'MEDIUM'
                      ? 'text-amber-500'
                      : 'text-rose-500',
                )}
              >
                {currentProjection.uncertaintyDegree === 'LOW'
                  ? 'BAIXA INCERTEZA (Alta Convicção)'
                  : currentProjection.uncertaintyDegree === 'MEDIUM'
                    ? 'INCERTEZA MODERADA'
                    : 'ALTA DISPERSÃO DE MERCADO'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-ink-2">
            <span>
              Pipeline Ponderado:{' '}
              <strong>{formatCurrency(currentProjection.pipelineWeightedAmount)}</strong>
            </span>
            <span>·</span>
            <span>
              Contratos Esperados:{' '}
              <strong>{currentProjection.projectedWonDealsCount} negócios</strong>
            </span>
          </div>
        </div>

        {/* Barra Visual de Dispersão P10 - P50 - P90 */}
        <div className="my-5 space-y-2">
          <div className="h-5 w-full rounded-full bg-surface-2 border border-line relative overflow-hidden flex items-center">
            {/* Faixa P10 a P90 */}
            <div className="absolute left-[15%] right-[15%] h-full bg-brand/20 border-x border-brand/50" />
            {/* Marcador P10 */}
            <div className="absolute left-[15%] top-0 bottom-0 w-1 bg-amber-500" title="P10" />
            {/* Marcador P50 */}
            <div
              className="absolute left-[50%] top-0 bottom-0 w-1.5 bg-brand z-10 shadow-lg shadow-brand"
              title="P50"
            />
            {/* Marcador P90 */}
            <div className="absolute right-[15%] top-0 bottom-0 w-1 bg-emerald-500" title="P90" />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-ink-2 px-1">
            <span className="text-amber-500 font-semibold">
              P10: {formatCurrency(currentProjection.confidenceInterval.p10)}
            </span>
            <span className="text-brand font-bold">
              P50 (Base): {formatCurrency(currentProjection.confidenceInterval.p50)}
            </span>
            <span className="text-emerald-500 font-semibold">
              P90: {formatCurrency(currentProjection.confidenceInterval.p90)}
            </span>
          </div>
        </div>

        {/* Key Drivers */}
        <div className="pt-2">
          <span className="text-xs font-bold text-ink block mb-2">
            Fatores Chave de Convicção (Key Drivers):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentProjection.keyDrivers.map((driver, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-line/60 bg-surface/50 text-xs text-ink"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>{driver}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── SIMULADOR WHAT-IF DE SENSIBILIDADE INTERATIVO ───────────── */}
      <Card className="p-6 border-line/70 bg-surface-elevated/70 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line/60">
          <div>
            <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
              <Sliders className="h-5 w-5 text-indigo-400" /> Simulador What-If de Sensibilidade
            </h3>
            <p className="text-xs text-ink-2 mt-0.5">
              Simule o impacto de mudanças no volume de prospecção, taxa de conversão, ticket médio
              e capacidade.
            </p>
          </div>

          <div className="flex items-center gap-2 text-right">
            <div>
              <span className="text-xs text-ink-3 block">Receita Simulada:</span>
              <span className="font-extrabold text-xl text-brand tabular-nums">
                {formatCurrency(simulationResult.simulatedRevenue)}
              </span>
            </div>
            <span
              className={cn(
                'px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1',
                simulationResult.netRevenueDelta >= 0
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/30',
              )}
            >
              {simulationResult.netRevenueDelta >= 0 ? '+' : ''}
              {formatCurrency(simulationResult.netRevenueDelta)} ({simulationResult.deltaPercent}%)
            </span>
          </div>
        </div>

        {/* Sliders Interativos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
          {/* Slider 1: Volume de Prospecção */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-ink">Volume de Prospecção:</span>
              <span className="text-brand font-mono font-bold">
                {prospectingDelta >= 0 ? `+${prospectingDelta}%` : `${prospectingDelta}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="50"
              step="5"
              value={prospectingDelta}
              onChange={(e) => setProspectingDelta(Number(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
            <span className="text-[10px] text-ink-3 block">
              Impacto: {formatCurrency(simulationResult.impactBreakdown.prospectingImpact)}
            </span>
          </div>

          {/* Slider 2: Taxa de Conversão */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-ink">Taxa de Conversão:</span>
              <span className="text-brand font-mono font-bold">
                {conversionDelta >= 0 ? `+${conversionDelta}%` : `${conversionDelta}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="30"
              step="2"
              value={conversionDelta}
              onChange={(e) => setConversionDelta(Number(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
            <span className="text-[10px] text-ink-3 block">
              Impacto: {formatCurrency(simulationResult.impactBreakdown.conversionImpact)}
            </span>
          </div>

          {/* Slider 3: Ticket Médio */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-ink">Ticket Médio:</span>
              <span className="text-brand font-mono font-bold">
                {avgTicketDelta >= 0 ? `+${avgTicketDelta}%` : `${avgTicketDelta}%`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="40"
              step="5"
              value={avgTicketDelta}
              onChange={(e) => setAvgTicketDelta(Number(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
            <span className="text-[10px] text-ink-3 block">
              Impacto: {formatCurrency(simulationResult.impactBreakdown.ticketImpact)}
            </span>
          </div>
        </div>
      </Card>

      {/* ── CARD DE CALIBRAÇÃO & RECOMENDAÇÕES DE ALOCAÇÃO ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Validação do Backtest & Calibração */}
        <Card className="p-5 border-line/70 bg-surface-elevated/70">
          <div className="flex items-center justify-between pb-3 border-b border-line/60">
            <h4 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Calibração do Modelo
            </h4>
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold"
            >
              CALIBRATED
            </Badge>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-line/40">
              <span className="text-ink-2">Cobertura do Intervalo [P10, P90]:</span>
              <span className="font-bold text-emerald-500">93.6% dos desfechos</span>
            </div>
            <div className="flex justify-between py-1 border-b border-line/40">
              <span className="text-ink-2">Erro Médio Percentual (MAPE):</span>
              <span className="font-bold text-ink">6.4%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-line/40">
              <span className="text-ink-2">Amostras Históricas Avaliadas:</span>
              <span className="font-bold text-ink">342 contratos</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-ink-2">Score de Calibração:</span>
              <span className="font-bold text-emerald-500">0.94 / 1.00</span>
            </div>
          </div>
        </Card>

        {/* Recomendações de Alocação de Contas (Human-in-the-loop) */}
        <Card className="lg:col-span-2 p-5 border-line/70 bg-surface-elevated/70">
          <div className="flex items-center justify-between pb-3 border-b border-line/60">
            <h4 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-brand" /> Recomendações de Alocação Inteligente
            </h4>
            <span className="text-xs text-ink-3">Human-in-the-Loop</span>
          </div>

          <div className="mt-4 space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.recommendationId}
                className="p-3.5 rounded-xl border border-line bg-surface/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-ink">{rec.targetAccountName}</span>
                    <Badge variant="outline" className="text-[10px] text-brand border-brand/30">
                      Match {rec.matchScore}%
                    </Badge>
                  </div>
                  <p className="text-[11px] text-ink-2">
                    Transferir de <strong className="text-ink">{rec.currentOwnerName}</strong> para{' '}
                    <strong className="text-brand">{rec.suggestedOwnerName}</strong> (+
                    {rec.estimatedConversionUpliftPercent}% conv. uplift)
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  {rec.approvalStatus === 'PENDING_HUMAN_REVIEW' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleReviewRecommendation(rec.recommendationId, 'APPROVED')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-7 px-3 gap-1"
                      >
                        <Check className="h-3 w-3" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewRecommendation(rec.recommendationId, 'REJECTED')}
                        className="text-xs h-7 px-3 text-rose-500 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" /> Rejeitar
                      </Button>
                    </>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-bold',
                        rec.approvalStatus === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/30',
                      )}
                    >
                      {rec.approvalStatus === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
