import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';
import { SoundFX } from '../../lib/soundEffects.js';

export interface ButtonGroupItem<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface ButtonGroupProps<T extends string = string> {
  items: ButtonGroupItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  soundFeedback?: boolean;
}

export function ButtonGroup<T extends string = string>({
  items,
  value,
  onChange,
  className,
  size = 'default',
  soundFeedback = false,
}: ButtonGroupProps<T>) {
  const sizeClasses = {
    sm: 'text-xs py-1 px-3',
    default: 'text-sm py-1.5 px-4',
    lg: 'text-base py-2 px-5',
  };

  return (
    <div
      role="group"
      className={cn(
        'inline-flex items-center rounded-full bg-surface-2 p-1 border border-line shadow-inner',
        className,
      )}
    >
      {items.map((item) => {
        const isSelected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              if (soundFeedback && item.value !== value) {
                SoundFX.play('click');
              }
              onChange(item.value);
            }}
            className={cn(
              'relative rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center gap-1.5 z-10 select-none',
              sizeClasses[size],
              isSelected ? 'text-ink font-bold' : 'text-ink-2 hover:text-ink',
              item.disabled && 'opacity-40 cursor-not-allowed',
            )}
            aria-pressed={isSelected}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-pill-active"
                className="absolute inset-0 rounded-full bg-surface border border-brand/30 shadow-sm z-[-1]"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface ToggleButtonGroupProps<T extends string = string> extends ButtonGroupProps<T> {}

export function ToggleButtonGroup<T extends string = string>(props: ToggleButtonGroupProps<T>) {
  return <ButtonGroup {...props} />;
}
