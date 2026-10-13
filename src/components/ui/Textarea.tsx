import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils.js';

const textareaVariants = cva(
  'bh-official-control flex min-h-[80px] w-full rounded-control border text-sm text-ink placeholder:text-ink-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 disabled:hover:border-input',
  {
    variants: {
      variant: {
        default:
          'border-input bg-surface px-4 py-3 hover:border-line-strong focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring',
        filled:
          'border-transparent bg-surface-2 px-4 py-3 hover:bg-surface-subtle focus-visible:bg-surface focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring',
        ghost:
          'border-transparent bg-transparent px-4 py-3 hover:bg-surface-interactive focus-visible:bg-surface-interactive focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-ring/60',
        holographic:
          'border-brand/40 bg-gradient-to-br from-surface to-brand/10 px-4 py-3 hover:border-brand focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea className={cn(textareaVariants({ variant, className }))} ref={ref} {...props} />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
