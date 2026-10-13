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
    bar: 'bg-brand',
    chip: 'bg-brand/10 border-brand/25 text-brand-ink dark:text-brand',
    title: 'text-brand-ink dark:text-brand',
    eyebrow: 'text-brand-ink dark:text-brand',
    card: 'border-brand/25 bg-brand/[0.04]',
  },
  pink: {
    bar: 'bg-[color:var(--color-heading-pink)]',
    chip: 'bg-[color:var(--color-heading-pink)]/10 border-[color:var(--color-heading-pink)]/25 text-[color:var(--color-heading-pink)] dark:text-[color:var(--color-heading-pink)]',
    title: 'text-[color:var(--color-heading-pink)] dark:text-[color:var(--color-heading-pink)]',
    eyebrow: 'text-[color:var(--color-heading-pink)] dark:text-[color:var(--color-heading-pink)]',
    card: 'border-[color:var(--color-heading-pink)]/25 bg-[color:var(--color-heading-pink)]/[0.04]',
  },
  gold: {
    bar: 'bg-[color:var(--color-heading-gold)]',
    chip: 'bg-[color:var(--color-heading-gold)]/10 border-[color:var(--color-heading-gold)]/30 text-[color:var(--color-heading-gold)] dark:text-[color:var(--color-heading-gold)]',
    title: 'text-[color:var(--color-heading-gold)] dark:text-[color:var(--color-heading-gold)]',
    eyebrow: 'text-[color:var(--color-heading-gold)] dark:text-[color:var(--color-heading-gold)]',
    card: 'border-[color:var(--color-heading-gold)]/25 bg-[color:var(--color-heading-gold)]/[0.04]',
  },
  iris: {
    bar: 'bg-iris',
    chip: 'bg-iris/10 border-iris/25 text-accent-violet',
    title: 'text-accent-violet',
    eyebrow: 'text-accent-violet',
    card: 'border-iris/25 bg-iris/[0.04]',
  },
  success: {
    bar: 'bg-success',
    chip: 'bg-success/10 border-success/25 text-success-active dark:text-success',
    title: 'text-success-active dark:text-success',
    eyebrow: 'text-success-active dark:text-success',
    card: 'border-success/25 bg-success/[0.04]',
  },
  warning: {
    bar: 'bg-warning',
    chip: 'bg-warning/10 border-warning/25 text-warning-active dark:text-warning',
    title: 'text-warning-active dark:text-warning',
    eyebrow: 'text-warning-active dark:text-warning',
    card: 'border-warning/25 bg-warning/[0.04]',
  },
  neutral: {
    bar: 'bg-line-strong',
    chip: 'bg-surface-2 border-line text-ink',
    title: 'text-ink',
    eyebrow: 'text-ink-2',
    card: 'border-line bg-surface',
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
        'bh-platform-card relative flex flex-col gap-4 overflow-hidden rounded-card border bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between',
        a.card,
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        {iconNode && (
          <span
            className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl border', a.chip)}
          >
            {iconNode}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className={cn('bh-label mb-0.5 font-bold uppercase tracking-[0.18em]', a.eyebrow)}>
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <Heading
              className={cn(
                'font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl',
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
