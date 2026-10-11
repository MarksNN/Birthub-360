import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Globe,
  Layers,
  LineChart,
  Lock,
  Mail,
  MessageSquare,
  Network,
  PhoneCall,
  Radio,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.js';
import { useTheme } from '../../../contexts/ThemeContext.js';
import { authClient } from '../../../lib/auth-client.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import './NewLoginScreen.css';

// 8 PILARES OFICIAIS DO BIRTH HUB 360°
const OFFICIAL_PILLARS = [
  {
    id: '01',
    slug: 'HUB',
    name: 'HUB COMERCIAL',
    desc: 'Centralização de contas, pipeline comercial unificado e visão 360° de cada oportunidade em negociação.',
    color: '#0ea5e9',
    tag: 'Pipeline Central',
    icon: Building2,
  },
  {
    id: '02',
    slug: 'INTEL',
    name: 'INTELIGÊNCIA DE MERCADO',
    desc: 'Enriquecimento analítico de dados B2B, sinais de compra, qualificação precisa e inteligência de decisores.',
    color: '#3b82f6',
    tag: 'Decisão por Dados',
    icon: Search,
  },
  {
    id: '03',
    slug: 'ORCH',
    name: 'ORQUESTRAÇÃO DE VENDAS',
    desc: 'Cadências multicanal coordenadas, regras de transição de bastão e alinhamento operacional de ponta a ponta.',
    color: '#0284c7',
    tag: 'Fluxos Integrados',
    icon: Workflow,
  },
  {
    id: '04',
    slug: 'PERF',
    name: 'PERFORMANCE COMERCIAL',
    desc: 'Telemetria de conversão, velocidade de avanço no funil, metas operacionais e produtividade da equipe.',
    color: '#16a34a',
    tag: 'Metas & Velocidade',
    icon: BarChart3,
  },
  {
    id: '05',
    slug: 'FORE',
    name: 'PREVISIBILIDADE COMERCIAL',
    desc: 'Modelagem estatística de probabilidade, análise de pipeline ponderado e cenários embasados no histórico real.',
    color: '#d97706',
    tag: 'Pipeline Ponderado',
    icon: TrendingUp,
  },
  {
    id: '06',
    slug: 'AI',
    name: 'INTELIGÊNCIA ARTIFICIAL',
    desc: 'Copiloto comercial autônomo, transcrição de voz com diarização, análise de objeções e respostas contextuais.',
    color: '#8b5cf6',
    tag: 'Copiloto Autônomo',
    icon: BrainCircuit,
  },
  {
    id: '07',
    slug: 'GOV',
    name: 'GOVERNANÇA COMERCIAL',
    desc: 'Mesa de tratamento de duplicidades, rastreabilidade de dados, controle de acessos (RBAC) e conformidade LGPD.',
    color: '#dc2626',
    tag: 'Segurança & RLS',
    icon: ShieldCheck,
  },
  {
    id: '08',
    slug: 'ENRICH',
    name: 'ENRIQUECIMENTO DE DADOS',
    desc: 'Sincronização bidirecional idempotente com Bitrix24, validação cadastral e extração automatizada de contatos.',
    color: '#0d9488',
    tag: 'Sincronização Bitrix',
    icon: Database,
  },
];

