/**
 * syncLeadFromBitrix.ts (Passo 054)
 * Ingestão de leads remotos do Bitrix24 com detecção de duplicidade e mapeamento de campos.
 */

export interface BitrixRawLead {
  ID: string | number;
  TITLE: string;
  NAME?: string;
  LAST_NAME?: string;
  STATUS_ID?: string;
  OPPORTUNITY?: string | number;
  DATE_MODIFY?: string;
}

export interface IngestedLeadResult {
  bitrixId: number;
  title: string;
  status: string;
  value: number;
  modifiedAt: Date;
  isNew: boolean;
}

export class BitrixLeadIngestionService {
  ingestLead(raw: BitrixRawLead, existingModifiedAt?: Date): IngestedLeadResult {
    const bitrixId = typeof raw.ID === 'number' ? raw.ID : Number.parseInt(raw.ID, 10);
    const modifiedAt = raw.DATE_MODIFY ? new Date(raw.DATE_MODIFY) : new Date();

    const isNew = !existingModifiedAt;

    return {
      bitrixId,
      title: raw.TITLE || 'Sem Título',
      status: raw.STATUS_ID || 'NEW',
      value: raw.OPPORTUNITY ? Number(raw.OPPORTUNITY) : 0,
      modifiedAt,
      isNew,
    };
  }
}

export const bitrixLeadIngestionService = new BitrixLeadIngestionService();
