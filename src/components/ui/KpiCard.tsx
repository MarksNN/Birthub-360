import { type ComponentType, type MouseEvent, type PointerEvent, useState } from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';

/* Operate Impeccable — tones via tokens semânticos (light + dark). */
const KPI_TONES = {
  brand: {
    chip: 'border-brand/40 text-brand-text bg-brand/10',
    trend: 'text-brand-text',
    glow: 'color-mix(in srgb, var(--brand) 22%, transparent)',
  },
  ink: {
    chip: 'border-line text-ink-2 bg-surface-2',
    trend: 'text-ink-2',
    glow: 'color-mix(in srgb, var(--ink) 8%, transparent)',
  },
  ok: {
    chip: 'border-ok/40 text-ok-active bg-ok/10',
    trend: 'text-ok-active',
    glow: 'color-mix(in srgb, var(--ok) 22%, transparent)',
  },
  gold: {
    chip: 'border-[color:var(--gold)]/40 text-[color:var(--gold)] bg-[color:var(--gold)]/10',
    trend: 'text-[color:var(--gold)]',
    glow: 'color-mix(in srgb, var(--gold) 22%, transparent)',
  },
  critical: {
    chip: 'border-critical/40 text-critical-active bg-critical/10',
    trend: 'text-critical-active',
    glow: 'color-mix(in srgb, var(--critical) 22%, transparent)',
  },
  iris: {
    chip: 'border-[color:var(--iris)]/40 text-[color:var(--iris)] bg-[color:var(--iris)]/10',
    trend: 'text-[color:var(--iris)]',
    glow: 'color-mix(in srgb, var(--iris) 22%, transparent)',
  },
  cyan: {
    chip: 'border-brand/40 text-brand-text bg-brand/10',
    trend: 'text-brand-text',
    glow: 'color-mix(in srgb, var(--brand) 22%, transparent)',
  },
  pulse: {
    chip: 'border-[color:var(--pulse)]/40 text-[color:var(--pulse)] bg-[color:var(--pulse)]/10',
    trend: 'text-[color:var(--pulse)]',
    glow: 'color-mix(in srgb, var(--pulse) 22%, transparent)',
  },
  orange: {
    chip: 'border-warning/40 text-warning bg-warning/10',
    trend: 'text-warning',
    glow: 'color-mix(in srgb, var(--warning, #f97316) 22%, transparent)',
  },
} as const;

export type KpiTone = keyof typeof KPI_TONES;

export interface KpiCardProps {
  icon: ComponentType<{ className?: string }>;
  label?: string;
  title?: string;
  value: string | number;
  caption?: string;
  subtitle?: string;
  tone?: KpiTone;
  variant?: string;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    text?: string;
  };
  spotlight?: boolean;
  sound?: boolean;
  onSelect?: () => void;
  active?: boolean;
  className?: string;
}

export function KpiCard({
  icon: Icon,
  label,
  title,
  value,
  caption,
  subtitle,
  tone,
  variant,
  trend,
  spotlight = true,
  sound = true,
  onSelect,
  active = false,
  className,
}: KpiCardProps) {
  const displayLabel = label ?? title ?? '';
  const displaySubtitle = caption ?? subtitle;
  const rawTone = tone ?? variant ?? 'ink';
  const t = KPI_TONES[rawTone as KpiTone] ?? KPI_TONES.ink;
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    if (spotlight) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (sound && onSelect) {
      SoundFX.play('hover');
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (_e: MouseEvent<HTMLButtonElement>) => {
    if (sound) {
      SoundFX.play('click');
    }
    onSelect?.();
  };

  const sharedClassName = cn(
    'bh-platform-card group relative w-full overflow-hidden rounded-card border border-line bg-surface/90 dark:bg-[#0f172a]/85 backdrop-blur-md p-5 text-left text-ink shadow-card transition-all duration-200 border-t border-t-white/20 dark:border-t-white/10',
    onSelect &&
      'cursor-pointer active:scale-[0.98] hover:-translate-y-1 hover:border-line-strong hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    active &&
      'border-brand/60 bg-surface-elevated shadow-[0_0_0_2px_color-mix(in_srgb,var(--brand)_25%,transparent)]',
    className,
  );

  const content = (
    <>
      {spotlight && isHovered && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300"
          style={{
            background: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, ${t.glow}, transparent 70%)`,
          }}
        />
      )}

      <div className="relative z-10 flex h-full flex-col justify-between space-y-4">
        <div className="flex items-start justify-between">
          <span
            className={cn(
              'flex h-[38px] w-[38px] items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
              t.chip,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>

          {active && (
            <span
              className="relative flex h-2 w-2 items-center justify-center"
              aria-hidden="true"
              title="Card ativo"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
          )}
        </div>

        <div>
          <h3 className="mb-1.5 font-mono text-[26px] font-bold leading-none tracking-tight text-ink">
            {value}
          </h3>
          <p className="text-[13px] font-medium text-ink-2">{displayLabel}</p>
        </div>

        {(trend || displaySubtitle) && (
          <div className="mt-2 flex items-center gap-1.5">
            {trend && (
              <span className={cn('text-xs leading-relaxed font-semibold', t.trend)}>
                {trend.isPositive !== false ? '+' : '-'}
                {trend.value}
                {trend.text ? ` ${trend.text}` : ''}
              </span>
            )}
            {displaySubtitle && (
              <span className={cn('text-xs leading-relaxed text-ink-2', !trend && t.trend)}>
                {displaySubtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-pressed={active}
        data-accent={
          rawTone === 'ok'
            ? 'success'
            : rawTone === 'critical'
              ? 'danger'
              : rawTone === 'pulse'
                ? 'pink'
                : rawTone === 'orange'
                  ? 'gold'
                  : rawTone === 'ink'
                    ? 'blue'
                    : rawTone
        }
        className={sharedClassName}
      >
        {content}
      </button>
    );
  }

  // Ramo sem onSelect: puramente apresentacional (sem role/teclado/ponteiro).
  // Sem onSelect?.() aqui — após o early-return, TS estreita onSelect a undefined (TS2349, #702).
  // Sem handlers de ponteiro (Biome noStaticElementInteractions); spotlight/hover SFX só no <button>.
  return (
    <div
      data-accent={
        rawTone === 'ok'
          ? 'success'
          : rawTone === 'critical'
            ? 'danger'
            : rawTone === 'pulse'
              ? 'pink'
              : rawTone === 'orange'
                ? 'gold'
                : rawTone === 'ink'
                  ? 'blue'
                  : rawTone
      }
      className={sharedClassName}
    >
      {content}
    </div>
  );
}
