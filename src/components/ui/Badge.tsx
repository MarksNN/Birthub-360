import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand/10 text-brand-ink dark:text-brand',
        secondary: 'border-line bg-surface text-ink',
        destructive: 'border-transparent bg-critical/10 text-critical-active',
        danger: 'border-transparent bg-critical/10 text-critical-active',
        outline: 'text-ink border-input',
        success: 'border-transparent bg-ok/10 text-ok-active',
        warning: 'border-transparent bg-warn/10 text-warn-active',
        info: 'border-transparent bg-info/10 text-info-active',
        holographic: 'border-brand/20 bg-brand/10 text-brand-ink dark:text-brand',
        neon: 'border-brand/20 bg-brand/10 text-brand-ink dark:text-brand font-mono',
        gradient:
          'border-transparent bg-gradient-to-r from-brand to-brand-2 text-on-brand shadow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
