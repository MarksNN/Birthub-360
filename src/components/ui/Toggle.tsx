import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className,
  id,
  'aria-label': ariaLabel,
}: ToggleProps) {
  const shouldReduceMotion = useReducedMotion();
  const toggleId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const handleToggle = () => {
    if (disabled) return;
    SoundFX.play('focus');
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  const classicStyles = {
    container: 'h-6 w-11',
    checked: 'bg-brand shadow-sm hover:brightness-110',
    unchecked: 'bg-surface-subtle border-input hover:bg-surface-interactive',
    thumb: 'h-5 w-5 bg-white shadow-sm',
  };

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      {(label || description) && (
        <label htmlFor={toggleId} className="flex flex-col select-none cursor-pointer">
          {label && <span className="text-sm font-semibold text-ink">{label}</span>}
          {description && <span className="text-xs text-ink-2 leading-relaxed">{description}</span>}
        </label>
      )}

      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          classicStyles.container,
          checked ? classicStyles.checked : classicStyles.unchecked,
          disabled && 'cursor-not-allowed opacity-50 hover:brightness-100',
        )}
      >
        <motion.span
          className={cn('pointer-events-none rounded-full', classicStyles.thumb)}
          animate={{
            x: checked ? 20 : 0,
            scale: 1,
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0.1 }
              : {
                  x: { type: 'spring', stiffness: 500, damping: 30, mass: 0.8 },
                  scale: { duration: 0.25, ease: 'easeOut' },
                }
          }
        />
      </button>
    </div>
  );
}
