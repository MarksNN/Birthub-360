/**
 * audioRecording.service.ts
 *
 * Serviço de gravação de áudio nativo/web para reuniões presenciais de campo (Capacidade 6 - Mobile).
 * Projetado para operar tanto no WebView do Android/iOS via Capacitor quanto em PWA/desktop.
 * Coleta áudio via MediaRecorder com fallback de codecs, calcula durações reais,
 * gera base64 sanitizado e integra diretamente com o OfflineSyncService.
 */

import {
  type FieldMeetingAudioPayload,
  type OfflineQueueItem,
  offlineSyncService,
} from './offlineSync.service.js';

export type AudioRecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface AudioRecordingResult {
  blob: Blob;
  base64: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
}

export interface AudioRecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  timeSliceMs?: number;
}

export interface RecordFieldMeetingInput {
  title: string;
  leadId?: string;
  meetingNotes?: string;
  consentGranted: boolean;
  consentMethod?: string;
  textVersion?: string;
}

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private state: AudioRecordingState = 'idle';
  private startTime = 0;
  private pausedTime = 0;
  private totalPausedDuration = 0;
  private onStateChangeListeners = new Set<(state: AudioRecordingState) => void>();

  /**
   * Verifica se o ambiente possui suporte à API de gravação de áudio MediaRecorder.
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Retorna o melhor codec de áudio suportado pelo dispositivo.
   */
  public getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
      return 'audio/webm';
    }
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return 'audio/webm';
  }

  /**
   * Verifica permissão de microfone.
   */
  public async hasPermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      return true; // Assume permissão solicitada on-demand caso permissions API não exista
    }
    try {
      const permission = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      return permission.state === 'granted';
    } catch {
      return true;
    }
  }

  /**
   * Solicita acesso ao microfone ao usuário ou sistema operacional.
   */
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Libera as faixas imediatamente após verificação
      for (const track of stream.getTracks()) {
        track.stop();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Inicia a gravação de áudio da reunião.
   */
  public async startRecording(options?: AudioRecordingOptions): Promise<void> {
    if (this.state === 'recording') {
      return;
    }

    if (!this.isSupported()) {
      throw new Error('Gravação de áudio não é suportada neste navegador ou ambiente.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.audioChunks = [];
    const mimeType = options?.mimeType || this.getSupportedMimeType();

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: options?.audioBitsPerSecond || 64000,
      });
    } catch {
      // Fallback para construtor sem opções caso o mimeType não seja aceito
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.totalPausedDuration = 0;
    this.mediaRecorder.start(options?.timeSliceMs || 1000);
    this.setState('recording');
  }

  /**
   * Pausa a gravação em andamento.
   */
  public pauseRecording(): void {
    if (this.state !== 'recording' || !this.mediaRecorder) return;
    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pausedTime = Date.now();
      this.setState('paused');
    }
  }

  /**
   * Retoma a gravação pausada.
   */
  public resumeRecording(): void {
    if (this.state !== 'paused' || !this.mediaRecorder) return;
    if (this.mediaRecorder.state === 'paused') {
      this.totalPausedDuration += Date.now() - this.pausedTime;
      this.mediaRecorder.resume();
      this.setState('recording');
    }
  }

  /**
   * Finaliza a gravação e retorna o resultado compactado e codificado em base64.
   */
  public async stopRecording(): Promise<AudioRecordingResult> {
    if (this.state === 'idle' || !this.mediaRecorder) {
      throw new Error('Nenhuma gravação ativa para finalizar.');
    }

    const durationMs = this.getDurationMs();

    return new Promise<AudioRecordingResult>((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('MediaRecorder indisponível.'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const effectiveMimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(this.audioChunks, { type: effectiveMimeType });
          const base64 = await this.blobToBase64(blob);

          this.cleanup();
          this.setState('stopped');

          resolve({
            blob,
            base64,
            mimeType: effectiveMimeType,
            sizeBytes: blob.size,
            durationMs,
          });
        } catch (err) {
          this.cleanup();
          this.setState('idle');
          reject(err);
        }
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  /**
   * Cancela a gravação descartando os buffers.
   */
  public cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignora erros ao parar
      }
    }
    this.cleanup();
    this.setState('idle');
  }

  /**
   * Retorna a duração atual da gravação em milissegundos.
   */
  public getDurationMs(): number {
    if (this.startTime === 0) return 0;
    if (this.state === 'paused') {
      return this.pausedTime - this.startTime - this.totalPausedDuration;
    }
    if (this.state === 'recording') {
      return Date.now() - this.startTime - this.totalPausedDuration;
    }
    return 0;
  }

  public getState(): AudioRecordingState {
    return this.state;
  }

  public onStateChange(listener: (state: AudioRecordingState) => void): () => void {
    this.onStateChangeListeners.add(listener);
    return () => {
      this.onStateChangeListeners.delete(listener);
    };
  }

  private setState(newState: AudioRecordingState): void {
    this.state = newState;
    for (const listener of this.onStateChangeListeners) {
      listener(newState);
    }
  }

  private cleanup(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignora
        }
      }
      this.stream = null;
    }
    this.mediaRecorder = null;
  }

  /**
   * Converte um Blob de áudio para string Base64.
   */
  public async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove o prefixo data:audio/...;base64, se presente
        const base64Index = result.indexOf(';base64,');
        if (base64Index !== -1) {
          resolve(result.substring(base64Index + 8));
        } else {
          resolve(result);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Método de alto nível para finalizar a gravação e enfileirar no OfflineSyncService.
   */
  public async recordFieldMeetingAndEnqueue(
    input: RecordFieldMeetingInput,
    recordingResult: AudioRecordingResult,
  ): Promise<OfflineQueueItem<FieldMeetingAudioPayload>> {
    if (!input.consentGranted) {
      throw new Error(
        'Gravação de reunião não pode ser enfileirada sem consentimento prévio do titular (LGPD).',
      );
    }

    const payload: FieldMeetingAudioPayload = {
      title: input.title,
      leadId: input.leadId,
      audioData: recordingResult.base64,
      audioMimeType: recordingResult.mimeType,
      audioSizeBytes: recordingResult.sizeBytes,
      durationMs: recordingResult.durationMs,
      recordedAt: new Date().toISOString(),
      consentGranted: true,
      consentMethod: input.consentMethod || 'FIELD_VERBAL_CONSENT',
      textVersion: input.textVersion || 'v1.0',
      meetingNotes: input.meetingNotes,
    };

    return offlineSyncService.enqueueFieldMeetingAudio(payload);
  }
}

export const audioRecordingService = new AudioRecordingService();
