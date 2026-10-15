import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';
import { Magnetic } from './Magnetic.js';
import { SoundFX } from '../../lib/soundEffects.js';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-full transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-surface border border-line text-ink hover:border-line-strong hover:bg-surface-interactive hover:scale-105 active:scale-95 shadow-sm',
        outline:
          'border border-line bg-transparent text-ink hover:border-brand hover:text-brand hover:bg-brand/10 hover:scale-105 active:scale-95',
        vancouver:
          'border border-[#00D4FF]/40 bg-transparent text-[#00D4FF] hover:border-[#00D4FF] hover:bg-[#00D4FF]/10 hover:shadow-[0_0_12px_rgba(0,212,255,0.35)] hover:scale-105 active:scale-95',
        brand:
          'bg-gradient-to-r from-[#FF2D9B] to-[#00D4FF] text-[#0D0D0D] shadow-[0_2px_12px_rgba(0,212,255,0.35)] hover:brightness-110 hover:scale-105 active:scale-95',
        ghost:
          'bg-transparent text-ink-2 hover:bg-surface-interactive hover:text-ink hover:scale-105 active:scale-95',
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
    {
      className,
      variant,
      size,
      magnetic = true,
      soundClick = false,
      onClick,
      children,
      ...props
    },
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
