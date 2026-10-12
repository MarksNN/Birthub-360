import type React from 'react';
import {
  Zap,
  Loader2,
  Sparkles,
  Check,
  PhoneCall,
  Mail,
  MessageSquare,
  ShieldAlert,
  ListChecks,
  Flame,
  Terminal,
  RefreshCw,
  Edit3,
  Copy,
} from 'lucide-react';
import { LinkedinIcon as Linkedin } from '../../../../../components/ui/icons/LinkedinIcon.js';
import type { OutreachCopies } from '../../types.js';

export type OutreachChannel =
  | 'cold_call'
  | 'cold_email'
  | 'whatsapp'
  | 'linkedin'
  | 'objection_matrix'
  | 'qualification_matrix'
  | 'ice_breaker'
  | 'prompt';

export interface LeadOutreachSectionProps {
  isDark: boolean;
  hasCopies: boolean;
  dmName: string;
  dmTitle: string;
  dmEmail: string;
  dmPhone: string;
  leadName: string;
  leadCnpj: string;
  razaoSocial: string;
  cnaeFiscal: string;
  cnaeDescricao: string;
  leadSegment?: string;
  leadAddress: string;
  pitch?: string;
  enrichTone: string;
  setEnrichTone: (tone: string) => void;
  isGeneratingCopies: boolean;
  isEnrichingNews: boolean;
  handleGenerateCopies: () => void;
  handleEnrichNews: () => void;
  copiesGenMsg: string | null;
  activeChannel: OutreachChannel;
  setActiveChannel: (channel: OutreachChannel) => void;
  msgStatus: string;
  setMsgStatus: (status: string) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  copies: OutreachCopies | Record<string, string>;
  setCopies: React.Dispatch<React.SetStateAction<any>>;
  copiedChannel: string | null;
  handleCopy: (channel: string, text: string) => void;
}

