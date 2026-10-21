import { motion, useInView } from 'framer-motion';
import { AlertTriangle, CircleDot, Eye, EyeOff } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMonthLabel, type MonthlyPoint } from '../analytics.api.js';

interface GlowChartProps {
  /** Série mensal real (criados/ganhos/perdidos) vinda de /api/analytics/dashboard. */
  data: MonthlyPoint[];
  /** Mensagem de erro da busca — quando presente, mostra um estado de falha em vez de "sem dados". */
  error?: string | null;
}

type SeriesKey = 'created' | 'won' | 'lost';

const SERIES: Array<{
  key: SeriesKey;
  label: string;
  color: string;
  fillId: string;
}> = [
  { key: 'created', label: 'Criados', color: '#8B7DFF', fillId: 'pulseCreated' },
  { key: 'won', label: 'Ganhos', color: '#22c55e', fillId: 'pulseWon' },
  { key: 'lost', label: 'Perdidos', color: '#EF4444', fillId: 'pulseLost' },
];

export function GlowChart({ data, error }: GlowChartProps) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    created: true,
    won: true,
    lost: true,
  });

  const sectionRef = useRef<HTMLElement>(null);
  const isCardInView = useInView(sectionRef, { amount: 0.2, once: false });

  const chartData = useMemo(
    () => data.map((point) => ({ ...point, name: formatMonthLabel(point.month) })),
    [data],
  );

  const totals = useMemo(
    () =>
      chartData.reduce(
        (acc, point) => ({
          created: acc.created + point.created,
          won: acc.won + point.won,
          lost: acc.lost + point.lost,
        }),
        { created: 0, won: 0, lost: 0 },
      ),
    [chartData],
  );

  const toggleSeries = (key: SeriesKey) => {
    setVisible((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section
      ref={sectionRef}
      data-testid="dashboard-analytics-chart"
      className="group relative min-h-[18rem] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#1C1D24] p-4 shadow-sm sm:p-5"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#8B7DFF]/10 blur-[90px]"
        animate={
          isCardInView
            ? { scale: [1, 1.08, 1], opacity: [0.34, 0.5, 0.34] }
            : { scale: 1, opacity: 0.34 }
        }
        transition={
          isCardInView ? { duration: 7, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }
        }
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#8B7DFF]/20 to-transparent"
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8B7DFF]">
              <CircleDot className="h-3.5 w-3.5" aria-hidden="true" /> Pulso comercial
            </div>
            <h3 className="text-lg font-black !text-[#F8F9FF]">Entrada, ganho e perda por mês</h3>
            <p className="mt-1 text-sm text-slate-400">
              Explore as séries reais dos últimos {chartData.length} meses e isole o sinal que quer
              analisar.
            </p>
          </div>

          {/* biome-ignore lint/a11y/useSemanticElements: toolbar de botões de alternância da série */}
          <div
            role="group"
            aria-label="Séries exibidas no gráfico"
            className="flex flex-wrap gap-2"
          >
            {SERIES.map((series) => {
              const active = visible[series.key];
              return (
                <button
                  key={series.key}
                  type="button"
                  onClick={() => toggleSeries(series.key)}
                  aria-pressed={active}
                  className={`group/series flex min-w-[7.25rem] items-center gap-2 rounded-xl border px-3 py-2 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7DFF] ${
                    active
                      ? 'border-white/10 bg-[#13151A] shadow-sm'
                      : 'border-transparent bg-transparent opacity-55'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ color: series.color, backgroundColor: series.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {series.label}
                    </span>
                    <span className="block text-sm font-black text-white [font-variant-numeric:tabular-nums]">
                      {totals[series.key].toLocaleString('pt-BR')}
                    </span>
                  </span>
                  {active ? (
                    <Eye className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover/series:scale-110" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {error ? (
            <div
              className="flex h-64 flex-col items-center justify-center gap-2 px-4 text-center"
              role="status"
            >
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold text-amber-500">
                Não foi possível carregar a série mensal.
              </p>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Sem dados suficientes ainda.
            </div>
          ) : (
            <div className="h-52 w-full sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    {SERIES.map((series) => (
                      <linearGradient
                        key={series.key}
                        id={series.fillId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={series.color} stopOpacity={0.32} />
                        <stop offset="92%" stopColor={series.color} stopOpacity={0.015} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray="4 8"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: '#1C1D24',
                      color: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                    labelStyle={{ color: '#ffffff', fontWeight: 800, marginBottom: 6 }}
                    itemStyle={{ fontSize: 12, fontWeight: 700 }}
                  />
                  {SERIES.map(
                    (series) =>
                      visible[series.key] && (
                        <Area
                          key={series.key}
                          type="monotone"
                          dataKey={series.key}
                          name={series.label}
                          stroke={series.color}
                          strokeWidth={series.key === 'won' ? 3.5 : 2.25}
                          fill={`url(#${series.fillId})`}
                          fillOpacity={1}
                          activeDot={{ r: 5, strokeWidth: 2, fill: '#1C1D24' }}
                          animationDuration={900}
                          animationEasing="ease-out"
                        />
                      ),
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
