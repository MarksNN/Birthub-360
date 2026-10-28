import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { offlineSyncService } from '../../features/mobile/offlineSync.service.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';

export type NetworkSyncStatus = 'online' | 'offline' | 'syncing';

export interface SyncStateDetail {
  status: NetworkSyncStatus;
  pendingCount: number;
  lastSyncedAt: Date | null;
}

export const SYNC_STATUS_EVENT = 'app:sync-status';

export interface SyncStatusEventDetail {
  status?: NetworkSyncStatus;
  pendingCount?: number;
}

/**
 * Dispara evento global de sincronização para ser consumido pelo Shell/Header
 */
export function dispatchSyncStatus(detail: SyncStatusEventDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail }));
  }
}

/**
 * Hook para monitorar estado de conectividade e sincronização em tempo real.
 * Suporta detecção nativa de rede (navigator.onLine), barramento customizado e
 * o serviço de fila de sincronização mobile (offlineSyncService).
 */
export function useNetworkSync(): SyncStateDetail & {
  triggerManualSync: () => void;
} {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<NetworkSyncStatus>(() => (isOnline ? 'online' : 'offline'));
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() =>
    isOnline ? new Date() : null,
  );
  const isFirstRender = useRef(true);

  // Sincroniza com as mudanças do status de conectividade (online / offline)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!isOnline) {
      setStatus('offline');
      // Incrementa ou registra alterações pendentes ao operar offline
      setPendingCount((prev) => (prev === 0 ? 1 : prev));
    } else {
      // Ao reconectar vindo de offline, entra no estado transitório de sincronização das alterações
      setStatus('syncing');
      try {
        void offlineSyncService.sync().finally(() => {
          const stats = offlineSyncService.getStats();
          setStatus(stats.pending > 0 && !stats.isOnline ? 'offline' : 'online');
          setPendingCount(stats.pending);
          setLastSyncedAt(new Date());
        });
      } catch {
        const timer = window.setTimeout(() => {
          setStatus('online');
          setPendingCount(0);
          setLastSyncedAt(new Date());
        }, 1500);

        return () => window.clearTimeout(timer);
      }
    }
  }, [isOnline]);

  // Integração com o offlineSyncService (fila de alterações locais)
  useEffect(() => {
    try {
      const stats = offlineSyncService.getStats();
      if (stats.pending > 0) {
        setPendingCount(stats.pending);
      }

      const unsubscribe = offlineSyncService.subscribe((event) => {
        const currentStats = offlineSyncService.getStats();
        if (event.type === 'sync_start') {
          setStatus('syncing');
          setPendingCount(currentStats.pending);
        } else if (event.type === 'sync_completed') {
          setStatus(currentStats.pending > 0 && !currentStats.isOnline ? 'offline' : 'online');
          setPendingCount(currentStats.pending);
          setLastSyncedAt(new Date());
        } else if (event.type === 'enqueued') {
          setPendingCount(currentStats.pending);
        } else if (event.type === 'network_change') {
          if (event.status === 'offline') {
            setStatus('offline');
          }
        }
      });

      return () => unsubscribe();
    } catch {
      // Ambiente de teste ou sem adapter de storage nativo
    }
  }, []);

  // Listener para eventos customizados de sincronização
  useEffect(() => {
    const handleSyncEvent = (event: Event) => {
      const customEvent = event as CustomEvent<SyncStatusEventDetail>;
      if (customEvent.detail) {
        if (customEvent.detail.status) {
          setStatus(customEvent.detail.status);
        }
        if (typeof customEvent.detail.pendingCount === 'number') {
          setPendingCount(customEvent.detail.pendingCount);
        }
        if (customEvent.detail.status === 'online') {
          setLastSyncedAt(new Date());
        }
      }
    };

    window.addEventListener(SYNC_STATUS_EVENT, handleSyncEvent);
    return () => window.removeEventListener(SYNC_STATUS_EVENT, handleSyncEvent);
  }, []);

  const triggerManualSync = useCallback(() => {
    if (!isOnline) return;
    setStatus('syncing');
    try {
      void offlineSyncService.sync().finally(() => {
        const stats = offlineSyncService.getStats();
        setStatus(stats.pending > 0 && !stats.isOnline ? 'offline' : 'online');
        setPendingCount(stats.pending);
        setLastSyncedAt(new Date());
      });
    } catch {
      window.setTimeout(() => {
        setStatus('online');
        setPendingCount(0);
        setLastSyncedAt(new Date());
      }, 1200);
    }
  }, [isOnline]);

  return { status, pendingCount, lastSyncedAt, triggerManualSync };
}

