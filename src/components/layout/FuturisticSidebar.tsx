import { motion } from 'framer-motion';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { hasRequiredRole, MESA_TRATAMENTO_ROLES } from '../../lib/auth/authorization.js';
import { staggerContainer, staggerItem, useTilt } from '../../lib/motion.js';
import { SoundFX } from '../../lib/soundEffects.js';
import { BirthHubLogo } from '../brand/BirthHubLogo.js';
import { TAB_META, type TabType } from './tabMeta.js';

const SIDEBAR_COLLAPSED_KEY = '@birthhub:futuristic-sidebar-collapsed';

interface FuturisticSidebarProps {
  activeTab: TabType;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

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
  /** Destinos reais sem TabType próprio (handoff 05: hub de MI, prospecção inteligente). */
  subRoutes?: NavSubRoute[];
}

const PROSPECCAO_SUB_ROUTES: NavSubRoute[] = [
  { tab: 'market-intelligence', path: 'market-intelligence/hub', label: 'Hub de Inteligência' },
  { tab: 'prospect', path: 'prospect/inteligente', label: 'Prospecção Inteligente' },
];

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-elevated';

/** Logo com inclinação 3D sutil — segue o cursor, desativado com prefers-reduced-motion */
function LogoWithTilt({ children }: { children: React.ReactNode }) {
  const tilt = useTilt(8);
  return (
    <motion.div
      ref={tilt.ref as React.RefObject<HTMLDivElement>}
      style={{ ...tilt.style, transformStyle: 'preserve-3d' }}
      onPointerMove={tilt.onPointerMove as React.PointerEventHandler<HTMLDivElement>}
      onPointerLeave={tilt.onPointerLeave}
      className="cursor-default"
      aria-hidden="true"
    >
      {children}
    </motion.div>
  );
}

