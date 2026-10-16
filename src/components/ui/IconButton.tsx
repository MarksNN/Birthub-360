import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';
import { Magnetic } from './Magnetic.js';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-full motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border border-line bg-surface text-ink shadow-sm hover:border-line-strong hover:bg-surface-interactive',
        outline:
          'border border-line bg-transparent text-ink hover:border-line-strong hover:bg-surface-interactive',
        vancouver:
          'border border-[color:var(--brand-text)] bg-transparent text-primary hover:bg-[color:color-mix(in_srgb,var(--brand)_8%,transparent)]',
        brand: 'bg-brand text-on-brand shadow-sm hover:bg-brand-active',
        ghost:
          'bg-transparent text-ink-2 hover:bg-[color:color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink',
      },
      size: {
        sm: 'h-8 w-8 text-xs',
        default: 'h-9 w-9 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-12 w-12 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  magnetic?: boolean;
  soundClick?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, variant, size, magnetic = false, soundClick = false, onClick, children, ...props },
    ref,
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (soundClick) {
        SoundFX.play('click');
      }
      onClick?.(e);
    };

    const element = (
      <button
        ref={ref}
        type="button"
        className={cn(iconButtonVariants({ variant, size }), className)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );

    if (magnetic) {
      return <Magnetic maxDisplacement={4}>{element}</Magnetic>;
    }

    return element;
  },
);

IconButton.displayName = 'IconButton';
