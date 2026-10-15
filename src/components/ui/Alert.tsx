import * as React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const alertVariants = cva(
  'relative w-full rounded-xl p-4 text-sm flex items-start gap-3 border transition-all duration-200',
  {
    variants: {
      severity: {
        success:
          'bg-ok/10 text-ok-active border-ok/30 dark:border-ok/40',
        warning:
          'bg-warn/10 text-warn-active border-warn/30 dark:border-warn/40',
        error:
          'bg-critical/10 text-critical-active border-critical/30 dark:border-critical/40',
        info:
          'bg-info/10 text-info-active border-info/30 dark:border-info/40',
        brand:
          'bg-brand/10 text-brand-ink dark:text-brand border-brand/30 shadow-[0_0_15px_rgba(0,212,255,0.15)]',
      },
    },
    defaultVariants: {
      severity: 'info',
    },
  },
);

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
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ severity }), className)}
        {...props}
      >
        <div className="shrink-0 mt-0.5">
          {icon ?? <IconComponent className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          {title && <h5 className="font-semibold leading-none tracking-tight mb-1">{title}</h5>}
          <div className="text-xs leading-relaxed opacity-95">{children}</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
            aria-label="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  },
);

Alert.displayName = 'Alert';
