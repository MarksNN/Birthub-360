import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type React from 'react';
import { LinkedinIcon as Linkedin } from '../../../../../components/ui/icons/LinkedinIcon.js';

export interface LeadDecisionMakerSectionProps {
  isDark: boolean;
  isEditing: boolean;
  hunterResult: { status: string; score: number; result: string } | null;
  dmName: string;
  setDmName: (name: string) => void;
  dmTitle: string;
  setDmTitle: (title: string) => void;
  dmEmail: string;
  setDmEmail: (email: string) => void;
  dmPhone: string;
  setDmPhone: (phone: string) => void;
  dmLinkedin: string;
  setDmLinkedin: (linkedin: string) => void;
  handleVerifyEmail: () => void;
  isVerifyingEmail: boolean;
  toWhatsAppLink: (phone: string) => string;
}

export const LeadDecisionMakerSection: React.FC<LeadDecisionMakerSectionProps> = ({
  isDark,
  isEditing,
  hunterResult,
  dmName,
  setDmName,
  dmTitle,
  setDmTitle,
  dmEmail,
  setDmEmail,
  dmPhone,
  setDmPhone,
  dmLinkedin,
  setDmLinkedin,
  handleVerifyEmail,
  isVerifyingEmail,
  toWhatsAppLink,
}) => {
  return (
    <div
      className={`border rounded-xl p-4 flex flex-col justify-between items-start gap-3.5 ${
        isDark ? 'bg-slate-950/70 border-slate-800/90' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/30 flex items-center justify-center text-[var(--brand-primary)] shrink-0">
          <UserCheck className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>Decisor Mapeado</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 font-semibold">
              Apollo.io
            </span>
            {hunterResult && hunterResult.status !== 'unknown' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>
                  Hunter: {hunterResult.score}%{' '}
                  {hunterResult.status === 'valid' ? 'Válido' : hunterResult.status}
                </span>
              </span>
            )}
            {hunterResult && hunterResult.status === 'unknown' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-500/15 text-slate-400 border border-slate-500/30 font-semibold">
                Hunter: verificação indisponível
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-2 mt-1">
              <input
                type="text"
                value={dmName}
                onChange={(e) => setDmName(e.target.value)}
                placeholder="Nome do Decisor"
                className={`text-xs font-bold rounded px-2 py-1 border outline-none ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-[#F8F9FF]'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
              <input
                type="text"
                value={dmTitle}
                onChange={(e) => setDmTitle(e.target.value)}
                placeholder="Cargo do Decisor"
                className={`text-xs rounded px-2 py-1 border outline-none ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              />
            </div>
          ) : (
            <p
              className={`text-sm font-bold truncate ${isDark ? 'text-[#F8F9FF]' : 'text-slate-800'}`}
            >
              {dmName}{' '}
              <span
                className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              >
                ({dmTitle})
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Decision Maker Contact Points */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Email */}
        {isEditing ? (
          <input
            type="email"
            value={dmEmail}
            onChange={(e) => setDmEmail(e.target.value)}
            placeholder="Email do decisor"
            className={`text-xs font-mono rounded px-2 py-1 border outline-none ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-[#F8F9FF]'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          />
        ) : (
          dmEmail && (
            <span
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono text-[11px] ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{dmEmail}</span>
            </span>
          )
        )}

        {/* Hunter.io Verification */}
        {dmEmail && !hunterResult && (
          <button
            type="button"
            onClick={handleVerifyEmail}
            disabled={isVerifyingEmail}
            className={`px-2 py-1 text-[10px] font-semibold rounded-lg border flex items-center gap-1 transition ${
              isDark
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
            }`}
            title="Verificar entregabilidade com Hunter.io"
          >
            {isVerifyingEmail ? (
              <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
            ) : (
              <ShieldCheck className="w-3 h-3 text-amber-500" />
            )}
            <span>Verificar Hunter</span>
          </button>
        )}

        {/* Phone */}
        {isEditing ? (
          <input
            type="text"
            value={dmPhone}
            onChange={(e) => setDmPhone(e.target.value)}
            placeholder="Telefone do decisor"
            className={`text-xs font-mono rounded px-2 py-1 border outline-none ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-[#F8F9FF]'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          />
        ) : (
          dmPhone && (
            <a
              href={`tel:${dmPhone}`}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono text-[11px] transition ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-emerald-400'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-emerald-600'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{dmPhone}</span>
            </a>
          )
        )}

        {!isEditing && dmPhone && (
          <a
            href={toWhatsAppLink(dmPhone)}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition flex items-center gap-1.5 ${
              isDark
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
            }`}
            title={`Abrir conversa no WhatsApp com ${dmName}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        )}

        {!isEditing && dmEmail && (
          <a
            href={`mailto:${dmEmail}`}
            className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg border transition flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title={`Enviar e-mail para ${dmName}`}
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{dmEmail}</span>
          </a>
        )}

        {/* LinkedIn Decisor */}
        {isEditing ? (
          <input
            type="text"
            value={dmLinkedin}
            onChange={(e) => setDmLinkedin(e.target.value)}
            placeholder="URL do LinkedIn (ex: https://www.linkedin.com/in/...)"
            className={`text-xs font-mono rounded px-2 py-1 border outline-none ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-[#F8F9FF]'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          />
        ) : (
          dmLinkedin && (
            <a
              href={dmLinkedin.startsWith('http') ? dmLinkedin : `https://${dmLinkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                isDark
                  ? 'bg-[#0077b5]/15 hover:bg-[#0077b5]/25 text-[#0077b5] border-[#0077b5]/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-[#0077b5] border-slate-300'
              }`}
              title={`Abrir perfil de ${dmName} no LinkedIn`}
            >
              <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
              <span>Perfil LinkedIn</span>
            </a>
          )
        )}
      </div>
    </div>
  );
};
