import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { AppTopbar } from './AppTopbar.js';
import { OfflineBanner } from './OfflineBanner.js';
import { DataFlowLines } from '../ui/DataFlowLines.js';
import { VoiceCommandWidget } from '../ui/VoiceCommandWidget.js';
import { useNavigationState } from './hooks/useNavigationState.js';
import { MobileNavDrawer } from './MobileNavDrawer.js';
import type { TabType } from './tabMeta.js';

interface MainLayoutProps {
  children: ReactNode;
  activeTab?: string;
}

export function MainLayout({ children, activeTab: activeTabProp }: MainLayoutProps) {
  const { mobileNavOpen, toggleMobileNav, closeMobileNav } = useNavigationState();
  // App.tsx monta <MainLayout> sem `activeTab` — sem isto a Sidebar nunca marcava o item ativo
  // (nem expandia o grupo) e o Topbar caía sempre no meta de `dashboard`. Deriva de /app/<tab>/…;
  // a prop explícita continua tendo precedência.
  const { pathname } = useLocation();
  const activeTab = activeTabProp ?? (pathname.split('/')[2] || 'dashboard');

  return (
    <div className="relative flex flex-col h-screen h-[100dvh] w-full overflow-hidden bg-bg font-sans text-ink antialiased selection:bg-brand selection:text-on-brand">
      <OfflineBanner />

      <div className="relative flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Sidebar Desktop gerencia o proprio fixed e collapse */}
        <Sidebar activeTab={activeTab as TabType} />

        {/* Drawer Mobile Desacoplado */}
        <MobileNavDrawer
          isOpen={mobileNavOpen}
          onClose={closeMobileNav}
          activeTab={activeTab as TabType}
        />

        {/* Conteudo Principal */}
        <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
          <AppTopbar onOpenMobileNav={toggleMobileNav} activeTab={activeTab as TabType} />

          <main className="relative flex-1 overflow-y-auto">
            <DataFlowLines />
            {children}
          </main>
        </div>
      </div>

      <VoiceCommandWidget />
    </div>
  );
}
