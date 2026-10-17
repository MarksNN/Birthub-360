import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../../src/lib/api.js';
import { voiceHubApi } from '../../../../src/features/voice-hub/api/voiceHub.api.js';
import { VoiceHubView } from '../../../../src/features/voice-hub/components/VoiceHubView.js';

vi.mock('../../../../src/contexts/AuthContext.js', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'user_123',
      name: 'Consultor de Testes',
      email: 'consultor@birthhub360.com',
      role: 'ADMIN',
      organizationId: 'org_test_360',
    },
  }),
}));

vi.mock('../../../../src/lib/soundEffects.js', () => ({
  SoundFX: {
    play: vi.fn(),
  },
}));

describe('Capacidade 5 — VoiceHub & Telefonia (Unit & Flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. Cliente de API de Telefonia (voiceHubApi)', () => {
    it('deve listar conexões do Birth Voices Hub com desempacotamento de envelope', async () => {
      const mockConnections = [
        {
          id: 'conn_voice_1',
          label: 'Birth Voices Principal',
          baseUrl: 'https://voice.birthhub360.com',
          agentId: 'agent_sdr_01',
          enabled: true,
          hasApiKey: true,
          hasWebhookSecret: true,
          createdAt: '2026-10-16T12:00:00Z',
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        success: true,
        data: mockConnections,
      });

      const result = await voiceHubApi.getConnections();
      expect(api.get).toHaveBeenCalledWith('/api/integrations/birth-voice/connections');
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Birth Voices Principal');
      expect(result[0].enabled).toBe(true);
    });

    it('deve consultar o status de prospecção fria e histórico de cold calls', async () => {
      const mockStatus = {
        enabled: true,
        window: { startHour: 9, endHour: 18, daysOfWeek: [1, 2, 3, 4, 5] },
        policy: { maxDailyCalls: 100, retryIntervalMinutes: 60 },
        recentRuns: [
          {
            id: 'run_1',
            runAt: '2026-10-16T15:00:00Z',
            totalAttempted: 20,
            totalAnswered: 12,
            totalScheduled: 4,
          },
        ],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        success: true,
        data: mockStatus,
      });

      const result = await voiceHubApi.getColdCallStatus();
      expect(api.get).toHaveBeenCalledWith('/api/integrations/birth-voice/cold-call/status');
      expect(result?.enabled).toBe(true);
      expect(result?.recentRuns[0].totalAttempted).toBe(20);
      expect(result?.recentRuns[0].totalAnswered).toBe(12);
    });

    it('deve disparar ligação para lead com sucesso via SDR de voz', async () => {
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        success: true,
        data: {
          sessionId: 'sess_call_abc123',
          callSid: 'CA_twilio_or_bland_789',
          status: 'initiated',
        },
      });

      const result = await voiceHubApi.callLead('lead_999', 'sdr');
      expect(api.post).toHaveBeenCalledWith('/api/integrations/birth-voice/call/lead_999', {
        agentType: 'sdr',
      });
      expect(result.status).toBe('initiated');
      expect(result.callSid).toBe('CA_twilio_or_bland_789');
    });

    it('deve listar telefones em opt-out/supressão e registrar bloqueio manual', async () => {
      const mockSuppressions = [
        {
          id: 'sup_1',
          phone: '11999990000',
          source: 'manual',
          reason: 'Solicitado pelo titular (LGPD)',
          createdAt: '2026-10-16T10:00:00Z',
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        success: true,
        data: mockSuppressions,
      });

      const list = await voiceHubApi.getSuppressions();
      expect(list).toHaveLength(1);
      expect(list[0].phone).toBe('11999990000');

      vi.spyOn(api, 'post').mockResolvedValueOnce({ success: true });
      await voiceHubApi.addSuppression({
        phone: '11988887777',
        reason: 'Opt-out via WhatsApp',
      });
      expect(api.post).toHaveBeenCalledWith('/api/integrations/birth-voice/suppressions', {
        phone: '11988887777',
        reason: 'Opt-out via WhatsApp',
      });
    });

    it('deve listar conexões ativas do PABX 3CX', async () => {
      const mock3Cx = [
        {
          id: '3cx_conn_1',
          label: 'Ramal Vendas SP',
          pbxUrl: 'https://pabx.empresa.com',
          extension: '102',
          autoDialEnabled: true,
          createdAt: '2026-10-16T08:00:00Z',
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        success: true,
        data: mock3Cx,
      });

      const list = await voiceHubApi.get3CXConnections();
      expect(list).toHaveLength(1);
      expect(list[0].extension).toBe('102');
    });

    it('deve filtrar cadências ativas que contenham toques no canal de voz', async () => {
      const mockRuns = [
        {
          id: 'cad_run_1',
          leadId: 'lead_alpha',
          sequenceId: 'seq_1',
          status: 'Active',
          currentTouchIndex: 0,
          attempts: [
            { touchOrder: 1, channel: 'email', attemptedAt: '2026-10-16T09:00:00Z', result: 'sent' },
          ],
        },
        {
          id: 'cad_run_2',
          leadId: 'lead_beta',
          sequenceId: 'seq_2',
          status: 'Active',
          currentTouchIndex: 1,
          attempts: [
            { touchOrder: 1, channel: 'email', attemptedAt: '2026-10-16T09:00:00Z', result: 'sent' },
            { touchOrder: 2, channel: 'voice', attemptedAt: '2026-10-16T14:00:00Z', result: 'pending' },
          ],
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce(mockRuns);

      const voiceRuns = await voiceHubApi.getActiveVoiceCadences();
      expect(voiceRuns).toHaveLength(1);
      expect(voiceRuns[0].leadId).toBe('lead_beta');
    });
  });

  describe('2. Interface do Usuário (VoiceHubView)', () => {
    it('deve renderizar o cockpit de telefonia com status de conexões e métricas', async () => {
      vi.spyOn(voiceHubApi, 'getConnections').mockResolvedValueOnce([
        {
          id: 'conn_1',
          label: 'Birth Voices Prod',
          baseUrl: 'https://voice.birthhub360.com',
          agentId: 'agent_sdr',
          enabled: true,
          hasApiKey: true,
          hasWebhookSecret: true,
          createdAt: new Date(),
        },
      ]);

      vi.spyOn(voiceHubApi, 'get3CXConnections').mockResolvedValueOnce([
        {
          id: '3cx_1',
          label: 'PABX Matriz',
          pbxUrl: 'https://3cx.matriz.com',
          extension: '105',
          autoDialEnabled: true,
          createdAt: new Date(),
        },
      ]);

      vi.spyOn(voiceHubApi, 'getColdCallStatus').mockResolvedValueOnce({
        enabled: true,
        window: { startHour: 9, endHour: 18, daysOfWeek: [1, 2, 3, 4, 5] },
        policy: { maxDailyCalls: 50, retryIntervalMinutes: 30 },
        recentRuns: [
          {
            id: 'run_1',
            runAt: new Date(),
            totalAttempted: 15,
            totalAnswered: 9,
            totalScheduled: 3,
          },
        ],
      });

      vi.spyOn(voiceHubApi, 'getSuppressions').mockResolvedValueOnce([
        {
          id: 'sup_1',
          phone: '11977776666',
          source: 'manual',
          reason: 'Cliente solicitou pausa',
          createdAt: new Date(),
        },
      ]);

      vi.spyOn(voiceHubApi, 'getActiveVoiceCadences').mockResolvedValueOnce([]);

      render(<VoiceHubView />);

      expect(screen.getByText('Voice Hub & Cockpit de Telefonia')).toBeInTheDocument();
      expect(screen.getByText('Capacidade 5')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Birth Voices Prod')).toBeInTheDocument();
        expect(screen.getByText('https://3cx.matriz.com')).toBeInTheDocument();
        expect(screen.getByText('105')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('9')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('11977776666')).toBeInTheDocument();
      });
    });

    it('deve disparar ligação no Discador SDR Direto e exibir feedback de sucesso', async () => {
      vi.spyOn(voiceHubApi, 'getConnections').mockResolvedValue([]);
      vi.spyOn(voiceHubApi, 'get3CXConnections').mockResolvedValue([]);
      vi.spyOn(voiceHubApi, 'getColdCallStatus').mockResolvedValue(null);
      vi.spyOn(voiceHubApi, 'getSuppressions').mockResolvedValue([]);
      vi.spyOn(voiceHubApi, 'getActiveVoiceCadences').mockResolvedValue([]);

      vi.spyOn(voiceHubApi, 'callLead').mockResolvedValueOnce({
        status: 'queued',
        callSid: 'CA_test_success_123',
      });

      render(<VoiceHubView />);

      const input = screen.getByLabelText(/ID do Lead no CRM/i);
      const submitBtn = screen.getByRole('button', { name: /Iniciar Chamada SDR/i });

      fireEvent.change(input, { target: { value: 'lead_abc_456' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(voiceHubApi.callLead).toHaveBeenCalledWith('lead_abc_456', 'sdr');
        expect(
          screen.getByText(/Ligação iniciada com sucesso via SDR de voz/i),
        ).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de erro clara quando a ligação for rejeitada por número em opt-out (409)', async () => {
      vi.spyOn(voiceHubApi, 'getConnections').mockResolvedValue([]);
      vi.spyOn(voiceHubApi, 'get3CXConnections').mockResolvedValue([]);
      vi.spyOn(voiceHubApi, 'getColdCallStatus').mockResolvedValue(null);
      vi.spyOn(voiceHubApi, 'getSuppressions').mockResolvedValue([]);
      vi.spyOn(voiceHubApi, 'getActiveVoiceCadences').mockResolvedValue([]);

      vi.spyOn(voiceHubApi, 'callLead').mockRejectedValueOnce({
        response: {
          data: {
            error: 'Número na lista interna de bloqueio (opt-out): a ligação não foi disparada.',
          },
        },
      });

      render(<VoiceHubView />);

      const input = screen.getByLabelText(/ID do Lead no CRM/i);
      const submitBtn = screen.getByRole('button', { name: /Iniciar Chamada SDR/i });

      fireEvent.change(input, { target: { value: 'lead_blocked_789' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Número na lista interna de bloqueio \(opt-out\)/i),
        ).toBeInTheDocument();
      });
    });
  });
});
