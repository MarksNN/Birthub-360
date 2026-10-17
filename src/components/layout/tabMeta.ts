import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Database,
  FileBarChart,
  FileSignature,
  FileText,
  Gauge,
  GitBranch,
  Globe,
  Headset,
  Layers,
  LineChart,
  MessageSquare,
  MessageSquareText,
  Mic,
  Network,
  PhoneCall,
  Radar,
  Repeat,
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Target,
  Trophy,
  UserCog,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  AIIcon,
  AutomationIcon,
  HubIcon,
  IntelligenceIcon,
  OrchestrationIcon,
  PerformanceIcon,
} from '../brand/PillarIcons.js';

/**
 * Identificador de cada módulo navegável — fonte única usada pela Sidebar, Topbar e Command
 * Palette.
 *
 * Nota: `enrich` e `prompts` existiram aqui até a Onda 10 sem nenhuma `<Route>` correspondente em
 * `App.tsx`, nem entrada na Sidebar (`Sidebar.tsx`) nem no Command Palette (`MODULE_ORDER` em
 * `CommandPalette.tsx`) — eram destinos "fantasma", alcançáveis só via `navigationBus` (comando de
 * voz/deep link), que caíam silenciosamente no catch-all `/app`. Removidos por não corresponderem
 * a nenhuma tela real hoje: enriquecimento de empresa já vive dentro de `prospect`
 * (`ProspectingHub`), e não há uma tela "Commercial OS"/Prompt Studio real e navegável — só um
 * componente órfão (`PromptStudio.tsx`) sem rota. Ver
 * `.agents/handoffs/onda-8/09-para-02-navigationbus-rotas-ausentes.md`.
 *
 * `social-selling`, `treinamento-birthhub360`, `proposta-comercial` e `hub-inteligencia-marketing`
 * existiram aqui como TabType/rotas `/app/:tab` até este piloto de acesso — foram REMOVIDOS
 * porque essas telas não vivem mais dentro do CRM (pedido explícito do usuário: "não quero que
 * apareça no CRM, só nos círculos" do Hub Executivo standalone). Suas rotas reais agora são
 * top-level em App.tsx (fora de `/app/*`, sem MainLayout/Sidebar), guardadas por
 * `RequireModuleAccess` em vez de `RequireUserAllowed` — ver ModuleAccessGrant em
 * prisma/schema.prisma e src/features/module-access/.
 *
 * Atualização (09/2026, pedido explícito do usuário: "Birth Hub 360 não é ninguém, não é nem mais pra
 * existir"): de `treinamento-birthhub360`, `proposta-comercial` e `hub-inteligencia-marketing` acima,
 * só resta a menção histórica neste comentário — os módulos em si (catálogo, rotas top-level,
 * componentes, conteúdo estático) foram removidos por completo, não só do CRM. `social-selling`
 * continua existindo como rota top-level (ver App.tsx), rerotulado para a marca Birth Hub 360.
 */
export type TabType =
  | 'dashboard'
  | 'workspace'
  | 'companies'
  | 'contacts'
  | 'crm'
  | 'crm360'
  | 'mesa-tratamento'
  | 'activities'
  | 'cadence'
  | 'prospect'
  | 'signals-risks'
  | 'intelligence'
  | 'market-intelligence'
  | 'propostas'
  | 'chatbook'
  | 'roleplay'
  | 'gamification'
  | 'qualification_matrix'
  | 'objections_matrix'
  | 'topic_training'
  | 'bitrix'
  | 'reports'
  | 'integrations'
  | 'knowledge'
  | 'analytics'
  | 'winloss'
  | 'calendar'
  | 'notifications'
  | 'automations'
  | 'usage'
  | 'editor'
  | 'team'
  | 'settings'
  | 'daily-plan'
  | 'sdr-diagnostic'
  | 'commercial_intelligence'
  | 'copiloto_ia'
  | 'module-access'
  | 'voice-hub'
  | 'outbound'
  | 'dialer'
  | 'forecast'
  | 'metas'
  | 'pipeline_ponderado'
  | 'playbooks'
  | 'jornadas'
  | 'processos'
  | 'roteiros'
  | 'settings_hub'
  | 'settings_market'
  | 'settings_sales'
  | 'settings_performance'
  | 'settings_predictability'
  | 'settings_ai'
  | 'settings_automation'
  | 'settings_engagement';

