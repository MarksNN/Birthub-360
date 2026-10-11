import * as React from 'react';
/* eslint-disable react-refresh/only-export-components */

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils.js';
import { Magnetic } from './Magnetic.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:bg-surface-subtle disabled:text-ink-2 disabled:border-transparent',
  {
    variants: {
      variant: {
        default:
          'bg-brand text-on-brand hover:bg-brand-active hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] shadow-sm',
        primary:
          'bg-brand text-on-brand hover:bg-brand-active hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] shadow-sm',
        tertiary:
          'bg-surface border-transparent text-ink hover:bg-surface-interactive hover:text-ink hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]',
        success:
          'bg-ok-solid text-white font-bold shadow-sm hover:brightness-110 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]',
        destructive:
          // A03-P1-07: bg-btn-danger (globals.css) garante >= 4.5:1 com texto branco; #EF4444 cru dava 3.76:1.
          'bg-btn-danger text-white font-bold shadow-sm hover:bg-btn-danger-hover hover:-translate-y-0.5 active:bg-btn-danger-hover',
        outline:
          'border border-input bg-transparent text-ink hover:border-line-strong hover:bg-surface-interactive active:bg-surface-subtle',
        secondary:
          'border border-line bg-surface text-ink shadow-sm hover:bg-surface-interactive hover:border-line-strong active:bg-surface-subtle',
        ghost:
          'border border-transparent text-ink-2 hover:bg-surface-interactive hover:text-ink active:bg-surface-subtle',
        link: 'text-brand-ink dark:text-brand underline-offset-4 hover:underline',
        cosmic:
          'bg-brand text-on-brand hover:bg-brand-active hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] shadow-sm',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-10 w-10 p-0',
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
      magnetic = variant === 'default' || variant === 'primary' || variant === 'cosmic',
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
