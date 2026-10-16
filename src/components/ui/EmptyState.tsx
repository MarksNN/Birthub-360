import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type React from 'react';
import { Button } from './Button.js';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative my-6 flex flex-col items-center justify-center overflow-hidden rounded-card border border-line bg-surface p-12 text-center shadow-card"
    >
      <div className="relative z-10 mb-4 grid h-12 w-12 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--ink)_4%,var(--surface))] text-ink ring-1 ring-line">
        {icon || <Sparkles className="h-5 w-5" strokeWidth={1.5} />}
      </div>

      <h3 className="relative z-10 mb-2 font-display text-xl font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h3>
      <p className="relative z-10 text-ink-2 max-w-md mb-6 text-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="primary"
          className="relative z-10 cursor-pointer text-xs font-bold"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
