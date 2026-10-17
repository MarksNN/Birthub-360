/**
 * offlineSync.service.ts
 *
 * Gerenciador de sincronização offline-first para o app Android/Capacitor e PWA.
 * Responsável por enfileirar operações de criação e atualização de leads e notas
 * em ambiente offline, persistir de forma segura no dispositivo e conciliar
 * com a API do backend assim que a conectividade for restabelecida.
 */

import { api } from '../../lib/api.js';

export type OfflineOperationType =
  | 'CREATE_LEAD'
  | 'UPDATE_LEAD'
  | 'CREATE_NOTE'
  | 'FIELD_MEETING_AUDIO'
  | 'GENERIC_MUTATION';

export interface FieldMeetingAudioPayload {
  title: string;
  leadId?: string;
  audioData: string; // Base64 do áudio gravado em campo
  audioMimeType: string;
  audioSizeBytes: number;
  durationMs?: number;
  recordedAt?: string;
  consentGranted: boolean;
  consentMethod?: string;
  textVersion?: string;
  meetingNotes?: string;
}

export type OfflineOperationStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OfflineQueueItem<TPayload = unknown> {
  id: string;
  type: OfflineOperationType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: TPayload;
  timestamp: number;
  status: OfflineOperationStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  temporaryId?: string;
  dependsOnTempId?: string;
  meta?: Record<string, unknown>;
}

export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  errors: Array<{ id: string; error: string }>;
}

export interface OfflineSyncStats {
  total: number;
  pending: number;
  syncing: number;
  failed: number;
  isOnline: boolean;
}

export type NetworkStatus = 'online' | 'offline';

export type SyncEvent =
  | { type: 'enqueued'; item: OfflineQueueItem }
  | { type: 'network_change'; status: NetworkStatus }
  | { type: 'sync_start'; count: number }
  | { type: 'item_synced'; item: OfflineQueueItem; response: unknown }
  | { type: 'item_failed'; item: OfflineQueueItem; error: Error }
  | { type: 'sync_completed'; result: SyncResult }
  | { type: 'queue_cleared' };

export type SyncEventListener = (event: SyncEvent) => void;

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface ApiClientAdapter {
  request<T = unknown>(params: {
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
  }): Promise<T>;
}

export interface OfflineSyncServiceOptions {
  storage?: StorageAdapter;
  apiClient?: ApiClientAdapter;
  autoSync?: boolean;
  maxRetries?: number;
  storageKey?: string;
  idMapKey?: string;
}

const DEFAULT_STORAGE_KEY = 'birthhub_offline_sync_queue_v1';
const DEFAULT_ID_MAP_KEY = 'birthhub_offline_id_mappings_v1';
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /apiKey/i,
  /creditCard/i,
];

/**
 * Sanitiza objetos recursivamente para evitar persistência indevida de credenciais/PII sensível.
 */
export function sanitizePayload<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizePayload(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized as T;
}

/**
 * Gera identificador temporário para registros criados localmente antes da sincronização.
 */
