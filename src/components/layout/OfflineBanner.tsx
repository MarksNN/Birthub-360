import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { dispatchSyncStatus } from './SyncIndicator.js';

/**
 * Indicador persistente e não-intrusivo de operação offline — ver
 * `.agents/handoffs/onda-15/09-para-02-shell-mobile-offline.md`.
 *
 * Exibe banner quando a aplicação alternar para o modo offline, informando
 * que as ações serão armazenadas localmente e sincronizadas automaticamente quando
 * a conexão for restabelecida.
 *
 * Fica montado em fluxo normal no topo de `MainLayout`,
 * acima da Sidebar/Topbar, empurrando o conteúdo para baixo. Mantém `role="status"`
 * e `aria-live="polite"` para anúncio acessível em leitores de tela.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [checking, setChecking] = useState(false);

  const handleCheckConnection = () => {
    setChecking(true);
    if (typeof window !== 'undefined' && navigator.onLine) {
      dispatchSyncStatus({ status: 'syncing' });
      window.dispatchEvent(new Event('online'));
    }
    setTimeout(() => {
      setChecking(false);
    }, 1200);
  };

  return (
    <div role="status" aria-live="polite" className="shrink-0 w-full z-40">
      <AnimatePresence initial={false}>
        {!isOnline && (
          <motion.div
            key="offline-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden bg-warn/15 border-b border-warn/40 text-ink"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0 text-ink" aria-hidden="true" />
                <span>Sem conexão — os dados exibidos podem estar desatualizados.</span>
                <span className="hidden md:inline font-normal opacity-90">
                  Modo offline ativo: suas ações serão armazenadas localmente e sincronizadas quando
                  a conexão retornar.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckConnection}
                disabled={checking}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-warn/25 hover:bg-warn/35 text-ink border border-warn/40 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{checking ? 'Verificando…' : 'Verificar conexão'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
