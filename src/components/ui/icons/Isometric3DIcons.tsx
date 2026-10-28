import { motion, type SVGMotionProps, useReducedMotion } from 'framer-motion';
import { cn } from '../../../lib/utils.js';

interface IconBaseProps extends Omit<SVGMotionProps<SVGSVGElement>, 'size'> {
  size?: number;
  className?: string;
  animate?: boolean;
}

/**
 * Troféu Dourado 3D Isométrico com reflexos especulares e gradientes metálicos (Tendência 2026).
 */
export function Trophy3DIcon({ size = 40, className, animate = true, ...props }: IconBaseProps) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 transition-all duration-300 hover:drop-shadow-[0_8px_16px_rgba(212,175,55,0.35)]',
        className,
      )}
      whileHover={shouldAnimate ? { scale: 1.1, rotateY: 15 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="gold-cup" x1="12" y1="8" x2="36" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF2B2" />
          <stop offset="35%" stopColor="var(--color-heading-gold)" />
          <stop offset="70%" stopColor="#997A15" />
          <stop offset="100%" stopColor="#5E4B0D" />
        </linearGradient>
        <linearGradient
          id="gold-highlight"
          x1="18"
          y1="8"
          x2="30"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--color-heading-gold)" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient
          id="gold-base"
          x1="14"
          y1="36"
          x2="34"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--color-heading-gold)" />
          <stop offset="50%" stopColor="#7A5E10" />
          <stop offset="100%" stopColor="#3D2E05" />
        </linearGradient>
        <radialGradient id="star-sparkle" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FFF2B2" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--color-heading-gold)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Base do Troféu */}
      <path
        d="M17 38H31L33 44H15L17 38Z"
        fill="url(#gold-base)"
        stroke="#453406"
        strokeWidth="1.75"
      />
      {/* Pilar Central */}
      <path d="M22 28H26V38H22V28Z" fill="url(#gold-cup)" />

      {/* Alças Laterais */}
      <path
        d="M14 12C9 12 7 17 8 22C9 27 14 27 15 26"
        stroke="url(#gold-cup)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M34 12C39 12 41 17 40 22C39 27 34 27 33 26"
        stroke="url(#gold-cup)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Taça Principal */}
      <path
        d="M13 8H35V19C35 25.075 30.075 30 24 30C17.925 30 13 25.075 13 19V8Z"
        fill="url(#gold-cup)"
      />

      {/* Brilho Especular na Taça */}
      <path d="M15 10H22V23C18 21 16 17 15 10Z" fill="url(#gold-highlight)" />

      {/* Estrela de Conquista no Centro */}
      <polygon
        points="24,14 25.5,18 29.5,18.5 26.5,21.5 27.5,25.5 24,23.5 20.5,25.5 21.5,21.5 18.5,18.5 22.5,18"
        fill="#FFFFFF"
        opacity="0.9"
      />

      {/* Faísca Reluzente Superior */}
      {shouldAnimate && (
        <motion.circle
          cx="33"
          cy="9"
          r="3"
          fill="url(#star-sparkle)"
          animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.svg>
  );
}

/**
 * Diamante / Gema 3D Facetada com refração cromática e bordas reluzentes.
 */
