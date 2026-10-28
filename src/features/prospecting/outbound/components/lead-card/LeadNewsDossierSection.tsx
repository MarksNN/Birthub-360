import { CheckCircle2, Newspaper } from 'lucide-react';
import type React from 'react';

export interface LeadNewsDossierSectionProps {
  isDark: boolean;
  newsDossier: any;
  isDossierOpen: boolean;
}

export const LeadNewsDossierSection: React.FC<LeadNewsDossierSectionProps> = ({
  isDark,
  newsDossier,
  isDossierOpen,
}) => {
  if (!newsDossier || !isDossierOpen) return null;

  return (
    <div
      className={`p-4 rounded-xl border space-y-3.5 animate-fadeIn ${
        isDark ? 'bg-slate-950/80 border-[#008FCE]/30' : 'bg-slate-100/50 border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between border-b pb-2.5">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#008FCE]" />
          <h4
            className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#93DBF2]' : 'text-[#374898]'}`}
          >
            Dossiê de Fontes Públicas & Notícias na Internet
          </h4>
        </div>
        <span className="text-[10px] text-slate-400">Enriquecido via IA + Fontes Corporativas</span>
      </div>

      {/* Company Summary & Risk Context */}
      {newsDossier.company_summary && (
        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <strong>Resumo Corporativo:</strong> {newsDossier.company_summary}
        </p>
      )}

      {/* Key Facts / Triggers */}
      {newsDossier.key_facts && newsDossier.key_facts.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[var(--brand-primary)] uppercase tracking-wider block">
            Fatos Relevantes & Gatilhos de Contato:
          </span>
          <ul className="grid grid-cols-1 gap-2">
            {newsDossier.key_facts.map((fact: string, i: number) => (
              <li
                key={i}
                className={`p-2 rounded-lg border text-xs flex items-start gap-1.5 ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent News Items */}
      {newsDossier.recent_news && newsDossier.recent_news.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-[#008FCE] uppercase tracking-wider block">
            Últimas Notícias Identificadas na Mídia:
          </span>
          <div className="space-y-2">
            {newsDossier.recent_news.map((item: any, i: number) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  isDark
                    ? 'bg-slate-900/40 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-bold text-xs ${isDark ? 'text-[#F8F9FF]' : 'text-slate-800'}`}
                  >
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {item.source} • {item.date}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
