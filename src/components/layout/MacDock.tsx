import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { hasRequiredRole, MESA_TRATAMENTO_ROLES } from '../../lib/auth/authorization.js';
import { PILLAR_ICONS } from '../brand/PillarIcons.js';
import { TAB_META, type TabType } from './tabMeta.js';
import { BirthHubLogo } from '../brand/BirthHubLogo.js';

interface NavSubRoute {
  /** TabType dono (ícone/meta). */
  tab: TabType;
  /** Sub-rota real sob /app. */
  path: string;
  label: string;
}

interface NavGroupDefinition {
  title: string;
  items: TabType[];
  /** Destinos reais que não são TabType próprio (ex.: hub de MI, prospecção inteligente). */
  subRoutes?: NavSubRoute[];
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';

interface MacDockProps {
  activeTab: TabType;
}

export function MacDock({ activeTab }: MacDockProps) {
  const navigate = useNavigate();
  const appPath = useLocation().pathname.replace(/^\/app\/?/, '');
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const { currentUser, isAdmin, canAccessCommercialIntelligence, canAccessCopilotoIa } = useAuth();

  const canManageOperations =
    !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);
  const canAccessMesaTratamento =
    !!currentUser && hasRequiredRole(currentUser.role, MESA_TRATAMENTO_ROLES);

  const allPillars = [
    'PILAR 01 — HUB COMERCIAL',
    'PILAR 02 — INTELIGÊNCIA DE MERCADO',
    'PILAR 03 — ORQUESTRAÇÃO DE VENDAS',
    'PILAR 04 — PERFORMANCE COMERCIAL',
    'PILAR 05 — PREVISIBILIDADE COMERCIAL',
    'PILAR 06 — INTELIGÊNCIA ARTIFICIAL',
    'PILAR 07 — AUTOMAÇÃO & CONECTIVIDADE',
    'PILAR 08 — ENGAJAMENTO COMERCIAL',
    'ADMINISTRAÇÃO',
  ];

