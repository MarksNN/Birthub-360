import type { ReactNode } from 'react';
import { PageTitleCard } from './PageTitleCard.js';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  /** Ações à direita (botões, filtros) — mesmo padrão dos cabeçalhos de Analytics/Atividades. */
  actions?: ReactNode;
  /** Mantido por compatibilidade com os chamadores; o card já traz a faixa de destaque. */
  glow?: boolean;
}

/** Cabeçalho padrão de tela — delega ao PageTitleCard (título colorido dentro de card). */
export function PageHeader({ title, subtitle, icon, badge, actions }: PageHeaderProps) {
  return (
    <PageTitleCard title={title} subtitle={subtitle} icon={icon} badge={badge} actions={actions} />
  );
}
