import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  Layers,
  LineChart,
  Percent,
  RefreshCw,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { toast } from '../../../lib/toast.js';
import { cn } from '../../../lib/utils.js';

interface ProjectionHorizon {
  days: 30 | 90 | 180;
  label: string;
  expectedRevenue: number;
  p10: number;
  p50: number;
  p90: number;
  pipelineWeighted: number;
  projectedDeals: number;
  uncertainty: 'LOW' | 'MEDIUM' | 'HIGH';
  drivers: string[];
}

const DEFAULT_PROJECTIONS: Record<30 | 90 | 180, ProjectionHorizon> = {
  30: {
    days: 30,
    label: 'Próximos 30 Dias (Mês)',
    expectedRevenue: 145000,
    p10: 128000,
    p50: 145000,
    p90: 165000,
    pipelineWeighted: 182000,
    projectedDeals: 14,
    uncertainty: 'LOW',
    drivers: [
      'Propostas em fase de negociação jurídica final',
      'SLA de resposta comercial dentro da meta (<15 min)',
    ],
  },
  90: {
    days: 90,
    label: 'Próximos 90 Dias (Trimestre)',
    expectedRevenue: 485000,
    p10: 410000,
    p50: 485000,
    p90: 570000,
    pipelineWeighted: 620000,
    projectedDeals: 42,
    uncertainty: 'MEDIUM',
    drivers: [
      'Conversão esperada de MQLs maduros da base Bitrix',
      'Renovação de contratos anuais de rastreamento e telemetria',
    ],
  },
  180: {
    days: 180,
    label: 'Próximos 180 Dias (Semestre)',
    expectedRevenue: 980000,
    p10: 790000,
    p50: 980000,
    p90: 1220000,
    pipelineWeighted: 1350000,
    projectedDeals: 88,
    uncertainty: 'HIGH',
    drivers: [
      'Expansão em contas estratégicas do Grafo B2B',
      'Pico sazonal de renovação de frotas e logística Q4',
    ],
  },
};

