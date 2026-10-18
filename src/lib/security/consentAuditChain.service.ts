import { createHash, randomUUID } from 'node:crypto';
import type {
  ConsentAuditEvent,
  IConsentAuditChainPort,
} from '../../shared/contracts/consentAudit.contract.js';
import { logger } from '../logger.js';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class ConsentAuditChainService implements IConsentAuditChainPort {
  // Ledger imutável em memória estruturado por tenant: organizationId -> ConsentAuditEvent[]
  private tenantChains = new Map<string, ConsentAuditEvent[]>();

  private calculateHash(event: Omit<ConsentAuditEvent, 'currentHash'>): string {
    const raw = [
      event.previousHash,
      event.id,
      event.organizationId,
      event.subjectRef,
      event.purpose,
      event.termsVersion,
      event.status,
      event.occurredAt,
      event.operatorUserId || '',
    ].join(':');

    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Registra um evento de consentimento na trilha criptográfica encadeada (Append-only).
   */
  async recordConsent(input: {
    organizationId: string;
    subjectRef: string;
    purpose: string;
    termsVersion: string;
    operatorUserId?: string;
    retentionDays?: number;
  }): Promise<ConsentAuditEvent> {
    if (!input.organizationId || input.organizationId.trim() === '') {
      throw new Error('Tenancy violation: ConsentAuditChain exige organizationId');
    }

    const chain = this.tenantChains.get(input.organizationId) || [];
    const previousHash = chain.length > 0 ? chain[chain.length - 1].currentHash : GENESIS_HASH;

    const id = `cst-${randomUUID()}`;
    const occurredAt = new Date().toISOString();

    const retentionUntil = input.retentionDays
      ? new Date(Date.now() + input.retentionDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const partialEvent: Omit<ConsentAuditEvent, 'currentHash'> = {
      id,
      organizationId: input.organizationId,
      subjectRef: input.subjectRef,
      purpose: input.purpose,
      termsVersion: input.termsVersion,
      previousHash,
      occurredAt,
      operatorUserId: input.operatorUserId,
      status: 'GRANTED',
      retentionUntil,
    };

    const currentHash = this.calculateHash(partialEvent);
    const event: ConsentAuditEvent = {
      ...partialEvent,
      currentHash,
    };

    chain.push(event);
    this.tenantChains.set(input.organizationId, chain);

    logger.info(
      {
        id: event.id,
        organizationId: event.organizationId,
        subjectRef: event.subjectRef,
        purpose: event.purpose,
        currentHash,
        chainLength: chain.length,
      },
      'ConsentAuditChain: Consentimento registrado e selado criptograficamente na cadeia',
    );

    return event;
  }

  /**
   * Registra a revogação formal de consentimento (Direito do Titular LGPD).
   */
  async revokeConsent(
    organizationId: string,
    subjectRef: string,
    reason: string,
    operatorUserId?: string,
  ): Promise<ConsentAuditEvent> {
    if (!organizationId) {
      throw new Error('Tenancy violation: ConsentAuditChain exige organizationId');
    }

    const chain = this.tenantChains.get(organizationId) || [];
    const previousHash = chain.length > 0 ? chain[chain.length - 1].currentHash : GENESIS_HASH;

    const id = `rev-${randomUUID()}`;
    const occurredAt = new Date().toISOString();

    const partialEvent: Omit<ConsentAuditEvent, 'currentHash'> = {
      id,
      organizationId,
      subjectRef,
      purpose: `REVOCATION: ${reason}`,
      termsVersion: 'REVOKED',
      previousHash,
      occurredAt,
      operatorUserId,
      status: 'REVOKED',
    };

    const currentHash = this.calculateHash(partialEvent);
    const event: ConsentAuditEvent = {
      ...partialEvent,
      currentHash,
    };

    chain.push(event);
    this.tenantChains.set(organizationId, chain);

    logger.warn(
      {
        id: event.id,
        organizationId,
        subjectRef,
        reason,
        currentHash,
      },
      'ConsentAuditChain: Consentimento REVOGADO com registro indelével na cadeia de blocos',
    );

    return event;
  }

  /**
   * Verifica a integridade completa da cadeia do tenant, recalculando cada hash.
   * Detecta qualquer tentativa de adulteração de registro anterior.
   */
  async verifyChainIntegrity(organizationId: string): Promise<{
    valid: boolean;
    totalRecords: number;
    brokenAtId?: string;
  }> {
    const chain = this.tenantChains.get(organizationId) || [];

    if (chain.length === 0) {
      return { valid: true, totalRecords: 0 };
    }

    let expectedPreviousHash = GENESIS_HASH;

    for (let i = 0; i < chain.length; i++) {
      const record = chain[i];

      // 1. O previousHash deve bater com o currentHash do registro anterior
      if (record.previousHash !== expectedPreviousHash) {
        logger.error(
          { organizationId, recordId: record.id, index: i },
          'ConsentAuditChain: Violação de integridade detectada! Elo anterior quebrado.',
        );
        return { valid: false, totalRecords: chain.length, brokenAtId: record.id };
      }

      // 2. O currentHash deve ser o hash criptográfico exato do conteúdo
      const { currentHash, ...content } = record;
      const recalculated = this.calculateHash(content);
      if (recalculated !== record.currentHash) {
        logger.error(
          { organizationId, recordId: record.id, recalculated, stored: record.currentHash },
          'ConsentAuditChain: Violação de integridade detectada! Hash recalculado divergente do armazenado.',
        );
        return { valid: false, totalRecords: chain.length, brokenAtId: record.id };
      }

      expectedPreviousHash = record.currentHash;
    }

    return { valid: true, totalRecords: chain.length };
  }

  getChain(organizationId: string): ConsentAuditEvent[] {
    return [...(this.tenantChains.get(organizationId) || [])];
  }

  clear(): void {
    this.tenantChains.clear();
  }
}

export const consentAuditChain = new ConsentAuditChainService();
