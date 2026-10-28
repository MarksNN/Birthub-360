import { MotionConfig, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  ChevronDown,
  Database,
  Globe,
  Lock,
  Network,
  Radio,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext.js';
import './LandingInnovative.css';
import { BirthHubLogo } from '../../../components/brand/BirthHubLogo.js';
import { ToastContainer, useToast } from '../components/design-system/index.js';

// Sophisticated magnetic button component
const MagneticButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary';
}> = ({ children, onClick, className = '', variant = 'primary' }) => {
  const baseClasses =
    'bh-landing-button relative px-8 py-4 font-bold text-sm transition-colors duration-200';
  const variantClasses =
    variant === 'primary' ? 'bh-landing-button-primary' : 'bh-landing-button-secondary';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${className}`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </motion.button>
  );
};

// Advanced holographic card component
const HolographicCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  accent?: 'cyan' | 'iris' | 'blue' | 'success';
}> = ({ icon, title, description, delay, accent = 'cyan' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay }}
      className="relative group"
    >
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        data-accent={accent}
        className="bh-platform-card bh-landing-card relative p-8 transition-shadow duration-200"
      >
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Real-time data stream visualization
const DataStream: React.FC = () => {
  const [dataPoints, setDataPoints] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints((prev) => {
        const newPoint = Math.random() * 100;
        const updated = [...prev, newPoint];
        return updated.slice(-20);
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-24 w-full">
      <svg
        className="w-full h-full text-brand-ink dark:text-brand"
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M0,${100 - dataPoints[0] || 50} ${dataPoints.map((val, i) => `L${i * 20},${100 - val}`).join(' ')}`}
          fill="url(#gradient)"
          stroke="currentColor"
          strokeWidth="2"
          className="transition-all duration-300"
        />
      </svg>
    </div>
  );
};

