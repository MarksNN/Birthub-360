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
  Loader2,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
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
import { fadeInUp, SPRING_SOFT, staggerContainer, staggerItem } from '../../../lib/motion.js';
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

export type IntelligenceTab =
  | 'telemetry'
  | 'ai_suite'
  | 'swarm'
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
    description:
      'Workspace executivo dos 12 agentes comerciais da Tríade e Swarm (BDR, Closer, AM) com Next Best Action, traces de governança e orquestração.',
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
    description:
      'Análise em tempo real de chamadas, transcrição de reuniões e coaching comercial com deal health e extração automática de compromissos.',
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
    description:
      'Dispara missões comerciais coordenadas entre SDR, Closer e CRM em lote, com acompanhamento de pipeline e execução paralela.',
    techMeta: 'Execução Concorrente · Swarm',
    keywords: ['enxame', 'swarm', 'missão', 'lote', 'multi-agente', 'paralelo'],
  },
  {
    id: 'superagent',
    label: 'Criador de Copiloto & Agentes',
    category: 'agents',
    icon: Sparkles,
    badge: 'Provisionamento',
    badgeColor: 'pink',
    description:
      'Modelagem e provisionamento de novos agentes comerciais: configure persona, ferramentas permitidas, memória operacional e exporte blueprints.',
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
    description:
      'Geração cirúrgica e imediata de scripts para cold call, mensagens de WhatsApp, e-mails de conversão e battlecards para o lead.',
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
    description:
      'Estruturação tática de roteiros comerciais nos frameworks clássicos: SPIN Selling, SNAP, AIDA, MEDDPICC e Challenger Sale.',
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
    description:
      'Simulador de perguntas de qualificação, levantamento de dores e matriz de contorno de objeções customizada pelo ICP.',
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
    description:
      'Geração de scripts em Node.js, Python e Shell para tarefas operacionais de scraping, ETL de leads e automação de APIs.',
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
    description:
      'Fila executiva de aprovação humana: revise e autorize ações de alto impacto propostas pela IA com análise de risco e nível de confiança.',
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
    description:
      'Harness contínuo de avaliação: métricas de latência, taxa de override humano, acurácia, proteção de PII e Golden Dataset.',
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
    description:
      'Métricas de inferência em tempo real: TTFT (Time to First Token), consumo de tokens, throughput e custo projetado na Groq Cloud.',
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
    description:
      'Console de execução e orquestração dos 20 motores de IA (Ollama local e modelos de ponta em nuvem) disponíveis na plataforma.',
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
    description:
      'Base corporativa de documentos vetorizados que os copilotos consultam para responder com contexto de negócio e zero alucinação.',
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
    description:
      'Roteamento refinado de modelos e ajuste fino de temperatura para cada pipeline de geração e classificação do sistema.',
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
    description:
      'Guias operacionais e blueprints de workflows no n8n e webhooks para conectar eventos do CRM a ações externas.',
    techMeta: 'n8n · Webhooks · Gatilhos',
    keywords: ['automações', 'n8n', 'workflow', 'webhooks', 'gatilhos', 'conectores'],
  },
];

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
  const accent = useBrandAccent();

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

  const _flagshipTool = useMemo(() => {
    return TOOL_DEFINITIONS.find((t) => t.isFlagship) ?? TOOL_DEFINITIONS[0];
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
            <div className="p-3.5 rounded-card bg-surface/90 dark:bg-[#121622]/90 border border-line flex items-center gap-3">
              <div className="w-9 h-9 rounded-control bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-ink-2 uppercase tracking-wider">
                  Célula Autônoma
                </p>
                <p className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  12 Agentes Prontos
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-card bg-surface/90 dark:bg-[#121622]/90 border border-line flex items-center gap-3">
              <div className="w-9 h-9 rounded-control bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <Gauge className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-ink-2 uppercase tracking-wider">
                  Groq Cloud LPU
                </p>
                <p className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Ultra-Low Latency
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-card bg-surface/90 dark:bg-[#121622]/90 border border-line flex items-center gap-3">
              <div className="w-9 h-9 rounded-control bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-ink-2 uppercase tracking-wider">
                  Governança & Evals
                </p>
                <p className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Guardrails Ativos
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-card bg-surface/90 dark:bg-[#121622]/90 border border-line flex items-center gap-3">
              <div className="w-9 h-9 rounded-control bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-ink-2 uppercase tracking-wider">
                  Base Vetorial
                </p>
                <p className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  RAG Híbrido Conectado
                </p>
              </div>
            </div>
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
                    onClick={() => setActiveTab('commercial_cell')}
                    className="w-full sm:w-auto bg-gradient-to-r from-brand to-[#00a8ff] text-on-brand font-bold shadow-glow-brand hover:opacity-95 transition-all text-sm gap-2"
                  >
                    Acessar Célula Comercial <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Barra de Navegação por Categorias e Campo de Busca */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                      onClick={() => setSelectedCategory(cat.id)}
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

              {/* Input de Busca Rápida */}
              <div className="relative min-w-[240px] sm:w-72">
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink p-0.5"
                    aria-label="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
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

          {/* Grade de Cards das Ferramentas com Distribuição Elegante e Hierarquia */}
          {filteredTools.length > 0 && (
            <motion.nav
              aria-label="Capacidades de Inteligência Artificial"
              variants={staggerContainer()}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredTools.map((tool) => {
                const Icon = tool.icon;
                const isSpecial = tool.isFlagship;

                return (
                  <motion.button
                    key={tool.id}
                    type="button"
                    variants={staggerItem}
                    transition={SPRING_SOFT}
                    onClick={() => setActiveTab(tool.id)}
                    className="text-left cursor-pointer group outline-none h-full"
                  >
                    <Card
                      variant="interactive"
                      padding="sm"
                      className={`h-full flex flex-col justify-between border-line group-hover:border-brand/40 bg-surface/90 dark:bg-[#121622]/90 transition-all duration-200 ${
                        isSpecial ? 'ring-1 ring-brand/30' : ''
                      }`}
                    >
                      <div>
                        {/* Topo do Card: Ícone e Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-control bg-brand/10 border border-brand/25 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-brand group-hover:text-on-brand transition-all duration-200">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-bold text-ink group-hover:text-brand transition-colors line-clamp-1">
                                {tool.label}
                              </CardTitle>
                              <span className="text-[10px] font-medium text-ink-2 uppercase tracking-wider">
                                {tool.category === 'agents'
                                  ? 'Célula & Enxame'
                                  : tool.category === 'tactical'
                                    ? 'Operação Tática'
                                    : tool.category === 'governance'
                                      ? 'Governança & Evals'
                                      : 'Infra & Modelos'}
                              </span>
                            </div>
                          </div>

                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold shrink-0 py-0.5 px-2 bg-surface-2 border-line text-ink-2"
                          >
                            {tool.badge}
                          </Badge>
                        </div>

                        {/* Descrição Funcional */}
                        <CardDescription className="text-xs text-ink-2 leading-relaxed line-clamp-3">
                          {tool.description}
                        </CardDescription>
                      </div>

                      {/* Rodapé do Card com Meta Técnica e Link de Ação */}
                      <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-ink-2 truncate max-w-[190px]">
                          {tool.techMeta}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand group-hover:translate-x-1 transition-transform shrink-0">
                          Acessar <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Card>
                  </motion.button>
                );
              })}
            </motion.nav>
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
            onClick={() => setActiveTab(null)}
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
              {activeToolDef?.category === 'agents'
                ? 'Células & Enxames'
                : activeToolDef?.category === 'tactical'
                  ? 'Operação Tática'
                  : activeToolDef?.category === 'governance'
                    ? 'Governança & Decisão'
                    : 'Infraestrutura'}
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
            Alternar ferramenta:
          </span>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {TOOL_DEFINITIONS.filter((t) => t.category === activeToolDef?.category).map((peer) => {
              const isCurrent = peer.id === activeTab;
              return (
                <button
                  key={peer.id}
                  type="button"
                  onClick={() => setActiveTab(peer.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-control transition-colors whitespace-nowrap cursor-pointer ${
                    isCurrent
                      ? 'bg-brand text-on-brand font-bold'
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
