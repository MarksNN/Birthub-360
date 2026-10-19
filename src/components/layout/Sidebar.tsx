import { ArrowRight, ChevronDown, ChevronLeft, X } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { hasRequiredRole } from '../../lib/auth/authorization.js';
import { BirthHubLogo } from '../brand/BirthHubLogo.js';
import { useSidebarState } from './hooks/useSidebarState.js';
import { NavLaunchTransition } from './NavLaunchTransition.js';
import { getSidebarNavSections, type NavSubItem } from './sidebarSections.js';
import type { TabType } from './tabMeta.js';
import './Sidebar.css';

/**
 * Sidebar com estilos de Cards inspirados na Landing Page oficial (Landing360):
 * - Superfícies tonais com bordas semânticas de 4 lados (Cyan, Pink, Gold, Iris)
 * - Efeito aura luminosa neon (box-shadow) em hover e ativo
 * - Icon wells rounded-xl com paleta neon e feedback tátil
 * - Badges kicker mono para cabeçalhos de seção
 * - Card widget em destaque no rodapé para o Hub de IA
 */

interface SidebarProps {
  activeTab: TabType;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type AccentColor = 'cyan' | 'pink' | 'gold' | 'iris';

function getGroupAccent(groupId: string, sectionTitle: string): AccentColor {
  if (/copilot|intelligence|automations|cadence/.test(groupId)) return 'iris';
  if (/signals-risks|gamification|contacts|decisores/.test(groupId)) return 'pink';
  if (/revenue|performance|metas|forecast|activities/.test(groupId)) return 'gold';
  if (/prospect|market-intelligence|companies|integrations|dashboard|workspace/.test(groupId))
    return 'cyan';

  if (sectionTitle === 'RECEITA' || sectionTitle === 'PERFORMANCE') return 'gold';
  if (sectionTitle === 'INTELLIGENCE') return 'iris';
  if (sectionTitle === 'RELATIONSHIPS') return 'pink';
  return 'cyan';
}

function getSectionBadgeStyle(title: string): {
  border: string;
  bg: string;
  text: string;
  dot: string;
} {
  switch (title) {
    case 'COMMAND CENTER':
    case 'EXECUTION':
      return {
        border: 'border-[#00D4FF]/35',
        bg: 'bg-[#00D4FF]/10',
        text: 'text-[#0284c7] dark:text-[#00D4FF]',
        dot: 'bg-[#00D4FF]',
      };
    case 'RECEITA':
    case 'PERFORMANCE':
      return {
        border: 'border-[#F59E0B]/35',
        bg: 'bg-[#F59E0B]/10',
        text: 'text-[#b45309] dark:text-[#F59E0B]',
        dot: 'bg-[#F59E0B]',
      };
    case 'INTELLIGENCE':
      return {
        border: 'border-[#8B7DFF]/35',
        bg: 'bg-[#8B7DFF]/10',
        text: 'text-[#6d28d9] dark:text-[#8B7DFF]',
        dot: 'bg-[#8B7DFF]',
      };
    case 'RELATIONSHIPS':
      return {
        border: 'border-[#FF2D9B]/35',
        bg: 'bg-[#FF2D9B]/10',
        text: 'text-[#be185d] dark:text-[#FF2D9B]',
        dot: 'bg-[#FF2D9B]',
      };
    default:
      return {
        border: 'border-slate-300 dark:border-slate-700',
        bg: 'bg-slate-100 dark:bg-slate-800/60',
        text: 'text-slate-700 dark:text-slate-300',
        dot: 'bg-slate-400',
      };
  }
}

function getActiveIconWellStyle(accent: AccentColor): string {
  switch (accent) {
    case 'cyan':
      return 'bg-[#00D4FF]/20 text-[#0284c7] dark:text-[#00D4FF] border border-[#00D4FF]/60 shadow-[0_0_10px_rgba(0,212,255,0.3)]';
    case 'pink':
      return 'bg-[#FF2D9B]/20 text-[#be185d] dark:text-[#FF2D9B] border border-[#FF2D9B]/60 shadow-[0_0_10px_rgba(255,45,155,0.3)]';
    case 'gold':
      return 'bg-[#F59E0B]/20 text-[#b45309] dark:text-[#F59E0B] border border-[#F59E0B]/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
    case 'iris':
      return 'bg-[#8B7DFF]/20 text-[#6d28d9] dark:text-[#8B7DFF] border border-[#8B7DFF]/60 shadow-[0_0_10px_rgba(139,125,255,0.3)]';
  }
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

const EASE = 'motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out';

const ITEM = `sidebar-nav-card group relative flex w-full items-center text-[13px] tracking-[-0.011em] ${EASE} ${FOCUS_RING}`;

const ICON_WELL =
  'grid h-8 w-8 shrink-0 place-items-center rounded-xl motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out';

const ICON_WELL_QUIET =
  'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/60 group-hover:bg-slate-200/90 dark:group-hover:bg-slate-700/90 group-hover:text-slate-900 dark:group-hover:text-slate-100 group-hover:scale-105';

const GHOST_CONTROL = `h-8 w-8 shrink-0 place-items-center rounded-xl border border-line text-ink-2 hover:bg-[color:color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink ${EASE} ${FOCUS_RING}`;

/** Caminho atual relativo a /app (ex.: `market-intelligence/hub`). */
function currentAppPath(pathname: string): string {
  return pathname.replace(/^\/app\/?/, '').replace(/\/+$/, '');
}

function matchesPath(appPath: string, path: string): boolean {
  return appPath === path || appPath.startsWith(`${path}/`);
}

/**
 * Sub-item com `path` só ativa na própria sub-rota; sub-item sem `path` ativa pela aba, exceto
 * quando a URL atual pertence a um irmão com `path` (ex.: LDR não acende em `/hub`).
 */
function isSubItemActive(
  sub: NavSubItem,
  siblings: NavSubItem[],
  activeTab: TabType,
  appPath: string,
): boolean {
  if (sub.path) return matchesPath(appPath, sub.path);
  if (sub.tab !== activeTab) return false;
  return !siblings.some((s) => s.path && matchesPath(appPath, s.path));
}

export function Sidebar({
  activeTab,
  mobileOpen = false,
  onCloseMobile,
  collapsed: externalCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const {
    isCollapsed: rawCollapsed,
    toggleCollapse,
    hoveredGroupId,
    setHoveredGroupId,
    expandedGroups,
    toggleGroupExpand,
    launch,
    openTab,
    finishLaunch,
    selectTab,
  } = useSidebarState({
    activeTab,
    onCloseMobile,
    collapsed: externalCollapsed,
    onToggleCollapse,
  });
  const isCollapsed = mobileOpen ? false : rawCollapsed;

  const { pathname } = useLocation();
  const appPath = currentAppPath(pathname);

  const { currentUser, isAdmin, canAccessCommercialIntelligence, canAccessCopilotoIa } = useAuth();

  const canManageOperations =
    !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);

  const navSections = useMemo(
    () =>
      getSidebarNavSections({
        canAccessCommercialIntelligence,
        canAccessCopilotoIa,
        canManageOperations,
        isAdmin,
      }),
    [canAccessCommercialIntelligence, canAccessCopilotoIa, canManageOperations, isAdmin],
  );

  return (
    <>
      {launch && <NavLaunchTransition launch={launch} onFinish={finishLaunch} />}

      <aside
        className={`relative z-30 flex h-full flex-col bg-slate-50/90 dark:bg-[#0b1120]/95 backdrop-blur-xl font-sans text-ink select-none ${
          mobileOpen
            ? 'w-full'
            : `hidden border-r border-slate-200/80 dark:border-slate-800/80 shadow-nav lg:flex motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out ${
                isCollapsed ? 'w-[4.5rem]' : 'w-[17.5rem]'
              }`
        }`}
        aria-label="Navegação Principal"
      >
        <div
          className={`flex h-16 shrink-0 items-center ${
            isCollapsed ? 'justify-center px-2' : 'justify-between gap-2 px-3.5'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm transition-transform duration-200 hover:scale-105">
              <BirthHubLogo
                variant="mark"
                animated={false}
                className="h-6 w-6 drop-shadow-[0_0_8px_rgba(0,212,255,0.45)]"
              />
            </span>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate font-display text-[15px] font-extrabold leading-none tracking-[-0.02em] text-slate-900 dark:text-white">
                  Birth Hub{' '}
                  <span className="text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]">
                    360°
                  </span>
                </div>
                <div className="mt-1 truncate font-mono text-[9.5px] font-bold uppercase tracking-wider text-[#0284c7] dark:text-[#00D4FF]">
                  Revenue Intelligence
                </div>
              </div>
            )}
          </div>

          {mobileOpen ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className={`grid lg:hidden ${GHOST_CONTROL}`}
              title="Fechar navegação"
              aria-label="Fechar navegação"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          ) : (
            !isCollapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                className={`hidden lg:grid ${GHOST_CONTROL}`}
                title="Recolher menu lateral"
                aria-label="Recolher menu lateral"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )
          )}
        </div>

        {isCollapsed && !mobileOpen && (
          <div className="flex shrink-0 justify-center pb-2">
            <button
              type="button"
              onClick={toggleCollapse}
              className={`grid ${GHOST_CONTROL}`}
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <ChevronLeft className="h-3.5 w-3.5 rotate-180" strokeWidth={1.5} />
            </button>
          </div>
        )}

        <div
          aria-hidden="true"
          className={`h-px shrink-0 bg-line ${isCollapsed ? 'mx-3' : 'mx-4'}`}
        />

        <nav
          className={`flex-1 overflow-y-auto py-3 [scrollbar-color:color-mix(in_srgb,var(--ink)_28%,transparent)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line ${
            isCollapsed ? 'space-y-3 px-2' : 'space-y-4 px-3'
          }`}
        >
          {navSections.map((section) => {
            const sectionBadge = getSectionBadgeStyle(section.title);
            return (
              <div key={section.title} className={isCollapsed ? 'space-y-1.5' : 'space-y-1.5'}>
                {!isCollapsed ? (
                  <div className="px-1 pt-1 pb-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider border ${sectionBadge.bg} ${sectionBadge.border} ${sectionBadge.text}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${sectionBadge.dot}`} />
                      {section.title}
                    </span>
                  </div>
                ) : (
                  <div className="mx-auto my-1.5 h-px w-5 bg-line" aria-hidden="true" />
                )}

                {section.groups.map((group) => {
                  const Icon = group.icon;
                  const subItems = group.subItems ?? [];
                  const hasSubItems = subItems.length > 0;
                  const isGroupExpanded = !!expandedGroups[group.id];
                  const anySubActive = subItems.some((sub) =>
                    isSubItemActive(sub, subItems, activeTab, appPath),
                  );
                  const isPrimaryActive = group.primaryTab === activeTab;
                  const isActive = isPrimaryActive || anySubActive;
                  const accent = getGroupAccent(group.id, section.title);

                  const cardStyleClass = isActive
                    ? `sidebar-card-active-${accent}`
                    : 'sidebar-card-idle';

                  return (
                    <section
                      key={group.id}
                      aria-label={group.label}
                      className="relative"
                      onMouseEnter={() => isCollapsed && setHoveredGroupId(group.id)}
                      onMouseLeave={() => isCollapsed && setHoveredGroupId(null)}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          if (hasSubItems && !isCollapsed) {
                            toggleGroupExpand(group.id, e);
                          }
                          if (group.primaryTab) {
                            selectTab(group.primaryTab, e);
                          }
                        }}
                        className={`${ITEM} ${
                          isCollapsed
                            ? 'h-10 justify-center px-0'
                            : 'h-10 justify-between gap-1.5 pr-2.5 pl-1.5'
                        } ${cardStyleClass}`}
                        aria-label={group.ariaLabel || group.label}
                        aria-current={isActive && !hasSubItems ? 'page' : undefined}
                        aria-expanded={hasSubItems && !isCollapsed ? isGroupExpanded : undefined}
                        title={isCollapsed ? group.label : undefined}
                        data-testid={`sidebar-nav-${group.id}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            data-nav-icon
                            className={`${ICON_WELL} ${
                              isActive ? getActiveIconWellStyle(accent) : ICON_WELL_QUIET
                            }`}
                          >
                            <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                          </span>
                          {!isCollapsed && (
                            <span
                              className={`truncate font-sans text-[13px] tracking-[-0.012em] ${
                                isActive
                                  ? 'font-bold text-slate-900 dark:text-white'
                                  : 'font-medium text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {group.label}
                            </span>
                          )}
                        </span>

                        {!isCollapsed && hasSubItems && (
                          <ChevronDown
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden="true"
                            className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                              isGroupExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </button>

                      {!isCollapsed && hasSubItems && isGroupExpanded && (
                        <div className="sidebar-subitems-pocket mt-1 mb-1.5 ml-2 mr-1 p-1 space-y-0.5">
                          {subItems.map((subItem) => {
                            const isSubActive = isSubItemActive(
                              subItem,
                              subItems,
                              activeTab,
                              appPath,
                            );
                            return (
                              <button
                                key={(subItem.path ?? subItem.tab) + subItem.label}
                                type="button"
                                onClick={(e) => selectTab(subItem.tab, e, subItem.path)}
                                className={`flex h-8 w-full items-center rounded-lg px-2.5 text-left text-[12px] tracking-[-0.011em] transition-all ${FOCUS_RING} ${
                                  isSubActive
                                    ? accent === 'cyan'
                                      ? 'bg-[#00D4FF]/15 border border-[#00D4FF]/40 text-[#0284c7] dark:text-[#00D4FF] font-semibold shadow-sm'
                                      : accent === 'gold'
                                        ? 'bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#b45309] dark:text-[#F59E0B] font-semibold shadow-sm'
                                        : accent === 'pink'
                                          ? 'bg-[#FF2D9B]/15 border border-[#FF2D9B]/40 text-[#be185d] dark:text-[#FF2D9B] font-semibold shadow-sm'
                                          : 'bg-[#8B7DFF]/15 border border-[#8B7DFF]/40 text-[#6d28d9] dark:text-[#8B7DFF] font-semibold shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                                aria-current={isSubActive ? 'page' : undefined}
                                data-testid={`sidebar-sub-${subItem.path ?? subItem.tab}`}
                              >
                                <span className="truncate">{subItem.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {isCollapsed && hoveredGroupId === group.id && (
                        <div className="sidebar-rail-popover-card fixed left-[4.5rem] z-50 ml-2 min-w-[13.5rem] p-2">
                          <div className="flex items-center gap-1.5 px-2.5 pt-1 pb-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${sectionBadge.dot}`} />
                            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              {group.label}
                            </p>
                          </div>
                          {hasSubItems ? (
                            <div className="space-y-0.5">
                              {subItems.map((sub) => {
                                const isSubActive = isSubItemActive(
                                  sub,
                                  subItems,
                                  activeTab,
                                  appPath,
                                );
                                return (
                                  <button
                                    key={(sub.path ?? sub.tab) + sub.label}
                                    type="button"
                                    onClick={(e) => {
                                      selectTab(sub.tab, e, sub.path);
                                      setHoveredGroupId(null);
                                    }}
                                    className={`flex h-8 w-full items-center rounded-lg px-2.5 text-left text-[12px] tracking-[-0.011em] transition-all ${FOCUS_RING} ${
                                      isSubActive
                                        ? 'bg-[#00D4FF]/15 border border-[#00D4FF]/40 text-[#0284c7] dark:text-[#00D4FF] font-semibold'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                                    }`}
                                  >
                                    <span className="truncate">{sub.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            group.primaryTab && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (group.primaryTab) {
                                    selectTab(group.primaryTab, e);
                                    setHoveredGroupId(null);
                                  }
                                }}
                                className={`flex h-8 w-full items-center rounded-lg px-2.5 text-left text-[12px] tracking-[-0.011em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all ${FOCUS_RING}`}
                              >
                                <span>Abrir {group.label}</span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className={`shrink-0 ${isCollapsed ? 'px-2 pt-2 pb-3' : 'px-3 pt-2 pb-3'}`}>
          <div aria-hidden="true" className="mb-2 h-px bg-line" />
          {!isCollapsed ? (
            <div className="sidebar-footer-card p-2.5">
              <button
                type="button"
                onClick={() => openTab('intelligence')}
                className={`group flex w-full items-center justify-between gap-2 text-left transition-all ${FOCUS_RING}`}
                data-testid="sidebar-intelligence-cta"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#8B7DFF]/20 text-[#8B7DFF] border border-[#8B7DFF]/40 shadow-[0_0_10px_rgba(139,125,255,0.3)] transition-transform duration-200 group-hover:scale-105">
                    <ArrowRight
                      size={14}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out group-hover:translate-x-0.5"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-display text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-[#6d28d9] dark:group-hover:text-[#8B7DFF] transition-colors">
                      Ver Hub de IA
                    </div>
                    <div className="truncate font-mono text-[9.5px] text-slate-500 dark:text-slate-400">
                      Copiloto &amp; Modelos ✦
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#8B7DFF]/15 text-[#8B7DFF] border border-[#8B7DFF]/30 shrink-0">
                  IA
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openTab('intelligence')}
              className={`sidebar-footer-card mx-auto grid h-10 w-10 place-items-center rounded-xl text-[#8B7DFF] hover:scale-105 transition-all ${FOCUS_RING}`}
              title="Ver Hub de IA"
              aria-label="Ver Hub de IA"
              data-testid="sidebar-intelligence-icon"
            >
              <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
