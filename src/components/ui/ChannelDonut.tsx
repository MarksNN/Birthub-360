import { SoundFX } from '../../lib/soundEffects.js';

/* Generalizado a partir de `ChannelDonut` com estética de visualização de dados 2026. */
export interface ChannelDonutProps {
  data: Record<string, number>;
  /** Cor por rótulo (token CSS, ex. `var(--brand)`) — sem entrada usa `var(--ink-2)`. */
  colorMap?: Record<string, string>;
  totalLabel?: string;
  formatLabel?: (label: string) => string;
  /** Mostrado no lugar da lista quando `data` não tem nenhuma entrada com valor > 0. */
  emptyLabel?: string;
  soundHover?: boolean;
}

export function ChannelDonut({
  data,
  colorMap = {},
  totalLabel = 'total',
  formatLabel = (label) => label,
  emptyLabel = 'Sem dados neste período.',
  soundHover = false,
}: ChannelDonutProps) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(data)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
  let acc = 0;
  const stops = sorted
    .map(([label, value]) => {
      const from = (acc / total) * 100;
      acc += value;
      const to = (acc / total) * 100;
      return `${colorMap[label] ?? 'var(--ink-2)'} ${from}% ${to}%`;
    })
    .join(', ');

  const ringBackground = sorted.length > 0 ? `conic-gradient(${stops})` : 'var(--surface-2)';

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        role="img"
        aria-label={`${total} ${totalLabel}`}
        className="relative h-32 w-32 shrink-0 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-transform duration-300 hover:scale-105"
        style={{ background: ringBackground }}
      >
        <div className="absolute inset-[16%] flex flex-col items-center justify-center rounded-full bg-surface-elevated/95 shadow-[inset_0_2px_8px_rgba(0,0,0,0.2),0_0_0_1px_var(--line)] backdrop-blur-md">
          <span className="font-mono text-2xl font-black tabular-nums text-ink">{total}</span>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand">
            {totalLabel}
          </span>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="min-w-[220px] flex-1 text-xs text-ink-2">{emptyLabel}</p>
      ) : (
        <div className="min-w-[220px] flex-1 space-y-2">
          {sorted.map(([label, value]) => {
            const pct = Math.round((value / total) * 1000) / 10;
            return (
              <div
                key={label}
                role="presentation"
                onMouseEnter={() => {
                  if (soundHover) SoundFX.play('hover');
                }}
                className="group grid grid-cols-[10px_1fr_auto] items-center gap-3 p-1.5 rounded-lg transition-colors hover:bg-surface-elevated/60"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full shadow-xs transition-transform duration-200 group-hover:scale-125"
                  style={{ background: colorMap[label] ?? 'var(--ink-2)' }}
                />
                <span className="truncate text-xs font-bold text-ink group-hover:text-brand transition-colors">
                  {formatLabel(label)}
                </span>
                <span className="text-right font-mono text-[11px] font-semibold tabular-nums text-ink-2 group-hover:text-ink">
                  {value}{' '}
                  <span className="text-[10px] text-brand font-bold bg-brand/10 px-1.5 py-0.5 rounded-full border border-brand/20 ml-1">
                    {pct}%
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
