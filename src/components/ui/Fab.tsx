import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';
import { SoundFX } from '../../lib/soundEffects.js';
import { Magnetic } from './Magnetic.js';

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label?: string;
  glow?: boolean;
  magnetic?: boolean;
}

export const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  (
    {
      className,
      icon,
      label,
      glow = true,
      magnetic = true,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      SoundFX.play('click');
      onClick?.(e);
    };

    const content = (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-display font-bold transition-all duration-300 ease-out active:scale-95 cursor-pointer select-none',
          'bg-gradient-to-r from-[#FF2D9B] to-[#00D4FF] text-[#0D0D0D]',
          label ? 'px-5 py-3 h-12 shadow-lg' : 'h-14 w-14 p-0 shadow-xl',
          glow && 'shadow-[0_0_24px_rgba(0,212,255,0.45)] hover:shadow-[0_0_32px_rgba(0,212,255,0.65)] hover:scale-105',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00D4FF]',
          className,
        )}
        {...props}
      >
        {icon && <span className="text-xl">{icon}</span>}
        {label && <span className="text-sm font-extrabold tracking-wide">{label}</span>}
        {children}
      </button>
    );

    if (magnetic) {
      return <Magnetic maxDisplacement={6}>{content}</Magnetic>;
    }

    return content;
  },
);

Fab.displayName = 'Fab';
