import type React from 'react';
import type { TitleIconProps } from './types.js';

// 5.1 Pillar 1: Hub Comercial (Concentric Target Core)
export function Pillar1HubIcon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill={color} />
      <path
        d="M12 2V5M12 19V22M2 12H5M19 12H22"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 5.2 Pillar 2: Inteligência de Mercado (Signal Radar Dish)
export function Pillar2IntelIcon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2" fill={color} />
      <path d="M4 12H8M2 20L6 16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 5.3 Pillar 3: Orquestração de Vendas (Transition Flow Path)
export function Pillar3OrchIcon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M4 12H16M16 12L12 8M16 12L12 16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="4" cy="12" r="3" stroke={color} strokeWidth="1.8" fill={`${color}20`} />
      <circle
        cx="20"
        cy="12"
        r="3"
        stroke="#F59E0B"
        strokeWidth="1.8"
        fill="rgba(245, 158, 11, 0.2)"
      />
    </svg>
  );
}

// 5.4 Pillar 4: Performance Comercial (Kinetic Tachometer)
export function Pillar4PerfIcon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M4 14C4 9.58 7.58 6 12 6C16.42 6 20 9.58 20 14"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 14L16 9" stroke="#FF2D9B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="14" r="2.5" fill={color} />
      <path d="M7 16H4M20 16H17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 5.5 Pillar 5: Previsibilidade Comercial (Probability Curve)
export function Pillar5ForeIcon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M3 18C7 18 8 6 12 6C16 6 17 18 21 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M3 21H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <circle cx="12" cy="6" r="2" fill="#00D4FF" />
    </svg>
  );
}

// 5.6 Pillar 6: Inteligência Artificial (Autonomous Spark)
export function Pillar6AiIcon({
  size = 20,
  color = '#8B7DFF',
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={`${color}25`}
      />
      <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
    </svg>
  );
}

// 5.7 Pillar 7: Automação & Multi-CRM (Sync Dynamo Loop)
export function Pillar7AutoIcon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M21 12A9 9 0 0 0 6 5.3L3 8M3 3V8H8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12A9 9 0 0 0 18 18.7L21 16M21 21V16H16"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 5.8 Pillar 8: Engajamento Comercial (Acoustic Resonance Wave)
export function Pillar8EngIcon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M3 10V14M7 6V18M11 3V21M15 7V17M19 10V14"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="11" cy="3" r="1.5" fill="#F59E0B" />
      <circle cx="11" cy="21" r="1.5" fill="#00D4FF" />
    </svg>
  );
}

// 6. Fluxo Operacional: Continuous Stream Infinity Wave
export function FlowSectionIcon({
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
        d="M3 12H7L10 5L14 19L17 12H21"
        stroke="url(#flow-pulse-gradient)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="5" r="2.5" fill="#00D4FF" />
      <circle cx="14" cy="19" r="2.5" fill="#FF2D9B" />
      <defs>
        <linearGradient id="flow-pulse-gradient" x1="3" y1="12" x2="21" y2="12">
          <stop stopColor="#00D4FF" />
          <stop offset="0.5" stopColor="#FF2D9B" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 6.1 Flow Step 1: Funnel Magnet Ingestion
export function FlowStep1Icon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M2 4H22L14 13V19L10 21V13L2 4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}15`}
      />
      <circle cx="12" cy="9" r="1.5" fill="#F59E0B" />
    </svg>
  );
}

// 6.2 Flow Step 2: Verification Shield Seal
export function FlowStep2Icon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M12 2L4 5V11C4 16.5 7.4 21.6 12 23C16.6 21.6 20 16.5 20 11V5L12 2Z"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}15`}
      />
      <path
        d="M9 12L11 14L15 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 6.3 Flow Step 3: Stepped Cadence Staircase
export function FlowStep3Icon({
  size = 20,
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M4 20H8V15H12V10H16V5H20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="5" r="2" fill="#00D4FF" />
    </svg>
  );
}

