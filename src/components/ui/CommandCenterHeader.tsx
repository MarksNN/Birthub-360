import * as React from 'react';
import { cn } from '../../lib/utils.js';
import type { PageTitleAccent } from './PageTitleCard.js';
import { PageTitleCard } from './PageTitleCard.js';
import type { VisualStateType } from './VisualState.js';
import { VisualState } from './VisualState.js';

interface CommandCenterHeaderProps {
  /** Module name. */
  title: string;
  /** Optional description text or node. */
  description?: React.ReactNode;
  /** Optional icon component or node. */
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  /** Pillar identifier shown above the title (e.g. "01 · HUB"). */
  pillar?: string;
  /** Operational state badge shown next to the title. */
  state?: VisualStateType;
  /** Slot for action buttons rendered on the right side. */
  actions?: React.ReactNode;
  accent?: PageTitleAccent;
  className?: string;
}

function resolveAccent(
  title: string,
  pillar?: string,
  explicitAccent?: PageTitleAccent,
): PageTitleAccent {
  if (explicitAccent) return explicitAccent;
  const t = `${title} ${pillar ?? ''}`.toLowerCase();
  if (
    t.includes('forecast') ||
    t.includes('meta') ||
    t.includes('ponderado') ||
    t.includes('financeiro') ||
    t.includes('faturamento') ||
    t.includes('prospecção')
  ) {
    return 'gold';
  }
  if (
    t.includes('ia') ||
    t.includes('inteligência') ||
    t.includes('playbook') ||
    t.includes('roteiro') ||
    t.includes('jornada') ||
    t.includes('copilot')
  ) {
    return 'pink';
  }
  if (t.includes('sucesso') || t.includes('auditoria') || t.includes('conformidade')) {
    return 'success';
  }
  return 'brand';
}

/**
 * Header for internal product screens: renders the shared PageTitleCard with the pillar tag,
 * a VisualState badge and a right-side actions slot.
 */
export function CommandCenterHeader({
  title,
  description,
  icon,
  pillar,
  state,
  actions,
  accent,
  className,
}: CommandCenterHeaderProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="h-5 w-5" />;
  };

  const resolvedAccent = resolveAccent(title, pillar, accent);

  return (
    <PageTitleCard
      className={cn(className)}
      eyebrow={pillar}
      title={title}
      subtitle={description}
      icon={renderIcon()}
      badge={state ? <VisualState state={state} size="sm" /> : undefined}
      actions={actions}
      accent={resolvedAccent}
    />
  );
}