export function FuturisticSidebar({
  activeTab,
  mobileOpen = false,
  onCloseMobile,
  collapsed: externalCollapsed,
  onToggleCollapse,
}: FuturisticSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    SoundFX.play('focus');
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
        }
        return next;
      });
    }
  };

  const { currentUser, isAdmin, canAccessCommercialIntelligence, canAccessCopilotoIa, logout } =
    useAuth();
  const navigate = useNavigate();
  const appPath = useLocation().pathname.replace(/^\/app\/?/, '');
  const activeSubRoute = PROSPECCAO_SUB_ROUTES.find(
    (r) => appPath === r.path || appPath.startsWith(`${r.path}/`),
  );
  const canManageOperations =
    !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);
  const canAccessMesaTratamento =
    !!currentUser && hasRequiredRole(currentUser.role, MESA_TRATAMENTO_ROLES);
  const isRestrictedSdrProfile = currentUser?.role === 'SDR';

  const selectTab = (tab: TabType) => {
    if (tab !== activeTab) SoundFX.play('navigate');
    navigate(`/app/${tab}`);
    onCloseMobile?.();
  };

  const administrationItems: TabType[] = [
    'notifications',
    'bitrix',
    ...(canManageOperations ? (['integrations', 'automations'] as TabType[]) : []),
    ...(isAdmin ? (['usage', 'team', 'module-access'] as TabType[]) : []),
    'settings',
  ];

  // Convergência da Navegação: Arquitetura dos 3 Pilares Canônicos
  // (ver .agents/PLAN-V4/03-PRODUCT/04-THREE-PILLARS-NAVIGATION-CONVERGENCE.md)
  const navGroupsByJourney: NavGroupDefinition[] = isRestrictedSdrProfile
    ? [
        { title: 'COMMAND CENTER', items: ['daily-plan'] },
        {
          title: 'PROSPECÇÃO INTELIGENTE',
          items: ['prospect', 'cadence'],
          subRoutes: PROSPECCAO_SUB_ROUTES,
        },
        {
          title: 'CRM COMERCIAL',
          items: [
            'companies',
            'contacts',
            ...(canAccessMesaTratamento ? (['mesa-tratamento'] as TabType[]) : []),
            'activities',
            'calendar',
          ],
        },
        {
          title: 'COPILOTO COMERCIAL IA',
          items: ['roleplay', 'objections_matrix', 'chatbook', 'topic_training'],
        },
        { title: 'ADMINISTRAÇÃO', items: ['notifications', 'bitrix', 'settings'] },
      ]
    : [
        {
          title: 'COMMAND CENTER',
          items: ['dashboard', 'workspace', 'daily-plan'],
        },
        {
          title: 'CRM COMERCIAL',
          items: [
            'crm',
            'crm360',
            'companies',
            'contacts',
            'activities',
            'calendar',
            'propostas',
            ...(canAccessMesaTratamento ? (['mesa-tratamento'] as TabType[]) : []),
          ],
        },
        {
          title: 'PROSPECÇÃO INTELIGENTE',
          items: ['prospect', 'market-intelligence', 'cadence'],
          subRoutes: PROSPECCAO_SUB_ROUTES,
        },
        {
          title: 'COPILOTO COMERCIAL IA',
          items: [
            ...(canAccessCommercialIntelligence ? (['commercial_intelligence'] as TabType[]) : []),
            ...(canAccessCopilotoIa ? (['copiloto_ia'] as TabType[]) : []),
            'intelligence',
            'knowledge',
            'analytics',
            'winloss',
            'reports',
            'roleplay',
            'chatbook',
            'qualification_matrix',
            'objections_matrix',
            'topic_training',
            'editor',
          ],
        },
        { title: 'ADMINISTRAÇÃO', items: administrationItems },
      ];

  const GROUP_ORDER_BY_ROLE: Partial<Record<string, string[]>> = {
    CLOSER: [
      'COMMAND CENTER',
      'CRM COMERCIAL',
      'PROSPECÇÃO INTELIGENTE',
      'COPILOTO COMERCIAL IA',
      'ADMINISTRAÇÃO',
    ],
    GESTOR: [
      'COMMAND CENTER',
      'CRM COMERCIAL',
      'PROSPECÇÃO INTELIGENTE',
      'COPILOTO COMERCIAL IA',
      'ADMINISTRAÇÃO',
    ],
    ADMIN: [
      'COMMAND CENTER',
      'CRM COMERCIAL',
      'PROSPECÇÃO INTELIGENTE',
      'COPILOTO COMERCIAL IA',
      'ADMINISTRAÇÃO',
    ],
    VISUALIZADOR: [
      'COMMAND CENTER',
      'CRM COMERCIAL',
      'PROSPECÇÃO INTELIGENTE',
      'COPILOTO COMERCIAL IA',
      'ADMINISTRAÇÃO',
    ],
    SDR: [
      'COMMAND CENTER',
      'PROSPECÇÃO INTELIGENTE',
      'CRM COMERCIAL',
      'COPILOTO COMERCIAL IA',
      'ADMINISTRAÇÃO',
    ],
  };

  const roleOrder = GROUP_ORDER_BY_ROLE[currentUser?.role ?? ''];
  const navGroups = roleOrder
    ? [...navGroupsByJourney].sort(
        (a, b) => roleOrder.indexOf(a.title) - roleOrder.indexOf(b.title),
      )
    : navGroupsByJourney;

  const renderNavItem = (tab: TabType) => {
    const meta = TAB_META[tab];
    if (!meta) return null;
    const Icon = meta.icon;
    const isActive = activeTab === tab && !activeSubRoute;

    return (
      <motion.button
        key={tab}
        type="button"
        variants={staggerItem}
        onClick={() => selectTab(tab)}
        title={meta.label}
        aria-label={meta.label}
        aria-current={isActive ? 'page' : undefined}
        className={`group relative flex h-8 w-full items-center gap-2.5 rounded-md border px-2 text-left text-[13px] font-medium transition-colors cursor-pointer ${FOCUS_RING} ${
          isActive
            ? 'border-brand bg-surface font-semibold text-ink ring-1 ring-focus-ring/40'
            : 'border-transparent text-ink-2 hover:border-line hover:bg-surface hover:text-ink'
        } ${isCollapsed ? 'lg:px-0 lg:justify-center' : ''}`}
      >
        <Icon
          size={16}
          aria-hidden="true"
          className={`shrink-0 ${isActive ? 'text-primary' : 'text-ink-2 group-hover:text-ink'}`}
        />
        <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{meta.label}</span>
      </motion.button>
    );
  };

  const renderSubRoute = (route: NavSubRoute) => {
    const Icon = TAB_META[route.tab]?.icon;
    const isActive = activeSubRoute === route;
    return (
      <motion.button
        key={route.path}
        type="button"
        variants={staggerItem}
        onClick={() => {
          if (!isActive) SoundFX.play('navigate');
          navigate(`/app/${route.path}`);
          onCloseMobile?.();
        }}
        title={route.label}
        aria-label={route.label}
        aria-current={isActive ? 'page' : undefined}
        className={`group relative flex h-8 w-full items-center gap-2.5 rounded-md border px-2 text-left text-[13px] font-medium transition-colors cursor-pointer ${FOCUS_RING} ${
          isActive
            ? 'border-brand bg-surface font-semibold text-ink ring-1 ring-focus-ring/40'
            : 'border-transparent text-ink-2 hover:border-line hover:bg-surface hover:text-ink'
        } ${isCollapsed ? 'lg:px-0 lg:justify-center' : ''}`}
      >
        {Icon ? (
          <Icon
            size={16}
            aria-hidden="true"
            className={`shrink-0 ${isActive ? 'text-primary' : 'text-ink-2 group-hover:text-ink'}`}
          />
        ) : null}
        <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{route.label}</span>
      </motion.button>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col bg-surface-elevated font-sans text-ink border-r border-line transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${
        isCollapsed ? 'lg:w-16' : 'lg:w-60'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Navegação principal - Futuristic Command Center"
    >
      <div className="flex flex-col shrink-0">
        <div
          className={`flex items-center justify-between border-b border-line px-4 h-14 ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
        >
          {isCollapsed ? (
            <LogoWithTilt>
              <BirthHubLogo variant="symbol" className="h-7 w-7 text-brand" />
            </LogoWithTilt>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <LogoWithTilt>
                  <BirthHubLogo variant="symbol" className="h-7 w-7 text-brand" />
                </LogoWithTilt>
                <div className="leading-tight">
                  <h1 className="flex items-center gap-1 font-display text-sm font-semibold tracking-tight text-ink">
                    Birth Hub 360°
                  </h1>
                  <span className="text-[10px] font-medium tracking-wide text-ink-2">Operate</span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleCollapse}
                className={`hidden rounded-md border border-input p-1.5 text-ink-2 transition-colors hover:bg-surface hover:text-ink lg:block ${FOCUS_RING}`}
                title="Recolher menu"
                aria-label="Recolher menu lateral"
              >
                <PanelLeftClose size={16} />
              </button>
            </>
          )}
        </div>

        {isCollapsed && (
          <div className="mt-2 hidden justify-center lg:flex">
            <button
              type="button"
              onClick={toggleCollapse}
              className={`rounded-md border border-input p-1.5 text-ink-2 transition-colors hover:bg-surface hover:text-ink ${FOCUS_RING}`}
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}
      </div>

      <nav
        aria-label="Navegação principal"
        className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-2 py-3"
      >
        {navGroups.map((group) => (
          <motion.section
            key={group.title}
            className="space-y-0.5"
            aria-label={group.title}
            variants={staggerContainer(0.05, 0.04)}
            initial="hidden"
            animate="show"
          >
            <div className={`mb-1 flex items-center px-2 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-2">
                {group.title}
              </p>
            </div>
            {isCollapsed && (
              <div className="hidden lg:block my-2 mx-auto w-4 h-px bg-line" aria-hidden="true" />
            )}
            {group.items.map(renderNavItem)}
            {group.subRoutes?.map(renderSubRoute)}
          </motion.section>
        ))}
      </nav>

      <div className="border-t border-line p-2">
        {currentUser && (
          <div
            className={`relative overflow-hidden rounded-md border border-line bg-surface px-2 py-2 ${
              isCollapsed ? 'lg:px-1.5 lg:py-2 lg:flex lg:justify-center' : ''
            }`}
            title={
              isCollapsed
                ? `${currentUser.name} (${currentUser.roleTitle || currentUser.role})`
                : undefined
            }
          >
            <div className="flex min-w-0 items-center gap-3 relative z-10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-brand">
                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
                <p className="truncate text-[13px] font-bold leading-tight text-ink transition-colors">
                  {currentUser.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium leading-tight text-ink-2">
                  {currentUser.roleTitle || currentUser.role}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className={`group mt-1 flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2 text-left text-[13px] font-semibold text-critical transition-colors hover:border-critical/15 hover:bg-critical/10 ${FOCUS_RING} ${
            isCollapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
          title="Encerrar sessão e sair da conta"
          aria-label="Encerrar sessão e sair da conta"
        >
          <LogOut size={16} aria-hidden="true" className="shrink-0" />
          <span className={isCollapsed ? 'lg:hidden' : ''}>Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
}
