import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OfflineSyncService,
  LocalStorageAdapter,
  sanitizePayload,
  generateTemporaryId,
  extractEntityId,
  isTransientNetworkError,
  type ApiClientAdapter,
  type FieldMeetingAudioPayload,
} from '../../../../src/features/mobile/offlineSync.service.js';

describe('OfflineSyncService (Mobile / Capacitor / PWA)', () => {
  let mockApiClient: {
    request: ReturnType<typeof vi.fn>;
  };
  let storageAdapter: LocalStorageAdapter;
  let service: OfflineSyncService;

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    mockApiClient = {
      request: vi.fn(),
    };
    storageAdapter = new LocalStorageAdapter();

    service = new OfflineSyncService({
      storage: storageAdapter,
      apiClient: mockApiClient as unknown as ApiClientAdapter,
      autoSync: false,
      maxRetries: 3,
      storageKey: 'test_offline_queue',
      idMapKey: 'test_offline_id_map',
    });
  });

  afterEach(async () => {
    await service.clearQueue();
    service.destroy();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Utilitários', () => {
    it('generateTemporaryId gera identificadores únicos com prefixo', () => {
      const id1 = generateTemporaryId('lead');
      const id2 = generateTemporaryId('lead');
      expect(id1).toMatch(/^lead_/);
      expect(id2).toMatch(/^lead_/);
      expect(id1).not.toBe(id2);
    });

    it('sanitizePayload remove dados sensíveis como tokens e senhas preservando metadados de áudio', () => {
      const input = {
        name: 'Cliente Teste',
        token: 'secret-bearer-token',
        audioData: 'dGVzdC1hdWRpby1ieXRlcw==',
        audioMimeType: 'audio/webm',
        nested: {
          password: 'super-secret-password',
          safeField: 'valor permitido',
        },
      };

      const sanitized = sanitizePayload(input);
      expect(sanitized.name).toBe('Cliente Teste');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.audioData).toBe('dGVzdC1hdWRpby1ieXRlcw==');
      expect(sanitized.nested.password).toBe('[REDACTED]');
      expect(sanitized.nested.safeField).toBe('valor permitido');
    });

    it('extractEntityId extrai id de respostas com múltiplos formatos suportados', () => {
      expect(extractEntityId({ id: 'lead_123' })).toBe('lead_123');
      expect(extractEntityId({ data: { id: 'lead_456' } })).toBe('lead_456');
      expect(extractEntityId({ lead: { id: 'lead_789' } })).toBe('lead_789');
      expect(extractEntityId({ note: { id: 'note_101' } })).toBe('note_101');
      expect(extractEntityId(null)).toBeUndefined();
      expect(extractEntityId({})).toBeUndefined();
    });

    it('isTransientNetworkError classifica corretamente erros de rede transitórios vs erros de cliente', () => {
      expect(isTransientNetworkError(new Error('Não foi possível conectar ao servidor.'))).toBe(true);
      expect(isTransientNetworkError(new Error('A API demorou demais para responder.'))).toBe(true);
      expect(isTransientNetworkError(new Error('Failed to fetch'))).toBe(true);
      expect(isTransientNetworkError(new Error('Status 503 Service Unavailable'))).toBe(true);

      expect(isTransientNetworkError(new Error('Nome é obrigatório'))).toBe(false);
      expect(isTransientNetworkError(new Error('400 Bad Request'))).toBe(false);
      expect(isTransientNetworkError(new Error('403 Forbidden'))).toBe(false);
    });
  });

  describe('Enfileiramento Offline', () => {
    it('enfileira criação de lead em modo offline com id temporário', async () => {
      service.setOnlineState(false);

      const item = await service.enqueueCreateLead({ name: 'Lead Offline', email: 'offline@teste.com' });

      expect(item.type).toBe('CREATE_LEAD');
      expect(item.endpoint).toBe('/api/leads');
      expect(item.status).toBe('pending');
      expect(item.temporaryId).toMatch(/^temp_lead_/);
      expect(service.getPendingCount()).toBe(1);
    });

    it('enfileira gravação de áudio de reunião de campo com FIELD_MEETING_AUDIO (Capacidade 6 - Mobile)', async () => {
      service.setOnlineState(false);

      const payload: FieldMeetingAudioPayload = {
        title: 'Visita Comercial Presencial',
        leadId: 'lead_real_999',
        audioData: 'bW9jay1iYXNlNjQtYXVkaW8=',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 125000,
        durationMs: 45000,
        recordedAt: new Date().toISOString(),
        consentGranted: true,
        consentMethod: 'FIELD_VERBAL_CONSENT',
        meetingNotes: 'Cliente interessado no módulo de inteligência',
      };

      const item = await service.enqueueFieldMeetingAudio(payload);

      expect(item.type).toBe('FIELD_MEETING_AUDIO');
      expect(item.endpoint).toBe('/api/mobile/field-meetings/sync');
      expect(item.method).toBe('POST');
      expect(item.status).toBe('pending');
      expect(item.temporaryId).toMatch(/^temp_meeting_audio_/);
      expect(item.payload.audioData).toBe('bW9jay1iYXNlNjQtYXVkaW8=');
      expect(service.getPendingCount()).toBe(1);
    });

    it('enfileira reunião de campo associada a lead temporário aguardando resolução', async () => {
      service.setOnlineState(false);

      const leadItem = await service.enqueueCreateLead({ name: 'Lead Novo' });
      const meetingItem = await service.enqueueFieldMeetingAudio({
        title: 'Reunião com Lead Novo',
        leadId: leadItem.temporaryId,
        audioData: 'YXVkaW8=',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 50000,
        consentGranted: true,
      });

      expect(meetingItem.dependsOnTempId).toBe(leadItem.temporaryId);
    });
  });

  describe('Sincronização e Conciliação', () => {
    it('sincroniza reunião de campo com sucesso e emite evento item_synced', async () => {
      service.setOnlineState(true);

      mockApiClient.request.mockResolvedValueOnce({
        id: 'conv_copiloto_real_123',
        status: 'PROCESSING',
      });

      const payload: FieldMeetingAudioPayload = {
        title: 'Reunião de Diretoria',
        leadId: 'lead_123',
        audioData: 'bW9ja2F1ZGlv',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 42000,
        consentGranted: true,
      };

      const syncEvents: any[] = [];
      service.subscribe((evt) => syncEvents.push(evt));

      await service.enqueueFieldMeetingAudio(payload);
      const result = await service.syncQueue();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.remaining).toBe(0);
      expect(mockApiClient.request).toHaveBeenCalledWith({
        endpoint: '/api/mobile/field-meetings/sync',
        method: 'POST',
        body: expect.objectContaining({
          title: 'Reunião de Diretoria',
          leadId: 'lead_123',
        }),
      });

      const syncedEvent = syncEvents.find((e) => e.type === 'item_synced');
      expect(syncedEvent).toBeDefined();
    });

    it('substitui ID temporário do lead no payload da reunião de campo após sincronização do lead', async () => {
      service.setOnlineState(true);

      // 1. Resposta do POST /api/leads criando o lead com id real
      mockApiClient.request.mockResolvedValueOnce({
        id: 'lead_real_777',
      });

      // 2. Resposta do POST /api/mobile/field-meetings/sync
      mockApiClient.request.mockResolvedValueOnce({
        id: 'conv_copiloto_888',
      });

      const leadItem = await service.enqueueCreateLead({ name: 'Lead com Reunião' });
      await service.enqueueFieldMeetingAudio({
        title: 'Reunião com Lead',
        leadId: leadItem.temporaryId,
        audioData: 'YXVkaW8=',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 30000,
        consentGranted: true,
      });

      const result = await service.syncQueue();
      expect(result.succeeded).toBe(2);

      // Verifica se a segunda chamada (reunião) recebeu o lead_real_777
      expect(mockApiClient.request).toHaveBeenNthCalledWith(2, {
        endpoint: '/api/mobile/field-meetings/sync',
        method: 'POST',
        body: expect.objectContaining({
          leadId: 'lead_real_777',
        }),
      });
    });

    it('interrompe fila de sincronização em erro transitório de rede sem perder a operação', async () => {
      service.setOnlineState(true);

      mockApiClient.request.mockRejectedValueOnce(new Error('Não foi possível conectar ao servidor.'));

      await service.enqueueFieldMeetingAudio({
        title: 'Reunião que falhou na rede',
        audioData: 'YXVkaW8=',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 1000,
        consentGranted: true,
      });

      const result = await service.syncQueue();
      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.remaining).toBe(1);

      const pending = service.getPendingItems();
      expect(pending.length).toBe(1);
      expect(pending[0].retryCount).toBe(1);
      expect(pending[0].status).toBe('pending');
    });
  });
});
