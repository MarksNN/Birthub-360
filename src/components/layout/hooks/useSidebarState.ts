import { useReducedMotion } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SoundFX } from '../../../lib/soundEffects.js';
import type { NavLaunch } from '../NavLaunchTransition.js';
import { NAV_ACCENT_VAR, TAB_META, type TabType } from '../tabMeta.js';

export const SIDEBAR_COLLAPSED_KEY = '@birthhub:sidebar-collapsed';
export const LEGACY_SIDEBAR_COLLAPSED_KEY = '@birthhub360:sidebar-collapsed';

export interface UseSidebarStateOptions {
  activeTab: TabType;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function useSidebarState({
  activeTab,
  onCloseMobile,
  collapsed: externalCollapsed,
  onToggleCollapse,
}: UseSidebarStateOptions) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ??
        window.localStorage.getItem(LEGACY_SIDEBAR_COLLAPSED_KEY)) === 'true'
    );
  });

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const toggleCollapse = useCallback(() => {
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
  }, [onToggleCollapse]);

  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  // Grupos sanfona com inteligência de expansão da console de operações
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    revenue_tree: true,
  });

  // Auto-expande o grupo se a aba ativa pertencer aos seus sub-itens
  useEffect(() => {
    const groupTabs: Record<string, TabType[]> = {
      revenue_tree: ['crm', 'crm360', 'propostas', 'forecast'],
      'market-intelligence': ['market-intelligence'],
      'signals-risks': ['signals-risks'],
      prospecting: ['prospect'],
    };
    for (const [groupId, tabs] of Object.entries(groupTabs)) {
      if (tabs.includes(activeTab)) {
        setExpandedGroups((prev) => (prev[groupId] ? prev : { ...prev, [groupId]: true }));
      }
    }
  }, [activeTab]);

  const toggleGroupExpand = useCallback((groupId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    SoundFX.play('focus');
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const [launch, setLaunch] = useState<(NavLaunch & { tab: TabType; path?: string }) | null>(null);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const openTab = useCallback(
    // `path` = sub-rota real sob /app (ex.: `market-intelligence/hub`); sem ele, `/app/<tab>`.
    (tab: TabType, path?: string) => {
      navigate(`/app/${path ?? tab}`);
      onCloseMobile?.();
    },
    [navigate, onCloseMobile],
  );

  const finishLaunch = useCallback(() => {
    if (!launch) return;
    openTab(launch.tab, launch.path);
    setLaunch(null);
  }, [launch, openTab]);

  const selectTab = useCallback(
    (tab: TabType, event: React.MouseEvent, path?: string) => {
      if (launch) return;
      if (tab !== activeTab) SoundFX.play('navigate');

      const skip =
        tab === activeTab ||
        reduceMotion ||
        (typeof navigator !== 'undefined' && navigator.webdriver) ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey;

      if (skip) {
        openTab(tab, path);
        return;
      }

      const meta = TAB_META[tab] ?? TAB_META.dashboard;
      const anchor = event.currentTarget.querySelector('[data-nav-icon]') ?? event.currentTarget;
      const rect = anchor.getBoundingClientRect();
      setLaunch({
        tab,
        path,
        label: meta.label,
        Icon: meta.icon,
        accent: NAV_ACCENT_VAR[meta.accent] || 'var(--nav-c-blue)',
        from: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      });
    },
    [activeTab, launch, openTab, reduceMotion],
  );

  return {
    isCollapsed,
    toggleCollapse,
    hoveredGroupId,
    setHoveredGroupId,
    expandedGroups,
    toggleGroupExpand,
    launch,
    openTab,
    finishLaunch,
    selectTab,
  };
}
