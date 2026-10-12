import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.js';
import { useTheme } from '../../../contexts/ThemeContext.js';
import { authClient } from '../../../lib/auth-client.js';
import { EASE_OUT_EXPO, staggerContainer, staggerItem } from '../../../lib/motion.js';
import { SoundFX } from '../../../lib/soundEffects.js';

// ─── 8 Pilares — identidade visual própria (atualizado com cores do HTML) ───────────────────────────────────
const PILLARS = [
  { id: '01', slug: 'HUB', label: 'Hub Comercial', symbol: '◉', color: '#00E5FF' },
  { id: '02', slug: 'INTEL', label: 'Inteligência', symbol: '◎', color: '#3B82F6' },
  { id: '03', slug: 'ORCH', label: 'Orquestração', symbol: '⟶', color: '#33EBFF' },
  { id: '04', slug: 'PERF', label: 'Performance', symbol: '▥', color: '#22C55E' },
  { id: '05', slug: 'FORE', label: 'Previsibilidade', symbol: '⌁', color: '#F59E0B' },
  { id: '06', slug: 'AI', label: 'Inteligência Artificial', symbol: '✦', color: '#8B5CF6' },
  { id: '07', slug: 'AUTO', label: 'Automação', symbol: '◇', color: '#64748B' },
  { id: '08', slug: 'ENG', label: 'Engajamento', symbol: '◌', color: '#94A3B8' },
] as const;

// ─── Sistema visual BH360 Mark (símbolo reduzido) ────────────────────────────
function BH360Mark({ size = 40, animated = false }: { size?: number; animated?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animated && !reduceMotion;

  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Birth Hub 360 — símbolo"
    >
      <defs>
        <linearGradient id={`mark-arc-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <radialGradient id={`mark-core-${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1B2B64" />
          <stop offset="100%" stopColor="#0B132B" />
        </radialGradient>
      </defs>

      {/* Anel orbital externo */}
      <motion.circle
        cx="128"
        cy="128"
        r="118"
        fill="none"
        stroke={`url(#mark-arc-${uid})`}
        strokeWidth="10"
        strokeDasharray="6 14"
        animate={shouldAnimate ? { rotate: 360 } : undefined}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '128px 128px' }}
      />

      {/* Núcleo */}
      <circle cx="128" cy="128" r="78" fill={`url(#mark-core-${uid})`} />

      {/* Anel interno cyan */}
      <circle cx="128" cy="128" r="64" fill="none" stroke="#00E5FF" strokeWidth="3" opacity="0.8" />

      {/* Barra horizontal equatorial */}
      <line x1="64" y1="128" x2="192" y2="128" stroke="#33EBFF" strokeWidth="2" opacity="0.45" />

      {/* B serifado */}
      <path
        fill="var(--ink)"
        transform="matrix(0.0740 0 0 -0.0740 104.45 154.20)"
        d="M450.4 707Q574.2 707 627.9 670.8Q681.6 634.6 681.6 573.4Q681.6 520.8 646.8 476.7Q612 432.6 547 404.5Q482 376.4 391 370.8Q511 369.4 573.8 326.1Q636.6 282.8 636.6 218.2Q636.6 165.8 612.2 125.1Q587.8 84.4 543.2 56.4Q498.6 28.4 436 14.2Q373.4 0 297 0Q267.8 0 227.6 1.5Q187.4 3 121 3Q94.8 3 63.8 2.5Q32.8 2 3.7 1.5Q-25.4 1 -45 0L-41 20Q-7 22 12 28Q31 34 42 52Q53 70 62 106L194 602Q201.8 632.8 202.4 651.3Q203 669.8 188.5 678.5Q174 687.2 135 688L140 708Q159.6 707 188.2 706.5Q216.8 706 247.7 705.5Q278.6 705 303 705Q353.2 705 385.7 706Q418.2 707 450.4 707ZM266 359 270 376H339.2Q393.8 376 430.6 407.9Q467.4 439.8 486.2 490.8Q505 541.8 505 596.8Q505 636.6 491.5 662.3Q478 688 438.6 688Q413 688 401 674.1Q389 660.2 378 617L243 106Q238.2 86.4 235.7 67.1Q233.2 47.8 242.2 35.4Q251.2 23 278.8 23Q331.6 23 368.9 53.4Q406.2 83.8 426.6 132.9Q447 182 447 237.2Q447 270.4 437.2 297.9Q427.4 325.4 404.3 342.2Q381.2 359 341.6 359Z"
      />
    </svg>
  );
}

