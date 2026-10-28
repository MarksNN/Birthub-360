import { useCallback, useEffect, useState } from 'react';

export function useNavigationState() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  // Fechar o drawer mobile automaticamente ao pressionar ESC (WCAG a11y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileNavOpen) {
        closeMobileNav();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen, closeMobileNav]);

  return {
    mobileNavOpen,
    toggleMobileNav,
    closeMobileNav,
  };
}
