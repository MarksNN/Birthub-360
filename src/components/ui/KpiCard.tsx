import { useState, type ComponentType, type MouseEvent, type PointerEvent } from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';

/* Generalizado a partir de `KpiStat` (JoaoReisDiagnosticHub.tsx) — atualizado para novo visual Minimal Dark */
const KPI_TONES = {
  brand: {
    chip: 'border-[#38bdf8] text-[#38bdf8] bg-[#38bdf8]/10',
    trend: 'text-[#38bdf8]',
    glow: 'rgba(56,189,248,0.15)',
  },
  ink: {
    chip: 'border-slate-500 text-slate-400 bg-slate-800',
    trend: 'text-slate-400',
    glow: 'rgba(255,255,255,0.06)',
  },
  ok: {
    chip: 'border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10',
    trend: 'text-[#22c55e]',
    glow: 'rgba(34,197,94,0.15)',
  },
  gold: {
    chip: 'border-[#EAB308] text-[#EAB308] bg-[#EAB308]/10',
    trend: 'text-[#EAB308]',
    glow: 'rgba(234,179,8,0.15)',
  },
  critical: {
    chip: 'border-[#EF4444] text-[#EF4444] bg-[#EF4444]/10',
    trend: 'text-[#EF4444]',
    glow: 'rgba(239,68,68,0.15)',
  },
  iris: {
    chip: 'border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/10',
    trend: 'text-[#8B5CF6]',
    glow: 'rgba(139,92,246,0.15)',
  },
  cyan: {
    chip: 'border-[#06b6d4] text-[#06b6d4] bg-[#06b6d4]/10',
    trend: 'text-[#06b6d4]',
    glow: 'rgba(6,182,212,0.15)',
  },
  pulse: {
    chip: 'border-[#EC4899] text-[#EC4899] bg-[#EC4899]/10',
    trend: 'text-[#EC4899]',
    glow: 'rgba(236,72,153,0.15)',
  },
  orange: {
    chip: 'border-[#F97316] text-[#F97316] bg-[#F97316]/10',
    trend: 'text-[#F97316]',
    glow: 'rgba(249,115,22,0.15)',
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
    'group relative w-full overflow-hidden rounded-2xl border border-white/5 bg-[#1C1D24] p-5 text-left shadow-sm transition-all duration-300',
    onSelect &&
    'cursor-pointer active:scale-[0.98] hover:-translate-y-1 hover:border-white/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7DFF]',
    active && 'border-[#8B7DFF]/60 shadow-[0_0_0_2px_rgba(139,125,255,0.2)] bg-[#1F202B]',
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

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        {/* Top: Icon */}
        <div className="flex items-start justify-between">
          <span
            className={cn(
              'flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-dashed transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
              t.chip,
            )}
            style={{
              borderStyle:
                'solid' /* Override dashed with solid to match image, or keep border thin */,
            }}
          >
            <Icon className="h-5 w-5" />
          </span>

          {active && (
            <span
              className="relative flex h-2 w-2 items-center justify-center"
              aria-hidden="true"
              title="Card ativo"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8B7DFF] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#8B7DFF]" />
            </span>
          )}
        </div>

        {/* Middle: Value & Label */}
        <div>
          <h3 className="font-sans text-[26px] font-bold text-white tracking-tight leading-none mb-1.5">
            {value}
          </h3>
          <p className="text-[13px] font-medium text-slate-400">{displayLabel}</p>
        </div>

        {/* Bottom: Trend / Subtitle */}
        {(trend || displaySubtitle) && (
          <div className="flex items-center gap-1.5 mt-2">
            {trend && (
              <span className={cn('text-[11px] font-semibold', t.trend)}>
                {trend.isPositive !== false ? '+' : '-'}
                {trend.value}
                {trend.text ? ` ${trend.text}` : ''}
              </span>
            )}
            {displaySubtitle && (
              <span className={cn('text-[11px] text-slate-500', !trend && t.trend)}>
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
        className={sharedClassName}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      onPointerMove={handlePointerMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      } : undefined}
      className={sharedClassName}
    >
      {content}
    </div>
  );
}
