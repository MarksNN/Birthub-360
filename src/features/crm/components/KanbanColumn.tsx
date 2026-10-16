import { useDroppable } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import React from 'react';
import { LEAD_STATUS_EMOJI as STATUS_EMOJI } from '../../../lib/enumMap.js';
import type { Lead, LeadStatus } from '../../../types/index.js';
import { KanbanCard } from './KanbanCard.js';

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onCardEnrich?: (leadId: string) => Promise<void>;
  onConvert?: (leadId: string) => Promise<void>;
  selectedLeadIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  selectionMode?: boolean;
  /** id do usuário -> nome, para KanbanCard exibir o dono (Lead.owner guarda o id, não o nome). */
  ownerNameById?: Record<string, string>;
}

export const KanbanColumn = React.memo(function KanbanColumn({
  status,
  leads,
  onCardClick,
  onCardEnrich,
  onConvert,
  selectedLeadIds,
  onToggleSelect,
  selectionMode,
  ownerNameById,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'Column',
      status,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex flex-col rounded-2xl min-w-[320px] max-w-[320px] max-h-full shrink-0 border bg-surface transition-all duration-300 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-brand/20 before:to-transparent before:z-20 ${
        isOver
          ? 'border-brand/50 shadow-[0_0_30px_rgba(0,229,255,0.15)] scale-[1.01]'
          : 'border-line/40 hover:border-line/70'
      }`}
    >
      {/* Cabeçalho da coluna */}
      <div className="px-4 pt-4 pb-3 sticky top-0 z-10 flex flex-col gap-1 backdrop-blur-md bg-surface border-b border-line">
        <div className="flex justify-between items-center gap-2">
          <h3 className="font-mono text-[11px] font-semibold tracking-widest uppercase text-ink-2 flex items-center gap-1.5 min-w-0">
            <span className="shrink-0" aria-hidden="true">
              {STATUS_EMOJI[status] || '📌'}
            </span>
            <span className="line-clamp-2 leading-tight">{status}</span>
          </h3>
          {/* Badge de contagem minimalista: ponto pulsante + número, sem bg colorido */}
          <span className="flex items-center gap-1.5 text-xs text-ink-2 font-semibold shrink-0">
            {leads.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            )}
            {leads.length}
          </span>
        </div>
        <div className="text-xs text-brand/80 font-mono">
          Forecast:{' '}
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            leads.reduce((acc, lead) => {
              const val = typeof lead.amount === 'number' ? lead.amount : 0;
              const prob = typeof lead.probability === 'number' ? lead.probability : 0;
              const probMultiplier = prob > 1 ? prob / 100 : prob;
              return acc + val * probMultiplier;
            }, 0),
          )}
        </div>
      </div>

      {
        // Achado da auditoria (PR #328, item fora de escopo original): sem virtualização, uma
        // coluna populosa monta todos os `KanbanCard` no DOM de uma vez (até ~1000 leads/funil
        // buscados por `useCrmBoardController`, sem paginação real — ver `groupedLeads` em
        // `CrmBoard.tsx`). Analisado e DELIBERADAMENTE NÃO implementado agora, apesar de
        // `@tanstack/react-virtual` já ser dependência real do projeto e já ter um padrão pronto
        // (`ui/VirtualTable.tsx`, `CompanyList.tsx`): virtualizar esta lista especificamente exige
        // continuar passando TODOS os ids ao `SortableContext` do @dnd-kit (drag-and-drop e
        // reordenação por teclado dependem disso para colisão/foco), só renderizando via
        // windowing os `KanbanCard` VISÍVEIS — um padrão não-trivial de acertar sem quebrar o drag
        // por teclado (`crm-kanban.spec.ts`, já historicamente sensível a timing nesta suíte, ver
        // achado do PR #328 sobre esse mesmo teste) nem o autoscroll ao arrastar perto da borda da
        // janela virtualizada, e que exigiria validação visual/interativa real em navegador para
        // ser considerado concluído (não disponível neste ambiente/sessão). Forçar essa mudança
        // sem essa validação é mais arriscado do que manter o estado atual — ver seção 4 regra
        // #8 e seção 12 item 6 de .claude/CLAUDE.md.
      }
      <div className="p-3 flex-1 overflow-y-auto space-y-2.5 min-h-[150px] custom-scrollbar">
        <SortableContext items={leads.map((lead) => lead.id)} strategy={rectSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              onClick={onCardClick}
              onEnrich={onCardEnrich}
              onConvert={onConvert}
              isSelected={selectedLeadIds?.has(lead.id)}
              onToggleSelect={onToggleSelect}
              selectionMode={selectionMode}
              ownerNameById={ownerNameById}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="h-full min-h-[110px] rounded-lg flex flex-col items-center justify-center text-ink-3 text-xs gap-1.5 transition-colors border border-dashed border-line">
            <span className="text-base" aria-hidden="true">
              📥
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider">Solte cards aqui</span>
          </div>
        )}
      </div>
    </div>
  );
});
