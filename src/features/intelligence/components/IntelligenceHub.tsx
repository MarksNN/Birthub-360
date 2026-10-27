import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Cpu,
  Database,
  FileCode,
  FileText,
  Gauge,
  GraduationCap,
  Layers,
  LayoutGrid,
  ListFilter,
  Loader2,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wand2,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Intelligence } from '../../../components/Intelligence.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card, CardDescription, CardTitle } from '../../../components/ui/Card.js';
import { PageTitleCard } from '../../../components/ui/PageTitleCard.js';
import { useBrandAccent } from '../../../hooks/useBrandAccent.js';
import { fadeInUp, staggerContainer } from '../../../lib/motion.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { CopilotoIaHub } from '../../copiloto-ia/components/CopilotoIaHub.js';
import { AIConfigCenter } from '../../dashboard/components/AIConfigCenter.js';
import { type KnowledgeDocumentSummary, knowledgeApi } from '../../knowledge/knowledge.api.js';
import { AgentQualityPanel } from './AgentQualityPanel.js';
import { AIPendingActions } from './AIPendingActions.js';
import { AISuiteHub } from './AISuiteHub.js';
import { AutomationGuide } from './AutomationGuide.js';
import { B2BGenerator } from './B2BGenerator.js';
import { EliteCommercialAgentWorkspace } from './EliteCommercialAgentWorkspace.js';
import { GroqTelemetryPanel } from './GroqTelemetryPanel.js';
import { RobustScriptGenerator } from './RobustScriptGenerator.js';
import { SalesMethodologyStudio } from './SalesMethodologyStudio.js';
import { SuperagentCreator } from './SuperagentCreator.js';
import { SwarmDashboard } from './SwarmDashboard.js';
import { UniversalEcosystemPanel } from './UniversalEcosystemPanel.js';

export type IntelligenceTab =
  | 'telemetry'
  | 'ai_suite'
  | 'swarm'
  | 'ecosystem'
  | 'methodologies'
  | 'ai_config'
  | 'superagent'
  | 'scripts'
  | 'automations'
  | 'actions'
  | 'generator'
  | 'tools'
  | 'rag'
  | 'quality'
  | 'copiloto'
  | 'commercial_cell';

export type ToolCategory = 'all' | 'agents' | 'tactical' | 'governance' | 'infra';
export type ViewMode = 'grid' | 'matrix';

interface ToolCategoryConfig {
  id: ToolCategory;
  label: string;
  icon: typeof Bot;
  description: string;
  badgeLabel: string;
}

const CATEGORIES: ToolCategoryConfig[] = [
  {
    id: 'all',
    label: 'Todas as Capacidades',
    icon: Layers,
    description: 'Visão unificada de todas as ferramentas e agentes de IA da plataforma.',
    badgeLabel: 'Ecossistema 360°',
  },
  {
    id: 'agents',
    label: 'Células & Enxames',
    icon: Bot,
    description: 'Agentes autônomos e copilotos coordenados para acelerar a receita.',
    badgeLabel: 'Agentes Autônomos',
  },
  {
    id: 'tactical',
    label: 'Operação Tática & Outreach',
    icon: Wand2,
    description: 'Geração de abordagens de prospecção, scripts B2B e quebra de objeções.',
    badgeLabel: 'Geração Tática',
  },
  {
    id: 'governance',
    label: 'Governança & Decisão',
    icon: ShieldCheck,
    description: 'Aprovação humana executiva, telemetria Groq e harness de qualidade.',
    badgeLabel: 'Human-in-the-Loop',
  },
  {
    id: 'infra',
    label: 'Infraestrutura & Modelos',
    icon: Cpu,
    description: 'Console dos 20 motores de IA, base RAG corporativa e parâmetros.',
    badgeLabel: 'Motores & Dados',
  },
];

