import type { ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export type PageTitleAccent =
  | 'brand'
  | 'iris'
  | 'success'
  | 'warning'
  | 'pink'
  | 'gold'
  | 'neutral';

// Tokens do tema (globals.css) — pares claro/escuro já calibrados para contraste AA.
const ACCENTS: Record<
  PageTitleAccent,
  { bar: string; chip: string; title: string; eyebrow: string; card: string }
> = {
  brand: {
    bar: 'bg-[color:var(--brand-text)]',
    chip: 'border-line bg-[color:color-mix(in_srgb,var(--ink)_4%,var(--surface))] text-ink',
    title: 'text-ink',
    eyebrow: 'text-ink-2',
    card: '',
  },
  pink: {
    bar: 'bg-[color:var(--color-heading-pink)]',
    chip: 'border-line bg-[color:color-mix(in_srgb,var(--ink)_4%,var(--surface))] text-ink',
    title: 'text-ink',
    eyebrow: 'text-ink-2',
    card: '',
  },
  gold: {
    bar: 'bg-[color:var(--color-heading-gold)]',
    chip: 'border-line bg-[color:color-mix(in_srgb,var(--ink)_4%,var(--surface))] text-ink',
    title: 'text-ink',
    eyebrow: 'text-ink-2',
    card: '',
  },
  iris: {
    bar: 'bg-[color:var(--iris)]',
    chip: 'border-line bg-[color:color-mix(in_srgb,var(--ink)_4%,var(--surface))] text-ink',
    title: 'text-ink',
    eyebrow: 'text-ink-2',
    card: '',
  },
  success: {
    bar: 'bg-[color:var(--ok)]',
    chip: 'border-line bg-[color:color-mix(in_srgb,var(--ink)_4%,var(--surface))] text-ink',
    title: 'text-ink',
    eyebrow: 'text-ink-2',
    card: '',
  },
  warning: {
    bar: 'bg-[color:var(--gold)]',
    chip: 'border-line bg-[color:color-mix(in_srgb,var(--ink)_4%,var(--surface))] text-ink',
    title: 'text-ink',
    eyebrow: 'text-ink-2',
    card: '',
  },
  neutral: {
    bar: 'bg-line-strong',
    chip: 'border-line bg-[color:color-mix(in_srgb,var(--ink)_4%,var(--surface))] text-ink',
    title: 'text-ink',
    eyebrow: 'text-ink-2',
    card: '',
  },
};

interface PageTitleCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Rótulo curto acima do título (ex.: "PIPELINE COMERCIAL"). */
  eyebrow?: string;
  /** Elemento de ícone já instanciado (ex.: `<Target className="h-5 w-5" />`). */
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  accent?: PageTitleAccent;
  /** Nível semântico do título; use "h2" quando a tela já tiver um h1. */
  as?: 'h1' | 'h2';
  className?: string;
}

/**
 * Cabeçalho padrão de tela: título colorido com a cor do tema, dentro de um card com
 * borda/fundo na mesma cor. Substitui os `<h1>` soltos de cada módulo.
 */
export function PageTitleCard({
  title,
  subtitle,
  eyebrow,
  icon,
  badge,
  actions,
  accent,
  as: Heading = 'h1',
  className,
}: PageTitleCardProps) {
  const a = ACCENTS[accent ?? 'brand'];
  const iconNode = icon;

  return (
    <header
      data-accent={accent === 'brand' ? 'cyan' : accent === 'warning' ? 'gold' : accent}
      className={cn(
        'bh-platform-card relative flex flex-col gap-4 overflow-hidden rounded-card border border-line bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md p-5 shadow-card border-t border-t-white/20 dark:border-t-white/10 sm:flex-row sm:items-center sm:justify-between',
        a.card,
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        {iconNode && (
          <span
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-full border',
              accent
                ? a.chip
                : 'text-[color:var(--card-accent)] border-[color:var(--card-accent)] bg-surface-elevated',
            )}
          >
            {iconNode}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p
              className={cn('mb-1 text-[11px] font-medium uppercase tracking-[0.08em]', a.eyebrow)}
            >
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <Heading
              className={cn(
                'font-display text-xl font-semibold leading-tight tracking-[-0.02em] sm:text-2xl',
                a.title,
              )}
            >
              {title}
            </Heading>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
