import { AlertCircle, BarChart4, Calculator, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card.js';
import { CommandCenterHeader } from '../../../components/ui/CommandCenterHeader.js';
import { KpiCard } from '../../../components/ui/KpiCard.js';
import { PredictabilityEmptyState, PredictabilityStatusBanner } from './PredictabilityNoData.js';
import {
  formatBRL,
  formatPct,
  unavailableReason,
  usePredictabilityOverview,
} from './usePredictabilityOverview.js';

// P0 #693 (Agente 02): leitura real via predictabilityApi (Agente 04, PR #697). Sem R$ inventado.

export function PipelinePonderadoHub() {
  const { data, loading, error, noRealData, partial, reload } = usePredictabilityOverview();
  const p = data?.pipeline ?? null;
  const cur = data?.meta.currency ?? 'BRL';
  const weightedReason = unavailableReason(data, 'pipeline.weightedAmount');

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader title="Pipeline Ponderado" icon={Layers} />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="mb-4">
          <p className="text-sm text-[var(--ink-2)]">
            O valor do seu funil ajustado pela probabilidade de fechamento
            {data ? ` · período ${data.meta.period}` : ''}
          </p>
        </div>

        <PredictabilityStatusBanner
          what="o pipeline ponderado"
          loading={loading}
          error={error}
          noRealData={noRealData}
          partial={partial}
          failedSources={data?.meta.failedSources}
          onRetry={reload}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Valor Bruto do Funil"
            value={formatBRL(p?.grossAmount, cur)}
            icon={BarChart4}
            subtitle={
              p?.grossAmount != null
                ? `${p.grossCount ?? 0} negócios abertos`
                : (unavailableReason(data, 'pipeline.grossAmount') ?? 'Indisponível')
            }
            variant="default"
          />
          <KpiCard
            title="Valor Ponderado"
            value={formatBRL(p?.weightedAmount, cur)}
            icon={Calculator}
            subtitle={
              p?.weightedAmount != null
                ? 'Σ valor × probabilidade'
                : (weightedReason ?? 'Indisponível')
            }
            variant="default"
          />
          <KpiCard
            title="Risco Calculado"
            value={formatBRL(p?.atRiskAmount, cur)}
            icon={AlertCircle}
            subtitle={
              p?.atRiskAmount != null ? 'Bruto − ponderado' : (weightedReason ?? 'Indisponível')
            }
            variant="default"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cálculo por Etapa do Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="border-t border-[var(--line)] pt-6">
            {p && p.stages.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--ink-3)]">
                    <th className="py-1 font-medium">Etapa</th>
                    <th className="py-1 font-medium text-right">Negócios</th>
                    <th className="py-1 font-medium text-right">Bruto</th>
                    <th className="py-1 font-medium text-right">Prob. média</th>
                    <th className="py-1 font-medium text-right">Ponderado</th>
                  </tr>
                </thead>
                <tbody>
                  {p.stages.map((s) => (
                    <tr key={s.stageName} className="border-t border-[var(--line)]">
                      <td className="py-1.5">{s.stageName}</td>
                      <td className="py-1.5 text-right font-mono tabular-nums">{s.count}</td>
                      <td className="py-1.5 text-right font-mono tabular-nums">
                        {formatBRL(s.grossAmount, cur)}
                      </td>
                      <td className="py-1.5 text-right font-mono tabular-nums">
                        {formatPct(s.avgProbability)}
                      </td>
                      <td className="py-1.5 text-right font-mono tabular-nums font-semibold text-brand">
                        {formatBRL(s.weightedAmount, cur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <PredictabilityEmptyState
                title="Sem cálculo por etapa"
                hint={weightedReason ?? 'Sem negócios abertos no período.'}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
