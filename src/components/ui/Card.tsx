import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { BorderBeam, type BorderBeamProps } from './BorderBeam.js';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';

const cardVariants = cva('relative overflow-hidden rounded-2xl text-ink', {
  variants: {
    variant: {
      default:
        'bg-surface border border-line shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-line-strong hover:shadow-md hover:-translate-y-0.5',
      stat: 'bg-surface border border-line shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-line-strong hover:shadow-md hover:-translate-y-0.5',
      outline:
        'border border-line bg-transparent transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-line-strong hover:bg-surface-interactive',
      accent:
        'bg-surface border border-brand/40 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-brand/80 hover:-translate-y-0.5',
      elevated:
        'bg-surface border border-line shadow-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-line-strong hover:shadow-lg hover:-translate-y-0.5',
      interactive:
        'group bg-surface border border-line shadow-sm cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-brand/50 hover:bg-surface-interactive hover:-translate-y-0.5 active:scale-[0.99]',
      // Variantes estruturais recomendadas pelo Design System v2.0
      surface:
        'bg-surface-2 border border-line shadow-none hover:border-line-strong transition-all duration-300',
      panel:
        'bg-surface border border-line shadow-sm hover:border-line-strong transition-all duration-300',
      metric:
        'bg-surface border border-line shadow-sm hover:border-brand/50 transition-all duration-300 hover:-translate-y-0.5',
      data: 'bg-surface-2 border border-line shadow-none hover:border-brand/30 transition-all duration-300',
      feature:
        'bg-gradient-to-br from-surface to-surface-2 border border-brand/20 shadow-sm hover:border-brand/50 transition-all duration-300 hover:-translate-y-0.5',
      floating:
        'bg-surface-elevated/95 border border-line shadow-lg backdrop-blur-xl transition-all duration-300',
      // Variantes decorativas preservadas para compatibilidade (@deprecated)
      // Prefira as variantes estruturais acima (surface, panel, metric, data, feature, floating)
      /** @deprecated Kept for backward compatibility but should not be used in new code. */
      iris: 'bg-surface border border-accent-violet/40 shadow-glow-accent-violet transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:scale-[1.005] hover:border-accent-violet hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]',
      /** @deprecated Kept for backward compatibility but should not be used in new code. */
      cyan: 'bg-surface border border-accent-cyan/40 shadow-glow-accent-cyan transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:scale-[1.005] hover:border-accent-cyan hover:shadow-glow-accent-cyan',
      /** @deprecated Kept for backward compatibility but should not be used in new code. */
      pulse:
        'bg-surface border border-pulse/40 shadow-glow-pulse transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:scale-[1.005] hover:border-pulse hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]',
      /** @deprecated Kept for backward compatibility but should not be used in new code. */
      glass:
        'bg-surface/60 backdrop-blur-xl border border-brand/30 shadow-glow-brand transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface/80 hover:border-brand hover:shadow-glow-brand-strong hover:-translate-y-0.5 hover:scale-[1.005]',
      /** @deprecated Kept for backward compatibility but should not be used in new code. */
      metallic:
        'bg-gradient-to-br from-surface via-brand/5 to-surface-2 border border-brand/40 shadow-glow-brand transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-brand hover:shadow-glow-brand-strong hover:-translate-y-0.5 hover:scale-[1.005]',
      bento:
        'bg-surface border border-line shadow-sm hover:border-brand/30 hover:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
      /** @deprecated Kept for backward compatibility but should not be used in new code. */
      cosmic:
        'bg-gradient-to-br from-surface-elevated/90 to-brand/10 backdrop-blur-2xl border border-brand/50 shadow-card hover:border-brand hover:shadow-glow-brand-strong hover:-translate-y-1 transition-all duration-300',
      /** @deprecated Kept for backward compatibility but should not be used in new code. */
      specular:
        'bg-surface/75 backdrop-blur-2xl border border-brand/40 shadow-card hover:border-brand hover:shadow-glow-brand-strong hover:-translate-y-1 transition-all duration-300',
      vancouver:
        'vancouver-card bg-surface border border-line hover:border-line-strong shadow-sm transition-all duration-300 hover:-translate-y-1',
      vancouverGradient:
        'bg-gradient-to-br from-brand to-brand-2 text-on-brand border-line shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300',
      vancouverGold:
        'bg-warning-solid text-white border-line shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300',
      vancouverPink:
        'bg-[color-mix(in_srgb,var(--pink)_65%,black)] text-white border-line shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300',
    },
    padding: {
      default: 'p-6',
      sm: 'p-4',
      lg: 'p-8',
      none: 'p-0',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Faixa de destaque no topo do card — usa os tokens de marca (`--brand`/`--brand-2`). */
  accentBar?: boolean;
  /** Ativa o efeito de borda em órbita contínua durante carregamento. */
  isLoading?: boolean;
  /** Ativa o feixe laser luminoso contínuo no perímetro do card (efeito BorderBeam). */
  borderBeam?: boolean;
  /** Variação cromática do feixe laser (padrão: 'cyan', idêntico ao vídeo). */
  borderBeamVariant?: BorderBeamProps['variant'];
  /** Duração em segundos da volta completa do feixe. */
  borderBeamDuration?: number;
  /** Comprimento do feixe em pixels. */
  borderBeamSize?: number;
  /** Ativa o holofote especular que segue o cursor em tempo real (2026 Spatial UI). */
  spotlight?: boolean;
  /** Emite som sutil ao passar o cursor sobre o card. */
  soundHover?: boolean;
  /** Emite som ao clicar no card. */
  soundClick?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      padding,
      accentBar,
      isLoading,
      borderBeam,
      borderBeamVariant = 'cyan',
      borderBeamDuration = 12,
      borderBeamSize = 220,
      spotlight = false,
      soundHover = false,
      soundClick = false,
      children,
      onPointerMove,
      onMouseEnter,
      onMouseLeave,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = React.useState(false);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (spotlight) {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
      onPointerMove?.(e);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(true);
      if (soundHover) {
        SoundFX.play('hover');
      }
      onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(false);
      onMouseLeave?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (soundClick) {
        SoundFX.play('click');
      }
      onClick?.(e);
    };

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, className }),
          (isLoading || borderBeam || spotlight) && 'overflow-hidden isolate',
        )}
        onPointerMove={handlePointerMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...(onClick
          ? {
              role: 'button',
              tabIndex: 0,
              onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              },
              onClick: handleClick,
            }
          : {})}
        {...props}
      >
        {spotlight && isHovered && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300"
            style={{
              background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 229, 255, 0.12), transparent 70%)`,
            }}
          />
        )}
        {isLoading && (
          <BorderBeam
            variant="brand"
            size={200}
            duration={3.5}
            borderWidth={2}
            glow
            radius="var(--radius-card)"
          />
        )}
        {!isLoading && borderBeam && (
          <BorderBeam
            variant={borderBeamVariant}
            size={borderBeamSize}
            duration={borderBeamDuration}
            borderWidth={1.5}
            glow
            radius="var(--radius-card)"
          />
        )}
        {accentBar && (
          <>
            <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />
            <span className="pointer-events-none absolute -right-12 -top-16 h-28 w-28 rounded-full bg-brand/10 blur-[38px]" />
          </>
        )}
        <div
          className={cn(
            'relative z-10 transition-opacity duration-300',
            isLoading && 'opacity-60 pointer-events-none select-none',
          )}
        >
          {children}
        </div>
      </div>
    );
  },
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('font-display font-semibold leading-tight tracking-tight text-ink', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-ink-2', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
