import * as React from 'react';
/* eslint-disable react-refresh/only-export-components */

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils.js';
import { Magnetic } from './Magnetic.js';

const buttonVariants = cva(
  'bh-official-control inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[13px] font-semibold tracking-[-0.015em] motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:bg-surface-subtle disabled:text-ink-2 disabled:border-transparent active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-[#0284c7] to-[#0369a1] dark:from-[#00b4d8] dark:to-[#0284c7] text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(2,132,199,0.25)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.15),0_4px_16px_rgba(2,132,199,0.35)] hover:brightness-105 border-t border-t-white/20',
        primary:
          'bg-gradient-to-b from-[#0284c7] to-[#0369a1] dark:from-[#00b4d8] dark:to-[#0284c7] text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(2,132,199,0.25)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.15),0_4px_16px_rgba(2,132,199,0.35)] hover:brightness-105 border-t border-t-white/20',
        tertiary: 'bg-surface text-ink hover:bg-surface-interactive border border-line',
        success:
          'bg-ok-solid text-[color:var(--palette-neon-white)] shadow-sm hover:brightness-110 border-t border-t-white/20',
        destructive:
          'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-sm hover:brightness-110 border-t border-t-white/20',
        outline:
          'border border-slate-200/90 dark:border-white/10 bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/20',
        secondary:
          'border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:border-slate-300 dark:hover:border-white/20',
        ghost:
          'border border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white',
        link: 'text-primary underline-offset-4 hover:underline',
        cosmic:
          'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#0f172a] dark:to-[#090d16] text-white border border-sky-500/30 shadow-[0_2px_12px_rgba(14,165,233,0.18)] hover:border-sky-400/60 hover:shadow-[0_4px_20px_rgba(14,165,233,0.3)]',
        brand:
          'bg-gradient-to-b from-[#c5a059] to-[#9b7a2d] text-slate-950 font-display font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_12px_rgba(197,160,89,0.3)] hover:brightness-105 border-t border-t-white/30',
        vancouver:
          'border border-slate-300/80 dark:border-white/15 bg-white/40 dark:bg-white/[0.02] text-slate-900 dark:text-white hover:bg-slate-100/60 dark:hover:bg-white/[0.06] hover:border-sky-500/40',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        pill: 'h-10 px-6 rounded-full font-display font-bold',
        icon: 'h-9 w-9 p-0 rounded-full',
        'icon-sm': 'h-8 w-8 p-0 rounded-full',
        'icon-lg': 'h-10 w-10 p-0 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  soundClick?: boolean;
  soundHover?: boolean;
  sound?: string;
  shine?: boolean;
  magnetic?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      soundClick = false,
      soundHover = false,
      sound,
      shine = false,
      magnetic = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    // A03-P1-03: o spread vem ANTES para não sobrescrever `disabled` quando `loading`.
    // Com asChild o Slot exige um único filho, então o spinner só é renderizado em <button>.
    const buttonContent = (
      <Comp
        {...(props as any)}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || disabled}
        aria-busy={loading || undefined}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            )}
            {children}
          </>
        )}
      </Comp>
    );

    if (magnetic) {
      return <Magnetic>{buttonContent}</Magnetic>;
    }

    return buttonContent;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
