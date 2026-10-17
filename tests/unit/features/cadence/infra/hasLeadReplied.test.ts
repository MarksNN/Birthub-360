import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * CYC-003 (onda 26) — `hasLeadReplied` passou a enxergar réplica de e-mail além de WhatsApp
 * (`EmailMessage.direction === 'inbound'`, gravado só para réplicas genuínas pelo webhook de
 * e-mail de entrada). É o sinal que `advanceCadenceRun` usa para parar a cadência com o motivo
 * `lead-reply` (`src/features/cadence/domain/cadence.ts`) — sem esta checagem, uma cadência com
 * toques de e-mail nunca pararia sozinha por uma resposta que só chegou por esse canal.
 */

const whatsAppFindFirst = vi.fn();
const emailFindFirst = vi.fn();
const voiceCallFindFirst = vi.fn();

vi.mock('../../../../../src/lib/prisma.js', () => ({
  prisma: {
    whatsAppMessage: { findFirst: (...args: unknown[]) => whatsAppFindFirst(...args) },
    emailMessage: { findFirst: (...args: unknown[]) => emailFindFirst(...args) },
    voiceCallLog: { findFirst: (...args: unknown[]) => voiceCallFindFirst(...args) },
  },
}));

const { hasLeadReplied } = await import('../../../../../src/features/cadence/infra/hasLeadReplied');

beforeEach(() => {
  whatsAppFindFirst.mockResolvedValue(null);
  emailFindFirst.mockResolvedValue(null);
  voiceCallFindFirst.mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('hasLeadReplied', () => {
  it('false quando nenhum canal tem réplica inbound', async () => {
    await expect(hasLeadReplied('org-1', 'lead-1')).resolves.toBe(false);
  });

  it('true quando há réplica inbound de WhatsApp', async () => {
    whatsAppFindFirst.mockResolvedValue({ id: 'wa-1' });
    await expect(hasLeadReplied('org-1', 'lead-1')).resolves.toBe(true);
  });

  it('true quando há réplica inbound de e-mail, mesmo sem WhatsApp', async () => {
    emailFindFirst.mockResolvedValue({ id: 'email-1' });
    await expect(hasLeadReplied('org-1', 'lead-1')).resolves.toBe(true);
  });

  it('true quando há chamada de voz com conversa/atendimento completado', async () => {
    voiceCallFindFirst.mockResolvedValue({ id: 'call-1' });
    await expect(hasLeadReplied('org-1', 'lead-1')).resolves.toBe(true);
  });

  it('filtra por organizationId/leadId nas tabelas de mensagens e voz', async () => {
    await hasLeadReplied('org-1', 'lead-1');

    expect(whatsAppFindFirst).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', leadId: 'lead-1', direction: 'inbound' },
      select: { id: true },
    });
    expect(emailFindFirst).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', leadId: 'lead-1', direction: 'inbound' },
      select: { id: true },
    });
    expect(voiceCallFindFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        leadId: 'lead-1',
        outcome: { in: ['completed', 'conversa'] },
      },
      select: { id: true },
    });
  });
});