// 6.4 Flow Step 4: Copilot Dialogue Node
export function FlowStep4Icon({
  size = 20,
  color = '#8B7DFF',
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M21 11.5A8.38 8.38 0 0 1 19.5 16C18 19 14 20 10 20L4 21L5 17C3.5 15 3 13 3 11.5C3 6.8 7 3 12 3C17 3 21 6.8 21 11.5Z"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}15`}
      />
      <circle cx="9" cy="11.5" r="1.5" fill={color} />
      <circle cx="12" cy="11.5" r="1.5" fill="#F59E0B" />
      <circle cx="15" cy="11.5" r="1.5" fill="#00D4FF" />
    </svg>
  );
}

// 6.5 Flow Step 5: Golden Deal Vault
export function FlowStep5Icon({
  size = 20,
  color = '#10B981',
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
      className={`inline-block ${className}`}
      style={style}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx="2"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}15`}
      />
      <path d="M7 11V7C7 4.2 9.2 2 12 2C14.8 2 17 4.2 17 7V11" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="16.5" r="1.5" fill={color} />
    </svg>
  );
}

// 7. IA Section: Quantum Neural Spark
export function AiSectionIcon({
  size = 26,
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
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M12 7V12L15 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 3L19 6L22 7L19 8L18 11L17 8L14 7L17 6L18 3Z" fill={color} />
    </svg>
  );
}

// 8. Automação Section: Multi-Cloud Sync Loop
export function AutomationSectionIcon({
  size = 26,
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
      <path
        d="M4 4V9H9"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 20V15H15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 9A8 8 0 0 0 6.34 6.34L4 9"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 15A8 8 0 0 0 17.66 17.66L20 15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="#F59E0B"
        strokeWidth="1.8"
        fill="rgba(245, 158, 11, 0.2)"
      />
    </svg>
  );
}

// 9. Performance Section: Telemetry Velocity Gauge
export function PerfSectionIcon({
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
        d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4" fill={color} />
      <path d="M12 12L15 9" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 10. Previsibilidade Section: Predictive Forecast Trend Radar
export function ForecastSectionIcon({
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
        d="M3 3V21H21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 16L12 10L16 14L21 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" fill="#00D4FF" />
      <circle cx="21" cy="6" r="2.5" fill="#FF2D9B" />
    </svg>
  );
}

// 11. Ecossistema Section: Planetary Integration Constellation
export function EcosystemSectionIcon({
  size = 26,
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
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" fill={`${color}20`} />
      <circle cx="4" cy="6" r="2" fill="#00D4FF" />
      <circle cx="20" cy="6" r="2" fill="#FF2D9B" />
      <circle cx="4" cy="18" r="2" fill="#F59E0B" />
      <circle cx="20" cy="18" r="2" fill="#10B981" />
      <path
        d="M8.5 10L5.5 7M15.5 10L18.5 7M8.5 14L5.5 17M15.5 14L18.5 17"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

// 12. Cockpit Section: Panoramic HUD Radar
export function CockpitSectionIcon({
  size = 26,
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
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M12 3V12L18.5 15.5" stroke="#00D4FF" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#F59E0B" />
    </svg>
  );
}

// 13. CTA Section: Starburst Portal Beacon
export function CtaSectionIcon({
  size = 28,
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
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill="url(#cta-star-icon-grad)"
        stroke={color}
        strokeWidth="1.2"
      />
      <defs>
        <linearGradient id="cta-star-icon-grad" x1="2" y1="2" x2="22" y2="22">
          <stop stopColor="#F59E0B" />
          <stop offset="0.5" stopColor="#FF2D9B" />
          <stop offset="1" stopColor="#00D4FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 14. Auth Modal Section: Biometric Zero-Trust Key Shield
export function AuthModalSectionIcon({
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
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="3"
        stroke={color}
        strokeWidth="1.8"
        fill={`${color}20`}
      />
      <path
        d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="1.5" fill={color} />
    </svg>
  );
}
