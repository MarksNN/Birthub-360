import { useCallback, useEffect, useState } from 'react';
import { orchestrationApi, type SalesOrchestrationOverview } from '../orchestration.api.js';

/**
 * Normaliza a resposta para a UI nunca exibir número inventado (P0 #693, Agente 02).
 *
 * Contrato do Agente 04 (agente/04-p0-693-orquestracao-honesta): `meta.source` 'real' | 'none',
 * métricas sem cálculo vêm `null` e listadas em `meta.unavailableMetrics`; jornadas/processos/
 * roteiros vêm `[]` (`meta.emptySections`). Respeitamos o que vier.
 *
 * Servidor anterior ao contrato (sem `meta`) responde com seed/métricas fixas no código: nesse caso
 * tratamos tudo como TEMPLATE e anulamos as métricas → “Indisponível” + badge Exemplo.
 */
function normalize(raw: SalesOrchestrationOverview): {
  data: SalesOrchestrationOverview;
  isTemplate: boolean;
} {
  const source = (raw.meta as { source?: string } | undefined)?.source;
  if (source) {
    return {
      data: {
        ...raw,
        playbooks: raw.playbooks ?? [],
        jornadas: raw.jornadas ?? [],
        processos: raw.processos ?? [],
        roteiros: raw.roteiros ?? [],
      },
      isTemplate: source === 'template',
    };
  }
  const nulled = {
    ...raw,
    kpis: {
      ...raw.kpis,
      aderenciaPlaybook: null,
      speedToLeadMin: null,
      playbooksAtivos: raw.playbooks?.length ?? 0,
    },
    playbooks: (raw.playbooks ?? []).map((p) => ({ ...p, complianceRate: null })),
    jornadas: (raw.jornadas ?? []).map((j) => ({
      ...j,
      conversionRate: null,
    })),
    processos: raw.processos ?? [],
    roteiros: (raw.roteiros ?? []).map((r) => ({ ...r, taxaSucesso: null })),
    meta: {
      source: 'none',
      unavailableMetrics: [
        'aderenciaPlaybook',
        'speedToLeadMin',
        'complianceRate',
        'conversionRate',
        'taxaSucesso',
      ],
    },
  } satisfies SalesOrchestrationOverview;
  return { data: nulled, isTemplate: true };
}

/** Carrega o overview com estados explícitos de loading/erro (sem fallback falso). */
export function useOrchestrationOverview() {
  const [data, setData] = useState<SalesOrchestrationOverview | null>(null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce dispara o reload
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    orchestrationApi
      .getOverview()
      .then((res) => {
        if (!mounted) return;
        const n = normalize(res);
        setData(n.data);
        setIsTemplate(n.isTemplate);
        setSource(n.isTemplate ? 'template' : (n.data.meta?.source ?? null));
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setData(null);
        setSource(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os dados de orquestração de vendas.',
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
  /** `meta.source === 'none'`: organização ainda sem dados reais (não é erro nem demo). */
  const noRealData = !loading && !error && source === 'none';
  return { data, isTemplate, noRealData, loading, error, reload };
}

/** Formata métrica possivelmente nula. Nunca inventa valor. */
export function formatMetric(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined || Number.isNaN(value)
    ? 'Indisponível'
    : `${value}${suffix}`;
}
