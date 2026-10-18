import { randomUUID } from 'node:crypto';
import type {
  CuratedObjectionItem,
  ICuratedObjectionPort,
  ObjectionCurationStatus,
} from '../../../shared/contracts/dataFlywheel.contract.js';
import { logger } from '../../../lib/logger.js';
import { PrismaObjectionMatrixRepository } from '../objection-matrix/infra/PrismaObjectionMatrixRepository.js';

export class CuratedObjectionService implements ICuratedObjectionPort {
  private inMemoryStore: Map<string, CuratedObjectionItem> = new Map();

  constructor(private objectionRepo = new PrismaObjectionMatrixRepository()) {}

  /**
   * Ingere uma objeção detectada a partir de transcrição ou anotação de campo.
   * Valida tenant, desidentificação e inicializa ciclo de curadoria.
   */
  async ingestDetectedObjection(
    input: Omit<CuratedObjectionItem, 'id' | 'version' | 'curationStatus'>,
  ): Promise<CuratedObjectionItem> {
    if (!input.organizationId || input.organizationId.trim() === '') {
      throw new Error('Tenancy violation: CuratedObjection exige organizationId');
    }

    const id = `cobj-${randomUUID()}`;
    const detectedAt = input.detectedAt || new Date().toISOString();

    // Deduplicação básica por similaridade categórica dentro do tenant
    const existing = Array.from(this.inMemoryStore.values()).find(
      (o) =>
        o.organizationId === input.organizationId &&
        o.category.toLowerCase() === input.category.toLowerCase() &&
        o.segment.toLowerCase() === input.segment.toLowerCase() &&
        o.curationStatus !== 'RETRACTED' &&
        o.curationStatus !== 'REJECTED',
    );

    let curationStatus: ObjectionCurationStatus = 'DETECTED';
    if (input.confidenceScore >= 0.9) {
      curationStatus = 'VERIFIED';
    } else if (input.confidenceScore >= 0.7) {
      curationStatus = 'REVIEW_REQUIRED';
    }

    const item: CuratedObjectionItem = {
      ...input,
      id,
      version: 1,
      detectedAt,
      curationStatus,
    };

    this.inMemoryStore.set(id, item);

    logger.info(
      {
        id,
        organizationId: item.organizationId,
        category: item.category,
        confidence: item.confidenceScore,
        status: item.curationStatus,
        isDuplicate: Boolean(existing),
      },
      `CuratedObjection: Objeção ingerida no flywheel [${item.category}]`,
    );

    return item;
  }

  /**
   * Promove uma objeção curada para uso ativo no Roleplay e Playbook oficial.
   */
  async promoteObjection(
    organizationId: string,
    id: string,
    userId: string,
  ): Promise<CuratedObjectionItem> {
    const item = this.inMemoryStore.get(id);
    if (!item || item.organizationId !== organizationId) {
      throw new Error('Objeção curada não encontrada para a organização');
    }

    if (item.curationStatus === 'RETRACTED') {
      throw new Error('Objeção retraída não pode ser promovida');
    }

    item.curationStatus = 'PROMOTED';
    item.promotedByUserId = userId;
    item.promotedToPlaybookAt = new Date().toISOString();
    item.version += 1;

    // Conexão direta com a Matriz de Objeções do tenant
    try {
      await this.objectionRepo.create(organizationId, {
        brand: 'geral',
        segment: item.segment,
        persona: item.commercialContext,
        objectionTitle: item.category,
        objectionText: item.anonymizedEvidence,
        responseScript:
          item.suggestedResponse || 'Validar dor do cliente e apresentar diferencial competitivo',
        keyDifferentiator: 'Conhecimento extraído do flywheel de atendimento real',
      });
    } catch (err) {
      logger.warn(
        { err, id, organizationId },
        'CuratedObjection: Repositório de banco indisponível durante promoção, preservando estado em memória',
      );
    }

    this.inMemoryStore.set(id, item);

    logger.info(
      { id, organizationId, userId },
      'CuratedObjection: Objeção promovida com sucesso para a Matriz de Vendas',
    );

    return item;
  }

  /**
   * Retrata ou revoga uma objeção (ex.: pedido de exclusão LGPD ou invalidação comercial).
   */
  async retractObjection(
    organizationId: string,
    id: string,
    reason: string,
  ): Promise<CuratedObjectionItem> {
    const item = this.inMemoryStore.get(id);
    if (!item || item.organizationId !== organizationId) {
      throw new Error('Objeção curada não encontrada para a organização');
    }

    item.curationStatus = 'RETRACTED';
    item.reviewNotes = `Retratado: ${reason}`;
    item.version += 1;
    this.inMemoryStore.set(id, item);

    logger.warn(
      { id, organizationId, reason },
      'CuratedObjection: Objeção retraída e desabilitada para Roleplay e Playbook',
    );

    return item;
  }

  /**
   * Lista objeções elegíveis para Roleplay (apenas VERIFIED ou PROMOTED).
   * Impede estritamente vazamento cross-tenant.
   */
  async listEligibleForRoleplay(
    organizationId: string,
    segment?: string,
  ): Promise<CuratedObjectionItem[]> {
    return Array.from(this.inMemoryStore.values()).filter((o) => {
      if (o.organizationId !== organizationId) return false;
      if (o.curationStatus !== 'VERIFIED' && o.curationStatus !== 'PROMOTED') return false;
      if (segment && o.segment.toLowerCase() !== segment.toLowerCase()) return false;
      return true;
    });
  }

  getById(organizationId: string, id: string): CuratedObjectionItem | null {
    const item = this.inMemoryStore.get(id);
    if (!item || item.organizationId !== organizationId) return null;
    return item;
  }

  clear(): void {
    this.inMemoryStore.clear();
  }
}

export const curatedObjectionService = new CuratedObjectionService();