// Main landing page component
function LandingInnovativeContent() {
  const { theme, setThemeMode: setTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const { toasts } = useToast();

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 0.95]);
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);

  const [activeSection, setActiveSection] = useState(0);

  // Scroll spy for navigation
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            const sectionIndex = Array.from(sections).findIndex((s) => s.id === id);
            setActiveSection(sectionIndex);
          }
        });
      },
      { threshold: 0.3 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="bh-landing-new min-h-screen relative overflow-hidden">
      {/* Sticky Navigation */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              className="p-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800"
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <BirthHubLogo variant="symbol" className="h-8 w-8" />
            </motion.div>
            <div className="text-left">
              <h1 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white font-display">
                Birth Hub <span className="text-brand font-semibold">360º</span>
              </h1>
              <span className="text-[10px] text-brand font-bold uppercase tracking-widest font-mono">
                Command Center
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {['Plataforma', 'Inteligência', 'Segurança', 'Integrações'].map((item, i) => (
              <button
                type="button"
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().replace(' ', '-'))}
                className={`text-sm font-semibold transition-all relative ${
                  activeSection === i
                    ? 'text-brand'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {item}
                {activeSection === i && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand"
                    initial={false}
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <button
                type="button"
                aria-label="Ativar modo claro"
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
                className={`p-2 rounded-md transition-all ${theme === 'light' ? 'bg-white shadow-sm text-brand' : 'text-slate-500'}`}
              >
                <Zap className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Ativar modo escuro"
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-md transition-all ${theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>

            <Link to="/login">
              <MagneticButton variant="primary">
                Acessar Hub
                <ArrowRight className="h-4 w-4 ml-2" />
              </MagneticButton>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Immersive Hero Section */}
      <motion.section
        id="plataforma"
        style={reducedMotion ? undefined : { opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative min-h-screen flex items-center justify-center pt-20 z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Command Center Visual Map */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative flex justify-center items-center h-[350px] sm:h-[450px] w-full max-w-2xl mx-auto"
            >
              {/* B360 Core */}
              <div className="absolute z-20">
                <BirthHubLogo variant="symbol" className="h-40 w-40" />
              </div>

              {/* Pulsing connection lines */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 400 400"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="line-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity="0" />
                    <stop offset="50%" stopColor="var(--color-brand-primary)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <circle
                  cx="200"
                  cy="200"
                  r="140"
                  fill="none"
                  stroke="url(#line-grad-1)"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                  className="animate-[spin_40s_linear_infinite]"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="100"
                  fill="none"
                  stroke="url(#line-grad-1)"
                  strokeWidth="1"
                  strokeDasharray="2 8"
                  className="animate-[spin_25s_linear_infinite_reverse]"
                />

                {/* Connection paths from center to nodes */}
                <path d="M 200 200 L 200 40" stroke="url(#line-grad-1)" strokeWidth="1" />
                <path d="M 200 200 L 320 80" stroke="url(#line-grad-1)" strokeWidth="1" />
                <path d="M 200 200 L 360 200" stroke="url(#line-grad-1)" strokeWidth="1" />
                <path d="M 200 200 L 320 320" stroke="url(#line-grad-1)" strokeWidth="1" />
                <path d="M 200 200 L 200 360" stroke="url(#line-grad-1)" strokeWidth="1" />
                <path d="M 200 200 L 80 320" stroke="url(#line-grad-1)" strokeWidth="1" />
                <path d="M 200 200 L 40 200" stroke="url(#line-grad-1)" strokeWidth="1" />
                <path d="M 200 200 L 80 80" stroke="url(#line-grad-1)" strokeWidth="1" />
              </svg>

              {/* Orbiting Nodes */}
              {[
                { label: 'CRM', angle: 0, distance: 160, delay: 0 },
                { label: 'PIPELINE', angle: 45, distance: 130, delay: 0.1 },
                { label: 'AI', angle: 90, distance: 160, delay: 0.2 },
                { label: 'FORECAST', angle: 135, distance: 130, delay: 0.3 },
                { label: 'ALERTS', angle: 180, distance: 160, delay: 0.4 },
                { label: 'DATA', angle: 225, distance: 130, delay: 0.5 },
                { label: 'INTEGRATIONS', angle: 270, distance: 160, delay: 0.6 },
                { label: 'EXECUTION', angle: 315, distance: 130, delay: 0.7 },
              ].map((node, _i) => {
                const angleRad = (node.angle - 90) * (Math.PI / 180);
                const distancePct = (node.distance / 200) * 50;
                const top = `${50 + Math.sin(angleRad) * distancePct}%`;
                const left = `${50 + Math.cos(angleRad) * distancePct}%`;

                return (
                  <motion.div
                    key={node.label}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + node.delay, duration: 0.5, type: 'spring' }}
                    className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center group"
                    style={{ top, left }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[var(--brand)]/20 blur-md group-hover:bg-[var(--brand)]/40 transition-colors duration-300" />
                      <div className="relative px-3 py-1.5 rounded-full border border-[var(--brand)]/30 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-sm text-[10px] font-mono font-bold text-[var(--brand)] uppercase tracking-wider group-hover:border-[var(--brand)]/70 group-hover:text-white group-hover:bg-[var(--brand)]/20 transition-all duration-300">
                        {node.label}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20"
            >
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-xs font-bold text-brand uppercase tracking-widest font-mono">
                Intelligent Business Command Center
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-950 dark:text-white font-display">
              Birth Hub <span className="text-brand font-semibold">360º</span>
            </h1>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-2xl md:text-3xl lg:text-4xl text-slate-800 dark:text-slate-200 max-w-3xl mx-auto leading-snug font-display space-y-1"
            >
              <div className="text-slate-950 dark:text-white font-bold">Dados que Conectam,</div>
              <div className="text-brand font-bold">Inteligência que decide,</div>
              <div className="text-slate-600 dark:text-slate-400 font-semibold">
                Resultados que acontecem.
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
            >
              <Link to="/login">
                <MagneticButton variant="primary">
                  Explorar o Birth Hub
                  <ArrowRight className="h-4 w-4 ml-2" />
                </MagneticButton>
              </Link>
              <MagneticButton variant="secondary">
                <Play className="h-4 w-4 mr-2" />
                Ver como funciona
              </MagneticButton>
            </motion.div>

            {/* Real-time data visualization */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="pt-12 max-w-4xl mx-auto"
            >
              <div className="bh-platform-card bh-landing-card p-6" data-accent="cyan">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-brand" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      50+ Integrações Conectadas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-slate-500">24/7 Monitoramento</span>
                  </div>
                </div>
                <p className="bh-landing-caption">
                  Visualização ilustrativa de fluxo de dados; não representa métricas da operação.
                </p>
                <DataStream />
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand">360°</div>
                    <div className="text-xs text-slate-500">Visibilidade da Receita</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-iris">IA</div>
                    <div className="text-xs text-slate-500">Decisões Assistidas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">24/7</div>
                    <div className="text-xs text-slate-500">Operação</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={reducedMotion ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2 text-slate-400"
          >
            <span className="text-xs uppercase tracking-widest">Explore</span>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Feature Cards Section */}
      <section id="inteligência" className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-950 dark:text-white mb-6">
              Inteligência que Transforma
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Nossa plataforma combina tecnologias de ponta para criar agentes que pensam, aprendem
              e executam em escala empresarial.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <HolographicCard
              delay={0}
              accent="iris"
              icon={<Bot className="h-7 w-7 text-brand" />}
              title="Agentes Autônomos"
              description="IA que opera 24/7 sem supervisão humana, qualificando leads, agendando reuniões e executando fluxos comerciais complexos."
            />
            <HolographicCard
              delay={0.1}
              accent="iris"
              icon={<BrainCircuit className="h-7 w-7 text-iris" />}
              title="RAG Avançado"
              description="Sistema de recuperação de conhecimento que consulta seus documentos corporativos em milissegundos para respostas precisas e contextualizadas."
            />
            <HolographicCard
              delay={0.2}
              accent="cyan"
              icon={<Radio className="h-7 w-7 text-slate-900 dark:text-white" />}
              title="Voz em Tempo Real"
              description="Latência sub-340ms com transcrição instantânea, síntese adaptativa e detecção de interrupção para conversas naturais."
            />
            <HolographicCard
              delay={0.3}
              accent="success"
              icon={<Shield className="h-7 w-7 text-green-500" />}
              title="Segurança Enterprise"
              description="Criptografia AES-256, RBAC avançado, conformidade LGPD e auditorias permanentes para máxima proteção de dados."
            />
            <HolographicCard
              delay={0.4}
              accent="blue"
              icon={<Network className="h-7 w-7 text-blue-500" />}
              title="Integrações Ilimitadas"
              description="Conecte-se com CRMs, ERPs, bancos de dados e APIs via webhooks bidirecionais e SDKs robustos."
            />
            <HolographicCard
              delay={0.5}
              accent="blue"
              icon={<Globe className="h-7 w-7 text-purple-500" />}
              title="Multi-tenant White-label"
              description="Suporte a múltiplas organizações com branding customizável, subdomínios e faturamento segmentado por unidade."
            />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="segurança" className="relative py-32 bg-slate-100 dark:bg-slate-900 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          >
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-950 dark:text-white mb-6">
                Segurança que Inspira Confiança
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Nossa arquitetura foi construída desde o início com segurança como prioridade
                absoluta, atendendo aos mais rigorosos padrões corporativos.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Lock,
                    title: 'Criptografia End-to-End',
                    desc: 'TLS 1.3 em trânsito, AES-256 em repouso',
                  },
                  {
                    icon: Server,
                    title: 'Infraestrutura Distribuída',
                    desc: 'SLA 99.98% com redundância geográfica',
                  },
                  {
                    icon: Terminal,
                    title: 'Auditoria Completa',
                    desc: 'Logs imutáveis e rastreabilidade total',
                  },
                  {
                    icon: Database,
                    title: 'Soberania de Dados',
                    desc: 'Storage privado ou cloud criptografado',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex items-start gap-4"
                  >
                    <div className="p-3 bg-brand/10 rounded-lg">
                      <item.icon className="h-6 w-6 text-brand" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="bh-platform-card bh-landing-card relative p-8" data-accent="blue">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: 'Criptografia', value: 'AES-256' },
                    { label: 'Protocolo', value: 'TLS 1.3' },
                    { label: 'Compliance', value: 'LGPD' },
                    { label: 'SLA', value: '99.98%' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl"
                    >
                      <div className="text-2xl font-bold text-brand mb-1">{item.value}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-950 dark:text-white">
              Pronto para o Futuro da IA?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Junte-se às empresas que já estão transformando suas operações com inteligência
              artificial autônoma de última geração.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <MagneticButton variant="primary">
                  Explorar o Birth Hub
                  <ArrowRight className="h-4 w-4 ml-2" />
                </MagneticButton>
              </Link>
              <MagneticButton variant="secondary">Falar com Especialista</MagneticButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-slate-200 dark:border-slate-800 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BirthHubLogo variant="symbol" className="h-6 w-6" />
              <span className="font-bold text-slate-900 dark:text-white font-display">
                Birth Hub <span className="text-brand font-semibold">360º</span>
              </span>
            </div>
            <div className="text-sm text-slate-500">
              © 2026 Birth Hub 360. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// Import missing icon
const Moon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

const Play: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default function LandingInnovative() {
  return (
    <MotionConfig reducedMotion="user">
      <LandingInnovativeContent />
    </MotionConfig>
  );
}
