import type React from 'react';
import {
  Loader2,
  Check,
  Save,
  Sparkles,
  Square,
  Newspaper,
  ChevronUp,
  ChevronDown,
  Terminal,
  Send,
  FileSearch,
  PhoneCall,
} from 'lucide-react';
import { BitrixExportStatusBadge, type BitrixExportStatus } from '../BitrixExportStatusBadge.js';
import type { ThemeMode } from '../../types.js';

export interface LeadActionsBarProps {
  isDark: boolean;
  theme: ThemeMode;
  handleSaveLead: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  enrichTone: string;
  setEnrichTone: (tone: string) => void;
  handleEnrichNews: () => void;
  isEnrichingNews: boolean;
  handleStopEnrich: () => void;
  newsDossier: any;
  isDossierOpen: boolean;
  setIsDossierOpen: (open: boolean) => void;
  handleFastScript: () => void;
  isFastGenerating: boolean;
  handleExportToBitrix: () => void;
  isExportingBitrix: boolean;
  bitrixResult: {
    success: boolean;
    blocked?: boolean;
    leadId?: number;
    message?: string;
  } | null;
  effectiveBitrixStatus: BitrixExportStatus;
  effectiveBitrixError?: string;
  effectiveBitrixExportedAt?: string;
  setIsEvidenceOpen: (open: boolean) => void;
  handleCallViaBland: () => void;
  isCallingBland: boolean;
  blandResult: {
    success: boolean;
    callId?: string;
    message?: string;
  } | null;
}

export const LeadActionsBar: React.FC<LeadActionsBarProps> = ({
  isDark,
  theme,
  handleSaveLead,
  isSaving,
  saveSuccess,
  enrichTone,
  setEnrichTone,
  handleEnrichNews,
  isEnrichingNews,
  handleStopEnrich,
  newsDossier,
  isDossierOpen,
  setIsDossierOpen,
  handleFastScript,
  isFastGenerating,
  handleExportToBitrix,
  isExportingBitrix,
  bitrixResult,
  effectiveBitrixStatus,
  effectiveBitrixError,
  effectiveBitrixExportedAt,
  setIsEvidenceOpen,
  handleCallViaBland,
  isCallingBland,
  blandResult,
}) => {
  return (
    <div
      className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100/70 border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Salvar Button */}
        <button
          type="button"
          onClick={handleSaveLead}
          disabled={isSaving}
          className={`px-3.5 py-1.5 font-bold rounded-lg border flex items-center gap-1.5 transition shadow-sm ${
            saveSuccess
              ? 'bg-emerald-500 text-[#F8F9FF] border-emerald-600'
              : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/40'
          }`}
          title="Salvar alterações do lead no SQLite"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{saveSuccess ? 'Salvo no Banco!' : 'Salvar'}</span>
        </button>

        {/* Tone Selector */}
        <div className="flex items-center gap-1.5 border-l border-slate-700/50 pl-2">
          <select
            value={enrichTone}
            onChange={(e) => setEnrichTone(e.target.value)}
            disabled={isEnrichingNews}
            className={`text-[11px] font-semibold rounded-lg px-2 py-1.5 border outline-none transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
            }`}
            title="Selecione o tom de voz para a IA gerar as abordagens"
          >
            <option value="consultivo">Tom Consultivo</option>
            <option value="direto">Tom Direto</option>
            <option value="storytelling">Storytelling</option>
            <option value="provocador">Tom Provocador</option>
          </select>
        </div>

        {/* Enriquecer + Button (Second Stage) */}
        <button
          type="button"
          onClick={handleEnrichNews}
          disabled={isEnrichingNews}
          className="px-3.5 py-1.5 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:from-[var(--brand-primary-hover)] hover:to-[var(--brand-primary-hover)] text-[#F8F9FF] font-bold rounded-lg transition shadow-md shadow-[var(--brand-primary)]/20 flex items-center gap-1.5"
          title="Segunda etapa: buscar notícias públicas na internet e gerar roteiros avançados"
        >
          {isEnrichingNews ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Enriquecendo...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Enriquecer +</span>
            </>
          )}
        </button>

        {/* Parar Button (during enrichment) */}
        {isEnrichingNews && (
          <button
            type="button"
            onClick={handleStopEnrich}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 font-bold rounded-lg transition flex items-center gap-1"
            title="Cancelar enriquecimento"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Parar</span>
          </button>
        )}

        {/* Toggle Dossier Visibility */}
        {newsDossier && (
          <button
            type="button"
            onClick={() => setIsDossierOpen(!isDossierOpen)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5 text-[#008FCE]" />
            <span>Dossiê de Notícias</span>
            {isDossierOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Integration Buttons: Bitrix24 & Bland AI */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Fast Script Gen */}
        <button
          type="button"
          onClick={handleFastScript}
          disabled={isFastGenerating}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
            isDark
              ? 'bg-gradient-to-r from-[var(--brand-primary)]/20 to-[#008FCE]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]/50'
              : 'bg-gradient-to-r from-[var(--brand-primary)]/10 to-[#008FCE]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]/50'
          }`}
          title="Gerar e copiar script rápido para Cold Call"
        >
          {isFastGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Terminal className="w-3.5 h-3.5" />
          )}
          <span>{isFastGenerating ? 'Gerando...' : 'Gerar Script (Copiar)'}</span>
        </button>

        {/* Bitrix24: botão de envio + status real persistido */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportToBitrix}
            disabled={isExportingBitrix}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              bitrixResult?.success
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                : isDark
                  ? 'bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
                  : 'bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20'
            }`}
            title="Exportar Lead para o Bitrix24"
          >
            {isExportingBitrix ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : bitrixResult?.success ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>
              {bitrixResult?.success
                ? `Bitrix24 (#${bitrixResult.leadId || 'OK'})`
                : 'Enviar Bitrix24'}
            </span>
          </button>
          {!isExportingBitrix && (
            <BitrixExportStatusBadge
              status={effectiveBitrixStatus}
              error={effectiveBitrixError}
              exportedAt={effectiveBitrixExportedAt}
              theme={theme}
            />
          )}
        </div>

        {/* Wave 6 (CPI) - Evidence & Provenance */}
        <button
          type="button"
          onClick={() => setIsEvidenceOpen(true)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
          }`}
          title="Ver evidências: de onde cada campo veio, quando e com que confiança"
        >
          <FileSearch className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>Ver Evidências</span>
        </button>

        {/* Bland AI */}
        <button
          type="button"
          onClick={handleCallViaBland}
          disabled={isCallingBland}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
            blandResult?.success
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
              : isDark
                ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
          }`}
          title="Iniciar ligação robótica conversacional via Bland AI"
        >
          {isCallingBland ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : blandResult?.success ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <PhoneCall className="w-3.5 h-3.5" />
          )}
          <span>{blandResult?.success ? 'Ligação Bland AI Ativa' : 'Ligar via Bland AI'}</span>
        </button>
      </div>
    </div>
  );
};