interface ToolDefinition {
  id: IntelligenceTab;
  label: string;
  category: 'agents' | 'tactical' | 'governance' | 'infra';
  icon: typeof Bot;
  badge: string;
  badgeColor?: 'brand' | 'iris' | 'gold' | 'ok' | 'pink';
  description: string;
  techMeta: string;
  keywords: string[];
  isFlagship?: boolean;
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  // 1. Células & Enxames
  {
    id: 'commercial_cell',
    label: 'Célula Comercial de Agentes',
    category: 'agents',
    icon: Users,
    badge: 'Flagship Tríade',
    badgeColor: 'brand',
    description: 'Workspace executivo dos 12 agentes comerciais da Tríade e Swarm (BDR, C...',
    techMeta: '12 Agentes · Next Best Action · Tríade',
    keywords: ['célula', 'tríade', 'bdr', 'closer', 'sdr', 'nba', 'agentes', 'autônomo'],
    isFlagship: true,
  },
  {
    id: 'copiloto',
    label: 'Copiloto Comercial IA',
    category: 'agents',
    icon: Sparkles,
    badge: 'Voz & Reuniões',
    badgeColor: 'iris',
    description: 'Análise em tempo real de chamadas, transcrição de reuniões e coaching c...',
    techMeta: 'Reuniões · Deal Health · Coaching',
    keywords: ['copiloto', 'reunião', 'call', 'ligação', 'transcrição', 'coaching', 'deal health'],
  },
  {
    id: 'swarm',
    label: 'Enxame Autônomo',
    category: 'agents',
    icon: Bot,
    badge: 'Multi-Agente',
    badgeColor: 'gold',
    description: 'Dispara missões comerciais coordenadas entre SDR, Closer e CRM em lote,...',
    techMeta: 'Execução Concorrente · Swarm',
    keywords: ['enxame', 'swarm', 'missão', 'lote', 'multi-agente', 'paralelo'],
  },
  {
    id: 'ecosystem',
    label: 'Ecossistema Universal (21+ Plataformas & Office)',
    category: 'agents',
    icon: Layers,
    badge: '29 Tools Universais',
    badgeColor: 'ok',
    description: 'Conectores ao vivo (Outlook/Gmail/IMAP, Trello, Monday, Bitrix, HubSpot...',
    techMeta: '21+ Plataformas · Office .xlsx · Playbooks',
    keywords: ['ecossistema', 'trello', 'monday', 'outlook', 'excel', 'word', 'playbooks'],
  },
  {
    id: 'superagent',
    label: 'Criador de Copiloto & Agentes',
    category: 'agents',
    icon: Sparkles,
    badge: 'Provisionamento',
    badgeColor: 'pink',
    description: 'Modelagem e provisionamento de novos agentes comerciais: configure pers...',
    techMeta: 'Blueprints JSON · Prompt Engineering',
    keywords: ['criador', 'superagente', 'provisionamento', 'prompt', 'blueprint', 'custom agent'],
  },

  // 2. Operação Tática & Outreach
  {
    id: 'tools',
    label: 'Outreach Intelligence',
    category: 'tactical',
    icon: Search,
    badge: 'Prospecção Ativa',
    badgeColor: 'brand',
    description: 'Geração cirúrgica e imediata de scripts para cold call, mensagens de Wh...',
    techMeta: 'Multicanal · Scripts · Battlecards',
    keywords: ['outreach', 'cold call', 'whatsapp', 'email', 'battlecard', 'lead', 'prospecção'],
  },
  {
    id: 'methodologies',
    label: 'Metodologias de Vendas B2B',
    category: 'tactical',
    icon: GraduationCap,
    badge: 'Frameworks B2B',
    badgeColor: 'gold',
    description: 'Estruturação tática de roteiros comerciais nos frameworks clássicos: SP...',
    techMeta: 'SPIN · MEDDPICC · Challenger',
    keywords: ['metodologias', 'spin', 'snap', 'aida', 'meddpicc', 'challenger', 'frameworks'],
  },
  {
    id: 'generator',
    label: 'Gerador B2B & ICP',
    category: 'tactical',
    icon: Wand2,
    badge: 'Dores & Objeções',
    badgeColor: 'iris',
    description: 'Simulador de perguntas de qualificação, levantamento de dores e matriz...',
    techMeta: 'ICP · Matriz de Objeções',
    keywords: ['gerador', 'b2b', 'icp', 'dores', 'objeções', 'qualificação'],
  },
  {
    id: 'scripts',
    label: 'Gerador de Scripts & Integrações',
    category: 'tactical',
    icon: FileCode,
    badge: 'Engenharia',
    badgeColor: 'brand',
    description: 'Geração de scripts em Node.js, Python e Shell para tarefas operacionais...',
    techMeta: 'Node.js · Python · Scraping ETL',
    keywords: ['scripts', 'código', 'etl', 'scraping', 'integração', 'automação'],
  },

  // 3. Governança & Decisão
  {
    id: 'actions',
    label: 'Central de Decisões & Aprovações',
    category: 'governance',
    icon: CheckSquare,
    badge: 'Human-in-the-Loop',
    badgeColor: 'ok',
    description: 'Fila executiva de aprovação humana: revise e autorize ações de alto imp...',
    techMeta: 'Aprovação Executiva · Score de Risco',
    keywords: ['decisões', 'ações', 'aprovação', 'human-in-the-loop', 'risco', 'auditoria'],
  },
  {
    id: 'quality',
    label: 'Qualidade & Harness do Enxame',
    category: 'governance',
    icon: ShieldCheck,
    badge: 'Auditoria & Evals',
    badgeColor: 'iris',
    description: 'Harness contínuo de avaliação: métricas de latência, taxa de override h...',
    techMeta: 'Golden Dataset · Evals · Guardrails',
    keywords: ['qualidade', 'evals', 'golden dataset', 'latência', 'override', 'pii'],
  },
  {
    id: 'telemetry',
    label: 'Telemetria Groq Cloud',
    category: 'governance',
    icon: Gauge,
    badge: 'Groq LPU',
    badgeColor: 'brand',
    description: 'Métricas de inferência em tempo real: TTFT (Time to First Token), consu...',
    techMeta: 'TTFT Real · Consumo LPU · Custos',
    keywords: ['telemetria', 'groq', 'ttft', 'tokens', 'lpu', 'latência', 'custo'],
  },

