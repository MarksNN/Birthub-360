import { useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Menu,
  Moon,
  Server,
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
  AiSectionIcon,
  AuthModalSectionIcon,
  AutomationSectionIcon,
  CapabilitiesTitleIcon,
  CockpitSectionIcon,
  CtaSectionIcon,
  EcosystemSectionIcon,
  ExecutionLayerIcon,
  FlowSectionIcon,
  FlowStep1Icon,
  FlowStep2Icon,
  FlowStep3Icon,
  FlowStep4Icon,
  FlowStep5Icon,
  ForecastSectionIcon,
  HeroTitleIcon,
  LostDealsCardIcon,
  MultiCrmDataLayerIcon,
  PerfSectionIcon,
  PillarsSectionIcon,
  Pillar1HubIcon,
  Pillar2IntelIcon,
  Pillar3OrchIcon,
  Pillar4PerfIcon,
  Pillar5ForeIcon,
  Pillar6AiIcon,
  Pillar7AutoIcon,
  Pillar8EngIcon,
  PlatformSectionIcon,
  ProblemSectionIcon,
  ReactiveCardIcon,
  SilosCardIcon,
} from '../components/LandingTitleIcons.js';
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
    label: 'Pipeline Centralizado',
    color: '#00D4FF',
    desc: 'Reúna oportunidades, etapas e histórico comercial em uma visão organizada.',
  },
  {
    label: 'Inteligência B2B',
    color: '#FF2D9B',
    desc: 'Contextualize empresas e contatos com dados para apoiar a qualificação.',
  },
  {
    label: 'Cadências Automatizadas',
    color: '#00D4FF',
    desc: 'Organize sequências de contato e próximos passos ao longo da negociação.',
  },
  {
    label: 'Velocidade de Ciclo',
    color: '#F59E0B',
    desc: 'Acompanhe o tempo entre etapas e identifique pontos de estagnação.',
  },
  {
    label: 'Cenários Ponderados',
    color: '#F59E0B',
    desc: 'Compare projeções considerando etapas, probabilidades e histórico do pipeline.',
  },
  {
    label: 'Copiloto Comercial IA',
    color: '#FF2D9B',
    desc: 'Apoie diagnósticos e próximas ações com o contexto das negociações.',
  },
  {
    label: 'Conectividade Multi-CRM',
    color: '#00D4FF',
    desc: 'Conecte registros e fluxos comerciais com Bitrix24, Salesforce, HubSpot e Pipedrive.',
  },
  {
    label: 'Telefonia & Voz Ativa',
    color: '#FF2D9B',
    desc: 'Integre interações de voz ao acompanhamento das oportunidades comerciais.',
  },
];

