import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRightCircle,
  Building2,
  Calendar,
  CheckSquare,
  Loader2,
  Sparkles,
  Square,
  User,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { TechToolLogo } from '../../../components/ui/TechToolLogo.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import type { Lead } from '../../../types/index.js';

const TEMPERATURE_EMOJI: Record<string, string> = { Quente: '🔥', Morno: '🌤️', Frio: '❄️' };

const SCORE_BADGE_CLASS: Record<string, string> = {
  Quente: 'bg-blue-500/30 border-blue-500/50 text-blue-700 dark:text-blue-300',
  Morno: 'bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300',
  Frio: 'bg-transparent border-line text-ink-2',
};
const DEFAULT_SCORE_BADGE_CLASS = SCORE_BADGE_CLASS.Morno;

function getStagnationBadge(days: number) {
  if (days <= 2) {
    return {
      label: `${days === 0 ? 'Hoje' : `${days}d`} sem parada`,
      className: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    };
  }
  if (days <= 7) {
    return {
      label: `${days}d parado`,
      className: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
    };
  }
  return {
    label: `${days}d estagnado`,
    className: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold',
    dot: 'bg-rose-500 animate-pulse',
  };
}

interface KanbanCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  onEnrich?: (leadId: string) => Promise<void>;
  onConvert?: (leadId: string) => Promise<void>;
  isSelected?: boolean;
  onToggleSelect?: (leadId: string) => void;
  selectionMode?: boolean;
  /** id do usuário -> nome. Lead.owner guarda o User.id (contrato DATA-003), não o nome — sem
   * resolver aqui, o card mostraria o id cru em vez de um nome legível. */
  ownerNameById?: Record<string, string>;
}

