import { Check, Sparkles, X } from 'lucide-react';
import type React from 'react';

interface ComparisonRow {
  feature: string;
  birthHub: string | boolean;
  traditionalCrm: string | boolean;
  fragmentedAi: string | boolean;
}

const COMPARISON_DATA: ComparisonRow[] = [
  {
    feature: 'Agentes de Voz Neurais em Tempo Real',
    birthHub: 'Nativo com latência sub-segundo',
    traditionalCrm: false,
    fragmentedAi: 'Plugins caros e desconectados',
  },
  {
    feature: 'Enriquecimento de Dados e Decisores (PICs)',
    birthHub: 'Cascata nativa inclusa (Apollo/Hunter)',
    traditionalCrm: 'Créditos avulsos caros',
    fragmentedAi: 'Requer assinatura externa de dados',
  },
  {
    feature: 'Diagnóstico 360° de Gargalos no Funil',
    birthHub: true,
    traditionalCrm: 'Relatórios estáticos manuais',
    fragmentedAi: false,
  },
  {
    feature: 'Sincronização via API & Webhooks com Bitrix24 & CRMs',
    birthHub: 'Bidirecional em tempo real com fila segura',
    traditionalCrm: 'Webhooks limitados',
    fragmentedAi: 'Zapiers lentos e instáveis',
  },
  {
    feature: 'Roteamento Multi-LLM Otimizado por Custo',
    birthHub: 'Automático (OpenAI / Anthropic / Groq)',
    traditionalCrm: false,
    fragmentedAi: 'Lock-in em provedor único',
  },
  {
    feature: 'Governança Corporativa, RBAC & LGPD',
    birthHub: 'Audit trail completo e isolamento total',
    traditionalCrm: 'Básico',
    fragmentedAi: 'Alto risco de vazamento',
  },
];

export function ComparisonTable(): React.ReactElement {
  return (
    <section
      id="comparativo"
      className="py-20 bg-slate-50 dark:bg-midnight border-b border-slate-250 dark:border-slate-800 text-left relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Diferenciais Competitivos</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Por que líderes de receita escolhem o Birth Hub 360°.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-white/70 leading-relaxed">
            Compare o impacto de ter uma plataforma unificada frente à colcha de retalhos de
            ferramentas avulsas.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.04]">
                <th className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white">
                  Capacidade / Recurso
                </th>
                <th className="py-4 px-6 text-sm font-bold text-brand bg-brand/5 border-x border-brand/20">
                  Birth Hub 360°
                </th>
                <th className="py-4 px-6 text-sm font-semibold text-slate-600 dark:text-white/70">
                  CRMs Tradicionais
                </th>
                <th className="py-4 px-6 text-sm font-semibold text-slate-600 dark:text-white/70">
                  Ferramentas de IA Avulsas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs sm:text-sm">
              {COMPARISON_DATA.map((row) => (
                <tr
                  key={row.feature}
                  className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
                >
                  <td className="py-4 px-6 font-medium text-slate-800 dark:text-white/90">
                    {row.feature}
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-900 dark:text-white bg-brand/5 border-x border-brand/20">
                    {typeof row.birthHub === 'boolean' ? (
                      <Check className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-brand shrink-0" />
                        <span>{row.birthHub}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-500 dark:text-white/50">
                    {typeof row.traditionalCrm === 'boolean' ? (
                      row.traditionalCrm ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <X className="w-5 h-5 text-rose-500/70" />
                      )
                    ) : (
                      row.traditionalCrm
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-500 dark:text-white/50">
                    {typeof row.fragmentedAi === 'boolean' ? (
                      row.fragmentedAi ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <X className="w-5 h-5 text-rose-500/70" />
                      )
                    ) : (
                      row.fragmentedAi
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
