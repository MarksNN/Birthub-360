import { describe, expect, it, vi, beforeEach } from 'vitest';
import { domainEventMesh } from '../../../src/lib/queue/domainEventMesh.service.js';
import { persistWhatsAppMessage } from '../../../src/features/integrations/whatsapp/whatsappMessage.service.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => {
  return {
    prisma: {
      whatsAppMessage: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      lead: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      timelineEvent: {
        create: vi.fn().mockResolvedValue({ id: 'tl-1' }),
      },
    },
    withRlsContext: vi.fn((fn: any) => fn({ $queryRaw: vi.fn().mockResolvedValue([]) })),
  };
});

vi.mock('../../../src/lib/queue/whatsappSignal.worker.js', () => ({
  scheduleConversationAnalysis: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/lib/queue/domainEventMesh.service.js', () => {
  return {
    domainEventMesh: {
      publish: vi.fn().mockResolvedValue({ eventId: 'evt-test-123' }),
    },
  };
});

describe('Sincronização de Webhooks & domainEventMesh (Opção 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publica sinal de engajamento no domainEventMesh ao persistir mensagem WhatsApp', async () => {
    vi.mocked(prisma.whatsAppMessage.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.whatsAppMessage.create).mockResolvedValue({ id: 'msg-1' } as any);
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: 'lead-123',
      organizationId: 'org-tenant-1',
      customFields: {},
    } as any);

    await persistWhatsAppMessage({
      organizationId: 'org-tenant-1',
      waMessageId: 'wam-999',
      direction: 'inbound',
      remoteJid: '5511999998888@s.whatsapp.net',
      body: 'Gostaria de agendar a demonstração da plataforma.',
    });

    expect(prisma.whatsAppMessage.create).toHaveBeenCalled();
  });
});
