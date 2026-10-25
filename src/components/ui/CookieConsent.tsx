import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from './Button.js';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'birthhub360_cookie_consent';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        setIsVisible(true);
      }
    } catch (_e) {
      // localStorage is not available (e.g. private mode, cookies disabled entirely)
      // we can't save consent, so we might as well not bother showing it, or just show it once per session
      // In this case we just show it for the current session.
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    } catch (_e) {
      // Ignore
    }
    setIsVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    } catch (_e) {
      // Ignore
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-4 bottom-4 z-[9999] w-full max-w-sm sm:right-6 sm:bottom-6"
        >
          <div className="vancouver-card flex flex-col gap-4 border border-border p-5 shadow-vancouver-lg">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-lg bg-brand/10 p-2 text-brand">
                <Cookie className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 font-display text-sm font-semibold text-ink">
                  Nós usamos cookies
                </h3>
                <p className="text-xs leading-relaxed text-ink-2">
                  Utilizamos cookies essenciais para o funcionamento da plataforma e para melhorar sua experiência.
                  Ao continuar, você concorda com nossa{' '}
                  <Link
                    to="/privacy"
                    className="text-brand hover:underline"
                    onClick={(_e) => {
                      // Previne que o clique no link acione algo se não quisermos fechar o modal,
                      // mas o Link em si cuidará da navegação.
                    }}
                  >
                    Política de Privacidade
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleDecline} className="px-3 text-xs">
                Recusar
              </Button>
              <Button variant="primary" size="sm" onClick={handleAccept} className="px-4 text-xs">
                Aceitar
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
