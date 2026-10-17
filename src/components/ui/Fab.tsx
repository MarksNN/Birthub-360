import * as React from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';
import { Magnetic } from './Magnetic.js';

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label?: string;
  glow?: boolean;
  magnetic?: boolean;
}

export const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ className, icon, label, glow: _glow, magnetic = false, onClick, children, ...props }, ref) => {
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
          'inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-full bg-brand font-display font-semibold text-on-brand shadow-card motion-safe:transition-colors motion-safe:duration-200 hover:bg-brand-active',
          label ? 'h-12 px-5 py-3' : 'h-14 w-14 p-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
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
