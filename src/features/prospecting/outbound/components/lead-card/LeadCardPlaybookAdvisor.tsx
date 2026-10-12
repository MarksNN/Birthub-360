import { Award, Lightbulb, ShieldAlert } from 'lucide-react';
import type React from 'react';
import type { Lead } from './types.js';

export function LeadCardPlaybookAdvisor({ lead }: { lead: Lead }): React.ReactElement {
  const playbook = lead.playbook || {
    openingHook: `Olá ${lead.contactName || 'tudo bem'}? Vi que você lidera a área em ${lead.companyName}. Como vocês tratam previsibilidade de receita hoje?`,
    keyObjection: 'Já usamos CRM interno e não vemos necessidade de IA.',
    recommendedResponse:
      'O Birth Hub 360° não substitui seu CRM atual, ele conecta via Bitrix24 e automatiza a qualificação prévia por voz.',
    competitorDifferentiator:
      'Diferencial Atlas: 100% dos dados integrados com playbooks proprietários de transporte e logística.',
  };

  return (
    <div className="space-y-3 bg-slate-50 dark:bg-[#F8F9FF]/[0.02] p-3.5 rounded-xl border border-slate-200 dark:border-[#F8F9FF]/5 text-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-brand">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Gancho Recomendado</span>
        </div>
        <p className="text-slate-700 dark:text-[#F8F9FF]/80 italic pl-5">
          "{playbook.openingHook}"
        </p>
      </div>

      <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-[#F8F9FF]/5">
        <div className="flex items-center gap-1.5 font-bold text-amber-500">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Objeção Mapeada: {playbook.keyObjection}</span>
        </div>
        <p className="text-slate-600 dark:text-[#F8F9FF]/70 pl-5">
          ↳ <span className="font-semibold text-slate-800 dark:text-[#F8F9FF]">Resposta:</span>{' '}
          {playbook.recommendedResponse}
        </p>
      </div>

      {playbook.competitorDifferentiator && (
        <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-[#F8F9FF]/5">
          <div className="flex items-center gap-1.5 font-bold text-emerald-500">
            <Award className="w-3.5 h-3.5" />
            <span>Vantagem Atlas</span>
          </div>
          <p className="text-slate-600 dark:text-[#F8F9FF]/70 pl-5">
            {playbook.competitorDifferentiator}
          </p>
        </div>
      )}
    </div>
  );
}
