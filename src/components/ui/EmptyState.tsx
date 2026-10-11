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
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-line my-6 bg-surface shadow-sm overflow-hidden"
    >
      {/* Aura Especular Superior */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand/5 to-transparent"
      />

      <motion.div
        animate={!reduceMotion ? { y: [-4, 4, -4] } : undefined}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="relative z-10 w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-brand-ink dark:text-brand mb-4 border border-brand/20"
      >
        {icon || <Sparkles className="w-8 h-8 text-brand-ink dark:text-brand" />}
      </motion.div>

      <h3 className="relative z-10 font-display text-xl font-bold text-ink mb-2">{title}</h3>
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
