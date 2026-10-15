import type React from 'react';
import type { TitleIconProps } from './types.js';

// 1. Hero Title: Quantum Hex-Orb Nexus
export function HeroTitleIcon({
  size = 32,
  color = '#00D4FF',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke={color}
        strokeWidth="1.8"
        strokeDasharray="3 3"
        opacity="0.6"
      />
      <circle cx="16" cy="16" r="9" stroke="url(#hero-icon-grad)" strokeWidth="2" />
      <path
        d="M16 4V8M16 24V28M4 16H8M24 16H28"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3.5" fill="#F59E0B" />
      <circle cx="16" cy="4" r="2" fill="#FF2D9B" />
      <circle cx="28" cy="16" r="2" fill="#00D4FF" />
      <defs>
        <linearGradient id="hero-icon-grad" x1="7" y1="7" x2="25" y2="25">
          <stop stopColor="#00D4FF" />
          <stop offset="0.5" stopColor="#FF2D9B" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 2. Capacidades Operacionais: Interconnected Matrix Diamond
export function CapabilitiesTitleIcon({
  size = 22,
  color = '#00D4FF',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="2"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}22`}
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="2"
        stroke="#FF2D9B"
        strokeWidth="1.8"
        fill="rgba(255, 45, 155, 0.15)"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="2"
        stroke="#F59E0B"
        strokeWidth="1.8"
        fill="rgba(245, 158, 11, 0.15)"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="2"
        stroke="#10B981"
        strokeWidth="1.8"
        fill="rgba(16, 185, 129, 0.15)"
      />
      <path
        d="M10 6.5H14M6.5 10V14M17.5 10V14M10 17.5H14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 3. Problema: Fractured Pipeline Alert Triangle
export function ProblemSectionIcon({
  size = 26,
  color = '#EF4444',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M12 2L2 20H22L12 2Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}15`}
      />
      <path d="M12 9V13M12 17H12.01" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M7 16L17 16" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );
}

// 3.1 Silos e Ferramentas Desconectadas: Unlinked Chain Nodes
export function SilosCardIcon({
  size = 22,
  color = '#FF2D9B',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M9 15L6 18C4.34 19.66 1.66 19.66 0 18"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="2"
        y="2"
        width="8"
        height="8"
        rx="2"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}20`}
      />
      <rect
        x="14"
        y="14"
        width="8"
        height="8"
        rx="2"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}20`}
      />
      <path
        d="M7 10V14M17 10V14M10 7H14M10 17H14"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <circle cx="12" cy="12" r="1.5" fill="#EF4444" />
    </svg>
  );
}

// 3.2 Previsões Baseadas em Opinião: Erratic Gauge / Broken Radar
export function ReactiveCardIcon({
  size = 22,
  color = '#F59E0B',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M3 13C3 8.03 7.03 4 12 4C16.97 4 21 8.03 21 13"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 13L16 8" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="13" r="3" fill={color} />
      <path d="M6 16L4 18M18 16L20 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 3.3 Perda Invisível de Oportunidades: Deflecting Trajectory Target
export function LostDealsCardIcon({
  size = 22,
  color = '#00D4FF',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" strokeDasharray="4 2" />
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.5" />
      <path d="M2 12L8 12M16 12L22 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 2L12 8M12 16L12 22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M15 9L20 4M20 4H16M20 4V8"
        stroke="#EF4444"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 4. Plataforma Section: Three-Tiered Unified OS Cubes
export function PlatformSectionIcon({
  size = 26,
  color = '#F59E0B',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}20`}
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 17L22 12"
        stroke="#00D4FF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17L12 22L22 17"
        stroke="#FF2D9B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 4.1 Camada 1: Inter-Cloud Network Bridge
export function MultiCrmDataLayerIcon({
  size = 22,
  color = '#00D4FF',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="6"
        rx="2"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}15`}
      />
      <rect
        x="3"
        y="14"
        width="18"
        height="6"
        rx="2"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}15`}
      />
      <circle cx="7" cy="7" r="1.5" fill={color} />
      <circle cx="12" cy="7" r="1.5" fill="#F59E0B" />
      <circle cx="7" cy="17" r="1.5" fill={color} />
      <path d="M12 10V14M17 10V14" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

// 4.2 Camada 2: Neural Synapse Matrix
export function AiDiagnosticLayerIcon({
  size = 22,
  color = '#FF2D9B',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" fill={`${color}25`} />
      <circle cx="4" cy="6" r="2.5" stroke={color} strokeWidth="1.5" />
      <circle cx="20" cy="6" r="2.5" stroke={color} strokeWidth="1.5" />
      <circle cx="4" cy="18" r="2.5" stroke={color} strokeWidth="1.5" />
      <circle cx="20" cy="18" r="2.5" stroke={color} strokeWidth="1.5" />
      <path
        d="M6 7.5L9.5 10.5M18 7.5L14.5 10.5M6 16.5L9.5 13.5M18 16.5L14.5 13.5"
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}

// 4.3 Camada 3: Kinetic Accelerator Beam
export function ExecutionLayerIcon({
  size = 22,
  color = '#F59E0B',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={`${color}20`}
      />
      <path d="M6 18L3 21M18 6L21 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 5. 8 Pilares Section: 8-Axis Command Compass
export function PillarsSectionIcon({
  size = 26,
  color = '#F59E0B',
  className = '',
  style,
}: TitleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="3.5" r="1.5" fill="#00D4FF" />
      <circle cx="18" cy="6" r="1.5" fill="#FF2D9B" />
      <circle cx="20.5" cy="12" r="1.5" fill="#F59E0B" />
      <circle cx="18" cy="18" r="1.5" fill="#10B981" />
      <circle cx="12" cy="20.5" r="1.5" fill="#38BDF8" />
      <circle cx="6" cy="18" r="1.5" fill="#8B7DFF" />
      <circle cx="3.5" cy="12" r="1.5" fill="#00D4FF" />
      <circle cx="6" cy="6" r="1.5" fill="#FF2D9B" />
      <circle cx="12" cy="12" r="3" fill={`${color}40`} stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
