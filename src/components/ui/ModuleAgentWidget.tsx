import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, X, Send } from 'lucide-react';
import type { TabType } from '../layout/tabMeta.js';
import { isNavHiddenTab } from '../layout/tabMeta.js';
import { SoundFX } from '../../lib/soundEffects.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { hasRequiredRole, MESA_TRATAMENTO_ROLES } from '../../lib/auth/authorization.js';
import { AiReasoningPipeline, type AiReasoningStep } from './AiReasoningPipeline.js';

interface AgentCharacter {
  name: string;
  role: string;
  seed: string;
  command: string;
  color: string;
  contextMsg: string;
}

const AGENTS_BY_PILLAR: Record<string, AgentCharacter> = {
  'PILAR 01 — HUB COMERCIAL': {
    name: 'Orbit',
    role: 'Guardião do CRM',
    seed: 'Orbit',
    command: 'Ei Orbit',
    color: 'from-amber-400 to-amber-600',
    contextMsg: 'Monitorando pipeline e negócios ativos',
  },
  'PILAR 02 — INTELIGÊNCIA DE MERCADO': {
    name: 'Nexus',
    role: 'Analista de Dados',
    seed: 'Felix',
    command: 'Ei Nexus',
    color: 'from-blue-400 to-blue-600',
    contextMsg: 'Analisando dados de mercado e prospecção',
  },
  'PILAR 03 — ORQUESTRAÇÃO DE VENDAS': {
    name: 'Aria',
    role: 'Maestrina de Fluxos',
    seed: 'Aria',
    command: 'Ei Aria',
    color: 'from-emerald-400 to-emerald-600',
    contextMsg: 'Otimizando fluxos de vendas diários',
  },
  'PILAR 04 — PERFORMANCE COMERCIAL': {
    name: 'Vanguard',
    role: 'Estrategista de Metas',
    seed: 'Vanguard',
    command: 'Ei Vanguard',
    color: 'from-rose-400 to-rose-600',
    contextMsg: 'Analisando indicadores de performance',
  },
  'PILAR 05 — PREVISIBILIDADE COMERCIAL': {
    name: 'Oracle',
    role: 'Visionário de Forecast',
    seed: 'Oracle',
    command: 'Ei Oracle',
    color: 'from-purple-400 to-purple-600',
    contextMsg: 'Projetando forecast e fechamentos',
  },
  'PILAR 06 — INTELIGÊNCIA ARTIFICIAL': {
    name: 'Core',
    role: 'Mente Principal',
    seed: 'Buster',
    command: 'Ei Core',
    color: 'from-indigo-400 to-indigo-600',
    contextMsg: 'Treinando copilotos e analisando contexto',
  },
  'PILAR 07 — AUTOMAÇÃO & CONECTIVIDADE': {
    name: 'Spark',
    role: 'Engenheiro de Integrações',
    seed: 'Sparky',
    command: 'Ei Spark',
    color: 'from-teal-400 to-teal-600',
    contextMsg: 'Monitorando saúde das integrações e filas',
  },
  'PILAR 08 — ENGAJAMENTO COMERCIAL': {
    name: 'Echo',
    role: 'Especialista em Voz',
    seed: 'Echo',
    command: 'Ei Echo',
    color: 'from-pink-400 to-pink-600',
    contextMsg: 'Acompanhando discador e cadência',
  },
  ADMINISTRAÇÃO: {
    name: 'Sudo',
    role: 'Controlador de Sistema',
    seed: 'Sudo',
    command: 'Ei Sudo',
    color: 'from-slate-400 to-slate-600',
    contextMsg: 'Validando acessos e billing',
  },
};

const STEPS: AiReasoningStep[] = ['CONTEXT', 'ANALYSIS', 'RECOMMENDATION', 'APPROVAL', 'EXECUTION'];

interface ModuleAgentWidgetProps {
  activeTab: TabType;
}

