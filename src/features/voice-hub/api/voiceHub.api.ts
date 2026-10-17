import { api } from '../../../lib/api.js';

export interface VoiceHubConnectionSummary {
  id: string;
  label: string;
  baseUrl: string;
  agentId: string | null;
  enabled: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  createdAt: string | Date;
}

export interface ColdCallStatusData {
  enabled: boolean;
  window: { startHour: number; endHour: number; daysOfWeek: number[] };
  policy: { maxDailyCalls: number; retryIntervalMinutes: number };
  recentRuns: Array<{
    id: string;
    runAt: string | Date;
    totalAttempted: number;
    totalAnswered: number;
    totalScheduled: number;
    errorSummary?: string | null;
  }>;
}

export interface OutboundCallResult {
  sessionId?: string;
  callSid?: string;
  status: string;
}

export interface SuppressionItem {
  id: string;
  phone: string;
  source: string;
  reason?: string | null;
  leadId?: string | null;
  createdAt: string | Date;
}

export interface ThreeCXConnectionSummary {
  id: string;
  label: string;
  pbxUrl: string;
  extension: string;
  autoDialEnabled: boolean;
  createdAt: string | Date;
}

export interface VoiceCadenceRunSummary {
  id: string;
  leadId: string;
  sequenceId: string;
  status: string;
  currentTouchIndex: number;
  attempts: Array<{
    touchOrder: number;
    channel: string;
    attemptedAt: string;
    result: string;
    error?: string | null;
  }>;
}

export const voiceHubApi = {
  /** Lista conexões ativas do Birth Voices Hub por organização */
  getConnections: async (): Promise<VoiceHubConnectionSummary[]> => {
    try {
      const response = await api.get<{ data?: VoiceHubConnectionSummary[]; success?: boolean }>(
        '/api/integrations/birth-voice/connections',
      );
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      return [];
    } catch {
      return [];
    }
  },

  /** Consulta o status da campanha e fila de prospecção fria do SDR de voz */
  getColdCallStatus: async (): Promise<ColdCallStatusData | null> => {
    try {
      const response = await api.get<{ data?: ColdCallStatusData; success?: boolean }>(
        '/api/integrations/birth-voice/cold-call/status',
      );
      if (response && 'enabled' in response) return response as unknown as ColdCallStatusData;
      if (response?.data) return response.data;
      return null;
    } catch {
      return null;
    }
  },

  /** Dispara uma chamada telefônica do SDR de voz para o lead informado */
  callLead: async (
    leadId: string,
    agentType: 'sdr' | 'nps' | 'reactivation' = 'sdr',
  ): Promise<OutboundCallResult> => {
    const response = await api.post<{ data?: OutboundCallResult; success?: boolean }>(
      `/api/integrations/birth-voice/call/${encodeURIComponent(leadId)}`,
      { agentType },
    );
    if (response && 'status' in response) return response as unknown as OutboundCallResult;
    if (response?.data) return response.data;
    return { status: 'accepted' };
  },

  /** Consulta a lista interna de telefones em opt-out/bloqueio */
  getSuppressions: async (): Promise<SuppressionItem[]> => {
    try {
      const response = await api.get<{ data?: SuppressionItem[]; success?: boolean }>(
        '/api/integrations/birth-voice/suppressions',
      );
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      return [];
    } catch {
      return [];
    }
  },

  /** Registra bloqueio manual de telefone (opt-out imediato LGPD) */
  addSuppression: async (input: {
    phone: string;
    reason?: string;
    leadId?: string;
  }): Promise<void> => {
    await api.post('/api/integrations/birth-voice/suppressions', input);
  },

  /** Lista conexões ativas do PABX 3CX */
  get3CXConnections: async (): Promise<ThreeCXConnectionSummary[]> => {
    try {
      const response = await api.get<{ data?: ThreeCXConnectionSummary[]; success?: boolean }>(
        '/api/integrations/3cx/connections',
      );
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      return [];
    } catch {
      return [];
    }
  },

  /** Consulta cadências ativas para verificar toques de voz pendentes */
  getActiveVoiceCadences: async (): Promise<VoiceCadenceRunSummary[]> => {
    try {
      const response = await api.get<{ data?: VoiceCadenceRunSummary[]; success?: boolean }>(
        '/api/cadence/runs?status=Active',
      );
      const runs = (
        Array.isArray(response) ? response : response?.data || []
      ) as VoiceCadenceRunSummary[];
      return runs.filter((run: VoiceCadenceRunSummary) =>
        run.attempts?.some((attempt: { channel: string }) => attempt.channel === 'voice'),
      );
    } catch {
      return [];
    }
  },
};
