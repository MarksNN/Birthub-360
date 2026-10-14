import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.js';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="bh-official-control fixed bottom-6 left-6 z-50 p-3 rounded-full bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)] transition-colors text-[var(--ink-2)] hover:text-[var(--brand)]"
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
