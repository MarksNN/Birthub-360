import {
  Calculator,
  DollarSign,
  Info,
  Layers,
  LineChart,
  Scale,
  Target,
  TrendingUp,
} from 'lucide-react';
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-400" />
                    Explicabilidade do Modelo de Forecast & Pesos do Funil
                  </CardTitle>
                  <p className="text-xs text-[var(--ink-2)] mt-1">
                    Cálculo determinístico transparente: fórmula matemática e pesos de probabilidade
                    oficiais por etapa do funil (ativo mesmo com funil zerado).
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 self-start sm:self-auto">
                  Motor Determinístico v2
                </span>
              </div>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6 space-y-6">
              {/* Bloco 1: Fórmula Matemática */}
              <div className="p-4 rounded-xl bg-[var(--surface-subtle,#1A1D24)] border border-[var(--line)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-2)] uppercase tracking-wider">
                  <Info className="w-4 h-4 text-indigo-400" />
                  Fórmula Matemática do Forecast Total
                </div>
                <div className="font-mono text-sm sm:text-base font-semibold px-4 py-3 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-indigo-300 overflow-x-auto">
                  Forecast Total = Fechado + Commit + Best Case + Σ (Valor × Probabilidade)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-lg bg-[var(--bg)]/60 border border-[var(--line)]">
                    <div className="font-semibold text-emerald-400">1. Fechado (Won)</div>
                    <p className="text-[var(--ink-2)] mt-0.5">
                      100% do valor dos negócios já formalizados e ganhos no período corrente.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg)]/60 border border-[var(--line)]">
                    <div className="font-semibold text-blue-400">2. Commit (P ≥ 70%)</div>
                    <p className="text-[var(--ink-2)] mt-0.5">
                      100% do valor integral dos negócios com alta convicção e prontos para
                      assinatura.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg)]/60 border border-[var(--line)]">
                    <div className="font-semibold text-amber-400">
                      3. Best Case (40% ≤ P &lt; 70%)
                    </div>
                    <p className="text-[var(--ink-2)] mt-0.5">
                      100% do valor dos negócios em proposta ou negociação avançada.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg)]/60 border border-[var(--line)]">
                    <div className="font-semibold text-purple-400">
                      4. Pipeline (10% ≤ P &lt; 40%)
                    </div>
                    <p className="text-[var(--ink-2)] mt-0.5">
                      Valor ponderado estatisticamente pelo produto exato (Valor × P%).
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Pesos de Probabilidade por Etapa do Funil */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Pesos de Probabilidade Base por Etapa do Funil
                  </h4>
                  <span className="text-xs text-[var(--ink-2)]">Referência padrão do CRM</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-[var(--ink-3)] border-b border-[var(--line)]">
                        <th className="py-2 font-medium">Etapa do Funil</th>
                        <th className="py-2 font-medium text-center">Peso Base</th>
                        <th className="py-2 font-medium text-center">Tier Típico</th>
                        <th className="py-2 font-medium">Critério &amp; Evidência de Avanço</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      <tr>
                        <td className="py-2.5 font-medium">Qualificação (SDR)</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-zinc-500/10 text-zinc-300">
                            10%
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-xs text-[var(--ink-2)]">Pipeline</td>
                        <td className="py-2.5 text-xs text-[var(--ink-2)]">
                          Fit de ICP validado, decisores mapeados e necessidade confirmada.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium">Contato &amp; Diagnóstico</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/10 text-indigo-300">
                            20%
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-xs text-[var(--ink-2)]">Pipeline</td>
                        <td className="py-2.5 text-xs text-[var(--ink-2)]">
                          Primeiro contato efetivo realizado, dor do cliente e orçamento
                          confirmados.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium">Apresentação / Demonstração</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/10 text-indigo-300">
                            40%
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-xs text-[var(--ink-2)]">
                          Best Case
                        </td>
                        <td className="py-2.5 text-xs text-[var(--ink-2)]">
                          Solução apresentada aos decisores e alinhamento técnico concluído.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium">Proposta Comercial</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-300">
                            50%
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-xs text-[var(--ink-2)]">
                          Best Case
                        </td>
                        <td className="py-2.5 text-xs text-[var(--ink-2)]">
                          Proposta formal enviada com valores, escopo e prazos em análise executiva.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium">Negociação &amp; Alinhamento</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-300">
                            60%
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-xs text-[var(--ink-2)]">
                          Best Case
                        </td>
                        <td className="py-2.5 text-xs text-[var(--ink-2)]">
                          Contorno de objeções concluído, negociação de valores e termos aprovados.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium">Contrato &amp; Formalização</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-300">
                            80%
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-xs text-[var(--ink-2)]">Commit</td>
                        <td className="py-2.5 text-xs text-[var(--ink-2)]">
                          Minuta em compliance/jurídico, aguardando assinatura do comitê de compras.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium">Fechamento Ganho</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-400">
                            100%
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-xs text-emerald-400 font-semibold">
                          Fechado
                        </td>
                        <td className="py-2.5 text-xs text-[var(--ink-2)]">
                          Contrato devidamente assinado, ordem de faturamento e onboarding iniciado.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bloco 3: Calibração Dinâmica por Sinais */}
              <div className="p-4 rounded-xl bg-[var(--surface-subtle,#1A1D24)] border border-[var(--line)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-2)] uppercase tracking-wider">
                  <Scale className="w-4 h-4 text-indigo-400" />
                  Calibração Dinâmica do Motor (Ajuste Explicável por Sinais)
                </div>
                <p className="text-xs text-[var(--ink-2)]">
                  Cada oportunidade parte da probabilidade base da etapa e recebe ajustes objetivos
                  de acordo com sinais observáveis em tempo real:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--line)]">
                    <span className="font-semibold text-emerald-400">+10%</span> Próxima ação
                    agendada nos próximos 14 dias
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--line)]">
                    <span className="font-semibold text-rose-400">-15%</span> Próxima ação vencida
                    há &gt;7 dias ou sem ação
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--line)]">
                    <span className="font-semibold text-emerald-400">+5%</span> Interação recente
                    registrada nos últimos 7 dias
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--line)]">
                    <span className="font-semibold text-rose-400">-10%</span> Sem nenhuma interação
                    há mais de 30 dias
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--line)]">
                    <span className="font-semibold text-emerald-400">+5%</span> Previsão de
                    fechamento para os próximos 30 dias
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--line)]">
                    <span className="font-semibold text-rose-400">-5% a -15%</span> Penalidade por
                    adiamento da data prevista
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
