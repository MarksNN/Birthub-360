import { AlertTriangle, Info, RefreshCw } from 'lucide-react';

/**
 * Estados honestos das telas de Orquestração de Vendas (P0 #693, Agente 02).
 * - erro da API → banner de erro com "Tentar novamente" (antes: fallback silencioso com seed)
 * - conteúdo template/seed → aviso "Demo/Exemplo"
 * Métricas nulas aparecem como "Indisponível" via `formatMetric`.
 */
export function OrchestrationStatusBanner({
  isTemplate,
  noRealData = false,
  error,
  onRetry,
}: {
  isTemplate: boolean;
  /** `meta.source === 'none'` (contrato 04): organização sem dados reais ainda. */
  noRealData?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
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
  if (isTemplate) {
    return (
      <div
        role="note"
        aria-label="Aviso de conteúdo de exemplo"
        className="flex gap-3 p-4 rounded-xl border border-[var(--nav-c-gold)]/30 bg-[var(--nav-c-gold)]/5"
      >
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-[var(--nav-c-gold)]" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold text-[var(--ink)] flex items-center gap-2">
            Conteúdo de exemplo <DemoBadge show label="Demo" />
          </p>
          <p className="text-xs text-[var(--ink-2)] mt-1">
            Os itens abaixo são modelos ilustrativos e{' '}
            <strong>não refletem a operação da sua organização</strong>. Métricas sem cálculo real
            aparecem como “Indisponível”.
          </p>
        </div>
      </div>
    );
  }
  if (noRealData) {
    return (
      <div
        role="note"
        aria-label="Sem dados reais"
        className="flex gap-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]"
      >
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-[var(--ink-3)]" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold text-[var(--ink)] flex items-center gap-2">
            Sem dados reais ainda <DemoBadge show label="Sem dados" />
          </p>
          <p className="text-xs text-[var(--ink-2)] mt-1">
            Sua organização ainda não tem playbooks ou cadências registrados. Nada é preenchido com
            exemplos; métricas sem cálculo real aparecem como “Indisponível”.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

/** Badge curto "Exemplo" para itens vindos de template. */
export function DemoBadge({ show, label = 'Exemplo' }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--nav-c-gold)]/15 text-[var(--nav-c-gold)]">
      {label}
    </span>
  );
}

/** Empty state honesto quando não há nada cadastrado / sem dados. */
export function OrchestrationEmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="p-8 text-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)]">
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      {hint && <p className="text-xs text-[var(--ink-3)] mt-1">{hint}</p>}
    </div>
  );
}

export const NO_API_SUBTITLE = 'Sem dados da API';