/**
 * OfflineBadge
 * Badge visual conciso para sinalização do modo offline no header ou shell.
 */
export function OfflineBadge({ className = '' }: { className?: string }) {
  const { status, pendingCount } = useNetworkSync();

  if (status === 'online') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
        status === 'offline'
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
          : 'bg-brand/15 text-brand border border-brand/30'
      } ${className}`}
    >
      {status === 'offline' ? (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            Offline
            {pendingCount > 0 ? ` (${pendingCount} pendente${pendingCount > 1 ? 's' : ''})` : ''}
          </span>
        </>
      ) : (
        <>
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden="true" />
          <span>Sincronizando…</span>
        </>
      )}
    </div>
  );
}

/**
 * SyncIndicator
 * Indicador completo de conectividade e sincronização (Online / Offline / Sincronizando)
 * Integrado ao AppTopbar do CRM Birth Hub 360°.
 */
export function SyncIndicator({ className = '' }: { className?: string }) {
  const { status, pendingCount, triggerManualSync } = useNetworkSync();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={status === 'offline' ? undefined : triggerManualSync}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={
          status === 'online'
            ? 'Conexão online e dados sincronizados'
            : status === 'syncing'
              ? 'Sincronizando alterações locais pendentes'
              : `Modo offline ativo. ${pendingCount} alteraç${pendingCount === 1 ? 'ão' : 'ões'} salva${pendingCount === 1 ? 's' : 's'} localmente.`
        }
        className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 border cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          status === 'online'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15'
            : status === 'syncing'
              ? 'border-brand/30 bg-brand/10 text-brand-ink dark:text-brand hover:bg-brand/15'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 animate-pulse'
        }`}
      >
        {status === 'online' && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[11px]">Online</span>
          </>
        )}

        {status === 'syncing' && (
          <>
            <RefreshCw className="h-3 w-3 animate-spin text-brand" aria-hidden="true" />
            <span className="font-mono text-[11px]">Sincronizando…</span>
          </>
        )}

        {status === 'offline' && (
          <>
            <CloudOff
              className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] font-semibold">
              Offline{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </span>
          </>
        )}
      </button>

      {/* Tooltip acessível explicativo */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            role="tooltip"
            className="absolute top-full mt-2 right-0 z-50 min-w-[220px] max-w-xs p-2.5 rounded-xl bg-surface-elevated border border-line shadow-xl text-left text-xs pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-1">
              {status === 'online' && <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
              {status === 'syncing' && (
                <RefreshCw className="w-3.5 h-3.5 text-brand animate-spin" />
              )}
              {status === 'offline' && <WifiOff className="w-3.5 h-3.5 text-amber-500" />}
              <span className="font-bold text-ink">
                {status === 'online' && 'Conectado à nuvem'}
                {status === 'syncing' && 'Sincronização em andamento'}
                {status === 'offline' && 'Modo Offline Ativo'}
              </span>
            </div>
            <p className="text-[11px] text-ink-2 leading-relaxed">
              {status === 'online' &&
                'Todos os dados e alterações estão sincronizados com o servidor.'}
              {status === 'syncing' && 'Enviando alterações gravadas localmente para o backend…'}
              {status === 'offline' &&
                'Suas ações no CRM serão armazenadas localmente no dispositivo e sincronizadas assim que a conexão retornar.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
