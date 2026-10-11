import { AlertTriangle, Info, RefreshCw } from 'lucide-react';

/**
 * Estados honestos dos hubs de Previsibilidade (P0 #693, Agente 02).
 * Leitura real via `predictabilityApi` (Agente 04, PR #697). Nenhum R$ é inventado:
 * campo `null` → “Indisponível” com o motivo de `meta.unavailable`.
 */
export const NO_DATA_VALUE = 'Indisponível';

export function PredictabilityStatusBanner({
  what,
  loading,
  error,
  noRealData,
  partial,
  failedSources = [],
  onRetry,
}: {
  what: string;
  loading: boolean;
  error: string | null;
  noRealData: boolean;
  partial: boolean;
  failedSources?: string[];
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <p role="status" className="text-sm text-[var(--ink-2)]">
        Carregando {what}…
      </p>
    );
  }
  if (error) {
    return (
      <div
        role="alert"
        className="flex gap-3 p-4 rounded-xl border border-[var(--nav-c-red)]/30 bg-[var(--nav-c-red)]/5"
      >
        <AlertTriangle
          className="w-5 h-5 shrink-0 mt-0.5 text-[var(--nav-c-red)]"
          aria-hidden="true"
        />
        <div className="text-sm flex-1">
          <p className="font-semibold text-[var(--ink)]">Dados indisponíveis</p>
          <p className="text-xs text-[var(--ink-2)] mt-1">
            {error} Nenhum dado de exemplo foi exibido no lugar.
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Tentar novamente
          </button>
        )}
      </div>
    );
  }
  if (noRealData) {
    return (
      <div
        role="note"
        className="flex gap-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]"
      >
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-[var(--ink-3)]" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold text-[var(--ink)]">Sem dados reais no período</p>
          <p className="text-xs text-[var(--ink-2)] mt-1">
            Sua organização ainda não tem negócios ou meta registrados neste mês. Nada é preenchido
            com exemplos.
          </p>
        </div>
      </div>
    );
  }
  if (partial) {
    return (
      <div
        role="note"
        className="flex gap-3 p-4 rounded-xl border border-[var(--nav-c-gold)]/30 bg-[var(--nav-c-gold)]/5"
      >
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-[var(--nav-c-gold)]" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold text-[var(--ink)]">Leitura parcial</p>
          <p className="text-xs text-[var(--ink-2)] mt-1">
            Algumas fontes não responderam ({failedSources.join(', ')}). Os campos dependentes
            aparecem como “Indisponível”; o restante é real.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function PredictabilityEmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="p-8 text-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)]">
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      {hint && <p className="text-xs text-[var(--ink-3)] mt-1">{hint}</p>}
    </div>
  );
}
