import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils.js';

const inputVariants = cva(
  'flex w-full rounded-xl border border-input bg-surface text-ink placeholder:text-ink-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-line-strong focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 disabled:hover:border-input',
  {
    variants: {
      inputSize: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 px-3 py-1 text-xs',
        md: 'h-9 px-3 py-1.5 text-sm',
        lg: 'h-11 px-4 py-2.5 text-base',
      },
      variant: {
        default: '',
        filled:
          'bg-surface-2 border-transparent hover:bg-surface-subtle focus-visible:bg-surface focus-visible:border-brand',
        ghost:
          'bg-transparent border-transparent hover:bg-surface-interactive focus-visible:bg-surface-interactive focus-visible:border-brand/50',
        cosmic:
          'bg-gradient-to-br from-surface to-brand/10 border-brand/40 hover:border-brand focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/70',
        vancouver:
          'bg-surface border-input hover:border-brand/30 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/60',
      },
    },
    defaultVariants: {
      inputSize: 'default',
      variant: 'default',
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          inputVariants({ variant, inputSize }),
          error &&
            'border-danger focus-visible:ring-danger focus-visible:shadow-[0_0_15px_rgba(239,68,68,0.4)]',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