function BH360LogoMark({ size = 52 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="inline-block relative">
      <BirthHubLogo variant="icon" title="Birth Hub 360º" className="w-full h-full" animated={true} />
    </span>
  );
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

  const handleSocialLogin = (provider: 'google' | 'microsoft') => {
    SoundFX.play('click');
    (authClient.signIn as any)?.social({
      provider,
      callbackURL: '/app',
    });
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
      className={`relative w-full min-h-screen font-sans selection:bg-[#FF2D9B]/30 selection:text-[#00D4FF] landing-neon-root transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0B1120] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      }`}
    >
      {/* ════════════════════════════════════════════════════════════════════
          TELA 1: LANDING COMPLETA
      ════════════════════════════════════════════════════════════════════ */}
      <div className={activeScreen === 'intro' ? 'block' : 'hidden'}>
        {/* 1. NAVBAR FIXA */}
        <header className="navbar-sticky w-full px-5 py-3 sm:px-8 lg:px-14">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="#hero" className="flex items-center gap-3 group">
              <BH360LogoMark size={44} />
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold leading-tight tracking-tight">
                  <span className="landing-title-cyan font-bold">Birth Hub</span>
                  <span className="landing-title-pink ml-1 font-extrabold">360°</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00D4FF] font-semibold">
                  Command Center
                </span>
              </div>
            </a>

            {/* Links de navegação desktop */}
            <nav className="hidden xl:flex items-center gap-6 font-mono text-xs font-semibold landing-subtitle">
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

            <div className="flex items-center gap-3">
              {/* Botão de Alternância de Tema (Light / Dark) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="landing-theme-toggle-btn"
                aria-label={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-sky-600" />
                )}
              </button>

              {/* Botão de Login no Topo - Sem fundo branco */}
              <button
                type="button"
                onClick={handleGoToLogin}
                className="btn-cta-light hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
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
                    aria-label={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
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
          <div className="pointer-events-none absolute top-10 right-10 w-[500px] h-[500px] rounded-full blur-[140px] bg-[#00D4FF]/10" />
          <div className="pointer-events-none absolute bottom-0 left-10 w-[450px] h-[450px] rounded-full blur-[140px] bg-[#FF2D9B]/10" />

          <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center text-center">
            {/* Badge de Categoria com SVG Customizado e Centralizado */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest section-card border border-[#00D4FF]/40 text-[#00D4FF] shadow-lg shadow-[#00D4FF]/10 mb-6 mx-auto">
              <HeroTitleIcon size={18} color="#00D4FF" />
              <span>SISTEMA OPERACIONAL COMERCIAL</span>
            </div>

            {/* Headline Centralizada com Gradientes Oficiais e Dourado Radiante - SEM BRANCO OU PRETO */}
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.18] max-w-4xl text-center mx-auto mb-6 flex flex-col items-center gap-3">
              <span className="title-badge-svg mb-1">
                <HeroTitleIcon size={42} />
              </span>
              <span>
                <span className="landing-title-cyan font-extrabold">Dados que </span>
                <span className="grad-text-blue font-extrabold">Conectam.</span>
                <br />
                <span className="landing-title-purple font-extrabold">Inteligência que </span>
                <span className="grad-text-purple font-extrabold">Decide.</span>
                <br />
                <span className="landing-title-gold font-extrabold">Execução que </span>
                <span className="grad-text-gold font-extrabold">Acontece.</span>
              </span>
            </h1>

            {/* Subheadline Oficial Centralizada - SEM BRANCO OU PRETO */}
            <p className="landing-subtitle mt-2 text-base sm:text-lg md:text-xl font-medium max-w-3xl leading-relaxed text-center mx-auto">
              Conecte CRM, dados, inteligência artificial e automação em um único centro de comando
              para planejar, monitorar, prever e acelerar suas operações comerciais.
            </p>

            {/* CTAs do Hero — ZERO FUNDO BRANCO */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="btn-cta-light inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-mono text-sm sm:text-base font-bold uppercase tracking-wider cursor-pointer shadow-lg"
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

            {/* Capacidades reais: Título Centralizado com Multi-CRM */}
            <div className="mt-14 pt-8 border-t border-slate-700/60 w-full max-w-5xl">
              <div className="flex items-center justify-center gap-2.5 mb-6 text-center">
                <CapabilitiesTitleIcon size={20} color="#00D4FF" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest landing-title-cyan">
                  Capacidades Operacionais Integradas
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURE_TAGS.map((tag, index) => (
                  <div
                    key={tag.label}
                    className="capability-card flex flex-col items-center justify-center text-center p-5 rounded-2xl"
                    style={{ borderColor: tag.color, animationDelay: `${index * 45}ms` }}
                  >
                    <span
                      className="block mx-auto mb-3 w-2.5 h-2.5 rounded-full shadow-md"
                      style={{ backgroundColor: tag.color, boxShadow: `0 0 10px ${tag.color}` }}
                      aria-hidden="true"
                    />
                    <h4
                      className="font-display font-semibold text-[16px] leading-snug text-center mb-2"
                      style={{ color: tag.color }}
                    >
                      {tag.label}
                    </h4>
                    <p className="landing-subtitle text-xs leading-relaxed text-center">{tag.desc}</p>
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
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho de Seção Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] mb-3.5 mx-auto">
                <ProblemSectionIcon size={18} color="#EF4444" />
                <span>O Gargalo Estrutural das Empresas</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 text-center landing-title-pink flex items-center justify-center gap-3">
                <ProblemSectionIcon size={28} color="#FF2D9B" />
                <span>A realidade de operar com dados fragmentados e equipes no escuro</span>
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Empresas investem em múltiplas ferramentas, mas continuam sem clareza sobre onde o
                pipeline está travado, quais negócios realmente têm chance de fechar e o que cada
                vendedor deve fazer a seguir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6 border-t-2 border-t-[#FF2D9B] text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-[#FF2D9B]/15 text-[#FF2D9B] flex items-center justify-center mb-4">
                  <SilosCardIcon size={24} color="#FF2D9B" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#FF2D9B] mb-2 text-center flex items-center justify-center gap-2">
                  <SilosCardIcon size={18} color="#FF2D9B" />
                  <span>Silos e Ferramentas Desconectadas</span>
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
                  O CRM não fala em tempo real com a telefonia, as trocas de WhatsApp ficam perdidas
                  no celular do vendedor e os dados de prospecção não retroalimentam o time de
                  fechamento.
                </p>
              </div>

              <div className="section-card p-6 border-t-2 border-t-[#F59E0B] text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center mb-4">
                  <ReactiveCardIcon size={24} color="#F59E0B" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#F59E0B] mb-2 text-center flex items-center justify-center gap-2">
                  <ReactiveCardIcon size={18} color="#F59E0B" />
                  <span>Gestão Reativa &amp; Decisões Tardias</span>
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
                  Gestores passam o dia cobrando preenchimento manual de planilhas e só descobrem
                  que a meta não será atingida nos últimos dias do mês, quando já não há tempo hábil
                  para corrigir o curso.
                </p>
              </div>

              <div className="section-card p-6 border-t-2 border-t-[#00D4FF] text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center mb-4">
                  <LostDealsCardIcon size={24} color="#00D4FF" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#00D4FF] mb-2 text-center flex items-center justify-center gap-2">
                  <LostDealsCardIcon size={18} color="#00D4FF" />
                  <span>Perda Invisível de Oportunidades</span>
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
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
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                <PlatformSectionIcon size={18} color="#F59E0B" />
                <span>Arquitetura One OS</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 text-center landing-title-gradient flex items-center justify-center gap-3">
                <PlatformSectionIcon size={28} color="#F59E0B" />
                <span>Um único sistema operacional para planejar, monitorar e acelerar</span>
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                O Birth Hub 360° unifica a governança de dados, os algoritmos de diagnóstico e o
                centro de comando diário da sua equipe comercial com conectividade Multi-CRM.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center">
                    <MultiCrmDataLayerIcon size={24} color="#00D4FF" />
                  </div>
                </div>
                <span className="font-mono text-xs font-bold uppercase text-[#00D4FF] mb-1">
                  Camada 1
                </span>
                <h3 className="font-display text-base font-bold landing-title-cyan mb-2 text-center flex items-center justify-center gap-2">
                  <MultiCrmDataLayerIcon size={18} color="#00D4FF" />
                  <span>Dados &amp; Conectividade Multi-CRM</span>
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
                  Conexão via API REST e webhooks bidirecionais com Bitrix24, HubSpot, Salesforce, Pipedrive,
                  e-mails corporativos, canais de mensageria e dados enriquecidos B2B em uma única
                  fonte da verdade.
                </p>
              </div>

              <div className="section-card p-6 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FF2D9B]/15 text-[#FF2D9B] flex items-center justify-center">
                    <AiDiagnosticLayerIcon size={24} color="#FF2D9B" />
                  </div>
                </div>
                <span className="font-mono text-xs font-bold uppercase text-[#FF2D9B] mb-1">
                  Camada 2
                </span>
                <h3 className="font-display text-base font-bold landing-title-pink mb-2 text-center flex items-center justify-center gap-2">
                  <AiDiagnosticLayerIcon size={18} color="#FF2D9B" />
                  <span>Motor de Diagnóstico &amp; IA</span>
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
                  Algoritmos contextuais que avaliam a saúde de cada deal, detectam riscos em tempo
                  real e sugerem a próxima melhor ação para fechar com maior margem.
                </p>
              </div>

              <div className="section-card p-6 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center">
                    <ExecutionLayerIcon size={24} color="#F59E0B" />
                  </div>
                </div>
                <span className="font-mono text-xs font-bold uppercase text-[#F59E0B] mb-1">
                  Camada 3
                </span>
                <h3 className="font-display text-base font-bold landing-title-gold mb-2 text-center flex items-center justify-center gap-2">
                  <ExecutionLayerIcon size={18} color="#F59E0B" />
                  <span>Execução &amp; Orquestração</span>
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
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
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                <PillarsSectionIcon size={18} color="#F59E0B" />
                <span>ESTRUTURA OFICIAL DO PRODUTO</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 text-center landing-title-gold flex items-center justify-center gap-3">
                <PillarsSectionIcon size={28} color="#F59E0B" />
                <span>Os 8 Pilares Fundamentais do Birth Hub 360°</span>
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
                const pillarIcons: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
                  '01': Pillar1HubIcon,
                  '02': Pillar2IntelIcon,
                  '03': Pillar3OrchIcon,
                  '04': Pillar4PerfIcon,
                  '05': Pillar5ForeIcon,
                  '06': Pillar6AiIcon,
                  '07': Pillar7AutoIcon,
                  '08': Pillar8EngIcon,
                };
                const PillarIcon = pillarIcons[p.id] ?? Pillar1HubIcon;

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
                      borderColor: isActive ? p.color : `${p.color}55`,
                      borderWidth: isActive ? '2px' : '1.5px',
                    }}
                  >
                    {/* Barra de destaque colorida superior */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-all duration-300 group-hover:h-2"
                      style={{ background: p.color }}
                    />

                    {/* Topo do Card */}
                    <div className="flex items-center justify-between mb-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `${p.color}18`,
                            color: p.color,
                            border: `1px solid ${p.color}44`,
                          }}
                        >
                          {p.id}
                        </span>
                        <span
                          className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `${p.color}18`,
                            color: p.color,
                          }}
                        >
                          {p.slug}
                        </span>
                      </div>

                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base transition-transform duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: `${p.color}18`,
                          color: p.color,
                          border: `1px solid ${p.color}44`,
                        }}
                      >
                        {p.symbol}
                      </div>
                    </div>

                    {/* Conteúdo do Card com Nome Oficial */}
                    <div className="flex-1 my-1">
                      <h3
                        className="font-display text-sm sm:text-base font-bold leading-tight mb-2 text-center flex items-center justify-center gap-1.5"
                        style={{ color: p.color }}
                      >
                        <PillarIcon size={18} color={p.color} />
                        <span>{p.name}</span>
                      </h3>
                      <p className="landing-subtitle font-sans text-xs leading-relaxed mb-3 text-center">
                        {p.desc}
                      </p>
                      <div className="text-center">
                        <span className="inline-block px-2.5 py-1 rounded text-[10px] font-mono font-semibold section-card landing-subtitle border border-slate-700/60">
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
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0B1120] border-b border-slate-800"
        >
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                {/* SVG 5: Fluxo Pulse Wave */}
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 12H7L10 5L14 19L17 12H21"
                    stroke="url(#fluxo-pulse-svg)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="10" cy="5" r="2" fill="#00D4FF" />
                  <circle cx="14" cy="19" r="2" fill="#FF2D9B" />
                  <defs>
                    <linearGradient id="fluxo-pulse-svg" x1="3" y1="12" x2="21" y2="12">
                      <stop stopColor="#00D4FF" />
                      <stop offset="0.5" stopColor="#FF2D9B" />
                      <stop offset="1" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>
                </svg>
                <span>CICLO OPERACIONAL COMPLETO</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-gradient tracking-tight mb-3 text-center flex items-center justify-center gap-3">
                <FlowSectionIcon size={32} />
                <span>Como os dados fluem da prospecção ao fechamento</span>
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Cada etapa é governada por automações e inteligência para garantir velocidade e zero
                perda de oportunidades com sincronização Multi-CRM.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flow-step-card p-5 text-center flex flex-col items-center">
                <div className="font-mono text-xs font-bold text-[#00D4FF] mb-2 flex items-center gap-1.5">
                  <FlowStep1Icon size={16} />
                  <span>ETAPA 01</span>
                </div>
                <h4 className="font-display text-sm font-bold text-[#00D4FF] mb-2 text-center">
                  Entrada &amp; Captura
                </h4>
                <p className="landing-subtitle text-xs leading-relaxed text-center">
                  Leads e contas são integrados via CRMs (Bitrix24, HubSpot, Salesforce, Pipedrive),
                  campanhas ou prospecção ativa.
                </p>
              </div>

              <div className="flow-step-card p-5 text-center flex flex-col items-center">
                <div className="font-mono text-xs font-bold text-[#FF2D9B] mb-2 flex items-center gap-1.5">
                  <FlowStep2Icon size={16} />
                  <span>ETAPA 02</span>
                </div>
                <h4 className="font-display text-sm font-bold text-[#FF2D9B] mb-2 text-center">
                  Enriquecimento B2B
                </h4>
                <p className="landing-subtitle text-xs leading-relaxed text-center">
                  Dados de receita, decisores e porte validam o fit do cliente ideal (ICP).
                </p>
              </div>

              <div className="flow-step-card p-5 text-center flex flex-col items-center">
                <div className="font-mono text-xs font-bold text-[#F59E0B] mb-2 flex items-center gap-1.5">
                  <FlowStep3Icon size={16} />
                  <span>ETAPA 03</span>
                </div>
                <h4 className="font-display text-sm font-bold text-[#F59E0B] mb-2 text-center">
                  Cadência &amp; SLA
                </h4>
                <p className="landing-subtitle text-xs leading-relaxed text-center">
                  Distribuição instantânea ao SDR com réguas de contato automáticas.
                </p>
              </div>

              <div className="flow-step-card p-5 text-center flex flex-col items-center">
                <div className="font-mono text-xs font-bold text-[#8B7DFF] mb-2 flex items-center gap-1.5">
                  <FlowStep4Icon size={16} />
                  <span>ETAPA 04</span>
                </div>
                <h4 className="font-display text-sm font-bold text-[#8B7DFF] mb-2 text-center">
                  Apoio com IA
                </h4>
                <p className="landing-subtitle text-xs leading-relaxed text-center">
                  Copiloto analisa objeções, histórico e recomenda a abordagem ideal.
                </p>
              </div>

              <div className="flow-step-card p-5 text-center flex flex-col items-center">
                <div className="font-mono text-xs font-bold text-[#10B981] mb-2 flex items-center gap-1.5">
                  <FlowStep5Icon size={16} />
                  <span>ETAPA 05</span>
                </div>
                <h4 className="font-display text-sm font-bold text-[#10B981] mb-2 text-center">
                  Fechamento &amp; Dados
                </h4>
                <p className="landing-subtitle text-xs leading-relaxed text-center">
                  Contrato fechado e aprendizados de win/loss retroalimentam o sistema.
                </p>
              </div>
            </div>

            {/* Demonstração Real do Motor de Prospecção */}
            <div className="mt-12 rounded-2xl border border-slate-800 bg-[#0F172A] p-4 sm:p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00D4FF] animate-pulse" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D4FF]">
                    Radar Discovery em Operação Real · Fontes Abertas
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  Captura de tela real do produto · Desktop &amp; Mobile
                </span>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0B1120]">
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

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300 font-mono">
                <span>✦ ICP Filtrado por Segmento, Região e Personas B2B</span>
                <span className="text-[#00D4FF]">
                  Integração via API e webhooks com Bitrix24, HubSpot, Salesforce e principais CRMs
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. IA (INTELIGÊNCIA ARTIFICIAL CONTEXTUAL) */}
        <section
          id="ia"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0F172A] border-b border-slate-800"
        >
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#FF2D9B]/10 border border-[#FF2D9B]/40 text-[#FF2D9B] mb-3.5 mx-auto">
                {/* SVG 6: Quantum Neural Spark */}
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12"
                    stroke="#FF2D9B"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 6V12L16 14"
                    stroke="#FF2D9B"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18 2L19.5 5.5L23 7L19.5 8.5L18 12L16.5 8.5L13 7L16.5 5.5L18 2Z"
                    fill="#FF2D9B"
                  />
                </svg>
                <span>IA COM CONTEXTO OPERACIONAL REAL</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-pink tracking-tight mb-3 text-center flex items-center justify-center gap-3">
                <AiSectionIcon size={32} />
                <span>Inteligência Artificial que compreende o seu pipeline</span>
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Ao contrário de ferramentas genéricas de texto, a IA do Birth Hub 360° é diretamente
                conectada aos dados operacionais dos seus CRMs, entendendo o estágio de cada
                negociação, o histórico de contatos e as objeções recorrentes.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="lg:w-1/2 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0B1120] border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#00D4FF] text-sm">Diagnóstico de Entraves</h4>
                    <p className="landing-subtitle text-xs sm:text-sm mt-1">
                      Alerta deals estagnados com sugestões claras de destravamento baseadas no
                      histórico da conta.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0B1120] border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-[#FF2D9B]/20 text-[#FF2D9B] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#FF2D9B] text-sm">Próxima Melhor Ação</h4>
                    <p className="landing-subtitle text-xs sm:text-sm mt-1">
                      Recomendações acionáveis para o vendedor avançar o contato e contornar
                      objeções críticas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0B1120] border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#F59E0B] text-sm">Isolamento &amp; Segurança</h4>
                    <p className="landing-subtitle text-xs sm:text-sm mt-1">
                      Seus dados comerciais jamais são utilizados para treinar modelos públicos.
                      Conformidade LGPD total.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/2 w-full">
                <div className="section-card p-6 border-2 border-[#FF2D9B]/30 bg-[#0B1120] shadow-2xl">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#FF2D9B] animate-pulse" />
                      <span className="font-mono text-xs font-bold text-[#FF2D9B]">
                        COPILOTO COMERCIAL ATIVO
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      Contexto: Deal #4892 · Multi-CRM
                    </span>
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#FF2D9B]/25 text-slate-200">
                      <span className="text-[#FF2D9B] font-bold">Diagnóstico:</span> Negociação de
                      R$ 140k sem retorno há 4 dias após envio de proposta.
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#00D4FF]/25 text-slate-200">
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
        <section
          id="automacao"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0B1120] border-b border-slate-800"
        >
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-[#00D4FF] mb-3.5 mx-auto">
                {/* SVG 7: Multi-Cloud Sync Loop */}
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 4V9H9"
                    stroke="#00D4FF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 20V15H15"
                    stroke="#00D4FF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 9A8 8 0 0 0 6.34 6.34L4 9"
                    stroke="#00D4FF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 15A8 8 0 0 0 17.66 17.66L20 15"
                    stroke="#00D4FF"
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
                <span>CONECTIVIDADE MULTI-CRM</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-cyan tracking-tight mb-3 text-center flex items-center justify-center gap-3">
                <AutomationSectionIcon size={32} />
                <span>Automação Inteligente &amp; Conectividade Multi-CRM</span>
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Remova tarefas braçais repetitivas e integre seus fluxos com Bitrix24, HubSpot,
                Salesforce, Pipedrive e mensageria sem atrito.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center font-bold mb-4">
                  <Workflow className="w-6 h-6" />
                </div>
                <h3 className="font-display text-base font-bold text-[#00D4FF] mb-2 text-center">
                  Sincronização Multi-CRM
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
                  Atualizações automáticas de campos, estágios de oportunidade e tarefas em
                  Bitrix24, HubSpot, Salesforce e Pipedrive sem digitação dupla.
                </p>
              </div>

              <div className="section-card p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-[#FF2D9B]/15 text-[#FF2D9B] flex items-center justify-center font-bold mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-display text-base font-bold text-[#FF2D9B] mb-2 text-center">
                  Gatilhos de Comportamento
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
                  Aberturas de proposta, acessos a links ou ausência de contato disparam alertas
                  imediatos para a equipe responsável.
                </p>
              </div>

              <div className="section-card p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center font-bold mb-4">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="font-display text-base font-bold text-[#F59E0B] mb-2 text-center">
                  Distribuição Inteligente
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
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
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0F172A] border-b border-slate-800"
        >
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                {/* SVG 8: Performance Telemetry Gauge */}
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="12" r="4" fill="#F59E0B" />
                  <path d="M12 12L15 9" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>TELEMETRIA DE RESULTADOS</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-gold tracking-tight mb-3 text-center flex items-center justify-center gap-3">
                <PerfSectionIcon size={32} />
                <span>Visibilidade cirúrgica da tração e das metas</span>
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Monitore taxas de passagem por fase, tempo de permanência em cada estágio e
                produtividade real da equipe.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="section-card p-5 border-t-4 border-t-[#00D4FF] text-center flex flex-col items-center">
                <div className="font-mono text-xs text-[#00D4FF] uppercase font-bold">
                  Taxa de Conversão
                </div>
                <div className="font-display text-2xl font-extrabold text-[#00D4FF] my-1 text-center">
                  Funil 360°
                </div>
                <p className="landing-subtitle text-xs text-center">
                  Acompanhamento da taxa de conversão entre cada etapa do pipeline.
                </p>
              </div>

              <div className="section-card p-5 border-t-4 border-t-[#FF2D9B] text-center flex flex-col items-center">
                <div className="font-mono text-xs text-[#FF2D9B] uppercase font-bold">
                  Velocidade de Vendas
                </div>
                <div className="font-display text-2xl font-extrabold text-[#FF2D9B] my-1 text-center">
                  Ciclo Médio
                </div>
                <p className="landing-subtitle text-xs text-center">
                  Identificação do tempo exato que um lead leva da qualificação ao fechamento.
                </p>
              </div>

              <div className="section-card p-5 border-t-4 border-t-[#F59E0B] text-center flex flex-col items-center">
                <div className="font-mono text-xs text-[#F59E0B] uppercase font-bold">
                  Gestão de Metas
                </div>
                <div className="font-display text-2xl font-extrabold text-[#F59E0B] my-1 text-center">
                  Ritmo &amp; Pace
                </div>
                <p className="landing-subtitle text-xs text-center">
                  Comparativo diário de faturamento atingido versus meta mensal estabelecida.
                </p>
              </div>

              <div className="section-card p-5 border-t-4 border-t-[#8B7DFF] text-center flex flex-col items-center">
                <div className="font-mono text-xs text-[#8B7DFF] uppercase font-bold">
                  Motivos de Perda
                </div>
                <div className="font-display text-2xl font-extrabold text-[#8B7DFF] my-1 text-center">
                  Win / Loss
                </div>
                <p className="landing-subtitle text-xs text-center">
                  Análise estruturada de causas de perda para correção contínua do produto.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 10. PREVISIBILIDADE COMERCIAL */}
        <section
          id="previsibilidade"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0B1120] border-b border-slate-800"
        >
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] mb-3.5 mx-auto">
                {/* SVG 9: Predictive Forecast Trend Radar */}
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 3V21H21"
                    stroke="#F59E0B"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 16L12 10L16 14L21 6"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="10" r="2.5" fill="#00D4FF" />
                  <circle cx="21" cy="6" r="2.5" fill="#FF2D9B" />
                </svg>
                <span>RIGOR ANALÍTICO</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-gold tracking-tight mb-3 text-center flex items-center justify-center gap-3">
                <ForecastSectionIcon size={32} />
                <span>Previsibilidade comercial baseada em dados reais</span>
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Sem promessas mágicas: modelagem estatística séria que pondera a maturidade do
                pipeline e as taxas históricas de conversão.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center font-bold mb-3">
                  1
                </div>
                <h3 className="font-display text-base font-bold text-[#F59E0B] mb-2 text-center">
                  Pipeline Ponderado
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
                  Cálculo de probabilidade de fechamento por estágio formal de negociação, evitando
                  expectativas infladas de receita.
                </p>
              </div>

              <div className="section-card p-6 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-lg bg-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center font-bold mb-3">
                  2
                </div>
                <h3 className="font-display text-base font-bold text-[#00D4FF] mb-2 text-center">
                  Maturidade de Dados
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
                  O sistema reconhece que a precisão preditiva depende da consistência de
                  preenchimento e do histórico da organização.
                </p>
              </div>

              <div className="section-card p-6 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-lg bg-[#FF2D9B]/20 text-[#FF2D9B] flex items-center justify-center font-bold mb-3">
                  3
                </div>
                <h3 className="font-display text-base font-bold text-[#FF2D9B] mb-2 text-center">
                  Cenários Conservador &amp; Otimista
                </h3>
                <p className="landing-subtitle text-xs sm:text-sm leading-relaxed text-center">
                  Simulação de faixas de faturamento para que a liderança tome decisões de
                  contratação e investimento com segurança.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 11. ECOSSISTEMA TECNOLÓGICO */}
        <section
          id="ecossistema"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0F172A] border-b border-slate-800"
        >
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-[#00D4FF] mb-3.5 mx-auto">
                {/* SVG 10: Constellation Network Hub */}
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="3.5" fill="#00D4FF" />
                  <circle
                    cx="4"
                    cy="6"
                    r="2.5"
                    stroke="#FF2D9B"
                    strokeWidth="1.5"
                    fill="rgba(255,45,155,0.2)"
                  />
                  <circle
                    cx="20"
                    cy="6"
                    r="2.5"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    fill="rgba(245,158,11,0.2)"
                  />
                  <circle
                    cx="4"
                    cy="18"
                    r="2.5"
                    stroke="#22C55E"
                    strokeWidth="1.5"
                    fill="rgba(34,197,94,0.2)"
                  />
                  <circle
                    cx="20"
                    cy="18"
                    r="2.5"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                    fill="rgba(56,189,248,0.2)"
                  />
                  <path
                    d="M6.5 7.5L9.5 10.5M17.5 7.5L14.5 10.5M6.5 16.5L9.5 13.5M17.5 16.5L14.5 13.5"
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>CONECTIVIDADE ENTERPRISE</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-cyan tracking-tight mb-3 text-center flex items-center justify-center gap-3">
                <EcosystemSectionIcon size={32} />
                <span>Integrado ao ecossistema tecnológico da sua empresa</span>
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Construído para operar com múltiplos CRMs e todas as ferramentas comerciais
                corporativas.
              </p>
            </div>

            {/* Grid Multi-CRM Completo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#00D4FF]/40 text-center flex flex-col items-center">
                <div className="font-mono text-sm font-bold text-[#00D4FF]">Bitrix24</div>
                <div className="font-sans text-xs text-slate-400 mt-1">Conexão via API &amp; Webhooks</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#FF2D9B]/40 text-center flex flex-col items-center">
                <div className="font-mono text-sm font-bold text-[#FF2D9B]">HubSpot</div>
                <div className="font-sans text-xs text-slate-400 mt-1">Conexão Bidirecional</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#F59E0B]/40 text-center flex flex-col items-center">
                <div className="font-mono text-sm font-bold text-[#F59E0B]">Salesforce</div>
                <div className="font-sans text-xs text-slate-400 mt-1">Enterprise Connector</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#22C55E]/40 text-center flex flex-col items-center">
                <div className="font-mono text-sm font-bold text-[#22C55E]">Pipedrive</div>
                <div className="font-sans text-xs text-slate-400 mt-1">Pipeline Sync</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#38BDF8]/40 text-center flex flex-col items-center">
                <div className="font-mono text-sm font-bold text-[#38BDF8]">WhatsApp API</div>
                <div className="font-sans text-xs text-slate-400 mt-1">Comunicação Direta</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#F59E0B]/40 text-center flex flex-col items-center">
                <div className="font-mono text-sm font-bold text-[#F59E0B]">Telefonia em Nuvem</div>
                <div className="font-sans text-xs text-slate-400 mt-1">Gravação &amp; Métricas</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#00D4FF]/40 text-center flex flex-col items-center">
                <div className="font-mono text-sm font-bold text-[#00D4FF]">
                  Webhooks &amp; APIs
                </div>
                <div className="font-sans text-xs text-slate-400 mt-1">Conexão Flexível</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#FF2D9B]/40 text-center flex flex-col items-center">
                <div className="font-mono text-sm font-bold text-[#FF2D9B]">E-mail Corporativo</div>
                <div className="font-sans text-xs text-slate-400 mt-1">Rastreabilidade Total</div>
              </div>
            </div>
          </div>
        </section>

        {/* 12. COMMAND CENTER (COCKPIT) */}
        <section
          id="command-center"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-[#0B1120] border-b border-slate-800"
        >
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho Centralizado com SVG Customizado */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#FF2D9B]/10 border border-[#FF2D9B]/40 text-[#FF2D9B] mb-3.5 mx-auto">
                {/* SVG 11: Cockpit Radar */}
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="9" stroke="#FF2D9B" strokeWidth="1.8" />
                  <path
                    d="M12 3V12L18.5 15.5"
                    stroke="#00D4FF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="12" r="2" fill="#F59E0B" />
                </svg>
                <span>COCKPIT OPERACIONAL</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold landing-title-pink tracking-tight mb-3 text-center flex items-center justify-center gap-3">
                <CockpitSectionIcon size={32} />
                <span>O centro de comando unificado para liderança e time</span>
              </h2>
              <p className="landing-subtitle text-sm sm:text-base leading-relaxed text-center mx-auto">
                Tenha um ambiente único onde diretores acompanham a saúde da receita, gerentes
                supervisionam gargalos em tempo real e executivos de vendas recebem sua rotina de
                atividades organizada por prioridade.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="lg:w-1/2 w-full space-y-4">
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800 text-slate-200 text-center">
                    <span className="font-bold text-[#00D4FF] block mb-1">SDRs &amp; BDRs</span>
                    Fila organizada e dados enriquecidos na tela.
                  </div>
                  <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800 text-slate-200 text-center">
                    <span className="font-bold text-[#F59E0B] block mb-1">Closers</span>
                    Histórico 360°, objeções e apoio do copiloto.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800 text-slate-200 text-center">
                  <span className="font-bold text-[#FF2D9B] block mb-1">
                    Diretoria &amp; Head de Vendas
                  </span>
                  Previsibilidade acionável, pace diário e controle total de pipeline.
                </div>
              </div>

              <div className="lg:w-1/2 w-full">
                <div className="section-card p-6 bg-[#0F172A] border border-[#00D4FF]/30 shadow-2xl">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <span className="font-mono text-xs font-bold text-[#00D4FF]">
                       BIRTH HUB 360° · COCKPIT
                    </span>
                    <span className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-[#00D4FF]/20 text-[#00D4FF] font-bold">
                      100% OPERACIONAL
                    </span>
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B1120] border border-slate-800">
                      <span className="text-slate-300">Leads Ativos na Fila</span>
                      <span className="font-bold text-[#00D4FF]">184 contatos</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B1120] border border-slate-800">
                      <span className="text-slate-300">Deals com Risco Identificado</span>
                      <span className="font-bold text-[#F59E0B]">3 oportunidades</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B1120] border border-slate-800">
                      <span className="text-slate-300">Cadências em Execução</span>
                      <span className="font-bold text-[#FF2D9B]">12 ativas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 13. CTA FINAL */}
        <section
          id="cta"
          className="px-5 py-20 sm:px-8 lg:px-14 bg-[#0F172A] text-center border-b border-slate-800"
        >
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            {/* SVG 12: Starburst Beacon */}
            <svg
              className="w-8 h-8 mb-4 mx-auto"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="url(#cta-star-svg)"
                stroke="#F59E0B"
                strokeWidth="1"
              />
              <defs>
                <linearGradient id="cta-star-svg" x1="2" y1="2" x2="22" y2="22">
                  <stop stopColor="#F59E0B" />
                  <stop offset="0.5" stopColor="#FF2D9B" />
                  <stop offset="1" stopColor="#00D4FF" />
                </linearGradient>
              </defs>
            </svg>

            <h2 className="font-display text-3xl sm:text-5xl font-extrabold landing-title-gradient tracking-tight leading-tight text-center mx-auto flex items-center justify-center gap-3">
              <CtaSectionIcon size={40} />
              <span>Pronto para transformar sua operação comercial em um centro de comando inteligente?</span>
            </h2>
            <p className="landing-subtitle mt-4 text-base sm:text-lg max-w-2xl mx-auto text-center">
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
        <footer className="px-5 py-10 sm:px-8 lg:px-14 bg-[#0B1120]">
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
            <p>© {new Date().getFullYear()} Birth Hub 360°. Todos os direitos reservados.</p>
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
        className={`fixed inset-0 w-full h-full flex flex-col items-center justify-start z-50 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F8FAFC]'} px-5 py-8 sm:px-10 lg:px-16 overflow-y-auto transition-all duration-500 ${
          activeScreen === 'login'
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Topo do Modal com navegação — SEM FUNDO BRANCO */}
        <div className="w-full max-w-[480px] flex items-center justify-between mb-6">
          <button
            id="btn-back"
            type="button"
            onClick={() => {
              SoundFX.play('click');
              setActiveScreen('intro');
            }}
            className="text-slate-300 hover:text-[#00D4FF] transition-colors flex items-center gap-2 font-mono text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer px-4 py-2 rounded-xl bg-[#0F172A] border border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
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
              className="text-slate-400 hover:text-[#00D4FF] transition-colors font-mono text-xs cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A] border border-slate-800"
            >
              <span>Tela Cheia</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Header Centralizado do Modal */}
        <div className="flex flex-col items-center mb-6 text-center">
          <BH360LogoMark size={56} />
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-ping" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Birth Hub · <span className="text-[#00D4FF]">v4.2 Enterprise</span>
            </span>
          </div>
        </div>

        {/* Card Central de Login */}
        <div className="w-full max-w-[480px] mb-12">
          <div className="mb-6 text-center">
            {/* SVG 13: Zero Trust Lock Shield */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest mb-3.5 bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] shadow-lg shadow-[#F59E0B]/10 mx-auto">
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="5"
                  y="11"
                  width="14"
                  height="10"
                  rx="3"
                  stroke="#F59E0B"
                  strokeWidth="1.8"
                  fill="rgba(245, 158, 11, 0.15)"
                />
                <path
                  d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11"
                  stroke="#F59E0B"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16" r="1.5" fill="#F59E0B" />
              </svg>
              <span>Acesso Seguro · Zero Trust Architecture</span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-extrabold landing-title-gradient tracking-tight mb-2 leading-tight text-center flex items-center justify-center gap-3">
              <AuthModalSectionIcon size={32} />
              <span>
                {authMode === 'signup'
                  ? 'Criar conta corporativa'
                  : authMode === 'forgot'
                    ? 'Redefinir Senha'
                    : 'Acessar conta'}
              </span>
            </h2>
            <p className="landing-subtitle font-sans text-xs sm:text-sm font-medium max-w-[380px] mx-auto leading-relaxed text-center">
              {authMode === 'signup'
                ? 'Preencha suas informações corporativas para solicitar acesso.'
                : authMode === 'forgot'
                  ? 'Informe seu e-mail corporativo para receber o link de recuperação.'
                  : 'Central de inteligência comercial, previsibilidade e governança integrada.'}
            </p>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 shadow-2xl rounded-2xl p-6 sm:p-8 relative">
            {/* Abas E-mail vs SSO — SEM FUNDO BRANCO */}
            {authMode === 'signin' && (
              <div
                className="grid grid-cols-2 gap-1.5 mb-6 p-1 bg-[#0B1120] border border-slate-800 rounded-xl"
                role="tablist"
              >
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`py-2.5 px-4 text-xs font-mono font-bold flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all ${
                    authMethod === 'email'
                      ? 'bg-[#00D4FF]/20 border border-[#00D4FF] text-[#00D4FF] shadow-lg'
                      : 'text-slate-400 hover:text-white bg-[#0F172A]'
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
                      ? 'bg-[#00D4FF]/20 border border-[#00D4FF] text-[#00D4FF] shadow-lg'
                      : 'text-slate-400 hover:text-white bg-[#0F172A]'
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
                className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="font-medium font-sans">{errorMessage}</p>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-start gap-2.5 text-xs text-emerald-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="font-medium font-sans">{successMessage}</p>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-name"
                    className="block font-mono text-xs font-bold text-slate-300 uppercase tracking-wider"
                  >
                    Nome Completo
                  </label>
                  <input
                    id="login-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0B1120] text-white border border-slate-700 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-500"
                    placeholder="Ex: Carlos Mendes"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-email"
                    className="block font-mono text-xs font-bold text-slate-300 uppercase tracking-wider"
                  >
                    {authMethod === 'sso' ? 'E-mail ou Domínio SSO' : 'E-mail Corporativo'}
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
                  className="w-full bg-[#0B1120] text-white border border-slate-700 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-500"
                  placeholder={authMethod === 'sso' ? 'empresa.com.br' : 'seu.nome@empresa.com.br'}
                  required
                  autoComplete="email"
                />
              </div>

              {authMode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block font-mono text-xs font-bold text-slate-300 uppercase tracking-wider"
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
                      className="w-full bg-[#0B1120] text-white border border-slate-700 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-4 py-3 text-sm outline-none transition-all pr-11 placeholder:text-slate-500"
                      placeholder="••••••••••••"
                      required
                      autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00D4FF] transition-colors p-1"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'signin' && (
                <div className="flex items-center justify-between pt-1 font-sans text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-[#0B1120] text-[#00D4FF] focus:ring-0 focus:ring-offset-0 cursor-pointer"
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

              {/* Botão de Enviar — ZERO FUNDO BRANCO */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-cta-light w-full h-[52px] rounded-xl font-mono text-base font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>
                    <span>
                      {authMode === 'signup'
                        ? 'Solicitar Provisionamento'
                        : authMode === 'forgot'
                          ? 'Enviar Link de Redefinição'
                          : 'Entrar no Birth Hub'}
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 text-white" />
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
                  className="font-sans text-xs text-slate-300 hover:text-[#00D4FF] transition-colors cursor-pointer"
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
                  className="font-sans text-xs text-slate-300 hover:text-[#00D4FF] transition-colors cursor-pointer"
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
                  className="font-sans text-xs text-slate-300 hover:text-[#00D4FF] transition-colors cursor-pointer"
                >
                  Voltar para{' '}
                  <span className="font-bold text-[#00D4FF] hover:underline">
                    Login Corporativo
                  </span>
                </button>
              )}
            </div>

            {/* SSO — BOTÕES SEM FUNDO BRANCO */}
            {authMode === 'signin' && (
              <div className="mt-6">
                <div className="relative flex items-center justify-center mb-4">
                  <div className="w-full border-t border-slate-800" />
                  <span className="absolute bg-[#0F172A] px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                    ou acesse com
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    className="btn-social-dark flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-mono font-bold cursor-pointer"
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
                    className="btn-social-dark flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-mono font-bold cursor-pointer"
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
                    className="btn-social-dark flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-mono font-bold cursor-pointer"
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
            <div className="bg-[#0F172A] border border-slate-800 flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-[#00D4FF] truncate">
                  AES-256
                </div>
                <div className="font-sans text-[9px] text-slate-400 truncate">Criptografado</div>
              </div>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#FF2D9B] shadow-[0_0_8px_#FF2D9B] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-[#FF2D9B] truncate">
                  SSO &amp; MFA
                </div>
                <div className="font-sans text-[9px] text-slate-400 truncate">Autenticação</div>
              </div>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-[0_0_8px_#F59E0B] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-[#F59E0B] truncate">
                  LGPD/GDPR
                </div>
                <div className="font-sans text-[9px] text-slate-400 truncate">Conformidade</div>
              </div>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-[#00D4FF] truncate">
                  99.99%
                </div>
                <div className="font-sans text-[9px] text-slate-400 truncate">Uptime SLA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
