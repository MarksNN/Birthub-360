import { Shield } from 'lucide-react';
import type React from 'react';
import { TAB_META, type TabType } from './tabMeta.js';

export interface NavSubItem {
  tab: TabType;
  label: string;
  /**
   * Sub-rota real sob /app (ex.: `market-intelligence/hub`). Quando presente, a navegação vai
   * para `/app/<path>` e o item só fica ativo nessa URL exata — `tab` continua sendo o TabType
   * "dono" (meta/ícone/animação). Sem `path`, navega para `/app/<tab>` como antes.
   */
  path?: string;
}

export interface NavGroupItem {
  id: string;
  label: string;
  sublabel?: string;
  ariaLabel?: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number | string }>;
  primaryTab?: TabType;
  subItems?: NavSubItem[];
  accentColor?: string;
}

export interface NavSection {
  title: string;
  groups: NavGroupItem[];
}

export interface SidebarNavPermissions {
  canAccessCommercialIntelligence?: boolean;
  canAccessCopilotoIa?: boolean;
  canManageOperations?: boolean;
  isAdmin?: boolean;
}

export function getSidebarNavSections(permissions: SidebarNavPermissions): NavSection[] {
  const {
    canAccessCommercialIntelligence = false,
    canAccessCopilotoIa = false,
    canManageOperations = false,
    isAdmin = false,
  } = permissions;

  return [
    {
      title: 'CENTRAL DE COMANDO',
      groups: [
        {
          id: 'dashboard',
          label: 'Visão Geral',
          sublabel: 'Visão executiva e operacional',
          icon: TAB_META.dashboard.icon,
          primaryTab: 'dashboard',
        },
        {
          id: 'workspace',
          label: TAB_META.workspace.label,
          icon: TAB_META.workspace.icon,
          primaryTab: 'workspace',
          subItems: [
            { tab: 'workspace', label: 'Meu Espaço' },
            { tab: 'daily-plan', label: 'Plano Diário' },
            { tab: 'notifications', label: 'Notificações' },
          ],
        },
      ],
    },
    {
      title: 'RECEITA',
      groups: [
        {
          id: 'revenue_tree',
          label: 'Pipeline CRM',
          ariaLabel: 'Pipeline CRM',
          icon: TAB_META.crm.icon,
          primaryTab: 'crm',
          subItems: [
            { tab: 'crm', label: 'Pipeline' },
            { tab: 'crm360', label: 'Negócios' },
            { tab: 'propostas', label: 'Propostas' },
            { tab: 'forecast', label: 'Forecast' },
            { tab: 'pipeline_ponderado', label: 'Pipeline Ponderado' },
            { tab: 'mesa-tratamento', label: 'Mesa de Tratamento' },
          ],
        },
      ],
    },
    {
      title: 'INTELIGÊNCIA',
      groups: [
        {
          // Handoff 05: LDR (`/app/market-intelligence`) + Hub de MI (`/app/market-intelligence/hub`)
          // — ambas rotas reais em App.tsx; antes o hub não tinha nenhum caminho de navegação.
          id: 'market-intelligence',
          label: 'Inteligência de Mercado',
          icon: TAB_META['market-intelligence'].icon,
          primaryTab: 'market-intelligence',
          subItems: [
            { tab: 'market-intelligence', label: 'Pesquisa LDR' },
            {
              tab: 'market-intelligence',
              path: 'market-intelligence/hub',
              label: 'Hub de Inteligência',
            },
          ],
        },
        ...(canAccessCommercialIntelligence
          ? [
              {
                id: 'commercial_intelligence',
                label: TAB_META.commercial_intelligence.label,
                ariaLabel: 'Comercial Inteligente',
                icon: TAB_META.commercial_intelligence.icon,
                primaryTab: 'commercial_intelligence' as TabType,
              },
            ]
          : []),
        {
          id: 'signals-risks',
          label: 'Sinais & Riscos',
          icon: TAB_META['signals-risks'].icon,
          primaryTab: 'signals-risks',
          subItems: [
            { tab: 'signals-risks', path: 'signals-risks/radar', label: 'Radar de Sinais' },
            { tab: 'signals-risks', path: 'signals-risks/deal-risks', label: 'Riscos de Deals' },
          ],
        },
        {
          id: 'intelligence',
          label: 'Hub de IA',
          icon: TAB_META.intelligence.icon,
          primaryTab: 'intelligence',
          subItems: [
            { tab: 'intelligence', label: 'Hub de IA' },
            { tab: 'knowledge', label: 'Base de Conhecimento' },
            { tab: 'sdr-diagnostic', label: 'Diagnóstico SDR' },
          ],
        },
        ...(canAccessCopilotoIa
          ? [
              {
                id: 'copilot',
                label: 'Copiloto IA',
                icon: TAB_META.copiloto_ia.icon,
                primaryTab: 'copiloto_ia' as TabType,
              },
            ]
          : []),
      ],
    },
    {
      title: 'EXECUÇÃO',
      groups: [
        {
          // Handoff 05: Prospecção Inteligente (`/app/prospect/inteligente`) era rota órfã.
          id: 'prospecting',
          label: 'Prospecção',
          icon: TAB_META.prospect.icon,
          primaryTab: 'prospect',
          subItems: [
            { tab: 'prospect', label: 'Prospecção' },
            { tab: 'prospect', path: 'prospect/inteligente', label: 'Prospecção Inteligente' },
          ],
        },
        {
          id: 'cadences',
          label: 'Cadências',
          icon: TAB_META.cadence.icon,
          primaryTab: 'cadence',
          subItems: [
            { tab: 'cadence', label: 'Cadências' },
            { tab: 'roteiros', label: 'Roteiros de Abordagem' },
            { tab: 'chatbook', label: 'Chatbook' },
          ],
        },
        {
          id: 'activities',
          label: 'Agenda',
          icon: TAB_META.activities.icon,
          primaryTab: 'activities',
          subItems: [
            { tab: 'activities', label: 'Tarefas & Atividades' },
            { tab: 'calendar', label: 'Calendário' },
          ],
        },
        {
          id: 'workflows',
          label: 'Orquestração & Playbooks',
          ariaLabel: 'Workflows',
          icon: TAB_META.jornadas.icon,
          primaryTab: 'jornadas',
          subItems: [
            { tab: 'jornadas', label: 'Jornadas Comerciais' },
            { tab: 'playbooks', label: 'Playbooks Comerciais' },
            { tab: 'processos', label: 'Processos de Vendas' },
            { tab: 'editor', label: 'Editor de Documentos' },
          ],
        },
        ...(canManageOperations
          ? [
              {
                id: 'automations',
                label: 'Automações',
                icon: TAB_META.automations.icon,
                primaryTab: 'automations' as TabType,
              },
            ]
          : []),
      ],
    },
    {
      title: 'RELACIONAMENTO',
      groups: [
        {
          id: 'companies',
          label: 'Empresas',
          icon: TAB_META.companies.icon,
          primaryTab: 'companies',
        },
        {
          id: 'contacts',
          label: 'Contatos & Decisores',
          ariaLabel: 'Contatos',
          icon: TAB_META.contacts.icon,
          primaryTab: 'contacts',
          subItems: [
            { tab: 'contacts', label: 'Base de Contatos' },
            { tab: 'contacts', path: 'contacts?view=decisores', label: 'Mapeamento de Decisores' },
          ],
        },
      ],
    },
    {
      title: 'PERFORMANCE',
      groups: [
        {
          id: 'performance',
          label: TAB_META.analytics.label,
          ariaLabel: TAB_META.analytics.label,
          icon: TAB_META.analytics.icon,
          primaryTab: 'analytics',
          subItems: [
            { tab: 'analytics', label: 'Analytics' },
            { tab: 'winloss', label: 'Win/Loss' },
            { tab: 'reports', label: 'Relatórios Avançados' },
          ],
        },
        {
          id: 'metas',
          label: 'Metas',
          icon: TAB_META.metas.icon,
          primaryTab: 'metas',
        },
        {
          id: 'gamification',
          label: TAB_META.gamification.label,
          icon: TAB_META.gamification.icon,
          primaryTab: 'gamification',
          subItems: [
            { tab: 'gamification', label: 'Gamificação & Ranking' },
            { tab: 'roleplay', label: 'Roleplay IA' },
            { tab: 'qualification_matrix', label: 'Matriz de Qualificação' },
            { tab: 'objections_matrix', label: 'Matriz de Objeções' },
            { tab: 'topic_training', label: 'Academy' },
          ],
        },
      ],
    },
    ...(canManageOperations || isAdmin
      ? [
          {
            title: 'GOVERNANÇA',
            groups: [
              ...(canManageOperations
                ? [
                    {
                      id: 'integrations',
                      label: 'Integrações',
                      icon: TAB_META.integrations.icon,
                      primaryTab: 'integrations' as TabType,
                      subItems: [
                        { tab: 'integrations', label: 'Hub de Integrações' },
                        { tab: 'bitrix', label: 'Guia Prático Bitrix24' },
                      ],
                    },
                  ]
                : []),
              ...(isAdmin
                ? [
                    {
                      id: 'team',
                      label: 'Gestão de Time',
                      icon: TAB_META.team.icon,
                      primaryTab: 'team' as TabType,
                      subItems: [
                        { tab: 'team', label: 'Equipe' },
                        { tab: 'module-access', label: 'Acesso a Módulos' },
                        { tab: 'usage', label: 'Consumo de IA' },
                      ],
                    },
                  ]
                : []),
              {
                id: 'settings',
                label: 'Configurações',
                icon: TAB_META.settings.icon,
                primaryTab: 'settings' as TabType,
              },
            ],
          },
        ]
      : []),
  ];
}
