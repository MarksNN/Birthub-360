import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils.js';
import { TAB_META, type TabType } from './tabMeta.js';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface AppBreadcrumbsProps {
  className?: string;
  items?: BreadcrumbItem[];
}

/**
 * Mapeia caminhos conhecidos do /app/* para labels legíveis e acessíveis.
 */
function resolveAutoBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const cleanPath = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  const segments = cleanPath.split('/');

  if (segments.length <= 1 && (segments[0] === 'app' || !segments[0])) {
    return [{ label: 'Visão Geral', current: true }];
  }

  // Remove o prefixo 'app' se presente
  const appSegments = segments[0] === 'app' ? segments.slice(1) : segments;

  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Início', href: '/app' }];

  let accumulatedPath = '/app';

  for (let i = 0; i < appSegments.length; i++) {
    const seg = appSegments[i];
    accumulatedPath += `/${seg}`;
    const isLast = i === appSegments.length - 1;

    // Tenta obter label via TAB_META se for tab conhecido
    const tabMeta = TAB_META[seg as TabType];
    let label = tabMeta ? tabMeta.label : seg.replace(/-/g, ' ');

    // Normalização amigável de casos específicos
    if (seg === 'hub') label = 'Hub de Inteligência';
    if (seg === 'inteligente') label = 'Prospecção Inteligente';
    if (seg === 'market-intelligence') label = 'Inteligência de Mercado';

    // Capitalização de fallback
    label = label.charAt(0).toUpperCase() + label.slice(1);

    breadcrumbs.push({
      label,
      href: isLast ? undefined : accumulatedPath,
      current: isLast,
    });
  }

  return breadcrumbs;
}

export function AppBreadcrumbs({ className, items }: AppBreadcrumbsProps) {
  const location = useLocation();
  const breadcrumbItems = items ?? resolveAutoBreadcrumbs(location.pathname);

  return (
    <nav
      aria-label="Navegação estrutural (Breadcrumb)"
      className={cn('flex items-center text-xs text-ink-2 font-medium', className)}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {breadcrumbItems.map((item, index) => {
          const isFirst = index === 0;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {!isFirst && (
                <ChevronRight className="h-3.5 w-3.5 text-ink-2/40 shrink-0" aria-hidden="true" />
              )}
              {item.current ? (
                <span aria-current="page" className="font-semibold text-ink truncate max-w-[200px]">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="hover:text-brand transition-colors flex items-center gap-1 text-ink-2 truncate max-w-[150px]"
                >
                  {isFirst && <Home className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="text-ink-2 truncate max-w-[150px]">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
