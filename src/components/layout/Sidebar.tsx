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

/**
 * Rail "Meridiano": coluna de ar, um único acento.
 * Tokens semânticos (surface, ink, brand-text, iris, line) nos dois temas.
 * A página atual é a única pílula preenchida. Sem glow, sem hex, sem barra lateral.
 */

interface SidebarProps {
  activeTab: TabType;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

const EASE = 'motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out';

const ITEM = `group relative flex w-full items-center rounded-full text-[13px] tracking-[-0.011em] ${EASE} ${FOCUS_RING}`;

const ACTIVE_WASH =
  'bg-[color:color-mix(in_srgb,var(--brand)_12%,var(--surface))] font-semibold text-ink';

const QUIET =
  'font-medium text-ink-2 hover:bg-[color:color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink';

const ICON_WELL =
  'grid h-8 w-8 shrink-0 place-items-center rounded-full motion-safe:transition-colors motion-safe:duration-200';

const ICON_WELL_ACTIVE =
  'bg-[color:color-mix(in_srgb,var(--brand)_18%,var(--surface))] text-primary ring-1 ring-[color:var(--brand-text)]';

const ICON_WELL_QUIET =
  'text-ink-2 group-hover:bg-[color:color-mix(in_srgb,var(--ink)_6%,transparent)] group-hover:text-ink';

const GHOST_CONTROL = `h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-2 hover:bg-[color:color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink ${EASE} ${FOCUS_RING}`;

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
        className={`relative z-30 flex h-full flex-col bg-surface font-sans text-ink select-none ${
          mobileOpen
            ? 'w-full'
            : `hidden border-r border-line shadow-nav lg:flex motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out ${
                isCollapsed ? 'w-[4.5rem]' : 'w-[17rem]'
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
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--ink)_4%,var(--surface))] ring-1 ring-line">
              <BirthHubLogo variant="mark" animated={false} className="h-6 w-6" />
            </span>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate font-display text-[15px] font-semibold leading-none tracking-[-0.02em] text-ink">
                  Birth Hub <span className="text-primary">360°</span>
                </div>
                <div className="mt-1 truncate text-[11px] font-medium leading-none tracking-[-0.011em] text-ink-2">
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
          className={`flex-1 overflow-y-auto py-4 [scrollbar-color:color-mix(in_srgb,var(--ink)_28%,transparent)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line ${
            isCollapsed ? 'space-y-3 px-2' : 'space-y-5 px-2.5'
          }`}
        >
          {navSections.map((section) => (
            <div key={section.title} className={isCollapsed ? 'space-y-1' : 'space-y-0.5'}>
              {!isCollapsed ? (
                <p className="px-3 pb-1.5 font-sans text-[10px] font-medium tracking-[0.08em] text-ink-2">
                  {section.title}
                </p>
              ) : (
                <div className="mx-auto mb-1 h-px w-4 bg-line" aria-hidden="true" />
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
                const rowActive = isActive && !anySubActive;

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
                        } else if (group.primaryTab) {
                          selectTab(group.primaryTab, e);
                        }
                      }}
                      className={`${ITEM} ${
                        isCollapsed
                          ? 'h-10 justify-center'
                          : 'h-10 justify-between gap-1 pr-2.5 pl-1'
                      } ${rowActive ? ACTIVE_WASH : isActive ? 'font-medium text-ink' : QUIET}`}
                      aria-label={group.ariaLabel || group.label}
                      aria-current={isActive && !hasSubItems ? 'page' : undefined}
                      aria-expanded={hasSubItems && !isCollapsed ? isGroupExpanded : undefined}
                      title={isCollapsed ? group.label : undefined}
                      data-testid={`sidebar-nav-${group.id}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          data-nav-icon
                          className={`${ICON_WELL} ${isActive ? ICON_WELL_ACTIVE : ICON_WELL_QUIET}`}
                        >
                          <Icon size={16} strokeWidth={isActive ? 1.75 : 1.5} />
                        </span>
                        {!isCollapsed && <span className="truncate">{group.label}</span>}
                      </span>

                      {!isCollapsed && hasSubItems && (
                        <ChevronDown
                          size={14}
                          strokeWidth={1.5}
                          aria-hidden="true"
                          className={`shrink-0 text-ink-2 motion-safe:transition-transform motion-safe:duration-200 ${
                            isGroupExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>

                    {!isCollapsed && hasSubItems && isGroupExpanded && (
                      <div className="mt-0.5 mb-1 ml-[1.65rem] space-y-0.5 border-l border-line pl-2">
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
                              className={`flex h-8 w-full items-center rounded-full px-3 text-left text-[12.5px] tracking-[-0.011em] ${EASE} ${FOCUS_RING} ${
                                isSubActive ? ACTIVE_WASH : QUIET
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
                      <div className="fixed left-[4.5rem] z-50 ml-2 min-w-[13.5rem] rounded-2xl border border-line bg-surface p-1.5 shadow-card">
                        <p className="px-3 pt-1.5 pb-1 font-sans text-[10px] font-medium tracking-[0.08em] text-ink-2">
                          {group.label}
                        </p>
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
                                  className={`flex h-8 w-full items-center rounded-full px-3 text-left text-[12.5px] tracking-[-0.011em] ${EASE} ${FOCUS_RING} ${
                                    isSubActive ? ACTIVE_WASH : QUIET
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
                              className={`flex h-8 w-full items-center rounded-full px-3 text-left text-[12.5px] tracking-[-0.011em] ${QUIET} ${EASE} ${FOCUS_RING}`}
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
          ))}
        </nav>

        <div className={`shrink-0 ${isCollapsed ? 'px-2 pt-2 pb-3' : 'px-2.5 pt-2 pb-3'}`}>
          <div aria-hidden="true" className="mb-2 h-px bg-line" />
          {!isCollapsed ? (
            <button
              type="button"
              onClick={() => openTab('intelligence')}
              className={`group flex h-10 w-full items-center gap-2 rounded-full pr-3 pl-1 text-[12.5px] font-medium tracking-[-0.011em] text-ink hover:bg-[color:color-mix(in_srgb,var(--iris)_10%,var(--surface))] ${EASE} ${FOCUS_RING}`}
              data-testid="sidebar-intelligence-cta"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--iris)_18%,var(--surface))] text-[color:var(--color-heading-iris)]">
                <ArrowRight
                  size={14}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out group-hover:translate-x-0.5"
                />
              </span>
              <span className="truncate">Ver Hub de IA</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openTab('intelligence')}
              className={`mx-auto grid h-10 w-10 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--iris)_18%,var(--surface))] text-[color:var(--color-heading-iris)] hover:bg-[color:color-mix(in_srgb,var(--iris)_26%,var(--surface))] ${EASE} ${FOCUS_RING}`}
              title="Ver Hub de IA"
              aria-label="Ver Hub de IA"
              data-testid="sidebar-intelligence-icon"
            >
              <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
