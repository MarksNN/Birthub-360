import { Info } from 'lucide-react';

/**
 * Estado honesto dos hubs de Previsibilidade (P0 #693, Agente 02).
 * Forecast / Metas / Pipeline Ponderado exibiam valores em R$ fixos no código, sem API.
 * Até a leitura real (Agente 04 — PR B: crm overview + goals/forecast) estar plugada,
 * a tela mostra "Sem dados" em vez de números inventados.
 */
export const NO_DATA_VALUE = 'Sem dados';
export const NO_DATA_SUBTITLE = 'Leitura real ainda não conectada';

export function PredictabilityNoDataNotice({ what }: { what: string }) {
  return (
    <div
      role="note"
      className="flex gap-3 p-4 rounded-xl border border-[var(--nav-c-gold)]/30 bg-[var(--nav-c-gold)]/5"
    >
      <Info className="w-5 h-5 shrink-0 mt-0.5 text-[var(--nav-c-gold)]" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-semibold text-[var(--ink)]">Sem dados reais ainda</p>
        <p className="text-xs text-[var(--ink-2)] mt-1">
          {what} ainda não está conectado aos dados do CRM. Antes esta tela mostrava valores de
          exemplo fixos; agora nenhum número é exibido até a integração estar disponível.
        </p>
      </div>
    </div>
  );
}

export function PredictabilityEmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="p-8 text-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)]">
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      {hint && <p className="text-xs text-[var(--ink-3)] mt-1">{hint}</p>}
    </div>
  );
}