// ─── Visualização de fluxo de dados (Data Flow DNA) ──────────────────────────
function DataFlowLines() {
  const lines = [
    { x1: 0, y1: 25, x2: 100, y2: 25, delay: 0 },
    { x1: 0, y1: 50, x2: 100, y2: 50, delay: 0.4 },
    { x1: 0, y1: 75, x2: 100, y2: 75, delay: 0.8 },
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-full"
      aria-hidden="true"
    >
      {lines.map((l, i) => (
        <motion.line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="rgba(0,229,255,0.15)"
          strokeWidth="0.5"
          strokeDasharray={i === 0 ? '2 2' : i === 1 ? '3 3' : '2 4'}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 1.6, delay: l.delay, ease: 'easeOut' },
            opacity: { duration: 0.4, delay: l.delay },
          }}
        />
      ))}
    </svg>
  );
}

// ─── Pillar strip — 8 pilares como linguagem de produto ──────────────────────
function PillarStrip() {
  const [active, setActive] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="grid grid-cols-2 gap-x-3 gap-y-1.5 w-full"
      role="list"
      aria-label="8 pilares Birth Hub 360"
    >
      {PILLARS.map((p, i) => (
        <motion.div
          key={p.id}
          role="listitem"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 * i, duration: 0.35, ease: EASE_OUT_EXPO }}
          onHoverStart={() => setActive(i)}
          onHoverEnd={() => setActive(null)}
          className="group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-default overflow-hidden"
          style={{
            background:
              active === i && !reduceMotion
                ? `linear-gradient(90deg, ${p.color}12 0%, transparent 80%)`
                : 'transparent',
            transition: 'background 200ms ease',
          }}
        >
          {/* Borda lateral colorida — estado ativo */}
          <span
            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all duration-200"
            style={{
              background: p.color,
              opacity: active === i ? 1 : 0.25,
              transform: active === i ? 'scaleY(1)' : 'scaleY(0.5)',
            }}
            aria-hidden="true"
          />

          {/* ID + símbolo */}
          <span
            className="font-mono text-[10px] font-bold tracking-widest opacity-40 w-5 shrink-0 text-right"
            style={{ color: p.color }}
          >
            {p.id}
          </span>
          <span
            className="text-base w-4 shrink-0 text-center transition-transform duration-200"
            style={{
              color: p.color,
              transform: active === i && !reduceMotion ? 'scale(1.25)' : 'scale(1)',
            }}
            aria-hidden="true"
          >
            {p.symbol}
          </span>

          {/* Label + slug */}
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="font-sans text-sm font-semibold text-[#F8F9FF]/60 group-hover:text-[#F8F9FF]/90 transition-colors leading-tight">
              {p.label}
            </span>
            <span
              className="font-mono text-[9px] tracking-widest opacity-0 group-hover:opacity-50 transition-opacity hidden sm:inline"
              style={{ color: p.color }}
            >
              {p.slug}
            </span>
          </span>

          {/* Micro-pulse indicator — IA pillar específico */}
          {p.id === '06' && (
            <span className="ml-auto shrink-0 relative flex h-1.5 w-1.5">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: p.color }}
              />
              <span
                className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{ backgroundColor: p.color }}
              />
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Ticker de estado do sistema ──────────────────────────────────────────────
function _SystemStatusBar({ dateLabel, timeLabel }: { dateLabel: string; timeLabel: string }) {
  return (
    <div className="flex items-center justify-between w-full px-0 py-2">
      <div className="flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--ok)] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--ok)]" />
        </span>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--ok)]">
          LIVE
        </span>
        <span className="w-px h-3 bg-[var(--line)] mx-1" aria-hidden="true" />
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--ink-2)]">
          Sistema Online
        </span>
      </div>
      <div className="hidden md:flex items-center gap-1.5 font-mono text-[9px] text-[var(--ink-2)] tabular-nums">
        <span>{dateLabel}</span>
        <span className="opacity-40">|</span>
        <span className="font-bold text-[var(--ink)]">{timeLabel}</span>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

