import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils.js';

export interface DialogProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  isOpen?: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  variant?: string;
  maxWidth?: string;
  preventClose?: boolean;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/* Superfície por token (A03-P0-01): reage ao tema claro/escuro em vez de hex escuro fixo.
   Mobile (A03-P1-04): margem lateral de 1rem, altura limitada à viewport dinâmica e rolagem
   interna, para o modal nunca estourar a tela em 390px. */
const DIALOG_SURFACE =
  'fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[var(--radius-modal)] border border-line bg-surface-elevated p-6 text-ink duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';

const DIALOG_CLOSE_CLASS =
  'absolute right-4 top-4 rounded-sm text-ink-2 opacity-80 transition-opacity hover:opacity-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none';

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-overlay backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      aria-modal="true"
      className={cn(
        DIALOG_SURFACE,
        'max-w-lg shadow-[var(--shadow-elevated)] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close aria-label="Fechar modal" className={DIALOG_CLOSE_CLASS}>
        <X className="h-4 w-4" aria-hidden="true" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-display font-semibold leading-tight tracking-tight text-ink',
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-ink-2', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

const DialogTrigger = DialogPrimitive.Trigger;

function Dialog({
  open,
  isOpen,
  onClose,
  onOpenChange,
  title,
  subtitle,
  variant: _variant,
  maxWidth,
  preventClose,
  footer,
  children,
  ...props
}: DialogProps) {
  const isConvenienceMode =
    isOpen !== undefined ||
    onClose !== undefined ||
    title !== undefined ||
    subtitle !== undefined ||
    footer !== undefined;
  if (!isConvenienceMode) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    );
  }

  const effectiveOpen = open ?? isOpen ?? false;
  const handleOpenChange = (newOpen: boolean) => {
    // A03-P1-05: preventClose bloqueia qualquer fechamento iniciado pelo usuário (Esc/overlay),
    // não só esconde o X.
    if (!newOpen && preventClose) return;
    if (onOpenChange) onOpenChange(newOpen);
    if (!newOpen && onClose) onClose();
  };

  return (
    <DialogPrimitive.Root open={effectiveOpen} onOpenChange={handleOpenChange} {...props}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-modal="true"
          // Sem subtitle, desliga o aria-describedby automático do Radix (evita referência vazia).
          {...(subtitle ? {} : { 'aria-describedby': undefined })}
          onEscapeKeyDown={preventClose ? (event) => event.preventDefault() : undefined}
          onPointerDownOutside={preventClose ? (event) => event.preventDefault() : undefined}
          onInteractOutside={preventClose ? (event) => event.preventDefault() : undefined}
          className={cn(DIALOG_SURFACE, 'shadow-[var(--shadow-elevated)]', maxWidth || 'max-w-lg')}
        >
          {title || subtitle ? (
            <DialogHeader className={cn(!preventClose && 'pr-8')}>
              {/* Radix exige nome acessível: sem title visível, o título fica só para leitores de tela. */}
              <DialogTitle className={title ? undefined : 'sr-only'}>
                {title || 'Diálogo'}
              </DialogTitle>
              {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
            </DialogHeader>
          ) : (
            <DialogTitle className="sr-only">Diálogo</DialogTitle>
          )}
          {children}
          {footer && <DialogFooter>{footer}</DialogFooter>}
          {!preventClose && (
            <DialogPrimitive.Close aria-label="Fechar modal" className={DIALOG_CLOSE_CLASS}>
              <X className="h-4 w-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
