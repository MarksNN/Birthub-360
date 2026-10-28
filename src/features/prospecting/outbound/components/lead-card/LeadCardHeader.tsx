import { Building2, Sparkles } from 'lucide-react';
import type React from 'react';
import type { LeadStatus } from './types.js';

interface LeadCardHeaderProps {
  companyName: string;
  sector?: string;
  icpScore?: number;
  status: LeadStatus;
  onStatusChange: (newStatus: LeadStatus) => void;
  isSaving?: boolean;
}

export function LeadCardHeader({
  companyName,
  sector,
  icpScore = 0,
  status,
  onStatusChange,
  isSaving,
}: LeadCardHeaderProps): React.ReactElement {
  const scoreColor =
    icpScore >= 80
      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
      : icpScore >= 50
        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
        : 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  return (
    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#F8F9FF]/5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand shrink-0" />
          <h3 className="font-bold text-base text-slate-800 dark:text-[#F8F9FF] tracking-tight leading-snug">
            {companyName}
          </h3>
        </div>
        {sector && <p className="text-xs text-slate-500 dark:text-[#F8F9FF]/50 pl-6">{sector}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${scoreColor}`}
          title={`Score de aderência ao ICP: ${icpScore}/100`}
        >
          <Sparkles className="w-3 h-3" />
          <span>{icpScore}%</span>
        </div>

        <select
          value={status}
          disabled={isSaving}
          onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
          className="text-xs font-semibold rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-[#F8F9FF]/10 px-2 py-1 text-slate-800 dark:text-[#F8F9FF] focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 cursor-pointer"
          aria-label={`Status do lead ${companyName}`}
        >
          <option value="NOVO">Novo</option>
          <option value="EM_CONTATO">Em Contato</option>
          <option value="QUALIFICADO">Qualificado</option>
          <option value="REUNIAO_AGENDADA">Reunião Agendada</option>
          <option value="OPORTUNIDADE">Oportunidade</option>
          <option value="DESQUALIFICADO">Desqualificado</option>
        </select>
      </div>
    </div>
  );
}
