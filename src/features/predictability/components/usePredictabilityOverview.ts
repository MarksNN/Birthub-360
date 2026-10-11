import { useCallback, useEffect, useState } from 'react';
import {
  PredictabilityApiError,
  type PredictabilityOverview,
  type PredictabilityUnavailableReason,
  predictabilityApi,
} from '../predictability.api.js';

/**
 * Leitura real de Previsibilidade (P0 #693 — contrato do Agente 04, PR #697 @ 08b1548).
 * - `PredictabilityApiError` só quando as 4 fontes falham → estado de erro (sem fallback).
 * - `meta.source === 'none'` → vazio honesto.
 * - Falha parcial (`meta.failedSources`) → resto da tela segue; campos da fonte caída ficam null.
 */
export function usePredictabilityOverview() {
  const [data, setData] = useState<PredictabilityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce dispara o reload
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    predictabilityApi
      .getOverview()
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setData(null);
        setError(
          err instanceof PredictabilityApiError || err instanceof Error
            ? err.message
            : 'Não foi possível carregar a previsibilidade comercial.',
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const noRealData = !loading && !error && data?.meta.source === 'none';
  const partial = !loading && !error && (data?.meta.failedSources.length ?? 0) > 0;
  return { data, loading, error, noRealData, partial, reload };
}

const REASON_LABEL: Record<PredictabilityUnavailableReason, string> = {
  sem_dados: 'Sem dados no período',
  sem_meta: 'Meta do mês não cadastrada',
  fonte_indisponivel: 'Fonte indisponível',
  nao_suportado: 'Não suportado no modelo atual',
  amostra_parcial: 'Amostra parcial (mais de 200 negócios abertos)',
};

/** Motivo legível para um campo nulo, a partir de `meta.unavailable`. */
export function unavailableReason(
  data: PredictabilityOverview | null,
  field: string,
): string | undefined {
  const hit = data?.meta.unavailable.find((u) => u.field === field);
  return hit ? REASON_LABEL[hit.reason] : undefined;
}

export function formatBRL(value: number | null | undefined, currency = 'BRL'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Indisponível';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Indisponível';
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
}
