import { motion, useReducedMotion } from 'framer-motion';
import { type MouseEvent, type PointerEvent, useState } from 'react';
import { useTilt } from '../../../lib/motion.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { cn } from '../../../lib/utils.js';

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  tilt?: boolean;
  spotlight?: boolean;
  soundHover?: boolean;
  soundClick?: boolean;
  variant?: 'surface' | 'glass' | 'accent' | 'cosmic' | 'specular';
}

export function BentoCard({
  colSpan = 1,
  rowSpan = 1,
  tilt = false,
  spotlight = true,
  soundHover = false,
  soundClick = false,
  variant = 'surface',
  className,
  children,
  style,
  onPointerMove,
  onMouseEnter,
  onMouseLeave,
  onClick,
  ...props
}: BentoCardProps) {
  const {
    ref,
    style: tiltStyle,
    onPointerMove: onTiltMove,
    onPointerLeave: onTiltLeave,
  } = useTilt(4);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  const colSpanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-2 lg:col-span-3',
    4: 'col-span-1 md:col-span-2 lg:col-span-4',
  }[colSpan];

  const rowSpanClasses = {
    1: 'row-span-1',
    2: 'row-span-1 md:row-span-2',
  }[rowSpan];

  const variantClasses = {
    surface: 'border border-line bg-surface shadow-card',
    glass: 'border border-line bg-surface shadow-card',
    accent: 'border border-line bg-surface shadow-card',
    cosmic: 'border border-line bg-surface shadow-card',
    specular: 'border border-line bg-surface shadow-card',
  }[variant];

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (spotlight && !reduceMotion) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    if (tilt) onTiltMove(e);
    onPointerMove?.(e);
  };

  const handleMouseEnter = (e: MouseEvent<HTMLDivElement>) => {
    setIsHovered(true);
    if (soundHover) SoundFX.play('hover');
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    setIsHovered(false);
    if (tilt) onTiltLeave();
    onMouseLeave?.(e);
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (soundClick) SoundFX.play('click');
    onClick?.(e);
  };

  const spotlightOverlay = spotlight && isHovered && !reduceMotion && (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300"
      style={{
        background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, color-mix(in srgb, var(--color-brand-primary) 12%, transparent), transparent 70%)`,
      }}
    />
  );

  const sharedClasses = cn(
    'bh-platform-card group relative rounded-card p-6 transition-all duration-300 overflow-hidden flex flex-col justify-between hover:shadow-card-hover',
    colSpanClasses,
    rowSpanClasses,
    variantClasses,
    className,
  );

  if (tilt && !reduceMotion) {
    return (
      <motion.div
        ref={ref as React.RefObject<HTMLDivElement>}
        onPointerMove={handlePointerMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ ...tiltStyle, ...style }}
        data-accent={variant === 'accent' ? 'pink' : variant === 'cosmic' ? 'iris' : undefined}
        className={sharedClasses}
        {...(props as React.ComponentProps<typeof motion.div>)}
      >
        {spotlightOverlay}
        <div className="relative z-10 flex flex-col justify-between h-full w-full">{children}</div>
      </motion.div>
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (
          onClick &&
          event.target === event.currentTarget &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      onPointerMove={handlePointerMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      data-accent={variant === 'accent' ? 'pink' : variant === 'cosmic' ? 'iris' : undefined}
      className={sharedClasses}
      style={style}
      {...props}
    >
      {spotlightOverlay}
      <div className="relative z-10 flex flex-col justify-between h-full w-full">{children}</div>
    </div>
  );
}