  const navGroupsByJourney: NavGroupDefinition[] = [
    {
      title: 'PILAR 01 — HUB COMERCIAL',
      items: ['workspace', 'crm', 'crm360', 'propostas', 'companies', 'contacts'],
    },
    {
      title: 'PILAR 02 — INTELIGÊNCIA DE MERCADO',
      items: ['prospect', 'market-intelligence'],
      // Handoff 05: além do LDR, os dois hubs reais do pilar (antes sem caminho de navegação).
      subRoutes: [
        {
          tab: 'market-intelligence',
          path: 'market-intelligence/hub',
          label: 'Hub de Inteligência',
        },
        { tab: 'prospect', path: 'prospect/inteligente', label: 'Prospecção Inteligente' },
      ],
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
      ],
    },
    {
      title: 'ADMINISTRAÇÃO',
      items: ['notifications', 'usage', 'team', 'module-access', 'settings'].filter((item) => {
        if (item === 'notifications' || item === 'settings') return true;
        return isAdmin;
      }) as TabType[],
    },
  ];

  const GROUP_ORDER_BY_ROLE: Partial<Record<string, string[]>> = {
    CLOSER: allPillars,
    GESTOR: allPillars,
    ADMIN: allPillars,
    VISUALIZADOR: allPillars,
    SDR: allPillars,
  };

  const roleOrder = GROUP_ORDER_BY_ROLE[currentUser?.role ?? ''];
  const navGroups = roleOrder
    ? [...navGroupsByJourney].sort(
        (a, b) => roleOrder.indexOf(a.title) - roleOrder.indexOf(b.title),
      )
    : navGroupsByJourney;

  // Find which group is currently active
  const activeGroup = navGroups.find((g) => g.items.includes(activeTab)) || navGroups[0];
  const activeSubRoute = activeGroup.subRoutes?.find(
    (r) => appPath === r.path || appPath.startsWith(`${r.path}/`),
  );

  return (
    <div className="flex flex-col w-full z-40 shrink-0">
      {/* Top Dock Bar */}
      <div className="flex items-center justify-center h-[72px] w-full bg-surface-elevated border-b border-line px-6 relative font-sans text-ink">
        {/* Left Side Logo */}
        <div className="absolute left-6 flex items-center gap-3">
          <BirthHubLogo variant="micro" animated className="h-10 w-10" />
          <div className="leading-tight hidden sm:block">
            <h1 className="font-display text-[13px] font-semibold text-ink tracking-tight">
              Birth Hub 360°
            </h1>
            <p className="text-[10px] text-ink-2 tracking-widest uppercase mt-0.5">
              Command Center
            </p>
          </div>
        </div>

        {/* The Dock */}
        <div className="flex items-end gap-3 h-full pb-3">
          {navGroups.map((group) => {
            const isGroupActive = group === activeGroup;
            const isHovered = hoveredGroup === group.title;
            const Icon = PILLAR_ICONS[group.title];
            const cleanTitle = group.title
              .replace('PILAR 0', '')
              .replace(/^\d+ - /, '')
              .replace(/^\d+ — /, '');

            return (
              <div
                key={group.title}
                role="group"
                className="relative flex flex-col items-center"
                onMouseEnter={() => setHoveredGroup(group.title)}
                onMouseLeave={() => setHoveredGroup(null)}
              >
                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-[52px] whitespace-nowrap bg-surface-elevated text-ink border border-line text-[11px] font-semibold tracking-wider px-3 py-1.5 rounded-md shadow-lg z-50 pointer-events-none"
                    >
                      {cleanTitle}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dock Icon */}
                <motion.button
                  type="button"
                  onClick={() => {
                    if (group.items.length > 0) {
                      navigate(`/app/${group.items[0]}`);
                    }
                  }}
                  whileHover={{ scale: 1.35, y: 4 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  aria-label={cleanTitle}
                  className={`relative grid place-items-center w-[46px] h-[46px] rounded-md border transition-colors ${FOCUS_RING} ${
                    isGroupActive
                      ? 'bg-surface border-brand ring-1 ring-focus-ring/40 text-primary'
                      : 'bg-surface border-transparent text-ink-2 hover:text-ink hover:border-line'
                  }`}
                >
                  {Icon ? <Icon isActive={isGroupActive} className="w-[22px] h-[22px]" /> : null}

                  {/* Active Indicator dot */}
                  {isGroupActive && (
                    <motion.div
                      layoutId="active-dock-dot"
                      className="absolute -top-2 w-1.5 h-1.5 rounded-full bg-brand"
                    />
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Bar - Sub items of the active pillar */}
      <div className="flex items-center justify-center gap-1.5 h-[44px] w-full bg-surface border-b border-line px-6 overflow-x-auto custom-scrollbar">
        {activeGroup.items.map((tabId) => {
          const meta = TAB_META[tabId];
          if (!meta) return null;
          const isTabActive = activeTab === tabId && !activeSubRoute;
          const SubIcon = meta.icon;

          return (
            <button
              key={tabId}
              type="button"
              onClick={() => navigate(`/app/${tabId}`)}
              aria-current={isTabActive ? 'page' : undefined}
              className={`flex items-center gap-2 px-3 py-1 rounded-md border text-[12.5px] font-medium transition-colors whitespace-nowrap ${FOCUS_RING} ${
                isTabActive
                  ? 'bg-surface-elevated border-brand text-ink font-semibold'
                  : 'border-transparent text-ink-2 hover:text-ink hover:bg-surface-elevated'
              }`}
            >
              <SubIcon size={14} strokeWidth={isTabActive ? 2 : 1.75} />
              {meta.label}
            </button>
          );
        })}
        {activeGroup.subRoutes?.map((route) => {
          const meta = TAB_META[route.tab];
          const SubIcon = meta?.icon;
          const isRouteActive = activeSubRoute === route;
          return (
            <button
              key={route.path}
              type="button"
              onClick={() => navigate(`/app/${route.path}`)}
              aria-current={isRouteActive ? 'page' : undefined}
              className={`flex items-center gap-2 px-3 py-1 rounded-md border text-[12.5px] font-medium transition-colors whitespace-nowrap ${FOCUS_RING} ${
                isRouteActive
                  ? 'bg-surface-elevated border-brand text-ink font-semibold'
                  : 'border-transparent text-ink-2 hover:text-ink hover:bg-surface-elevated'
              }`}
            >
              {SubIcon ? <SubIcon size={14} strokeWidth={isRouteActive ? 2 : 1.75} /> : null}
              {route.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
