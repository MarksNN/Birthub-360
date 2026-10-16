import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-[-0.011em] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  {
    variants: {
      variant: {
        default: 'border-line bg-surface-2',
        secondary: 'border-line bg-surface',
        destructive: 'border-line bg-[color:color-mix(in_srgb,var(--critical)_10%,var(--surface))]',
        danger: 'border-line bg-[color:color-mix(in_srgb,var(--critical)_10%,var(--surface))]',
        outline: 'border-line bg-transparent',
        success: 'border-line bg-[color:color-mix(in_srgb,var(--ok)_10%,var(--surface))]',
        warning: 'border-line bg-[color:color-mix(in_srgb,var(--warn)_12%,var(--surface))]',
        info: 'border-line bg-[color:color-mix(in_srgb,var(--info)_9%,var(--surface))]',
        holographic: 'border-line bg-surface-2',
        neon: 'border-line bg-surface-2',
        gradient: 'border-transparent bg-brand text-on-brand',
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