export function PredictiveRevenueCockpit() {
  const [selectedHorizon, setSelectedHorizon] = useState<30 | 90 | 180>(90);
  const [prospectingDelta, setProspectingDelta] = useState(15);
  const [conversionDelta, setConversionDelta] = useState(5);
  const [cycleDeltaDays, setCycleDeltaDays] = useState(-3);
  const [ticketDelta, setTicketDelta] = useState(8);
  const [additionalSellers, setAdditionalSellers] = useState(1);

  const horizonData = DEFAULT_PROJECTIONS[selectedHorizon];

  // Cálculo da Simulação What-If determinística
  const simulation = useMemo(() => {
    const base = horizonData.expectedRevenue;
    const prosImp = base * ((prospectingDelta / 100) * 0.65);
    const convImp = base * ((conversionDelta / 100) * 1.1);
    const cyclePenaltyRate =
      cycleDeltaDays > 0 ? (cycleDeltaDays / (selectedHorizon * 1.5)) * -0.3 : 0;
    const cycleImp = base * cyclePenaltyRate;
    const ticketImp = base * (ticketDelta / 100);
    const capacityImp = additionalSellers * (base * 0.12);

    const netDelta = prosImp + convImp + cycleImp + ticketImp + capacityImp;
    const simulatedTotal = Math.max(0, Math.round(base + netDelta));
    const deltaPct = Math.round((netDelta / base) * 1000) / 10;

    return {
      base,
      simulatedTotal,
      netDelta: Math.round(netDelta),
      deltaPct,
      breakdown: {
        prospecting: Math.round(prosImp),
        conversion: Math.round(convImp),
        cycle: Math.round(cycleImp),
        ticket: Math.round(ticketImp),
        capacity: Math.round(capacityImp),
      },
    };
  }, [
    horizonData.expectedRevenue,
    prospectingDelta,
    conversionDelta,
    cycleDeltaDays,
    ticketDelta,
    additionalSellers,
    selectedHorizon,
  ]);

  const handleResetSim = () => {
    setProspectingDelta(0);
    setConversionDelta(0);
    setCycleDeltaDays(0);
    setTicketDelta(0);
    setAdditionalSellers(0);
    SoundFX.play('click');
    toast.info('Parâmetros da simulação restaurados para a baseline do CRM.');
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
      val,
    );

  return (
    <div className="space-y-6">
      {/* Banner de Cabeçalho Executivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-line bg-gradient-to-r from-surface-elevated/90 via-surface/80 to-surface-elevated/90 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand/10 border border-brand/30 text-brand shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <LineChart className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand px-2 py-0.5 rounded-full bg-brand/10 border border-brand/30">
                Predictive Revenue Oracle • Eixo 15
              </span>
              <span className="text-xs font-semibold text-ink-2">
                Backtest MAPE 8.4% Calibrado
              </span>
            </div>
            <h2 className="text-xl font-display font-extrabold text-ink mt-0.5">
              Cockpit Preditivo de Receita (P10 / P50 / P90)
            </h2>
          </div>
        </div>

        {/* Seletor de Horizonte Temporal */}
        <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1 text-xs font-semibold">
          {([30, 90, 180] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => {
                setSelectedHorizon(days);
                SoundFX.play('click');
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 transition-all',
                selectedHorizon === days
                  ? 'bg-brand text-on-brand shadow-sm font-bold'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              {days} Dias
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Intervalo de Confiança P10 / P50 / P90 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* P10 - Conservador */}
        <Card className="p-5 border-line/80 bg-surface-elevated/70 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-2">
              P10 • Cenário Conservador
            </span>
            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
              90% Probabilidade
            </Badge>
          </div>
          <div className="mt-2 text-2xl font-mono font-extrabold text-ink">
            {formatBRL(horizonData.p10)}
          </div>
          <p className="text-xs text-ink-2 mt-1">
            Piso seguro de receita com taxa mínima histórica de conversão.
          </p>
        </Card>

        {/* P50 - Esperado (Mediana do Oráculo) */}
        <Card className="p-5 border-brand/50 bg-brand/5 backdrop-blur-xl shadow-[0_0_25px_rgba(0,240,255,0.1)]">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              P50 • Cenário Esperado (Mediana)
            </span>
            <Badge variant="default" className="text-[10px] bg-brand text-on-brand font-bold">
              Base Oracle
            </Badge>
          </div>
          <div className="mt-2 text-3xl font-mono font-extrabold text-brand">
            {formatBRL(horizonData.p50)}
          </div>
          <p className="text-xs text-ink-2 mt-1">
            Projeção central calibrada com ponderação do pipeline ativo ({formatBRL(horizonData.pipelineWeighted)}).
          </p>
        </Card>

        {/* P90 - Otimista */}
        <Card className="p-5 border-line/80 bg-surface-elevated/70 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-2">
              P90 • Cenário Otimista
            </span>
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">
              10% Superação
            </Badge>
          </div>
          <div className="mt-2 text-2xl font-mono font-extrabold text-emerald-400">
            {formatBRL(horizonData.p90)}
          </div>
          <p className="text-xs text-ink-2 mt-1">
            Teto de aceleração caso os negócios em risco fechem no trimestre.
          </p>
        </Card>
      </div>

      {/* Seção 2: Simulador What-If & Decomposição de Impacto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controles do Simulador (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5 border-line bg-surface-elevated/80 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-line/60">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-brand" />
                <h3 className="font-display text-base font-bold text-ink">
                  Simulação Dinâmica de Cenários (What-If)
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetSim}
                className="text-xs text-ink-2"
              >
                Resetar Baseline
              </Button>
            </div>

            <div className="space-y-4 mt-4">
              {/* Slider 1: Volume de Prospecção */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Volume de Prospecção / Cadência</span>
                  <span className="font-mono font-bold text-brand">
                    {prospectingDelta > 0 ? `+${prospectingDelta}%` : `${prospectingDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="60"
                  step="5"
                  value={prospectingDelta}
                  onChange={(e) => setProspectingDelta(Number(e.target.value))}
                  className="w-full accent-cyan-400 bg-surface-2 rounded-lg cursor-pointer h-2"
                />
              </div>

              {/* Slider 2: Taxa de Conversão */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Evolução da Taxa de Conversão</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {conversionDelta > 0 ? `+${conversionDelta}%` : `${conversionDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  step="1"
                  value={conversionDelta}
                  onChange={(e) => setConversionDelta(Number(e.target.value))}
                  className="w-full accent-emerald-400 bg-surface-2 rounded-lg cursor-pointer h-2"
                />
              </div>

              {/* Slider 3: Variação de Ciclo de Vendas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Redução no Ciclo de Vendas</span>
                  <span className="font-mono font-bold text-purple-400">
                    {cycleDeltaDays} dias
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="1"
                  value={cycleDeltaDays}
                  onChange={(e) => setCycleDeltaDays(Number(e.target.value))}
                  className="w-full accent-purple-400 bg-surface-2 rounded-lg cursor-pointer h-2"
                />
              </div>

              {/* Slider 4: Ticket Médio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Variação do Ticket Médio</span>
                  <span className="font-mono font-bold text-amber-400">
                    {ticketDelta > 0 ? `+${ticketDelta}%` : `${ticketDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="40"
                  step="2"
                  value={ticketDelta}
                  onChange={(e) => setTicketDelta(Number(e.target.value))}
                  className="w-full accent-amber-400 bg-surface-2 rounded-lg cursor-pointer h-2"
                />
              </div>

              {/* Slider 5: Novos Consultores */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Capacidade / Consultores Adicionais</span>
                  <span className="font-mono font-bold text-sky-400">
                    +{additionalSellers} vendedores
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={additionalSellers}
                  onChange={(e) => setAdditionalSellers(Number(e.target.value))}
                  className="w-full accent-sky-400 bg-surface-2 rounded-lg cursor-pointer h-2"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Resultado Projetado da Simulação (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 border-line bg-surface-elevated/90 backdrop-blur-xl h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-line/60">
                <span className="text-xs uppercase tracking-wider font-bold text-ink-2">
                  Receita Projetada Simulada
                </span>
                <span
                  className={cn(
                    'text-xs font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1',
                    simulation.deltaPct >= 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
                  )}
                >
                  {simulation.deltaPct >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {simulation.deltaPct >= 0 ? `+${simulation.deltaPct}%` : `${simulation.deltaPct}%`}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-mono font-extrabold text-ink block">
                  {formatBRL(simulation.simulatedTotal)}
                </span>
                <span className="text-xs text-ink-2 mt-0.5 block">
                  Impacto líquido:{' '}
                  <strong className={simulation.netDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {simulation.netDelta >= 0 ? `+${formatBRL(simulation.netDelta)}` : formatBRL(simulation.netDelta)}
                  </strong>{' '}
                  vs baseline de {formatBRL(simulation.base)}
                </span>
              </div>

              {/* Decomposição dos Impactos */}
              <div className="mt-5 space-y-2 text-xs">
                <span className="font-bold text-ink-2 block text-[11px] uppercase tracking-wider">
                  Decomposição por Alavanca:
                </span>
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span className="text-ink-2">Prospecção (+{prospectingDelta}%):</span>
                  <span className="font-mono text-ink">+{formatBRL(simulation.breakdown.prospecting)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span className="text-ink-2">Conversão (+{conversionDelta}%):</span>
                  <span className="font-mono text-ink">+{formatBRL(simulation.breakdown.conversion)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span className="text-ink-2">Ticket Médio (+{ticketDelta}%):</span>
                  <span className="font-mono text-ink">+{formatBRL(simulation.breakdown.ticket)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line/40">
                  <span className="text-ink-2">Capacidade (+{additionalSellers}):</span>
                  <span className="font-mono text-ink">+{formatBRL(simulation.breakdown.capacity)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-ink-2">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Sem efeito colateral no banco
              </span>
              <span className="font-mono text-[10px]">What-If Sandbox</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Seção 3: Recomendações de Realocação Supervisionada & Drivers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 border-line bg-surface-elevated/70 backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-line/60">
            <Sparkles className="h-4 w-4 text-brand" />
            <h4 className="font-display text-sm font-bold text-ink">
              Principais Alavancas do Trimestre ({horizonData.label})
            </h4>
          </div>
          <ul className="mt-4 space-y-2.5">
            {horizonData.drivers.map((driver, index) => (
              <li
                key={index}
                className="p-3 rounded-xl bg-surface/60 border border-line/60 text-xs text-ink flex items-start gap-2"
              >
                <div className="h-2 w-2 rounded-full bg-brand mt-1.5 shrink-0" />
                <span>{driver}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 border-line bg-surface-elevated/70 backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-line/60">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h4 className="font-display text-sm font-bold text-ink">
              Contas com Risco Detectadas pelo Oráculo
            </h4>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="p-3 rounded-xl bg-surface/60 border border-amber-500/30 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-ink block">Transcontinental Logística</span>
                <span className="text-[11px] text-ink-2">120 Veículos • Estagnado há 14 dias</span>
              </div>
              <Badge variant="warning" className="text-[10px]">
                Risco 68%
              </Badge>
            </div>
            <div className="p-3 rounded-xl bg-surface/60 border border-line/60 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-ink block">Viação Estrela do Sul</span>
                <span className="text-[11px] text-ink-2">45 Rastreadores • Decisor ausente</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-ink-2">
                Risco 42%
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
