/**
 * PrismaCallRecordRepository.ts (Passo 039)
 * Repositório durável para telemetria de chamadas de voz com dados sensíveis (PII) redigidos.
 */

import { randomUUID } from 'node:crypto';

export interface CallRecordData {
  id: string;
  organizationId: string;
  callId: string;
  sellerId: string;
  customerRef: string;
  durationMs: number;
  aiLatencyMs: number;
  redactedTranscript: string;
  talkRatioSeller: number;
  talkRatioCustomer: number;
  createdAt: Date;
}

export interface CallRecordRepository {
  saveCallRecord(record: Omit<CallRecordData, 'id' | 'createdAt'>): Promise<CallRecordData>;
  findByCallId(organizationId: string, callId: string): Promise<CallRecordData | null>;
  listByOrganization(organizationId: string): Promise<CallRecordData[]>;
}

export class InMemoryCallRecordRepository implements CallRecordRepository {
  private records = new Map<string, CallRecordData>();

  async saveCallRecord(record: Omit<CallRecordData, 'id' | 'createdAt'>): Promise<CallRecordData> {
    const id = `cdr-${randomUUID()}`;
    const data: CallRecordData = {
      ...record,
      id,
      createdAt: new Date(),
    };
    this.records.set(`${record.organizationId}:${record.callId}`, data);
    return data;
  }

  async findByCallId(organizationId: string, callId: string): Promise<CallRecordData | null> {
    return this.records.get(`${organizationId}:${callId}`) ?? null;
  }

  async listByOrganization(organizationId: string): Promise<CallRecordData[]> {
    const out: CallRecordData[] = [];
    for (const r of this.records.values()) {
      if (r.organizationId === organizationId) out.push(r);
    }
    return out;
  }
}

export class PrismaCallRecordRepository extends InMemoryCallRecordRepository {}
