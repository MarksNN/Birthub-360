import type React from 'react';
import { useEffect, useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Cpu,
  BarChart3,
  Network,
  Workflow,
  Radio,
  Clock,
  Compass,
  Check,
  Zap,
  Target,
  FileSpreadsheet,
  Users2,
  ShieldAlert,
  Server,
  MessageSquare,
  Bot,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.js';
import { useTheme } from '../../../contexts/ThemeContext.js';
import { authClient } from '../../../lib/auth-client.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import './Landing360.css';

// 8 PILARES OFICIAIS COMPLETOS DO BIRTH HUB 360° (PALETA NEON OFICIAL)
const OFFICIAL_PILLARS = [
  {
    id: '01',
    slug: 'HUB',
    name: 'HUB COMERCIAL',
    desc: 'Centralização de contas, pipeline comercial unificado e visão 360° de cada oportunidade em negociação.',
    symbol: '◉',
    color: '#00D4FF', // Azul Neon
    tag: 'Pipeline Central',
    focus: 'Gestão Unificada de Oportunidades',
  },
  {
    id: '02',
    slug: 'INTEL',
    name: 'INTELIGÊNCIA DE MERCADO',
    desc: 'Enriquecimento analítico de dados B2B, sinais de compra, qualificação precisa e inteligência de decisores.',
    symbol: '◎',
    color: '#FF2D9B', // Rosa Neon
    tag: 'Decisão por Dados',
    focus: 'Sinais & Qualificação Preditiva',
  },
  {
    id: '03',
    slug: 'ORCH',
    name: 'ORQUESTRAÇÃO DE VENDAS',
    desc: 'Cadências multicanal coordenadas, regras de transição de bastão e alinhamento operacional de ponta a ponta.',
    symbol: '⟶',
    color: '#00D4FF', // Azul Neon
    tag: 'Fluxos Integrados',
    focus: 'Cadências & Passagem de Bastão',
  },
  {
    id: '04',
    slug: 'PERF',
    name: 'PERFORMANCE COMERCIAL',
    desc: 'Telemetria de conversão, velocidade de avanço no funil, metas operacionais e produtividade da equipe.',
    symbol: '▥',
    color: '#FFC107', // Dourado Neon
    tag: 'Metas & Velocidade',
    focus: 'Métricas & Conversão em Tempo Real',
  },
  {
    id: '05',
    slug: 'FORE',
    name: 'PREVISIBILIDADE COMERCIAL',
    desc: 'Modelagem estatística de probabilidade, análise de pipeline ponderado e cenários embasados no histórico real.',
    symbol: '⌁',
    color: '#FFC107', // Dourado Neon
    tag: 'Pipeline Ponderado',
    focus: 'Cenários & Probabilidade Real',
  },
  {
    id: '06',
    slug: 'AI',
    name: 'INTELIGÊNCIA ARTIFICIAL',
    desc: 'Copiloto comercial ancorado nos dados da empresa, diagnóstico de entraves e suporte ativo em negociações.',
    symbol: '✦',
    color: '#FF2D9B', // Rosa Neon
    tag: 'Copiloto & Modelos',
    focus: 'Agentes & Diagnóstico Contextual',
  },
  {
    id: '07',
    slug: 'AUTO',
    name: 'AUTOMAÇÃO & CONECTIVIDADE',
    desc: 'Sincronização contínua bidirecional, gatilhos de follow-up em tempo real e integração profunda com Bitrix24.',
    symbol: '◇',
    color: '#00D4FF', // Azul Neon
    tag: 'Gatilhos & Bitrix24',
    focus: 'Integrações & Ações Instantâneas',
  },
  {
    id: '08',
    slug: 'ENG',
    name: 'ENGAJAMENTO COMERCIAL',
    desc: 'Comunicação integrada, telefonia em nuvem, histórico de interações e rastreabilidade total de contatos.',
    symbol: '◌',
    color: '#FF2D9B', // Rosa Neon
    tag: 'Voz & Omnichannel',
    focus: 'Telefonia & Registro de Contato',
  },
] as const;

// TAGS DE CAPACIDADES DA PLATAFORMA (PALETA NEON OFICIAL)
const FEATURE_TAGS = [
  { label: 'Pipeline Centralizado', color: '#00D4FF' },
  { label: 'Inteligência B2B', color: '#FF2D9B' },
  { label: 'Cadências Automatizadas', color: '#00D4FF' },
  { label: 'Velocidade de Ciclo', color: '#FFC107' },
  { label: 'Cenários Ponderados', color: '#FFC107' },
  { label: 'Copiloto Comercial IA', color: '#FF2D9B' },
  { label: 'Conectividade Bitrix24', color: '#00D4FF' },
  { label: 'Telefonia & Voz Ativa', color: '#FF2D9B' },
];

function BH360LogoMark({ size = 52 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const reduceMotion = useReducedMotion();

  return (
    <svg
      className="logo-glow-light"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Birth Hub 360 — símbolo"
    >
      <defs>
        <linearGradient id={`mark-arc-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="50%" stopColor="#FF2D9B" />
          <stop offset="100%" stopColor="#FFC107" />
        </linearGradient>
        <radialGradient id={`mark-core-${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1C1C24" />
          <stop offset="100%" stopColor="#0D0D0D" />
        </radialGradient>
      </defs>

      <motion.circle
        cx="128"
        cy="128"
        r="118"
        fill="none"
        stroke={`url(#mark-arc-${uid})`}
        strokeWidth="10"
        strokeDasharray="6 14"
        animate={!reduceMotion ? { rotate: 360 } : undefined}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '128px 128px' }}
      />
      <circle cx="128" cy="128" r="78" fill={`url(#mark-core-${uid})`} />
      <circle cx="128" cy="128" r="64" fill="none" stroke="#00D4FF" strokeWidth="3" opacity="0.9" />
      <line x1="64" y1="128" x2="192" y2="128" stroke="#FF2D9B" strokeWidth="2" opacity="0.8" />
      <path
        fill="#00D4FF"
        transform="matrix(0.0740 0 0 -0.0740 104.45 154.20)"
        d="M450.4 707Q574.2 707 627.9 670.8Q681.6 634.6 681.6 573.4Q681.6 520.8 646.8 476.7Q612 432.6 547 404.5Q482 376.4 391 370.8Q511 369.4 573.8 326.1Q636.6 282.8 636.6 218.2Q636.6 165.8 612.2 125.1Q587.8 84.4 543.2 56.4Q498.6 28.4 436 14.2Q373.4 0 297 0Q267.8 0 227.6 1.5Q187.4 3 121 3Q94.8 3 63.8 2.5Q32.8 2 3.7 1.5Q-25.4 1 -45 0L-41 20Q-7 22 12 28Q31 34 42 52Q53 70 62 106L194 602Q201.8 632.8 202.4 651.3Q203 669.8 188.5 678.5Q174 687.2 135 688L140 708Q159.6 707 188.2 706.5Q216.8 706 247.7 705.5Q278.6 705 303 705Q353.2 705 385.7 706Q418.2 707 450.4 707ZM266 359 270 376H339.2Q393.8 376 430.6 407.9Q467.4 439.8 486.2 490.8Q505 541.8 505 596.8Q505 636.6 491.5 662.3Q478 688 438.6 688Q413 688 401 674.1Q389 660.2 378 617L243 106Q238.2 86.4 235.7 67.1Q233.2 47.8 242.2 35.4Q251.2 23 278.8 23Q331.6 23 368.9 53.4Q406.2 83.8 426.6 132.9Q447 182 447 237.2Q447 270.4 437.2 297.9Q427.4 325.4 404.3 342.2Q381.2 359 341.6 359Z"
      />
    </svg>
  );
}

export function Landing360({
  initialScreen = 'intro',
}: {
  initialScreen?: 'intro' | 'login';
} = {}) {
  const [activeScreen, setActiveScreen] = useState<'intro' | 'login'>(initialScreen);
  const { currentUser, isPending: isAuthPending } = useAuth();
  const { theme, setThemeMode } = useTheme();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  // Forçar Dark Mode na landing para a Paleta Neon
  useEffect(() => {
    if (theme !== 'dark') {
      setThemeMode('dark');
    }
    document.documentElement.classList.add('dark');
  }, [theme, setThemeMode]);

  // Relógio e Calendário ao vivo
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form State para autenticação
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [authMethod, setAuthMethod] = useState<'email' | 'sso'>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);

  // Efeito do relógio
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Redirecionamento se já autenticado
  useEffect(() => {
    if (currentUser) {
      navigate('/app', { replace: true });
    }
  }, [currentUser, navigate]);

  // Cálculos do relógio analógico
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();

  const hourDeg = (hours % 12) * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const secondDeg = seconds * 6;

  const daysArr = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
  const monthsArr = [
    'JAN',
    'FEV',
    'MAR',
    'ABR',
    'MAI',
    'JUN',
    'JUL',
    'AGO',
    'SET',
    'OUT',
    'NOV',
    'DEZ',
  ];
  const dayName = daysArr[currentDate.getDay()];
  const dayNum = String(currentDate.getDate()).padStart(2, '0');
  const monthName = monthsArr[currentDate.getMonth()];
  const yearNum = currentDate.getFullYear();
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const handlePillarClick = (id: string) => {
    SoundFX.play('click');
    setSelectedPillar(id === selectedPillar ? null : id);
  };

  const handleGoToLogin = () => {
    SoundFX.play('confirm');
    navigate('/login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail corporativo.');
      return;
    }

    if (authMode !== 'forgot' && !password.trim()) {
      setErrorMessage('Por favor, informe sua senha de acesso.');
      return;
    }

    setIsSubmitting(true);
    SoundFX.play('confirm');

    try {
      if (authMode === 'signin') {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password: password.trim(),
          rememberMe,
          callbackURL: '/app',
        });

        if (result.error) {
          setErrorMessage(result.error.message || 'Credenciais inválidas. Tente novamente.');
          setIsSubmitting(false);
          return;
        }

        navigate('/app', { replace: true });
      } else if (authMode === 'signup') {
        const result = await authClient.signUp.email({
          email: email.trim(),
          password: password.trim(),
          name: name.trim() || email.split('@')[0],
          callbackURL: '/app',
        });

        if (result.error) {
          setErrorMessage(
            result.error.message || 'Erro ao solicitar provisionamento. Verifique os dados.',
          );
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage(
          'Solicitação de provisionamento enviada com sucesso! Verifique seu e-mail corporativo.',
        );
        setIsSubmitting(false);
      } else if (authMode === 'forgot') {
        const result = await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo: '/reset-password',
        });

        if (result.error) {
          setErrorMessage(result.error.message || 'Não foi possível enviar o link de redefinição.');
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage('Link de redefinição de senha enviado para seu e-mail corporativo.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro inesperado ao processar.');
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'microsoft') => {
    SoundFX.play('click');
    (authClient.signIn as any)?.social({
      provider,
      callbackURL: '/app',
    });
  };

  if (isAuthPending) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00D4FF] w-10 h-10" />
      </div>
    );
  }

  return (
    <main className="relative w-full min-h-screen bg-[#0D0D0D] text-[#F8F9FF] font-sans selection:bg-[#FF2D9B]/30 selection:text-[#00D4FF] landing-neon-root">
      {/* ════════════════════════════════════════════════════════════════════
          TELA 1: LANDING COMPLETA (PALETA NEON OFICIAL)
      ════════════════════════════════════════════════════════════════════ */}
      <div className={activeScreen === 'intro' ? 'block' : 'hidden'}>
        {/* 1. NAVBAR */}
        <header className="navbar-sticky w-full px-5 py-3 sm:px-8 lg:px-14">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="#hero" className="flex items-center gap-3 group">
              <BH360LogoMark size={46} />
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold leading-tight tracking-tight">
                  <span className="text-[#00D4FF]">Birth Hub</span>
                  <span className="text-[#FF2D9B] ml-1 font-extrabold">360°</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00D4FF]/70 font-semibold">
                  Command Center
                </span>
              </div>
            </a>

            {/* Links de navegação desktop */}
            <nav className="hidden xl:flex items-center gap-6 font-mono text-xs font-semibold text-[#F8F9FF]/70">
              <a href="#problema" className="hover:text-[#00D4FF] transition-colors">
                Problema
              </a>
              <a href="#plataforma" className="hover:text-[#00D4FF] transition-colors">
                Plataforma
              </a>
              <a href="#pilares" className="hover:text-[#00D4FF] transition-colors">
                8 Pilares
              </a>
              <a href="#fluxo" className="hover:text-[#00D4FF] transition-colors">
                Fluxo
              </a>
              <a href="#ia" className="hover:text-[#00D4FF] transition-colors">
                IA
              </a>
              <a href="#automacao" className="hover:text-[#00D4FF] transition-colors">
                Automação
              </a>
              <a href="#performance" className="hover:text-[#00D4FF] transition-colors">
                Performance
              </a>
              <a href="#previsibilidade" className="hover:text-[#00D4FF] transition-colors">
                Previsibilidade
              </a>
              <a href="#ecossistema" className="hover:text-[#00D4FF] transition-colors">
                Ecossistema
              </a>
            </nav>

            {/* Botão Acessar Plataforma na Navbar */}
            <button
              id="nav-btn-login"
              type="button"
              onClick={handleGoToLogin}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#00D4FF]/40 bg-[#14141A] hover:bg-[#1C1C26] text-[#00D4FF] font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all hover:border-[#00D4FF] hover:shadow-[0_0_22px_rgba(0,212,255,0.4)] cursor-pointer"
            >
              <span>Acessar Plataforma</span>
              <ArrowRight className="w-4 h-4 text-[#00D4FF]" />
            </button>
          </div>
        </header>

        {/* 2. HERO */}
        <section
          id="hero"
          className="relative px-5 py-12 sm:px-8 lg:px-14 overflow-hidden border-b border-[#232332] bg-[#0D0D0D]"
        >
          {/* Fundo estrutural em grid e halos sutis neon */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-40"
            aria-hidden="true"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          <div className="pointer-events-none absolute top-10 right-10 w-[500px] h-[500px] rounded-full blur-[130px] bg-[#00D4FF]/15" />
          <div className="pointer-events-none absolute bottom-0 left-10 w-[450px] h-[450px] rounded-full blur-[130px] bg-[#FF2D9B]/15" />

          <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center text-center">
            {/* Status Bar ao Vivo */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 py-2 px-4 rounded-2xl bg-[#14141A] border border-[#232332] shadow-xs">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4FF] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00D4FF]" />
                </span>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="font-bold uppercase tracking-[0.2em] text-[#00D4FF]">LIVE</span>
                  <span className="w-px h-3.5 bg-[#232332]" aria-hidden="true" />
                  <span className="text-[#F8F9FF]/80 font-medium tracking-wide">
                    Sistema Operacional Online
                  </span>
                </div>
              </div>

              {/* Calendário & Relógio High-Tech no Hero */}
              <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#181824] border border-[#232332] shadow-2xs">
                  <div className="text-center min-w-[32px]">
                    <div className="font-display text-xl sm:text-2xl font-extrabold text-[#00D4FF] leading-none">
                      {dayNum}
                    </div>
                    <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#FFC107]">
                      {monthName}
                    </div>
                  </div>
                  <div className="w-px h-7 bg-[#232332]" />
                  <div className="text-left font-mono text-[11px]">
                    <div className="font-bold text-[#FF2D9B]">{dayName}</div>
                    <div className="text-[#F8F9FF]/60 text-[10px]">{yearNum} · BRT</div>
                  </div>
                </div>

                <div className="relative w-12 h-12 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
                    <circle
                      cx="50"
                      cy="50"
                      r="48"
                      fill="none"
                      stroke="#232332"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="#14141A"
                      stroke="#00D4FF"
                      strokeWidth="1.5"
                    />
                    <g stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="50" y1="7" x2="50" y2="13" stroke="#00D4FF" strokeWidth="2.5" />
                      <line x1="50" y1="87" x2="50" y2="93" stroke="#00D4FF" strokeWidth="2.5" />
                      <line x1="7" y1="50" x2="13" y2="50" stroke="#00D4FF" strokeWidth="2.5" />
                      <line x1="87" y1="50" x2="93" y2="50" stroke="#00D4FF" strokeWidth="2.5" />
                    </g>
                    <line
                      x1="50"
                      y1="50"
                      x2="50"
                      y2="28"
                      stroke="#00D4FF"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      transform={`rotate(${hourDeg} 50 50)`}
                    />
                    <line
                      x1="50"
                      y1="50"
                      x2="50"
                      y2="18"
                      stroke="#FF2D9B"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      transform={`rotate(${minuteDeg} 50 50)`}
                    />
                    <line
                      x1="50"
                      y1="56"
                      x2="50"
                      y2="12"
                      stroke="#FFC107"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      transform={`rotate(${secondDeg} 50 50)`}
                    />
                    <circle cx="50" cy="50" r="3.5" fill="#00D4FF" />
                  </svg>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-[#14141A] border border-[#00D4FF]/40 shadow-2xs">
                    <span className="font-mono text-[9px] font-bold text-[#00D4FF] tabular-nums">
                      {timeString}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Badge de Categoria */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.25)] mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#00D4FF]" />
              SISTEMA OPERACIONAL COMERCIAL
            </div>

            {/* Headlines Principais — Cores Neon Oficiais (Nunca Branco ou Preto) */}
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] max-w-4xl">
              <span className="text-[#00D4FF] drop-shadow-[0_0_24px_rgba(0,212,255,0.45)]">
                Dados que Conectam.
              </span>
              <br />
              <span className="text-[#FF2D9B] drop-shadow-[0_0_24px_rgba(255,45,155,0.45)]">
                Inteligência que Decide.
              </span>
              <br />
              <span className="text-[#FFC107] drop-shadow-[0_0_24px_rgba(255,193,7,0.45)]">
                Resultados que Acontecem.
              </span>
            </h1>

            {/* Subheadline Oficial */}
            <p className="mt-6 text-base sm:text-lg md:text-xl font-normal text-[#F8F9FF]/80 max-w-3xl leading-relaxed">
              Conecte CRM, dados, inteligência artificial e automação em um único centro de comando
              para planejar, monitorar, prever e acelerar suas operações comerciais.
            </p>

            {/* CTAs do Hero */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="btn-cta-light inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-mono text-sm sm:text-base font-bold uppercase tracking-wider cursor-pointer shadow-md"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#pilares"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl border border-[#00D4FF]/40 bg-[#14141A] hover:bg-[#1C1C26] text-[#00D4FF] font-mono text-sm font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(0,212,255,0.15)]"
              >
                <span>Ver os 8 Pilares</span>
                <Compass className="w-4 h-4 text-[#00D4FF]" />
              </a>
            </div>

            {/* Capacidades Reais da Plataforma */}
            <div className="mt-10 pt-6 border-t border-[#232332] w-full max-w-4xl">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#00D4FF]/80 mb-3">
                Capacidades Operacionais Integradas
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {FEATURE_TAGS.map((tag) => (
                  <div
                    key={tag.label}
                    className="capability-pill flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border bg-[#14141A] shadow-2xs"
                    style={{ borderColor: `${tag.color}60`, color: tag.color }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-[#F8F9FF]">{tag.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. PROBLEMA */}
        <section
          id="problema"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0D0D0D] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#FF2D9B]/10 border border-[#FF2D9B]/40 text-[#FF2D9B] mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />O Gargalo Estrutural das Empresas
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#FF2D9B] tracking-tight drop-shadow-[0_0_18px_rgba(255,45,155,0.4)]">
                A realidade de operar com dados fragmentados e equipes no escuro
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#F8F9FF]/80 leading-relaxed">
                Empresas investem em múltiplas ferramentas, mas continuam sem clareza sobre onde o
                pipeline está travado, quais negócios realmente têm chance de fechar e o que cada
                vendedor deve fazer a seguir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6 border-l-4 border-l-[#FF2D9B]">
                <div className="w-10 h-10 rounded-xl bg-[#FF2D9B]/20 text-[#FF2D9B] flex items-center justify-center font-bold mb-4">
                  01
                </div>
                <h3 className="font-display text-lg font-bold text-[#FF2D9B] mb-2">
                  Silos e Ferramentas Desconectadas
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  O CRM não fala em tempo real com a telefonia, as trocas de WhatsApp ficam perdidas
                  no celular do vendedor e os dados de prospecção não retroalimentam o time de
                  fechamento.
                </p>
              </div>

              <div className="section-card p-6 border-l-4 border-l-[#FFC107]">
                <div className="w-10 h-10 rounded-xl bg-[#FFC107]/20 text-[#FFC107] flex items-center justify-center font-bold mb-4">
                  02
                </div>
                <h3 className="font-display text-lg font-bold text-[#FFC107] mb-2">
                  Gestão Reativa &amp; Decisões Tardias
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Gestores passam o dia cobrando preenchimento manual de planilhas e só descobrem
                  que a meta não será atingida nos últimos dias do mês, quando já não há tempo hábil
                  para corrigir o curso.
                </p>
              </div>

              <div className="section-card p-6 border-l-4 border-l-[#00D4FF]">
                <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center font-bold mb-4">
                  03
                </div>
                <h3 className="font-display text-lg font-bold text-[#00D4FF] mb-2">
                  Perda Invisível de Oportunidades
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Sem orquestração e alertas preditivos, leads esfriam na fila sem follow-up
                  tempestivo, objeções críticas não são tratadas e a taxa de conversão despenca sem
                  causa raiz evidente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PLATAFORMA */}
        <section
          id="plataforma"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#111116] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-[#00D4FF] mb-3">
                <Layers className="w-3.5 h-3.5" />
                Arquitetura One OS
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#00D4FF] tracking-tight drop-shadow-[0_0_18px_rgba(0,212,255,0.4)]">
                Um único sistema operacional para planejar, monitorar e acelerar
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#F8F9FF]/80 leading-relaxed">
                O Birth Hub 360° unifica a governança de dados, os algoritmos de diagnóstico e o
                centro de comando diário da sua equipe comercial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase text-[#00D4FF]">
                    Camada 1
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[#00D4FF] mb-2">
                  Dados &amp; Integração Contínua
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Conexão com Bitrix24, e-mails corporativos, canais de mensageria e dados
                  enriquecidos de empresas B2B consolidados em uma única fonte de verdade.
                </p>
              </div>

              <div className="section-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FF2D9B]/15 text-[#FF2D9B] flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase text-[#FF2D9B]">
                    Camada 2
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[#FF2D9B] mb-2">
                  Motor de Diagnóstico &amp; IA
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Algoritmos contextuais que avaliam a saúde de cada deal, detectam riscos em tempo
                  real e sugerem a próxima melhor ação para fechar com maior margem.
                </p>
              </div>

              <div className="section-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase text-[#FFC107]">
                    Camada 3
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[#FFC107] mb-2">
                  Execução &amp; Orquestração
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Cockpit de trabalho ágil para pré-vendas (SDR), vendas (Closer) e liderança, com
                  automações de tarefas repetitivas e cadências sem atrito.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. 8 PILARES OFICIAIS (CARDS COLORIDOS COMPLETOS) */}
        <section
          id="pilares"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0D0D0D] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-[#FFC107]/10 border border-[#FFC107]/40 text-[#FFC107] mb-3">
                <Target className="w-3.5 h-3.5" />
                ESTRUTURA OFICIAL DO PRODUTO
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#FFC107] tracking-tight drop-shadow-[0_0_18px_rgba(255,193,7,0.4)]">
                Os 8 Pilares Oficiais do Birth Hub 360°
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#F8F9FF]/80 leading-relaxed">
                Cada pilar resolve uma dimensão estratégica da operação comercial, operando de forma
                independente ou em perfeita sinergia sistêmica.
              </p>
            </div>

            {/* Grid dos 8 Cards Coloridos com Nomes Oficiais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {OFFICIAL_PILLARS.map((p) => {
                const isActive = selectedPillar === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handlePillarClick(p.id)}
                    className={`pillar-card group flex flex-col justify-between p-5 rounded-2xl cursor-pointer border transition-all duration-300 ${
                      isActive ? 'pillar-card-active' : ''
                    }`}
                    style={{
                      backgroundColor: '#14141A',
                      borderColor: isActive ? p.color : `${p.color}50`,
                      borderWidth: isActive ? '2px' : '1.5px',
                      boxShadow: isActive
                        ? `0 0 0 3px ${p.color}35, 0 0 25px ${p.color}45`
                        : `0 0 15px -2px ${p.color}25`,
                    }}
                  >
                    {/* Barra de destaque colorida superior */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl transition-all duration-300 group-hover:h-2"
                      style={{
                        background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}88 100%)`,
                      }}
                    />

                    {/* Topo do Card */}
                    <div className="flex items-center justify-between mb-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `${p.color}20`,
                            color: p.color,
                            border: `1px solid ${p.color}45`,
                          }}
                        >
                          {p.id}
                        </span>
                        <span
                          className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `${p.color}15`,
                            color: p.color,
                          }}
                        >
                          {p.slug}
                        </span>
                      </div>

                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base transition-transform duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: `${p.color}20`,
                          color: p.color,
                          border: `1px solid ${p.color}50`,
                        }}
                      >
                        {p.symbol}
                      </div>
                    </div>

                    {/* Conteúdo do Card com Nome Oficial */}
                    <div className="flex-1 my-1">
                      <h3
                        className="font-display text-sm sm:text-base font-bold leading-tight mb-1"
                        style={{ color: p.color, textShadow: `0 0 10px ${p.color}50` }}
                      >
                        {p.name}
                      </h3>
                      <p className="font-sans text-xs text-[#F8F9FF]/70 leading-snug mb-3">
                        {p.desc}
                      </p>
                      <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1C1C26] text-[#F8F9FF]/90 border border-white/10">
                        Foco: {p.focus}
                      </div>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="mt-4 pt-2.5 border-t border-[#232332] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ backgroundColor: p.color }}
                        />
                        <span
                          className="font-mono text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: p.color }}
                        >
                          {p.tag}
                        </span>
                      </div>
                      <span
                        className="font-mono text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                        style={{ color: p.color }}
                      >
                        CONECTADO →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. FLUXO OPERACIONAL */}
        <section
          id="fluxo"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#111116] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-[#00D4FF] mb-3">
                <Workflow className="w-3.5 h-3.5" />
                CICLO OPERACIONAL COMPLETO
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#00D4FF] tracking-tight drop-shadow-[0_0_18px_rgba(0,212,255,0.4)]">
                Como os dados fluem da prospecção ao fechamento
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#F8F9FF]/80">
                Cada etapa é governada por automações e inteligência para garantir velocidade e zero
                perda de oportunidades.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-[#00D4FF] mb-2">ETAPA 01</div>
                <h4 className="font-display text-sm font-bold text-[#00D4FF] mb-1">
                  Entrada &amp; Captura
                </h4>
                <p className="text-xs text-[#F8F9FF]/70">
                  Leads e contas são integrados via Bitrix24, campanhas ou prospecção ativa.
                </p>
              </div>

              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-[#FF2D9B] mb-2">ETAPA 02</div>
                <h4 className="font-display text-sm font-bold text-[#FF2D9B] mb-1">
                  Enriquecimento B2B
                </h4>
                <p className="text-xs text-[#F8F9FF]/70">
                  Dados de receita, decisores e porte validam o fit do cliente ideal (ICP).
                </p>
              </div>

              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-[#FFC107] mb-2">ETAPA 03</div>
                <h4 className="font-display text-sm font-bold text-[#FFC107] mb-1">
                  Cadência &amp; SLA
                </h4>
                <p className="text-xs text-[#F8F9FF]/70">
                  Distribuição instantânea ao SDR com réguas de contato automáticas.
                </p>
              </div>

              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-[#00D4FF] mb-2">ETAPA 04</div>
                <h4 className="font-display text-sm font-bold text-[#00D4FF] mb-1">Apoio com IA</h4>
                <p className="text-xs text-[#F8F9FF]/70">
                  Copiloto analisa objeções, histórico e recomenda a abordagem ideal.
                </p>
              </div>

              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-[#FF2D9B] mb-2">ETAPA 05</div>
                <h4 className="font-display text-sm font-bold text-[#FF2D9B] mb-1">
                  Fechamento &amp; Dados
                </h4>
                <p className="text-xs text-[#F8F9FF]/70">
                  Contrato fechado e aprendizados de win/loss retroalimentam o sistema.
                </p>
              </div>
            </div>

            {/* Demonstração Real do Motor de Prospecção — Radar Discovery */}
            <div className="mt-12 rounded-2xl border border-[#00D4FF]/30 bg-[#14141A] p-4 sm:p-6 shadow-[0_0_25px_rgba(0,212,255,0.15)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#232332]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00D4FF] animate-pulse" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D4FF]">
                    Radar Discovery em Operação Real · Fontes Abertas
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#F8F9FF]/60">
                  Captura de tela real do produto · Desktop &amp; Mobile
                </span>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0D0D0D]">
                {reduceMotion ? (
                  <img
                    src="/landing/prospeccao/poster-prospect-radar.png"
                    alt="Radar de Prospecção Comercial do Birth Hub 360°"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                ) : (
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster="/landing/prospeccao/poster-prospect-radar.png"
                    className="w-full h-auto object-cover"
                  >
                    <source src="/landing/prospeccao/prospect-radar-demo.webm" type="video/webm" />
                    <source src="/landing/prospeccao/prospect-radar-demo.mp4" type="video/mp4" />
                    Seu navegador não suporta a tag de vídeo.
                  </video>
                )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#F8F9FF]/70 font-mono">
                <span>✦ ICP Filtrado por Segmento, Região e Personas B2B</span>
                <span className="text-[#00D4FF]">Integração nativa com Bitrix24 &amp; CRM</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. IA (INTELIGÊNCIA ARTIFICIAL CONTEXTUAL) */}
        <section
          id="ia"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0D0D0D] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10">
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#FF2D9B]/10 border border-[#FF2D9B]/40 text-[#FF2D9B] mb-3">
                <Bot className="w-3.5 h-3.5" />
                IA COM CONTEXTO OPERACIONAL REAL
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#FF2D9B] tracking-tight mb-4 drop-shadow-[0_0_18px_rgba(255,45,155,0.4)]">
                Inteligência Artificial que compreende o seu pipeline
              </h2>
              <p className="text-sm sm:text-base text-[#F8F9FF]/80 leading-relaxed mb-6">
                Ao contrário de ferramentas genéricas de texto, a IA do Birth Hub 360° é diretamente
                conectada aos dados operacionais do seu CRM, entendendo o estágio de cada
                negociação, o histórico de contatos e as objeções recorrentes.
              </p>
              <div className="space-y-3 font-sans text-xs sm:text-sm text-[#F8F9FF]/90">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FF2D9B]/20 text-[#FF2D9B] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    <strong className="text-[#00D4FF]">Diagnóstico de Entraves:</strong> Alerta
                    deals estagnados com sugestões claras de destravamento.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FF2D9B]/20 text-[#FF2D9B] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    <strong className="text-[#FF2D9B]">Próxima Melhor Ação:</strong> Recomendações
                    acionáveis para o vendedor avançar o contato.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FF2D9B]/20 text-[#FF2D9B] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    <strong className="text-[#FFC107]">Isolamento &amp; Segurança:</strong> Seus
                    dados comerciais jamais são utilizados para treinar modelos públicos.
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="section-card p-6 border-2 border-[#FF2D9B]/30 bg-[#14141A]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232332]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF2D9B]" />
                    <span className="font-mono text-xs font-bold text-[#FF2D9B]">
                      COPILOTO COMERCIAL ATIVO
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#F8F9FF]/50">
                    Contexto: Deal #4892
                  </span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[#1A1A24] border border-[#FF2D9B]/25 text-[#F8F9FF]/80">
                    <span className="text-[#FF2D9B] font-bold">Diagnóstico:</span> Negociação de R$
                    140k sem retorno há 4 dias após envio de proposta.
                  </div>
                  <div className="p-3 rounded-xl bg-[#1A1A24] border border-[#00D4FF]/25 text-[#F8F9FF]/80">
                    <span className="text-[#00D4FF] font-bold">Ação Sugerida:</span> Disparar
                    cadência de validação de decisor financeiro abordando ROI estimado em 90 dias.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. AUTOMAÇÃO (& CONECTIVIDADE) */}
        <section
          id="automacao"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#111116] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-[#00D4FF] mb-3">
                <Workflow className="w-3.5 h-3.5" />
                AUTOMAÇÃO OPERACIONAL
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#00D4FF] tracking-tight drop-shadow-[0_0_18px_rgba(0,212,255,0.4)]">
                Eficiência sem desumanizar o contato comercial
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#F8F9FF]/80">
                Remova tarefas braçais repetitivas e deixe seu time focado no que gera receita:
                construir relacionamentos e fechar negócios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6">
                <h3 className="font-display text-base font-bold text-[#00D4FF] mb-2">
                  Sincronização Bitrix24
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Atualizações automáticas de campos, estágios de oportunidade e tarefas sem
                  necessidade de digitação dupla.
                </p>
              </div>
              <div className="section-card p-6">
                <h3 className="font-display text-base font-bold text-[#FF2D9B] mb-2">
                  Gatilhos de Comportamento
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Aberturas de proposta, acessos a links ou ausência de contato disparam alertas
                  imediatos para a equipe responsável.
                </p>
              </div>
              <div className="section-card p-6">
                <h3 className="font-display text-base font-bold text-[#FFC107] mb-2">
                  Distribuição Inteligente
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Roteamento de oportunidades com base em carga de trabalho, especialidade do
                  vendedor e tamanho da conta.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 9. PERFORMANCE COMERCIAL */}
        <section
          id="performance"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0D0D0D] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#FFC107]/10 border border-[#FFC107]/40 text-[#FFC107] mb-3">
                <BarChart3 className="w-3.5 h-3.5" />
                TELEMETRIA DE RESULTADOS
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#FFC107] tracking-tight drop-shadow-[0_0_18px_rgba(255,193,7,0.4)]">
                Visibilidade cirúrgica da tração e das metas
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#F8F9FF]/80">
                Monitore taxas de passagem por fase, tempo de permanência em cada estágio e
                produtividade real da equipe.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="section-card p-5 border-t-4 border-t-[#00D4FF]">
                <div className="font-mono text-xs text-[#00D4FF]/70 uppercase">
                  Taxa de Conversão
                </div>
                <div className="font-display text-2xl font-extrabold text-[#00D4FF] my-1">
                  Funil 360°
                </div>
                <p className="text-xs text-[#F8F9FF]/70">
                  Acompanhamento da taxa de conversão entre cada etapa do pipeline.
                </p>
              </div>

              <div className="section-card p-5 border-t-4 border-t-[#FF2D9B]">
                <div className="font-mono text-xs text-[#FF2D9B]/70 uppercase">
                  Velocidade de Vendas
                </div>
                <div className="font-display text-2xl font-extrabold text-[#FF2D9B] my-1">
                  Ciclo Médio
                </div>
                <p className="text-xs text-[#F8F9FF]/70">
                  Identificação do tempo exato que um lead leva da qualificação ao fechamento.
                </p>
              </div>

              <div className="section-card p-5 border-t-4 border-t-[#FFC107]">
                <div className="font-mono text-xs text-[#FFC107]/70 uppercase">Gestão de Metas</div>
                <div className="font-display text-2xl font-extrabold text-[#FFC107] my-1">
                  Ritmo &amp; Pace
                </div>
                <p className="text-xs text-[#F8F9FF]/70">
                  Comparativo diário de faturamento atingido versus meta mensal estabelecida.
                </p>
              </div>

              <div className="section-card p-5 border-t-4 border-t-[#00D4FF]">
                <div className="font-mono text-xs text-[#00D4FF]/70 uppercase">
                  Motivos de Perda
                </div>
                <div className="font-display text-2xl font-extrabold text-[#00D4FF] my-1">
                  Win / Loss
                </div>
                <p className="text-xs text-[#F8F9FF]/70">
                  Análise estruturada de causas de perda para correção contínua do produto.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 10. PREVISIBILIDADE COMERCIAL */}
        <section
          id="previsibilidade"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#111116] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#FFC107]/10 border border-[#FFC107]/40 text-[#FFC107] mb-3">
                <TrendingUp className="w-3.5 h-3.5" />
                RIGOR ANALÍTICO
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#FFC107] tracking-tight drop-shadow-[0_0_18px_rgba(255,193,7,0.4)]">
                Previsibilidade comercial baseada em dados reais
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#F8F9FF]/80 leading-relaxed">
                Sem promessas mágicas: modelagem estatística séria que pondera a maturidade do
                pipeline e as taxas históricas de conversão.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6">
                <div className="w-8 h-8 rounded-lg bg-[#FFC107]/20 text-[#FFC107] flex items-center justify-center font-bold mb-3">
                  1
                </div>
                <h3 className="font-display text-base font-bold text-[#FFC107] mb-2">
                  Pipeline Ponderado
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Cálculo de probabilidade de fechamento por estágio formal de negociação, evitando
                  expectativas infladas de receita.
                </p>
              </div>

              <div className="section-card p-6">
                <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center font-bold mb-3">
                  2
                </div>
                <h3 className="font-display text-base font-bold text-[#00D4FF] mb-2">
                  Maturidade de Dados
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  O sistema reconhece que a precisão preditiva depende da consistência de
                  preenchimento e do histórico da organização.
                </p>
              </div>

              <div className="section-card p-6">
                <div className="w-8 h-8 rounded-lg bg-[#FF2D9B]/20 text-[#FF2D9B] flex items-center justify-center font-bold mb-3">
                  3
                </div>
                <h3 className="font-display text-base font-bold text-[#FF2D9B] mb-2">
                  Cenários Conservador &amp; Otimista
                </h3>
                <p className="text-xs sm:text-sm text-[#F8F9FF]/70 leading-relaxed">
                  Simulação de faixas de faturamento para que a liderança tome decisões de
                  contratação e investimento com segurança.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 11. ECOSSISTEMA */}
        <section
          id="ecossistema"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0D0D0D] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-[#00D4FF] mb-3">
                <Network className="w-3.5 h-3.5" />
                CONECTIVIDADE ENTERPRISE
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#00D4FF] tracking-tight drop-shadow-[0_0_18px_rgba(0,212,255,0.4)]">
                Integrado ao ecossistema tecnológico da sua empresa
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#F8F9FF]/80">
                Construído para operar em harmonia com as ferramentas corporativas que você já
                utiliza.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#14141A] border border-[#232332] text-center">
                <div className="font-mono text-sm font-bold text-[#00D4FF]">Bitrix24</div>
                <div className="font-sans text-xs text-[#F8F9FF]/60 mt-1">Sincronização Nativa</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#14141A] border border-[#232332] text-center">
                <div className="font-mono text-sm font-bold text-[#FF2D9B]">WhatsApp API</div>
                <div className="font-sans text-xs text-[#F8F9FF]/60 mt-1">Comunicação Direta</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#14141A] border border-[#232332] text-center">
                <div className="font-mono text-sm font-bold text-[#FFC107]">Telefonia em Nuvem</div>
                <div className="font-sans text-xs text-[#F8F9FF]/60 mt-1">
                  Gravação &amp; Métricas
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#14141A] border border-[#232332] text-center">
                <div className="font-mono text-sm font-bold text-[#00D4FF]">
                  Webhooks &amp; APIs
                </div>
                <div className="font-sans text-xs text-[#F8F9FF]/60 mt-1">Conexão Flexível</div>
              </div>
            </div>
          </div>
        </section>

        {/* 12. COMMAND CENTER */}
        <section
          id="command-center"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#111116] border-b border-[#232332]"
        >
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10">
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#FF2D9B]/10 border border-[#FF2D9B]/40 text-[#FF2D9B] mb-3">
                <Compass className="w-3.5 h-3.5" />
                COCKPIT OPERACIONAL
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#FF2D9B] tracking-tight mb-4 drop-shadow-[0_0_18px_rgba(255,45,155,0.4)]">
                O centro de comando unificado para liderança e time
              </h2>
              <p className="text-sm sm:text-base text-[#F8F9FF]/80 leading-relaxed mb-6">
                Tenha um ambiente único onde diretores acompanham a saúde da receita, gerentes
                supervisionam gargalos em tempo real e executivos de vendas recebem sua rotina de
                atividades organizada por prioridade.
              </p>
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#14141A] border border-[#232332] text-[#F8F9FF]/80">
                  <span className="font-bold text-[#00D4FF]">SDRs &amp; BDRs:</span> Fila organizada
                  e dados enriquecidos na tela.
                </div>
                <div className="p-3 rounded-xl bg-[#14141A] border border-[#232332] text-[#F8F9FF]/80">
                  <span className="font-bold text-[#FFC107]">Closers:</span> Histórico 360°,
                  objeções e apoio do copiloto.
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="section-card p-6 bg-[#14141A] border-2 border-[#00D4FF]/30">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232332]">
                  <span className="font-mono text-xs font-bold text-[#00D4FF]">
                    BIRTH HUB 360° · COCKPIT
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#00D4FF]/20 text-[#00D4FF] font-bold">
                    100% OPERACIONAL
                  </span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#181824] border border-[#232332]">
                    <span className="text-[#F8F9FF]/70">Leads Ativos na Fila</span>
                    <span className="font-bold text-[#00D4FF]">184 contatos</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#181824] border border-[#232332]">
                    <span className="text-[#F8F9FF]/70">Deals com Risco Identificado</span>
                    <span className="font-bold text-[#FFC107]">3 oportunidades</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#181824] border border-[#232332]">
                    <span className="text-[#F8F9FF]/70">Cadências em Execução</span>
                    <span className="font-bold text-[#FF2D9B]">12 ativas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 13. CTA (CALL TO ACTION) */}
        <section
          id="cta"
          className="px-5 py-20 sm:px-8 lg:px-14 bg-[#0D0D0D] text-center border-b border-[#232332]"
        >
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#00D4FF] tracking-tight leading-tight drop-shadow-[0_0_24px_rgba(0,212,255,0.45)]">
              Pronto para transformar sua operação comercial em um centro de comando inteligente?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#F8F9FF]/80 max-w-2xl mx-auto">
              Acesse a plataforma corporativa do Birth Hub 360° e conecte dados, equipe e execução
              em tempo real.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="btn-cta-light inline-flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-mono text-base font-bold uppercase tracking-wider cursor-pointer shadow-lg"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* 14. FOOTER */}
        <footer className="px-5 py-10 sm:px-8 lg:px-14 bg-[#0D0D0D]">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 border-b border-[#232332] pb-8 mb-6">
            <div className="flex items-center gap-3">
              <BH360LogoMark size={42} />
              <div>
                <div className="font-display text-lg font-bold text-[#00D4FF]">
                  Birth Hub <span className="text-[#FF2D9B]">360°</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#FFC107]">
                  Business Command Center
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-xs text-[#F8F9FF]/70">
              <a href="#problema" className="hover:text-[#00D4FF] transition-colors">
                Problema
              </a>
              <a href="#plataforma" className="hover:text-[#00D4FF] transition-colors">
                Plataforma
              </a>
              <a href="#pilares" className="hover:text-[#00D4FF] transition-colors">
                8 Pilares
              </a>
              <a href="#fluxo" className="hover:text-[#00D4FF] transition-colors">
                Fluxo
              </a>
              <a href="#ia" className="hover:text-[#00D4FF] transition-colors">
                IA
              </a>
              <a href="#performance" className="hover:text-[#00D4FF] transition-colors">
                Performance
              </a>
              <a href="#previsibilidade" className="hover:text-[#00D4FF] transition-colors">
                Previsibilidade
              </a>
            </div>
          </div>

          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-[#F8F9FF]/50">
            <p>© {yearNum} Birth Hub 360°. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
              <span>Isolamento Multi-Tenant</span>
              <span>·</span>
              <span>Conformidade LGPD/GDPR</span>
              <span>·</span>
              <span>Criptografia AES-256</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TELA 2: LOGIN — MODAL / TELA DE ACESSO CORPORATIVO (PALETA NEON)
      ════════════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed inset-0 w-full h-full flex flex-col items-center justify-start z-50 bg-[#0D0D0D] px-5 py-8 sm:px-10 lg:px-16 overflow-y-auto transition-all duration-500 ${
          activeScreen === 'login'
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Botão Voltar para a Landing */}
        <button
          id="btn-back"
          type="button"
          onClick={() => {
            SoundFX.play('click');
            setActiveScreen('intro');
          }}
          className="self-start mb-6 text-[#F8F9FF]/70 hover:text-[#00D4FF] transition-colors flex items-center gap-2 font-mono text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar ao Início</span>
        </button>

        {/* Status Superior */}
        <div className="w-full max-w-[480px] flex items-center justify-center mb-6">
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#14141A] border border-[#2A2A3C] shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4FF] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D4FF]" />
            </span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#F8F9FF]/80">
              Birth Hub · <span className="text-[#00D4FF]">v4.2 Enterprise</span>
            </span>
          </div>
        </div>

        {/* Card Central de Login */}
        <div className="w-full max-w-[480px] mb-12">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest mb-3.5 bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] shadow-lg shadow-[#00D4FF]/10">
              <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
              Acesso Seguro · Zero Trust Architecture
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#00D4FF] drop-shadow-[0_0_20px_rgba(0,212,255,0.4)] tracking-tight mb-2 leading-tight">
              {authMode === 'signup'
                ? 'Criar conta corporativa'
                : authMode === 'forgot'
                  ? 'Redefinir Senha'
                  : 'Acessar conta'}
            </h2>
            <p className="font-sans text-xs sm:text-sm text-[#F8F9FF]/70 font-medium max-w-[380px] mx-auto leading-relaxed">
              {authMode === 'signup'
                ? 'Preencha suas informações corporativas para solicitar acesso.'
                : authMode === 'forgot'
                  ? 'Informe seu e-mail corporativo para receber o link de recuperação.'
                  : 'Central de inteligência comercial, previsibilidade e governança integrada.'}
            </p>
          </div>

          <div className="bg-[#14141A] border border-[#2A2A3C] shadow-2xl shadow-black/80 rounded-2xl p-6 sm:p-8 relative">
            {/* Abas E-mail vs SSO */}
            {authMode === 'signin' && (
              <div
                className="grid grid-cols-2 gap-1.5 mb-6 p-1 bg-[#0D0D0D] border border-[#2A2A3C] rounded-xl"
                role="tablist"
              >
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`py-2.5 px-4 text-xs font-mono font-bold flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all ${
                    authMethod === 'email'
                      ? 'bg-[#00D4FF] text-[#0D0D0D] shadow-lg shadow-[#00D4FF]/30'
                      : 'text-[#F8F9FF]/70 hover:text-[#F8F9FF] hover:bg-[#1A1A24]'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>E-mail Corporativo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('sso')}
                  className={`py-2.5 px-4 text-xs font-mono font-bold flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all ${
                    authMethod === 'sso'
                      ? 'bg-[#00D4FF] text-[#0D0D0D] shadow-lg shadow-[#00D4FF]/30'
                      : 'text-[#F8F9FF]/70 hover:text-[#F8F9FF] hover:bg-[#1A1A24]'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>SSO Empresarial</span>
                </button>
              </div>
            )}

            {/* Alertas */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#FF2D9B]/30 bg-[#FF2D9B]/10 p-3.5 text-xs text-[#FF2D9B]">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#FF2D9B]" />
                <p className="font-medium font-sans">{errorMessage}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#00D4FF]/30 bg-[#00D4FF]/10 p-3.5 text-xs text-[#00D4FF]">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#00D4FF]" />
                <p className="font-medium font-sans">{successMessage}</p>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-name"
                    className="block font-mono text-xs font-bold text-[#F8F9FF]/80 uppercase tracking-wider"
                  >
                    Nome Completo
                  </label>
                  <input
                    id="login-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0D0D0D] text-[#F8F9FF] border border-[#2A2A3C] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-[#F8F9FF]/30"
                    placeholder="Ex: Carlos Mendes"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-email"
                    className="block font-mono text-xs font-bold text-[#F8F9FF]/80 uppercase tracking-wider"
                  >
                    {authMethod === 'sso' ? 'E-mail ou Domínio SSO' : 'E-mail Corporativo'}
                  </label>
                  <span className="font-mono text-[10px] text-[#00D4FF]/70">
                    Domínio empresarial
                  </span>
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#F8F9FF]/40 group-focus-within:text-[#00D4FF] transition-colors duration-200" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0D0D0D] text-[#F8F9FF] border border-[#2A2A3C] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl pl-12 pr-4 py-3 text-sm outline-none transition-all placeholder:text-[#F8F9FF]/30"
                    placeholder={
                      authMethod === 'sso' ? 'usuario@empresa.com.br' : 'diretor@suaempresa.com.br'
                    }
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {authMode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block font-mono text-xs font-bold text-[#F8F9FF]/80 uppercase tracking-wider"
                    >
                      Senha de Acesso
                    </label>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#F8F9FF]/40 group-focus-within:text-[#00D4FF] transition-colors duration-200" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0D0D0D] text-[#F8F9FF] border border-[#2A2A3C] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl pl-12 pr-12 py-3 text-sm outline-none transition-all placeholder:text-[#F8F9FF]/30"
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#F8F9FF]/40 hover:text-[#00D4FF] transition-colors focus:outline-none cursor-pointer"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'signin' && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-[#F8F9FF]/70 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#2A2A3C] text-[#00D4FF] focus:ring-[#00D4FF] accent-[#00D4FF] cursor-pointer"
                    />
                    <span>Manter conectado</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="font-sans text-xs font-semibold text-[#00D4FF] hover:underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[52px] rounded-xl font-mono text-base font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-[#00D4FF]/20 bg-gradient-to-r from-[#00D4FF] via-[#FF2D9B] to-[#FFC107] text-[#0D0D0D] hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#0D0D0D]" />
                ) : (
                  <>
                    <span>
                      {authMode === 'signup'
                        ? 'Solicitar Provisionamento'
                        : authMode === 'forgot'
                          ? 'Enviar Link de Redefinição'
                          : 'Entrar no Birth Hub'}
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 text-[#0D0D0D]" />
                  </>
                )}
              </button>
            </form>

            {/* Alternância de Modo */}
            <div className="mt-5 text-center">
              {authMode === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-sans text-xs text-[#F8F9FF]/70 hover:text-[#00D4FF] transition-colors cursor-pointer"
                >
                  Não possui credenciais corporativas?{' '}
                  <span className="font-bold text-[#00D4FF] hover:underline">Solicitar acesso</span>
                </button>
              )}

              {authMode === 'signup' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-sans text-xs text-[#F8F9FF]/70 hover:text-[#00D4FF] transition-colors cursor-pointer"
                >
                  Já possui credenciais corporativas?{' '}
                  <span className="font-bold text-[#00D4FF] hover:underline">Fazer login</span>
                </button>
              )}

              {authMode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-sans text-xs text-[#F8F9FF]/70 hover:text-[#00D4FF] transition-colors cursor-pointer"
                >
                  Voltar para{' '}
                  <span className="font-bold text-[#00D4FF] hover:underline">
                    Login Corporativo
                  </span>
                </button>
              )}
            </div>

            {/* SSO */}
            {authMode === 'signin' && (
              <div className="mt-6">
                <div className="relative flex items-center justify-center mb-4">
                  <div className="w-full border-t border-[#2A2A3C]" />
                  <span className="absolute bg-[#14141A] px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#F8F9FF]/50">
                    ou acesse com
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-mono font-bold bg-[#0D0D0D] border border-[#2A2A3C] text-[#F8F9FF] hover:border-[#00D4FF] hover:text-[#00D4FF] transition-colors cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
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
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialLogin('microsoft')}
                    className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-mono font-bold bg-[#0D0D0D] border border-[#2A2A3C] text-[#F8F9FF] hover:border-[#00D4FF] hover:text-[#00D4FF] transition-colors cursor-pointer"
                  >
                    <svg viewBox="0 0 21 21" className="w-4 h-4 shrink-0">
                      <path fill="#f25022" d="M0 0h10v10H0z" />
                      <path fill="#7fba00" d="M11 0h10v10H11z" />
                      <path fill="#00a4ef" d="M0 11h10v10H0z" />
                      <path fill="#ffb900" d="M11 11h10v10H11z" />
                    </svg>
                    <span>Microsoft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('sso');
                      SoundFX.play('click');
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-mono font-bold bg-[#0D0D0D] border border-[#2A2A3C] text-[#F8F9FF] hover:border-[#FF2D9B] hover:text-[#FF2D9B] transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-[#FF2D9B] shrink-0" />
                    <span>SAML SSO</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Badges de Confiança */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#14141A] border border-[#2A2A3C] flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-[#00D4FF] truncate">
                  AES-256
                </div>
                <div className="font-sans text-[9px] text-[#F8F9FF]/60 truncate">Criptografado</div>
              </div>
            </div>
            <div className="bg-[#14141A] border border-[#2A2A3C] flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#FF2D9B] shadow-[0_0_8px_#FF2D9B] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-[#FF2D9B] truncate">
                  SSO &amp; MFA
                </div>
                <div className="font-sans text-[9px] text-[#F8F9FF]/60 truncate">Autenticação</div>
              </div>
            </div>
            <div className="bg-[#14141A] border border-[#2A2A3C] flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#FFC107] shadow-[0_0_8px_#FFC107] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-[#FFC107] truncate">
                  LGPD/GDPR
                </div>
                <div className="font-sans text-[9px] text-[#F8F9FF]/60 truncate">Conformidade</div>
              </div>
            </div>
            <div className="bg-[#14141A] border border-[#2A2A3C] flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-[#00D4FF] truncate">
                  99.99%
                </div>
                <div className="font-sans text-[9px] text-[#F8F9FF]/60 truncate">Uptime SLA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
