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
    bar: 'bg-[#FF2D9B]',
    chip: 'bg-[#FF2D9B]/10 border-[#FF2D9B]/25 text-[#E6007A] dark:text-[#FF2D9B]',
    title: 'text-[#E6007A] dark:text-[#FF2D9B]',
    eyebrow: 'text-[#E6007A] dark:text-[#FF2D9B]',
    card: 'border-[#FF2D9B]/25 bg-[#FF2D9B]/[0.04]',
  },
  gold: {
    bar: 'bg-[#FFC107]',
    chip: 'bg-[#FFC107]/10 border-[#FFC107]/30 text-[#D97706] dark:text-[#FFC107]',
    title: 'text-[#D97706] dark:text-[#FFC107]',
    eyebrow: 'text-[#D97706] dark:text-[#FFC107]',
    card: 'border-[#FFC107]/25 bg-[#FFC107]/[0.04]',
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
  accent = 'brand',
  as: Heading = 'h1',
  className,
}: PageTitleCardProps) {
  const a = ACCENTS[accent];
  const iconNode = icon;

  return (
    <header
      className={cn(
        'relative flex flex-col gap-4 overflow-hidden rounded-card border bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between',
        a.card,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-[2px]', a.bar)} />
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
