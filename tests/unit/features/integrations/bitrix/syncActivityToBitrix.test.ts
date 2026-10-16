import { describe, it, expect, vi, beforeEach } from 'vitest';

const bitrixConnectionFindFirst = vi.fn();
const leadFindFirst = vi.fn();

vi.mock('../../../../../src/lib/prisma.js', () => ({
  prisma: {
    bitrixConnection: {
      findFirst: (...args: unknown[]) => bitrixConnectionFindFirst(...args),
    },
    lead: {
      findFirst: (...args: unknown[]) => leadFindFirst(...args),
    },
  },
}));

const callBitrixMock = vi.fn();
const getConnectionWebhookUrlMock = vi.fn();

vi.mock('../../../../../src/features/integrations/bitrix/service/client.js', () => ({
  callBitrix: (...args: unknown[]) => callBitrixMock(...args),
  getConnectionWebhookUrl: (...args: unknown[]) => getConnectionWebhookUrlMock(...args),
}));

const { syncActivityToBitrix } = await import(
  '../../../../../src/features/integrations/bitrix/service/outboundSync.js'
);

describe('syncActivityToBitrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null silenciosamente se a organização não possui conexão Bitrix', async () => {
    bitrixConnectionFindFirst.mockResolvedValue(null);

    const result = await syncActivityToBitrix('org-1', 'lead-1', {
      type: 'call',
      subject: 'Ligação SDR',
    });

    expect(result).toBeNull();
    expect(callBitrixMock).not.toHaveBeenCalled();
  });

  it('retorna null se o lead não existe no banco', async () => {
    bitrixConnectionFindFirst.mockResolvedValue({ id: 'conn-1' });
    leadFindFirst.mockResolvedValue(null);

    const result = await syncActivityToBitrix('org-1', 'lead-1', {
      type: 'whatsapp',
      subject: 'Mensagem de Cadência',
    });

    expect(result).toBeNull();
    expect(callBitrixMock).not.toHaveBeenCalled();
  });

  it('retorna null se o lead ainda não tem vínculo no Bitrix (sem bitrixLeadId nem bitrixDealId)', async () => {
    bitrixConnectionFindFirst.mockResolvedValue({ id: 'conn-1' });
    leadFindFirst.mockResolvedValue({
      id: 'lead-1',
      bitrixLeadId: null,
      bitrixDealId: null,
      contact: { phone: '11988887777', whatsapp: '11988887777', email: 'lead@teste.com' },
    });

    const result = await syncActivityToBitrix('org-1', 'lead-1', {
      type: 'email',
      subject: 'E-mail de follow-up',
    });

    expect(result).toBeNull();
    expect(callBitrixMock).not.toHaveBeenCalled();
  });

  it('sincroniza atividade com OWNER_TYPE_ID = 1 quando o lead possui bitrixLeadId', async () => {
    bitrixConnectionFindFirst.mockResolvedValue({ id: 'conn-1', webhookUrl: 'https://bitrix.test/webhook/' });
    getConnectionWebhookUrlMock.mockResolvedValue('https://bitrix.test/webhook/');
    leadFindFirst.mockResolvedValue({
      id: 'lead-1',
      bitrixLeadId: 'b-lead-99',
      bitrixDealId: null,
      contact: { phone: '11988887777', whatsapp: '11988887777', email: 'lead@teste.com' },
    });
    callBitrixMock.mockResolvedValue({ result: 12345 });

    const result = await syncActivityToBitrix('org-1', 'lead-1', {
      type: 'call',
      subject: 'Ligação SDR: Conversa realizada',
      description: 'Estado: completed. Duração: 120s.',
      completed: true,
      direction: 'outbound',
      durationSeconds: 120,
    });

    expect(result).toEqual({ bitrixActivityId: 12345 });
    expect(callBitrixMock).toHaveBeenCalledWith(
      'https://bitrix.test/webhook/',
      'crm.activity.add',
      expect.objectContaining({
        fields: expect.objectContaining({
          OWNER_TYPE_ID: 1,
          OWNER_ID: 'b-lead-99',
          TYPE_ID: 2,
          SUBJECT: 'Ligação SDR: Conversa realizada',
          COMPLETED: 'Y',
          DIRECTION: 2,
          COMMUNICATIONS: [
            {
              VALUE: '11988887777',
              TYPE: 'PHONE',
            },
          ],
        }),
      }),
    );
  });

  it('sincroniza atividade com OWNER_TYPE_ID = 2 quando o lead possui bitrixDealId', async () => {
    bitrixConnectionFindFirst.mockResolvedValue({ id: 'conn-1' });
    getConnectionWebhookUrlMock.mockResolvedValue('https://bitrix.test/webhook/');
    leadFindFirst.mockResolvedValue({
      id: 'lead-1',
      bitrixLeadId: null,
      bitrixDealId: 'b-deal-55',
      contact: { email: 'contato@teste.com' },
    });
    callBitrixMock.mockResolvedValue({ result: 67890 });

    const result = await syncActivityToBitrix('org-1', 'lead-1', {
      type: 'email',
      subject: 'Proposta comercial enviada',
      description: 'Segue anexo',
      completed: true,
      direction: 'outbound',
    });

    expect(result).toEqual({ bitrixActivityId: 67890 });
    expect(callBitrixMock).toHaveBeenCalledWith(
      'https://bitrix.test/webhook/',
      'crm.activity.add',
      expect.objectContaining({
        fields: expect.objectContaining({
          OWNER_TYPE_ID: 2,
          OWNER_ID: 'b-deal-55',
          TYPE_ID: 4,
          SUBJECT: 'Proposta comercial enviada',
          COMMUNICATIONS: [
            {
              VALUE: 'contato@teste.com',
              TYPE: 'EMAIL',
            },
          ],
        }),
      }),
    );
  });

  it('trata erros de API sem lançar exceção (retorna null)', async () => {
    bitrixConnectionFindFirst.mockResolvedValue({ id: 'conn-1' });
    getConnectionWebhookUrlMock.mockResolvedValue('https://bitrix.test/webhook/');
    leadFindFirst.mockResolvedValue({
      id: 'lead-1',
      bitrixLeadId: 'b-lead-1',
      contact: {},
    });
    callBitrixMock.mockRejectedValue(new Error('Bitrix API 500'));

    const result = await syncActivityToBitrix('org-1', 'lead-1', {
      type: 'whatsapp',
      subject: 'Mensagem de cadência',
    });

    expect(result).toBeNull();
  });
});
