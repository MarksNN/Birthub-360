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

const SCORE_BADGE_CLASS: Record<string, string> = {
  Quente: 'border-line bg-[color:color-mix(in_srgb,var(--critical)_10%,var(--surface))] text-ink',
  Morno: 'border-line bg-[color:color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-ink',
  Frio: 'border-line bg-surface-2 text-ink-2',
};
const DEFAULT_SCORE_BADGE_CLASS = SCORE_BADGE_CLASS.Morno;

function getStagnationBadge(days: number) {
  if (days <= 2) {
    return {
      label: `${days === 0 ? 'Hoje' : `${days}d`} sem parada`,
      className: 'border-line bg-[color:color-mix(in_srgb,var(--ok)_10%,var(--surface))] text-ink',
      dot: 'bg-[color:var(--ok)]',
    };
  }
  if (days <= 7) {
    return {
      label: `${days}d parado`,
      className:
        'border-line bg-[color:color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-ink',
      dot: 'bg-[color:var(--gold)]',
    };
  }
  return {
    label: `${days}d estagnado`,
    className:
      'border-line bg-[color:color-mix(in_srgb,var(--critical)_10%,var(--surface))] text-ink font-semibold',
    dot: 'bg-[color:var(--critical)]',
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
      style={style}
      className={`group relative overflow-hidden rounded-card border bg-surface shadow-card motion-safe:transition-colors motion-safe:duration-200 ${
        isSelected
          ? 'border-[color:var(--brand-text)] bg-[color:color-mix(in_srgb,var(--brand)_8%,var(--surface))]'
          : 'border-line hover:border-line-strong'
      } ${isDragging ? 'z-50 shadow-card' : ''}`}
    >
      {(selectionMode || isSelected) && (
        <button
          type="button"
          onClick={handleCheckboxClick}
          aria-label={isSelected ? `Desmarcar ${companyName}` : `Selecionar ${companyName}`}
          className="absolute top-3 left-3 z-20 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
        onMouseEnter={() => {
          SoundFX.play('hover');
        }}
        onClick={() => {
          SoundFX.play('click');
          onClick(lead);
        }}
        className={`p-4 pb-0 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg ${selectionMode || isSelected ? 'pl-9' : ''}`}
      >
        {/* Cabeçalho do Card: Empresa, Temperatura e Score */}
        <div className="flex justify-between items-start gap-2 mb-2">
          {hasCompanyName ? (
            <h4
              title={companyName}
              className="line-clamp-2 text-sm font-semibold leading-snug tracking-[-0.011em] text-ink"
            >
              {companyName}
            </h4>
          ) : (
            <h4 className="text-sm font-medium text-ink-2">
              Sem empresa <span className="not-italic">· dados incompletos</span>
            </h4>
          )}
          {lead.score !== undefined && lead.score !== null ? (
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                lead.score >= 70
                  ? SCORE_BADGE_CLASS.Quente
                  : lead.score >= 40
                    ? SCORE_BADGE_CLASS.Morno
                    : SCORE_BADGE_CLASS.Frio
              }`}
            >
              {lead.score}
            </span>
          ) : lead.temperature ? (
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${SCORE_BADGE_CLASS[lead.temperature] ?? DEFAULT_SCORE_BADGE_CLASS}`}
            >
              {lead.temperature}
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
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${stagnation.className}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${stagnation.dot}`} />
            {stagnation.label}
          </span>

          {lead.forecastProbabilityAi != null && (
            <span
              title="Probabilidade ajustada pelo Copiloto IA a partir da conversa mais recente — complementar à probabilidade oficial do CRM, nunca a substitui."
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink"
            >
              <Sparkles className="w-2.5 h-2.5" />
              {lead.forecastProbabilityAi}% IA
            </span>
          )}

          {isBitrixSynced && (
            <span
              title={`Sincronizado no Bitrix24 (ID #${lead.bitrixLeadId || lead.bitrixDealId})`}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink"
            >
              Bitrix #{lead.bitrixLeadId || lead.bitrixDealId}
            </span>
          )}

          {Boolean(lead.customFields?.voiceQualified) && (
            <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink">
              Voz Qualificada
            </span>
          )}

          {/* Status do Enriquecimento Cadastral/Firmográfico */}
          {lead.company?.enrichmentStatus === 'Enriquecendo' ? (
            <span
              title="Enriquecimento automático em andamento..."
              className="inline-flex items-center gap-1 rounded-full border border-line bg-[color:color-mix(in_srgb,var(--warn)_12%,var(--surface))] px-2 py-0.5 text-[11px] font-medium text-ink"
            >
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Enriquecendo
            </span>
          ) : lead.company?.enrichmentStatus === 'Enriquecido' ? (
            <span
              title={`Empresa enriquecida via ${lead.company.enrichmentSource || 'Receita Federal'}`}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-[color:color-mix(in_srgb,var(--ok)_10%,var(--surface))] px-2 py-0.5 text-[11px] font-medium text-ink"
            >
              <Sparkles className="h-2.5 w-2.5 text-[color:var(--ok)]" strokeWidth={1.5} />
              {lead.company.enrichmentSource?.includes('Apollo') ? 'Apollo' : 'Enriquecido'}
            </span>
          ) : lead.company?.enrichmentStatus === 'Falhou' ? (
            <span
              title="Última tentativa de enriquecimento falhou"
              className="inline-flex items-center gap-1 rounded-full border border-line bg-[color:color-mix(in_srgb,var(--critical)_10%,var(--surface))] px-2 py-0.5 text-[11px] font-medium text-ink"
            >
              Falha Enriq.
            </span>
          ) : null}
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
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-primary hover:bg-[color:color-mix(in_srgb,var(--brand)_8%,transparent)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
              disabled={enriching || lead.company?.enrichmentStatus === 'Enriquecendo'}
              title={
                lead.company?.enrichmentStatus === 'Enriquecendo'
                  ? 'Enriquecimento automático em andamento...'
                  : 'Reenriquecer dados cadastrais e firmográficos'
              }
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-ink-2 hover:bg-[color:color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {enriching || lead.company?.enrichmentStatus === 'Enriquecendo' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {enriching || lead.company?.enrichmentStatus === 'Enriquecendo'
                ? 'Enriquecendo...'
                : 'Enriquecer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
