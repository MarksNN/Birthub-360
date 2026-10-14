import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  type Placement,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from 'react';
import { cn } from '../../lib/utils.js';

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  placement?: Placement;
  delay?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * Tooltip — componente de dica contextual visual acessível.
 * Utiliza @floating-ui/react e Framer Motion para posicionamento inteligente e animação suave.
 */
export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
  className,
  disabled = false,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen && !disabled,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ fallbackAxisSideDirection: 'start' }), shift({ padding: 8 })],
  });

  const hover = useHover(context, {
    delay: { open: delay, close: 50 },
    enabled: !disabled,
  });
  const focus = useFocus(context, {
    enabled: !disabled,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  if (!isValidElement(children)) {
    return <>{children}</>;
  }

  const child = cloneElement(children as ReactElement<any>, {
    ref: refs.setReference,
    'aria-describedby': isOpen && content ? tooltipId : undefined,
    ...getReferenceProps((children as ReactElement<{ [key: string]: unknown }>).props),
  });

  return (
    <>
      {child}
      <FloatingPortal>
        <AnimatePresence>
          {isOpen && !disabled && content && (
            <motion.div
              id={tooltipId}
              ref={refs.setFloating}
              style={floatingStyles}
              initial={{
                opacity: 0,
                scale: 0.95,
                y: placement.startsWith('top') ? 4 : placement.startsWith('bottom') ? -4 : 0,
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={cn(
                'z-[9999] max-w-xs rounded-xl border border-line bg-surface-elevated/95 px-3 py-1.5 text-xs font-medium text-ink shadow-xl backdrop-blur-md pointer-events-none select-none',
                className,
              )}
              {...getFloatingProps()}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
