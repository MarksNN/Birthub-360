import { Mail, Phone } from 'lucide-react';
import type React from 'react';

interface LeadCardDecisorProfileProps {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
}

export function LeadCardDecisorProfile({
  name,
  title,
  email,
  phone,
  linkedinUrl,
}: LeadCardDecisorProfileProps): React.ReactElement {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-800 dark:text-[#F8F9FF] truncate">
            {name || 'Decisor não identificado'}
          </span>
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-500 transition-colors"
              aria-label="Perfil no LinkedIn"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.7a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26Z" />
              </svg>
            </a>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-[#F8F9FF]/60 truncate">
          {title || 'Cargo não especificado'}
        </p>
      </div>

      <div className="flex items-center gap-2 text-slate-400 dark:text-[#F8F9FF]/40">
        {phone && (
          <span title={phone} className="inline-flex items-center">
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
          </span>
        )}
        {email && (
          <span title={email} className="inline-flex items-center">
            <Mail className="w-3.5 h-3.5 text-blue-500" />
          </span>
        )}
      </div>
    </div>
  );
}
