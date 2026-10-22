import { useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Menu,
  Moon,
  Sun,
  Target,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.js';
import { useTheme } from '../../../contexts/ThemeContext.js';
import { authClient } from '../../../lib/auth-client.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { BirthHubLogo } from '../../../components/brand/BirthHubLogo.js';
import {
  AiDiagnosticLayerIcon,
  ExecutionLayerIcon,
  LostDealsCardIcon,
  MultiCrmDataLayerIcon,
  ReactiveCardIcon,
  SilosCardIcon,
} from '../../../components/brand/LandingTitleIcons.js';
import './Landing360.css';

// 8 PILARES OFICIAIS COMPLETOS DO BIRTH HUB 360° (PALETA NEON OFICIAL - DOURADO RADIANTE)
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
    color: '#F59E0B', // Dourado Radiante
    tag: 'Metas & Velocidade',
    focus: 'Métricas & Conversão em Tempo Real',
  },
  {
    id: '05',
    slug: 'FORE',
    name: 'PREVISIBILIDADE COMERCIAL',
    desc: 'Modelagem estatística de probabilidade, análise de pipeline ponderado e cenários embasados no histórico real.',
    symbol: '⌁',
    color: '#F59E0B', // Dourado Radiante
    tag: 'Pipeline Ponderado',
    focus: 'Cenários & Probabilidade Real',
  },
  {
    id: '06',
    slug: 'AI',
    name: 'INTELIGÊNCIA ARTIFICIAL',
    desc: 'Copiloto comercial ancorado nos dados da empresa, diagnóstico de entraves e suporte ativo em negociações.',
    symbol: '✦',
    color: '#8B7DFF', // Íris / Roxo Neon
    tag: 'Copiloto & Modelos',
    focus: 'Agentes & Diagnóstico Contextual',
  },
  {
    id: '07',
    slug: 'AUTO',
    name: 'AUTOMAÇÃO & CONECTIVIDADE MULTI-CRM',
    desc: 'Sincronização bidirecional em tempo real, gatilhos automáticos e integração profunda com Bitrix24, HubSpot, Salesforce, Pipedrive e APIs abertas.',
    symbol: '◇',
    color: '#00D4FF', // Azul Neon
    tag: 'Multi-CRM & Webhooks',
    focus: 'Integrações Multi-CRM & Ações Instantâneas',
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

// TAGS DE CAPACIDADES DA PLATAFORMA (PALETA NEON OFICIAL COM CONECTIVIDADE MULTI-CRM)
const FEATURE_TAGS = [
  {
    kicker: 'GESTÃO UNIFICADA',
    label: 'Pipeline Centralizado',
    color: '#00D4FF',
    desc: 'Reúna oportunidades, etapas e histórico comercial em uma visão organizada.',
  },
  {
    kicker: 'ENRIQUECIMENTO ICP',
    label: 'Inteligência B2B',
    color: '#FF2D9B',
    desc: 'Contextualize empresas e contatos com dados para apoiar a qualificação.',
  },
  {
    kicker: 'FLUXO OPERACIONAL',
    label: 'Cadências Automatizadas',
    color: '#00D4FF',
    desc: 'Organize sequências de contato e próximos passos ao longo da negociação.',
  },
  {
    kicker: 'TELEMETRIA DE FUNIL',
    label: 'Velocidade de Ciclo',
    color: '#F59E0B',
    desc: 'Acompanhe o tempo entre etapas e identifique pontos de estagnação.',
  },
  {
    kicker: 'FORECAST ESTATÍSTICO',
    label: 'Cenários Ponderados',
    color: '#F59E0B',
    desc: 'Compare projeções considerando etapas, probabilidades e histórico do pipeline.',
  },
  {
    kicker: 'COPILOTO DE DEALS',
    label: 'Copiloto Comercial IA',
    color: '#FF2D9B',
    desc: 'Apoie diagnósticos e próximas ações com o contexto das negociações.',
  },
  {
    kicker: 'ECOSSISTEMA ABERTO',
    label: 'Conectividade Multi-CRM',
    color: '#00D4FF',
    desc: 'Conecte registros e fluxos comerciais com Bitrix24, Salesforce, HubSpot e Pipedrive.',
  },
  {
    kicker: 'TELEFONIA INTEGRADA',
    label: 'Telefonia & Voz Ativa',
    color: '#FF2D9B',
    desc: 'Integre interações de voz ao acompanhamento das oportunidades comerciais.',
  },
];

function BH360LogoMark({ size = 52 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="inline-block relative">
      <BirthHubLogo
        variant="icon"
        title="Birth Hub 360º"
        className="w-full h-full"
        animated={true}
      />
    </span>
  );
}

function getSemanticCardClass(color: string): string {
  if (color === '#FF2D9B') return 'card-semantic-pink';
  if (color === '#F59E0B') return 'card-semantic-gold';
  if (color === '#8B7DFF') return 'card-semantic-iris';
  return 'card-semantic-cyan';
}

export function Landing360({
  initialScreen = 'intro',
}: {
  initialScreen?: 'intro' | 'login';
} = {}) {
  const [activeScreen, setActiveScreen] = useState<'intro' | 'login'>(initialScreen);
  const { currentUser, isPending: isAuthPending } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  // Estado do botão flutuante de voltar ao topo
  const [showScrollTop, setShowScrollTop] = useState(false);

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = 'Birth Hub 360° · Sistema Operacional Comercial Multi-CRM';
  }, []);

  // Monitorar scroll para exibição do botão Voltar ao Topo
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirecionamento se já autenticado
  useEffect(() => {
    if (currentUser) {
      navigate('/app', { replace: true });
    }
  }, [currentUser, navigate]);

  const handlePillarClick = (id: string) => {
    SoundFX.play('click');
    setSelectedPillar(id === selectedPillar ? null : id);
  };

  const handleGoToLogin = () => {
    SoundFX.play('confirm');
    setActiveScreen('login');
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

  if (isAuthPending) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors ${
          theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F8FAFC]'
        }`}
      >
        <Loader2 className="animate-spin text-[#00D4FF] w-10 h-10" />
      </div>
    );
  }

  return (
    <main
      className={`relative w-full min-h-screen overflow-x-clip font-sans selection:bg-[#FF2D9B]/30 selection:text-[#00D4FF] landing-neon-root transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0B1120] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      }`}
    >
      {/* ════════════════════════════════════════════════════════════════════
          TELA 1: LANDING COMPLETA
      ════════════════════════════════════════════════════════════════════ */}
      <div className={activeScreen === 'intro' ? 'block' : 'hidden'}>
        {/* 1. NAVBAR FIXA — PRESENÇA INSTITUCIONAL & ENTERPRISE (+12% PRESENÇA) */}
        <header className="navbar-sticky w-full px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4 lg:gap-6">
            <a href="#hero" className="flex items-center gap-3.5 group shrink-0">
              <BH360LogoMark size={52} />
              <div className="flex flex-col">
                <span className="font-display text-[22px] sm:text-2xl font-bold leading-tight tracking-tight">
                  <span className="landing-title-cyan font-bold">Birth Hub</span>
                  <span className="landing-title-pink ml-1 font-extrabold">360°</span>
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#00D4FF] font-semibold">
                  Revenue Command Center
                </span>
              </div>
            </a>

            {/* Links de navegação desktop — Cada item como um botão pill, sem sobreposição */}
            <nav className="hidden xl:flex items-center justify-center gap-1 xl:gap-1.5 2xl:gap-2.5 flex-1 mx-1.5 2xl:mx-3">
              <a href="#problema" className="nav-pill-btn">
                Problema
              </a>
              <a href="#plataforma" className="nav-pill-btn">
                Plataforma
              </a>
              <a href="#pilares" className="nav-pill-btn">
                8 Pilares
              </a>
              <a href="#fluxo" className="nav-pill-btn">
                Fluxo
              </a>
              <a href="#ia" className="nav-pill-btn">
                IA
              </a>
              <a href="#automacao" className="nav-pill-btn">
                Automação
              </a>
              <a href="#performance" className="nav-pill-btn">
                Performance
              </a>
              <a href="#previsibilidade" className="nav-pill-btn">
                Previsibilidade
              </a>
              <a href="#ecossistema" className="nav-pill-btn">
                Ecossistema
              </a>
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              {/* Botão de Alternância de Tema (Light / Dark) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="landing-theme-toggle-btn"
                aria-label={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-[18px] h-[18px] text-amber-400" />
                ) : (
                  <Moon className="w-[18px] h-[18px] text-sky-600" />
                )}
              </button>

              {/* Botão de Login no Topo com animação de piscar/pulsar */}
              <button
                type="button"
                onClick={handleGoToLogin}
                className="btn-cta-light btn-cta-pulse hidden sm:inline-flex items-center gap-2 px-4 xl:px-5 py-2.5 rounded-xl font-sans text-xs xl:text-[13px] font-bold uppercase tracking-wider cursor-pointer shadow-md shrink-0"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Botão Hambúrguer Mobile (< xl) */}
              <button
                type="button"
                onClick={() => {
                  SoundFX.play('click');
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
                aria-expanded={mobileMenuOpen}
                className="xl:hidden inline-flex items-center justify-center p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-[#00D4FF] hover:border-[#00D4FF] transition-all cursor-pointer shadow-md"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-[#FF2D9B]" />
                ) : (
                  <Menu className="w-5 h-5 text-[#00D4FF]" />
                )}
              </button>
            </div>
          </div>

          {/* Gaveta de Navegação Mobile */}
          {mobileMenuOpen && (
            <div className="xl:hidden max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-700/60 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
              <nav className="flex flex-col gap-1.5 font-mono text-xs font-semibold text-slate-300">
                {[
                  { href: '#problema', label: 'Problema' },
                  { href: '#plataforma', label: 'Plataforma' },
                  { href: '#pilares', label: '8 Pilares' },
                  { href: '#fluxo', label: 'Fluxo Operacional' },
                  { href: '#ia', label: 'Inteligência Artificial' },
                  { href: '#automacao', label: 'Automação' },
                  { href: '#performance', label: 'Performance' },
                  { href: '#previsibilidade', label: 'Previsibilidade' },
                  { href: '#ecossistema', label: 'Ecossistema Multi-CRM' },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      SoundFX.play('click');
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-[#00D4FF] transition-colors flex items-center justify-between"
                  >
                    <span>{item.label}</span>
                    <span className="text-slate-500 font-mono text-[10px]">→</span>
                  </a>
                ))}
                <div className="pt-2 mt-1 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300">Alternar tema:</span>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="landing-theme-toggle-btn"
                    aria-label={
                      theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'
                    }
                  >
                    {theme === 'dark' ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                        <Sun className="w-4 h-4" /> Claro
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-sky-600">
                        <Moon className="w-4 h-4" /> Escuro
                      </span>
                    )}
                  </button>
                </div>
                <div className="pt-2 mt-1 border-t border-slate-700/60 sm:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleGoToLogin();
                    }}
                    className="btn-cta-light w-full py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span>Acessar Plataforma</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </nav>
            </div>
          )}
        </header>

        {/* 2. HERO SECTION */}
        <section
          id="hero"
          className="relative px-5 py-16 sm:px-8 lg:px-14 overflow-hidden border-b border-slate-700/60 transition-colors"
        >
          {/* Halos luminosos neon sutis */}
          <div className="pointer-events-none absolute top-10 right-10 w-[500px] h-[500px] max-w-full rounded-full blur-[140px] bg-[#00D4FF]/10" />
          <div className="pointer-events-none absolute bottom-0 left-10 w-[450px] h-[450px] max-w-full rounded-full blur-[140px] bg-[#FF2D9B]/10" />

          <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center text-center">
            {/* Headline Centralizada com Animação Luminous das 3 Frases */}
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.2] max-w-4xl text-center mx-auto mb-6">
              <span className="block space-y-1 sm:space-y-2">
                <span className="hero-phrase-line hero-phrase-1 block">
                  <span className="landing-title-cyan font-extrabold">Dados que </span>
                  <span className="grad-text-blue font-extrabold">Conectam.</span>
                </span>
                <span className="hero-phrase-line hero-phrase-2 block">
                  <span className="landing-title-purple font-extrabold">Inteligência que </span>
                  <span className="grad-text-purple font-extrabold">Decide.</span>
                </span>
                <span className="hero-phrase-line hero-phrase-3 block">
                  <span className="landing-title-gold font-extrabold">Execução que </span>
                  <span className="grad-text-gold font-extrabold">Acontece.</span>
                </span>
              </span>
            </h1>

            {/* Subheadline Oficial Centralizada - SEM BRANCO OU PRETO */}
            <p className="landing-subtitle mt-2 text-base sm:text-lg md:text-xl font-medium max-w-3xl leading-relaxed text-center mx-auto">
              Conecte CRM, dados, inteligência artificial e automação em um único centro de comando
              para planejar, monitorar, prever e acelerar suas operações comerciais.
            </p>

            {/* CTAs do Hero com animação pulsante — ZERO FUNDO BRANCO */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="btn-cta-light btn-cta-pulse inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-mono text-sm sm:text-base font-bold uppercase tracking-wider cursor-pointer shadow-lg"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#pilares"
                className="btn-secondary-dark inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all"
              >
                <span>Ver os 8 Pilares</span>
                <Compass className="w-4 h-4 text-[#00D4FF]" />
              </a>
            </div>

            {/* Capacidades reais: Multi-CRM — Respiro +36px e bordas semânticas */}
            <div className="mt-20 pt-8 border-t border-slate-200/80 dark:border-slate-800 w-full max-w-6xl xl:max-w-7xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURE_TAGS.map((tag, index) => (
                  <div
                    key={tag.label}
                    className={`capability-card ${getSemanticCardClass(tag.color)} flex flex-col items-center justify-center text-center p-6 rounded-2xl transition-all shadow-md`}
                    style={{
                      animationDelay: `${index * 45}ms`,
                    }}
                  >
                    <span
                      className="font-mono text-xs font-bold uppercase tracking-wider mb-2.5 px-3 py-1 rounded-full"
                      style={{
                        color: tag.color,
                        backgroundColor: `${tag.color}18`,
                        border: `1.5px solid ${tag.color}55`,
                      }}
                    >
                      {tag.kicker}
                    </span>
                    <h4
                      className="font-display font-bold text-base sm:text-lg leading-snug text-center mb-2"
                      style={{ color: tag.color }}
                    >
                      {tag.label}
                    </h4>
                    <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                      {tag.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. PROBLEMA */}
        <section
          id="problema"
          className="px-5 py-16 sm:px-8 lg:px-14 border-b border-slate-700/60 transition-colors"
        >
          <div className="max-w-7xl mx-auto">
            {/* Cabeçalho de Seção Centralizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] mb-3.5 mx-auto">
                <span>O Gargalo Estrutural das Empresas</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 text-center landing-title-pink">
                A realidade de operar com dados fragmentados e equipes no escuro
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Empresas investem em múltiplas ferramentas, mas continuam sem clareza sobre onde o
                pipeline está travado, quais negócios realmente têm chance de fechar e o que cada
                vendedor deve fazer a seguir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card card-semantic-pink p-6 text-center flex flex-col items-center rounded-2xl shadow-md">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF2D9B] bg-[#FF2D9B]/10 border border-[#FF2D9B]/35 px-3 py-1 rounded-full mb-3">
                  Silos &amp; Fragmentação
                </span>
                <div className="w-12 h-12 rounded-xl bg-[#FF2D9B]/15 text-[#FF2D9B] flex items-center justify-center mb-4 border border-[#FF2D9B]/30">
                  <SilosCardIcon size={24} color="#FF2D9B" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#db2777] dark:text-[#FF2D9B] mb-2 text-center">
                  Silos e Ferramentas Desconectadas
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  O CRM não fala em tempo real com a telefonia, as trocas de WhatsApp ficam perdidas
                  no celular do vendedor e os dados de prospecção não retroalimentam o time de
                  fechamento.
                </p>
              </div>

              <div className="section-card card-semantic-gold p-6 text-center flex flex-col items-center rounded-2xl shadow-md">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/35 px-3 py-1 rounded-full mb-3">
                  Falta de Telemetria
                </span>
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center mb-4 border border-[#F59E0B]/30">
                  <ReactiveCardIcon size={24} color="#F59E0B" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#d97706] dark:text-[#F59E0B] mb-2 text-center">
                  Gestão Reativa &amp; Decisões Tardias
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Gestores passam o dia cobrando preenchimento manual de planilhas e só descobrem
                  que a meta não será atingida nos últimos dias do mês, quando já não há tempo hábil
                  para corrigir o curso.
                </p>
              </div>

              <div className="section-card card-semantic-cyan p-6 text-center flex flex-col items-center rounded-2xl shadow-md">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/35 px-3 py-1 rounded-full mb-3">
                  Execução Reativa
                </span>
                <div className="w-12 h-12 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center mb-4 border border-[#00D4FF]/30">
                  <LostDealsCardIcon size={24} color="#00D4FF" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#0284c7] dark:text-[#00D4FF] mb-2 text-center">
                  Perda Invisível de Oportunidades
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
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
          className="px-5 py-16 sm:px-8 lg:px-14 border-b border-slate-700/60 transition-colors"
        >
          <div className="max-w-7xl mx-auto">
            {/* Cabeçalho Centralizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                <span>Arquitetura One OS</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 text-center landing-title-gradient">
                Um único sistema operacional para planejar, monitorar e acelerar
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                O Birth Hub 360° unifica a governança de dados, os algoritmos de diagnóstico e o
                centro de comando diário da sua equipe comercial com conectividade Multi-CRM.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card card-semantic-cyan p-6 flex flex-col items-center text-center rounded-2xl shadow-md">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center border border-[#00D4FF]/30">
                    <MultiCrmDataLayerIcon size={24} color="#00D4FF" />
                  </div>
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/35 px-3 py-1 rounded-full mb-2">
                  Camada 01
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#0284c7] dark:text-[#00D4FF] mb-2 text-center">
                  Dados &amp; Conectividade Multi-CRM
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Conexão via API REST e webhooks bidirecionais com Bitrix24, HubSpot, Salesforce,
                  Pipedrive, e-mails corporativos, canais de mensageria e dados enriquecidos B2B em
                  uma única fonte da verdade.
                </p>
              </div>

              <div className="section-card card-semantic-pink p-6 flex flex-col items-center text-center rounded-2xl shadow-md">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FF2D9B]/15 text-[#FF2D9B] flex items-center justify-center border border-[#FF2D9B]/30">
                    <AiDiagnosticLayerIcon size={24} color="#FF2D9B" />
                  </div>
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF2D9B] bg-[#FF2D9B]/10 border border-[#FF2D9B]/35 px-3 py-1 rounded-full mb-2">
                  Camada 02
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#db2777] dark:text-[#FF2D9B] mb-2 text-center">
                  Motor de Diagnóstico &amp; IA
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Algoritmos contextuais que avaliam a saúde de cada deal, detectam riscos em tempo
                  real e sugerem a próxima melhor ação para fechar com maior margem.
                </p>
              </div>

              <div className="section-card card-semantic-gold p-6 flex flex-col items-center text-center rounded-2xl shadow-md">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center border border-[#F59E0B]/30">
                    <ExecutionLayerIcon size={24} color="#F59E0B" />
                  </div>
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/35 px-3 py-1 rounded-full mb-2">
                  Camada 03
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#d97706] dark:text-[#F59E0B] mb-2 text-center">
                  Execução &amp; Orquestração
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Cockpit de trabalho ágil para pré-vendas (SDR), vendas (Closer) e liderança, com
                  automações de tarefas repetitivas e cadências sem atrito.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. 8 PILARES OFICIAIS */}
        <section
          id="pilares"
          className="px-5 py-16 sm:px-8 lg:px-14 border-b border-slate-700/60 transition-colors"
        >
          <div className="max-w-7xl mx-auto">
            {/* Cabeçalho Centralizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                <span>ESTRUTURA OFICIAL DO PRODUTO</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 text-center landing-title-gold">
                Os 8 Pilares Fundamentais do Birth Hub 360°
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Cada pilar resolve uma dimensão estratégica da operação comercial, operando de forma
                independente ou em perfeita sinergia sistêmica.
              </p>
            </div>

            {/* Grid dos 8 Cards Coloridos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {OFFICIAL_PILLARS.map((p) => {
                const isActive = selectedPillar === p.id;

                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handlePillarClick(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePillarClick(p.id);
                      }
                    }}
                    className={`pillar-card group flex flex-col justify-between p-5 rounded-2xl cursor-pointer border transition-all duration-300 relative ${
                      isActive
                        ? 'pillar-card-active ring-2 ring-offset-2 ring-offset-[#0B1120]'
                        : ''
                    }`}
                    style={{
                      borderColor: isActive ? p.color : `${p.color}75`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      boxShadow: isActive
                        ? theme === 'dark'
                          ? `0 0 0 2px ${p.color}, 0 12px 28px -4px rgba(0,0,0,0.65), 0 0 14px 1px ${p.color}35`
                          : `0 0 0 2px ${p.color}, 0 8px 24px -2px rgba(15,23,42,0.1), 0 0 10px ${p.color}20`
                        : theme === 'dark'
                          ? `0 6px 20px -2px rgba(0, 0, 0, 0.5), 0 0 8px 0 ${p.color}10`
                          : `0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)`,
                    }}
                  >
                    {/* Topo do Card */}
                    <div className="flex items-center justify-between mb-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: `${p.color}22`,
                            color: p.color,
                            border: `1.5px solid ${p.color}55`,
                          }}
                        >
                          {p.id}
                        </span>
                        <span
                          className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: `${p.color}22`,
                            color: p.color,
                          }}
                        >
                          {p.slug}
                        </span>
                      </div>

                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-transform duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: `${p.color}22`,
                          color: p.color,
                          border: `1.5px solid ${p.color}55`,
                        }}
                      >
                        {p.symbol}
                      </div>
                    </div>

                    {/* Conteúdo do Card com Nome Oficial */}
                    <div className="flex-1 my-1">
                      <h3
                        className="font-display text-base sm:text-lg font-bold leading-tight mb-2 text-center"
                        style={{ color: p.color }}
                      >
                        {p.name}
                      </h3>
                      <p className="landing-subtitle font-sans text-sm font-medium leading-relaxed mb-3 text-center">
                        {p.desc}
                      </p>
                      <div className="text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold section-card landing-subtitle border border-slate-700/60">
                          Foco: {p.focus}
                        </span>
                      </div>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="mt-4 pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ backgroundColor: p.color }}
                        />
                        <span
                          className="font-mono text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: p.color }}
                        >
                          {p.tag}
                        </span>
                      </div>
                      <span
                        className="font-mono text-[11px] opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                        style={{ color: p.color }}
                      >
                        CONECTADO →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detalhamento Interativo do Pilar Selecionado (Executive Drawer) */}
            {selectedPillar &&
              (() => {
                const pilar = OFFICIAL_PILLARS.find((p) => p.id === selectedPillar);
                if (!pilar) return null;

                return (
                  <div
                    className="pillar-detail-drawer mt-8 p-6 sm:p-8 rounded-2xl relative shadow-2xl transition-all"
                    style={{
                      border: `2.5px solid ${pilar.color}`,
                      background:
                        theme === 'dark'
                          ? 'linear-gradient(135deg, #0F172A 0%, #0B1120 100%)'
                          : 'linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)',
                      boxShadow: `0 16px 48px -4px ${pilar.color}35, 0 0 28px 4px ${pilar.color}25`,
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm shrink-0"
                          style={{
                            backgroundColor: `${pilar.color}22`,
                            color: pilar.color,
                            border: `1.5px solid ${pilar.color}55`,
                          }}
                        >
                          {pilar.symbol}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${pilar.color}20`,
                                color: pilar.color,
                              }}
                            >
                              PILAR {pilar.id}
                            </span>
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                              TAG: {pilar.tag}
                            </span>
                          </div>
                          <h3
                            className="font-display text-xl sm:text-2xl font-extrabold mt-0.5"
                            style={{ color: pilar.color }}
                          >
                            {pilar.name}
                          </h3>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          SoundFX.play('click');
                          setSelectedPillar(null);
                        }}
                        className="self-start sm:self-center px-4 py-2 rounded-xl font-mono text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                      >
                        ✕ Fechar Detalhes
                      </button>
                    </div>

                    <p className="landing-subtitle text-base font-medium leading-relaxed max-w-3xl mb-5">
                      {pilar.desc}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono text-xs">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">
                          Foco Estratégico:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {pilar.focus}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">
                          Integração &amp; Dados:
                        </span>
                        <span className="font-bold text-[#00D4FF] text-sm">
                          Sincronização Contínua Multi-CRM
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">
                          Governança &amp; Acesso:
                        </span>
                        <span className="font-bold text-[#10B981] text-sm">
                          Isolamento Multi-Tenant Ativo
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        </section>

        {/* 6. FLUXO OPERACIONAL */}
        <section id="fluxo" className="px-5 py-16 sm:px-8 lg:px-14 landing-section-base">
          <div className="max-w-7xl mx-auto">
            {/* Cabeçalho Centralizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                <span>CICLO OPERACIONAL COMPLETO</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-gradient tracking-tight mb-3 text-center">
                Como os dados fluem da prospecção ao fechamento
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Cada etapa é governada por automações e inteligência para garantir velocidade e zero
                perda de oportunidades com sincronização Multi-CRM.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flow-step-card card-semantic-cyan p-5 sm:p-6 text-center flex flex-col items-center">
                <div className="mb-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider bg-[#00D4FF]/15 text-[#0284c7] dark:text-[#00D4FF] border border-[#00D4FF]/35">
                    ETAPA 01
                  </span>
                </div>
                <h4 className="font-display text-base sm:text-lg font-bold text-[#0284c7] dark:text-[#00D4FF] mb-2.5 text-center">
                  Entrada &amp; Captura
                </h4>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Leads e contas são integrados via CRMs (Bitrix24, HubSpot, Salesforce, Pipedrive),
                  campanhas ou prospecção ativa.
                </p>
              </div>

              <div className="flow-step-card card-semantic-pink p-5 sm:p-6 text-center flex flex-col items-center">
                <div className="mb-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider bg-[#FF2D9B]/15 text-[#db2777] dark:text-[#FF2D9B] border border-[#FF2D9B]/35">
                    ETAPA 02
                  </span>
                </div>
                <h4 className="font-display text-base sm:text-lg font-bold text-[#db2777] dark:text-[#FF2D9B] mb-2.5 text-center">
                  Enriquecimento B2B
                </h4>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Dados de receita, decisores e porte validam o fit do cliente ideal (ICP).
                </p>
              </div>

              <div className="flow-step-card card-semantic-gold p-5 sm:p-6 text-center flex flex-col items-center">
                <div className="mb-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider bg-[#F59E0B]/15 text-[#d97706] dark:text-[#F59E0B] border border-[#F59E0B]/35">
                    ETAPA 03
                  </span>
                </div>
                <h4 className="font-display text-base sm:text-lg font-bold text-[#d97706] dark:text-[#F59E0B] mb-2.5 text-center">
                  Cadência &amp; SLA
                </h4>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Distribuição instantânea ao SDR com réguas de contato automáticas.
                </p>
              </div>

              <div className="flow-step-card card-semantic-iris p-5 sm:p-6 text-center flex flex-col items-center">
                <div className="mb-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider bg-[#8B7DFF]/15 text-[#7c3aed] dark:text-[#8B7DFF] border border-[#8B7DFF]/35">
                    ETAPA 04
                  </span>
                </div>
                <h4 className="font-display text-base sm:text-lg font-bold text-[#7c3aed] dark:text-[#8B7DFF] mb-2.5 text-center">
                  Apoio com IA
                </h4>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Copiloto analisa objeções, histórico e recomenda a abordagem ideal.
                </p>
              </div>

              <div className="flow-step-card card-semantic-green p-5 sm:p-6 text-center flex flex-col items-center">
                <div className="mb-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] border border-[#10B981]/35">
                    ETAPA 05
                  </span>
                </div>
                <h4 className="font-display text-base sm:text-lg font-bold text-[#059669] dark:text-[#10B981] mb-2.5 text-center">
                  Fechamento &amp; Dados
                </h4>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Contrato fechado e aprendizados de win/loss retroalimentam o sistema.
                </p>
              </div>
            </div>

            {/* Demonstração Real do Motor de Prospecção — Prova de Capacidade Enterprise */}
            <div className="mt-14 rounded-2xl border border-[#00D4FF]/45 dark:border-[#00D4FF]/60 ring-1 ring-[#00D4FF]/20 bg-gradient-to-b from-white via-sky-50/40 to-slate-50 dark:from-[#0F172A] dark:via-[#0c192c] dark:to-[#081524] p-5 sm:p-7 lg:p-8 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.1)] dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00D4FF]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D9B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  </div>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D4FF]">
                      Radar Discovery em Operação Real · Fontes Abertas
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30">
                    Telemetria Ativa
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    Captura real do produto · Desktop &amp; Mobile
                  </span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-100 dark:bg-[#0B1120] shadow-inner">
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

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                <span>✦ ICP Filtrado por Segmento, Região e Personas B2B</span>
                <span className="text-[#0284c7] dark:text-[#00D4FF] font-medium">
                  Integração via API e webhooks com Bitrix24, HubSpot, Salesforce e principais CRMs
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. IA (INTELIGÊNCIA ARTIFICIAL CONTEXTUAL) */}
        <section id="ia" className="px-5 py-16 sm:px-8 lg:px-14 landing-section-alt">
          <div className="max-w-7xl mx-auto">
            {/* Cabeçalho Centralizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#FF2D9B]/10 border border-[#FF2D9B]/40 text-[#FF2D9B] mb-3.5 mx-auto">
                <span>IA COM CONTEXTO OPERACIONAL REAL</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-pink tracking-tight mb-3 text-center">
                Inteligência Artificial que compreende o seu pipeline
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Ao contrário de ferramentas genéricas de texto, a IA do Birth Hub 360° é diretamente
                conectada aos dados operacionais dos seus CRMs, entendendo o estágio de cada
                negociação, o histórico de contatos e as objeções recorrentes.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="lg:w-1/2 space-y-4">
                <div className="section-card card-semantic-cyan flex items-start gap-3.5 p-5 rounded-2xl shadow-md">
                  <div className="w-8 h-8 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center shrink-0 mt-0.5 border border-[#00D4FF]/35">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-base text-[#0284c7] dark:text-[#00D4FF]">
                      Diagnóstico de Entraves
                    </h4>
                    <p className="landing-subtitle text-sm font-medium leading-relaxed mt-1">
                      Alerta deals estagnados com sugestões claras de destravamento baseadas no
                      histórico da conta.
                    </p>
                  </div>
                </div>

                <div className="section-card card-semantic-pink flex items-start gap-3.5 p-5 rounded-2xl shadow-md">
                  <div className="w-8 h-8 rounded-full bg-[#FF2D9B]/20 text-[#FF2D9B] flex items-center justify-center shrink-0 mt-0.5 border border-[#FF2D9B]/35">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-base text-[#db2777] dark:text-[#FF2D9B]">
                      Próxima Melhor Ação
                    </h4>
                    <p className="landing-subtitle text-sm font-medium leading-relaxed mt-1">
                      Recomendações acionáveis para o vendedor avançar o contato e contornar
                      objeções críticas.
                    </p>
                  </div>
                </div>

                <div className="section-card card-semantic-gold flex items-start gap-3.5 p-5 rounded-2xl shadow-md">
                  <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center shrink-0 mt-0.5 border border-[#F59E0B]/35">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-base text-[#d97706] dark:text-[#F59E0B]">
                      Isolamento &amp; Segurança
                    </h4>
                    <p className="landing-subtitle text-sm font-medium leading-relaxed mt-1">
                      Seus dados comerciais jamais são utilizados para treinar modelos públicos.
                      Conformidade LGPD total.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/2 w-full">
                <div className="section-card card-semantic-pink p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#FF2D9B] animate-pulse" />
                      <span className="font-mono text-xs font-bold text-[#FF2D9B]">
                        COPILOTO COMERCIAL ATIVO
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      Contexto: Deal #4892 · Multi-CRM
                    </span>
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-[#FF2D9B]/40 text-slate-700 dark:text-slate-200 shadow-sm">
                      <span className="text-[#FF2D9B] font-bold">Diagnóstico:</span> Negociação de
                      R$ 140k sem retorno há 4 dias após envio de proposta.
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-[#00D4FF]/40 text-slate-700 dark:text-slate-200 shadow-sm">
                      <span className="text-[#00D4FF] font-bold">Ação Sugerida:</span> Disparar
                      cadência de validação de decisor financeiro abordando ROI estimado em 90 dias.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. AUTOMAÇÃO & CONECTIVIDADE MULTI-CRM */}
        <section id="automacao" className="px-5 py-16 sm:px-8 lg:px-14 landing-section-base">
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-[#00D4FF] mb-3.5 mx-auto">
                <span>CONECTIVIDADE MULTI-CRM</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-cyan tracking-tight mb-3 text-center">
                Automação Inteligente &amp; Conectividade Multi-CRM
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Remova tarefas braçais repetitivas e integre seus fluxos com Bitrix24, HubSpot,
                Salesforce, Pipedrive e mensageria sem atrito.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card card-semantic-cyan p-6 flex flex-col items-center text-center rounded-2xl shadow-md">
                <div className="w-12 h-12 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center font-bold mb-4 border border-[#00D4FF]/35">
                  <Workflow className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#0284c7] dark:text-[#00D4FF] mb-2 text-center">
                  Sincronização Multi-CRM
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Atualizações automáticas de campos, estágios de oportunidade e tarefas em
                  Bitrix24, HubSpot, Salesforce e Pipedrive sem digitação dupla.
                </p>
              </div>

              <div className="section-card card-semantic-pink p-6 flex flex-col items-center text-center rounded-2xl shadow-md">
                <div className="w-12 h-12 rounded-xl bg-[#FF2D9B]/15 text-[#FF2D9B] flex items-center justify-center font-bold mb-4 border border-[#FF2D9B]/35">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#db2777] dark:text-[#FF2D9B] mb-2 text-center">
                  Gatilhos de Comportamento
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Aberturas de proposta, acessos a links ou ausência de contato disparam alertas
                  imediatos para a equipe responsável.
                </p>
              </div>

              <div className="section-card card-semantic-gold p-6 flex flex-col items-center text-center rounded-2xl shadow-md">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center font-bold mb-4 border border-[#F59E0B]/35">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#d97706] dark:text-[#F59E0B] mb-2 text-center">
                  Distribuição Inteligente
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Roteamento de oportunidades com base em carga de trabalho, especialidade do
                  vendedor e tamanho da conta.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 9. PERFORMANCE COMERCIAL */}
        <section id="performance" className="px-5 py-16 sm:px-8 lg:px-14 landing-section-alt">
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                <span>TELEMETRIA DE RESULTADOS</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-gold tracking-tight mb-3 text-center">
                Visibilidade cirúrgica da tração e das metas
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Monitore taxas de passagem por fase, tempo de permanência em cada estágio e
                produtividade real da equipe.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <div className="section-card card-semantic-cyan p-6 text-center flex flex-col items-center rounded-2xl shadow-md">
                <div className="font-mono text-xs text-[#0284c7] dark:text-[#00D4FF] uppercase font-bold tracking-wider mb-2 px-3 py-1 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/30">
                  Taxa de Conversão
                </div>
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#0284c7] dark:text-[#00D4FF] my-2 text-center">
                  Funil 360°
                </div>
                <div className="mb-2.5">
                  <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#00D4FF]/15 text-[#0284c7] dark:text-[#00D4FF] border border-[#00D4FF]/30">
                    +24% Eficiência
                  </span>
                </div>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Acompanhamento da taxa de conversão entre cada etapa do pipeline.
                </p>
              </div>

              <div className="section-card card-semantic-pink p-6 text-center flex flex-col items-center rounded-2xl shadow-md">
                <div className="font-mono text-xs text-[#db2777] dark:text-[#FF2D9B] uppercase font-bold tracking-wider mb-2 px-3 py-1 rounded-full bg-[#FF2D9B]/10 border border-[#FF2D9B]/30">
                  Velocidade de Vendas
                </div>
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#db2777] dark:text-[#FF2D9B] my-2 text-center">
                  Ciclo Médio
                </div>
                <div className="mb-2.5">
                  <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FF2D9B]/15 text-[#db2777] dark:text-[#FF2D9B] border border-[#FF2D9B]/30">
                    -38% Duração
                  </span>
                </div>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Identificação do tempo exato que um lead leva da qualificação ao fechamento.
                </p>
              </div>

              <div className="section-card card-semantic-gold p-6 text-center flex flex-col items-center rounded-2xl shadow-md">
                <div className="font-mono text-xs text-[#d97706] dark:text-[#F59E0B] uppercase font-bold tracking-wider mb-2 px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                  Gestão de Metas
                </div>
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#d97706] dark:text-[#F59E0B] my-2 text-center">
                  Ritmo &amp; Pace
                </div>
                <div className="mb-2.5">
                  <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#d97706] dark:text-[#F59E0B] border border-[#F59E0B]/30">
                    Tempo Real
                  </span>
                </div>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Comparativo diário de faturamento atingido versus meta mensal estabelecida.
                </p>
              </div>

              <div className="section-card card-semantic-iris p-6 text-center flex flex-col items-center rounded-2xl shadow-md">
                <div className="font-mono text-xs text-[#7c3aed] dark:text-[#8B7DFF] uppercase font-bold tracking-wider mb-2 px-3 py-1 rounded-full bg-[#8B7DFF]/10 border border-[#8B7DFF]/30">
                  Motivos de Perda
                </div>
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#7c3aed] dark:text-[#8B7DFF] my-2 text-center">
                  Win / Loss
                </div>
                <div className="mb-2.5">
                  <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#8B7DFF]/15 text-[#7c3aed] dark:text-[#8B7DFF] border border-[#8B7DFF]/30">
                    Diagnóstico IA
                  </span>
                </div>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Análise estruturada de causas de perda para correção contínua do produto.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 10. PREVISIBILIDADE COMERCIAL */}
        <section id="previsibilidade" className="px-5 py-16 sm:px-8 lg:px-14 landing-section-base">
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                <span>RIGOR ANALÍTICO</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-gold tracking-tight mb-3 text-center">
                Previsibilidade comercial baseada em dados reais
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Sem promessas mágicas: modelagem estatística séria que pondera a maturidade do
                pipeline e as taxas históricas de conversão.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card card-semantic-gold p-6 flex flex-col items-center text-center rounded-2xl shadow-md">
                <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center font-bold mb-3 font-mono text-base border border-[#F59E0B]/40">
                  01
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/35 px-3 py-1 rounded-full mb-2">
                  Modelagem Probabilística
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#d97706] dark:text-[#F59E0B] mb-2 text-center">
                  Pipeline Ponderado
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Cálculo de probabilidade de fechamento por estágio formal de negociação, evitando
                  expectativas infladas de receita.
                </p>
              </div>

              <div className="section-card card-semantic-cyan p-6 flex flex-col items-center text-center rounded-2xl shadow-md">
                <div className="w-11 h-11 rounded-xl bg-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center font-bold mb-3 font-mono text-base border border-[#00D4FF]/40">
                  02
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/35 px-3 py-1 rounded-full mb-2">
                  Qualidade da Base
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#0284c7] dark:text-[#00D4FF] mb-2 text-center">
                  Maturidade de Dados
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  O sistema reconhece que a precisão preditiva depende da consistência de
                  preenchimento e do histórico da organização.
                </p>
              </div>

              <div className="section-card card-semantic-pink p-6 flex flex-col items-center text-center rounded-2xl shadow-md">
                <div className="w-11 h-11 rounded-xl bg-[#FF2D9B]/20 text-[#FF2D9B] flex items-center justify-center font-bold mb-3 font-mono text-base border border-[#FF2D9B]/40">
                  03
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF2D9B] bg-[#FF2D9B]/10 border border-[#FF2D9B]/35 px-3 py-1 rounded-full mb-2">
                  Gestão de Risco
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#db2777] dark:text-[#FF2D9B] mb-2 text-center">
                  Cenários Conservador &amp; Otimista
                </h3>
                <p className="landing-subtitle text-sm font-medium leading-relaxed text-center">
                  Simulação de faixas de faturamento para que a liderança tome decisões de
                  crescimento, contratação e investimento com segurança.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 11. ECOSSISTEMA TECNOLÓGICO */}
        <section id="ecossistema" className="px-5 py-12 sm:px-8 lg:px-14 landing-section-alt">
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado */}
            <div className="text-center max-w-3xl mx-auto mb-8">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-[#00D4FF] mb-3.5 mx-auto">
                <span>CONECTIVIDADE ENTERPRISE</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-cyan tracking-tight mb-3 text-center">
                Integrado ao ecossistema tecnológico da sua empresa
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Construído para operar com múltiplos CRMs e todas as ferramentas comerciais
                corporativas.
              </p>
            </div>

            {/* Grid Multi-CRM Completo — Zero Fundo Branco Chapado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
              <div className="section-card card-semantic-cyan p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center shadow-md">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0284c7] dark:text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/30 px-2.5 py-0.5 rounded-full mb-2">
                  ● API &amp; Webhooks
                </span>
                <div className="font-display text-base sm:text-lg font-bold text-[#0284c7] dark:text-[#00D4FF]">
                  Bitrix24
                </div>
                <div className="landing-subtitle text-xs sm:text-sm font-medium mt-1">
                  Sincronização Contínua
                </div>
              </div>

              <div className="section-card card-semantic-pink p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center shadow-md">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#db2777] dark:text-[#FF2D9B] bg-[#FF2D9B]/10 border border-[#FF2D9B]/30 px-2.5 py-0.5 rounded-full mb-2">
                  ● Bidirecional
                </span>
                <div className="font-display text-base sm:text-lg font-bold text-[#db2777] dark:text-[#FF2D9B]">
                  HubSpot
                </div>
                <div className="landing-subtitle text-xs sm:text-sm font-medium mt-1">
                  Conexão de Pipeline
                </div>
              </div>

              <div className="section-card card-semantic-gold p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center shadow-md">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d97706] dark:text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-2.5 py-0.5 rounded-full mb-2">
                  ● Enterprise Sync
                </span>
                <div className="font-display text-base sm:text-lg font-bold text-[#d97706] dark:text-[#F59E0B]">
                  Salesforce
                </div>
                <div className="landing-subtitle text-xs sm:text-sm font-medium mt-1">
                  Conector de Contas
                </div>
              </div>

              <div className="section-card card-semantic-green p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center shadow-md">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#059669] dark:text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-2.5 py-0.5 rounded-full mb-2">
                  ● Pipeline Sync
                </span>
                <div className="font-display text-base sm:text-lg font-bold text-[#059669] dark:text-[#10B981]">
                  Pipedrive
                </div>
                <div className="landing-subtitle text-xs sm:text-sm font-medium mt-1">
                  Fluxos em Tempo Real
                </div>
              </div>

              <div className="section-card card-semantic-cyan p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center shadow-md">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0284c7] dark:text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/30 px-2.5 py-0.5 rounded-full mb-2">
                  ● Direto na Fila
                </span>
                <div className="font-display text-base sm:text-lg font-bold text-[#0284c7] dark:text-[#00D4FF]">
                  WhatsApp API
                </div>
                <div className="landing-subtitle text-xs sm:text-sm font-medium mt-1">
                  Mensageria Ativa
                </div>
              </div>

              <div className="section-card card-semantic-gold p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center shadow-md">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d97706] dark:text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-2.5 py-0.5 rounded-full mb-2">
                  ● Telefonia Cloud
                </span>
                <div className="font-display text-base sm:text-lg font-bold text-[#d97706] dark:text-[#F59E0B]">
                  Voz Integrada
                </div>
                <div className="landing-subtitle text-xs sm:text-sm font-medium mt-1">
                  Gravação &amp; Métricas
                </div>
              </div>

              <div className="section-card card-semantic-cyan p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center shadow-md">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0284c7] dark:text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/30 px-2.5 py-0.5 rounded-full mb-2">
                  ● REST &amp; Hooks
                </span>
                <div className="font-display text-base sm:text-lg font-bold text-[#0284c7] dark:text-[#00D4FF]">
                  Webhooks &amp; APIs
                </div>
                <div className="landing-subtitle text-xs sm:text-sm font-medium mt-1">
                  Arquitetura Aberta
                </div>
              </div>

              <div className="section-card card-semantic-pink p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center shadow-md">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#db2777] dark:text-[#FF2D9B] bg-[#FF2D9B]/10 border border-[#FF2D9B]/30 px-2.5 py-0.5 rounded-full mb-2">
                  ● Rastreabilidade
                </span>
                <div className="font-display text-base sm:text-lg font-bold text-[#db2777] dark:text-[#FF2D9B]">
                  E-mail Corporativo
                </div>
                <div className="landing-subtitle text-xs sm:text-sm font-medium mt-1">
                  Histórico Auditável
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 12. COMMAND CENTER (COCKPIT) */}
        <section id="command-center" className="px-5 py-16 sm:px-8 lg:px-14 landing-section-base">
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#FF2D9B]/10 border border-[#FF2D9B]/40 text-[#FF2D9B] mb-3.5 mx-auto">
                <span>COCKPIT OPERACIONAL</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-pink tracking-tight mb-3 text-center">
                O centro de comando unificado para liderança e time
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Tenha um ambiente único onde diretores acompanham a saúde da receita, gerentes
                supervisionam gargalos em tempo real e executivos de vendas recebem sua rotina de
                atividades organizada por prioridade.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="lg:w-1/2 w-full space-y-4">
                <div className="grid grid-cols-2 gap-3.5 font-mono text-xs">
                  <div className="section-card card-semantic-cyan p-5 sm:p-6 rounded-2xl text-slate-700 dark:text-slate-200 text-center shadow-md">
                    <span className="font-bold text-[#0284c7] dark:text-[#00D4FF] block mb-2 text-base">
                      SDRs &amp; BDRs
                    </span>
                    <p className="landing-subtitle text-xs sm:text-sm font-medium leading-relaxed">
                      Fila priorizada por inteligência, roteiro de qualificação e dados de decisores
                      enriquecidos na tela.
                    </p>
                  </div>
                  <div className="section-card card-semantic-gold p-5 sm:p-6 rounded-2xl text-slate-700 dark:text-slate-200 text-center shadow-md">
                    <span className="font-bold text-[#d97706] dark:text-[#F59E0B] block mb-2 text-base">
                      Closers
                    </span>
                    <p className="landing-subtitle text-xs sm:text-sm font-medium leading-relaxed">
                      Visão 360° do deal, mapeamento de objeções históricas e suporte preditivo do
                      copiloto comercial.
                    </p>
                  </div>
                </div>

                <div className="section-card card-semantic-pink p-5 sm:p-6 rounded-2xl text-slate-700 dark:text-slate-200 text-center shadow-md">
                  <span className="font-bold text-[#db2777] dark:text-[#FF2D9B] block mb-2 text-base">
                    Diretoria &amp; Head de Vendas
                  </span>
                  <p className="landing-subtitle text-xs sm:text-sm font-medium leading-relaxed">
                    Previsibilidade acionável, telemetria diária de faturamento e controle
                    irrestrito de cada etapa do pipeline.
                  </p>
                </div>
              </div>

              <div className="lg:w-1/2 w-full">
                <div className="section-card card-semantic-cyan p-6 sm:p-7 shadow-2xl rounded-2xl">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-mono text-xs font-bold text-[#0284c7] dark:text-[#00D4FF]">
                      BIRTH HUB 360° · COCKPIT ATIVO
                    </span>
                    <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-[#00D4FF]/20 text-[#0284c7] dark:text-[#00D4FF] font-bold border border-[#00D4FF]/30">
                      100% OPERACIONAL
                    </span>
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#00D4FF]/35 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Leads Ativos na Fila
                        </span>
                        <span className="font-extrabold text-[#0284c7] dark:text-[#00D4FF] text-sm sm:text-base">
                          184 contatos
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#00D4FF] h-full rounded-full"
                          style={{ width: '78%' }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#F59E0B]/35 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Deals com Risco Identificado
                        </span>
                        <span className="font-extrabold text-[#d97706] dark:text-[#F59E0B] text-sm sm:text-base">
                          3 oportunidades
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#F59E0B] h-full rounded-full"
                          style={{ width: '18%' }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#FF2D9B]/35 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Cadências em Execução
                        </span>
                        <span className="font-extrabold text-[#db2777] dark:text-[#FF2D9B] text-sm sm:text-base">
                          12 ativas
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#FF2D9B] h-full rounded-full"
                          style={{ width: '92%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 13. CTA FINAL — EXECUTIVE COMMAND DECK */}
        <section id="cta" className="px-5 py-20 sm:px-8 lg:px-14 landing-section-alt text-center">
          <div className="max-w-4xl mx-auto cta-command-deck p-8 sm:p-12 text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#00D4FF]/15 border border-[#00D4FF]/40 text-[#0284c7] dark:text-[#00D4FF] mb-5">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
              <span>SISTEMA OPERACIONAL COMERCIAL B2B</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold landing-title-gradient tracking-tight leading-tight text-center mx-auto max-w-2xl">
              <span>Pronto para colocar sua operação comercial sob comando?</span>
            </h2>
            <p className="landing-subtitle mt-4 text-base sm:text-lg max-w-2xl mx-auto text-center font-medium leading-relaxed">
              Acesse a plataforma corporativa do Birth Hub 360° e conecte dados, equipe e execução
              em tempo real com governança Multi-CRM.
            </p>

            {/* Badges de Confiança Enterprise */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs font-mono font-semibold">
              <span className="px-3 py-1 rounded-full bg-[#00D4FF]/10 text-[#0284c7] dark:text-[#00D4FF] border border-[#00D4FF]/30">
                ✦ SLA 99.9%
              </span>
              <span className="px-3 py-1 rounded-full bg-[#FF2D9B]/10 text-[#db2777] dark:text-[#FF2D9B] border border-[#FF2D9B]/30">
                ✦ Isolamento Multi-Tenant
              </span>
              <span className="px-3 py-1 rounded-full bg-[#F59E0B]/10 text-[#d97706] dark:text-[#F59E0B] border border-[#F59E0B]/30">
                ✦ Conexão Multi-CRM
              </span>
              <span className="px-3 py-1 rounded-full bg-[#10B981]/10 text-[#059669] dark:text-[#10B981] border border-[#10B981]/30">
                ✦ LGPD Compliant
              </span>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="btn-cta-light btn-cta-pulse inline-flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-mono text-base font-bold uppercase tracking-wider cursor-pointer shadow-lg"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* 14. FOOTER */}
        <footer className="px-5 py-10 sm:px-8 lg:px-14 landing-section-footer">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-8 mb-6">
            <div className="flex items-center gap-3">
              <BH360LogoMark size={42} />
              <div>
                <div className="font-display text-lg font-bold text-[#00D4FF]">
                  Birth Hub <span className="text-[#FF2D9B]">360°</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#F59E0B]">
                  Business Command Center
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-xs text-slate-300">
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

          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-400 text-center">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sistemas Operacionais · Latência 22ms · 99.98% Uptime</span>
              </div>
              <p>© {new Date().getFullYear()} Birth Hub 360°. Todos os direitos reservados.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/terms"
                className="hover:text-[#00D4FF] transition-colors underline-offset-4 hover:underline"
              >
                Termos de Uso
              </Link>
              <span>·</span>
              <Link
                to="/privacy"
                className="hover:text-[#00D4FF] transition-colors underline-offset-4 hover:underline"
              >
                Política de Privacidade
              </Link>
              <span>·</span>
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
          TELA 2: LOGIN — MODAL / TELA DE ACESSO CORPORATIVO (ZERO FUNDO BRANCO EM BOTÕES)
      ════════════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed inset-0 w-full h-full flex flex-col items-center justify-start z-50 login-antessala-backdrop ${
          theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F8FAFC]'
        } px-5 py-6 sm:px-8 lg:px-12 overflow-y-auto transition-all duration-500 ${
          activeScreen === 'login'
            ? 'opacity-100 pointer-events-auto'
            : 'hidden opacity-0 pointer-events-none'
        }`}
      >
        {/* Topo do Modal com navegação */}
        <div className="w-full max-w-[460px] flex items-center justify-between mb-4">
          <button
            id="btn-back"
            type="button"
            onClick={() => {
              SoundFX.play('click');
              setActiveScreen('intro');
            }}
            className="text-slate-700 dark:text-slate-300 hover:text-[#00D4FF] dark:hover:text-[#00D4FF] transition-colors flex items-center gap-2 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider cursor-pointer px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="landing-theme-toggle-btn"
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#F59E0B]" />
              ) : (
                <Moon className="w-4 h-4 text-[#00D4FF]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                SoundFX.play('confirm');
                navigate('/login');
              }}
              className="text-slate-600 dark:text-slate-400 hover:text-[#00D4FF] transition-colors font-mono text-xs cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
            >
              <span>Tela Cheia</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Header Centralizado do Modal — Sequência Coesa */}
        <div className="flex flex-col items-center mb-4 text-center">
          <BH360LogoMark size={48} />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] mt-3 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
            <span>Revenue Command Center · Antessala</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold landing-title-gradient tracking-tight mb-1.5 leading-tight text-center">
            <span>
              {authMode === 'signup'
                ? 'Solicitar Acesso Corporativo'
                : authMode === 'forgot'
                  ? 'Redefinir Senha'
                  : 'Acessar o Command Center'}
            </span>
          </h2>
          <p className="landing-subtitle font-sans text-xs sm:text-sm font-medium max-w-[380px] mx-auto leading-relaxed text-center">
            {authMode === 'signup'
              ? 'Preencha suas informações corporativas para provisionamento de acesso.'
              : authMode === 'forgot'
                ? 'Informe seu e-mail corporativo para receber o link de recuperação.'
                : 'Central de inteligência comercial, previsibilidade e governança integrada.'}
          </p>
        </div>

        {/* Card Central de Login — Command Deck (Zero Fundo Branco Chapado) */}
        <div className="w-full max-w-[460px] mb-8">
          <div className="card-login-command p-6 sm:p-7 relative">
            {/* Abas E-mail vs SSO */}
            {authMode === 'signin' && (
              <div
                className="grid grid-cols-2 gap-1 mb-5 p-1 bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl"
                role="tablist"
                aria-label="Método de acesso"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMethod === 'email'}
                  onClick={() => setAuthMethod('email')}
                  className={`py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all ${
                    authMethod === 'email'
                      ? 'bg-[#00D4FF]/20 border border-[#00D4FF] text-[#0284c7] dark:text-[#00D4FF] shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>E-mail Corporativo</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMethod === 'sso'}
                  onClick={() => setAuthMethod('sso')}
                  className={`py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all ${
                    authMethod === 'sso'
                      ? 'bg-[#00D4FF]/20 border border-[#00D4FF] text-[#0284c7] dark:text-[#00D4FF] shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>SSO Empresarial</span>
                </button>
              </div>
            )}

            {/* Mensagens de Feedback */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="font-medium font-sans">{errorMessage}</p>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-start gap-2.5 text-xs text-emerald-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="font-medium font-sans">{successMessage}</p>
              </div>
            )}

            {/* Conteúdo de SSO Empresarial ou Formulário Padrão */}
            {authMethod === 'sso' && authMode === 'signin' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center mx-auto mb-2.5">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Single Sign-On Corporativo
                  </h4>
                  <p className="font-sans text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    Autenticação federada SAML 2.0 / Okta / Azure AD configurada para o subdomínio
                    da sua organização.
                  </p>
                  <div className="space-y-1.5 text-left">
                    <label
                      htmlFor="sso-domain"
                      className="block font-mono text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                    >
                      Domínio Corporativo
                    </label>
                    <input
                      id="sso-domain"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-4 text-sm font-sans outline-none placeholder:text-slate-400"
                      placeholder="empresa.com.br"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    SoundFX.play('confirm');
                    if (!email.trim()) {
                      setErrorMessage('Por favor, informe seu domínio corporativo para SSO.');
                      return;
                    }
                    setSuccessMessage(`Validando federação SAML 2.0 para ${email.trim()}...`);
                  }}
                  className="btn-cta-light w-full h-12 rounded-xl font-mono text-sm sm:text-base font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transition-all"
                >
                  <span>Continuar com SSO</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              /* Formulário Padrão */
              <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
                {authMode === 'signup' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-name"
                      className="block font-mono text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                    >
                      Nome Completo
                    </label>
                    <input
                      id="login-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-4 text-sm font-sans outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="Seu nome"
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-email"
                      className="block font-mono text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                    >
                      E-mail Corporativo
                    </label>
                    <span className="font-mono text-[10px] text-[#00D4FF]/80">
                      Domínio empresarial
                    </span>
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-4 text-sm font-sans outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="nome@empresa.com.br"
                    required
                    autoComplete="email"
                  />
                </div>

                {authMode !== 'forgot' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block font-mono text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                      >
                        Senha de Acesso
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-4 text-sm font-sans outline-none transition-all pr-11 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        placeholder="••••••••"
                        required
                        autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-[#00D4FF] transition-colors p-1"
                        aria-label="Mostrar ou ocultar senha"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {authMode === 'signin' && (
                  <div className="flex items-center justify-between pt-1 font-sans text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-[#00D4FF] focus:ring-0 focus:ring-offset-0 cursor-pointer"
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
                      className="font-medium text-[#00D4FF] hover:underline cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                {/* Botão de Enviar */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-cta-light w-full h-12 rounded-xl font-mono text-sm sm:text-base font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <>
                      <span>
                        {authMode === 'signup'
                          ? 'Solicitar Acesso'
                          : authMode === 'forgot'
                            ? 'Enviar Link de Redefinição'
                            : 'Entrar na Plataforma'}
                      </span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 text-white" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Alternância de Modo */}
            <div className="mt-4 text-center">
              {authMode === 'signin' && (
                <button
                  type="button"
                  aria-label="Criar conta"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-sans text-xs text-slate-600 dark:text-slate-300 hover:text-[#00D4FF] transition-colors cursor-pointer"
                >
                  Não possui credenciais corporativas?{' '}
                  <span className="font-bold text-[#00D4FF] hover:underline">Criar conta</span>
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
                  className="font-sans text-xs text-slate-600 dark:text-slate-300 hover:text-[#00D4FF] transition-colors cursor-pointer"
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
                  className="font-sans text-xs text-slate-600 dark:text-slate-300 hover:text-[#00D4FF] transition-colors cursor-pointer"
                >
                  Voltar para{' '}
                  <span className="font-bold text-[#00D4FF] hover:underline">
                    Login Corporativo
                  </span>
                </button>
              )}
            </div>

            {/* Régua Técnica de Segurança e Conformidade (Arquitetura Real) */}
            <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[10px] font-bold text-[#0284c7] dark:text-[#00D4FF]">
                    TLS 1.3
                  </span>
                  <span className="font-sans text-[9px] font-medium text-slate-600 dark:text-slate-400">
                    Em Trânsito
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[10px] font-bold text-[#0284c7] dark:text-[#00D4FF]">
                    AES-256-GCM
                  </span>
                  <span className="font-sans text-[9px] font-medium text-slate-600 dark:text-slate-400">
                    Em Repouso
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[10px] font-bold text-[#b45309] dark:text-[#F59E0B]">
                    LGPD / Art. 18
                  </span>
                  <span className="font-sans text-[9px] font-medium text-slate-600 dark:text-slate-400">
                    Conformidade
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[10px] font-bold text-[#047857] dark:text-[#10B981]">
                    Multi-Tenant
                  </span>
                  <span className="font-sans text-[9px] font-medium text-slate-600 dark:text-slate-400">
                    Isolamento
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BOTÃO FLUTUANTE VOLTAR AO TOPO (NEON FLOATING ACTION BUTTON)
      ════════════════════════════════════════════════════════════════════ */}
      {showScrollTop && activeScreen === 'intro' && (
        <button
          type="button"
          onClick={() => {
            SoundFX.play('click');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="btn-floating-top"
          aria-label="Voltar ao topo da página"
          title="Voltar ao topo"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </main>
  );
}