  // 4. Infraestrutura & Modelos
  {
    id: 'ai_suite',
    label: 'Suíte dos 20 Motores de IA',
    category: 'infra',
    icon: Cpu,
    badge: '20 Motores',
    badgeColor: 'brand',
    description: 'Console de execução e orquestração dos 20 motores de IA (Ollama local e...',
    techMeta: 'Ollama & Cloud · 20 Modelos',
    keywords: ['suíte', 'motores', 'ollama', 'modelos', 'ia', 'cloud', 'inferência'],
  },
  {
    id: 'rag',
    label: 'Base de Conhecimento RAG',
    category: 'infra',
    icon: Database,
    badge: 'Busca Vetorial',
    badgeColor: 'iris',
    description: 'Base corporativa de documentos vetorizados que os copilotos consultam p...',
    techMeta: 'Embeddings · Busca Semântica Híbrida',
    keywords: ['rag', 'base', 'conhecimento', 'embeddings', 'vetores', 'documentos', 'playbook'],
  },
  {
    id: 'ai_config',
    label: 'Central de Motores & Temperatura',
    category: 'infra',
    icon: Settings,
    badge: 'Roteamento',
    badgeColor: 'gold',
    description: 'Roteamento refinado de modelos e ajuste fino de temperatura para cada p...',
    techMeta: 'Roteamento · Parâmetros · Modelos',
    keywords: ['config', 'motores', 'temperatura', 'modelos', 'parâmetros', 'configuração'],
  },
  {
    id: 'automations',
    label: 'Guia de Automações & Conectores',
    category: 'infra',
    icon: Workflow,
    badge: 'Workflows n8n',
    badgeColor: 'brand',
    description: 'Guias operacionais e blueprints de workflows no n8n e webhooks para con...',
    techMeta: 'n8n · Webhooks · Gatilhos',
    keywords: ['automações', 'n8n', 'workflow', 'webhooks', 'gatilhos', 'conectores'],
  },
];

const CATEGORY_SHORT_LABELS: Record<ToolDefinition['category'], string> = {
  agents: 'Células & Enxames',
  tactical: 'Operação Tática',
  governance: 'Governança & Decisão',
  infra: 'Infraestrutura',
};
const PINNED_STORAGE_KEY = 'birthhub360:ai-hub-pinned';
const VIEW_MODE_STORAGE_KEY = 'birthhub360:ai-hub-view-mode';

