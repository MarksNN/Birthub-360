import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ApiClientAdapter,
  extractEntityId,
  generateTemporaryId,
  isTransientNetworkError,
  LocalStorageAdapter,
  OfflineSyncService,
  sanitizePayload,
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
      autoSync: false, // Controlado manualmente nos testes
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

    it('sanitizePayload remove dados sensíveis como tokens e senhas', () => {
      const input = {
        name: 'Cliente Teste',
        token: 'secret-bearer-token',
        nested: {
          password: 'super-secret-password',
          safeField: 'valor permitido',
        },
      };

      const sanitized = sanitizePayload(input);
      expect(sanitized.name).toBe('Cliente Teste');
      expect(sanitized.token).toBe('[REDACTED]');
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
      expect(isTransientNetworkError(new Error('Não foi possível conectar ao servidor.'))).toBe(
        true,
      );
      expect(isTransientNetworkError(new Error('A API demorou demais para responder.'))).toBe(true);
      expect(isTransientNetworkError(new Error('Failed to fetch'))).toBe(true);
      expect(isTransientNetworkError(new Error('Status 503 Service Unavailable'))).toBe(true);

      // Erros definitivos de validação ou autorização
      expect(isTransientNetworkError(new Error('Nome é obrigatório'))).toBe(false);
      expect(isTransientNetworkError(new Error('400 Bad Request'))).toBe(false);
      expect(isTransientNetworkError(new Error('403 Forbidden'))).toBe(false);
    });
  });

  describe('Enfileiramento Offline', () => {
    it('enfileira criação de lead em modo offline com id temporário', async () => {
      service.setOnlineState(false);
      expect(service.isOnline()).toBe(false);

      const item = await service.enqueueCreateLead({
        name: 'Transportadora Alfa',
        status: 'Lead Recebido',
      });

      expect(item.id).toBeDefined();
      expect(item.type).toBe('CREATE_LEAD');
      expect(item.endpoint).toBe('/api/leads');
      expect(item.method).toBe('POST');
      expect(item.status).toBe('pending');
      expect(item.temporaryId).toMatch(/^temp_lead_/);
      expect(service.getPendingCount()).toBe(1);

      const saved = storageAdapter.getItem('test_offline_queue');
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(item.id);
    });

    it('enfileira atualização de lead com identificação de dependência quando referenciar id temporário', async () => {
      service.setOnlineState(false);
      const leadItem = await service.enqueueCreateLead({ name: 'Beta Log' });
      const tempId = leadItem.temporaryId!;

      const updateItem = await service.enqueueUpdateLead(tempId, {
        status: 'Contato Realizado',
      });

      expect(updateItem.type).toBe('UPDATE_LEAD');
      expect(updateItem.endpoint).toBe(`/api/leads/${tempId}`);
      expect(updateItem.dependsOnTempId).toBe(tempId);
      expect(service.getPendingCount()).toBe(2);
    });

    it('enfileira criação de nota associada a lead offline', async () => {
      service.setOnlineState(false);
      const leadItem = await service.enqueueCreateLead({ name: 'Gama Cargas' });
      const tempId = leadItem.temporaryId!;

      const noteItem = await service.enqueueCreateNote(tempId, {
        content: 'Conversado com decisor, retorno amanhã',
        author: 'SDR João',
      });

      expect(noteItem.type).toBe('CREATE_NOTE');
      expect(noteItem.endpoint).toBe(`/api/leads/${tempId}/notes`);
      expect(noteItem.dependsOnTempId).toBe(tempId);
      expect(service.getPendingCount()).toBe(2);
    });
  });

  describe('Ciclo Offline -> Online e Sincronização', () => {
    it('não dispara requisições HTTP se o serviço estiver offline', async () => {
      service.setOnlineState(false);
      await service.enqueueCreateLead({ name: 'Offline Lead' });

      const result = await service.syncQueue();
      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.remaining).toBe(1);
      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    it('executa sincronização completa encadeada: Lead -> Update -> Nota com resolução de ID temporário', async () => {
      service.setOnlineState(false);

      // 1. SDR cria lead offline
      const leadItem = await service.enqueueCreateLead({ name: 'Delta Logística' });
      const tempLeadId = leadItem.temporaryId!;

      // 2. SDR atualiza status do lead offline
      await service.enqueueUpdateLead(tempLeadId, { status: 'Qualificação' });

      // 3. SDR adiciona nota ao lead offline
      await service.enqueueCreateNote(tempLeadId, {
        content: 'Frotas de 50 caminhões',
        author: 'Consultor Carlos',
      });

      expect(service.getPendingCount()).toBe(3);

      // Configura respostas da API no retorno da rede
      const realLeadId = 'real_lead_backend_999';
      mockApiClient.request
        .mockResolvedValueOnce({ id: realLeadId, name: 'Delta Logística' }) // POST /api/leads
        .mockResolvedValueOnce({ id: realLeadId, status: 'Qualificação' }) // PUT /api/leads/real_lead_backend_999
        .mockResolvedValueOnce({ id: 'note_888', content: 'Frotas de 50 caminhões' }); // POST /api/leads/real_lead_backend_999/notes

      // Rede retorna
      service.setOnlineState(true);

      const result = await service.syncQueue();

      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(service.getPendingCount()).toBe(0);

      // Verifica chamadas da API
      expect(mockApiClient.request).toHaveBeenCalledTimes(3);

      // 1ª chamada: criação do lead
      expect(mockApiClient.request).toHaveBeenNthCalledWith(1, {
        endpoint: '/api/leads',
        method: 'POST',
        body: expect.objectContaining({ name: 'Delta Logística' }),
      });

      // 2ª chamada: atualização do lead COM ID REAL RESOLVIDO (substituiu temp_lead_...)
      expect(mockApiClient.request).toHaveBeenNthCalledWith(2, {
        endpoint: `/api/leads/${realLeadId}`,
        method: 'PUT',
        body: expect.objectContaining({ status: 'Qualificação' }),
      });

      // 3ª chamada: criação da nota COM ID REAL RESOLVIDO na rota e no payload
      expect(mockApiClient.request).toHaveBeenNthCalledWith(3, {
        endpoint: `/api/leads/${realLeadId}/notes`,
        method: 'POST',
        body: expect.objectContaining({
          content: 'Frotas de 50 caminhões',
          author: 'Consultor Carlos',
        }),
      });

      // Fila fica limpa após sincronização com sucesso
      expect(service.getQueue()).toHaveLength(0);
    });

    it('interrompe lote e incrementa retries se encontrar falha de rede transitória', async () => {
      service.setOnlineState(true);

      await service.enqueueCreateLead({ name: 'Empresa 1' });
      await service.enqueueCreateLead({ name: 'Empresa 2' });

      // Simula queda de rede no meio da requisição
      mockApiClient.request.mockRejectedValueOnce(
        new Error('Não foi possível conectar ao servidor.'),
      );

      const result = await service.syncQueue();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0); // Não é falha definitiva, permanece pending com retry
      expect(service.getPendingCount()).toBe(2);

      const items = service.getPendingItems();
      expect(items[0].retryCount).toBe(1);
      expect(items[0].lastError).toContain('Não foi possível conectar ao servidor');

      // Segunda chamada não foi executada para preservar ordem e evitar consumir retries
      expect(mockApiClient.request).toHaveBeenCalledTimes(1);
    });

    it('marca item como failed definitivamente após exceder o limite de retries', async () => {
      service.setOnlineState(true);
      await service.enqueueCreateLead({ name: 'Empresa Crítica' });

      mockApiClient.request.mockRejectedValue(new Error('Não foi possível conectar ao servidor.'));

      // 3 tentativas falhas
      await service.syncQueue();
      await service.syncQueue();
      const finalResult = await service.syncQueue();

      expect(finalResult.failed).toBe(1);
      expect(service.getFailedItems()).toHaveLength(1);
      expect(service.getFailedItems()[0].status).toBe('failed');
      expect(service.getFailedItems()[0].retryCount).toBe(3);
    });

    it('trata erros definitivos do cliente (ex: 400 validação) sem bloquear outras operações independentes', async () => {
      service.setOnlineState(true);

      // Lead 1: Dados inválidos
      await service.enqueueCreateLead({ name: '' });
      // Lead 2: Dados válidos
      await service.enqueueCreateLead({ name: 'Empresa Correta' });

      mockApiClient.request
        .mockRejectedValueOnce(new Error('Nome é obrigatório')) // 400 Bad Request
        .mockResolvedValueOnce({ id: 'real_valid_lead' }); // Sucesso

      const result = await service.syncQueue();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Nome é obrigatório');

      // Lead 2 foi concluído e removido da fila; Lead 1 permaneceu como failed para revisão
      expect(service.getQueue()).toHaveLength(1);
      expect(service.getQueue()[0].status).toBe('failed');
    });

    it('cancela operações dependentes caso a entidade pai falhe definitivamente', async () => {
      service.setOnlineState(false);
      const lead = await service.enqueueCreateLead({ name: 'Lead Problemático' });
      const tempId = lead.temporaryId!;

      await service.enqueueCreateNote(tempId, {
        content: 'Nota que depende do lead falho',
        author: 'SDR',
      });

      service.setOnlineState(true);

      // Lead falha com erro definitivo
      mockApiClient.request.mockRejectedValueOnce(new Error('CNPJ inválido'));

      const result = await service.syncQueue();

      expect(result.failed).toBe(2);
      const failed = service.getFailedItems();
      expect(failed[0].lastError).toContain('CNPJ inválido');
      expect(failed[1].lastError).toContain(
        'Operação cancelada: a criação da entidade dependente falhou',
      );
    });

    it('retryFailed reativa itens com status failed para nova tentativa', async () => {
      service.setOnlineState(true);
      await service.enqueueCreateLead({ name: 'Empresa Teste' });

      // Simula falha definitiva inicial (ex.: 400 Bad Request)
      mockApiClient.request.mockRejectedValueOnce(new Error('Falha temporária simulada'));
      await service.syncQueue();

      expect(service.getFailedItems()).toHaveLength(1);
      expect(service.getFailedItems()[0].status).toBe('failed');

      // Agora a API responde com sucesso ao reexecutar retry
      mockApiClient.request.mockResolvedValueOnce({ id: 'lead_recuperado' });

      const result = await service.retryFailed();
      expect(result.succeeded).toBe(1);
      expect(service.getQueue()).toHaveLength(0);
    });
  });

  describe('Concorrência e Notificações de Eventos', () => {
    it('impede execuções concorrentes com syncLock ativo', async () => {
      service.setOnlineState(true);
      await service.enqueueCreateLead({ name: 'Concorrente' });

      let resolveApi!: (val: unknown) => void;
      mockApiClient.request.mockReturnValue(
        new Promise((resolve) => {
          resolveApi = resolve;
        }),
      );

      // Dispara 2 syncs simultaneamente
      const p1 = service.syncQueue();
      const p2 = service.syncQueue();

      // p2 deve retornar imediatamente sem processar devido ao lock
      const r2 = await p2;
      expect(r2.processed).toBe(0);

      resolveApi({ id: 'lead_concorrente_ok' });
      const r1 = await p1;
      expect(r1.processed).toBe(1);
      expect(r1.succeeded).toBe(1);
    });

    it('emite eventos do ciclo de vida para subscribers', async () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribe(listener);

      service.setOnlineState(false);
      expect(listener).toHaveBeenCalledWith({
        type: 'network_change',
        status: 'offline',
      });

      const item = await service.enqueueCreateLead({ name: 'Event Lead' });
      expect(listener).toHaveBeenCalledWith({
        type: 'enqueued',
        item,
      });

      mockApiClient.request.mockResolvedValueOnce({ id: 'real_ev_1' });
      service.setOnlineState(true);
      await service.syncQueue();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'sync_start' }));
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'item_synced' }));
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'sync_completed' }));

      // Antes do unsubscribe foram 6 eventos (offline, enqueued, online, sync_start, item_synced, sync_completed)
      expect(listener).toHaveBeenCalledTimes(6);

      unsubscribe();
      service.setOnlineState(false);
      // Nenhuma notificação adicional deve ser recebida após unsubscribe
      expect(listener).toHaveBeenCalledTimes(6);
    });

    it('clearQueue limpa a fila e armazenamento', async () => {
      await service.enqueueCreateLead({ name: 'Para Limpar' });
      expect(service.getQueue()).toHaveLength(1);

      await service.clearQueue();
      expect(service.getQueue()).toHaveLength(0);
      expect(service.getStats().total).toBe(0);
    });

    it('dispara syncQueue automaticamente ao enfileirar se estiver online com autoSync ativado', async () => {
      const autoService = new OfflineSyncService({
        storage: storageAdapter,
        apiClient: mockApiClient as unknown as ApiClientAdapter,
        autoSync: true,
        maxRetries: 3,
        storageKey: 'auto_sync_queue',
      });
      autoService.setOnlineState(true);
      mockApiClient.request.mockResolvedValueOnce({ id: 'lead_auto_sync_ok' });

      await autoService.enqueueCreateLead({ name: 'Auto Sync Lead' });

      // Aguarda tick assíncrono do autoSync
      await new Promise((r) => setTimeout(r, 10));

      expect(mockApiClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/api/leads',
          method: 'POST',
        }),
      );
      autoService.destroy();
    });

    it('LocalStorageAdapter lida com falhas no localStorage usando fallback em memória', () => {
      const failingAdapter = new LocalStorageAdapter();
      const originalSet = window.localStorage.setItem;
      const originalGet = window.localStorage.getItem;

      // Força localStorage a lançar exceção (ex: QuotaExceeded ou SecurityError em WebView)
      window.localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      window.localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('SecurityError');
      });

      failingAdapter.setItem('chave_memoria', 'valor_seguro');
      expect(failingAdapter.getItem('chave_memoria')).toBe('valor_seguro');

      failingAdapter.removeItem('chave_memoria');
      expect(failingAdapter.getItem('chave_memoria')).toBeNull();

      window.localStorage.setItem = originalSet;
      window.localStorage.getItem = originalGet;
    });

    it('recupera graciosamente quando o armazenamento local contém JSON inválido', () => {
      storageAdapter.setItem('corrupted_queue', '{ invalid json [');
      const corruptedService = new OfflineSyncService({
        storage: storageAdapter,
        storageKey: 'corrupted_queue',
      });

      expect(corruptedService.getQueue()).toEqual([]);
      expect(corruptedService.getPendingCount()).toBe(0);
      corruptedService.destroy();
    });

    it('sanitizePayload trata arrays, primitivos e valores nulos', () => {
      expect(sanitizePayload(null)).toBeNull();
      expect(sanitizePayload(undefined)).toBeUndefined();
      expect(sanitizePayload('string pura')).toBe('string pura');
      expect(sanitizePayload(123)).toBe(123);
      expect(sanitizePayload([{ token: 'abc' }, { normal: 1 }])).toEqual([
        { token: '[REDACTED]' },
        { normal: 1 },
      ]);
    });
  });
});
