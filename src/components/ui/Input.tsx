import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/utils.js';

const inputVariants = cva(
  'bh-official-control flex w-full rounded-control border border-line bg-surface text-ink placeholder:text-ink-2 motion-safe:transition-colors motion-safe:duration-200 hover:border-line-strong focus-visible:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 disabled:hover:border-line',
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
        filled: 'border-transparent bg-surface-2 hover:bg-surface-subtle focus-visible:bg-surface',
        ghost: 'border-transparent bg-transparent hover:bg-surface-interactive',
        cosmic: 'border-line bg-surface',
        vancouver: 'border-line bg-surface',
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
          error && 'border-danger focus-visible:ring-danger',
          className,
        )}
        ref={ref}
        {...props}
        aria-invalid={error || props['aria-invalid'] || undefined}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
