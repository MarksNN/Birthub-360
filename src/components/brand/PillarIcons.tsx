import { motion } from 'framer-motion';
import type { SVGProps } from 'react';

type PillarIconProps = SVGProps<SVGSVGElement> & {
  isActive?: boolean;
};

// 01 HUB -> ◉ (Núcleo)
export function HubIcon({ isActive, className = '', ...props }: PillarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <motion.circle
        cx="12"
        cy="12"
        r="4"
        fill="currentColor"
        animate={isActive ? { scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] } : { scale: 1 }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
    </svg>
  );
}

// 02 INTELLIGENCE -> ◎ (Radar)
export function IntelligenceIcon({ isActive, className = '', ...props }: PillarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <motion.circle
        cx="12"
        cy="12"
        r="5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        animate={isActive ? { rotate: 360 } : { rotate: 0 }}
        transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        style={{ originX: '12px', originY: '12px' }}
      />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

// 03 ORCHESTRATION -> ⟶ (Fluxo)
export function OrchestrationIcon({ isActive, className = '', ...props }: PillarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M4 12H20M20 12L14 6M20 12L14 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {isActive && (
        <motion.circle
          cx="4"
          cy="12"
          r="1.5"
          fill="currentColor"
          animate={{ x: [0, 16, 0], opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
      )}
    </svg>
  );
}

// 04 PERFORMANCE -> ▥ (Métricas)
export function PerformanceIcon({ isActive, className = '', ...props }: PillarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 21V10M12 21V6M16 21V14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {isActive && (
        <motion.path
          d="M3 14L8 10L12 6L16 14L21 8"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      )}
    </svg>
  );
}

// 05 FORECAST -> ⌁ (Projeção)
export function ForecastIcon({ isActive, className = '', ...props }: PillarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M4 14L10 14L12 4L14 14L20 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {isActive && (
        <motion.path
          d="M12 4V0M12 24V14"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 2"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        />
      )}
    </svg>
  );
}

// 06 AI -> ✦ (Inteligência)
export function AIIcon({ isActive, className = '', ...props }: PillarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <motion.path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        animate={isActive ? { rotate: [0, 90], scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        style={{ originX: '12px', originY: '12px' }}
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

// 07 AUTOMATION -> ◇ (Conexão)
export function AutomationIcon({ isActive, className = '', ...props }: PillarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M12 3L21 12L12 21L3 12L12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {isActive && (
        <motion.rect
          x="10"
          y="10"
          width="4"
          height="4"
          fill="currentColor"
          animate={{ rotate: 180, scale: [1, 1.5, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{ originX: '12px', originY: '12px' }}
        />
      )}
    </svg>
  );
}

// 08 ENGAGEMENT -> ◌ (Comunicação)
export function EngagementIcon({ isActive, className = '', ...props }: PillarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <motion.circle
        cx="12"
        cy="12"
        r="6"
        stroke="currentColor"
        strokeWidth="1"
        animate={isActive ? { scale: [1, 1.3, 1], opacity: [1, 0, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
    </svg>
  );
}

export const PILLAR_ICONS: Record<string, React.FC<PillarIconProps>> = {
  'PILAR 01 — HUB COMERCIAL': HubIcon,
  'PILAR 02 — INTELIGÊNCIA DE MERCADO': IntelligenceIcon,
  'PILAR 03 — ORQUESTRAÇÃO DE VENDAS': OrchestrationIcon,
  'PILAR 04 — PERFORMANCE COMERCIAL': PerformanceIcon,
  'PILAR 05 — PREVISIBILIDADE COMERCIAL': ForecastIcon,
  'PILAR 06 — INTELIGÊNCIA ARTIFICIAL': AIIcon,
  'PILAR 07 — AUTOMAÇÃO & CONECTIVIDADE': AutomationIcon,
  'PILAR 08 — ENGAJAMENTO COMERCIAL': EngagementIcon,
  ADMINISTRAÇÃO: ({ isActive, className = '', ...props }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      {...props}
    >
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

export { AIIcon as AiIcon };

