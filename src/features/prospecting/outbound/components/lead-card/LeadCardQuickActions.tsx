import { ArrowUpRight, Mail, MessageSquare, Phone } from 'lucide-react';
import type React from 'react';

interface LeadCardQuickActionsProps {
  phone?: string;
  email?: string;
  whatsappUrl?: string;
  onCall: (phone: string) => void;
  onPromote: () => void;
  isSaving?: boolean;
}

export function LeadCardQuickActions({
  phone,
  email,
  whatsappUrl,
  onCall,
  onPromote,
  isSaving,
}: LeadCardQuickActionsProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-white/5">
      {phone && (
        <button
          type="button"
          onClick={() => onCall(phone)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-colors"
          title={`Ligar via Voice Hub para ${phone}`}
          aria-label={`Ligar para ${phone}`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Ligar</span>
        </button>
      )}

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold border border-green-500/20 transition-colors"
          aria-label="Abrir conversa no WhatsApp"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </a>
      )}

      {email && (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20 transition-colors"
          aria-label={`Enviar e-mail para ${email}`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>E-mail</span>
        </a>
      )}

      <div className="ml-auto">
        <button
          type="button"
          onClick={onPromote}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand text-midnight text-xs font-bold shadow-sm hover:bg-amber-400 transition-all disabled:opacity-50"
        >
          <span>Promover a Negócio</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
