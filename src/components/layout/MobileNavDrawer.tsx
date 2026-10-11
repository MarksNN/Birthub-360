import { Sidebar } from './Sidebar';
import type { TabType } from './tabMeta';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function MobileNavDrawer({ isOpen, onClose, activeTab }: MobileNavDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* Backdrop Semântico e Acessível */}
      <button
        type="button"
        aria-label="Fechar menu de navegação"
        onClick={onClose}
        className="fixed inset-0 bg-overlay/80 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
      />

      {/* Gaveta da Sidebar Mobile */}
      <aside
        aria-label="Navegação móvel"
        className="relative z-50 flex h-full w-64 max-w-[85vw] flex-col bg-surface-elevated border-r border-line shadow-2xl animate-slide-in-left"
      >
        <Sidebar activeTab={activeTab as TabType} onCloseMobile={onClose} mobileOpen={isOpen} />
      </aside>
    </div>
  );
}
