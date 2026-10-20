/**
 * Cockpit Preditivo de Receita — REMED-03/04 (auditoria forense @281cfcd3).
 *
 * Tudo vem do contrato honesto do Agente 04 (PR #15 @ c41fef50, tipos `*V2`):
 * - GET /api/commercial-intelligence/predictive/cockpit e /backtest. `insufficient_data`/`null` →
 *   estado vazio; nenhum número fictício (os antigos `INITIAL_*` e o simulador com coeficientes
 *   inventados foram removidos).
 * - POST .../rebalance/approvals: a decisão é persistida e auditada, mas `appliedToCrm: false` — a
 *   UI diz "decisão registrada; owner não alterado no CRM" e nunca afirma que reatribuiu.
 *
 * Recomendações de rebalanceamento: o contrato ainda não expõe GET de recomendações, então a lista
 * chega por prop (vazia por padrão → estado vazio). TODO(contrato-04): ligar ao GET quando existir.
 */
import { AlertTriangle, Check, Loader2, RefreshCw, Scale, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card.js';
import { useAuth } from '../../../contexts/AuthContext.js';
import type {
  AccountAllocationRecommendation,
  BacktestValidationMetricsV2,
  ExecutiveRevenueCockpitV2,
  ProjectedRevenueHorizonV2,
  RebalanceApprovalRecord,
} from '../../../shared/contracts/predictiveRevenueOracle.contract.js';
import {
  canApproveRebalance,
  getPredictiveBacktest,
  getPredictiveCockpit,
  RebalanceApprovalApiError,
  submitRebalanceApproval,
} from '../rebalance.api.js';

type Decision = 'APPROVED' | 'REJECTED';
type HorizonKey = 'days30' | 'days90' | 'days180';
const HORIZONS: { key: HorizonKey; label: string }[] = [
  { key: 'days30', label: '30d' },
  { key: 'days90', label: '90d' },
  { key: 'days180', label: '180d' },
];

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const money = (val: number | null | undefined) => (val == null ? '—' : formatCurrency(val));

interface RowState {
  pending: Decision | null;
  record: RebalanceApprovalRecord | null;
  alreadyRecorded: boolean;
  error: RebalanceApprovalApiError | null;
  lastDecision: Decision | null;
}
const EMPTY_ROW: RowState = {
  pending: null,
  record: null,
  alreadyRecorded: false,
  error: null,
  lastDecision: null,
};

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-ink-2 flex items-center gap-2" data-testid="empty-state">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

function ProjectionPanel({ projection }: { projection: ProjectedRevenueHorizonV2 }) {
  if (projection.status === 'insufficient_data' || projection.expectedRevenue == null) {
    return (
      <EmptyState>
        Histórico insuficiente para projetar {projection.horizonDays} dias
        {projection.insufficientDataReason ? `: ${projection.insufficientDataReason}` : '.'}
      </EmptyState>
    );
  }
  const ci = projection.confidenceInterval;
  return (
    <div className="space-y-2 text-xs text-ink-2">
      <p>
        Receita esperada: <strong className="text-ink">{money(projection.expectedRevenue)}</strong>
        {projection.uncertaintyDegree ? ` · incerteza ${projection.uncertaintyDegree}` : ''}
      </p>
      {ci ? (
        <p>
          P10 {money(ci.p10)} · P50 {money(ci.p50)} · P90 {money(ci.p90)}
        </p>
      ) : (
        <EmptyState>Intervalo de confiança indisponível.</EmptyState>
      )}
      <p>
        Pipeline ponderado: <strong>{money(projection.pipelineWeightedAmount)}</strong>
        {projection.projectedWonDealsCount != null
          ? ` · ${projection.projectedWonDealsCount} negócios projetados`
          : ''}{' '}
        ({projection.sampleWindows} janelas históricas)
      </p>
      {projection.keyDrivers.length > 0 && (
        <ul className="list-disc pl-4">
          {projection.keyDrivers.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BacktestPanel({ backtest }: { backtest: BacktestValidationMetricsV2 }) {
  if (backtest.status === 'INSUFFICIENT_DATA' || backtest.samplesEvaluated === 0) {
    return (
      <EmptyState>
        Backtest sem amostras suficientes
        {backtest.insufficientDataReason ? `: ${backtest.insufficientDataReason}` : '.'}
      </EmptyState>
    );
  }
  const pct = (v: number | null) => (v == null ? '—' : `${v}%`);
  return (
    <div className="text-xs text-ink-2 space-y-1">
      <p>
        Período {backtest.evaluationPeriod} · {backtest.samplesEvaluated} amostras ·{' '}
        {backtest.isModelCalibrated ? 'modelo calibrado' : 'estimativa não calibrada'}
      </p>
      <p>
        MAPE {pct(backtest.meanAbsolutePercentageError)} · MAE {money(backtest.meanAbsoluteError)} ·
        viés {money(backtest.predictionBias)} · cobertura P10–P90{' '}
        {pct(backtest.predictionIntervalCoveragePercent)}
      </p>
    </div>
  );
}

export interface PredictiveRevenueCockpitProps {
  /** TODO(contrato-04): sem GET de recomendações no contrato; vazio → estado vazio. */
  recommendations?: AccountAllocationRecommendation[];
}

export function PredictiveRevenueCockpit({ recommendations = [] }: PredictiveRevenueCockpitProps) {
  const { currentUser } = useAuth();
  const canDecide = canApproveRebalance(currentUser?.role);

  const [cockpit, setCockpit] = useState<ExecutiveRevenueCockpitV2 | null>(null);
  const [backtest, setBacktest] = useState<BacktestValidationMetricsV2 | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState<HorizonKey>('days30');
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [c, b] = await Promise.allSettled([getPredictiveCockpit(), getPredictiveBacktest()]);
    setCockpit(c.status === 'fulfilled' ? c.value : null);
    setBacktest(b.status === 'fulfilled' ? b.value : null);
    if (c.status === 'rejected') {
      setLoadError(c.reason instanceof Error ? c.reason.message : 'Falha ao carregar o cockpit.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchRow = (id: string, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...EMPTY_ROW, ...prev[id], ...patch } }));

  const decide = async (rec: AccountAllocationRecommendation, decision: Decision) => {
    if (!canDecide || rows[rec.recommendationId]?.pending) return;
    patchRow(rec.recommendationId, { pending: decision, error: null, lastDecision: decision });
    try {
      // TODO(contrato-04): recomendação legada só tem targetAccountId e NOMES de owner; o contrato
      // pede leadId + ids de owner. Mapeamento provisório até o GET de recomendações V2.
      const res = await submitRebalanceApproval({
        recommendationId: rec.recommendationId,
        leadId: rec.targetAccountId,
        fromOwner: rec.currentOwnerName ?? null,
        toOwner: rec.suggestedOwnerName,
        decision,
      });
      patchRow(rec.recommendationId, {
        pending: null,
        record: res.approval,
        alreadyRecorded: res.alreadyRecorded,
      });
    } catch (err) {
      const apiErr =
        err instanceof RebalanceApprovalApiError
          ? err
          : new RebalanceApprovalApiError(
              err instanceof Error ? err.message : 'Falha ao registrar a decisão.',
              'unknown',
              null,
            );
      patchRow(rec.recommendationId, {
        pending: null,
        error: apiErr,
        record: apiErr.kind === 'conflict' ? apiErr.existing : null,
      });
    }
  };

  const projection = cockpit?.projections[horizon] ?? null;

  return (
    <div className="space-y-6" data-testid="predictive-revenue-cockpit">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-brand" aria-hidden="true" /> Cockpit Preditivo de
          Receita
        </h1>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-3 w-3" aria-hidden="true" /> Atualizar
        </Button>
      </header>

      {loading && (
        <p className="text-xs text-ink-2 flex items-center gap-2" role="status">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Carregando dados reais…
        </p>
      )}
      {loadError && (
        <p role="alert" className="text-xs text-rose-500">
          {loadError}
        </p>
      )}

      {cockpit && (
        <Card>
          <CardHeader>
            <CardTitle>Período {cockpit.currentPeriod}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-ink-2">
            {cockpit.status === 'insufficient_data' && (
              <EmptyState>
                Dados insuficientes para o oráculo
                {cockpit.insufficientDataReason ? `: ${cockpit.insufficientDataReason}` : '.'}
              </EmptyState>
            )}
            <p>
              Meta:{' '}
              {cockpit.currentQuota == null ? (
                <a href="/app/metas" className="underline">
                  meta em /goals
                </a>
              ) : (
                <strong>{money(cockpit.currentQuota)}</strong>
              )}{' '}
              · Fechado: <strong>{money(cockpit.closedWonRevenue)}</strong>
              {cockpit.quotaAttainmentPercent != null
                ? ` (${cockpit.quotaAttainmentPercent}% da meta)`
                : ''}{' '}
              · Pipeline ponderado: <strong>{money(cockpit.weightedPipelineRevenue)}</strong>
            </p>
            <div className="flex gap-2" role="tablist" aria-label="Horizonte">
              {HORIZONS.map((h) => (
                <Button
                  key={h.key}
                  size="sm"
                  role="tab"
                  aria-selected={horizon === h.key}
                  variant={horizon === h.key ? 'default' : 'outline'}
                  onClick={() => setHorizon(h.key)}
                >
                  Horizonte {h.label}
                </Button>
              ))}
            </div>
            {projection && <ProjectionPanel projection={projection} />}
          </CardContent>
        </Card>
      )}

      {backtest && (
        <Card>
          <CardHeader>
            <CardTitle>Backtest do modelo</CardTitle>
          </CardHeader>
          <CardContent>
            <BacktestPanel backtest={backtest} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" aria-hidden="true" /> Rebalanceamento de carteira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canDecide && (
            <p className="text-xs text-ink-2">
              Apenas Admin e Gestor podem decidir rebalanceamentos.
            </p>
          )}
          {recommendations.length === 0 ? (
            <EmptyState>Nenhuma recomendação de rebalanceamento disponível.</EmptyState>
          ) : (
            recommendations.map((rec) => {
              const row = rows[rec.recommendationId] ?? EMPTY_ROW;
              const decided = row.record;
              return (
                <div
                  key={rec.recommendationId}
                  className="flex flex-col gap-2 border border-line rounded-lg p-3"
                >
                  <p className="text-xs text-ink-2">
                    <strong className="text-ink">{rec.targetAccountName}</strong>: de{' '}
                    {rec.currentOwnerName ?? 'sem responsável'} para {rec.suggestedOwnerName}
                  </p>
                  {decided ? (
                    <div className="text-xs" role="status">
                      <Badge variant="outline">
                        {decided.decision === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>{' '}
                      {row.error?.kind === 'conflict'
                        ? 'Decisão já registrada anteriormente para esta recomendação.'
                        : row.alreadyRecorded
                          ? 'Decisão já estava registrada.'
                          : 'Decisão registrada.'}{' '}
                      {!decided.appliedToCrm && 'Owner não alterado no CRM.'}
                    </div>
                  ) : (
                    <>
                      {row.error && (
                        <div role="alert" className="text-xs text-rose-500 space-y-1">
                          <p>{row.error.message}</p>
                          {Object.entries(row.error.fieldErrors).map(([field, msgs]) => (
                            <p key={field}>
                              {field}: {msgs.join(', ')}
                            </p>
                          ))}
                          {row.error.kind !== 'forbidden' && row.lastDecision && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void decide(rec, row.lastDecision as Decision)}
                            >
                              Tentar de novo
                            </Button>
                          )}
                        </div>
                      )}
                      {canDecide && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={row.pending !== null}
                            aria-busy={row.pending === 'APPROVED'}
                            onClick={() => void decide(rec, 'APPROVED')}
                          >
                            {row.pending === 'APPROVED' ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                            ) : (
                              <Check className="h-3 w-3" aria-hidden="true" />
                            )}{' '}
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={row.pending !== null}
                            aria-busy={row.pending === 'REJECTED'}
                            onClick={() => void decide(rec, 'REJECTED')}
                          >
                            {row.pending === 'REJECTED' ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                            ) : (
                              <X className="h-3 w-3" aria-hidden="true" />
                            )}{' '}
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
