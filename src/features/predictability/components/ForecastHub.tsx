import { DollarSign, LineChart, Target, TrendingUp } from 'lucide-react';
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

export function ForecastHub() {
  const { data, loading, error, noRealData, partial, reload } = usePredictabilityOverview();
  const f = data?.forecast ?? null;
  const cur = data?.meta.currency ?? 'BRL';
  const pipelineGross = data?.pipeline.grossAmount ?? null;

  const forecastSub =
    f?.forecastAmount != null
      ? `Confiança: ${f.confidenceScore != null ? formatPct(f.confidenceScore) : 'indisponível'}`
      : (unavailableReason(data, 'forecast.forecastAmount') ?? 'Indisponível');
  const gapSub =
    f?.gapToGoal != null
      ? `${formatPct(f.gapToGoalPct)} da meta de ${formatBRL(f.goalAmount, cur)}`
      : (unavailableReason(data, 'goals.goalAmount') ?? 'Indisponível');
  const pipelineSub =
    pipelineGross != null
      ? `${data?.pipeline.grossCount ?? 0} negócios abertos`
      : (unavailableReason(data, 'pipeline.grossAmount') ?? 'Indisponível');

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader title="Forecast de Vendas" icon={LineChart} />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="mb-4">
          <p className="text-sm text-[var(--ink-2)]">
            Projete seus resultados com base nos dados do CRM
            {data ? ` · período ${data.meta.period}` : ''}
          </p>
        </div>

        <PredictabilityStatusBanner
          what="o forecast"
          loading={loading}
          error={error}
          noRealData={noRealData}
          partial={partial}
          failedSources={data?.meta.failedSources}
          onRetry={reload}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Previsão de Fechamento"
            value={formatBRL(f?.forecastAmount, cur)}
            icon={TrendingUp}
            subtitle={forecastSub}
            variant="default"
          />
          <KpiCard
            title="Gap para a Meta"
            value={formatBRL(f?.gapToGoal, cur)}
            icon={Target}
            subtitle={gapSub}
            variant="default"
          />
          <KpiCard
            title="Pipeline Total Ativo"
            value={formatBRL(pipelineGross, cur)}
            icon={DollarSign}
            subtitle={pipelineSub}
            variant="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Composição do Forecast</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6">
              {f && f.forecastAmount != null ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {(
                    [
                      ['Fechado', f.closedAmount],
                      ['Commit', f.commitAmount],
                      ['Best Case', f.bestCaseAmount],
                      ['Upside', f.upsideAmount],
                      ['Meta', f.goalAmount],
                    ] as const
                  ).map(([label, v]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <dt className="text-[var(--ink-2)]">{label}</dt>
                      <dd className="font-semibold tabular-nums">{formatBRL(v, cur)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--ink-2)]">Win rate</dt>
                    <dd className="font-semibold tabular-nums">{formatPct(f.winRate)}</dd>
                  </div>
                </dl>
              ) : (
                <PredictabilityEmptyState
                  title="Sem dados de forecast"
                  hint={unavailableReason(data, 'forecast.forecastAmount')}
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Conversão por Etapa</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6">
              {f && f.stageConversion.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--ink-3)]">
                      <th className="py-1 font-medium">Etapa</th>
                      <th className="py-1 font-medium text-right">Período</th>
                      <th className="py-1 font-medium text-right">Histórico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.stageConversion.map((s) => (
                      <tr key={s.stageId} className="border-t border-[var(--line)]">
                        <td className="py-1.5">{s.label}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatPct(s.conversionFromPrevious)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatPct(s.historicalConversionFromPrevious)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <PredictabilityEmptyState
                  title="Sem dados por etapa"
                  hint={unavailableReason(data, 'forecast.stageConversion')}
                />
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Negócios no Forecast</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6">
              {f && f.topDeals.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--ink-3)]">
                      <th className="py-1 font-medium">Negócio</th>
                      <th className="py-1 font-medium">Responsável</th>
                      <th className="py-1 font-medium">Tier</th>
                      <th className="py-1 font-medium text-right">Valor</th>
                      <th className="py-1 font-medium text-right">Probabilidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.topDeals.map((d) => (
                      <tr key={d.id} className="border-t border-[var(--line)]">
                        <td className="py-1.5">{d.companyName ?? d.title ?? '—'}</td>
                        <td className="py-1.5 text-[var(--ink-2)]">{d.owner ?? '—'}</td>
                        <td className="py-1.5 text-[var(--ink-2)]">{d.tier ?? '—'}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatBRL(d.amount, cur)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatPct(d.probability)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <PredictabilityEmptyState
                  title="Nenhum negócio aberto"
                  hint={
                    data?.meta.failedSources.includes('deals')
                      ? 'Fonte de negócios indisponível'
                      : 'Sem negócios abertos no período.'
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
