import { ArrowUpRight, Target, Trophy } from 'lucide-react';
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

// P0 #693 (Agente 02): leitura real via predictabilityApi (Agente 04, PR #697).
// Meta só por organização (NEW_MRR): sellers[].goalAmount é sempre null → coluna "Meta" indisponível.

export function MetasHub() {
  const { data, loading, error, noRealData, partial, reload } = usePredictabilityOverview();
  const g = data?.goals ?? null;
  const cur = data?.meta.currency ?? 'BRL';

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader title="Metas e Projeções" icon={Target} />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="mb-4">
          <p className="text-sm text-[var(--ink-2)]">
            Acompanhamento de cotas e performance do time
            {data ? ` · período ${data.meta.period}` : ''}
          </p>
        </div>

        <PredictabilityStatusBanner
          what="as metas"
          loading={loading}
          error={error}
          noRealData={noRealData}
          partial={partial}
          failedSources={data?.meta.failedSources}
          onRetry={reload}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Meta Global do Mês"
            value={formatBRL(g?.goalAmount, cur)}
            icon={Target}
            subtitle={
              g?.goalAmount != null
                ? `Faltam ${formatBRL(g.remainingAmount, cur)}`
                : (unavailableReason(data, 'goals.goalAmount') ?? 'Indisponível')
            }
            variant="default"
          />
          <KpiCard
            title="Total Atingido"
            value={formatBRL(g?.closedAmount, cur)}
            icon={Trophy}
            subtitle={
              g?.pctOfGoal != null
                ? `${formatPct(g.pctOfGoal)} da meta`
                : (unavailableReason(data, 'goals.closedAmount') ??
                  unavailableReason(data, 'goals.goalAmount') ??
                  'Indisponível')
            }
            variant="default"
          />
          <KpiCard
            title="Projeção do Mês"
            value={formatBRL(g?.projectedAmount, cur)}
            icon={ArrowUpRight}
            subtitle={
              g?.projectedPctOfGoal != null
                ? `${formatPct(g.projectedPctOfGoal)} da meta`
                : (unavailableReason(data, 'forecast.forecastAmount') ?? 'Sem meta para comparar')
            }
            variant="default"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Vendedor</CardTitle>
          </CardHeader>
          <CardContent className="border-t border-[var(--line)] pt-6">
            {g && g.sellers.length > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--ink-3)]">
                      <th className="py-1 font-medium">Vendedor</th>
                      <th className="py-1 font-medium text-right">Meta</th>
                      <th className="py-1 font-medium text-right">Ganhos</th>
                      <th className="py-1 font-medium text-right">Perdidos</th>
                      <th className="py-1 font-medium text-right">Win rate</th>
                      <th className="py-1 font-medium text-right">Em aberto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.sellers.map((s) => (
                      <tr key={s.owner} className="border-t border-[var(--line)]">
                        <td className="py-1.5">{s.owner}</td>
                        <td className="py-1.5 text-right text-[var(--ink-3)]">Indisponível</td>
                        <td className="py-1.5 text-right tabular-nums">{s.wonCount}</td>
                        <td className="py-1.5 text-right tabular-nums">{s.lostCount}</td>
                        <td className="py-1.5 text-right tabular-nums">{formatPct(s.winRate)}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatBRL(s.openAmount, cur)} ({s.openCount})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-[var(--ink-3)] mt-3">
                  Meta por vendedor: {unavailableReason(data, 'goals.sellers.goalAmount')} — metas
                  são cadastradas só por organização.
                </p>
              </>
            ) : (
              <PredictabilityEmptyState
                title="Sem dados por vendedor"
                hint={
                  unavailableReason(data, 'goals.sellers') ??
                  'Nenhum vendedor com negócios no período.'
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
