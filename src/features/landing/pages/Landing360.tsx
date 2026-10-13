import { useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  Compass,
  Cpu,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Lock,
  Mail,
  Network,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Workflow,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.js';
import { authClient } from '../../../lib/auth-client.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { BirthHubLogo } from '../../../components/brand/BirthHubLogo.js';
import './Landing360.css';

// 8 PILARES OFICIAIS COMPLETOS DO BIRTH HUB 360° (PALETA NEON OFICIAL)
const OFFICIAL_PILLARS = [
  {
    id: '01',
    slug: 'HUB',
    name: 'HUB COMERCIAL',
    desc: 'Centralização de contas, pipeline comercial unificado e visão 360° de cada oportunidade em negociação.',
    symbol: '◉',
    color: 'var(--color-heading-cyan)', // Azul Neon
    tag: 'Pipeline Central',
    focus: 'Gestão Unificada de Oportunidades',
  },
  {
    id: '02',
    slug: 'INTEL',
    name: 'INTELIGÊNCIA DE MERCADO',
    desc: 'Enriquecimento analítico de dados B2B, sinais de compra, qualificação precisa e inteligência de decisores.',
    symbol: '◎',
    color: 'var(--color-heading-pink)', // Rosa Neon
    tag: 'Decisão por Dados',
    focus: 'Sinais & Qualificação Preditiva',
  },
  {
    id: '03',
    slug: 'ORCH',
    name: 'ORQUESTRAÇÃO DE VENDAS',
    desc: 'Cadências multicanal coordenadas, regras de transição de bastão e alinhamento operacional de ponta a ponta.',
    symbol: '⟶',
    color: 'var(--color-heading-cyan)', // Azul Neon
    tag: 'Fluxos Integrados',
    focus: 'Cadências & Passagem de Bastão',
  },
  {
    id: '04',
    slug: 'PERF',
    name: 'PERFORMANCE COMERCIAL',
    desc: 'Telemetria de conversão, velocidade de avanço no funil, metas operacionais e produtividade da equipe.',
    symbol: '▥',
    color: 'var(--color-heading-gold)', // Dourado Neon
    tag: 'Metas & Velocidade',
    focus: 'Métricas & Conversão em Tempo Real',
  },
  {
    id: '05',
    slug: 'FORE',
    name: 'PREVISIBILIDADE COMERCIAL',
    desc: 'Modelagem estatística de probabilidade, análise de pipeline ponderado e cenários embasados no histórico real.',
    symbol: '⌁',
    color: 'var(--color-heading-gold)', // Dourado Neon
    tag: 'Pipeline Ponderado',
    focus: 'Cenários & Probabilidade Real',
  },
  {
    id: '06',
    slug: 'AI',
    name: 'INTELIGÊNCIA ARTIFICIAL',
    desc: 'Copiloto comercial ancorado nos dados da empresa, diagnóstico de entraves e suporte ativo em negociações.',
    symbol: '✦',
    color: 'var(--color-heading-iris)', // Rosa Neon
    tag: 'Copiloto & Modelos',
    focus: 'Agentes & Diagnóstico Contextual',
  },
  {
    id: '07',
    slug: 'AUTO',
    name: 'AUTOMAÇÃO & CONECTIVIDADE',
    desc: 'Sincronização contínua bidirecional, gatilhos de follow-up em tempo real e integração profunda com Bitrix24.',
    symbol: '◇',
    color: 'var(--color-heading-cyan)', // Azul Neon
    tag: 'Gatilhos & Bitrix24',
    focus: 'Integrações & Ações Instantâneas',
  },
  {
    id: '08',
    slug: 'ENG',
    name: 'ENGAJAMENTO COMERCIAL',
    desc: 'Comunicação integrada, telefonia em nuvem, histórico de interações e rastreabilidade total de contatos.',
    symbol: '◌',
    color: 'var(--color-heading-pink)', // Rosa Neon
    tag: 'Voz & Omnichannel',
    focus: 'Telefonia & Registro de Contato',
  },
] as const;

// TAGS DE CAPACIDADES DA PLATAFORMA (PALETA NEON OFICIAL)
const FEATURE_TAGS = [
  { label: 'Pipeline Centralizado', color: 'var(--color-heading-cyan)' },
  { label: 'Inteligência B2B', color: 'var(--color-heading-pink)' },
  { label: 'Cadências Automatizadas', color: 'var(--color-heading-cyan)' },
  { label: 'Velocidade de Ciclo', color: 'var(--color-heading-gold)' },
  { label: 'Cenários Ponderados', color: 'var(--color-heading-gold)' },
  { label: 'Copiloto Comercial IA', color: 'var(--color-heading-pink)' },
  { label: 'Conectividade Bitrix24', color: 'var(--color-heading-cyan)' },
  { label: 'Telefonia & Voz Ativa', color: 'var(--color-heading-pink)' },
];

function BH360LogoMark({ size = 52 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="inline-block">
      <BirthHubLogo variant="icon" title="Birth Hub 360º" className="w-full h-full" />
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-brand w-10 h-10" />
      </div>
    );
  }

  return (
    <main className="relative w-full min-h-screen bg-background text-ink-2 font-sans selection:bg-pink/30 selection:text-brand landing-neon-root">
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
                  <span className="text-brand">Birth Hub</span>
                  <span className="text-pink ml-1 font-extrabold">360°</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand/70 font-semibold">
                  Command Center
                </span>
              </div>
            </a>

            {/* Links de navegação desktop */}
            <nav className="hidden xl:flex items-center gap-6 font-mono text-xs font-semibold text-ink-2/70">
              <a href="#problema" className="hover:text-brand transition-colors">
                Problema
              </a>
              <a href="#plataforma" className="hover:text-brand transition-colors">
                Plataforma
              </a>
              <a href="#pilares" className="hover:text-brand transition-colors">
                8 Pilares
              </a>
              <a href="#fluxo" className="hover:text-brand transition-colors">
                Fluxo
              </a>
              <a href="#ia" className="hover:text-brand transition-colors">
                IA
              </a>
              <a href="#automacao" className="hover:text-brand transition-colors">
                Automação
              </a>
              <a href="#performance" className="hover:text-brand transition-colors">
                Performance
              </a>
              <a href="#previsibilidade" className="hover:text-brand transition-colors">
                Previsibilidade
              </a>
              <a href="#ecossistema" className="hover:text-brand transition-colors">
                Ecossistema
              </a>
            </nav>
          </div>
        </header>

        {/* 2. HERO */}
        <section
          id="hero"
          className="relative px-5 py-12 sm:px-8 lg:px-14 overflow-hidden border-b border-brand bg-background"
        >
          {/* Fundo estrutural em grid e halos sutis neon */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-40"
            aria-hidden="true"
            style={{
              backgroundImage: 'none',
              backgroundSize: '48px 48px',
            }}
          />
          <div className="pointer-events-none absolute top-10 right-10 w-[500px] h-[500px] rounded-full blur-[130px] bg-brand/15" />
          <div className="pointer-events-none absolute bottom-0 left-10 w-[450px] h-[450px] rounded-full blur-[130px] bg-pink/15" />

          <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center text-center">
            {/* Badge de Categoria */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-brand/10 border border-brand/40 text-brand shadow-[var(--shadow-card)] mb-4">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              SISTEMA OPERACIONAL COMERCIAL
            </div>

            {/* Headlines Principais — Cores Neon Oficiais (Nunca Branco ou Preto) */}
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] max-w-4xl">
              <span className="text-[var(--color-heading-gold)]">Dados que Conectam.</span>
              <br />
              <span className="text-[var(--color-heading-gold)]">Inteligência que Decide.</span>
              <br />
              <span className="text-[var(--color-heading-gold)]">Execução que Acontece.</span>
            </h1>

            {/* Subheadline Oficial */}
            <p className="mt-6 text-base sm:text-lg md:text-xl font-normal text-ink-2/80 max-w-3xl leading-relaxed">
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
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl border border-brand/40 bg-surface hover:bg-brand text-brand font-mono text-sm font-bold uppercase tracking-wider transition-colors shadow-[var(--shadow-card)]"
              >
                <span>Ver os 8 Pilares</span>
                <Compass className="w-4 h-4 text-brand" />
              </a>
            </div>

            {/* Capacidades reais: mesma nomenclatura e explicações do produto. */}
            <div className="mt-10 pt-6 border-t border-line w-full">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-brand mb-5">
                Capacidades Operacionais Integradas
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURE_TAGS.map((tag, index) => (
                  <div
                    key={tag.label}
                    className="capability-card"
                    style={{ borderColor: tag.color, animationDelay: `${index * 45}ms` }}
                  >
                    <span
                      className="block mx-auto mb-3 w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    />
                    <h2
                      className="font-display font-semibold text-[17px] leading-snug"
                      style={{ color: tag.color }}
                    >
                      {tag.label}
                    </h2>
                    <p className="mt-3 text-[15px] leading-[1.7]">{OFFICIAL_PILLARS[index].desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. PROBLEMA */}
        <section
          id="problema"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-background border-b border-brand"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-pink/10 border border-pink/40 text-pink mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />O Gargalo Estrutural das Empresas
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-pink tracking-tight drop-shadow-[var(--shadow-card)]">
                A realidade de operar com dados fragmentados e equipes no escuro
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-2/80 leading-relaxed">
                Empresas investem em múltiplas ferramentas, mas continuam sem clareza sobre onde o
                pipeline está travado, quais negócios realmente têm chance de fechar e o que cada
                vendedor deve fazer a seguir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6 border-l-4 border-l-[#FF2D9B]">
                <div className="w-10 h-10 rounded-xl bg-pink/20 text-pink flex items-center justify-center font-bold mb-4">
                  01
                </div>
                <h3 className="font-display text-lg font-bold text-pink mb-2">
                  Silos e Ferramentas Desconectadas
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
                  O CRM não fala em tempo real com a telefonia, as trocas de WhatsApp ficam perdidas
                  no celular do vendedor e os dados de prospecção não retroalimentam o time de
                  fechamento.
                </p>
              </div>

              <div className="section-card p-6 border-l-4 border-l-[#FFC107]">
                <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold flex items-center justify-center font-bold mb-4">
                  02
                </div>
                <h3 className="font-display text-lg font-bold text-gold mb-2">
                  Gestão Reativa &amp; Decisões Tardias
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
                  Gestores passam o dia cobrando preenchimento manual de planilhas e só descobrem
                  que a meta não será atingida nos últimos dias do mês, quando já não há tempo hábil
                  para corrigir o curso.
                </p>
              </div>

              <div className="section-card p-6 border-l-4 border-l-[#00D4FF]">
                <div className="w-10 h-10 rounded-xl bg-brand/20 text-brand flex items-center justify-center font-bold mb-4">
                  03
                </div>
                <h3 className="font-display text-lg font-bold text-brand mb-2">
                  Perda Invisível de Oportunidades
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
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
          className="px-5 py-16 sm:px-8 lg:px-14 bg-brand border-b border-brand"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold mb-3">
                <Layers className="w-3.5 h-3.5" />
                Arquitetura One OS
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-gold tracking-tight drop-shadow-[var(--shadow-card)]">
                Um único sistema operacional para planejar, monitorar e acelerar
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-2/80 leading-relaxed">
                O Birth Hub 360° unifica a governança de dados, os algoritmos de diagnóstico e o
                centro de comando diário da sua equipe comercial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase text-brand">Camada 1</span>
                </div>
                <h3 className="font-display text-base font-bold text-brand mb-2">
                  Dados &amp; Integração Contínua
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
                  Conexão com Bitrix24, e-mails corporativos, canais de mensageria e dados
                  enriquecidos de empresas B2B consolidados em uma única fonte de verdade.
                </p>
              </div>

              <div className="section-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-pink/15 text-pink flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase text-pink">Camada 2</span>
                </div>
                <h3 className="font-display text-base font-bold text-pink mb-2">
                  Motor de Diagnóstico &amp; IA
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
                  Algoritmos contextuais que avaliam a saúde de cada deal, detectam riscos em tempo
                  real e sugerem a próxima melhor ação para fechar com maior margem.
                </p>
              </div>

              <div className="section-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase text-gold">Camada 3</span>
                </div>
                <h3 className="font-display text-base font-bold text-gold mb-2">
                  Execução &amp; Orquestração
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
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
          className="px-5 py-16 sm:px-8 lg:px-14 bg-background border-b border-brand"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold mb-3">
                <Target className="w-3.5 h-3.5" />
                ESTRUTURA OFICIAL DO PRODUTO
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-gold tracking-tight drop-shadow-[var(--shadow-card)]">
                Os 8 Pilares Oficiais do Birth Hub 360°
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-2/80 leading-relaxed">
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
                      borderColor: isActive ? p.color : p.color,
                      borderWidth: isActive ? '2px' : '1.5px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    {/* Barra de destaque colorida superior */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl transition-all duration-300 group-hover:h-2"
                      style={{
                        background: p.color,
                      }}
                    />

                    {/* Topo do Card */}
                    <div className="flex items-center justify-between mb-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${p.color} 8%, transparent)`,
                            color: p.color,
                            border: `1px solid ${p.color}`,
                          }}
                        >
                          {p.id}
                        </span>
                        <span
                          className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${p.color} 8%, transparent)`,
                            color: p.color,
                          }}
                        >
                          {p.slug}
                        </span>
                      </div>

                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base transition-transform duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${p.color} 8%, transparent)`,
                          color: p.color,
                          border: `1px solid ${p.color}`,
                        }}
                      >
                        {p.symbol}
                      </div>
                    </div>

                    {/* Conteúdo do Card com Nome Oficial */}
                    <div className="flex-1 my-1">
                      <h3
                        className="font-display text-sm sm:text-base font-bold leading-tight mb-1"
                        style={{ color: p.color, textShadow: 'var(--shadow-card)' }}
                      >
                        {p.name}
                      </h3>
                      <p className="font-sans text-xs text-ink-2/70 leading-snug mb-3">{p.desc}</p>
                      <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-brand text-ink-2/90 border border-brand/20">
                        Foco: {p.focus}
                      </div>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="mt-4 pt-2.5 border-t border-brand flex items-center justify-between">
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
        <section id="fluxo" className="px-5 py-16 sm:px-8 lg:px-14 bg-brand border-b border-brand">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold mb-3">
                <Workflow className="w-3.5 h-3.5" />
                CICLO OPERACIONAL COMPLETO
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-[#FFC107] via-[#FF2D9B] to-[#00D4FF] bg-clip-text text-transparent tracking-tight drop-shadow-[var(--shadow-card)]">
                Como os dados fluem da prospecção ao fechamento
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-2/80">
                Cada etapa é governada por automações e inteligência para garantir velocidade e zero
                perda de oportunidades.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-brand mb-2">ETAPA 01</div>
                <h4 className="font-display text-sm font-bold text-brand mb-1">
                  Entrada &amp; Captura
                </h4>
                <p className="text-xs text-ink-2/70">
                  Leads e contas são integrados via Bitrix24, campanhas ou prospecção ativa.
                </p>
              </div>

              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-pink mb-2">ETAPA 02</div>
                <h4 className="font-display text-sm font-bold text-pink mb-1">
                  Enriquecimento B2B
                </h4>
                <p className="text-xs text-ink-2/70">
                  Dados de receita, decisores e porte validam o fit do cliente ideal (ICP).
                </p>
              </div>

              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-gold mb-2">ETAPA 03</div>
                <h4 className="font-display text-sm font-bold text-gold mb-1">
                  Cadência &amp; SLA
                </h4>
                <p className="text-xs text-ink-2/70">
                  Distribuição instantânea ao SDR com réguas de contato automáticas.
                </p>
              </div>

              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-pink mb-2">ETAPA 04</div>
                <h4 className="font-display text-sm font-bold text-pink mb-1">Apoio com IA</h4>
                <p className="text-xs text-ink-2/70">
                  Copiloto analisa objeções, histórico e recomenda a abordagem ideal.
                </p>
              </div>

              <div className="flow-step-card p-5">
                <div className="font-mono text-xs font-bold text-gold mb-2">ETAPA 05</div>
                <h4 className="font-display text-sm font-bold text-gold mb-1">
                  Fechamento &amp; Dados
                </h4>
                <p className="text-xs text-ink-2/70">
                  Contrato fechado e aprendizados de win/loss retroalimentam o sistema.
                </p>
              </div>
            </div>

            {/* Demonstração Real do Motor de Prospecção — Radar Discovery */}
            <div className="mt-12 rounded-2xl border border-brand/30 bg-surface p-4 sm:p-6 shadow-[var(--shadow-card)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-brand">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand">
                    Radar Discovery em Operação Real · Fontes Abertas
                  </span>
                </div>
                <span className="font-mono text-[11px] text-ink-2/60">
                  Captura de tela real do produto · Desktop &amp; Mobile
                </span>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-brand/20 bg-background">
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

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-2/70 font-mono">
                <span>✦ ICP Filtrado por Segmento, Região e Personas B2B</span>
                <span className="text-brand">Integração nativa com Bitrix24 &amp; CRM</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. IA (INTELIGÊNCIA ARTIFICIAL CONTEXTUAL) */}
        <section
          id="ia"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-background border-b border-brand"
        >
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10">
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-pink/10 border border-pink/40 text-pink mb-3">
                <Bot className="w-3.5 h-3.5" />
                IA COM CONTEXTO OPERACIONAL REAL
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-pink tracking-tight mb-4 drop-shadow-[var(--shadow-card)]">
                Inteligência Artificial que compreende o seu pipeline
              </h2>
              <p className="text-sm sm:text-base text-ink-2/80 leading-relaxed mb-6">
                Ao contrário de ferramentas genéricas de texto, a IA do Birth Hub 360° é diretamente
                conectada aos dados operacionais do seu CRM, entendendo o estágio de cada
                negociação, o histórico de contatos e as objeções recorrentes.
              </p>
              <div className="space-y-3 font-sans text-xs sm:text-sm text-ink-2/90">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-pink/20 text-pink flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    <strong className="text-brand">Diagnóstico de Entraves:</strong> Alerta deals
                    estagnados com sugestões claras de destravamento.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-pink/20 text-pink flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    <strong className="text-pink">Próxima Melhor Ação:</strong> Recomendações
                    acionáveis para o vendedor avançar o contato.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-pink/20 text-pink flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    <strong className="text-gold">Isolamento &amp; Segurança:</strong> Seus dados
                    comerciais jamais são utilizados para treinar modelos públicos.
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="section-card p-6 border-2 border-pink/30 bg-surface">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-pink" />
                    <span className="font-mono text-xs font-bold text-pink">
                      COPILOTO COMERCIAL ATIVO
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-2/50">Contexto: Deal #4892</span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-brand border border-pink/25 text-ink-2/80">
                    <span className="text-pink font-bold">Diagnóstico:</span> Negociação de R$ 140k
                    sem retorno há 4 dias após envio de proposta.
                  </div>
                  <div className="p-3 rounded-xl bg-brand border border-brand/25 text-ink-2/80">
                    <span className="text-brand font-bold">Ação Sugerida:</span> Disparar cadência
                    de validação de decisor financeiro abordando ROI estimado em 90 dias.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. AUTOMAÇÃO (& CONECTIVIDADE) */}
        <section
          id="automacao"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-brand border-b border-brand"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-pink/10 border border-pink/40 text-pink mb-3">
                <Workflow className="w-3.5 h-3.5" />
                AUTOMAÇÃO OPERACIONAL
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-pink tracking-tight drop-shadow-[var(--shadow-card)]">
                Eficiência sem desumanizar o contato comercial
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-2/80">
                Remova tarefas braçais repetitivas e deixe seu time focado no que gera receita:
                construir relacionamentos e fechar negócios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6">
                <h3 className="font-display text-base font-bold text-brand mb-2">
                  Sincronização Bitrix24
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
                  Atualizações automáticas de campos, estágios de oportunidade e tarefas sem
                  necessidade de digitação dupla.
                </p>
              </div>
              <div className="section-card p-6">
                <h3 className="font-display text-base font-bold text-pink mb-2">
                  Gatilhos de Comportamento
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
                  Aberturas de proposta, acessos a links ou ausência de contato disparam alertas
                  imediatos para a equipe responsável.
                </p>
              </div>
              <div className="section-card p-6">
                <h3 className="font-display text-base font-bold text-gold mb-2">
                  Distribuição Inteligente
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
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
          className="px-5 py-16 sm:px-8 lg:px-14 bg-background border-b border-brand"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold mb-3">
                <BarChart3 className="w-3.5 h-3.5" />
                TELEMETRIA DE RESULTADOS
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-gold tracking-tight drop-shadow-[var(--shadow-card)]">
                Visibilidade cirúrgica da tração e das metas
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-2/80">
                Monitore taxas de passagem por fase, tempo de permanência em cada estágio e
                produtividade real da equipe.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="section-card p-5 border-t-4 border-t-[#00D4FF]">
                <div className="font-mono text-xs text-brand/70 uppercase">Taxa de Conversão</div>
                <div className="font-display text-2xl font-extrabold text-brand my-1">
                  Funil 360°
                </div>
                <p className="text-xs text-ink-2/70">
                  Acompanhamento da taxa de conversão entre cada etapa do pipeline.
                </p>
              </div>

              <div className="section-card p-5 border-t-4 border-t-[#FF2D9B]">
                <div className="font-mono text-xs text-pink/70 uppercase">Velocidade de Vendas</div>
                <div className="font-display text-2xl font-extrabold text-pink my-1">
                  Ciclo Médio
                </div>
                <p className="text-xs text-ink-2/70">
                  Identificação do tempo exato que um lead leva da qualificação ao fechamento.
                </p>
              </div>

              <div className="section-card p-5 border-t-4 border-t-[#FFC107]">
                <div className="font-mono text-xs text-gold/70 uppercase">Gestão de Metas</div>
                <div className="font-display text-2xl font-extrabold text-gold my-1">
                  Ritmo &amp; Pace
                </div>
                <p className="text-xs text-ink-2/70">
                  Comparativo diário de faturamento atingido versus meta mensal estabelecida.
                </p>
              </div>

              <div className="section-card p-5 border-t-4 border-t-[#00D4FF]">
                <div className="font-mono text-xs text-brand/70 uppercase">Motivos de Perda</div>
                <div className="font-display text-2xl font-extrabold text-brand my-1">
                  Win / Loss
                </div>
                <p className="text-xs text-ink-2/70">
                  Análise estruturada de causas de perda para correção contínua do produto.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 10. PREVISIBILIDADE COMERCIAL */}
        <section
          id="previsibilidade"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-brand border-b border-brand"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold mb-3">
                <TrendingUp className="w-3.5 h-3.5" />
                RIGOR ANALÍTICO
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-gold tracking-tight drop-shadow-[var(--shadow-card)]">
                Previsibilidade comercial baseada em dados reais
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-2/80 leading-relaxed">
                Sem promessas mágicas: modelagem estatística séria que pondera a maturidade do
                pipeline e as taxas históricas de conversão.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="section-card p-6">
                <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold flex items-center justify-center font-bold mb-3">
                  1
                </div>
                <h3 className="font-display text-base font-bold text-gold mb-2">
                  Pipeline Ponderado
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
                  Cálculo de probabilidade de fechamento por estágio formal de negociação, evitando
                  expectativas infladas de receita.
                </p>
              </div>

              <div className="section-card p-6">
                <div className="w-8 h-8 rounded-lg bg-brand/20 text-brand flex items-center justify-center font-bold mb-3">
                  2
                </div>
                <h3 className="font-display text-base font-bold text-brand mb-2">
                  Maturidade de Dados
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
                  O sistema reconhece que a precisão preditiva depende da consistência de
                  preenchimento e do histórico da organização.
                </p>
              </div>

              <div className="section-card p-6">
                <div className="w-8 h-8 rounded-lg bg-pink/20 text-pink flex items-center justify-center font-bold mb-3">
                  3
                </div>
                <h3 className="font-display text-base font-bold text-pink mb-2">
                  Cenários Conservador &amp; Otimista
                </h3>
                <p className="text-xs sm:text-sm text-ink-2/70 leading-relaxed">
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
          className="px-5 py-16 sm:px-8 lg:px-14 bg-background border-b border-brand"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-brand/10 border border-brand/40 text-brand mb-3">
                <Network className="w-3.5 h-3.5" />
                CONECTIVIDADE ENTERPRISE
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-brand tracking-tight drop-shadow-[var(--shadow-card)]">
                Integrado ao ecossistema tecnológico da sua empresa
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-2/80">
                Construído para operar em harmonia com as ferramentas corporativas que você já
                utiliza.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-surface border border-brand text-center">
                <div className="font-mono text-sm font-bold text-brand">Bitrix24</div>
                <div className="font-sans text-xs text-ink-2/60 mt-1">Sincronização Nativa</div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-brand text-center">
                <div className="font-mono text-sm font-bold text-pink">WhatsApp API</div>
                <div className="font-sans text-xs text-ink-2/60 mt-1">Comunicação Direta</div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-brand text-center">
                <div className="font-mono text-sm font-bold text-gold">Telefonia em Nuvem</div>
                <div className="font-sans text-xs text-ink-2/60 mt-1">Gravação &amp; Métricas</div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-brand text-center">
                <div className="font-mono text-sm font-bold text-brand">Webhooks &amp; APIs</div>
                <div className="font-sans text-xs text-ink-2/60 mt-1">Conexão Flexível</div>
              </div>
            </div>
          </div>
        </section>

        {/* 12. COMMAND CENTER */}
        <section
          id="command-center"
          className="px-5 py-16 sm:px-8 lg:px-14 bg-brand border-b border-brand"
        >
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10">
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-pink/10 border border-pink/40 text-pink mb-3">
                <Compass className="w-3.5 h-3.5" />
                COCKPIT OPERACIONAL
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-pink tracking-tight mb-4 drop-shadow-[var(--shadow-card)]">
                O centro de comando unificado para liderança e time
              </h2>
              <p className="text-sm sm:text-base text-ink-2/80 leading-relaxed mb-6">
                Tenha um ambiente único onde diretores acompanham a saúde da receita, gerentes
                supervisionam gargalos em tempo real e executivos de vendas recebem sua rotina de
                atividades organizada por prioridade.
              </p>
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-surface border border-brand text-ink-2/80">
                  <span className="font-bold text-brand">SDRs &amp; BDRs:</span> Fila organizada e
                  dados enriquecidos na tela.
                </div>
                <div className="p-3 rounded-xl bg-surface border border-brand text-ink-2/80">
                  <span className="font-bold text-gold">Closers:</span> Histórico 360°, objeções e
                  apoio do copiloto.
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="section-card p-6 bg-surface border-2 border-brand/30">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand">
                  <span className="font-mono text-xs font-bold text-brand">
                    BIRTH HUB 360° · COCKPIT
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-brand/20 text-brand font-bold">
                    100% OPERACIONAL
                  </span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-brand border border-brand">
                    <span className="text-ink-2/70">Leads Ativos na Fila</span>
                    <span className="font-bold text-brand">184 contatos</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-brand border border-brand">
                    <span className="text-ink-2/70">Deals com Risco Identificado</span>
                    <span className="font-bold text-gold">3 oportunidades</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-brand border border-brand">
                    <span className="text-ink-2/70">Cadências em Execução</span>
                    <span className="font-bold text-pink">12 ativas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 13. CTA (CALL TO ACTION) */}
        <section
          id="cta"
          className="px-5 py-20 sm:px-8 lg:px-14 bg-background text-center border-b border-brand"
        >
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold bg-gradient-to-r from-[#FFC107] via-[#FF2D9B] to-[#00D4FF] bg-clip-text text-transparent tracking-tight leading-tight drop-shadow-[var(--shadow-card)]">
              Pronto para transformar sua operação comercial em um centro de comando inteligente?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-ink-2/80 max-w-2xl mx-auto">
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
        <footer className="px-5 py-10 sm:px-8 lg:px-14 bg-background">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 border-b border-brand pb-8 mb-6">
            <div className="flex items-center gap-3">
              <BH360LogoMark size={42} />
              <div>
                <div className="font-display text-lg font-bold text-brand">
                  Birth Hub <span className="text-pink">360°</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-gold">
                  Business Command Center
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-xs text-ink-2/70">
              <a href="#problema" className="hover:text-brand transition-colors">
                Problema
              </a>
              <a href="#plataforma" className="hover:text-brand transition-colors">
                Plataforma
              </a>
              <a href="#pilares" className="hover:text-brand transition-colors">
                8 Pilares
              </a>
              <a href="#fluxo" className="hover:text-brand transition-colors">
                Fluxo
              </a>
              <a href="#ia" className="hover:text-brand transition-colors">
                IA
              </a>
              <a href="#performance" className="hover:text-brand transition-colors">
                Performance
              </a>
              <a href="#previsibilidade" className="hover:text-brand transition-colors">
                Previsibilidade
              </a>
            </div>
          </div>

          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-ink-2/50">
            <p>© {new Date().getFullYear()} Birth Hub 360°. Todos os direitos reservados.</p>
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
        className={`fixed inset-0 w-full h-full flex flex-col items-center justify-start z-50 bg-background px-5 py-8 sm:px-10 lg:px-16 overflow-y-auto transition-all duration-500 ${
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
          className="self-start mb-6 text-ink-2/70 hover:text-brand transition-colors flex items-center gap-2 font-mono text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar ao Início</span>
        </button>

        {/* Status Superior */}
        <div className="w-full max-w-[480px] flex items-center justify-center mb-6">
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface border border-line shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
            </span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-2/80">
              Birth Hub · <span className="text-brand">v4.2 Enterprise</span>
            </span>
          </div>
        </div>

        {/* Card Central de Login */}
        <div className="w-full max-w-[480px] mb-12">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest mb-3.5 bg-gold/10 border border-gold/30 text-gold shadow-lg shadow-[var(--shadow-card)]/10">
              <ShieldCheck className="w-4 h-4 text-gold" />
              Acesso Seguro · Zero Trust Architecture
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gold drop-shadow-[var(--shadow-card)] tracking-tight mb-2 leading-tight">
              {authMode === 'signup'
                ? 'Criar conta corporativa'
                : authMode === 'forgot'
                  ? 'Redefinir Senha'
                  : 'Acessar conta'}
            </h2>
            <p className="font-sans text-xs sm:text-sm text-ink-2/70 font-medium max-w-[380px] mx-auto leading-relaxed">
              {authMode === 'signup'
                ? 'Preencha suas informações corporativas para solicitar acesso.'
                : authMode === 'forgot'
                  ? 'Informe seu e-mail corporativo para receber o link de recuperação.'
                  : 'Central de inteligência comercial, previsibilidade e governança integrada.'}
            </p>
          </div>

          <div className="bg-surface border border-line shadow-2xl shadow-black/80 rounded-2xl p-6 sm:p-8 relative">
            {/* Abas E-mail vs SSO */}
            {authMode === 'signin' && (
              <div
                className="grid grid-cols-2 gap-1.5 mb-6 p-1 bg-background border border-line rounded-xl"
                role="tablist"
              >
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`py-2.5 px-4 text-xs font-mono font-bold flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all ${
                    authMethod === 'email'
                      ? 'bg-brand/20 border border-brand text-brand shadow-lg shadow-[var(--shadow-card)]/30'
                      : 'text-ink-2/70 hover:text-ink-2 hover:bg-brand'
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
                      ? 'bg-brand/20 border border-brand text-brand shadow-lg shadow-[var(--shadow-card)]/30'
                      : 'text-ink-2/70 hover:text-ink-2 hover:bg-brand'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>SSO Empresarial</span>
                </button>
              </div>
            )}

            {/* Alertas */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-pink/30 bg-pink/10 p-3.5 text-xs text-pink">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-pink" />
                <p className="font-medium font-sans">{errorMessage}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/10 p-3.5 text-xs text-brand">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                <p className="font-medium font-sans">{successMessage}</p>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-name"
                    className="block font-mono text-xs font-bold text-ink-2/80 uppercase tracking-wider"
                  >
                    Nome Completo
                  </label>
                  <input
                    id="login-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background text-ink-2 border border-line focus:border-brand focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-ink-2/30"
                    placeholder="Ex: Carlos Mendes"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-email"
                    className="block font-mono text-xs font-bold text-ink-2/80 uppercase tracking-wider"
                  >
                    {authMethod === 'sso' ? 'E-mail ou Domínio SSO' : 'E-mail Corporativo'}
                  </label>
                  <span className="font-mono text-[10px] text-brand/70">Domínio empresarial</span>
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-2/40 group-focus-within:text-brand transition-colors duration-200" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background text-ink-2 border border-line focus:border-brand focus:ring-1 focus:ring-[#00D4FF] rounded-xl pl-12 pr-4 py-3 text-sm outline-none transition-all placeholder:text-ink-2/30"
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
                      className="block font-mono text-xs font-bold text-ink-2/80 uppercase tracking-wider"
                    >
                      Senha de Acesso
                    </label>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-2/40 group-focus-within:text-brand transition-colors duration-200" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-background text-ink-2 border border-line focus:border-brand focus:ring-1 focus:ring-[#00D4FF] rounded-xl pl-12 pr-12 py-3 text-sm outline-none transition-all placeholder:text-ink-2/30"
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-2/40 hover:text-brand transition-colors focus:outline-none cursor-pointer"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'signin' && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-ink-2/70 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-line text-brand focus:ring-[#00D4FF] accent-[#00D4FF] cursor-pointer"
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
                    className="font-sans text-xs font-semibold text-brand hover:underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[52px] rounded-xl font-mono text-base font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-[var(--shadow-card)]/20 bg-surface border-2 border-brand text-brand hover:border-pink hover:text-pink hover:shadow-[var(--shadow-card)]/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brand" />
                ) : (
                  <>
                    <span>
                      {authMode === 'signup'
                        ? 'Solicitar Provisionamento'
                        : authMode === 'forgot'
                          ? 'Enviar Link de Redefinição'
                          : 'Entrar no Birth Hub'}
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 text-brand" />
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
                  className="font-sans text-xs text-ink-2/70 hover:text-brand transition-colors cursor-pointer"
                >
                  Não possui credenciais corporativas?{' '}
                  <span className="font-bold text-brand hover:underline">Solicitar acesso</span>
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
                  className="font-sans text-xs text-ink-2/70 hover:text-brand transition-colors cursor-pointer"
                >
                  Já possui credenciais corporativas?{' '}
                  <span className="font-bold text-brand hover:underline">Fazer login</span>
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
                  className="font-sans text-xs text-ink-2/70 hover:text-brand transition-colors cursor-pointer"
                >
                  Voltar para{' '}
                  <span className="font-bold text-brand hover:underline">Login Corporativo</span>
                </button>
              )}
            </div>

            {/* SSO */}
            {authMode === 'signin' && (
              <div className="mt-6">
                <div className="relative flex items-center justify-center mb-4">
                  <div className="w-full border-t border-line" />
                  <span className="absolute bg-surface px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-ink-2/50">
                    ou acesse com
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-mono font-bold bg-background border border-line text-ink-2 hover:border-brand hover:text-brand transition-colors cursor-pointer"
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
                    className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-mono font-bold bg-background border border-line text-ink-2 hover:border-brand hover:text-brand transition-colors cursor-pointer"
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
                    className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-mono font-bold bg-background border border-line text-ink-2 hover:border-pink hover:text-pink transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-pink shrink-0" />
                    <span>SAML SSO</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Badges de Confiança */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-surface border border-line flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-brand shadow-[var(--shadow-card)] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-brand truncate">AES-256</div>
                <div className="font-sans text-[9px] text-ink-2/60 truncate">Criptografado</div>
              </div>
            </div>
            <div className="bg-surface border border-line flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-pink shadow-[var(--shadow-card)] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-pink truncate">
                  SSO &amp; MFA
                </div>
                <div className="font-sans text-[9px] text-ink-2/60 truncate">Autenticação</div>
              </div>
            </div>
            <div className="bg-surface border border-line flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-gold shadow-[var(--shadow-card)] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-gold truncate">LGPD/GDPR</div>
                <div className="font-sans text-[9px] text-ink-2/60 truncate">Conformidade</div>
              </div>
            </div>
            <div className="bg-surface border border-line flex items-center gap-2 p-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-brand shadow-[var(--shadow-card)] shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold text-brand truncate">99.99%</div>
                <div className="font-sans text-[9px] text-ink-2/60 truncate">Uptime SLA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