/**
 * Matiz do ícone de cada módulo na navegação lateral — chave para uma das variáveis
 * `--nav-c-*` de `src/styles/globals.css` (todas derivadas dos tokens de marca, calibradas nos dois
 * temas). Um matiz por "tipo" de módulo, como o painel de navegação do Explorer do Windows.
 */
export type NavAccent = 'gold' | 'iris' | 'blue' | 'red' | 'green' | 'violet' | 'teal' | 'slate';

export const NAV_ACCENT_VAR: Record<NavAccent, string> = {
  gold: 'var(--nav-c-gold)',
  iris: 'var(--nav-c-iris)',
  blue: 'var(--nav-c-blue)',
  red: 'var(--nav-c-red)',
  green: 'var(--nav-c-green)',
  violet: 'var(--nav-c-violet)',
  teal: 'var(--nav-c-teal)',
  slate: 'var(--nav-c-slate)',
};

/** Metadados (rótulo + ícone + matiz) de cada módulo navegável — fonte única usada pela Sidebar, pelo
 * topbar e pelo Command Palette. Cada módulo tem um ícone SVG próprio (nenhum repetido).
 * Atualizado para paradigma Command Center: seções estratégicas agrupadas por função de comando. */
export const TAB_META: Record<TabType, { label: string; icon: any; accent: NavAccent }> = {
  // PILAR 01 — HUB COMERCIAL
  workspace: { label: 'Meu Espaço', icon: Briefcase, accent: 'blue' },
  crm: { label: 'Pipeline CRM', icon: HubIcon as any, accent: 'blue' },
  crm360: { label: 'Gestão de Negócios', icon: Gauge, accent: 'violet' },
  propostas: { label: 'Propostas', icon: FileSignature, accent: 'gold' },
  companies: { label: 'Empresas', icon: Building2, accent: 'green' },
  contacts: { label: 'Decisores', icon: Users, accent: 'iris' },
  settings_hub: { label: 'Ajustes do Hub', icon: SettingsIcon, accent: 'slate' },

  // PILAR 02 — INTELIGÊNCIA DE MERCADO
  prospect: { label: 'Prospecção', icon: IntelligenceIcon as any, accent: 'teal' },
  'market-intelligence': { label: 'Pesquisa de Mercado', icon: Radar, accent: 'teal' },
  settings_market: { label: 'Ajustes de Mercado', icon: SettingsIcon, accent: 'slate' },

  // PILAR 03 — ORQUESTRAÇÃO DE VENDAS
  playbooks: { label: 'Playbooks Comerciais', icon: BookOpen, accent: 'blue' },
  cadence: { label: 'Cadências', icon: Repeat, accent: 'green' },
  jornadas: { label: 'Jornadas Comerciais', icon: GitBranch, accent: 'violet' },
  processos: { label: 'Processos de Vendas', icon: Network, accent: 'teal' },
  roteiros: { label: 'Roteiros de Abordagem', icon: MessageSquareText, accent: 'gold' },
  'daily-plan': { label: 'Plano Diário', icon: OrchestrationIcon as any, accent: 'green' },
  activities: { label: 'Tarefas & Atividades', icon: Activity, accent: 'iris' },
  calendar: { label: 'Calendário', icon: CalendarDays, accent: 'blue' },
  qualification_matrix: { label: 'Matriz de Qualificação', icon: ClipboardCheck, accent: 'teal' },
  objections_matrix: { label: 'Matriz de Objeções', icon: Shield, accent: 'violet' },
  roleplay: { label: 'Roleplay', icon: PhoneCall, accent: 'red' },
  topic_training: { label: 'Academy', icon: BookOpen, accent: 'gold' },
  chatbook: { label: 'Chatbook', icon: MessageSquare, accent: 'blue' },
  editor: { label: 'Editor de Documentos', icon: FileText, accent: 'slate' },
  settings_sales: { label: 'Ajustes de Orquestração', icon: SettingsIcon, accent: 'slate' },

  // PILAR 04 — PERFORMANCE COMERCIAL
  dashboard: { label: 'Command Center', icon: PerformanceIcon as any, accent: 'gold' },
  analytics: { label: 'Analytics', icon: BarChart3, accent: 'blue' },
  winloss: { label: 'Win/Loss', icon: Target, accent: 'red' },
  reports: { label: 'Relatórios Avançados', icon: FileBarChart, accent: 'slate' },
  gamification: { label: 'Gamificação & Ranking', icon: Trophy, accent: 'gold' },
  settings_performance: { label: 'Ajustes de Performance', icon: SettingsIcon, accent: 'slate' },

  // PILAR 05 — PREVISIBILIDADE COMERCIAL
  forecast: { label: 'Forecast', icon: LineChart, accent: 'gold' },
  metas: { label: 'Metas e Projeções', icon: Target, accent: 'blue' },
  pipeline_ponderado: { label: 'Pipeline Ponderado', icon: Layers, accent: 'teal' },
  settings_predictability: {
    label: 'Ajustes de Previsibilidade',
    icon: SettingsIcon,
    accent: 'slate',
  },

  // PILAR 06 — INTELIGÊNCIA ARTIFICIAL
  commercial_intelligence: {
    label: 'Inteligência de Vendas',
    icon: AIIcon as any,
    accent: 'violet',
  },
  copiloto_ia: { label: 'Copiloto IA', icon: Mic, accent: 'iris' },
  'signals-risks': { label: 'Sinais & Riscos', icon: ShieldAlert, accent: 'gold' },
  intelligence: { label: 'Hub de IA', icon: Zap, accent: 'gold' },
  knowledge: { label: 'Base de Conhecimento', icon: Database, accent: 'green' },
  'sdr-diagnostic': { label: 'Diagnóstico SDR', icon: Stethoscope, accent: 'green' },
  settings_ai: { label: 'Ajustes de IA', icon: SettingsIcon, accent: 'slate' },

  // PILAR 07 — AUTOMAÇÃO & CONECTIVIDADE
  automations: { label: 'Automações', icon: AutomationIcon as any, accent: 'gold' },
  integrations: { label: 'Integrações', icon: Globe, accent: 'blue' },
  bitrix: { label: 'Guia Prático Bitrix24', icon: Layers, accent: 'teal' },
  settings_automation: { label: 'Ajustes de Automação', icon: SettingsIcon, accent: 'slate' },

  // PILAR 08 — ENGAJAMENTO COMERCIAL
  // P0 #693 item 6 (handoff 17→02): voice-hub/outbound/dialer estão atrás de `legacyModuleGate`
  // (503 MODULE_NOT_READY intencional). Rótulos honestos até o 12 liberar o módulo real — nada de
  // prometer "Discador 3CX" quando a rota cai em Cadências. Ver NAV_HIDDEN_TABS/NAV_TAB_ALIASES.
  'voice-hub': { label: 'Voice Hub (indisponível)', icon: Mic, accent: 'iris' },
  outbound: { label: 'Outbound AI (indisponível)', icon: PhoneCall, accent: 'red' },
  dialer: { label: 'Cadências (discador indisponível)', icon: PhoneCall, accent: 'teal' },
  'mesa-tratamento': { label: 'Mesa de Tratamento', icon: Headset, accent: 'red' },
  settings_engagement: { label: 'Ajustes de Engajamento', icon: SettingsIcon, accent: 'slate' },

  // ADMINISTRAÇÃO & CONFIGURAÇÕES
  notifications: { label: 'Notificações', icon: Bell, accent: 'gold' },
  usage: { label: 'Consumo de IA', icon: Wallet, accent: 'violet' },
  team: { label: 'Equipe', icon: UserCog, accent: 'blue' },
  'module-access': { label: 'Acesso a Módulos', icon: ShieldCheck, accent: 'green' },
  settings: { label: 'Ajustes Globais', icon: SettingsIcon, accent: 'slate' },
};

/**
 * P0 #693 item 6 (handoff 17→02) — módulos com backend em `legacyModuleGate`
 * (`/api/voice-hub/*`, `/api/outbound/*`, `/api/dialer-3cx/*` → 503 MODULE_NOT_READY intencional).
 * Não aparecem na navegação (dock, sidebar, voz) até o 12 reabrir o gate com isolamento por org.
 * `dialer` também sai da nav: o destino real dele é Cadências (ver NAV_TAB_ALIASES).
 * Superfícies em `src/components/ui/**` (CommandPalette, ModuleAgentWidget) devem filtrar por aqui.
 */
export const NAV_HIDDEN_TABS: ReadonlySet<TabType> = new Set<TabType>([
  'voice-hub',
  'outbound',
  'dialer',
]);

/** Destino canônico de tabs que são apenas alias de outro módulo. `/app/dialer` → `/app/cadence`. */
export const NAV_TAB_ALIASES: Readonly<Partial<Record<TabType, TabType>>> = { dialer: 'cadence' };

export function isNavHiddenTab(tab: TabType): boolean {
  return NAV_HIDDEN_TABS.has(tab);
}
