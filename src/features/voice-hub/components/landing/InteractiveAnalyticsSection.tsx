import { motion } from 'framer-motion';
import { BarChart2, Target, TrendingUp, Zap } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export function InteractiveAnalyticsSection(): React.ReactElement {
  const [activeRange, setActiveRange] = useState<'7d' | '30d' | '90d'>('30d');

  const RANGES = [
    { id: '7d' as const, label: 'Últimos 7 dias' },
    { id: '30d' as const, label: 'Últimos 30 dias' },
    { id: '90d' as const, label: 'Trimestre Atual' },
  ];

  const DATA_POINTS = {
    '7d': { deals: '142', conversion: '32.4%', hoursSaved: '48h', pipeline: 'R$ 840.000' },
    '30d': { deals: '584', conversion: '38.6%', hoursSaved: '210h', pipeline: 'R$ 3.250.000' },
    '90d': { deals: '1.890', conversion: '41.2%', hoursSaved: '640h', pipeline: 'R$ 11.400.000' },
  }[activeRange];

  return (
    <section className="py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-left relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Lado Esquerdo: Explicação da IA Analítica */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand tracking-wide">
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Inteligência Acionável</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Visibilidade preditiva do pipeline em tempo real.
            </h2>

            <p className="text-base text-slate-600 dark:text-white/70 leading-relaxed">
              O motor de Commercial Intelligence cruza métricas de toque com a resposta real dos
              decisores, identificando gargalos antes que eles impactem a meta do trimestre.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-brand text-xs font-bold mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>Win Rate Médio</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">+41%</div>
                <div className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
                  Após qualificação neural
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-brand text-xs font-bold mb-1">
                  <Zap className="w-4 h-4" />
                  <span>Tempo de Resposta</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">&lt; 2 min</div>
                <div className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
                  No primeiro toque inbound/outbound
                </div>
              </div>
            </div>
          </div>

          {/* Lado Direito: Widget Interativo */}
          <div className="lg:col-span-6 relative">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-midnight/90 p-6 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Cockpit de Resultados
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-200 dark:bg-white/10 p-1 rounded-lg">
                  {RANGES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveRange(r.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        activeRange === r.id
                          ? 'bg-brand text-midnight font-bold shadow-sm'
                          : 'text-slate-600 dark:text-white/60 hover:text-slate-950 dark:hover:text-white'
                      }`}
                    >
                      {r.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Métricas do Período Selecionado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-white/50">Pipeline Gerado</span>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {DATA_POINTS.pipeline}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-white/50">
                    Negócios Avançados
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {DATA_POINTS.deals}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-white/50">
                    Taxa de Conversão
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-500">
                    {DATA_POINTS.conversion}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-white/50">
                    Horas Economizadas
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-brand">
                    {DATA_POINTS.hoursSaved}
                  </div>
                </div>
              </div>

              {/* Barra de Progresso de Meta */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600 dark:text-white/70">
                    Acurácia Preditiva do Forecast
                  </span>
                  <span className="text-brand font-bold">96.8%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <motion.div
                    key={activeRange}
                    initial={{ width: 0 }}
                    animate={{ width: '96.8%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-brand to-emerald-400 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
