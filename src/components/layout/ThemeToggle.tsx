import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.js';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-6 left-6 z-50 p-3 rounded-full bg-[var(--surface)] border border-[var(--line)] shadow-lg hover:shadow-xl transition-all text-[var(--ink-2)] hover:text-[var(--brand)]"
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
