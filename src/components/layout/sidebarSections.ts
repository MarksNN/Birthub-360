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
      title: 'COMMAND CENTER',
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
          ],
        },
      ],
    },
    {
      title: 'INTELLIGENCE',
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
      title: 'EXECUTION',
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
        },
        {
          id: 'activities',
          label: 'Agenda',
          icon: TAB_META.activities.icon,
          primaryTab: 'activities',
        },
        {
          id: 'workflows',
          label: 'Workflows',
          icon: TAB_META.jornadas.icon,
          primaryTab: 'jornadas',
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
      title: 'RELATIONSHIPS',
      groups: [
        {
          id: 'companies',
          label: 'Empresas',
          icon: TAB_META.companies.icon,
          primaryTab: 'companies',
        },
        {
          id: 'contacts',
          label: 'Contatos',
          icon: TAB_META.contacts.icon,
          primaryTab: 'contacts',
        },
        {
          id: 'decisores',
          label: 'Decisores',
          icon: Shield,
          primaryTab: 'contacts',
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
        },
        {
          id: 'metas',
          label: 'Metas',
          icon: TAB_META.metas.icon,
          primaryTab: 'metas',
        },
        {
          id: 'gamification',
          label: 'Gamificação',
          icon: TAB_META.roleplay.icon,
          primaryTab: 'roleplay',
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
