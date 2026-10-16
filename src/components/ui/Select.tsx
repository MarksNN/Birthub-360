import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils.js';

const selectVariants = cva(
  'bh-official-control flex w-full rounded-control border bg-surface text-sm text-ink motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60',
  {
    variants: {
      variant: {
        default:
          'border-line hover:border-line-strong focus-visible:border-line-strong focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        filled: 'border-transparent bg-surface-2 hover:bg-surface-subtle focus-visible:bg-surface',
        ghost: 'border-transparent bg-transparent hover:bg-surface-interactive',
        cosmic: 'border-line bg-surface',
      },
      size: {
        default: 'h-10 px-3 py-2',
        sm: 'h-8 px-2.5 py-1 text-xs',
        md: 'h-9 px-3 py-1.5',
        lg: 'h-11 px-4 py-2.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <select className={cn(selectVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Select.displayName = 'Select';

export { Select, selectVariants };