export const LeadOutreachSection: React.FC<LeadOutreachSectionProps> = ({
  isDark,
  hasCopies,
  dmName,
  dmTitle,
  dmEmail,
  dmPhone,
  leadName,
  leadCnpj,
  razaoSocial,
  cnaeFiscal,
  cnaeDescricao,
  leadSegment,
  leadAddress,
  pitch,
  enrichTone,
  setEnrichTone,
  isGeneratingCopies,
  isEnrichingNews,
  handleGenerateCopies,
  handleEnrichNews,
  copiesGenMsg,
  activeChannel,
  setActiveChannel,
  msgStatus,
  setMsgStatus,
  isEditing,
  setIsEditing,
  copies,
  setCopies,
  copiedChannel,
  handleCopy,
}) => {
  if (!hasCopies) {
    return (
      <div
        className={`p-5 rounded-xl border space-y-4 transition ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex flex-col justify-between gap-3 border-b pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--brand-primary)]" />
              <h4
                className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#F8F9FF]' : 'text-slate-800'}`}
              >
                Roteiros Comerciais & Copys com IA (Sob Demanda)
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              A geração de scripts de abordagem é acionada apenas quando você desejar prospectar
              este lead.
            </p>
          </div>

          {/* Tone Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Tom de Voz:</span>
            <select
              value={enrichTone}
              onChange={(e) => setEnrichTone(e.target.value)}
              disabled={isGeneratingCopies || isEnrichingNews}
              className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border outline-none transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                  : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              <option value="consultivo">Tom Consultivo (Recomendado)</option>
              <option value="direto">Tom Direto & Objetivo</option>
              <option value="storytelling">Storytelling & Riscos</option>
              <option value="provocador">Tom Provocador / Eficiência</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 pt-1">
          <div className="text-xs text-slate-400">
            Gera roteiros, matriz de objeções, perguntas de qualificação e ator quebra-gelo para:{' '}
            <strong>Cold Call</strong>, <strong>Cold Email</strong>, <strong>WhatsApp</strong> e{' '}
            <strong>LinkedIn</strong> adaptadas para <strong>{dmName}</strong> ({dmTitle}).
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleGenerateCopies}
              disabled={isGeneratingCopies || isEnrichingNews}
              className="px-5 py-2.5 bg-gradient-to-r from-[var(--brand-primary)] to-[#FF7010] hover:from-[var(--brand-secondary-hover)] hover:to-[var(--brand-secondary)] text-[#F8F9FF] font-bold text-xs rounded-xl transition shadow-md shadow-[var(--brand-primary)]/25 flex items-center gap-2"
            >
              {isGeneratingCopies ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Copys com IA...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Gerar Roteiros com IA</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleEnrichNews}
              disabled={isEnrichingNews || isGeneratingCopies}
              className="px-4 py-2.5 bg-[#008FCE]/20 hover:bg-[#008FCE]/30 text-[#008FCE] border border-[#008FCE]/40 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              title="Buscar notícias públicas na internet e gerar dossiê + roteiros"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enriquecer + Notícias</span>
            </button>
          </div>
        </div>

        {copiesGenMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>{copiesGenMsg}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveChannel('cold_call')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeChannel === 'cold_call'
                ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Cold Call</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('cold_email')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeChannel === 'cold_email'
                ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Cold Email</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('whatsapp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeChannel === 'whatsapp'
                ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('linkedin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeChannel === 'linkedin'
                ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span>LinkedIn</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('objection_matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeChannel === 'objection_matrix'
                ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Matriz de Objeção</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('qualification_matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeChannel === 'qualification_matrix'
                ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Qualificação</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('ice_breaker')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeChannel === 'ice_breaker'
                ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Quebra-Gelo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('prompt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeChannel === 'prompt'
                ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#93DBF2]" />
            <span>Prompt Base</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tone Selection & Regenerate */}
          <div className="flex items-center gap-1.5">
            <select
              value={enrichTone}
              onChange={(e) => setEnrichTone(e.target.value)}
              disabled={isGeneratingCopies}
              className={`text-[11px] font-semibold rounded-lg px-2 py-1 border outline-none ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
              title="Tom da abordagem"
            >
              <option value="consultivo">Tom Consultivo</option>
              <option value="direto">Tom Direto</option>
              <option value="storytelling">Storytelling</option>
              <option value="provocador">Provocador</option>
            </select>

            <button
              type="button"
              onClick={handleGenerateCopies}
              disabled={isGeneratingCopies}
              className="px-2.5 py-1 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
              title="Regenerar roteiros com o tom selecionado"
            >
              {isGeneratingCopies ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Regenerar</span>
            </button>
          </div>

          {/* Status selector */}
          <select
            value={msgStatus}
            onChange={(e) => setMsgStatus(e.target.value)}
            className={`border rounded-lg px-2 py-1 text-[11px] outline-none ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-300'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <option value="draft">Rascunho (Draft)</option>
            <option value="reviewed">Revisado (Reviewed)</option>
            <option value="sent">Enviado (Sent)</option>
            <option value="archived">Arquivado</option>
          </select>

          {/* Edit / Save Toggle */}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1 transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>{isEditing ? 'Concluir' : 'Editar'}</span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={() => {
              const textToCopy =
                activeChannel === 'prompt'
                  ? `Atue como executivo de inteligência e segurança logística da Atlas. Apresente soluções de gestão de risco rodoviário para ${dmName} (${dmTitle}) da empresa ${leadName}.`
                  : (copies as any)[activeChannel] || '';
              handleCopy(activeChannel, textToCopy);
            }}
            className="px-3 py-1 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            {copiedChannel === activeChannel ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content Box */}
      <div
        className={`rounded-xl p-4 border relative ${
          isDark ? 'bg-slate-950 border-slate-800/90' : 'bg-slate-50 border-slate-200'
        }`}
      >
        {activeChannel === 'prompt' ? (
          <pre
            className={`text-xs font-mono whitespace-pre-wrap leading-relaxed select-text ${
              isDark ? 'text-[#93DBF2]' : 'text-[#374898]'
            }`}
          >
            {`[PROMPT DO AGENTE / MOTOR DE ENRIQUECIMENTO ATLAS]
Empresa Alvo: ${leadName}
CNPJ: ${leadCnpj || 'Consulte na base'}
Razão Social: ${razaoSocial}
CNAE: ${cnaeFiscal} - ${cnaeDescricao}
Segmento: ${leadSegment || 'Transporte e Logística'}
Localização: ${leadAddress}
Decisor: ${dmName} (${dmTitle})
Email Decisor: ${dmEmail} | Telefone: ${dmPhone}
Proposta de Valor Atlas: ${pitch || 'A Atlas conecta pessoas e tecnologia gerando valores com segurança e inteligência logística.'}

Objetivo: Conduzir abordagem comercial altamente personalizada de alto nível executivo para agendamento de reunião estratégica de 15 minutos com consultor sênior da Atlas.`}
          </pre>
        ) : isEditing ? (
          <textarea
            rows={6}
            value={(copies as any)[activeChannel] || ''}
            onChange={(e) => setCopies({ ...copies, [activeChannel]: e.target.value })}
            className={`w-full bg-transparent text-xs font-sans outline-none resize-none leading-relaxed ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          />
        ) : (
          <pre
            className={`text-xs font-sans whitespace-pre-wrap leading-relaxed select-text ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            {(copies as any)[activeChannel] ||
              'Nenhuma informação gerada para esta aba ainda. Clique em "Gerar Roteiros com IA" acima para criar as mensagens, matrizes e o quebra-gelo.'}
          </pre>
        )}

        {copies.followup_strategy && (
          <div
            className={`mt-3 pt-3 border-t flex items-center gap-2 text-[11px] ${
              isDark ? 'border-slate-800/60 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFC500] shrink-0" />
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Estratégia de Follow-up:
            </span>
            <span>{copies.followup_strategy}</span>
          </div>
        )}
      </div>
    </div>
  );
};
