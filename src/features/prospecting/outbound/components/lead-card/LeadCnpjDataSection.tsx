import { Briefcase, Check, CheckCircle2, Loader2, RefreshCw, Shield } from 'lucide-react';
import type React from 'react';

export interface LeadCnpjDataSectionProps {
  isDark: boolean;
  situacaoCadastral: string;
  cnpjSuccessMsg: string | null;
  handleRefreshCnpj: () => void;
  isRefreshingCnpj: boolean;
  razaoSocial: string;
  leadCnpj: string;
  cnaeFiscal: string;
  cnaeDescricao: string;
  capitalSocial: string;
  qsaList: Array<{ nome_socio: string; qualificacao_socio?: string }>;
}

export const LeadCnpjDataSection: React.FC<LeadCnpjDataSectionProps> = ({
  isDark,
  situacaoCadastral,
  cnpjSuccessMsg,
  handleRefreshCnpj,
  isRefreshingCnpj,
  razaoSocial,
  leadCnpj,
  cnaeFiscal,
  cnaeDescricao,
  capitalSocial,
  qsaList,
}) => {
  return (
    <div
      className={`p-3.5 rounded-xl border space-y-2.5 transition ${
        isDark
          ? 'bg-slate-950/50 border-[var(--brand-primary)]/20'
          : 'bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/20'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
            Dados Oficiais do CNPJ (Receita Federal)
          </span>
          <span className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{situacaoCadastral}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {cnpjSuccessMsg && (
            <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 animate-fadeIn">
              <Check className="w-3 h-3" />
              {cnpjSuccessMsg}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefreshCnpj}
            disabled={isRefreshingCnpj}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border flex items-center gap-1.5 transition ${
              isDark
                ? 'bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
                : 'bg-white hover:bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
            }`}
            title="Consultar dados cadastrais na API pública de CNPJ"
          >
            {isRefreshingCnpj ? (
              <Loader2 className="w-3 h-3 animate-spin text-[var(--brand-primary)]" />
            ) : (
              <RefreshCw className="w-3 h-3 text-[var(--brand-primary)]" />
            )}
            <span>Atualizar CNPJ</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Razão Social Oficial:
          </span>
          <span
            className={`font-semibold truncate block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
          >
            {razaoSocial}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            CNPJ / Situação:
          </span>
          <span className={`font-mono font-bold block text-[var(--brand-primary)]`}>
            {leadCnpj}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            CNAE Principal:
          </span>
          <span
            className={`truncate block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
            title={`${cnaeFiscal} - ${cnaeDescricao}`}
          >
            <strong>{cnaeFiscal}</strong> - {cnaeDescricao}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Capital Social:
          </span>
          <span
            className={`font-semibold block ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}
          >
            {capitalSocial}
          </span>
        </div>
      </div>

      {/* Quadro Societário (QSA) se disponível */}
      {qsaList && qsaList.length > 0 && (
        <div className="pt-1.5 border-t border-slate-800/40 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-slate-400" />
            <span>Sócios/Administradores (QSA):</span>
          </span>
          {qsaList.map((socio, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {socio.nome_socio} {socio.qualificacao_socio ? `(${socio.qualificacao_socio})` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
