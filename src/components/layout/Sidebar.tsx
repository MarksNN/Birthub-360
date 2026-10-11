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
 * Shell "Impeccable Operate" (handoff Agente 03 → 02): cockpit denso, scan rápido.
 * - Só tokens semânticos (bg/surface/surface-elevated/ink/ink-2/line/brand/focus-ring) — nenhum
 *   hex/rgba fixo, então responde a `.dark` no root (ThemeContext) nos dois temas.
 * - Item ativo = borda/barra `brand` + ring `focus-ring`; sem glow/gradiente/itálico de marketing.
 * - Títulos de seção/nav em `font-display`; labels em `font-sans`.
 * - Rodapé sem contagem inventada (antes: "7 sinais" hardcoded) — só atalho honesto.
 */

interface SidebarProps {
  activeTab: TabType;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-elevated';

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
  // Na gaveta móvel o rail recolhido não faz sentido (sem hover) — sempre expandido.
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
        className={`relative z-30 flex h-full flex-col bg-surface-elevated font-sans text-ink select-none ${
          mobileOpen
            ? 'w-full'
            : `hidden border-r border-line transition-[width] duration-200 ease-out lg:flex ${
                isCollapsed ? 'w-16' : 'w-60'
              }`
        }`}
        aria-label="Navegação Principal"
      >
        {/* ── Cabeçalho: marca + recolher ─────────────────────────────── */}
        <div
          className={`flex h-14 shrink-0 items-center border-b border-line ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <BirthHubLogo variant="mark" animated={false} className="h-7 w-7 shrink-0" />
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <div className="font-display text-sm font-semibold tracking-tight text-ink">
                  BirthHub 360°
                </div>
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-2">
                  Operate
                </div>
              </div>
            )}
          </div>

          {mobileOpen ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className={`flex h-8 w-8 items-center justify-center rounded-md border border-input text-ink-2 transition-colors hover:bg-surface hover:text-ink lg:hidden ${FOCUS_RING}`}
              title="Fechar navegação"
              aria-label="Fechar navegação"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            !isCollapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                className={`hidden h-7 w-7 items-center justify-center rounded-md border border-input text-ink-2 transition-colors hover:bg-surface hover:text-ink lg:flex ${FOCUS_RING}`}
                title="Recolher menu lateral"
                aria-label="Recolher menu lateral"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>

        {/* No rail recolhido o botão de expandir fica abaixo da marca (não cabe ao lado). */}
        {isCollapsed && !mobileOpen && (
          <div className="flex shrink-0 justify-center border-b border-line py-2">
            <button
              type="button"
              onClick={toggleCollapse}
              className={`flex h-7 w-7 items-center justify-center rounded-md border border-input text-ink-2 transition-colors hover:bg-surface hover:text-ink ${FOCUS_RING}`}
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
            </button>
          </div>
        )}

        {/* ── Navegação ─────────────────────────────────────────────── */}
        <nav
          className={`custom-scrollbar flex-1 space-y-4 overflow-y-auto py-3 ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}
        >
          {navSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {!isCollapsed ? (
                <p className="px-2 pb-1 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-2">
                  {section.title}
                </p>
              ) : (
                <div className="mx-2 mb-1 h-px bg-line" aria-hidden="true" />
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

                return (
                  <section
                    key={group.id}
                    aria-label={group.label}
                    className="relative"
                    onMouseEnter={() => isCollapsed && setHoveredGroupId(group.id)}
                    onMouseLeave={() => isCollapsed && setHoveredGroupId(null)}
                  >
                    {/* Item principal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        if (hasSubItems && !isCollapsed) {
                          toggleGroupExpand(group.id, e);
                        } else if (group.primaryTab) {
                          selectTab(group.primaryTab, e);
                        }
                      }}
                      className={`group relative flex w-full items-center rounded-md border text-[13px] transition-colors ${FOCUS_RING} ${
                        isCollapsed ? 'h-9 justify-center px-0' : 'h-8 justify-between gap-2 px-2'
                      } ${
                        isActive
                          ? 'border-brand bg-surface font-semibold text-ink ring-1 ring-focus-ring/40'
                          : 'border-transparent font-medium text-ink-2 hover:border-line hover:bg-surface hover:text-ink'
                      }`}
                      aria-label={group.ariaLabel || group.label}
                      aria-current={isActive && !hasSubItems ? 'page' : undefined}
                      aria-expanded={hasSubItems && !isCollapsed ? isGroupExpanded : undefined}
                      title={isCollapsed ? group.label : undefined}
                      data-testid={`sidebar-nav-${group.id}`}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand"
                        />
                      )}
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          data-nav-icon
                          className={`flex h-4 w-4 shrink-0 items-center justify-center ${
                            isActive ? 'text-primary' : 'text-ink-2 group-hover:text-ink'
                          }`}
                        >
                          <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
                        </span>
                        {!isCollapsed && <span className="truncate">{group.label}</span>}
                      </span>

                      {!isCollapsed && hasSubItems && (
                        <ChevronDown
                          size={14}
                          strokeWidth={1.75}
                          aria-hidden="true"
                          className={`shrink-0 text-ink-2 transition-transform duration-200 ${
                            isGroupExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>

                    {/* Árvore hierárquica */}
                    {!isCollapsed && hasSubItems && isGroupExpanded && (
                      <div className="mb-1 ml-[18px] mt-0.5 space-y-0.5 border-l border-line pl-2">
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
                              className={`relative flex h-7 w-full items-center rounded-md px-2 text-left text-[12px] transition-colors ${FOCUS_RING} ${
                                isSubActive
                                  ? 'bg-surface font-semibold text-primary'
                                  : 'text-ink-2 hover:bg-surface hover:text-ink'
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

                    {/* Popover no rail recolhido */}
                    {isCollapsed && hoveredGroupId === group.id && (
                      <div className="fixed left-16 z-50 ml-1 min-w-[200px] rounded-md border border-line bg-surface-elevated p-2 shadow-lg">
                        <p className="mb-1 px-2 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-2">
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
                                  className={`flex h-7 w-full items-center rounded-md px-2 text-left text-[12px] transition-colors ${FOCUS_RING} ${
                                    isSubActive
                                      ? 'bg-surface font-semibold text-primary'
                                      : 'text-ink-2 hover:bg-surface hover:text-ink'
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
                              className={`flex h-7 w-full items-center rounded-md px-2 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface hover:text-ink ${FOCUS_RING}`}
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

        {/* ── Rodapé: atalho honesto para Sinais & Riscos (sem contagem fabricada) ── */}
        <div className="shrink-0 border-t border-line p-2">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={() => openTab('intelligence')}
              className={`group flex h-8 w-full items-center justify-between rounded-md px-2 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink ${FOCUS_RING}`}
              data-testid="sidebar-intelligence-cta"
            >
              <span>Ver sinais e riscos</span>
              <ArrowRight size={12} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openTab('intelligence')}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-2 transition-colors hover:bg-surface hover:text-ink ${FOCUS_RING}`}
              title="Ver sinais e riscos"
              aria-label="Ver sinais e riscos"
              data-testid="sidebar-intelligence-icon"
            >
              <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