export const KanbanCard = React.memo(function KanbanCard({
  lead,
  onClick,
  onEnrich,
  onConvert,
  isSelected = false,
  onToggleSelect,
  selectionMode = false,
  ownerNameById,
}: KanbanCardProps) {
  const [enriching, setEnriching] = useState(false);
  const [converting, setConverting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const techRowRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: {
      type: 'Lead',
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const companyTech = lead.company?.technologies || [];
  const companyName = lead.company?.tradeName || lead.company?.legalName || '';
  const hasCompanyName = companyName.length > 0;

  // Cálculo de tempo de estagnação (dias sem interação/atualização)
  const lastActivityDate = lead.lastInteraction || lead.updatedAt || lead.createdAt;
  const daysStale = lastActivityDate
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)),
      )
    : 0;
  const stagnation = getStagnationBadge(daysStale);

  const isBitrixSynced = Boolean(lead.bitrixLeadId || lead.bitrixDealId);
  const isHighPriority = (lead.score ?? 0) >= 70 || lead.temperature === 'Quente';

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const buttons = techRowRef.current?.querySelectorAll('button');
    buttons?.forEach((btn: HTMLButtonElement) => {
      btn.tabIndex = -1;
    });
  }, []);

  const handleEnrich = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onEnrich || enriching) return;
    SoundFX.play('click');
    setEnriching(true);
    try {
      await onEnrich(lead.id);
      SoundFX.play('success');
    } finally {
      setEnriching(false);
    }
  };

  const handleConvert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onConvert || converting) return;
    SoundFX.play('click');
    setConverting(true);
    try {
      await onConvert(lead.id);
      SoundFX.play('success');
    } finally {
      setConverting(false);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    SoundFX.play('click');
    onToggleSelect?.(lead.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isSelected ? 'rgba(22,119,255,0.06)' : 'rgba(255,255,255,0.03)',
      }}
      role="button"
      tabIndex={0}
      onPointerMove={handlePointerMove}
      onMouseEnter={() => {
        setIsHovered(true);
        SoundFX.play('hover');
      }}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
        }
      }}
      className={`backdrop-blur-[8px] rounded-xl border transition-all duration-200 group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSelected
          ? 'border-brand ring-1 ring-brand/60 shadow-glow-brand'
          : isHighPriority
            ? 'border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.4)] hover:border-white/15 hover:bg-white/5 hover:-translate-y-0.5'
            : 'border-white/6 shadow-[0_2px_12px_rgba(0,0,0,0.4)] hover:border-white/15 hover:bg-white/5 hover:-translate-y-0.5'
      } ${isDragging ? 'shadow-2xl ring-2 ring-brand/60 z-50 scale-105 rotate-1' : ''}`}
    >
      {/* 2026 Bento Spotlight */}
      {isHovered && !isDragging && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(180px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,229,255,0.12), transparent 70%)`,
          }}
        />
      )}

      {/* Luz especular de topo: visível em hover e destacada para leads de alta relevância */}
      <div
        className={`absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand/70 to-transparent pointer-events-none rounded-t-2xl z-20 transition-opacity duration-300 ${
          isHighPriority ? 'opacity-90' : 'opacity-0 group-hover:opacity-100'
        }`}
      />

      {/* Checkbox de seleção múltipla (visível no hover ou quando selectionMode está ativo) */}
      {(selectionMode || isSelected) && (
        <button
          type="button"
          onClick={handleCheckboxClick}
          aria-label={isSelected ? `Desmarcar ${companyName}` : `Selecionar ${companyName}`}
          className="absolute top-3 left-3 z-20 p-1 rounded-lg text-brand hover:scale-110 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-brand fill-brand/20" />
          ) : (
            <Square className="w-4 h-4 text-ink-3" />
          )}
        </button>
      )}

      {/* biome-ignore lint/a11y/useSemanticElements: elemento é alvo de useDraggable (dnd-kit) —
          listeners/attributes esperam um elemento genérico, não um <button type="button"> nativo (mesmo padrão
          de Calendar.tsx/DraggableActivity, Piloto 020). */}
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          if (e.key === 'Enter') {
            SoundFX.play('click');
            onClick(lead);
          }
        }}
        onClick={() => {
          SoundFX.play('click');
          onClick(lead);
        }}
        className={`p-4 pb-0 cursor-grab active:cursor-grabbing ${selectionMode || isSelected ? 'pl-9' : ''}`}
      >
        {/* Cabeçalho do Card: Empresa, Temperatura e Score */}
        <div className="flex justify-between items-start gap-2 mb-2">
          {hasCompanyName ? (
            <h4
              title={companyName}
              className="font-bold text-ink group-hover:text-brand transition-colors text-sm line-clamp-2 leading-snug"
            >
              {companyName}
            </h4>
          ) : (
            <h4 className="font-medium italic text-ink-3 text-sm">
              Sem empresa <span className="not-italic">· dados incompletos</span>
            </h4>
          )}
          {lead.score !== undefined && lead.score !== null ? (
            <span
              className={`shrink-0 text-xs font-black border px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${
                lead.score >= 70
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                  : lead.score >= 40
                    ? 'bg-amber-500/10 border-amber-500/30 text-warning-active dark:text-warning'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
              }`}
            >
              {lead.temperature ? `${TEMPERATURE_EMOJI[lead.temperature] || ''} ` : '🎯 '}
              {lead.score}
            </span>
          ) : lead.temperature ? (
            <span
              className={`shrink-0 text-xs font-extrabold border px-2 py-0.5 rounded-lg ${SCORE_BADGE_CLASS[lead.temperature] ?? DEFAULT_SCORE_BADGE_CLASS}`}
            >
              {TEMPERATURE_EMOJI[lead.temperature]} {lead.temperature}
            </span>
          ) : null}
        </div>

        {/* Badges Informativas: Estagnação, Probabilidade IA, Bitrix e Voz.
            (Bloco existia duplicado byte-a-byte neste componente — corrigido ao adicionar o
            indicador de probabilidade IA, que precisava entrar nesta mesma linha.) */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {/* Indicador Visual de Estagnação (Verde < 3d, Amarelo 3-7d, Vermelho > 7d) */}
          <span
            title={`Última atividade: ${new Date(lastActivityDate || '').toLocaleDateString('pt-BR')}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border ${stagnation.className}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${stagnation.dot}`} />
            {stagnation.label}
          </span>

          {lead.forecastProbabilityAi != null && (
            <span
              title="Probabilidade ajustada pelo Copiloto IA a partir da conversa mais recente — complementar à probabilidade oficial do CRM, nunca a substitui."
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-iris/15 border border-iris/30 text-iris"
            >
              <Sparkles className="w-2.5 h-2.5" />
              {lead.forecastProbabilityAi}% IA
            </span>
          )}

          {isBitrixSynced && (
            <span
              title={`Sincronizado no Bitrix24 (ID #${lead.bitrixLeadId || lead.bitrixDealId})`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300"
            >
              🌐 Bitrix #{lead.bitrixLeadId || lead.bitrixDealId}
            </span>
          )}

          {Boolean(lead.customFields?.voiceQualified) && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              🎤 Voz Qualificada
            </span>
          )}
        </div>

        <div className="space-y-1.5 mt-2 text-xs text-ink-2">
          {lead.contact && (
            <div className="flex items-center gap-1.5 text-ink-2">
              <User className="w-3.5 h-3.5 text-ink-3" />
              <span className="truncate">{lead.contact.name}</span>
            </div>
          )}
          {lead.company?.segment && (
            <div className="flex items-center gap-1.5 text-ink-2">
              <Building2 className="w-3.5 h-3.5 text-ink-3" />
              <span className="truncate">{lead.company.segment}</span>
            </div>
          )}

          {companyTech.length > 0 && (
            <>
              <div ref={techRowRef} aria-hidden="true" className="flex flex-wrap gap-1 pt-1">
                {companyTech.slice(0, 3).map((tech: string, i: number) => (
                  <TechToolLogo key={i} techName={tech} size="sm" />
                ))}
              </div>
              <span className="sr-only">
                Tecnologias detectadas: {companyTech.slice(0, 3).join(', ')}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mx-4 mb-4 mt-3 pt-2.5 border-t border-line/60">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-2 min-w-0">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-ink-3" />
          {new Date(lead.updatedAt || lead.createdAt || '').toLocaleDateString('pt-BR')}
          {lead.owner && (
            <span className="truncate">· {ownerNameById?.[lead.owner] ?? lead.owner}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onConvert && (
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              title="Converter em oportunidade — move este lead para o funil de Negócios"
              // text-brand-ink dark:text-brand: cor de marca como TEXTO — claro no escuro
              // (Antique Gold cru já mede ~8.74:1 contra a superfície escura), escurecida no
              // claro (--color-brand-ink, ver globals.css) porque a cor crua ali cai abaixo
              // de 4.5:1. Mesmo par usado em todo o app — ver design-system/SKILL.md.
              className="flex items-center gap-1 text-[11px] font-bold text-brand-ink dark:text-brand hover:opacity-75 disabled:opacity-50 transition-all active:scale-95 px-1.5 py-0.5 rounded-md hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {converting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ArrowRightCircle className="w-3 h-3" />
              )}
              {converting ? 'Convertendo...' : 'Converter'}
            </button>
          )}
          {onEnrich && lead.companyId && (
            <button
              type="button"
              onClick={handleEnrich}
              disabled={enriching}
              title="Reenriquecer com dados da Receita Federal"
              className="flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-400 disabled:opacity-50 transition-all active:scale-95 px-1.5 py-0.5 rounded-md hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {enriching ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {enriching ? 'Enriquecendo...' : 'Enriquecer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
