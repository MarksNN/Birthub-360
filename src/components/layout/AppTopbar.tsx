import { motion } from 'framer-motion';
import { ArrowLeft, Bell, LogOut, Menu, Moon, Search, Sun, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import { notificationsApi } from '../../features/notifications/notifications.api.js';
import { useLiveClock } from '../../hooks/useLiveClock.js';
import { OPEN_COMMAND_PALETTE_EVENT } from '../../lib/paletteIntent.js';
import { SoundFX } from '../../lib/soundEffects.js';
import { BirthHubLogo } from '../brand/BirthHubLogo.js';
import { AppBreadcrumbs } from './AppBreadcrumbs.js';
import { TAB_META, type TabType } from './tabMeta.js';
import { SyncIndicator } from './SyncIndicator.js';

interface AppTopbarProps {
  activeTab: TabType;
  /** Abre a Sidebar off-canvas em telas < md. */
  onOpenMobileNav?: () => void;
}

export function AppTopbar({ activeTab, onOpenMobileNav }: AppTopbarProps) {
  const now = useLiveClock();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  // Home real do CRM — não faz sentido oferecer "Voltar" aqui. Qualquer outro módulo mostra o
  // botão: cobre as ~46 rotas de /app/* com uma única fonte (nenhuma tela precisa reimplementar
  // seu próprio botão de voltar, ver duplicação ad-hoc em CompanyDetail/ProspectingToolsHub/etc.).
  const isHome = location.pathname === '/app' || location.pathname === '/app/dashboard';
  const handleBack = () => {
    SoundFX.play('navigate');
    // `location.key === 'default'` = primeira entrada desta sessão do router (deep link direto,
    // sem histórico interno para voltar) — nesse caso `navigate(-1)` sairia do app para o que
    // veio antes no histórico do navegador. Cai pro dashboard, que é sempre um "voltar" seguro.
    if (location.key !== 'default') navigate(-1);
    else navigate('/app');
  };
  const meta = TAB_META[activeTab] ?? TAB_META.dashboard;
  const Icon = meta.icon;
  const [soundEnabled, setSoundEnabled] = useState(() => SoundFX.isEnabled());

  // Contagem real de não lidas — GET /api/notifications?unread=1 (mesmo endpoint usado pela
  // tela de Notificações). Sem isso o sino era cenográfico: nenhum clique navegava e o ponto
  // vermelho aparecia sempre, mesmo com a caixa zerada. Recarrega ao montar e ao focar a aba
  // (sem polling contínuo — este produto evita loop/timer sem necessidade comprovada, ver
  // CLAUDE.md seção 8/11) para refletir notificações lidas/criadas em outra aba ou sessão.
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const { unread } = await notificationsApi.list(true);
        if (!cancelled) setUnreadCount(unread);
      } catch {
        // Falha ao consultar não derruba o topbar — o sino continua navegando de verdade,
        // só fica sem o indicador até a próxima tentativa bem-sucedida.
        if (!cancelled) setUnreadCount(0);
      }
    };
    void loadUnread();
    window.addEventListener('focus', loadUnread);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadUnread);
    };
  }, []);

  const dateLabel = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const timeLabel = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const userInitial = currentUser?.name?.charAt(0).toUpperCase() || 'U';

  const toggleSound = () => {
    const next = !soundEnabled;
    SoundFX.setEnabled(next);
    setSoundEnabled(next);
  };

  return (
    <header className="relative sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2.5 bg-background border-b border-line px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[color:var(--color-text-secondary)] transition-all duration-300 hover:bg-[color:var(--surface-2)] hover:text-[color:var(--color-text-primary)] lg:hidden"
        aria-label="Abrir menu de navegação"
        data-testid="topbar-open-mobile-nav"
      >
        <Menu className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {!isHome && (
        <button
          type="button"
          onClick={handleBack}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] text-[color:var(--color-text-secondary)] transition-all duration-300 hover:bg-[color:var(--surface-2)] hover:text-[color:var(--color-text-primary)] hover:border-[color:var(--color-brand-accent)] hover:-translate-x-0.5"
          aria-label="Voltar"
          title="Voltar"
          data-testid="topbar-back"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}

      <div className="flex min-w-0 items-center gap-2.5">
        <BirthHubLogo
          variant="mark"
          animated
          className="h-8 w-8 shrink-0 drop-shadow-[0_0_12px_rgba(0,212,255,0.45)]"
        />
        <div
          className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--color-border-strong)]"
          style={{
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
          }}
        >
          <Icon
            className="h-4 w-4 shrink-0 text-[color:var(--color-brand-accent)]"
            strokeWidth={1.5}
          />
        </div>
        <div className="flex flex-col leading-none">
          <AppBreadcrumbs className="mb-1 hidden sm:flex" />
          <h1
            className="truncate font-display text-base text-[color:var(--color-text-primary)] mt-0.5"
            style={{ fontWeight: 600 }}
          >
            {meta.label}
          </h1>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          SoundFX.play('focus');
          window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
        }}
        className="group ml-5 hidden max-w-md flex-1 items-center gap-3 rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--surface)]/70 px-4 py-2.5 text-[color:var(--color-text-secondary)] transition-all duration-500 hover:border-[color:var(--color-brand-accent)] hover:bg-[color:var(--surface)] hover:text-[color:var(--color-text-primary)] hover:shadow-[var(--shadow-card)] lg:flex"
        data-testid="topbar-command-palette"
      >
        <Search
          className="h-3.5 w-3.5 shrink-0 transition-all duration-500 group-hover:text-[color:var(--color-brand-accent)] group-hover:rotate-12"
          strokeWidth={1.5}
        />
        <span className="text-xs font-sans">Buscar empresa, decisor ou comando…</span>
        <kbd className="ml-auto rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--surface-2)] px-2 py-0.5 text-[9px] font-medium text-[color:var(--color-text-muted)] transition-colors group-hover:border-[color:var(--color-brand-accent)]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <SyncIndicator />

        <div className="hidden text-right leading-tight sm:block mr-2">
          <p className="text-[9px] font-sans uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
            {dateLabel}
          </p>
          <p
            className="font-mono text-sm text-[color:var(--color-text-primary)] [font-variant-numeric:tabular-nums]"
            style={{ fontWeight: 400 }}
          >
            {timeLabel}
          </p>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => {
            SoundFX.play('navigate');
            toggleTheme();
          }}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] text-[color:var(--color-text-secondary)] transition-all duration-300 hover:border-[color:var(--color-brand-accent)] hover:text-[color:var(--color-brand-accent)]"
          aria-label="Alternar tema"
          title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          data-testid="topbar-toggle-theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={1.5} />
          )}
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={toggleSound}
          className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-300 ${
            soundEnabled
              ? 'border-[color:var(--color-brand-accent)] bg-[color:var(--color-brand-accent)]/10 text-[color:var(--color-brand-accent)]'
              : 'border-[color:var(--color-border-subtle)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-brand-accent)] hover:text-[color:var(--color-brand-accent)]'
          }`}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
          data-testid="topbar-toggle-sound"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <VolumeX className="h-4 w-4" strokeWidth={1.5} />
          )}
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => {
            SoundFX.play('navigate');
            navigate('/app/notifications');
          }}
          className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] text-[color:var(--color-text-secondary)] transition-all duration-300 hover:border-[color:var(--color-brand-secondary)] hover:text-[color:var(--color-brand-secondary)]"
          aria-label={unreadCount > 0 ? `Notificações — ${unreadCount} não lidas` : 'Notificações'}
          data-testid="topbar-notifications"
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span
              className="absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
              style={{
                background: 'var(--color-brand-secondary)',
                boxShadow: '0 0 0 3px var(--surface)',
              }}
              aria-hidden="true"
            />
          )}
        </motion.button>

        <motion.div
          whileHover={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          role="img"
          aria-label={`Avatar de ${currentUser?.name || 'Usuário'}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm text-[color:var(--color-text-primary)] cursor-pointer border border-[color:var(--color-brand-accent)]"
          style={{ background: 'var(--color-surface-elevated)', boxShadow: 'var(--shadow-card)' }}
          title={`${currentUser?.name || 'Usuário'}`}
          data-testid="topbar-avatar"
        >
          {userInitial}
        </motion.div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={logout}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] text-[color:var(--color-text-secondary)] transition-all duration-300 hover:border-[color:var(--color-brand-secondary)] hover:text-[color:var(--color-brand-secondary)]"
          aria-label="Sair da conta"
          title="Sair da conta"
          data-testid="topbar-logout"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
        </motion.button>
      </div>
    </header>
  );
}