function BH360LogoMark({ size = 44 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Birth Hub 360"
    >
      <defs>
        <linearGradient id={`mark-arc-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <radialGradient id={`mark-core-${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
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
      <circle cx="128" cy="128" r="64" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.9" />
      <line x1="64" y1="128" x2="192" y2="128" stroke="#7dd3fc" strokeWidth="2" opacity="0.6" />
      <path
        fill="#ffffff"
        transform="matrix(0.0740 0 0 -0.0740 104.45 154.20)"
        d="M450.4 707Q574.2 707 627.9 670.8Q681.6 634.6 681.6 573.4Q681.6 520.8 646.8 476.7Q612 432.6 547 404.5Q482 376.4 391 370.8Q511 369.4 573.8 326.1Q636.6 282.8 636.6 218.2Q636.6 165.8 612.2 125.1Q587.8 84.4 543.2 56.4Q498.6 28.4 436 14.2Q373.4 0 297 0Q267.8 0 227.6 1.5Q187.4 3 121 3Q94.8 3 63.8 2.5Q32.8 2 3.7 1.5Q-25.4 1 -45 0L-41 20Q-7 22 12 28Q31 34 42 52Q53 70 62 106L194 602Q201.8 632.8 202.4 651.3Q203 669.8 188.5 678.5Q174 687.2 135 688L140 708Q159.6 707 188.2 706.5Q216.8 706 247.7 705.5Q278.6 705 303 705Q353.2 705 385.7 706Q418.2 707 450.4 707ZM266 359 270 376H339.2Q393.8 376 430.6 407.9Q467.4 439.8 486.2 490.8Q505 541.8 505 596.8Q505 636.6 491.5 662.3Q478 688 438.6 688Q413 688 401 674.1Q389 660.2 378 617L243 106Q238.2 86.4 235.7 67.1Q233.2 47.8 242.2 35.4Q251.2 23 278.8 23Q331.6 23 368.9 53.4Q406.2 83.8 426.6 132.9Q447 182 447 237.2Q447 270.4 437.2 297.9Q427.4 325.4 404.3 342.2Q381.2 359 341.6 359Z"
      />
    </svg>
  );
}

export function NewLoginScreen({ initialScreen }: { initialScreen?: string } = {}) {
  const { currentUser } = useAuth();
  const { setThemeMode } = useTheme();
  const navigate = useNavigate();

  // Forçar Light Mode na landing Vancouver Plus
  useEffect(() => {
    setThemeMode('light');
    document.documentElement.classList.remove('dark');
  }, [setThemeMode]);

  // Se já autenticado, vai para o dashboard
  useEffect(() => {
    if (currentUser) {
      navigate('/app', { replace: true });
    }
  }, [currentUser, navigate]);

  // Estado do Modal de Autenticação
  const [showAuthModal, setShowAuthModal] = useState(initialScreen === 'login');
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estado das Tabs da Seção Plataforma
  const [platformTab, setPlatformTab] = useState<'crm' | 'intel' | 'voice'>('crm');

  // Estado do toggle de preços
  const [annualBilling, setAnnualBilling] = useState(true);

  // Submissão do Formulário de Autenticação
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
          setErrorMessage(result.error.message || 'Erro ao criar conta. Verifique os dados.');
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail.');
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

        setSuccessMessage('Link de redefinição enviado para seu e-mail corporativo.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro inesperado ao autenticar.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#f8fafc] text-[#0b132b] font-sans overflow-x-hidden">
      {/* ════════════════════════════════════════════════════════════════════
          1. NAVBAR (VANCOUVER PLUS)
      ════════════════════════════════════════════════════════════════════ */}
      <header className="vancouver-navbar px-6 py-4 sm:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-3 group text-decoration-none">
            <BH360LogoMark size={42} />
            <div className="flex flex-col">
              <span className="font-display text-xl font-bold text-[#0b132b] tracking-tight flex items-center gap-1">
                Birth Hub <span className="vancouver-gradient-text">360°</span>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#64748b] font-semibold">
                Strategic Command Center
              </span>
            </div>
          </a>

          {/* Links de navegação Vancouver com sublinhado suave */}
          <nav className="hidden lg:flex items-center gap-8">
            <div className="nav-link-holder relative cursor-pointer py-1">
              <a
                href="#recursos"
                className="text-sm font-semibold text-[#475569] hover:text-[#0b132b] transition-colors"
              >
                Recursos
              </a>
              <div className="link-block-underline" />
            </div>
            <div className="nav-link-holder relative cursor-pointer py-1">
              <a
                href="#pilares"
                className="text-sm font-semibold text-[#475569] hover:text-[#0b132b] transition-colors"
              >
                8 Pilares
              </a>
              <div className="link-block-underline" />
            </div>
            <div className="nav-link-holder relative cursor-pointer py-1">
              <a
                href="#plataforma"
                className="text-sm font-semibold text-[#475569] hover:text-[#0b132b] transition-colors"
              >
                Plataforma
              </a>
              <div className="link-block-underline" />
            </div>
            <div className="nav-link-holder relative cursor-pointer py-1">
              <a
                href="#precos"
                className="text-sm font-semibold text-[#475569] hover:text-[#0b132b] transition-colors"
              >
                Planos
              </a>
              <div className="link-block-underline" />
            </div>
            <div className="nav-link-holder relative cursor-pointer py-1">
              <a
                href="#ecossistema"
                className="text-sm font-semibold text-[#475569] hover:text-[#0b132b] transition-colors"
              >
                Ecossistema
              </a>
              <div className="link-block-underline" />
            </div>
            <div className="nav-link-holder relative cursor-pointer py-1">
              <a
                href="#contato"
                className="text-sm font-semibold text-[#475569] hover:text-[#0b132b] transition-colors"
              >
                Suporte
              </a>
              <div className="link-block-underline" />
            </div>
          </nav>

          {/* Botões de Ação na Direita */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                SoundFX.play('click');
                setAuthMode('signin');
                setShowAuthModal(true);
              }}
              className="vancouver-btn-outline text-xs px-4 py-2"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                SoundFX.play('click');
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="vancouver-btn-gradient text-xs px-5 py-2.5"
            >
              Solicitar Demo
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          2. HERO SECTION (VANCOUVER PLUS)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-16 pb-24 px-6 sm:px-12 overflow-hidden">
        {/* Glow de fundo */}
        <div className="vancouver-hero-bg" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          {/* Badge superior estilo pílula */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-[#0ea5e9] text-xs font-bold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ARQUITETURA COMERCIAL & IA PREVENTIVA</span>
          </div>

          {/* Título Principal Vancouver Plus com Texto em Gradiente */}
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-[#0b132b] leading-[1.12]">
            <span className="vancouver-gradient-text">Personalizado</span> para Gerenciar Toda sua
            Operação Comercial
          </h1>

          {/* Subtítulo */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg text-[#475569] leading-relaxed font-sans">
            Opere com previsibilidade, segurança e inteligência artificial em um dashboard intuitivo
            e integrado de ponta a ponta. Projetado para transformar dados brutos em decisões que
            fecham negócios.
          </p>

          {/* Botões de Chamada */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <button
              type="button"
              onClick={() => {
                SoundFX.play('confirm');
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="vancouver-btn-gradient text-base"
            >
              Solicitar Demonstração
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <a href="#plataforma" className="vancouver-btn-outline text-base">
              Conhecer a Plataforma
            </a>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            HERO APP SHOWCASE (VANCOUVER PLUS MOCKUP & FLOATING CARDS)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="max-w-6xl mx-auto mt-16 relative">
          {/* Widget Flutuante 1 (Direita Superior) */}
          <div className="vancouver-floating-card-1 hidden md:block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                  Pipeline Previsto
                </p>
                <p className="text-base font-bold text-[#0b132b]">
                  R$ 4.280.000 <span className="text-xs text-emerald-600 font-bold">+28.4%</span>
                </p>
              </div>
            </div>
          </div>

          {/* Widget Flutuante 2 (Esquerda Inferior) */}
          <div className="vancouver-floating-card-2 hidden md:block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                  Inteligência Artificial
                </p>
                <p className="text-sm font-bold text-[#0b132b]">
                  Taxa de Conversão: <span className="text-[#8b5cf6]">42.8%</span>
                </p>
              </div>
            </div>
          </div>

          {/* Moldura da Aplicação (Janela do Browser) */}
          <div className="vancouver-app-container">
            {/* Barra de título do browser */}
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="bg-white px-6 py-1 rounded-full border border-slate-200 text-xs font-mono text-slate-500 flex items-center gap-2">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>birthhub360.com/app/dashboard</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>

            {/* Conteúdo Visual Interno da Aplicação */}
            <div className="p-6 md:p-8 bg-[#ffffff] space-y-6">
              {/* KPIs de Destaque */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold uppercase">
                    Oportunidades Ativas
                  </p>
                  <p className="text-2xl font-bold text-[#0b132b] mt-1">1.240</p>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    ↑ 14% vs mês anterior
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold uppercase">
                    Pipeline Ponderado
                  </p>
                  <p className="text-2xl font-bold text-[#0ea5e9] mt-1">R$ 8.940.000</p>
                  <span className="text-[10px] text-sky-600 font-bold">Probabilidade 82%</span>
                </div>
                <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Sinais de Compra</p>
                  <p className="text-2xl font-bold text-[#8b5cf6] mt-1">348</p>
                  <span className="text-[10px] text-purple-600 font-bold">
                    14 prioritários hoje
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Eficiência SDR</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">94.2%</p>
                  <span className="text-[10px] text-emerald-600 font-bold">Sem vazamentos</span>
                </div>
              </div>

              {/* Grid Central: Kanban Preview + IA Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 bg-[#f8fafc] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-[#0b132b]">
                      Fluxo de Negociação Unificado (CRM)
                    </h3>
                    <span className="text-xs text-[#0ea5e9] font-bold">Tempo Real</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Qualificação (42)
                      </div>
                      <div className="p-2 rounded-lg bg-sky-50 border border-sky-100 text-xs font-bold text-sky-900">
                        Vibra Energia S/A
                        <span className="block text-[10px] text-slate-500 font-normal">
                          R$ 350.000 · Decisor Validado
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                        Ambev Logística
                        <span className="block text-[10px] text-slate-500 font-normal">
                          R$ 180.000 · Em contato
                        </span>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Proposta (18)
                      </div>
                      <div className="p-2 rounded-lg bg-purple-50 border border-purple-100 text-xs font-bold text-purple-900">
                        Suzano Papel & Celulose
                        <span className="block text-[10px] text-slate-500 font-normal">
                          R$ 820.000 · Apresentada
                        </span>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Fechamento (12)
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-900">
                        Gerdau Aços
                        <span className="block text-[10px] text-slate-500 font-normal">
                          R$ 1.200.000 · Minuta Pronta
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-3">
                  <div className="flex items-center gap-2 text-purple-700">
                    <BrainCircuit className="w-4 h-4" />
                    <h3 className="font-display text-sm font-bold">Motor IA & Diagnóstico</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sinal preditivo detectou aumento de 3.2x no engajamento de decisores em 12
                    contas estratégicas no Bitrix24.
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-purple-100 text-xs space-y-1">
                    <span className="font-bold text-[#0b132b] block">Ação Recomendada:</span>
                    <span className="text-slate-600 block">
                      Disparar cadência multicanal via WhatsApp e agendar demonstração técnica.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logo Grid das Tecnologias Integradas */}
          <div className="mt-16 text-center space-y-4">
            <p className="text-xs font-mono uppercase tracking-widest text-[#64748b]">
              Conectado e integrado nativamente com os principais ecossistemas corporativos
            </p>
            <div className="vancouver-logo-grid">
              <div className="vancouver-logo-pill">Bitrix24 CRM</div>
              <div className="vancouver-logo-pill">PostgreSQL 16</div>
              <div className="vancouver-logo-pill">WhatsApp API</div>
              <div className="vancouver-logo-pill">Google Workspace</div>
              <div className="vancouver-logo-pill">Redis 7</div>
              <div className="vancouver-logo-pill">Qdrant Vector</div>
              <div className="vancouver-logo-pill">OpenAI / Claude</div>
              <div className="vancouver-logo-pill">MinIO Storage</div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          3. SEÇÃO: GESTÃO DE PONTA A PONTA (ESTILO VANCOUVER PLUS)
      ════════════════════════════════════════════════════════════════════ */}
      <section
        id="recursos"
        className="py-24 px-6 sm:px-12 bg-white border-t border-b border-slate-200"
      >
        <div className="max-w-6xl mx-auto space-y-20">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0b132b]">
              Ajudamos você a gerenciar de ponta a ponta, todas as camadas da sua receita.
            </h2>
            <p className="text-base text-[#475569]">
              Da inteligência de mercado à orquestração de cadências e previsão probabilística de
              fechamento.
            </p>
          </div>

          {/* Bloco 1: Gestão Holística */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="font-display text-2xl font-bold text-[#0b132b]">
                Gestão Estratégica para Visão Holística da Receita
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Centralize o pipeline e acompanhe em tempo real onde estão as melhores
                oportunidades, eliminando planilhas fragmentadas e dados desatualizados.
              </p>
              <ul className="space-y-3 font-sans text-sm text-[#0b132b]">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-sky-100 text-[#0ea5e9] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Tudo em uma única plataforma integrada e sem silos.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-sky-100 text-[#0ea5e9] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Totalmente seguro com criptografia e conformidade LGPD.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-sky-100 text-[#0ea5e9] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Experiência do usuário ágil, moderna e responsiva.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-sky-100 text-[#0ea5e9] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Compatível com desktop e aplicativo móvel PWA.</span>
                </li>
              </ul>
            </div>

            <div className="vancouver-card p-6 bg-[#f8fafc] border border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="font-mono text-xs font-bold text-slate-500 uppercase">
                    TELEMETRIA DE RECEITA
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    ATIVO
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Meta Mensal Atingida</span>
                    <span>78.4%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#8b5cf6]"
                      style={{ width: '78.4%' }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Velocidade Média</span>
                    <span className="text-lg font-bold text-[#0b132b]">14 dias</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Ticket Médio</span>
                    <span className="text-lg font-bold text-[#0b132b]">R$ 48.500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco 2: Microgestão Precisa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-8">
            <div className="order-2 lg:order-1 vancouver-card p-6 bg-[#f8fafc] border border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-[#8b5cf6]" />
                  <span className="font-display text-sm font-bold text-[#0b132b]">
                    Triagem & Qualificação Preditiva
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="font-bold text-slate-800">
                    Decisor: Marcelo Nascimento (Diretor Comercial)
                  </p>
                  <p className="text-slate-500">
                    Telefone verificado, e-mail corporativo ativo, perfil decisor estratégico.
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="font-bold text-slate-800">Sincronização Bitrix24</p>
                  <p className="text-slate-500">
                    Idempotência garantida: 0 duplicidades geradas nos últimos 90 dias.
                  </p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <h3 className="font-display text-2xl font-bold text-[#0b132b]">
                Microgestão de Cada Dado Sem Gargalos Operacionais
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Elimine o trabalho manual e o atrito na passagem de bastão entre pré-vendas (SDR),
                vendas e pós-vendas com automações precisas e inteligência contextual.
              </p>
              <ul className="space-y-3 font-sans text-sm text-[#0b132b]">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-[#8b5cf6] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Enriquecimento de contatos e validação de decisores reais.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-[#8b5cf6] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Transição de bastão automatizada sem perda de contexto.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-[#8b5cf6] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Sincronização bidirecional em tempo real com Bitrix24.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          4. SEÇÃO: 8 PILARES OFICIAIS (VANCOUVER FEATURE CARDS)
      ════════════════════════════════════════════════════════════════════ */}
      <section id="pilares" className="py-24 px-6 sm:px-12 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[#0ea5e9] text-xs font-bold font-mono">
              METODOLOGIA OFICIAL
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0b132b]">
              Os 8 Pilares Oficiais do Birth Hub 360°
            </h2>
            <p className="text-base text-[#475569]">
              Uma arquitetura modular robusta desenvolvida para governança, velocidade e
              previsibilidade na receita B2B.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {OFFICIAL_PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="vancouver-card p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border"
                        style={{
                          backgroundColor: `${p.color}15`,
                          borderColor: `${p.color}30`,
                          color: p.color,
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        PILAR {p.id}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-base font-bold text-[#0b132b]">{p.name}</h3>
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1"
                        style={{ backgroundColor: `${p.color}15`, color: p.color }}
                      >
                        {p.tag}
                      </span>
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed">{p.desc}</p>
                  </div>

                  <div
                    className="pt-2 border-t border-slate-100 flex items-center text-xs font-bold"
                    style={{ color: p.color }}
                  >
                    <span>Explorar Pilar</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          5. SEÇÃO: PLATAFORMA & STICKY SHOWCASE (VANCOUVER PLUS)
      ════════════════════════════════════════════════════════════════════ */}
      <section
        id="plataforma"
        className="py-24 px-6 sm:px-12 bg-white border-t border-b border-slate-200"
      >
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0b132b]">
              Tudo em uma única plataforma: do mobile ao desktop tudo o que você precisa está aqui
            </h2>
            <p className="text-base text-[#475569]">
              Alternância perfeita entre interfaces ricas para gestores e execução ágil na ponta
              para vendedores.
            </p>

            {/* Tab Switcher Vancouver Plus */}
            <div className="vancouver-tab-nav mt-6">
              <button
                type="button"
                onClick={() => setPlatformTab('crm')}
                className={`vancouver-tab-btn ${platformTab === 'crm' ? 'vancouver-tab-btn-active' : ''}`}
              >
                1. CRM & Central de Comando
              </button>
              <button
                type="button"
                onClick={() => setPlatformTab('intel')}
                className={`vancouver-tab-btn ${platformTab === 'intel' ? 'vancouver-tab-btn-active' : ''}`}
              >
                2. Inteligência de Mercado
              </button>
              <button
                type="button"
                onClick={() => setPlatformTab('voice')}
                className={`vancouver-tab-btn ${platformTab === 'voice' ? 'vancouver-tab-btn-active' : ''}`}
              >
                3. Voz & Copiloto IA
              </button>
            </div>
          </div>

          {/* Conteúdo Dinâmico da Tab */}
          <div className="vancouver-card p-8 bg-[#f8fafc] border border-slate-200">
            {platformTab === 'crm' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <h3 className="font-display text-2xl font-bold text-[#0b132b]">
                    Painel Central com Visão 360° do Negócio
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Acompanhe cada conta, contato e estágio de negociação com telemetria unificada.
                    O Kanban interativo reage em tempo real com regras de validação que impedem
                    perdas no funil.
                  </p>
                  <div className="space-y-2 text-xs font-mono text-slate-600">
                    <p className="flex items-center gap-2">
                      ✔ Visão tabular e em colunas por estágio de venda
                    </p>
                    <p className="flex items-center gap-2">
                      ✔ Histórico de alterações e auditoria de cada negócio
                    </p>
                    <p className="flex items-center gap-2">
                      ✔ Integração com WhatsApp e telefonia em 1 clique
                    </p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">
                    MÉTRICAS DO CRM 360°
                  </span>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Contas Ativas</span>
                    <span className="text-sm font-bold text-[#0ea5e9]">1.420 empresas</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Negócios em Aberto</span>
                    <span className="text-sm font-bold text-[#8b5cf6]">R$ 14.850.000,00</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Tempo Médio de Fechamento
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      18 dias (34% mais rápido)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {platformTab === 'intel' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <h3 className="font-display text-2xl font-bold text-[#0b132b]">
                    Enriquecimento de Decisores & Sinais B2B
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Identifique decisores reais (C-Level, Diretores e Gerentes), e-mails
                    corporativos válidos e telefones diretos antes de iniciar o contato comercial.
                  </p>
                  <div className="space-y-2 text-xs font-mono text-slate-600">
                    <p className="flex items-center gap-2">
                      ✔ Pesquisa de mercado analítica por CNAE e região
                    </p>
                    <p className="flex items-center gap-2">
                      ✔ Pontuação preditiva de propensão de compra
                    </p>
                    <p className="flex items-center gap-2">
                      ✔ Qualificação automática contra o seu Perfil Ideal (ICP)
                    </p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">
                    SINAIS RECENTES
                  </span>
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs">
                    <span className="font-bold text-sky-900 block">
                      Sinal de Expansão · Petrobras Logística
                    </span>
                    <span className="text-slate-600 block">
                      Novas vagas abertas para compras corporativas detectadas.
                    </span>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs">
                    <span className="font-bold text-purple-900 block">
                      Sinal Tecnológico · Vale S.A.
                    </span>
                    <span className="text-slate-600 block">
                      Migração de infraestrutura para nuvem concluída.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {platformTab === 'voice' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <h3 className="font-display text-2xl font-bold text-[#0b132b]">
                    Copiloto de Voz & Transcrição Inteligente
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Grave e transcreva chamadas comerciais com separação de interlocutores, extração
                    imediata de pontos de dor, objeções e preenchimento automático no Bitrix24.
                  </p>
                  <div className="space-y-2 text-xs font-mono text-slate-600">
                    <p className="flex items-center gap-2">
                      ✔ Resumo executivo da reunião gerado em segundos
                    </p>
                    <p className="flex items-center gap-2">
                      ✔ Identificação automática de próximas ações acordadas
                    </p>
                    <p className="flex items-center gap-2">
                      ✔ Análise de sentimento e índice de engajamento
                    </p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">
                    DIAGNÓSTICO DA ÚLTIMA CHAMADA
                  </span>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs space-y-1">
                    <span className="font-bold text-emerald-900 block">
                      Duração: 24m 12s · Sentimento: Muito Positivo
                    </span>
                    <span className="text-slate-600 block">
                      Cliente solicitou minuta contratual para 50 licenças da plataforma.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          6. SEÇÃO: PREÇOS & PLANOS (VANCOUVER EXPERIENCE CARD)
      ════════════════════════════════════════════════════════════════════ */}
      <section id="precos" className="py-24 px-6 sm:px-12 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0b132b]">
              Nossos planos são transparentes e fáceis de entender
            </h2>
            <p className="text-base text-[#475569]">
              Comece agora sem taxa de implantação oculta. Evolua conforme a sua operação expande.
            </p>

            {/* Toggle Mensal / Anual */}
            <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setAnnualBilling(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  !annualBilling ? 'bg-white text-[#0b132b] shadow-xs' : 'text-slate-600'
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setAnnualBilling(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  annualBilling ? 'bg-white text-[#0ea5e9] shadow-xs' : 'text-slate-600'
                }`}
              >
                Anual (2 Meses Grátis)
              </button>
            </div>
          </div>

          {/* Pricing Highlight Box Estilo Vancouver Plus */}
          <div className="max-w-3xl mx-auto vancouver-pricing-card">
            <span className="vancouver-pricing-badge">MAIS POPULAR</span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="font-display text-xl font-bold text-[#0b132b] block">
                  Plano Enterprise Hub
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-500">R$</span>
                  <span className="text-5xl font-extrabold text-[#0b132b] tracking-tight">
                    {annualBilling ? '249' : '299'}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">/ usuário / mês</span>
                </div>
                <p className="text-xs text-slate-500">
                  {annualBilling
                    ? 'Faturado anualmente com 2 meses gratuitos.'
                    : 'Faturamento mensal sem fidelidade.'}
                </p>

                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      SoundFX.play('confirm');
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                    className="vancouver-btn-gradient w-full"
                  >
                    Iniciar Teste Gratuito de 7 Dias
                  </button>
                  <a
                    href="#contato"
                    className="vancouver-btn-outline w-full text-center block text-xs"
                  >
                    Falar com Especialista
                  </a>
                </div>
              </div>

              <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  O QUE ESTÁ INCLUSO:
                </span>
                <ul className="space-y-2.5 text-xs text-[#0b132b]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Acesso completo aos 8 Pilares Oficiais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Sincronização bidirecional com Bitrix24</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Motor de IA e transcrição de reuniões</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Enriquecimento de decisores e contatos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Suporte prioritário e onboarding guiado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Conformidade total com LGPD & RLS</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          7. SEÇÃO: ECOSSISTEMA & CONEXÕES (VANCOUVER PLUS)
      ════════════════════════════════════════════════════════════════════ */}
      <section
        id="ecossistema"
        className="py-24 px-6 sm:px-12 bg-white border-t border-b border-slate-200"
      >
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0b132b]">
              Conecte-se ao que sua operação realmente precisa
            </h2>
            <p className="text-base text-[#475569]">
              Conectores robustos para o seu stack de vendas, mensageria e dados corporativos.
            </p>
          </div>

          {/* Grid de Avatares Circulares Vancouver Plus */}
          <div className="flex flex-wrap items-center justify-center gap-6 py-6">
            <div className="vancouver-ecosystem-circle" title="Bitrix24 CRM">
              <span className="font-bold text-xs text-[#0ea5e9]">B24</span>
            </div>
            <div className="vancouver-ecosystem-circle" title="WhatsApp API">
              <span className="font-bold text-xs text-emerald-600">WPP</span>
            </div>
            <div className="vancouver-ecosystem-circle" title="PostgreSQL 16">
              <span className="font-bold text-xs text-blue-700">PG</span>
            </div>
            <div className="vancouver-ecosystem-circle" title="Google Workspace">
              <span className="font-bold text-xs text-amber-600">G-W</span>
            </div>
            <div className="vancouver-ecosystem-circle" title="Redis Cache">
              <span className="font-bold text-xs text-rose-600">RDS</span>
            </div>
            <div className="vancouver-ecosystem-circle" title="Qdrant IA">
              <span className="font-bold text-xs text-purple-600">QDR</span>
            </div>
            <div className="vancouver-ecosystem-circle" title="OpenAI API">
              <span className="font-bold text-xs text-slate-900">AI</span>
            </div>
            <div className="vancouver-ecosystem-circle" title="MinIO Storage">
              <span className="font-bold text-xs text-red-600">MIO</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          8. SEÇÃO: ACESSO RÁPIDO & SUPORTE (VANCOUVER PLUS)
      ════════════════════════════════════════════════════════════════════ */}
      <section id="contato" className="py-24 px-6 sm:px-12 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Ajuda */}
            <div
              onClick={() => {
                SoundFX.play('click');
                window.location.href = 'mailto:suporte@birthhub360.com';
              }}
              className="vancouver-quick-card"
            >
              <div>
                <h3 className="font-display text-xl font-bold text-[#00D4FF]">Ajuda</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Documentação técnica, manuais de uso e suporte aos pilares.
                </p>
              </div>
              <div className="flex justify-end pt-4">
                <div className="vancouver-arrow-icon">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 2: Contato */}
            <div
              onClick={() => {
                SoundFX.play('click');
                window.location.href = 'mailto:comercial@birthhub360.com';
              }}
              className="vancouver-quick-card"
            >
              <div>
                <h3 className="font-display text-xl font-bold text-[#00D4FF]">Contato</h3>
                <p className="text-xs text-slate-500 mt-2">comercial@birthhub360.com</p>
                <p className="text-xs text-slate-500 mt-1">
                  Fale diretamente com nossa diretoria comercial.
                </p>
              </div>
              <div className="flex justify-end pt-4">
                <div className="vancouver-arrow-icon">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 3: Newsletter / Novidades */}
            <div className="vancouver-quick-card">
              <div>
                <h3 className="font-display text-xl font-bold text-[#00D4FF]">Novidades</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Receba insights semanais sobre IA aplicada a vendas B2B.
                </p>
              </div>
              <div className="pt-4">
                <input
                  type="email"
                  placeholder="Seu e-mail corporativo"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
            </div>

            {/* Card 4: Segurança */}
            <div
              onClick={() => {
                SoundFX.play('click');
                navigate('/privacy');
              }}
              className="vancouver-quick-card"
            >
              <div>
                <h3 className="font-display text-xl font-bold text-[#00D4FF]">Segurança</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Auditorias de segurança, RLS multi-tenant e conformidade LGPD.
                </p>
              </div>
              <div className="flex justify-end pt-4">
                <div className="vancouver-arrow-icon">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          9. FOOTER (VANCOUVER PLUS)
      ════════════════════════════════════════════════════════════════════ */}
      <footer className="bg-white border-t border-slate-200 py-16 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pb-12 border-b border-slate-100">
            <div className="space-y-3">
              <h3 className="font-display text-2xl font-bold text-[#00D4FF]">
                Pronto para estruturar sua operação comercial com rigor e inteligência?
              </h3>
              <p className="text-sm text-slate-500">
                Conheça a única plataforma desenhada especificamente para conectar dados a
                fechamentos reais.
              </p>
            </div>
            <div className="flex justify-start md:justify-end">
              <button
                type="button"
                onClick={() => {
                  SoundFX.play('confirm');
                  setAuthMode('signup');
                  setShowAuthModal(true);
                }}
                className="vancouver-btn-gradient"
              >
                Solicitar Demonstração
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <BH360LogoMark size={32} />
              <span className="font-display text-sm font-bold text-[#0b132b]">
                Birth Hub <span className="vancouver-gradient-text">360°</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Crafted for modern revenue teams. © 2026 Birth Hub 360°. Todos os direitos reservados.
            </p>

            <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
              <a href="/privacy" className="hover:text-[#0ea5e9]">
                Privacidade
              </a>
              <a href="/terms" className="hover:text-[#0ea5e9]">
                Termos de Uso
              </a>
              <a href="#contato" className="hover:text-[#0ea5e9]">
                Contato
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════════════════════════
          10. MODAL DE LOGIN / CADASTRO (VANCOUVER PLUS INTEGRADO)
      ════════════════════════════════════════════════════════════════════ */}
      {showAuthModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="vancouver-card w-full max-w-md p-8 bg-white shadow-2xl relative">
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              aria-label="Fechar janela de autenticação"
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="text-center space-y-2 mb-6">
              <div className="flex justify-center mb-1">
                <BH360LogoMark size={40} />
              </div>
              <h2 id="auth-modal-title" className="font-display text-2xl font-bold text-[#0b132b]">
                {authMode === 'signin' && 'Acessar o Hub'}
                {authMode === 'signup' && 'Criar Nova Conta'}
                {authMode === 'forgot' && 'Recuperar Senha'}
              </h2>
              <p className="text-xs text-slate-500">
                {authMode === 'signin' && 'Informe suas credenciais corporativas para entrar.'}
                {authMode === 'signup' && 'Solicite provisionamento para sua equipe comercial.'}
                {authMode === 'forgot' && 'Enviaremos um link de recuperação para seu e-mail.'}
              </p>
            </div>

            {/* Mensagens de Sucesso ou Erro */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div
                role="status"
                className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-modal-name"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Nome Completo
                  </label>
                  <input
                    id="auth-modal-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-all"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-modal-email"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="auth-modal-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com.br"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-all"
                  />
                </div>
              </div>

              {authMode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="auth-modal-password"
                      className="block text-xs font-bold text-slate-700"
                    >
                      Senha
                    </label>
                    {authMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setAuthMode('forgot')}
                        className="text-[11px] text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                      >
                        Esqueceu?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="auth-modal-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-all"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'signin' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-brand focus:ring-ring focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <label htmlFor="remember" className="text-xs text-slate-600">
                    Lembrar deste dispositivo
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="vancouver-btn-gradient w-full py-3 mt-2 text-sm justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Processando...</span>
                ) : (
                  <span>
                    {authMode === 'signin' && 'Entrar na Plataforma'}
                    {authMode === 'signup' && 'Solicitar Acesso'}
                    {authMode === 'forgot' && 'Enviar Link de Redefinição'}
                  </span>
                )}
              </button>
            </form>

            {/* Alternador de Modos */}
            <div className="text-center mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
              {authMode === 'signin' ? (
                <p>
                  Ainda não tem acesso?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setSuccessMessage('');
                      setAuthMode('signup');
                    }}
                    className="text-brand font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                  >
                    Criar conta
                  </button>
                </p>
              ) : (
                <p>
                  Já possui credenciais?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setSuccessMessage('');
                      setAuthMode('signin');
                    }}
                    className="text-brand font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                  >
                    Voltar ao login
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default NewLoginScreen;
