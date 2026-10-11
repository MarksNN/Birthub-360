import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { useRef, useState } from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';

/**
 * @deprecated
 * Este componente viola o Design Language v2.0 do Birth Hub 360°.
 * As variantes "neon" e "cosmic" usam scan lines animadas, indicadores de canto
 * e efeitos glow que violam a regra "Decorative borders with no structural function".
 *
 * Migre para Input.tsx com variantes estruturais (default, filled, ghost).
 * Documentação: docs/design/BIRTHHUB-360-DESIGN-LANGUAGE.md
 */

export interface CyberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'neon' | 'glass' | 'metallic' | 'cosmic';
  size?: 'sm' | 'md' | 'lg';
  glowColor?: 'cyan' | 'purple' | 'gold' | 'green';
  soundFeedback?: boolean;
}

export function CyberInput({
  variant = 'neon',
  size = 'md',
  glowColor = 'cyan',
  soundFeedback = true,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: CyberInputProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);
  const lastKeyTimeRef = useRef(0);

  const variantStyles = {
    neon: {
      base: 'bg-surface-elevated/60 backdrop-blur-xl border-2',
      focused: 'border-opacity-100 shadow-glow',
      unfocused: 'border-opacity-30',
    },
    glass: {
      base: 'bg-surface/80 backdrop-blur-2xl border border-line/50',
      focused: 'border-brand/50 shadow-lg',
      unfocused: 'border-line/30',
    },
    metallic: {
      base: 'bg-gradient-to-b from-surface to-surface-2 border border-line/60',
      focused: 'border-brand/40 shadow-lg',
      unfocused: 'border-line/40',
    },
    cosmic: {
      base: 'bg-surface-elevated/85 backdrop-blur-2xl border border-brand/30 shadow-[0_4px_20px_rgba(0,0,0,0.15)]',
      focused: 'border-brand shadow-[0_0_25px_rgba(212,175,55,0.35)] ring-1 ring-brand/40',
      unfocused: 'border-brand/25',
    },
  };

  const glowColors = {
    cyan: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]',
    purple: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
    gold: 'shadow-[0_0_20px_rgba(250,204,21,0.5)]',
    green: 'shadow-[0_0_20px_rgba(74,222,128,0.5)]',
  };

  const sizeStyles = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-5 text-lg',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (soundFeedback) SoundFX.play('focus');
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (soundFeedback) {
      const now = Date.now();
      if (now - lastKeyTimeRef.current > 80) {
        lastKeyTimeRef.current = now;
        SoundFX.play('typing');
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <input
        className={cn(
          // A03-P1-10: outline removido só junto de um anel de foco visível por token (>= 3:1).
          'w-full rounded-xl text-ink placeholder:text-ink-2 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          variantStyles[variant].base,
          isFocused ? variantStyles[variant].focused : variantStyles[variant].unfocused,
          isFocused && variant === 'neon' && glowColors[glowColor],
          sizeStyles[size],
          shouldReduceMotion && 'transition-none',
          className,
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...props}
      />

      {/* Top specular beam para variante cosmic */}
      {variant === 'cosmic' && (
        <div className="absolute top-0 inset-x-3 h-[1.5px] bg-gradient-to-r from-transparent via-brand/60 to-transparent pointer-events-none rounded-t-xl" />
      )}

      {/* Efeito de scan line para variante neon */}
      {variant === 'neon' && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent"
            animate={{
              y: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>
      )}

      {/* Indicadores de canto para variantes neon e cosmic */}
      {(variant === 'neon' || variant === 'cosmic') && (
        <>
          <motion.div
            className="absolute top-0 left-0 w-2.5 h-2.5 border border-line border-brand/60 rounded-tl-lg pointer-events-none"
            animate={{
              opacity: isFocused ? 1 : 0.3,
              scale: isFocused ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute top-0 right-0 w-2.5 h-2.5 border border-line border-brand/60 rounded-tr-lg pointer-events-none"
            animate={{
              opacity: isFocused ? 1 : 0.3,
              scale: isFocused ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-2.5 h-2.5 border border-line border-brand/60 rounded-bl-lg pointer-events-none"
            animate={{
              opacity: isFocused ? 1 : 0.3,
              scale: isFocused ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-2.5 h-2.5 border border-line border-brand/60 rounded-br-lg pointer-events-none"
            animate={{
              opacity: isFocused ? 1 : 0.3,
              scale: isFocused ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          />
        </>
      )}
    </div>
  );
}
