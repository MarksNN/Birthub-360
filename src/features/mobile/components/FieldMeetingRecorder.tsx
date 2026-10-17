/**
 * FieldMeetingRecorder.tsx
 *
 * Componente de gravação de reuniões presenciais de campo (Capacidade 6 - Mobile).
 * Otimizado para interface mobile/touch (Capacitor/PWA), com controle de gravação,
 * conformidade estrita com LGPD (consentimento verbal auditável) e sincronização
 * offline-first com fila resiliente via OfflineSyncService.
 */

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Mic,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  type AudioRecordingResult,
  type AudioRecordingState,
  audioRecordingService,
} from '../audioRecording.service.js';
import { type OfflineSyncStats, offlineSyncService } from '../offlineSync.service.js';

export interface FieldMeetingRecorderProps {
  initialLeadId?: string;
  initialTitle?: string;
  onSuccess?: (result: { temporaryId?: string; syncStatus: string }) => void;
  className?: string;
}

export function FieldMeetingRecorder({
  initialLeadId = '',
  initialTitle = '',
  onSuccess,
  className = '',
}: FieldMeetingRecorderProps) {
  const [title, setTitle] = useState(initialTitle || 'Reunião de Campo com Cliente');
  const [leadId, setLeadId] = useState(initialLeadId);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [consentGranted, setConsentGranted] = useState(false);

  const [recordingState, setRecordingState] = useState<AudioRecordingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingResult, setRecordingResult] = useState<AudioRecordingResult | null>(null);

  const [syncStats, setSyncStats] = useState<OfflineSyncStats>(() => offlineSyncService.getStats());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitora estado do serviço de gravação
  useEffect(() => {
    const unsub = audioRecordingService.onStateChange((state) => {
      setRecordingState(state);
    });
    return () => unsub();
  }, []);

  // Monitora fila e conectividade do OfflineSyncService
  useEffect(() => {
    const unsub = offlineSyncService.subscribe((_event) => {
      setSyncStats(offlineSyncService.getStats());
    });
    return () => unsub();
  }, []);

  // Timer para tempo decorrido de gravação
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (recordingState === 'idle') {
        setElapsedSeconds(0);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingState]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setFeedback(null);
    if (!consentGranted) {
      setFeedback({
        type: 'error',
        message:
          'O consentimento verbal do titular é obrigatório pela LGPD antes de iniciar a gravação.',
      });
      return;
    }

    try {
      setRecordingResult(null);
      setElapsedSeconds(0);
      await audioRecordingService.startRecording();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao acessar o microfone do dispositivo.',
      });
    }
  };

  const handlePauseResume = () => {
    if (recordingState === 'recording') {
      audioRecordingService.pauseRecording();
    } else if (recordingState === 'paused') {
      audioRecordingService.resumeRecording();
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await audioRecordingService.stopRecording();
      setRecordingResult(result);
      setFeedback({
        type: 'info',
        message: 'Gravação concluída com sucesso. Revise as anotações e clique em salvar.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao processar gravação de áudio.',
      });
    }
  };

  const handleSaveAndSync = async () => {
    if (!recordingResult) {
      setFeedback({
        type: 'error',
        message: 'Nenhum áudio foi gravado para sincronização.',
      });
      return;
    }

    if (!consentGranted) {
      setFeedback({
        type: 'error',
        message: 'Consentimento LGPD não confirmado.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const item = await audioRecordingService.recordFieldMeetingAndEnqueue(
        {
          title: title.trim() || 'Reunião de Campo',
          leadId: leadId.trim() || undefined,
          meetingNotes: meetingNotes.trim() || undefined,
          consentGranted: true,
          consentMethod: 'FIELD_VERBAL_CONSENT',
          textVersion: 'v1.0',
        },
        recordingResult,
      );

      const isOnline = offlineSyncService.isOnline();
      setFeedback({
        type: 'success',
        message: isOnline
          ? 'Reunião enviada e em processamento no Copiloto IA!'
          : 'Reunião gravada e enfileirada no dispositivo! Sincronizará automaticamente assim que houver conexão.',
      });

      // Limpa formulário após envio
      setRecordingResult(null);
      setElapsedSeconds(0);
      setMeetingNotes('');

      onSuccess?.({
        temporaryId: item.temporaryId,
        syncStatus: isOnline ? 'synced_or_syncing' : 'queued_offline',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao salvar reunião.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSyncNow = async () => {
    if (!syncStats.isOnline) {
      setFeedback({
        type: 'error',
        message: 'Dispositivo sem conexão no momento. Conecte ao Wi-Fi ou dados móveis.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await offlineSyncService.syncQueue();
      setFeedback({
        type: 'info',
        message: `Sincronização concluída: ${result.succeeded} enviada(s), ${result.remaining} pendente(s).`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro durante a sincronização.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-surface border border-line rounded-2xl p-6 shadow-sm flex flex-col gap-6 max-w-xl mx-auto ${className}`}
    >
      {/* Cabeçalho com indicador de conectividade e fila offline */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <Mic className="w-5 h-5 text-indigo-500" />
            Reunião Presencial de Campo
          </h2>
          <p className="text-xs text-ink/60">
            Gravação offline-first com transcrição automática no Copiloto IA
          </p>
        </div>

        <div className="flex items-center gap-2">
          {syncStats.isOnline ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Wifi className="w-3.5 h-3.5" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              <WifiOff className="w-3.5 h-3.5" />
              Offline
            </span>
          )}

          {syncStats.pending > 0 && (
            <button
              type="button"
              onClick={handleManualSyncNow}
              disabled={isSubmitting || !syncStats.isOnline}
              className="text-xs bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 hover:text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1 font-medium transition"
              title="Clique para sincronizar fila agora"
            >
              <RefreshCw className={`w-3 h-3 ${isSubmitting ? 'animate-spin' : ''}`} />
              {syncStats.pending} pendente(s)
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
              : feedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Metadados da Reunião */}
      <div className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="field-meeting-title"
            className="block text-xs font-medium text-ink/70 mb-1"
          >
            Título da Reunião / Cliente
          </label>
          <input
            id="field-meeting-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={recordingState === 'recording'}
            placeholder="Ex: Visita Técnica - Diretor Comercial"
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="field-meeting-lead-id"
            className="block text-xs font-medium text-ink/70 mb-1"
          >
            ID do Lead ou Oportunidade (Opcional)
          </label>
          <input
            id="field-meeting-lead-id"
            type="text"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            disabled={recordingState === 'recording'}
            placeholder="Ex: lead_cm28..."
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Caixa de Consentimento LGPD Obrigatório */}
      <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGranted}
              onChange={(e) => setConsentGranted(e.target.checked)}
              disabled={recordingState === 'recording'}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-ink/80 leading-relaxed select-none">
              <strong className="text-ink font-semibold">Consentimento Verbal LGPD:</strong>{' '}
              Confirmo que informei o cliente sobre a gravação para ata comercial e obtive sua
              anuência verbal antes de iniciar.
            </span>
          </label>
        </div>
      </div>

      {/* Área Central de Gravação */}
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface-alt/40 border border-line/60 gap-4">
        {/* Ticker do Relógio */}
        <div className="flex items-center gap-2 text-3xl font-mono font-bold text-ink tracking-wider">
          <Clock className="w-6 h-6 text-ink/40" />
          {formatTimer(elapsedSeconds)}
        </div>

        {/* Indicador de Status Visual */}
        <div className="flex items-center gap-2">
          {recordingState === 'recording' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              Gravando Áudio em Campo...
            </span>
          )}
          {recordingState === 'paused' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Gravação Pausada
            </span>
          )}
          {recordingState === 'stopped' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Gravação Pronta
            </span>
          )}
          {recordingState === 'idle' && (
            <span className="text-xs text-ink/50">Pronto para iniciar gravação</span>
          )}
        </div>

        {/* Botões de Ação de Gravação */}
        <div className="flex items-center gap-4 mt-2">
          {recordingState === 'idle' && (
            <button
              type="button"
              onClick={handleStartRecording}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg flex items-center justify-center transition active:scale-95"
              title="Iniciar Gravação"
            >
              <Mic className="w-8 h-8" />
            </button>
          )}

          {(recordingState === 'recording' || recordingState === 'paused') && (
            <>
              <button
                type="button"
                onClick={handlePauseResume}
                className="w-12 h-12 rounded-full bg-surface border border-line hover:bg-surface-alt text-ink shadow-sm flex items-center justify-center transition active:scale-95"
                title={recordingState === 'recording' ? 'Pausar' : 'Retomar'}
              >
                {recordingState === 'recording' ? (
                  <Pause className="w-5 h-5 text-amber-600" />
                ) : (
                  <Play className="w-5 h-5 text-emerald-600 fill-current" />
                )}
              </button>

              <button
                type="button"
                onClick={handleStopRecording}
                className="w-14 h-14 rounded-full bg-ink hover:bg-ink/90 text-surface shadow-md flex items-center justify-center transition active:scale-95"
                title="Parar e Finalizar"
              >
                <Square className="w-6 h-6 fill-current" />
              </button>
            </>
          )}
        </div>

        {/* Player de Prévia quando Gravação Concluída */}
        {recordingResult && (
          <div className="w-full mt-2 pt-4 border-t border-line/60 flex flex-col gap-2">
            <span className="text-xs font-medium text-ink/70">Prévia do áudio gravado:</span>
            <audio
              controls
              src={URL.createObjectURL(recordingResult.blob)}
              className="w-full h-10 rounded-lg"
            />
            <span className="text-[11px] text-ink/50 text-right">
              Tamanho: {(recordingResult.sizeBytes / 1024).toFixed(1)} KB | Duração:{' '}
              {Math.round(recordingResult.durationMs / 1000)}s
            </span>
          </div>
        )}
      </div>

      {/* Anotações Adicionais da Reunião */}
      <div>
        <label
          htmlFor="field-meeting-notes"
          className="block text-xs font-medium text-ink/70 mb-1 flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          Anotações & Destaques de Campo (Opcional)
        </label>
        <textarea
          id="field-meeting-notes"
          rows={3}
          value={meetingNotes}
          onChange={(e) => setMeetingNotes(e.target.value)}
          placeholder="Ex: Cliente demonstrou interesse no módulo de VoiceHub. Próximo passo: enviar proposta até sexta-feira."
          className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>

      {/* Botão de Envio / Enfileiramento */}
      {recordingResult && (
        <button
          type="button"
          onClick={handleSaveAndSync}
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Enfileirando e Processando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Salvar e Sincronizar Reunião
            </>
          )}
        </button>
      )}
    </div>
  );
}
