import { Mail, MessageSquare, Phone, Plus, Send } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { LeadTouchHistory } from './types.js';

export function LeadCardHistoryPreview({ leadId }: { leadId: string }): React.ReactElement {
  const [newNote, setNewNote] = useState('');
  const [touches, setTouches] = useState<LeadTouchHistory[]>([
    {
      id: '1',
      channel: 'VOZ',
      summary:
        'Ligação realizada (1m 42s). Decisor confirmou interesse e solicitou apresentação executiva.',
      createdAt: 'Hoje às 14:15',
      authorName: 'SDR Autônomo',
    },
    {
      id: '2',
      channel: 'WHATSAPP',
      summary: 'Cadência #1 disparada com material institucional do Birth Hub 360°.',
      createdAt: 'Ontem às 10:00',
      authorName: 'Campanha Outbound',
    },
  ]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setTouches([
      {
        id: Date.now().toString(),
        channel: 'NOTA',
        summary: newNote,
        createdAt: 'Agora',
        authorName: 'Consultor',
      },
      ...touches,
    ]);
    setNewNote('');
  };

  const getChannelIcon = (channel: LeadTouchHistory['channel']) => {
    switch (channel) {
      case 'VOZ':
        return <Phone className="w-3 h-3 text-emerald-500" />;
      case 'WHATSAPP':
        return <MessageSquare className="w-3 h-3 text-green-500" />;
      case 'EMAIL':
        return <Mail className="w-3 h-3 text-blue-500" />;
      default:
        return <Plus className="w-3 h-3 text-brand" />;
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleAddNote} className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Adicionar nota rápida de alinhamento..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-[#F8F9FF]/10 text-xs text-slate-800 dark:text-[#F8F9FF] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-brand text-midnight font-bold text-xs hover:bg-amber-400 transition-colors flex items-center gap-1"
        >
          <Send className="w-3 h-3" />
          <span>Salvar</span>
        </button>
      </form>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {touches.map((touch) => (
          <div
            key={touch.id}
            className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-[#F8F9FF]/[0.02] border border-slate-100 dark:border-[#F8F9FF]/5 text-xs"
          >
            <div className="p-1 rounded-md bg-white dark:bg-[#F8F9FF]/5 border border-slate-200 dark:border-[#F8F9FF]/10 shrink-0 mt-0.5">
              {getChannelIcon(touch.channel)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-[#F8F9FF]/40 mb-0.5">
                <span className="font-semibold text-slate-700 dark:text-[#F8F9FF]/70">
                  {touch.authorName}
                </span>
                <span>{touch.createdAt}</span>
              </div>
              <p className="text-slate-600 dark:text-[#F8F9FF]/80 leading-relaxed text-[11px]">
                {touch.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