export function Gem3DIcon({ size = 40, className, animate = true, ...props }: IconBaseProps) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 transition-all duration-300 hover:drop-shadow-[0_8px_18px_rgba(22,119,255,0.4)]',
        className,
      )}
      whileHover={shouldAnimate ? { scale: 1.12, rotate: 6 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="gem-top" x1="12" y1="8" x2="36" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#70BFFF" />
          <stop offset="50%" stopColor="var(--color-heading-blue)" />
          <stop offset="100%" stopColor="#0B3E8C" />
        </linearGradient>
        <linearGradient id="gem-left" x1="6" y1="18" x2="24" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#54A5FF" />
          <stop offset="100%" stopColor="#0A3370" />
        </linearGradient>
        <linearGradient
          id="gem-center"
          x1="16"
          y1="18"
          x2="32"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#B3DCFF" />
          <stop offset="40%" stopColor="#2484FF" />
          <stop offset="100%" stopColor="#0E4294" />
        </linearGradient>
        <linearGradient
          id="gem-right"
          x1="24"
          y1="18"
          x2="42"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1963CC" />
          <stop offset="100%" stopColor="#07224F" />
        </linearGradient>
      </defs>

      {/* Facetas Superiores da Coroa */}
      <polygon points="16,8 32,8 40,18 8,18" fill="url(#gem-top)" />
      <polygon points="16,8 24,18 8,18" fill="#8AC8FF" opacity="0.6" />
      <polygon points="32,8 40,18 24,18" fill="#0C4AA6" opacity="0.5" />

      {/* Facetas Inferiores do Pavilhão */}
      <polygon points="8,18 24,18 24,40" fill="url(#gem-left)" />
      <polygon points="24,18 40,18 24,40" fill="url(#gem-right)" />
      <polygon points="18,18 30,18 24,40" fill="url(#gem-center)" />

      {/* Ponto de Reflexo Especular */}
      <circle cx="21" cy="14" r="2.2" fill="#FFFFFF" opacity="0.9" />
      {shouldAnimate && (
        <motion.circle
          cx="21"
          cy="14"
          r="4.5"
          fill="#FFFFFF"
          opacity="0.3"
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.svg>
  );
}

/**
 * Chama de Fogo 3D Multi-camada para Gamificação e Streaks contínuos.
 */
export function FlameStreakIcon({ size = 40, className, animate = true, ...props }: IconBaseProps) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 transition-all duration-300 hover:drop-shadow-[0_8px_18px_rgba(255,88,65,0.45)]',
        className,
      )}
      whileHover={shouldAnimate ? { scale: 1.15 } : undefined}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <radialGradient id="flame-outer" cx="50%" cy="75%" r="65%">
          <stop offset="0%" stopColor="#FFA62B" />
          <stop offset="50%" stopColor="#FF5841" />
          <stop offset="100%" stopColor="#A81515" />
        </radialGradient>
        <radialGradient id="flame-inner" cx="50%" cy="80%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#FFE066" />
          <stop offset="100%" stopColor="#FFA62B" />
        </radialGradient>
      </defs>

      {/* Labareda Externa */}
      <motion.path
        d="M24 4C24 4 30 11 30 17C30 19.5 28.5 21.5 27 23C32 23.5 38 27.5 38 34C38 41.7 31.7 46 24 46C16.3 46 10 41.7 10 34C10 27 15 20 20 15C20.5 20 23 21 24 20C25 18 24 10 24 4Z"
        fill="url(#flame-outer)"
        animate={
          shouldAnimate
            ? {
                scaleY: [1, 1.05, 0.98, 1],
                scaleX: [1, 0.98, 1.03, 1],
              }
            : undefined
        }
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originY: 'bottom', originX: 'center' }}
      />

      {/* Labareda Interna Luminosa */}
      <motion.path
        d="M24 22C24 22 28 26 28 30C28 35 25 39 24 40C23 39 20 35 20 30C20 27 22 24 24 22Z"
        fill="url(#flame-inner)"
        animate={
          shouldAnimate
            ? {
                scaleY: [1, 1.1, 0.95, 1],
                opacity: [0.9, 1, 0.85, 0.9],
              }
            : undefined
        }
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originY: 'bottom', originX: 'center' }}
      />
    </motion.svg>
  );
}

/**
 * Escudo de Segurança 3D com borda de ouro e facetas reflexivas.
 */
export function ShieldSecurityIcon({
  size = 40,
  className,
  animate = true,
  ...props
}: IconBaseProps) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 transition-all duration-300 hover:drop-shadow-[0_8px_16px_rgba(212,175,55,0.3)]',
        className,
      )}
      whileHover={shouldAnimate ? { scale: 1.1 } : undefined}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient
          id="shield-border"
          x1="10"
          y1="6"
          x2="38"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFF2B2" />
          <stop offset="50%" stopColor="var(--color-heading-gold)" />
          <stop offset="100%" stopColor="#6E5507" />
        </linearGradient>
        <linearGradient
          id="shield-left"
          x1="12"
          y1="8"
          x2="24"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1E2A4A" />
          <stop offset="100%" stopColor="var(--color-background)" />
        </linearGradient>
        <linearGradient
          id="shield-right"
          x1="24"
          y1="8"
          x2="36"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2E3F6E" />
          <stop offset="100%" stopColor="#111B3B" />
        </linearGradient>
      </defs>

      {/* Contorno Dourado */}
      <path
        d="M24 4L38 10V22C38 32.5 32 40.5 24 44C16 40.5 10 32.5 10 22V10L24 4Z"
        fill="url(#shield-border)"
      />

      {/* Interior Esquerdo */}
      <path d="M24 7L13 12V22C13 30.5 18 37.5 24 40.5V7Z" fill="url(#shield-left)" />

      {/* Interior Direito */}
      <path d="M24 7L35 12V22C35 30.5 30 37.5 24 40.5V7Z" fill="url(#shield-right)" />

      {/* Ícone de Check / Segurança Central */}
      <path
        d="M18 23L22 27L30 19"
        stroke="var(--color-heading-gold)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}