interface IntelligenceHubProps {
  initialTab?: IntelligenceTab;
}

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays} dia${diffDays === 1 ? '' : 's'}`;
}

export function IntelligenceHub({ initialTab }: IntelligenceHubProps) {
  const [activeTab, setActiveTab] = useState<IntelligenceTab | null>(initialTab ?? null);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === 'matrix' || saved === 'grid') return saved;
    }
    return 'grid';
  });

  const [pinnedIds, setPinnedIds] = useState<IntelligenceTab[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(PINNED_STORAGE_KEY);
        if (saved) return JSON.parse(saved) as IntelligenceTab[];
      } catch {
        // Fallback silencioso
      }
    }
    return ['commercial_cell', 'tools', 'copiloto'];
  });

  const accent = useBrandAccent();

  const togglePin = useCallback((id: IntelligenceTab, e?: React.MouseEvent) => {
    e?.stopPropagation();
    SoundFX.play('click');
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const handleChangeViewMode = useCallback((mode: ViewMode) => {
    SoundFX.play('click');
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
  }, []);

  // Estado real da Base de Conhecimento (RAG) — respeita AGENTS.md Bloqueador B-06 (nunca dados fictícios)
  const [ragDocuments, setRagDocuments] = useState<KnowledgeDocumentSummary[] | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ragLoading, setRagLoading] = useState(false);

  const loadRagSummary = useCallback(async () => {
    setRagLoading(true);
    setRagError(null);
    try {
      setRagDocuments(await knowledgeApi.list());
    } catch (err: unknown) {
      setRagError(err instanceof Error ? err.message : String(err));
    } finally {
      setRagLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'rag') void loadRagSummary();
  }, [activeTab, loadRagSummary]);

  // Teclado: Escape volta para a grade principal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTab !== null) {
        setActiveTab(null);
        SoundFX.play('navigate');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Filtragem de ferramentas
  const filteredTools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return TOOL_DEFINITIONS.filter((tool) => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      const matchesText =
        tool.label.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.techMeta.toLowerCase().includes(query) ||
        tool.keywords.some((k) => k.toLowerCase().includes(query));
      return matchesText;
    });
  }, [selectedCategory, searchQuery]);

  const activeToolDef = useMemo(() => {
    return TOOL_DEFINITIONS.find((t) => t.id === activeTab);
  }, [activeTab]);

  // Ferramentas fixadas que existem no catálogo
  const pinnedTools = useMemo(() => {
    return pinnedIds
      .map((id) => TOOL_DEFINITIONS.find((t) => t.id === id))
      .filter((t): t is ToolDefinition => Boolean(t));
  }, [pinnedIds]);

  // Agrupamentos por pilares operacionais (para a visualização agrupada em 'all')
  const pillarClusters = useMemo(() => {
    return [
      {
        id: 'agents' as const,
        label: '1. Células & Enxames Autônomos',
        subtitle: 'Agentes executivos especializados com orquestração coordenada e trace...',
        icon: Bot,
        tools: filteredTools.filter((t) => t.category === 'agents'),
      },
      {
        id: 'tactical' as const,
        label: '2. Operação Tática & Outreach B2B',
        subtitle: 'Geração de abordagens multicanal, frameworks clássicos e scripts de conversão.',
        icon: Wand2,
        tools: filteredTools.filter((t) => t.category === 'tactical'),
      },
      {
        id: 'governance' as const,
        label: '3. Governança, Human-in-the-Loop & Qualidade',
        subtitle: 'Fila de aprovação de riscos, harness contínuo com Golden Dataset e te...',
        icon: ShieldCheck,
        tools: filteredTools.filter((t) => t.category === 'governance'),
      },
      {
        id: 'infra' as const,
        label: '4. Infraestrutura, Modelos & Conhecimento',
        subtitle: 'Console multi-motor (Ollama & Cloud), base de embeddings RAG e parâme...',
        icon: Cpu,
        tools: filteredTools.filter((t) => t.category === 'infra'),
      },
    ].filter((p) => p.tools.length > 0);
  }, [filteredTools]);

  const handleOpenTool = useCallback((id: IntelligenceTab) => {
    SoundFX.play('click');
    setActiveTab(id);
  }, []);

  // Se nenhuma ferramenta estiver ativa, renderiza a visão do Hub de IA com novo design de Command Center
  if (activeTab === null) {
    return (
      <div className="flex-1 overflow-y-auto bg-transparent">
        <div className="bh-page bh-page-stack space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Executivo com Título e Subtítulo Autoritativo */}
          <PageTitleCard
            eyebrow="SISTEMA OPERACIONAL DE INTELIGÊNCIA COMERCIAL"
            title="Hub de Inteligência Artificial & Agentes"
            subtitle="Command Center unificado para orquestração da célula de agentes autônomos, geração tática de abordagens, governança human-in-the-loop e inferência Groq de alta performance."
            icon={<Cpu className="h-5 w-5 text-brand" />}
            accent="iris"
          />

          {/* Barra de Status Operacional e Métricas em Tempo Real */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: Users,
                box: 'bg-brand/15 border-brand/30 text-brand',
                dot: 'bg-emerald-500 animate-pulse',
                title: 'Célula Autônoma',
                value: '12 Agentes Prontos',
              },
              {
                icon: Gauge,
                box: 'bg-amber-500/15 border-amber-500/30 text-amber-500',
                dot: 'bg-amber-500',
                title: 'Groq Cloud LPU',
                value: 'Ultra-Low Latency',
              },
              {
                icon: ShieldCheck,
                box: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500',
                dot: 'bg-emerald-500',
                title: 'Governança & Evals',
                value: 'Guardrails Ativos',
              },
              {
                icon: Database,
                box: 'bg-sky-500/15 border-sky-500/30 text-sky-500',
                dot: 'bg-sky-500',
                title: 'Base Vetorial',
                value: 'RAG Híbrido Conectado',
              },
            ].map((item) => {
              const StatusIcon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-3.5 rounded-card bg-surface/90 dark:bg-[#121622]/90 border border-line flex items-center gap-3"
                >
                  <div
                    className={`w-9 h-9 rounded-control border flex items-center justify-center shrink-0 ${item.box}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-ink-2 uppercase tracking-wider">
                      {item.title}
                    </p>
                    <p className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner Hero de Destaque: Célula Comercial de Agentes (Apenas na visão geral sem busca ativa) */}
          {selectedCategory === 'all' && searchQuery.trim() === '' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-card-lg overflow-hidden border border-brand/35 bg-gradient-to-br from-[#121829] via-[#0d111a] to-[#0a0d14] p-6 sm:p-8 shadow-elevated"
            >
              <div
                className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute right-1/3 -bottom-24 h-64 w-64 rounded-full bg-iris/10 blur-2xl"
                aria-hidden="true"
              />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-3xl space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-brand text-on-brand shadow-glow-brand">
                      <Zap className="w-3 h-3" /> FLAGSHIP DO HUB
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Next Best Action Operacional
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                    Célula Comercial de Agentes Autônomos
                  </h2>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    Workspace executivo dos 12 agentes especializados da Tríade Comercial (BDR, SDR,
                    Closer e Gestão de Contas) integrados a traces de governança, memória de
                    contexto e execução sincronizada.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                      <span>12 Agentes Especialistas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-iris" />
                      <span>Tríade & Swarm Híbridos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Zero Alucinação com Guardrails</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => handleOpenTool('commercial_cell')}
                    className="w-full sm:w-auto bg-gradient-to-r from-brand to-[#00a8ff] text-on-brand font-bold shadow-glow-brand hover:opacity-95 transition-all text-sm gap-2"
                  >
                    Acessar Célula Comercial <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Barra de Capacidades Fixadas / Favoritos (se existirem ferramentas fixadas) */}
          {pinnedTools.length > 0 && searchQuery.trim() === '' && selectedCategory === 'all' && (
            <div className="p-3.5 rounded-card bg-surface/80 dark:bg-[#101420]/80 border border-line">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Capacidades Fixadas ({pinnedTools.length})
                </span>
                <span className="text-[10px] text-ink-2">Acesso rápido diário</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {pinnedTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={`pinned-${tool.id}`}
                      type="button"
                      onClick={() => handleOpenTool(tool.id)}
                      className="flex items-center justify-between p-2.5 rounded-control bg-surface-2 hover:bg-surface border border-line hover:border-brand/40 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-on-brand transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink truncate group-hover:text-brand transition-colors">
                            {tool.label}
                          </p>
                          <p className="text-[10px] text-ink-2 truncate">{tool.badge}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-ink-2 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Barra de Navegação por Categorias, Campo de Busca e Alternador de Modo de Visualização */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Categorias / Filtros Pills */}
              <div
                className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
                role="tablist"
              >
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  const count =
                    cat.id === 'all'
                      ? TOOL_DEFINITIONS.length
                      : TOOL_DEFINITIONS.filter((t) => t.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => {
                        SoundFX.play('click');
                        setSelectedCategory(cat.id);
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-control text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand text-on-brand shadow-sm font-bold'
                          : 'bg-surface/80 dark:bg-[#141926]/80 text-ink-2 hover:text-ink hover:bg-surface-2 border border-line'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{cat.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-black/20 text-on-brand'
                            : 'bg-surface-2 text-ink-2 border border-line'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Controles da Direita: Input de Busca + Alternador Grid / Matrix */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Input de Busca Rápida */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-ink-2 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar capacidade, script, groq..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface/90 dark:bg-[#141926]/90 border border-line rounded-control pl-9 pr-8 py-2 text-xs text-ink placeholder:text-ink-2/60 focus:outline-none focus:border-brand transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink p-0.5 cursor-pointer"
                      aria-label="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Alternador de Modo de Exibição (Grid vs. Matrix) */}
                <div className="flex items-center p-0.5 rounded-control bg-surface-2 border border-line shrink-0">
                  <button
                    type="button"
                    onClick={() => handleChangeViewMode('grid')}
                    title="Exibição em Cards (Bento Grid)"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-brand text-on-brand shadow-xs'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeViewMode('matrix')}
                    title="Exibição Compacta (Command Matrix)"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'matrix'
                        ? 'bg-brand text-on-brand shadow-xs'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    <ListFilter className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Subtítulo da categoria selecionada */}
            <div className="flex items-center justify-between text-xs text-ink-2 px-1">
              <span>
                Mostrando <strong className="text-ink font-semibold">{filteredTools.length}</strong>{' '}
                capacidade(s)
                {searchQuery && (
                  <>
                    {' '}
                    para o termo &ldquo;
                    <span className="text-brand font-medium">{searchQuery}</span>
                    &rdquo;
                  </>
                )}
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-brand hover:underline cursor-pointer"
                >
                  Limpar busca
                </button>
              )}
            </div>
          </div>

          {/* Estado Vazio caso nenhuma busca retorne */}
          {filteredTools.length === 0 && (
            <div className="p-12 text-center rounded-card bg-surface-2 border border-dashed border-line space-y-3">
              <Search className="w-8 h-8 mx-auto text-ink-2 opacity-50" />
              <p className="text-sm font-semibold text-ink">
                Nenhuma ferramenta encontrada para &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-ink-2 max-w-md mx-auto">
                Tente buscar por termos como &ldquo;bdr&rdquo;, &ldquo;groq&rdquo;,
                &ldquo;scripts&rdquo;, &ldquo;spin&rdquo; ou troque a categoria selecionada.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Ver todas as 15 ferramentas
              </Button>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODO 1: BENTO GRID VIEW                                  */}
          {/* ======================================================== */}
          {filteredTools.length > 0 && viewMode === 'grid' && (
            <div className="space-y-8">
              {/* Se a visualização for 'all' e não houver termo de busca, exibe organizado por pilares */}
              {selectedCategory === 'all' && searchQuery.trim() === '' ? (
                pillarClusters.map((cluster) => {
                  const PillarIcon = cluster.icon;
                  return (
                    <section key={cluster.id} className="space-y-3">
                      <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-control bg-surface-2 border border-line flex items-center justify-center text-brand shrink-0">
                            <PillarIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-ink tracking-tight">
                              {cluster.label}
                            </h3>
                            <p className="text-xs text-ink-2 hidden sm:block">{cluster.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-ink-2 bg-surface-2 border border-line px-2 py-0.5 rounded-full">
                          {cluster.tools.length} capacidades
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {cluster.tools.map((tool) => {
                          const Icon = tool.icon;
                          const isPinned = pinnedIds.includes(tool.id);

                          return (
                            <div key={tool.id} className="relative h-full group">
                              <Card
                                variant="interactive"
                                padding="sm"
                                onClick={() => handleOpenTool(tool.id)}
                                className={`h-full flex flex-col justify-between border-line group-hover:border-brand/40 bg-surface/90 dark:bg-[#121622]/90 transition-all duration-200 cursor-pointer ${tool.isFlagship ? 'ring-1 ring-brand/30' : ''}`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-3 pr-7">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-9 h-9 rounded-control bg-brand/10 border border-brand/25 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-brand group-hover:text-on-brand transition-all duration-200">
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <CardTitle className="text-xs font-bold text-ink group-hover:text-brand transition-colors line-clamp-1">
                                          {tool.label}
                                        </CardTitle>
                                        <span className="text-[10px] font-mono text-ink-2 truncate block">
                                          {tool.badge}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <CardDescription className="text-xs text-ink-2 leading-relaxed line-clamp-3">
                                    {tool.description}
                                  </CardDescription>
                                </div>
                                <div className="mt-3.5 pt-2.5 border-t border-line/60 flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-mono text-ink-2 truncate max-w-[150px]">
                                    {tool.techMeta}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand group-hover:translate-x-1 transition-transform shrink-0">
                                    Acessar <ArrowRight className="w-3 h-3" />
                                  </span>
                                </div>
                              </Card>
                              <button
                                type="button"
                                onClick={(e) => togglePin(tool.id, e)}
                                title={isPinned ? 'Desafixar dos favoritos' : 'Fixar nos favoritos'}
                                className={`absolute top-4 right-4 z-20 p-1 rounded-md transition-colors cursor-pointer shrink-0 ${isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-ink-2/40 hover:text-ink-2'}`}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400' : ''}`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              ) : (
                /* Visualização em grade plana quando filtrado por categoria ou termo de busca */
                <motion.nav
                  aria-label="Capacidades de Inteligência Artificial"
                  variants={staggerContainer()}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {filteredTools.map((tool) => {
                    const Icon = tool.icon;
                    const isPinned = pinnedIds.includes(tool.id);

                    return (
                      <div key={tool.id} className="relative h-full group">
                        <Card
                          variant="interactive"
                          padding="sm"
                          onClick={() => handleOpenTool(tool.id)}
                          className={`h-full flex flex-col justify-between border-line group-hover:border-brand/40 bg-surface/90 dark:bg-[#121622]/90 transition-all duration-200 cursor-pointer ${tool.isFlagship ? 'ring-1 ring-brand/30' : ''}`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-3.5 pr-7">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-control bg-brand/10 border border-brand/25 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-brand group-hover:text-on-brand transition-all duration-200">
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <CardTitle className="text-sm font-bold text-ink group-hover:text-brand transition-colors line-clamp-1">
                                    {tool.label}
                                  </CardTitle>
                                  <span className="text-[10px] font-medium text-ink-2 uppercase tracking-wider block">
                                    {CATEGORY_SHORT_LABELS[tool.category]}
                                  </span>
                                </div>
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-semibold py-0.5 px-2 bg-surface-2 border-line text-ink-2 shrink-0"
                              >
                                {tool.badge}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs text-ink-2 leading-relaxed line-clamp-3">
                              {tool.description}
                            </CardDescription>
                          </div>
                          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-ink-2 truncate max-w-[190px]">
                              {tool.techMeta}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-brand group-hover:translate-x-1 transition-transform shrink-0">
                              Acessar <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </Card>
                        <button
                          type="button"
                          onClick={(e) => togglePin(tool.id, e)}
                          title={isPinned ? 'Desafixar dos favoritos' : 'Fixar nos favoritos'}
                          className={`absolute top-4 right-4 z-20 p-1 rounded-md transition-colors cursor-pointer ${isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-ink-2/40 hover:text-ink-2'}`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </motion.nav>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODO 2: DENSE COMMAND MATRIX (Alta Densidade Operacional)  */}
          {/* ======================================================== */}
          {filteredTools.length > 0 && viewMode === 'matrix' && (
            <div className="rounded-card border border-line bg-surface/90 dark:bg-[#121622]/90 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface-2/70 text-ink-2 font-mono uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 font-semibold w-12 text-center">Pin</th>
                      <th className="py-3 px-4 font-semibold">Capacidade / Agente</th>
                      <th className="py-3 px-4 font-semibold">Pilar Operacional</th>
                      <th className="py-3 px-4 font-semibold hidden md:table-cell">
                        Stack & Metadados
                      </th>
                      <th className="py-3 px-4 font-semibold">Destaque</th>
                      <th className="py-3 px-4 font-semibold text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filteredTools.map((tool) => {
                      const Icon = tool.icon;
                      const isPinned = pinnedIds.includes(tool.id);

                      return (
                        <tr
                          key={tool.id}
                          onClick={() => handleOpenTool(tool.id)}
                          className="hover:bg-surface-2/80 transition-colors cursor-pointer group"
                        >
                          {/* Pin Toggle */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => togglePin(tool.id, e)}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                isPinned
                                  ? 'text-amber-400 hover:text-amber-300'
                                  : 'text-ink-2/30 hover:text-ink-2'
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400' : ''}`} />
                            </button>
                          </td>

                          {/* Nome e Ícone */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-control bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-on-brand transition-colors">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-bold text-ink group-hover:text-brand transition-colors">
                                  {tool.label}
                                </p>
                                <p className="text-[11px] text-ink-2 line-clamp-1 max-w-sm">
                                  {tool.description}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Categoria */}
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-medium text-ink-2">
                              {CATEGORY_SHORT_LABELS[tool.category]}
                            </span>
                          </td>

                          {/* Stack Metadados */}
                          <td className="py-3 px-4 hidden md:table-cell font-mono text-[11px] text-ink-2">
                            {tool.techMeta}
                          </td>

                          {/* Badge de Destaque */}
                          <td className="py-3 px-4">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-semibold py-0.5 px-2 bg-surface-2 border-line text-ink-2 whitespace-nowrap"
                            >
                              {tool.badge}
                            </Badge>
                          </td>

                          {/* Ação */}
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-brand group-hover:translate-x-1 transition-transform">
                              Executar <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Visualização de Ferramenta Ativa (quando o usuário abre uma das 15 ferramentas)
  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Barra Superior de Navegação Rápida com Breadcrumb e Switcher */}
      <div className="p-3.5 rounded-card bg-surface/90 dark:bg-[#121622]/90 border border-line flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              SoundFX.play('navigate');
              setActiveTab(null);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-surface-2 border border-line hover:border-brand/40 text-ink text-xs font-bold hover:bg-surface transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar ao Hub</span>
            <kbd className="hidden sm:inline-block px-1 py-0.2 rounded bg-surface text-[10px] font-mono text-ink-2 border border-line">
              Esc
            </kbd>
          </button>

          <div className="h-4 w-[1px] bg-line hidden sm:block" />

          {/* Breadcrumb da ferramenta */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-ink-2">Hub de IA</span>
            <ChevronRight className="w-3.5 h-3.5 text-ink-2/60" />
            <span className="text-ink-2 font-medium">
              {CATEGORY_SHORT_LABELS[activeToolDef?.category ?? 'infra']}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-ink-2/60" />
            <span className="font-bold text-ink flex items-center gap-1.5">
              {activeToolDef?.label}
            </span>
          </div>
        </div>

        {/* Switcher Rápido de Ferramentas Adjacentes */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          <span className="text-[11px] font-semibold text-ink-2 mr-1 hidden md:inline">
            Alternar no mesmo pilar:
          </span>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {TOOL_DEFINITIONS.filter((t) => t.category === activeToolDef?.category).map((peer) => {
              const isCurrent = peer.id === activeTab;
              return (
                <button
                  key={peer.id}
                  type="button"
                  onClick={() => handleOpenTool(peer.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-control transition-colors whitespace-nowrap cursor-pointer ${
                    isCurrent
                      ? 'bg-brand text-on-brand font-bold shadow-xs'
                      : 'bg-surface-2 text-ink-2 hover:text-ink hover:bg-surface border border-line'
                  }`}
                >
                  {peer.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Renderizador do Conteúdo da Ferramenta Ativa */}
      <motion.div key={activeTab} initial="hidden" animate="show" variants={fadeInUp}>
        {activeTab === 'commercial_cell' && <EliteCommercialAgentWorkspace />}
        {activeTab === 'telemetry' && <GroqTelemetryPanel />}
        {activeTab === 'ai_suite' && <AISuiteHub />}
        {activeTab === 'swarm' && <SwarmDashboard />}
        {activeTab === 'ecosystem' && (
          <Card variant="default" padding="lg" accentBar>
            <div className="space-y-8">
              <UniversalEcosystemPanel
                mode="studio"
                onLaunchSwarmMission={() => setActiveTab('swarm')}
              />
              <UniversalEcosystemPanel
                mode="connectors"
                onLaunchSwarmMission={() => setActiveTab('swarm')}
              />
            </div>
          </Card>
        )}
        {activeTab === 'quality' && <AgentQualityPanel />}
        {activeTab === 'methodologies' && <SalesMethodologyStudio />}
        {activeTab === 'ai_config' && <AIConfigCenter />}
        {activeTab === 'superagent' && <SuperagentCreator />}
        {activeTab === 'scripts' && <RobustScriptGenerator />}
        {activeTab === 'automations' && <AutomationGuide />}
        {activeTab === 'generator' && <B2BGenerator />}
        {activeTab === 'tools' && <Intelligence />}
        {activeTab === 'copiloto' && (
          <Card variant="default" padding="lg" accentBar>
            <CopilotoIaHub />
          </Card>
        )}

        {activeTab === 'actions' && (
          <Card variant="default" padding="lg" accentBar>
            <AIPendingActions />
          </Card>
        )}

        {activeTab === 'rag' && (
          <Card variant="default" padding="lg" accentBar>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0">
                  <Database size={22} />
                </div>
                <div>
                  <CardTitle>Base de Conhecimento RAG</CardTitle>
                  <CardDescription>
                    Documentos reais indexados nesta organização. O Copiloto SDR consulta esta mesma
                    base (busca híbrida semântica + palavra-chave) para gerar abordagens contextuais
                    — nunca inventa uma fonte que não está aqui.
                  </CardDescription>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0 whitespace-nowrap">
                <Link to="/knowledge">
                  Gerenciar base <ArrowUpRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>

            {ragLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-ink-2 py-8">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando documentos…
              </div>
            )}

            {!ragLoading && ragError && (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                <p className="text-sm text-ink-2 mb-4">{ragError}</p>
                <Button variant="outline" onClick={() => void loadRagSummary()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {!ragLoading && !ragError && ragDocuments !== null && ragDocuments.length === 0 && (
              <div className="text-center py-8 border border-dashed border-line rounded-card">
                <Database className="w-10 h-10 mx-auto mb-3 text-ink-2" />
                <p className="text-sm font-semibold text-ink mb-1">
                  Nenhum documento indexado ainda
                </p>
                <p className="text-xs text-ink-2 mb-4 max-w-sm mx-auto">
                  Sem documentos, o Copiloto SDR não tem playbook para consultar — ele avisa isso em
                  vez de inventar uma resposta.
                </p>
                <Button asChild variant="outline">
                  <Link to="/knowledge">Enviar o primeiro documento</Link>
                </Button>
              </div>
            )}

            {!ragLoading && !ragError && ragDocuments !== null && ragDocuments.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider">
                  {ragDocuments.length} documento{ragDocuments.length === 1 ? '' : 's'} ·{' '}
                  {ragDocuments.reduce((sum, d) => sum + d.chunkCount, 0)} trecho(s) vetorizado(s)
                </p>
                {ragDocuments.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-5 bg-surface-2 border border-line rounded-card flex items-center justify-between group ${accent.hoverBorder} transition-colors`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full ${accent.bgSoft} flex items-center justify-center ${accent.text} shrink-0`}
                      >
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-ink text-sm truncate">{doc.title}</p>
                        <p className="text-[11px] font-semibold text-ink-2 mt-0.5 uppercase tracking-wider">
                          {doc.chunkCount} trecho{doc.chunkCount === 1 ? '' : 's'} · atualizado{' '}
                          {formatRelativeDate(doc.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                        doc.chunkCount > 0
                          ? 'bg-success/15 text-success-active dark:text-success border-success/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {doc.chunkCount > 0 ? 'Indexado' : 'Sem trechos'}
                    </div>
                  </div>
                ))}
                {ragDocuments.length > 5 && (
                  <Link
                    to="/knowledge"
                    className="block text-center text-xs font-semibold text-ink-2 hover:text-ink transition-colors pt-1"
                  >
                    Ver todos os {ragDocuments.length} documentos →
                  </Link>
                )}
              </div>
            )}
          </Card>
        )}
      </motion.div>
    </div>
  );
}
