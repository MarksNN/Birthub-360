import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';
import { BorderBeam, type BorderBeamProps } from './BorderBeam.js';

const cardVariants = cva(
  'bh-platform-card relative overflow-hidden rounded-card text-ink transition-all duration-200 ease-out border-t border-t-white/20 dark:border-t-white/10',
  {
    variants: {
      variant: {
        default:
          'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        stat: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        outline:
          'border border-line bg-transparent hover:border-line-strong hover:bg-surface-interactive hover:-translate-y-0.5',
        accent: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        elevated: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-elevated hover:border-line-strong hover:-translate-y-0.5',
        interactive:
          'group bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card cursor-pointer hover:border-line-strong hover:bg-surface-interactive hover:shadow-elevated hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]',
        // Variantes estruturais recomendadas pelo Design System v2.0
        surface: 'bg-surface-2 border border-line shadow-none hover:border-line-strong',
        panel: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        metric: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        data: 'bg-surface-2 border border-line shadow-none',
        feature: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        floating: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        bento: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        cosmic: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        glass: 'border border-line bg-surface/80 dark:bg-[#0f172a]/80 backdrop-blur-xl shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
        neon: 'bg-surface/95 dark:bg-[#0f172a]/90 backdrop-blur-md border border-line shadow-card hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5',
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
  /** Variação cromática do feixe laser (padrão: undefined, idêntico ao vídeo). */
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
    const [isHovered, setIsHovered] = React.useState(false);
    const isInteractive = Boolean(onClick);
    const isHoverAware =
      spotlight || soundHover || Boolean(onMouseEnter || onMouseLeave || onPointerMove);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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
        data-accent={
          accentBar
            ? 'gold'
            : variant === 'accent' || variant === 'feature'
              ? 'pink'
              : variant === 'metric' || variant === 'stat'
                ? 'gold'
                : variant === 'data'
                  ? 'blue'
                  : undefined
        }
        className={cn(
          cardVariants({ variant, padding, className }),
          (isLoading || borderBeam || spotlight) && 'overflow-hidden isolate',
        )}
        {...(isHoverAware
          ? {
              onPointerMove: handlePointerMove,
              onMouseEnter: handleMouseEnter,
              onMouseLeave: handleMouseLeave,
            }
          : {})}
        {...(isInteractive
          ? {
              role: 'button',
              tabIndex: 0,
              onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.currentTarget.click();
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
              background: 'var(--grad-glow)',
            }}
          />
        )}
        {isLoading && (
          <BorderBeam
            variant="brand"
            size={200}
            duration={3.5}
            borderWidth={1}
            radius="var(--radius-card)"
          />
        )}
        {!isLoading && borderBeam && (
          <BorderBeam
            variant={borderBeamVariant}
            size={borderBeamSize}
            duration={borderBeamDuration}
            borderWidth={1}
            radius="var(--radius-card)"
          />
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
      className={cn(
        'font-display font-semibold leading-tight tracking-[-0.02em] text-ink',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm leading-relaxed text-ink-2', className)} {...props} />
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

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
