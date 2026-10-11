import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { hasRequiredRole, MESA_TRATAMENTO_ROLES } from '../../lib/auth/authorization.js';
import { PILLAR_ICONS } from '../brand/PillarIcons.js';
import { TAB_META, type TabType } from './tabMeta.js';
import { BirthHubLogo } from '../brand/BirthHubLogo.js';

interface NavGroupDefinition {
  title: string;
  items: TabType[];
}

interface MacDockProps {
  activeTab: TabType;
}

export function MacDock({ activeTab }: MacDockProps) {
  const navigate = useNavigate();
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

  return (
    <div className="flex flex-col w-full z-40 shrink-0">
      {/* Top Dock Bar */}
      <div className="flex items-center justify-center h-[72px] w-full bg-midnight/95 backdrop-blur-2xl border-b border-white/5 px-6 relative">
        {/* Left Side Logo */}
        <div className="absolute left-6 flex items-center gap-3">
          <BirthHubLogo variant="micro" animated className="h-10 w-10" />
          <div className="leading-tight hidden sm:block">
            <h1 className="text-[13px] font-bold text-white tracking-tight">Birth Hub 360°</h1>
            <p className="text-[10px] text-white/50 tracking-widest uppercase mt-0.5">
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
                      className="absolute top-[52px] whitespace-nowrap bg-white text-midnight text-[11px] font-bold tracking-wider px-3 py-1.5 rounded-lg shadow-xl z-50 pointer-events-none"
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
                  className={`relative grid place-items-center w-[46px] h-[46px] rounded-[18px] border transition-colors ${isGroupActive
                    ? 'bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] text-white'
                    : 'bg-white/5 border-transparent text-white/60 hover:text-white hover:bg-white/15 hover:border-white/20'
                    }`}
                >
                  {Icon ? <Icon isActive={isGroupActive} className="w-[22px] h-[22px]" /> : null}

                  {/* Active Indicator dot */}
                  {isGroupActive && (
                    <motion.div
                      layoutId="active-dock-dot"
                      className="absolute -top-2 w-1.5 h-1.5 rounded-full bg-white"
                    />
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Bar - Sub items of the active pillar */}
      <div className="flex items-center justify-center gap-1.5 h-[44px] w-full bg-midnight/90 backdrop-blur-xl border-b border-white/5 px-6 overflow-x-auto custom-scrollbar">
        {activeGroup.items.map((tabId) => {
          const meta = TAB_META[tabId];
          if (!meta) return null;
          const isTabActive = activeTab === tabId;
          const SubIcon = meta.icon;

          return (
            <button
              key={tabId}
              onClick={() => navigate(`/app/${tabId}`)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all whitespace-nowrap ${isTabActive
                ? 'bg-white text-midnight shadow-sm font-semibold'
                : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
            >
              <SubIcon size={14} strokeWidth={isTabActive ? 2 : 1.75} />
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
