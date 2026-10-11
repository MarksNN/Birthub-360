import { useCallback, useEffect, useState } from 'react';
import { orchestrationApi, type SalesOrchestrationOverview } from '../orchestration.api.js';

/**
 * Normaliza a resposta para a UI nunca exibir número inventado (P0 #693, Agente 02).
 *
 * Servidor anterior ao contrato do Agente 04 responde sem `meta` e com métricas seed
 * (complianceRate/aderência/conversão/eficácia fixas no código). Nesse caso tratamos tudo como
 * TEMPLATE e anulamos as métricas → a tela mostra “Indisponível” + badge Exemplo.
 * Com o contrato do 04 (`meta.source` 'real' | 'template' | 'none'), respeitamos o que vier.
 */
function normalize(raw: SalesOrchestrationOverview): {
  data: SalesOrchestrationOverview;
  isTemplate: boolean;
} {
  const source = (raw.meta as { source?: string } | undefined)?.source;
  if (source) {
    return { data: raw, isTemplate: source === 'template' };
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
      conversionRate: null as unknown as number,
    })),
    processos: raw.processos ?? [],
    roteiros: (raw.roteiros ?? []).map((r) => ({ ...r, taxaSucesso: null as unknown as number })),
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
  } as SalesOrchestrationOverview;
  return { data: nulled, isTemplate: true };
}

/** Carrega o overview com estados explícitos de loading/erro (sem fallback falso). */
export function useOrchestrationOverview() {
  const [data, setData] = useState<SalesOrchestrationOverview | null>(null);
  const [isTemplate, setIsTemplate] = useState(false);
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
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setData(null);
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
  return { data, isTemplate, loading, error, reload };
}

/** Formata métrica possivelmente nula. Nunca inventa valor. */
export function formatMetric(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined || Number.isNaN(value)
    ? 'Indisponível'
    : `${value}${suffix}`;
}
