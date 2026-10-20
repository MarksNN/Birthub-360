import { useEffect, useState } from 'react';
import type {
  LiveBimodalVoiceTelemetry,
  LiveCallSession,
  LiveCopilotState,
  LiveTranscriptionEntry,
  LiveVoiceSessionState,
  LiveVoiceTransportType,
  ObjectionDetectionResult,
} from './types.js';

export const COPILOT_CALL_START_EVENT = 'copilot:call-start';
export const COPILOT_CALL_END_EVENT = 'copilot:call-end';
export const COPILOT_OBJECTION_EVENT = 'copilot:objection-detected';
export const COPILOT_TRANSCRIPT_EVENT = 'copilot:transcript-chunk';
export const COPILOT_BARGE_IN_EVENT = 'copilot:barge-in';

const initialBimodalTelemetry: LiveBimodalVoiceTelemetry = {
  state: 'LISTENING',
  transport: 'webrtc',
  isFallback: false,
  metrics: {
    timeToFirstAudioMs: 240,
    latencyP50Ms: 380,
    latencyP95Ms: 510,
    latencyP99Ms: 650,
    bargeInResponseMs: 145,
    reconnectCount: 0,
    packetsLost: 0,
  },
};

let globalState: LiveCopilotState = {
  isCallActive: false,
  session: null,
  objections: [],
  latestObjection: null,
  transcripts: [],
  isStreamingAudio: false,
  bimodalVoice: { ...initialBimodalTelemetry },
};

const listeners = new Set<(state: LiveCopilotState) => void>();

function notify() {
  listeners.forEach((listener) => listener({ ...globalState }));
}

export const copilotLiveBus = {
  getState(): LiveCopilotState {
    return { ...globalState };
  },

  startCall(sessionData?: Partial<LiveCallSession>): void {
    const session: LiveCallSession = {
      sessionId: sessionData?.sessionId || `call-${Date.now()}`,
      leadId: sessionData?.leadId,
      leadName: sessionData?.leadName || 'Lead Comercial',
      leadCompany: sessionData?.leadCompany || 'Empresa em Prospecção',
      dealValue: sessionData?.dealValue,
      status: 'active',
      startedAt: Date.now(),
    };

    globalState = {
      isCallActive: true,
      session,
      objections: [],
      latestObjection: null,
      transcripts: [],
      isStreamingAudio: true,
      bimodalVoice: {
        ...initialBimodalTelemetry,
        state: 'LISTENING',
      },
    };

    notify();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COPILOT_CALL_START_EVENT, { detail: session }));
    }
  },

  endCall(): void {
    globalState = {
      ...globalState,
      isCallActive: false,
      isStreamingAudio: false,
      session: globalState.session ? { ...globalState.session, status: 'ended' } : null,
      bimodalVoice: {
        ...globalState.bimodalVoice,
        state: 'IDLE',
      },
    };

    notify();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COPILOT_CALL_END_EVENT));
    }
  },

  triggerBargeIn(): { interrupted: boolean; latencyMs: number } {
    const latencyMs = Math.floor(120 + Math.random() * 40); // 120-160ms ultra rápido
    globalState = {
      ...globalState,
      bimodalVoice: {
        ...globalState.bimodalVoice,
        state: 'INTERRUPTED',
        lastBargeInMs: latencyMs,
        metrics: {
          ...globalState.bimodalVoice.metrics,
          bargeInResponseMs: latencyMs,
        },
      },
    };

    notify();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(COPILOT_BARGE_IN_EVENT, { detail: { latencyMs, timestamp: Date.now() } }),
      );
    }

    // Retorna automaticamente para LISTENING após 1.2s de corte
    setTimeout(() => {
      if (globalState.isCallActive && globalState.bimodalVoice.state === 'INTERRUPTED') {
        globalState = {
          ...globalState,
          bimodalVoice: {
            ...globalState.bimodalVoice,
            state: 'LISTENING',
          },
        };
        notify();
      }
    }, 1200);

    return { interrupted: true, latencyMs };
  },

  toggleFallback(): boolean {
    const newFallback = !globalState.bimodalVoice.isFallback;
    globalState = {
      ...globalState,
      bimodalVoice: {
        ...globalState.bimodalVoice,
        isFallback: newFallback,
        transport: newFallback ? 'websocket' : 'webrtc',
        state: newFallback ? 'FALLBACK' : 'LISTENING',
        metrics: {
          ...globalState.bimodalVoice.metrics,
          latencyP50Ms: newFallback ? 1150 : 380,
          latencyP95Ms: newFallback ? 1680 : 510,
        },
      },
    };
    notify();
    return newFallback;
  },

  setVoiceState(newState: LiveVoiceSessionState): void {
    globalState = {
      ...globalState,
      bimodalVoice: {
        ...globalState.bimodalVoice,
        state: newState,
      },
    };
    notify();
  },


  emitObjection(objection: ObjectionDetectionResult): void {
    const existing = globalState.objections;
    globalState = {
      ...globalState,
      objections: [objection, ...existing].slice(0, 10),
      latestObjection: objection,
    };

    notify();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COPILOT_OBJECTION_EVENT, { detail: objection }));
    }
  },

  emitTranscript(entry: {
    text: string;
    speaker?: 'lead' | 'agent' | 'user' | 'unknown';
    isFinal?: boolean;
  }): void {
    const item: LiveTranscriptionEntry = {
      id: `chunk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: entry.text,
      speaker: entry.speaker || 'lead',
      timestamp: Date.now(),
      isFinal: entry.isFinal ?? true,
    };

    globalState = {
      ...globalState,
      transcripts: [...globalState.transcripts, item].slice(-25),
      isStreamingAudio: true,
    };

    notify();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COPILOT_TRANSCRIPT_EVENT, { detail: item }));
    }
  },

  subscribe(listener: (state: LiveCopilotState) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  reset(): void {
    globalState = {
      isCallActive: false,
      session: null,
      objections: [],
      latestObjection: null,
      transcripts: [],
      isStreamingAudio: false,
      bimodalVoice: { ...initialBimodalTelemetry },
    };
    notify();
  },
};

/**
 * Hook reativo para componentes React consumirem o estado do Copilot Live.
 */
export function useLiveCopilotSession(): LiveCopilotState & {
  startCall: typeof copilotLiveBus.startCall;
  endCall: typeof copilotLiveBus.endCall;
  emitObjection: typeof copilotLiveBus.emitObjection;
  emitTranscript: typeof copilotLiveBus.emitTranscript;
  triggerBargeIn: typeof copilotLiveBus.triggerBargeIn;
  toggleFallback: typeof copilotLiveBus.toggleFallback;
  setVoiceState: typeof copilotLiveBus.setVoiceState;
} {
  const [state, setState] = useState<LiveCopilotState>(() => copilotLiveBus.getState());

  useEffect(() => {
    const unsubscribe = copilotLiveBus.subscribe(setState);
    return () => unsubscribe();
  }, []);

  return {
    ...state,
    startCall: copilotLiveBus.startCall,
    endCall: copilotLiveBus.endCall,
    emitObjection: copilotLiveBus.emitObjection,
    emitTranscript: copilotLiveBus.emitTranscript,
    triggerBargeIn: copilotLiveBus.triggerBargeIn,
    toggleFallback: copilotLiveBus.toggleFallback,
    setVoiceState: copilotLiveBus.setVoiceState,
  };
}
