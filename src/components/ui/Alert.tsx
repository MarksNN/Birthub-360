import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../lib/utils.js';

const alertVariants = cva(
  'relative w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink flex items-start gap-3',
  {
    variants: {
      severity: {
        success: 'bg-[color:color-mix(in_srgb,var(--ok)_9%,var(--surface))]',
        warning: 'bg-[color:color-mix(in_srgb,var(--warn)_10%,var(--surface))]',
        error: 'bg-[color:color-mix(in_srgb,var(--critical)_9%,var(--surface))]',
        info: 'bg-[color:color-mix(in_srgb,var(--info)_9%,var(--surface))]',
        brand: 'bg-[color:color-mix(in_srgb,var(--brand)_8%,var(--surface))]',
      },
    },
    defaultVariants: {
      severity: 'info',
    },
  },
);

const iconWellVariants = cva('grid h-8 w-8 shrink-0 place-items-center rounded-full', {
  variants: {
    severity: {
      success: 'bg-[color:color-mix(in_srgb,var(--ok)_16%,var(--surface))] text-ok',
      warning: 'bg-[color:color-mix(in_srgb,var(--warn)_18%,var(--surface))] text-gold',
      error: 'bg-[color:color-mix(in_srgb,var(--critical)_14%,var(--surface))] text-critical',
      info: 'bg-[color:color-mix(in_srgb,var(--info)_14%,var(--surface))] text-primary',
      brand:
        'bg-[color:color-mix(in_srgb,var(--iris)_16%,var(--surface))] text-[color:var(--iris)]',
    },
  },
  defaultVariants: {
    severity: 'info',
  },
});

const severityIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  brand: Info,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, severity = 'info', title, onClose, icon, children, ...props }, ref) => {
    const IconComponent = severityIcons[severity ?? 'info'];

    return (
      <div ref={ref} role="alert" className={cn(alertVariants({ severity }), className)} {...props}>
        <div className={iconWellVariants({ severity })}>
          {icon ?? <IconComponent className="h-4 w-4" strokeWidth={1.5} />}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          {title && (
            <h5 className="mb-1 font-display text-sm font-semibold leading-none tracking-[-0.02em] text-ink">
              {title}
            </h5>
          )}
          <div className="text-[13px] leading-relaxed text-ink-2">{children}</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-[color:color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    );
  },
);

Alert.displayName = 'Alert';
