import {
  AlertTriangle,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Music,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { readModuleAvailabilityError } from '../lib/moduleNotReady.js';

interface CallLogEntry {
  id: string;
  agent?: string;
  contactName?: string;
  timestamp: string;
  duration: string;
  status?: string;
  summary?: string;
  transcript?: string;
  audioUrl?: string;
}

interface SessionRecord {
  id: string;
  agentName: string;
  caller: string;
  dateTime: string;
  duration: string;
  sentiment: 'Positivo' | 'Neutro' | 'Negativo';
  summary: string;
  transcript: string;
  audioUrl?: string;
}

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

function mapCallLogs(callLogs: CallLogEntry[]): SessionRecord[] {
  return callLogs.map((log) => ({
    id: log.id,
    agentName: log.agent || 'Desconhecido',
    caller: log.contactName || 'Anônimo',
    dateTime: new Date(log.timestamp).toLocaleString(),
    duration: log.duration,
    sentiment: log.status === 'Concluído' ? 'Positivo' : 'Neutro',
    summary: log.summary || 'Resumo não disponível',
    transcript: log.transcript || 'Transcrição não disponível',
    audioUrl: log.audioUrl || '',
  }));
}

function parseDurationSeconds(duration: string): number | null {
  const parts = duration.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function formatAverageDuration(sessions: SessionRecord[]): string | null {
  const seconds = sessions
    .map((s) => parseDurationSeconds(s.duration))
    .filter((n): n is number => n !== null);
  if (seconds.length === 0) return null;
  const avg = Math.round(seconds.reduce((a, b) => a + b, 0) / seconds.length);
  const mm = String(Math.floor(avg / 60)).padStart(2, '0');
  const ss = String(avg % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function ResultsPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    setLoadError(null);

    // Canonical prefix for the Voice Hub module. On main this path is fail-closed with
    // MODULE_NOT_READY (503) until tenancy-safe activation — never invent empty success.
    void (async () => {
      try {
        const res = await fetch('/api/voice-hub/call-logs', { credentials: 'include' });
        const data: unknown = await res.json().catch(() => null);
        const availabilityError = await readModuleAvailabilityError(res, data);
        if (cancelled) return;

        if (availabilityError) {
          setSessions([]);
          setSelectedSession(null);
          setLoadError(availabilityError);
          setLoadState('error');
          return;
        }

        const callLogs =
          data &&
          typeof data === 'object' &&
          Array.isArray((data as { callLogs?: unknown }).callLogs)
            ? (data as { callLogs: CallLogEntry[] }).callLogs
            : null;

        if (!callLogs) {
          setSessions([]);
          setSelectedSession(null);
          setLoadError('Resposta de call logs inválida. Nenhuma sessão foi assumida.');
          setLoadState('error');
          return;
        }

        const mapped = mapCallLogs(callLogs);
        setSessions(mapped);
        setSelectedSession(null);
        setLoadState(mapped.length === 0 ? 'empty' : 'ready');
      } catch {
        if (cancelled) return;
        setSessions([]);
        setSelectedSession(null);
        setLoadError('Falha de rede ao carregar call logs. Nenhuma métrica foi inventada.');
        setLoadState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const filteredSessions = sessions.filter(
    (s) =>
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.caller.includes(searchTerm) ||
      s.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const averageDuration = useMemo(() => formatAverageDuration(sessions), [sessions]);
  const positiveShare = useMemo(() => {
    if (sessions.length === 0) return null;
    const positive = sessions.filter((s) => s.sentiment === 'Positivo').length;
    return Math.round((positive / sessions.length) * 100);
  }, [sessions]);

  const handleExportCSV = () => {
    if (sessions.length === 0) return;
    const headers = [
      'ID da Sessão',
      'Canal/Agente',
      'Caller/Contato',
      'Data e Hora',
      'Duração',
      'Sentimento da Chamada',
      'Resumo Comercial/Operacional',
      'Transcrição Integral',
    ];

    const csvContent = [
      headers.join(','),
      ...sessions.map((s) => {
        const escapedAgentName = `"${(s.agentName || '').replace(/"/g, '""')}"`;
        const escapedSummary = `"${(s.summary || '').replace(/"/g, '""')}"`;
        const escapedTranscript = `"${(s.transcript || '').replace(/"/g, '""')}"`;

        return [
          s.id,
          escapedAgentName,
          s.caller,
          s.dateTime,
          s.duration,
          s.sentiment,
          escapedSummary,
          escapedTranscript,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `hub_resultados_transcricoes_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-sans">Resultados & Transcrições</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitore e analise os diálogos e métricas consolidadas dos agentes.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={sessions.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg hover:opacity-90 font-medium text-sm transition-opacity shadow-sm shrink-0 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Exportar Dados (CSV)
        </button>
      </div>

      {loadState === 'loading' && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando call logs do Voice Hub…
        </div>
      )}

      {loadState === 'error' && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {loadError ||
                'Módulo de voz indisponível. Nenhuma chamada ou métrica foi inventada para preencher esta tela.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Metrics — only from loaded sessions; never fabricate averages or scores. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total de Chamadas
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {loadState === 'ready' || loadState === 'empty' ? sessions.length : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {loadState === 'ready' || loadState === 'empty'
              ? 'Contagem a partir dos call logs carregados'
              : 'Aguardando dados reais do servidor'}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Duração Média
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {averageDuration ?? '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {averageDuration
              ? 'Calculada só com durações parseáveis das sessões carregadas'
              : 'Sem durações suficientes para calcular'}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Score Positivo / Neutro
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {positiveShare === null ? '—' : `${positiveShare}%`}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {positiveShare === null
              ? 'Sem sessões para derivar sentimento'
              : 'Proporção marcada como Positivo nas sessões carregadas'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por ID, agente, resumo ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loadState !== 'ready'}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand font-sans disabled:bg-slate-100"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto scrollbar-hide">
            {loadState === 'loading' && (
              <div role="status" className="p-8 text-center text-slate-400 text-sm">
                Carregando sessões…
              </div>
            )}
            {loadState === 'error' && (
              <div role="status" className="p-8 text-center text-slate-500 text-sm">
                Lista vazia de propósito — o servidor não confirmou call logs.
              </div>
            )}
            {loadState === 'empty' && (
              <div role="status" className="p-8 text-center text-slate-400 text-sm">
                Nenhuma sessão registrada ainda para esta organização.
              </div>
            )}
            {loadState === 'ready' && filteredSessions.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhuma sessão corresponde aos filtros digitados.
              </div>
            )}
            {loadState === 'ready' &&
              filteredSessions.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.currentTarget.click();
                    }
                  }}
                  onClick={() => setSelectedSession(s)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${
                    selectedSession?.id === s.id ? 'bg-brand-50 border-brand' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700">{s.id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        s.sentiment === 'Positivo'
                          ? 'bg-green-100 text-green-700'
                          : s.sentiment === 'Neutro'
                            ? 'bg-slate-100 text-slate-650'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {s.sentiment}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-slate-900 mt-1.5 truncate">
                    {s.agentName}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span className="font-mono">{s.caller}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {s.duration}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic">{s.summary}</p>
                </div>
              ))}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {selectedSession ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-brand font-bold bg-brand-50 px-2 py-1 rounded">
                      {selectedSession.id}
                    </span>
                    <span className="text-xs text-slate-400">{selectedSession.dateTime}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1.5">
                    {selectedSession.agentName}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">{selectedSession.caller}</span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                      selectedSession.sentiment === 'Positivo'
                        ? 'bg-green-100 text-green-700'
                        : selectedSession.sentiment === 'Neutro'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {selectedSession.sentiment}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-250">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Resumo Comercial / Operacional
                </h4>
                <p className="text-sm text-slate-700 mt-2.5 font-medium leading-relaxed">
                  {selectedSession.summary}
                </p>
              </div>

              <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-50 text-brand rounded-full">
                    <Music className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      Gravação do Áudio da Chamada
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedSession.audioUrl
                        ? `Gravado pelo canal de voz (${selectedSession.duration})`
                        : 'Nenhuma URL de áudio confirmada pelo servidor para esta sessão'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!selectedSession.audioUrl}
                  onClick={() => {
                    if (!selectedSession.audioUrl) return;
                    const link = document.createElement('a');
                    link.href = selectedSession.audioUrl;
                    link.setAttribute('download', `chamada_${selectedSession.id}.wav`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-brand hover:text-brand bg-slate-50 hover:bg-brand-50 text-slate-600 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 disabled:hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Baixar Áudio
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  Diálogo Completo
                </h4>
                <div className="space-y-3 max-h-[320px] overflow-y-auto bg-slate-50 border border-slate-100 p-4 rounded-lg scrollbar-hide">
                  {selectedSession.transcript.split('\n').map((line, idx) => {
                    const isAgent = line.startsWith('Agente:');
                    const cleanLine = line.replace('Agente:', '').replace('Usuário:', '').trim();
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                      >
                        <span className="text-[10px] text-slate-400 mb-0.5">
                          {isAgent ? 'Agente de Voz' : 'Usuário / Contato'}
                        </span>
                        <div
                          className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                            isAgent
                              ? 'bg-white text-slate-850 hover:border-slate-200 border border-slate-100 rounded-tl-none font-medium'
                              : 'bg-brand text-white rounded-tr-none'
                          }`}
                        >
                          {cleanLine}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
              {loadState === 'error'
                ? 'Call logs indisponíveis — nada a exibir até o módulo Voice Hub responder com dados reais.'
                : 'Selecione uma chamada do painel esquerdo para visualizar as transcrições e análises correspondentes.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