export function ModuleAgentWidget({ activeTab }: ModuleAgentWidgetProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<AiReasoningStep>('CONTEXT');
  const [inputText, setInputText] = useState('');
  const { currentUser, isAdmin, canAccessCommercialIntelligence, canAccessCopilotoIa } = useAuth();

  const canManageOperations =
    !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);
  const canAccessMesaTratamento =
    !!currentUser && hasRequiredRole(currentUser.role, MESA_TRATAMENTO_ROLES);

  // Animação da esteira em loop
  useEffect(() => {
    if (!isExpanded) return;

    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx = (currentIdx + 1) % STEPS.length;
      setPipelineStep(STEPS[currentIdx]);
    }, 2000); // avança a cada 2s (10s total por ciclo)

    return () => clearInterval(interval);
  }, [isExpanded]);

  const navGroupsByJourney = [
    {
      title: 'PILAR 01 — HUB COMERCIAL',
      items: ['workspace', 'crm', 'crm360', 'propostas', 'companies', 'contacts'],
    },
    {
      title: 'PILAR 02 — INTELIGÊNCIA DE MERCADO',
      items: ['prospect', 'market-intelligence'],
    },
    {
      title: 'PILAR 03 — ORQUESTRAÇÃO DE VENDAS',
      items: [
        'daily-plan',
        'activities',
        'calendar',
        'cadence',
        'roleplay',
        'qualification_matrix',
        'objections_matrix',
        'topic_training',
        'chatbook',
        'editor',
      ],
    },
    {
      title: 'PILAR 04 — PERFORMANCE COMERCIAL',
      items: ['dashboard', 'analytics', 'winloss', 'reports'],
    },
    {
      title: 'PILAR 06 — INTELIGÊNCIA ARTIFICIAL',
      items: [
        ...(canAccessCommercialIntelligence ? (['commercial_intelligence'] as TabType[]) : []),
        ...(canAccessCopilotoIa ? (['copiloto_ia'] as TabType[]) : []),
        'intelligence',
        'knowledge',
        'sdr-diagnostic',
      ],
    },
    {
      title: 'PILAR 07 — AUTOMAÇÃO & CONECTIVIDADE',
      items: [
        ...(canManageOperations ? (['automations', 'integrations'] as TabType[]) : []),
        'bitrix',
      ],
    },
    {
      title: 'PILAR 08 — ENGAJAMENTO COMERCIAL',
      items: [
        'voice-hub',
        'outbound',
        'dialer',
        ...(canAccessMesaTratamento ? (['mesa-tratamento'] as TabType[]) : []),
      ].filter((tab) => !isNavHiddenTab(tab as TabType)),
    },
    {
      title: 'ADMINISTRAÇÃO',
      items: ['notifications', 'usage', 'team', 'module-access', 'settings'].filter((item) => {
        if (item === 'notifications' || item === 'settings') return true;
        return isAdmin;
      }) as TabType[],
    },
  ];

  const navGroups = navGroupsByJourney.map((g) => ({
    ...g,
    items: (g.items as TabType[]).filter((tab) => !isNavHiddenTab(tab)),
  }));
  const activeGroup = navGroups.find((g) => (g.items as TabType[]).includes(activeTab));

  if (!activeGroup) return null;
  const agent = AGENTS_BY_PILLAR[activeGroup.title];
  if (!agent) return null;

  const handleInteract = () => {
    SoundFX.play('focus');
    if (!isExpanded) {
      setPipelineStep('CONTEXT');
      setIsExpanded(true);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    SoundFX.play('click');
    console.log(`[Agent ${agent.name}] User asked: ${inputText}`);
    setInputText('');
  };

  const details = {
    CONTEXT: 'Analisando os dados visíveis nesta tela...',
    ANALYSIS: 'Cruzando padrões operacionais recentes...',
    RECOMMENDATION: 'Gerando insights para sua ação...',
    APPROVAL: 'Aguardando validação do processo...',
    EXECUTION: 'Aplicando comando no sistema...',
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col-reverse items-start gap-4">
      {/* O Botão Flutuante */}
      <motion.button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleInteract}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center bg-surface-elevated/95 backdrop-blur-xl border border-white/10 p-1.5 pr-4 rounded-full shadow-2xl overflow-hidden group cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />

        <div
          className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${agent.color} shadow-inner`}
        >
          <img
            src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${agent.seed}&backgroundColor=transparent`}
            alt={`Avatar do agente ${agent.name}`}
            className="w-7 h-7 drop-shadow-md"
          />
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-surface shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        </div>

        <div className="ml-3 flex flex-col items-start justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-[#F8F9FF] leading-none">{agent.name}</span>
            <Sparkles className="w-3 h-3 text-brand opacity-80" />
          </div>

          <AnimatePresence mode="wait">
            {isHovered ? (
              <motion.div
                key="command"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-1 mt-0.5"
              >
                <Mic className="w-3 h-3 text-[#F8F9FF]/70 animate-pulse" />
                <span className="text-[10px] font-semibold text-[#F8F9FF]/70 uppercase tracking-wide">
                  Diga "{agent.command}"
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="role"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-0.5"
              >
                <span className="text-[10px] font-medium text-[#F8F9FF]/40 leading-none">
                  {agent.role}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>

      {/* Painel Expandido (Card Flutuante) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[360px] rounded-2xl border border-[#F8F9FF]/10 shadow-2xl overflow-hidden flex flex-col"
            style={{
              background: 'rgba(6,13,26,0.97)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Header do Card */}
            <div className="px-5 py-4 border-b border-[#F8F9FF]/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${agent.color}`}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${agent.seed}&backgroundColor=transparent`}
                    alt={agent.name}
                    className="w-8 h-8"
                  />
                </div>
                <div>
                  <h3 className="text-[#F8F9FF] font-bold text-sm flex items-center gap-1.5">
                    {agent.name} <Sparkles className="w-3.5 h-3.5 text-brand" />
                  </h3>
                  <p className="text-[#F8F9FF]/40 text-[11px] font-mono mt-0.5">{agent.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  SoundFX.play('click');
                  setIsExpanded(false);
                }}
                className="p-1.5 rounded-md hover:bg-[#F8F9FF]/10 text-[#F8F9FF]/40 hover:text-[#F8F9FF] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contexto & Pipeline Animado */}
            <div className="px-5 py-6 flex-1 border-b border-[#F8F9FF]/10">
              <p className="text-[#F8F9FF]/70 text-sm mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {agent.contextMsg}...
              </p>

              <AiReasoningPipeline currentStep={pipelineStep} details={details} />
            </div>

            {/* Input para Pergunta */}
            <div className="p-4 bg-black/20">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Pergunte algo ao ${agent.name}...`}
                  className="w-full bg-[#F8F9FF]/5 border border-[#F8F9FF]/10 rounded-xl px-4 py-3 pr-12 text-sm text-[#F8F9FF] placeholder-[#F8F9FF]/30 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 resize-none h-16"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="absolute right-2 bottom-2 p-2 rounded-lg bg-brand text-midnight font-bold hover:bg-brand-hover disabled:opacity-50 disabled:hover:bg-brand transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
