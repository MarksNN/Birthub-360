/**
 * Contrato Canônico de Voz Bimodal em Tempo Real — Birth Hub 360°
 * Onda 04: Experiência Comercial Avançada (Eixo 5)
 * Dono: Agente 18 — Contratos e API
 * Especialistas do Domínio: Agente 12 (Voz e Telefonia) & Agente 07 (IA e Automações)
 */

export type LiveVoiceSessionState =
  | 'IDLE'
  | 'CONNECTING'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'FALLBACK'
  | 'DISCONNECTED'
  | 'ERROR';

export type LiveVoiceTransportType = 'webrtc' | 'websocket';

export interface BimodalSessionConfig {
  organizationId: string;
  sessionId: string;
  sellerId: string;
  contextMode: 'roleplay_simulation' | 'voicehub_copilot';
  personaId?: string;
  personaName?: string;
  sampleRate?: number;
  enableBargeIn?: boolean;
  maxDurationSeconds?: number;
  ragContextAllowed?: boolean;
}

export interface LiveTurn {
  speaker: 'user' | 'assistant';
  text: string;
  audioDurationMs: number;
  interrupted: boolean;
  timestamp: string;
}

export interface LiveLatencyMetrics {
  timeToFirstAudioMs: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  bargeInResponseMs: number;
  reconnectCount: number;
  packetsLost: number;
}

export interface BimodalLiveSession {
  sessionId: string;
  organizationId: string;
  sellerId: string;
  state: LiveVoiceSessionState;
  transport: LiveVoiceTransportType;
  turns: LiveTurn[];
  metrics: LiveLatencyMetrics;
  isFallback: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IBimodalLiveVoicePort {
  createSession(config: BimodalSessionConfig): Promise<BimodalLiveSession>;
  sendAudioStream(params: {
    sessionId: string;
    organizationId: string;
    audioChunkBase64: string;
    isFinalChunk?: boolean;
  }): Promise<{ accepted: boolean; state: LiveVoiceSessionState }>;
  triggerBargeIn(params: {
    sessionId: string;
    organizationId: string;
    interruptionReason?: string;
  }): Promise<{ interrupted: boolean; latencyMs: number }>;
  fallbackToAsync(params: {
    sessionId: string;
    organizationId: string;
    reason: string;
  }): Promise<{ success: boolean; fallbackMode: 'traditional_stt_tts' }>;
  closeSession(params: { sessionId: string; organizationId: string }): Promise<BimodalLiveSession>;
}