export function generateTemporaryId(prefix = 'temp'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomStr}`;
}

/**
 * Adaptador de armazenamento com fallback seguro para memória quando localStorage não estiver disponível.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private inMemoryFallback = new Map<string, string>();

  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignora SecurityError ou restrições de sandbox
    }
    return this.inMemoryFallback.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // QuotaExceededError ou restrições de sandbox
    }
    this.inMemoryFallback.set(key, value);
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // Ignora
    }
    this.inMemoryFallback.delete(key);
  }
}

/**
 * Adaptador padrão de chamadas à API via cliente centralizado da aplicação.
 */
export const defaultApiClient: ApiClientAdapter = {
  async request<T = unknown>({
    endpoint,
    method,
    body,
  }: {
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
  }): Promise<T> {
    switch (method) {
      case 'POST':
        return api.post<T>(endpoint, body);
      case 'PUT':
        return api.put<T>(endpoint, body);
      case 'PATCH':
        return api.patch<T>(endpoint, body);
      case 'DELETE':
        return api.delete<T>(endpoint);
      default:
        throw new Error(`Método HTTP não suportado: ${method}`);
    }
  },
};

/**
 * Extrai o ID retornado na resposta do backend para vincular mapeamento de IDs temporários.
 */
export function extractEntityId(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') return undefined;
  const obj = response as Record<string, unknown>;
  if (typeof obj.id === 'string' && obj.id) return obj.id;
  if (
    obj.data &&
    typeof obj.data === 'object' &&
    typeof (obj.data as Record<string, unknown>).id === 'string'
  ) {
    return (obj.data as Record<string, unknown>).id as string;
  }
  if (
    obj.lead &&
    typeof obj.lead === 'object' &&
    typeof (obj.lead as Record<string, unknown>).id === 'string'
  ) {
    return (obj.lead as Record<string, unknown>).id as string;
  }
  if (
    obj.note &&
    typeof obj.note === 'object' &&
    typeof (obj.note as Record<string, unknown>).id === 'string'
  ) {
    return (obj.note as Record<string, unknown>).id as string;
  }
  return undefined;
}

/**
 * Verifica se um erro retornado é transitório de rede ou permanente de validação/cliente.
 */
export function isTransientNetworkError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  const transientPatterns = [
    /não foi possível conectar ao servidor/i,
    /demorou demais para responder/i,
    /failed to fetch/i,
    /networkerror/i,
    /network error/i,
    /connection refused/i,
    /timeout/i,
    /econnrefused/i,
    /enotfound/i,
    /status 502/i,
    /status 503/i,
    /status 504/i,
  ];
  return transientPatterns.some((pattern) => pattern.test(message));
}

/**
 * Provedor de status de rede com suporte a listeners e override em testes.
 */
export class NetworkStatusProvider {
  private listeners = new Set<(isOnline: boolean) => void>();
  private forcedState: boolean | null = null;
  private onlineHandler?: () => void;
  private offlineHandler?: () => void;

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this.onlineHandler = () => this.notify(true);
      this.offlineHandler = () => this.notify(false);
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  public isOnline(): boolean {
    if (this.forcedState !== null) {
      return this.forcedState;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  public setForcedState(state: boolean | null): void {
    const prev = this.isOnline();
    this.forcedState = state;
    const current = this.isOnline();
    if (prev !== current) {
      this.notify(current);
    }
  }

  public subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(online: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(online);
      } catch (err) {
        console.error('[OfflineSync] Erro no listener de conectividade:', err);
      }
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      if (this.onlineHandler) window.removeEventListener('online', this.onlineHandler);
      if (this.offlineHandler) window.removeEventListener('offline', this.offlineHandler);
    }
    this.listeners.clear();
  }
}

/**
 * Serviço central de sincronização offline-first para o cliente mobile e PWA.
 */
export class OfflineSyncService {
  private storage: StorageAdapter;
  private apiClient: ApiClientAdapter;
  private autoSync: boolean;
  private maxRetries: number;
  private storageKey: string;
  private idMapKey: string;

  private queue: OfflineQueueItem[] = [];
  private idMap = new Map<string, string>();
  private listeners = new Set<SyncEventListener>();
  private networkProvider: NetworkStatusProvider;
  private syncLock = false;
  private unsubscribeNetwork?: () => void;

  constructor(options: OfflineSyncServiceOptions = {}) {
    this.storage = options.storage || new LocalStorageAdapter();
    this.apiClient = options.apiClient || defaultApiClient;
    this.autoSync = options.autoSync ?? true;
    this.maxRetries = options.maxRetries ?? 3;
    this.storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
    this.idMapKey = options.idMapKey || DEFAULT_ID_MAP_KEY;

    this.networkProvider = new NetworkStatusProvider();
    this.loadFromStorage();

    this.unsubscribeNetwork = this.networkProvider.subscribe((online) => {
      this.emit({
        type: 'network_change',
        status: online ? 'online' : 'offline',
      });
      if (online && this.autoSync) {
        void this.sync();
      }
    });
  }

  /**
   * Carrega fila e mapeamentos de IDs a partir do armazenamento local seguro.
   */
  private loadFromStorage(): void {
    try {
      const rawQueue = this.storage.getItem(this.storageKey);
      if (rawQueue && typeof rawQueue === 'string') {
        const parsed = JSON.parse(rawQueue);
        if (Array.isArray(parsed)) {
          this.queue = parsed;
        }
      }
    } catch (err) {
      console.warn(
        '[OfflineSync] Falha ao recuperar fila do storage local, reinicializando vazia:',
        err,
      );
      this.queue = [];
    }

    try {
      const rawMap = this.storage.getItem(this.idMapKey);
      if (rawMap && typeof rawMap === 'string') {
        const parsed = JSON.parse(rawMap);
        if (parsed && typeof parsed === 'object') {
          this.idMap = new Map(Object.entries(parsed));
        }
      }
    } catch {
      this.idMap = new Map();
    }
  }

  /**
   * Persiste fila de operações no armazenamento local.
   */
  private persistQueue(): void {
    try {
      const serialized = JSON.stringify(this.queue);
      void this.storage.setItem(this.storageKey, serialized);
    } catch (err) {
      console.error('[OfflineSync] Falha ao persistir fila localmente:', err);
    }
  }

  /**
   * Persiste mapeamento de IDs temporários no armazenamento local.
   */
  private persistIdMap(): void {
    try {
      const obj = Object.fromEntries(this.idMap.entries());
      void this.storage.setItem(this.idMapKey, JSON.stringify(obj));
    } catch (err) {
      console.error('[OfflineSync] Falha ao persistir mapeamentos de IDs:', err);
    }
  }

  /**
   * Emite eventos para inscritos.
   */
  private emit(event: SyncEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[OfflineSync] Erro em listener de sincronização:', err);
      }
    }
  }

  /**
   * Retorna se a aplicação possui conectividade com a rede no momento.
   */
  public isOnline(): boolean {
    return this.networkProvider.isOnline();
  }

  /**
   * Define manualmente o status de conectividade (útil para testes unitários ou simulação de modo avião).
   */
  public setOnlineState(online: boolean | null): void {
    this.networkProvider.setForcedState(online);
  }

  /**
   * Adiciona uma operação genérica na fila offline.
   */
  public async enqueue<T = unknown>(params: {
    type: OfflineOperationType;
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    payload: T;
    temporaryId?: string;
    dependsOnTempId?: string;
    meta?: Record<string, unknown>;
  }): Promise<OfflineQueueItem<T>> {
    const item: OfflineQueueItem<T> = {
      id: generateTemporaryId('op'),
      type: params.type,
      endpoint: params.endpoint,
      method: params.method,
      payload: sanitizePayload(params.payload),
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: this.maxRetries,
      temporaryId: params.temporaryId,
      dependsOnTempId: params.dependsOnTempId,
      meta: params.meta,
    };

    this.queue.push(item as OfflineQueueItem);
    this.persistQueue();
    this.emit({ type: 'enqueued', item: item as OfflineQueueItem });

    // Se estiver online e autoSync ativo, dispara sincronização imediatamente
    if (this.isOnline() && this.autoSync) {
      void this.syncQueue();
    }

    return item;
  }

  /**
   * Enfileira criação offline de lead.
   */
  public async enqueueCreateLead(
    leadData: Record<string, unknown>,
    tempId?: string,
  ): Promise<OfflineQueueItem> {
    const assignedTempId = tempId || generateTemporaryId('temp_lead');
    return this.enqueue({
      type: 'CREATE_LEAD',
      endpoint: '/api/leads',
      method: 'POST',
      payload: leadData,
      temporaryId: assignedTempId,
      meta: { entity: 'lead' },
    });
  }

  /**
   * Enfileira atualização offline de lead existente ou previamente criado offline.
   */
  public async enqueueUpdateLead(
    leadId: string,
    leadData: Record<string, unknown>,
  ): Promise<OfflineQueueItem> {
    const isTemp = leadId.startsWith('temp_') || this.queue.some((q) => q.temporaryId === leadId);

    return this.enqueue({
      type: 'UPDATE_LEAD',
      endpoint: `/api/leads/${leadId}`,
      method: 'PUT',
      payload: leadData,
      dependsOnTempId: isTemp ? leadId : undefined,
      meta: { entity: 'lead', leadId },
    });
  }

  /**
   * Enfileira criação offline de nota associada a um lead.
   */
  public async enqueueCreateNote(
    leadId: string,
    noteData: { content: string; author: string },
  ): Promise<OfflineQueueItem> {
    const isTemp = leadId.startsWith('temp_') || this.queue.some((q) => q.temporaryId === leadId);

    return this.enqueue({
      type: 'CREATE_NOTE',
      endpoint: `/api/leads/${leadId}/notes`,
      method: 'POST',
      payload: noteData,
      dependsOnTempId: isTemp ? leadId : undefined,
      meta: { entity: 'note', leadId },
    });
  }

  /**
   * Enfileira gravação nativa de áudio de reunião presencial de campo (Capacidade 6 - Mobile).
   */
  public async enqueueFieldMeetingAudio(
    payload: FieldMeetingAudioPayload,
    tempId?: string,
  ): Promise<OfflineQueueItem<FieldMeetingAudioPayload>> {
    const isTemp =
      payload.leadId &&
      (payload.leadId.startsWith('temp_') ||
        this.queue.some((q) => q.temporaryId === payload.leadId));

    const assignedTempId = tempId || generateTemporaryId('temp_meeting_audio');

    return this.enqueue<FieldMeetingAudioPayload>({
      type: 'FIELD_MEETING_AUDIO',
      endpoint: '/api/mobile/field-meetings/sync',
      method: 'POST',
      payload,
      temporaryId: assignedTempId,
      dependsOnTempId: isTemp ? payload.leadId : undefined,
      meta: { entity: 'field_meeting_audio', leadId: payload.leadId },
    });
  }

  /**
   * Resolve dependências de IDs temporários no endpoint e payload antes da requisição.
   */
  private resolveTemporaryIds(item: OfflineQueueItem): {
    resolvedEndpoint: string;
    resolvedPayload: unknown;
    blocked: boolean;
    blockReason?: string;
  } {
    let endpoint = item.endpoint;
    let payload = item.payload;

    // Se o item depende de um ID temporário, verifica se já foi resolvido
    if (item.dependsOnTempId) {
      const realId = this.idMap.get(item.dependsOnTempId);
      if (realId) {
        endpoint = endpoint.replaceAll(item.dependsOnTempId, realId);
      } else {
        // Verifica se a operação pai falhou definitivamente
        const parent = this.queue.find((q) => q.temporaryId === item.dependsOnTempId);
        if (parent && parent.status === 'failed') {
          return {
            resolvedEndpoint: endpoint,
            resolvedPayload: payload,
            blocked: true,
            blockReason: 'Operação cancelada: a criação da entidade dependente falhou.',
          };
        }
        // Ainda está pendente ou não resolvido
        return {
          resolvedEndpoint: endpoint,
          resolvedPayload: payload,
          blocked: true,
          blockReason: 'Aguardando sincronização da entidade dependente.',
        };
      }
    }

    // Varre outros IDs mapeados conhecidos que possam estar no endpoint
    for (const [tempId, realId] of this.idMap.entries()) {
      if (endpoint.includes(tempId)) {
        endpoint = endpoint.replaceAll(tempId, realId);
      }
    }

    // Se o payload for um objeto, substitui referências a IDs temporários
    if (payload && typeof payload === 'object') {
      const serialized = JSON.stringify(payload);
      let replaced = serialized;
      for (const [tempId, realId] of this.idMap.entries()) {
        if (replaced.includes(tempId)) {
          replaced = replaced.replaceAll(tempId, realId);
        }
      }
      try {
        payload = JSON.parse(replaced);
      } catch {
        // Mantém payload original se parse falhar
      }
    }

    return {
      resolvedEndpoint: endpoint,
      resolvedPayload: payload,
      blocked: false,
    };
  }

  /**
   * Executa a sincronização completa da fila pendente contra o backend.
   */
  public async syncQueue(): Promise<SyncResult> {
    if (!this.isOnline()) {
      const pendingCount = this.getPendingCount();
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        remaining: pendingCount,
        errors: [],
      };
    }

    if (this.syncLock) {
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        remaining: this.getPendingCount(),
        errors: [],
      };
    }

    this.syncLock = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    const pendingItems = this.queue.filter(
      (item) => item.status === 'pending' || item.status === 'syncing',
    );

    this.emit({ type: 'sync_start', count: pendingItems.length });

    try {
      for (const item of pendingItems) {
        // Verifica se a conexão caiu no meio do processo
        if (!this.isOnline()) {
          break;
        }

        const { resolvedEndpoint, resolvedPayload, blocked, blockReason } =
          this.resolveTemporaryIds(item);

        if (blocked) {
          if (blockReason?.includes('Operação cancelada')) {
            item.status = 'failed';
            item.lastError = blockReason;
            failed++;
            errors.push({ id: item.id, error: blockReason });
            this.emit({ type: 'item_failed', item, error: new Error(blockReason) });
          }
          continue;
        }

        item.status = 'syncing';
        processed++;

        try {
          const response = await this.apiClient.request({
            endpoint: resolvedEndpoint,
            method: item.method,
            body: resolvedPayload,
          });

          item.status = 'synced';
          succeeded++;

          // Extrai o ID retornado caso tenha sido gerado no backend
          const realId = extractEntityId(response);
          if (item.temporaryId && realId) {
            this.idMap.set(item.temporaryId, realId);
            this.persistIdMap();
          }

          this.emit({ type: 'item_synced', item, response });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          item.lastError = error.message;

          if (isTransientNetworkError(error)) {
            item.retryCount++;
            if (item.retryCount >= item.maxRetries) {
              item.status = 'failed';
              failed++;
              errors.push({ id: item.id, error: error.message });
            } else {
              item.status = 'pending';
            }
            this.emit({ type: 'item_failed', item, error });
            // Erro de rede: interrompe lote para evitar consumir retries enquanto a conexão estiver instável
            break;
          } else {
            // Erro permanente da requisição (ex.: 400 Bad Request / 422 validação)
            item.status = 'failed';
            failed++;
            errors.push({ id: item.id, error: error.message });
            this.emit({ type: 'item_failed', item, error });
          }
        }
      }
    } finally {
      // Remove operações sincronizadas com sucesso da fila ativa
      this.queue = this.queue.filter((item) => item.status !== 'synced');
      this.persistQueue();
      this.syncLock = false;
    }

    const remaining = this.getPendingCount();
    const result: SyncResult = {
      processed,
      succeeded,
      failed,
      remaining,
      errors,
    };

    this.emit({ type: 'sync_completed', result });
    return result;
  }

  /**
   * Alias de conveniência para syncQueue()
   */
  public async sync(): Promise<SyncResult> {
    return this.syncQueue();
  }

  /**
   * Reinicia itens que falharam de volta para 'pending' e reexecuta sincronização.
   */
  public async retryFailed(): Promise<SyncResult> {
    for (const item of this.queue) {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.retryCount = 0;
        item.lastError = undefined;
      }
    }
    this.persistQueue();
    return this.syncQueue();
  }

  /**
   * Limpa todas as operações e mapeamentos da fila offline.
   */
  public async clearQueue(): Promise<void> {
    this.queue = [];
    this.idMap.clear();
    void this.storage.removeItem(this.storageKey);
    void this.storage.removeItem(this.idMapKey);
    this.emit({ type: 'queue_cleared' });
  }

  /**
   * Retorna cópia da fila inteira.
   */
  public getQueue(): OfflineQueueItem[] {
    return [...this.queue];
  }

  /**
   * Retorna itens com status 'pending'.
   */
  public getPendingItems(): OfflineQueueItem[] {
    return this.queue.filter((item) => item.status === 'pending');
  }

  /**
   * Retorna itens com status 'failed'.
   */
  public getFailedItems(): OfflineQueueItem[] {
    return this.queue.filter((item) => item.status === 'failed');
  }

  /**
   * Retorna quantidade de itens pendentes de envio.
   */
  public getPendingCount(): number {
    return this.queue.filter((item) => item.status === 'pending' || item.status === 'syncing')
      .length;
  }

  /**
   * Retorna estatísticas agregadas de sincronização.
   */
  public getStats(): OfflineSyncStats {
    return {
      total: this.queue.length,
      pending: this.queue.filter((i) => i.status === 'pending').length,
      syncing: this.queue.filter((i) => i.status === 'syncing').length,
      failed: this.queue.filter((i) => i.status === 'failed').length,
      isOnline: this.isOnline(),
    };
  }

  /**
   * Registra listener para eventos do ciclo de vida de sincronização.
   */
  public subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Libera recursos e listeners associados.
   */
  public destroy(): void {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
    }
    this.networkProvider.destroy();
    this.listeners.clear();
  }
}

/**
 * Instância singleton exportada para uso geral na aplicação.
 */
export const offlineSyncService = new OfflineSyncService();
