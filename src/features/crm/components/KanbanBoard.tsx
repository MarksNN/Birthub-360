import React from 'react';
import { KanbanCard } from './KanbanCard.js';
import { KanbanColumn } from './KanbanColumn.js';

export interface KanbanBoardProps {
  deals?: Array<{ id: string; title: string; stage: string; value: number }>;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ deals = [] }) => {
  return (
    <div
      role="region"
      aria-label="Quadro Kanban de Negócios"
      className="flex gap-4 overflow-x-auto p-4"
      tabIndex={0}
    >
      <div className="flex gap-4">
        {deals.map((d) => (
          <div key={d.id} tabIndex={0} role="button" aria-label={`Negócio: ${d.title}`}>
            <span className="font-semibold">{d.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
