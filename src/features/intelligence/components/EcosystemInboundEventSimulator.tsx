import { BellRing, CheckCircle2, Play, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { SoundFX } from '../../../lib/soundEffects.js';

interface InboundActionResult {
  stepNumber: number;
  toolName: string;
  title: string;
  success: boolean;
}

interface InboundEventResult {
  sourcePlatform: string;
  eventType: string;
  durationMs: number;
  actionsTriggered: InboundActionResult[];
}

export function EcosystemInboundEventSimulator() {
  const [eventPlatform, setEventPlatform] = useState<string>('outlook_m365');
  const [eventType, setEventType] = useState<string>('inbound_message');
  const [eventSender, setEventSender] = useState<string>('cfo@industria-alpha.com.br');
  const [eventSubject, setEventSubject] = useState<string>(
    'Interesse na proposta Enterprise — podemos agendar call?',
  );
  const [eventContent, setEventContent] = useState<string>(
    'Olá, analisamos a apresentação com a diretoria e queremos avançar. Podem enviar a planilha de ROI e agendar uma reunião no Teams amanhã às 15h?',
  );
  const [ingestingEvent, setIngestingEvent] = useState(false);
  const [eventResult, setEventResult] = useState<InboundEventResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleIngestEvent = async () => {
    if (!eventSubject.trim() || !eventContent.trim()) return;
    SoundFX.play('click');
    setIngestingEvent(true);
    setEventResult(null);
    setFeedback(null);
    try {
      const res = await api.post<{ success: boolean; data: InboundEventResult }>(
        '/api/agent/ecosystem/events/ingest',
        {
          sourcePlatform: eventPlatform,
          eventType,
          sender: eventSender,
          subjectOrTitle: eventSubject,
          content: eventContent,
        },
      );
      const data = (res as any)?.data ?? res;
      if (data?.actionsTriggered) {
        setEventResult(data);
        SoundFX.play('success');
      }
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Falha ao processar evento inbound.');
      SoundFX.play('error');
    } finally {
      setIngestingEvent(false);
    }
  };

  return (
    <div className="bg-surface-2/60 border border-line rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
          <BellRing size={16} className="text-[var(--color-heading-pink)]" />
          Barramento Reativo de Eventos & Webhooks (Outlook, Gmail, WhatsApp, Trello, Monday, Teams,
          Zoom...)
        </h3>
        <p className="text-xs text-ink-2 mt-0.5">
          Injete ou simule um evento externo (e-mail recebido, mensagem de WhatsApp/Telegram, card
          movido no Trello/Monday ou transcrição de call) para acionar automaticamente tarefas,
          scripts e alertas no Pop-up, Celular e Relógio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label
            htmlFor="sim-platform"
            className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1"
          >
            Plataforma de Origem
          </label>
          <select
            id="sim-platform"
            value={eventPlatform}
            onChange={(e) => setEventPlatform(e.target.value)}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs font-bold text-ink"
          >
            <option value="outlook_m365">Microsoft 365 / Outlook</option>
            <option value="gmail">Google Workspace / Gmail</option>
            <option value="imap_email">E-mail Direto (IMAP/SMTP)</option>
            <option value="whatsapp">WhatsApp Corporativo</option>
            <option value="telegram">Telegram Enterprise</option>
            <option value="teams">Microsoft Teams</option>
            <option value="slack">Slack Workspace</option>
            <option value="trello">Trello Quadros</option>
            <option value="monday">Monday.com</option>
            <option value="notion">Notion Workspace</option>
            <option value="bitrix24">Bitrix24 CRM</option>
            <option value="hubspot">HubSpot CRM</option>
            <option value="pipedrive">Pipedrive CRM</option>
            <option value="rdstation">RD Station CRM</option>
            <option value="calendly">Calendly Agendamentos</option>
            <option value="zoom">Zoom Meetings</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="sim-event-type"
            className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1"
          >
            Tipo de Evento Reativo
          </label>
          <select
            id="sim-event-type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs font-bold text-ink"
          >
            <option value="inbound_message">Mensagem Recebida (E-mail/Chat/WhatsApp)</option>
            <option value="task_or_card_update">Card ou Tarefa Criada/Movida</option>
            <option value="meeting_completed">Reunião Concluída (Transcrição/Ata)</option>
            <option value="crm_deal_stage_change">Avanço de Estágio no CRM</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="sim-sender"
            className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1"
          >
            Remetente / Decisor
          </label>
          <input
            id="sim-sender"
            type="text"
            value={eventSender}
            onChange={(e) => setEventSender(e.target.value)}
            placeholder="ex: cfo@empresa.com.br"
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs font-mono text-ink"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="sim-subject"
            className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1"
          >
            Assunto ou Título do Evento
          </label>
          <input
            id="sim-subject"
            type="text"
            value={eventSubject}
            onChange={(e) => setEventSubject(e.target.value)}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs font-bold text-ink"
          />
        </div>

        <div>
          <label
            htmlFor="sim-content"
            className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1"
          >
            Conteúdo Bruto / Corpo da Mensagem / Pauta da Reunião
          </label>
          <textarea
            id="sim-content"
            rows={3}
            value={eventContent}
            onChange={(e) => setEventContent(e.target.value)}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink leading-relaxed"
          />
        </div>

        {feedback && <p className="text-xs text-danger font-medium">{feedback}</p>}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-ink-2">
            Ao disparar, o evento atravessa o Barramento, gera Tarefas, Scripts e Alerta no Pop-up,
            Celular e Relógio.
          </span>
          <button
            type="button"
            disabled={ingestingEvent}
            onClick={() => void handleIngestEvent()}
            className="px-4 py-2 rounded-lg text-xs font-black bg-[var(--color-heading-pink)] text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {ingestingEvent ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Processando Barramento...
              </>
            ) : (
              <>
                <Play size={13} />
                Disparar Evento no Barramento
              </>
            )}
          </button>
        </div>
      </div>

      {eventResult && (
        <div className="mt-4 pt-4 border-t border-line space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink uppercase tracking-wider">
              ⚡ Cadeia de Reações Acionada com Sucesso ({eventResult.sourcePlatform.toUpperCase()})
            </span>
            <span className="font-mono text-ink-2">{eventResult.durationMs}ms</span>
          </div>
          {eventResult.actionsTriggered.map((act) => (
            <div
              key={act.stepNumber}
              className="p-2 rounded-lg bg-surface-2/70 border border-line flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className={act.success ? 'text-success' : 'text-danger'} />
                <span className="font-bold text-ink">{act.title}</span>
              </div>
              <span className="text-[10px] font-mono text-ink-2">{act.toolName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
