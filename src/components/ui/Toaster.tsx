import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { type ToastMessage, toast } from '../../lib/toast.js';

// WCAG 2 AA compliant contrast
const KIND_STYLES: Record<ToastMessage['kind'], { bg: string; icon: typeof CheckCircle2 }> = {
  success: {
    bg: 'border border-line bg-[color:color-mix(in_srgb,var(--ok)_10%,var(--surface))] text-ink shadow-card',
    icon: CheckCircle2,
  },
  error: {
    bg: 'border border-line bg-[color:color-mix(in_srgb,var(--critical)_10%,var(--surface))] text-ink shadow-card',
    icon: AlertTriangle,
  },
  info: {
    bg: 'border border-line bg-surface text-ink shadow-card',
    icon: Info,
  },
};

const AUTO_DISMISS_MS = 4500;

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toast.subscribe((message) => {
      if (message.kind === 'success') {
        SoundFX.play('success');
      } else if (message.kind === 'error') {
        SoundFX.play('error');
      } else {
        SoundFX.play('focus');
      }

      setToasts((prev) => [...prev, message]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== message.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const { bg, icon: Icon } = KIND_STYLES[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_e, { offset, velocity }) => {
                if (offset.x > 100 || velocity.x > 500) {
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }
              }}
              role={t.kind === 'error' ? 'alert' : 'status'}
              aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
              className={`${bg} pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-card px-4 py-3 text-[13px] font-medium`}
            >
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--ink)_5%,var(--surface))]">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <span className="flex-1 leading-snug">{t.text}</span>
              <button
                type="button"
                onClick={() => {
                  SoundFX.play('click');
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
                aria-label="Fechar notificação"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-[color:color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
