import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Ban,
  Clock,
  DatabaseZap,
  FlaskConical,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils.js';

export type VisualStateType =
  | 'LIVE'
  | 'SYNCING'
  | 'PROCESSING'
  | 'RECOMMENDED'
  | 'ACTION_REQUIRED'
  | 'BLOCKED'
  | 'BETA'
  | 'PLANNED'
  | 'NO_DATA';

interface VisualStateMeta {
  label: string;
  color: string; // text / icon color (Tailwind arbitrary or token)
  bgColor: string; // pill background
  borderColor: string; // pill border
}

const STATE_META: Record<VisualStateType, VisualStateMeta> = {
  LIVE: {
    label: 'Live',
    color: 'text-[color:var(--color-heading-success)]',
    bgColor: 'bg-[color:var(--color-heading-success)]/10',
    borderColor: 'border-[color:var(--color-heading-success)]/30',
  },
  SYNCING: {
    label: 'Syncing',
    color: 'text-[color:var(--color-heading-blue)]',
    bgColor: 'bg-[color:var(--color-heading-blue)]/10',
    borderColor: 'border-[color:var(--color-heading-blue)]/30',
  },
  PROCESSING: {
    label: 'Processing',
    color: 'text-[color:var(--color-heading-iris)]',
    bgColor: 'bg-[color:var(--color-heading-iris)]/10',
    borderColor: 'border-[color:var(--color-heading-iris)]/30',
  },
  RECOMMENDED: {
    label: 'Recommended',
    color: 'text-[color:var(--color-heading-gold)]',
    bgColor: 'bg-[color:var(--color-heading-gold)]/10',
    borderColor: 'border-[color:var(--color-heading-gold)]/30',
  },
  ACTION_REQUIRED: {
    label: 'Action Required',
    color: 'text-[color:var(--color-heading-gold)]',
    bgColor: 'bg-[color:var(--color-heading-gold)]/10',
    borderColor: 'border-[color:var(--color-heading-gold)]/40',
  },
  BLOCKED: {
    label: 'Blocked',
    color: 'text-[color:var(--color-heading-danger)]',
    bgColor: 'bg-[color:var(--color-heading-danger)]/10',
    borderColor: 'border-[color:var(--color-heading-danger)]/30',
  },
  BETA: {
    label: 'Beta',
    color: 'text-[color:var(--color-heading-iris)]',
    bgColor: 'bg-[color:var(--color-heading-iris)]/10',
    borderColor: 'border-[color:var(--color-heading-iris)]/30',
  },
  PLANNED: {
    label: 'Planned',
    color: 'text-[color:var(--color-text-muted)]',
    bgColor: 'bg-[color:var(--color-text-muted)]/10',
    borderColor: 'border-[color:var(--color-text-muted)]/30',
  },
  NO_DATA: {
    label: 'No Data',
    color: 'text-white/40',
    bgColor: 'bg-white/5',
    borderColor: 'border-white/10',
  },
};

interface VisualStateProps {
  state: VisualStateType;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Renders the animated indicator (dot/icon + pill) for a given operational state. */
export function VisualState({ state, label, size = 'md', className }: VisualStateProps) {
  const meta = STATE_META[state];
  const displayLabel = label ?? meta.label;
  const isSmall = size === 'sm';

  const iconSize = isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3';
  const textSize = isSmall ? 'text-[9px]' : 'text-[10px]';
  const pill = isSmall ? 'px-1.5 py-0.5 gap-1' : 'px-2 py-0.5 gap-1.5';

  const Icon = STATE_ICON[state];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-mono font-bold uppercase tracking-[0.12em]',
        meta.bgColor,
        meta.borderColor,
        meta.color,
        pill,
        textSize,
        // ACTION_REQUIRED gets a subtle pulsing border animation
        state === 'ACTION_REQUIRED' && 'animate-pulse',
        className,
      )}
      role="status"
      aria-label={displayLabel}
    >
      <Icon className={cn(iconSize, 'shrink-0')} aria-hidden="true" />
      {displayLabel}
    </span>
  );
}

// ─── Animated icon wrappers ────────────────────────────────────────────────────

function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-heading-success)] opacity-60" />
      <span className="relative inline-flex h-full w-full rounded-full bg-[color:var(--color-heading-success)]" />
    </span>
  );
}

function SpinIcon({ className }: { className?: string }) {
  return <RotateCcw className={cn('animate-spin', className)} />;
}

function PulseLoader({ className }: { className?: string }) {
  return (
    <motion.span
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      className={cn('inline-flex', className)}
    >
      <Loader2 className="h-full w-full" />
    </motion.span>
  );
}

// Map state → icon component (all accept className)
const STATE_ICON: Record<VisualStateType, React.ComponentType<{ className?: string }>> = {
  LIVE: LiveDot,
  SYNCING: SpinIcon,
  PROCESSING: PulseLoader,
  RECOMMENDED: Sparkles,
  ACTION_REQUIRED: AlertTriangle,
  BLOCKED: Ban,
  BETA: FlaskConical,
  PLANNED: Clock,
  NO_DATA: DatabaseZap,
};