/**
 * LandingLoginSplitScreen — Tela unificada de acesso ao Birth Hub 360.
 *
 * Layout: split-screen em desktop (esquerda: Command Center hero + 8 pilares,
 * direita: formulário de acesso), empilhado em mobile.
 *
 * Hierarquia cromática implementada:
 *  - Obsidian (#0B132B) → base estrutural do lado esquerdo
 *  - Blue (#00E5FF) → informação / ação
 *  - Iris (#8B5CF6) → inteligência / IA
 *  - Gold (#D4AF37) → accent de status / destaque (não cor dominante)
 *  - Snow (#FAFAFA) → conteúdo
 */
export function LandingLoginSplitScreen() {
  const navigate = useNavigate();
  const { currentUser, isPending } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);

  const [activeTab, setActiveTab] = useState<'email' | 'sso'>('email');

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Animate balloon items on mount
  useEffect(() => {
    const balloons = document.querySelectorAll('.balloon-item');
    balloons.forEach((balloon, index) => {
      setTimeout(
        () => {
          balloon.classList.add('explode');
        },
        300 + index * 150,
      );
    });
  }, []);

  const weekday = format(now, 'EEEE', { locale: ptBR });
  const dateLabel = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
  const timeLabel = format(now, 'HH:mm:ss');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = isSignUp
      ? await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
          callbackURL: '/app',
        })
      : await authClient.signIn.email({ email, password, rememberMe, callbackURL: '/app' });

    if (result.error) {
      setError(result.error.message || 'Não foi possível autenticar. Verifique suas credenciais.');
      setIsSubmitting(false);
      return;
    }

    if (isSignUp && !result.data?.token) {
      setVerificationPending(true);
      setIsSubmitting(false);
      return;
    }
    window.location.href = '/hub';
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message || 'Não foi possível enviar o e-mail de redefinição.');
      return;
    }
    setForgotPasswordSent(true);
  };

  const backToSignIn = () => {
    setIsForgotPassword(false);
    setForgotPasswordSent(false);
    setVerificationPending(false);
    setError('');
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#0B132B] flex items-center justify-center" aria-busy="true">
        <Loader2 className="animate-spin text-[#00E5FF] w-8 h-8" aria-hidden="true" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/app" replace />;
  }

  // ─── Input classes ────────────────────────────────────────────────────────
  const inputCls =
    'w-full h-[56px] rounded-xl border border-[var(--line)] bg-[var(--surface)] ' +
    'px-4 font-mono text-base text-[var(--ink)] placeholder-[var(--ink-2)]/50 ' +
    'focus:border-[#00E5FF] focus:outline-none focus:ring-4 focus:ring-[#00E5FF]/15 transition-all hover:border-[#00E5FF]/35 hover:shadow-[0_0_15px_rgba(0,229,255,0.08)] hover:-translate-y-0.5';

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden lg:flex-row flex-col">
      {/* ════════════════════════════════════════════════════════════════════
          LADO ESQUERDO — Command Center Hero + 8 Pilares
          Base: Obsidian / Midnight. Blue e Iris como informação. Gold = accent.
      ════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative flex flex-col lg:w-[55%] w-full overflow-hidden px-10 py-10 lg:px-16 lg:py-14"
        style={{ background: 'linear-gradient(135deg, #060d1a 0%, #0B132B 50%, #0d1535 100%)' }}
      >
        {/* ── Grid estrutural ──────────────────── */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,229,255,0.07) 1px, transparent 1px), ' +
              'linear-gradient(90deg, rgba(0,229,255,0.07) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        {/* ── Halo de dados — canto inferior direito ─────────────── */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[500px] z-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse at 70% 80%, rgba(0,229,255,0.22) 0%, transparent 62%)',
          }}
        />
        {/* ── Halo IA — canto superior esquerdo ─────────────────────────── */}
        <div
          className="pointer-events-none absolute top-0 left-0 w-[400px] h-[400px] z-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse at 20% 10%, rgba(139,92,246,0.28) 0%, transparent 62%)',
          }}
        />
        {/* ── Halo blue — centro ─────────────────────────────── */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] z-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.10) 0%, transparent 70%)',
          }}
        />

        {/* ── Data flow lines — background animado ──────────────────────── */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-60" aria-hidden="true">
          <DataFlowLines />
        </div>

        {/* ── Header: BH360 Mark + Sistema ──────────────────────────────── */}
        <header className="relative z-20 flex items-center justify-between mb-10">
          <button
            type="button"
            onClick={() => {
              SoundFX.play('confirm');
              navigate('/');
            }}
            className="flex items-center gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]/60 rounded-lg"
            aria-label="Ir para página inicial Birth Hub 360"
          >
            <BH360Mark size={56} animated />
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-2xl font-bold text-[#F8F9FF] leading-none tracking-tight">
                Birth Hub<span className="grad-text glow-text ml-1">360°</span>
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-[#F8F9FF]/50">
                Command Center
              </span>
            </div>
          </button>
        </header>

        {/* ── Status Bar ─────────────────────────────────────────────────── */}
        <div className="relative z-20 mb-8">
          <div className="flex items-center justify-between w-full py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-green-400">
                LIVE
              </span>
              <span className="w-px h-3 bg-[#F8F9FF]/10 mx-1" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#F8F9FF]/40">
                Sistema Online
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 font-mono text-[9px] text-[#F8F9FF]/40 tabular-nums">
              <span>{dateLabel}</span>
              <span className="opacity-40">|</span>
              <span className="font-bold text-[#F8F9FF]/70">{timeLabel}</span>
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-[#00E5FF]/40 via-[#8B5CF6]/30 to-transparent" />
        </div>

        {/* ── Hero Typeset ───────────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer(0.08)}
          className="relative z-20 flex-1 flex flex-col justify-center gap-5 mb-6"
        >
          {/* Eyebrow — posicionamento amplo */}
          <motion.p
            variants={staggerItem}
            className="font-mono text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#00E5FF]"
          >
            Sistema Operacional Comercial
          </motion.p>

          {/* Headline — conceito oficial */}
          <motion.h1
            variants={staggerItem}
            className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.25rem] xl:text-[2.75rem] 2xl:text-[3.25rem] font-bold tracking-tight text-[#F8F9FF] leading-[1.25]"
          >
            Dados que <span className="grad-text glow-text">Conectam.</span>
            <br />
            Inteligência que{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 55%, #00E5FF 100%)',
                filter:
                  'drop-shadow(0 0 20px rgba(139,92,246,.7)) drop-shadow(0 0 40px rgba(139,92,246,.4))',
              }}
            >
              Decide.
            </span>
            <br />
            Resultados que <span className="grad-text glow-text">Acontecem.</span>
          </motion.h1>

          {/* Tagline arquitetural */}
          <motion.p
            variants={staggerItem}
            className="font-display text-base lg:text-lg font-light text-[#F8F9FF]/70 tracking-normal max-w-3xl"
            style={{ textShadow: '0 0 20px rgba(248,249,255,0.3)' }}
          >
            Conecte CRM, dados, processos e IA em um único Lugar.
            <br />
            Monitore sua operação comercial em tempo real, identifique gargalos e transforme dados
            em ações executáveis
          </motion.p>

          {/* Explosive Balloon Section */}
          <motion.div variants={staggerItem} className="balloon-container my-4">
            <div className="flex flex-wrap gap-3 justify-center items-center">
              <span
                className="balloon-item font-mono text-xs font-bold text-[#F8F9FF] tracking-wider cursor-pointer transition-all duration-300"
                style={{ color: '#00E5FF' }}
              >
                CRM
              </span>
              <span className="text-[#F8F9FF]/30">·</span>
              <span
                className="balloon-item font-mono text-xs font-bold text-[#F8F9FF] tracking-wider cursor-pointer transition-all duration-300"
                style={{ color: '#3B82F6' }}
              >
                Pipeline
              </span>
              <span className="text-[#F8F9FF]/30">·</span>
              <span
                className="balloon-item font-mono text-xs font-bold text-[#F8F9FF] tracking-wider cursor-pointer transition-all duration-300"
                style={{ color: '#8B5CF6' }}
              >
                Inteligência
              </span>
              <span className="text-[#F8F9FF]/30">·</span>
              <span
                className="balloon-item font-mono text-xs font-bold text-[#F8F9FF] tracking-wider cursor-pointer transition-all duration-300"
                style={{ color: '#F59E0B' }}
              >
                Forecast
              </span>
              <span className="text-[#F8F9FF]/30">·</span>
              <span
                className="balloon-item font-mono text-xs font-bold text-[#F8F9FF] tracking-wider cursor-pointer transition-all duration-300"
                style={{ color: '#22C55E' }}
              >
                Automação
              </span>
              <span className="text-[#F8F9FF]/30">·</span>
              <span
                className="balloon-item font-mono text-xs font-bold text-[#F8F9FF] tracking-wider cursor-pointer transition-all duration-300"
                style={{ color: '#EF4444' }}
              >
                IA
              </span>
              <span className="text-[#F8F9FF]/30">·</span>
              <span
                className="balloon-item font-mono text-xs font-bold text-[#F8F9FF] tracking-wider cursor-pointer transition-all duration-300"
                style={{ color: '#33EBFF' }}
              >
                Voz
              </span>
              <span className="text-[#F8F9FF]/30">·</span>
              <span
                className="balloon-item font-mono text-xs font-bold text-[#F8F9FF] tracking-wider cursor-pointer transition-all duration-300"
                style={{ color: '#94A3B8' }}
              >
                Engajamento
              </span>
            </div>
            <p
              className="balloon-item font-mono text-[10px] text-[#F8F9FF]/60 text-center mt-3 tracking-wide"
              style={{ textShadow: '0 0 15px rgba(248,249,255,0.4)' }}
            >
              Oito pilares. Um sistema operacional comercial integrado.
            </p>
          </motion.div>

          {/* Separador com metáfora de fluxo */}
          <motion.div variants={staggerItem} className="flex items-center gap-4 my-3">
            <div className="h-px flex-1 bg-gradient-to-r from-[#00E5FF]/60 to-transparent" />
            <span className="font-mono text-sm text-[#F8F9FF]/30 uppercase tracking-widest">
              8 pilares integrados
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-[#8B5CF6]/40 to-transparent" />
          </motion.div>

          {/* 8 Pilares — linguagem visual proprietária */}
          <motion.div variants={staggerItem}>
            <PillarStrip />
          </motion.div>
        </motion.div>

        {/* ── Footer institucional ────────────────────────────────────────── */}
        <div className="relative z-20 pt-6 border-t border-[#F8F9FF]/10">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#F8F9FF]/30">
            Birth Hub 360° · Sistema Operacional para Operações Comerciais
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          LADO DIREITO — Formulário de acesso
          Base: var(--bg) / var(--surface). Neutro, limpo, informação.
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-[var(--bg)] px-8 py-12 w-full">
        {/* Subtle radial gradient for depth */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(22,119,255,0.06) 0%, transparent 65%)',
          }}
        />

        {/* Top actions — canto superior direito */}
        <div className="absolute top-6 right-6 hidden sm:flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              SoundFX.play('click');
              toggleTheme();
            }}
            className="text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors p-1.5 rounded-md hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]"
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? (
              <Sun size={16} strokeWidth={2} />
            ) : (
              <Moon size={16} strokeWidth={2} />
            )}
          </button>

          <div className="flex items-center gap-2 font-mono text-[9px] text-[var(--ink-2)] uppercase tracking-widest">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"
              aria-hidden="true"
            />
            BH360 · v4
          </div>
        </div>

        <div className="w-full max-w-[420px] z-10">
          {/* ── Header do formulário ──────────────────────────────────────── */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <h2 className="font-display text-[2rem] font-bold tracking-tight text-[var(--ink)] mb-1.5">
              {isSignUp ? 'Criar conta' : 'Acessar conta'}
            </h2>
            <p className="font-mono text-xs text-[var(--ink-2)] uppercase tracking-wider mb-3">
              {isSignUp
                ? 'Preencha seus dados para começar'
                : 'Acesse o sistema operacional comercial'}
            </p>
            {!isSignUp && (
              <p className="font-mono text-[11px] text-[var(--ink-2)] leading-relaxed border-l-2 border-[#00E5FF]/30 pl-3">
                8 pilares integrados em uma única plataforma — do CRM à IA, da prospecção ao
                engajamento.
              </p>
            )}
          </motion.div>

          {/* ── Card do formulário ────────────────────────────────────────── */}
          <motion.div
            className="rounded-2xl border border-[var(--line)] overflow-hidden bg-[var(--surface)]"
            style={{
              backdropFilter: 'blur(24px)',
              boxShadow:
                '0 0 0 1px var(--line), 0 32px 64px rgba(0,0,0,0.12), 0 0 80px rgba(22,119,255,0.06)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06, ease: EASE_OUT_EXPO }}
          >
            {/* Tabs */}
            <div
              className="flex border-b border-[var(--line)]"
              role="tablist"
              aria-label="Método de acesso"
            >
              {(['email', 'sso'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors relative font-mono',
                    activeTab === tab
                      ? 'text-[#00E5FF]'
                      : 'text-[var(--ink-2)] hover:text-[var(--ink)]',
                  ].join(' ')}
                >
                  {tab === 'email' ? 'E-mail corporativo' : 'SSO Empresarial'}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{ background: '#00E5FF' }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Conteúdo do formulário */}
            <div className="p-6 md:p-7">
              {verificationPending ? (
                <div className="space-y-5 text-center">
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/5 p-3.5 text-left text-sm text-[var(--ink)]">
                    <Mail size={16} className="mt-0.5 shrink-0 text-[#00E5FF]" />
                    <p>
                      Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele
                      para ativar sua conta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="text-sm font-bold text-[var(--ink-2)] hover:text-[#00E5FF] transition-colors"
                  >
                    Voltar para o login
                  </button>
                </div>
              ) : isForgotPassword ? (
                forgotPasswordSent ? (
                  <div className="space-y-5 text-center">
                    <div className="flex items-start gap-2.5 rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/5 p-3.5 text-left text-sm text-[var(--ink)]">
                      <Mail size={16} className="mt-0.5 shrink-0 text-[#00E5FF]" />
                      <p>
                        Se <strong>{email}</strong> tiver uma conta, enviamos um link de
                        redefinição. O link expira em 1 hora.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={backToSignIn}
                      className="text-sm font-bold text-[var(--ink-2)] hover:text-[#00E5FF] transition-colors"
                    >
                      Voltar para o login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5" noValidate>
                    {error && (
                      <div
                        role="alert"
                        className="flex items-start gap-2.5 rounded-xl border border-[var(--critical)]/30 bg-[var(--critical)]/5 p-3.5 text-xs text-[var(--critical)]"
                      >
                        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <p>{error}</p>
                      </div>
                    )}
                    <p className="font-mono text-xs text-[var(--ink-2)]">
                      Informe o e-mail corporativo da sua conta para receber o link de redefinição
                      de senha.
                    </p>
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-2)]"
                        aria-hidden="true"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inputCls} pl-11`}
                        aria-label="E-mail corporativo"
                        placeholder="executivo@empresa.com.br"
                        required
                        autoComplete="email"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !email}
                      className="w-full h-[48px] rounded-[var(--radius-control)] bg-[#00E5FF] text-[#0D0D0D] text-base font-extrabold uppercase tracking-wide shadow-lg transition-all hover:bg-[#1565E0] hover:text-[#F8F9FF] disabled:opacity-50 flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin mx-auto h-5 w-5" aria-hidden="true" />
                      ) : (
                        'Enviar link de redefinição'
                      )}
                    </button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={backToSignIn}
                        className="text-xs font-bold text-[var(--ink-2)] hover:text-[#00E5FF] transition-colors"
                      >
                        Voltar para o login
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handleAuth} className="space-y-5" noValidate>
                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-[var(--critical)]/30 bg-[var(--critical)]/5 p-3.5 text-xs text-[var(--critical)]"
                    >
                      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <p>{error}</p>
                    </div>
                  )}

                  {isSignUp && (
                    <div>
                      <label
                        htmlFor="login-name"
                        className="block font-mono text-[11px] font-semibold text-[var(--ink-2)] mb-1.5 uppercase tracking-wide"
                      >
                        Nome completo
                      </label>
                      <input
                        id="login-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputCls}
                        aria-label="Nome completo"
                        placeholder="Seu Nome Completo"
                        required={isSignUp}
                        autoComplete="name"
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Email */}
                    <div>
                      <label
                        htmlFor="login-email"
                        className="block font-mono text-[11px] font-semibold text-[var(--ink-2)] mb-1.5 uppercase tracking-wide"
                      >
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-2)]"
                          aria-hidden="true"
                        />
                        <input
                          id="login-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`${inputCls} pl-11`}
                          aria-label="E-mail corporativo"
                          placeholder={
                            activeTab === 'sso'
                              ? 'seuemail@seudominio.com.br'
                              : 'executivo@empresa.com.br'
                          }
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    {/* Senha */}
                    <div>
                      <label
                        htmlFor="login-password"
                        className="block font-mono text-[11px] font-semibold text-[var(--ink-2)] mb-1.5 uppercase tracking-wide"
                      >
                        Senha
                      </label>
                      <div className="relative">
                        <Lock
                          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-2)]"
                          aria-hidden="true"
                        />
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputCls} pl-11 pr-11`}
                          aria-label="Senha"
                          placeholder="••••••••••••"
                          required
                          autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          aria-pressed={showPassword}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {!isSignUp && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] font-semibold text-[var(--ink-2)]">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-[var(--line)] w-4 h-4 bg-[var(--surface)] accent-[#00E5FF]"
                        />
                        Manter sessão ativa
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError('');
                        }}
                        className="font-mono text-[11px] font-bold text-[var(--ink-2)] hover:text-[#00E5FF] transition-colors sm:text-right"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}

                  {/* CTA principal — Blue, não Gold */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !email || !password}
                    className="w-full h-[48px] rounded-[var(--radius-control)] bg-[#00E5FF] text-[#0D0D0D] text-base font-extrabold uppercase tracking-wide shadow-lg transition-all hover:bg-[#1565E0] hover:text-[#F8F9FF] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E5FF]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin h-5 w-5" aria-hidden="true" />
                    ) : isSignUp ? (
                      'Criar conta'
                    ) : (
                      <>
                        Entrar no Birth Hub <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Toggle login / cadastro */}
              {!isForgotPassword && !verificationPending && (
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError('');
                      setName('');
                    }}
                    className="font-mono text-[11px] font-bold text-[var(--ink-2)] hover:text-[#00E5FF] transition-colors"
                  >
                    {isSignUp ? 'Já tem conta? Fazer login' : 'Não tem conta? Criar conta'}
                  </button>
                </div>
              )}

              {/* Opções SSO / Social */}
              {!isSignUp && !isForgotPassword && !verificationPending && (
                <div className="mt-6">
                  <div className="relative flex items-center justify-center mb-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--line)]" />
                    </div>
                    <span className="relative bg-[var(--surface)] px-3 font-mono text-[9px] uppercase tracking-widest font-bold text-[var(--ink-2)]">
                      ou continue com
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--line)] py-2.5 text-[11px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00E5FF]"
                      aria-label="Entrar com Google"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--line)] py-2.5 text-[11px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00E5FF]"
                      aria-label="Entrar com Microsoft"
                    >
                      <svg viewBox="0 0 21 21" className="w-3.5 h-3.5" aria-hidden="true">
                        <path fill="#f25022" d="M0 0h10v10H0z" />
                        <path fill="#7fba00" d="M11 0h10v10H11z" />
                        <path fill="#00a4ef" d="M0 11h10v10H0z" />
                        <path fill="#ffb900" d="M11 11h10v10H11z" />
                      </svg>
                      Microsoft
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--line)] py-2.5 text-[11px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00E5FF]"
                      aria-label="Entrar com SSO"
                    >
                      <Lock className="w-3.5 h-3.5 text-[var(--ink-2)]" aria-hidden="true" />
                      SSO
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Trust badges ──────────────────────────────────────────────── */}
          <motion.div
            className="mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex flex-wrap justify-center gap-3 font-mono text-[9px] font-bold text-[var(--ink-2)]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-[var(--ok)]" aria-hidden="true" />
                Acesso protegido
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[var(--ok)]" aria-hidden="true" />
                Autenticação empresarial
              </span>
              <span className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-[var(--ok)]" aria-hidden="true" />
                Controle de permissões
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[var(--ok)]" aria-hidden="true" />
                Conformidade LGPD
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
