import type * as React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Button } from './Button.js';
import { EmptyState } from './EmptyState.js';
import { Skeleton } from './Skeleton.js';

export type OperationalStateType = 'loading' | 'empty' | 'error' | 'stale' | 'ready';

export interface EmptyStateConfig {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export interface ErrorStateConfig {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export interface StaleStateConfig {
  lastUpdated?: string | Date;
  message?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export interface OperationalStateContainerProps {
  state: OperationalStateType;
  children: React.ReactNode;
  className?: string;
  loadingSkeleton?: React.ReactNode;
  empty?: EmptyStateConfig;
  error?: ErrorStateConfig;
  stale?: StaleStateConfig;
}

function DefaultLoadingSkeleton() {
  return (
    <div className="space-y-4 w-full p-2" data-testid="operational-loading-skeleton">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl w-full" />
    </div>
  );
}

export function OperationalStateContainer({
  state,
  children,
  className,
  loadingSkeleton,
  empty,
  error,
  stale,
}: OperationalStateContainerProps) {
  // 1. Loading State
  if (state === 'loading') {
    return (
      <div className={cn('w-full', className)}>{loadingSkeleton ?? <DefaultLoadingSkeleton />}</div>
    );
  }

  // 2. Empty State
  if (state === 'empty') {
    return (
      <div className={cn('w-full', className)}>
        <EmptyState
          title={empty?.title ?? 'Nenhum registro encontrado'}
          description={
            empty?.description ??
            'Inicie adicionando novas oportunidades ou importando dados para ativar este módulo.'
          }
          actionLabel={empty?.actionLabel}
          onAction={empty?.onAction}
          icon={empty?.icon}
        />
      </div>
    );
  }

  // 3. Error State (Causa raiz observável + retry sem deslogar)
  if (state === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-danger/30 bg-surface shadow-sm my-6',
          className,
        )}
      >
        <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="font-display text-lg font-bold text-ink mb-1.5">
          {error?.title ?? 'Falha de comunicação operacional'}
        </h3>
        <p className="text-ink-2 text-sm max-w-md mb-6 leading-relaxed">
          {error?.message ??
            'Não foi possível carregar os dados atualizados deste módulo. Verifique a conexão com os serviços e tente novamente.'}
        </p>
        {error?.onRetry && (
          <Button
            variant="vancouver"
            onClick={error.onRetry}
            className="flex items-center gap-2 text-xs font-bold px-5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {error.retryLabel ?? 'Tentar Novamente'}
          </Button>
        )}
      </motion.div>
    );
  }

  // 4. Stale State & Ready State
  // When stale: show warning bar with timestamp, keep previous data visible!
  return (
    <div className={cn('relative w-full', className)}>
      {state === 'stale' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-warn/30 bg-warn/10 text-warn-active text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              {stale?.message ?? 'Dados em cache local (modo offline/resiliente).'}
              {stale?.lastUpdated && (
                <span className="ml-1 opacity-80">
                  Última sincronização:{' '}
                  {typeof stale.lastUpdated === 'string'
                    ? stale.lastUpdated
                    : stale.lastUpdated.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </span>
          </div>
          {stale?.onRefresh && (
            <button
              type="button"
              onClick={stale.onRefresh}
              disabled={stale.isRefreshing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-warn/40 hover:bg-warn/20 transition-colors font-bold text-[11px] cursor-pointer"
            >
              <RefreshCw className={cn('w-3 h-3', stale.isRefreshing && 'animate-spin')} />
              Reconectar
            </button>
          )}
        </motion.div>
      )}

      {children}
    </div>
  );
}
