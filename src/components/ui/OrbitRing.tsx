import { motion, useReducedMotion } from 'framer-motion';
import type * as React from 'react';
import { cn } from '../../lib/utils.js';

export interface OrbitRingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number | string;
  spin?: boolean;
  borderWidth?: number;
  glow?: boolean;
  innerClassName?: string;
  duration?: number;
}

export function OrbitRing({
  size = 56,
  spin = true,
  borderWidth = 3,
  glow = true,
  className,
  innerClassName,
  duration = 8,
  children,
  style,
  ...props
}: OrbitRingProps) {
  const shouldReduceMotion = useReducedMotion();
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: dimension, height: dimension, ...style }}
      {...props}
    >
      {/* Outer Conic Ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'var(--grad-orbit)',
          boxShadow: glow ? '0 0 20px rgba(0, 212, 255, 0.35)' : undefined,
        }}
        animate={spin && !shouldReduceMotion ? { rotate: 360 } : undefined}
        transition={{ repeat: Infinity, duration, ease: 'linear' }}
      />

      {/* Inner Mask Content */}
      <div
        className={cn(
          'relative z-10 rounded-full flex items-center justify-center bg-surface overflow-hidden',
          innerClassName,
        )}
        style={{
          width: `calc(100% - ${borderWidth * 2}px)`,
          height: `calc(100% - ${borderWidth * 2}px)`,
        }}
      >
        {children ?? (
          <span className="font-display font-extrabold text-[10px] tracking-tight text-brand">
            360°
          </span>
        )}
      </div>
    </div>
  );
}
