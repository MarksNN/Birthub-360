import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANONYMIZED_CONTACT_NAME } from '../../../../shared/services/dataSubjectErasure.service.js';
import {
  buildVoiceCadenceDispatcher,
  emailCadenceDispatcher,
  whatsAppCadenceDispatcher,
} from '../../../cadence/infra/dispatchers/CadenceDispatchers.js';
import {
  assertOptOutStatus,
  checkOptOutStatus,
  isOptOutKeyword,
  OptOutSuppressedError,
  recordContactOptOut,
} from '../optOutCheck.service.js';

describe('Opt-out Multicanal & LGPD (B-13 e §27)', () => {
  const ORG_A = 'org-tenant-a';
  const ORG_B = 'org-tenant-b';
  const CONTACT_ID = 'contact-123';
  const OTHER_CONTACT_ID = 'contact-999';

  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      contact: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      lead: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      optOutRecord: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'rec-1' }),
      },
    };
  });

  describe('isOptOutKeyword', () => {
    it.each([
      [' !?.#-_* SAIR *_-#.?! ', true],
      ['\t## Não Quero Mais!!\n', true],
      ['---opt-out---', true],
      ['stop, messages!', true],
      ['! .sair. !', false],
      ['sair! por favor', false],
      ['sair\tpor favor', false],
      ['sair; por favor', false],
      ['sair,', true],
      [',sair', false],
      ['!?.#-_*', false],
      ['\u00a0! SAIR !\u00a0', true],
    ])('preserva as regras de pontuação para %j', (text, expected) => {
      expect(isOptOutKeyword(text)).toBe(expected);
    });

    it('processa sequências adversariais de pontuação sem retrocesso quadrático', () => {
      const punctuation = '!'.repeat(50_000);
      const started = performance.now();

      expect(isOptOutKeyword(`sair${punctuation}a`)).toBe(false);
      expect(isOptOutKeyword(`${punctuation}sair${punctuation}`)).toBe(true);
      expect(isOptOutKeyword(punctuation)).toBe(false);
      expect(performance.now() - started).toBeLessThan(1000);
    });

    it('reconhece palavras-chave em maiúsculas, minúsculas e com pontuação', () => {
      const validCases = [
        'SAIR',
        'sair',
        'sair!',
        'SAIR.',
        'Sair, por favor',
        'sair por favor',
        'PARAR',
        'parar',
        'STOP',
        'stop.',
        'CANCELAR',
        'cancelar',
        'CANCELAR!',
        'cancela',
        'descadastro',
        'DESCADASTRO',
        'descadastrar',
        'UNSUBSCRIBE',
        'unsubscribe',
        'optout',
        'OPT-OUT',
        'não quero mais',
        'nao quero mais',
        'remover meu numero',
        'remover meu número',
        'fim',
      ];

      for (const text of validCases) {
        expect(isOptOutKeyword(text), `Deveria reconhecer: "${text}"`).toBe(true);
      }
    });

    it('não confunde mensagens normais com solicitação de opt-out', () => {
      const negativeCases = [
        'Olá, tudo bem?',
        'Qual o valor do serviço?',
        'Pode me ligar amanhã?',
        'Gostei muito da proposta',
        'Vamos agendar a reunião',
        'Sim, confirmo a reunião',
        null,
        undefined,
        '',
      ];

      for (const text of negativeCases) {
        expect(isOptOutKeyword(text), `NÃO deveria reconhecer: "${text}"`).toBe(false);
      }
    });
  });

  describe('checkOptOutStatus - Validação de Entrada e Isolamento Multi-tenant', () => {
    it('bloqueia com OPT_OUT_SUPPRESSED quando parâmetros obrigatórios estão ausentes', async () => {
      const res1 = await checkOptOutStatus('', 'whatsapp', ORG_A, { prisma: mockPrisma });
      expect(res1.blocked).toBe(true);
      expect(res1.code).toBe('OPT_OUT_SUPPRESSED');
      expect(res1.matchedBy).toBe('missing_params');

      const res2 = await checkOptOutStatus(CONTACT_ID, 'whatsapp', '', { prisma: mockPrisma });
      expect(res2.blocked).toBe(true);
      expect(res2.code).toBe('OPT_OUT_SUPPRESSED');
      expect(res2.matchedBy).toBe('missing_params');
    });

    it('isola por tenant e rejeita contato que não pertence à organização solicitante', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const res = await checkOptOutStatus(CONTACT_ID, 'whatsapp', ORG_B, { prisma: mockPrisma });

      expect(res.blocked).toBe(true);
      expect(res.code).toBe('OPT_OUT_SUPPRESSED');
      expect(res.matchedBy).toBe('tenant_mismatch');
      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith({
        where: { id: CONTACT_ID, organizationId: ORG_B },
        select: expect.any(Object),
      });
    });
  });

  describe('checkOptOutStatus - Exercício de Direito LGPD Art. 18 (Anonimização)', () => {
    it('bloqueia instantaneamente com OPT_OUT_SUPPRESSED quando o titular está anonimizado', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: ANONYMIZED_CONTACT_NAME,
        email: null,
        phone: null,
        whatsapp: null,
        deletedAt: null,
        customFields: {},
        leads: [],
      });

      const res = await checkOptOutStatus(CONTACT_ID, 'whatsapp', ORG_A, { prisma: mockPrisma });

      expect(res.blocked).toBe(true);
      expect(res.allowed).toBe(false);
      expect(res.code).toBe('OPT_OUT_SUPPRESSED');
      expect(res.matchedBy).toBe('anonymized');
      expect(res.reason).toContain('LGPD Art. 18');
    });

    it('bloqueia instantaneamente com OPT_OUT_SUPPRESSED quando o contato está com deletedAt marcado', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: 'Maria Souza',
        email: 'maria@empresa.com',
        phone: '+5511999998888',
        whatsapp: '+5511999998888',
        deletedAt: new Date(),
        customFields: {},
        leads: [],
      });

      const res = await checkOptOutStatus(CONTACT_ID, 'email', ORG_A, { prisma: mockPrisma });

      expect(res.blocked).toBe(true);
      expect(res.code).toBe('OPT_OUT_SUPPRESSED');
      expect(res.matchedBy).toBe('anonymized');
    });
  });

  describe('checkOptOutStatus - Flags de Cadastro no Contato e Leads', () => {
    it('bloqueia quando contact.customFields tem optOut=true global', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: 'Carlos Oliveira',
        email: 'carlos@empresa.com',
        phone: '+5511988887777',
        whatsapp: '+5511988887777',
        deletedAt: null,
        customFields: { optOut: true },
        leads: [],
      });

      const res = await checkOptOutStatus(CONTACT_ID, 'whatsapp', ORG_A, { prisma: mockPrisma });

      expect(res.blocked).toBe(true);
      expect(res.code).toBe('OPT_OUT_SUPPRESSED');
      expect(res.matchedBy).toBe('contact_flag');
    });

    it('respeita flag específico de canal no contato (bloqueia WhatsApp mas libera E-mail)', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: 'Carlos Oliveira',
        email: 'carlos@empresa.com',
        phone: '+5511988887777',
        whatsapp: '+5511988887777',
        deletedAt: null,
        customFields: { optOutWhatsApp: true },
        leads: [],
      });

      const resWhatsApp = await checkOptOutStatus(CONTACT_ID, 'whatsapp', ORG_A, {
        prisma: mockPrisma,
      });
      expect(resWhatsApp.blocked).toBe(true);
      expect(resWhatsApp.code).toBe('OPT_OUT_SUPPRESSED');

      const resEmail = await checkOptOutStatus(CONTACT_ID, 'email', ORG_A, { prisma: mockPrisma });
      expect(resEmail.blocked).toBe(false);
      expect(resEmail.code).toBeNull();
    });

    it('bloqueia canal se algum lead vinculado tiver flag de opt-out', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: 'Joana Prado',
        email: 'joana@empresa.com',
        phone: '+5511977776666',
        whatsapp: '+5511977776666',
        deletedAt: null,
        customFields: {},
        leads: [{ id: 'lead-01', customFields: { optOutWhatsApp: true } }],
      });

      const res = await checkOptOutStatus(CONTACT_ID, 'whatsapp', ORG_A, { prisma: mockPrisma });

      expect(res.blocked).toBe(true);
      expect(res.code).toBe('OPT_OUT_SUPPRESSED');
      expect(res.matchedBy).toBe('lead_flag');
    });
  });

  describe('checkOptOutStatus - Consulta na Tabela Unificada OptOutRecord', () => {
    it('bloqueia envio quando OptOutRecord casa por e-mail com escopo global', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: 'Lucas Martins',
        email: 'lucas@empresa.com',
        phone: null,
        whatsapp: null,
        deletedAt: null,
        customFields: {},
        leads: [],
      });

      mockPrisma.optOutRecord.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          organizationId: ORG_A,
          scope: 'Global',
          email: 'lucas@empresa.com',
          reason: 'Titular solicitou SAIR em landing page',
          evidence: 'Pedido formulário opt-out',
          originChannel: 'web',
        },
      ]);

      const res = await checkOptOutStatus(CONTACT_ID, 'email', ORG_A, { prisma: mockPrisma });

      expect(res.blocked).toBe(true);
      expect(res.code).toBe('OPT_OUT_SUPPRESSED');
      expect(res.matchedBy).toBe('opt_out_record');
      expect(res.reason).toBe('Titular solicitou SAIR em landing page');
    });

    it('bloqueia envio quando OptOutRecord casa por telefone normalizado E.164', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: 'Lucas Martins',
        email: null,
        phone: '(11) 98888-7777',
        whatsapp: '(11) 98888-7777',
        deletedAt: null,
        customFields: {},
        leads: [],
      });

      mockPrisma.optOutRecord.findMany.mockResolvedValue([
        {
          id: 'rec-2',
          organizationId: ORG_A,
          scope: 'WhatsApp',
          phoneE164: '+5511988887777',
          reason: 'Enviou STOP no WhatsApp',
          evidence: 'STOP',
          originChannel: 'whatsapp',
        },
      ]);

      const res = await checkOptOutStatus(CONTACT_ID, 'whatsapp', ORG_A, { prisma: mockPrisma });

      expect(res.blocked).toBe(true);
      expect(res.code).toBe('OPT_OUT_SUPPRESSED');
      expect(res.matchedBy).toBe('opt_out_record');
    });

    it('permite envio quando nenhum critério de bloqueio foi satisfeito', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: 'Cliente Elegível',
        email: 'elegivel@empresa.com',
        phone: '+5511988881111',
        whatsapp: '+5511988881111',
        deletedAt: null,
        customFields: {},
        leads: [],
      });

      mockPrisma.optOutRecord.findMany.mockResolvedValue([]);

      const res = await checkOptOutStatus(CONTACT_ID, 'email', ORG_A, { prisma: mockPrisma });

      expect(res.blocked).toBe(false);
      expect(res.allowed).toBe(true);
      expect(res.code).toBeNull();
    });
  });

  describe('assertOptOutStatus e throwOnBlocked', () => {
    it('lança OptOutSuppressedError com código OPT_OUT_SUPPRESSED quando bloqueado', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: ANONYMIZED_CONTACT_NAME,
        email: null,
        phone: null,
        whatsapp: null,
        deletedAt: null,
        customFields: {},
        leads: [],
      });

      await expect(
        assertOptOutStatus(CONTACT_ID, 'whatsapp', ORG_A, { prisma: mockPrisma }),
      ).rejects.toThrow(OptOutSuppressedError);

      try {
        await assertOptOutStatus(CONTACT_ID, 'whatsapp', ORG_A, { prisma: mockPrisma });
      } catch (err: any) {
        expect(err.code).toBe('OPT_OUT_SUPPRESSED');
        expect(err.statusCode).toBe(403);
      }
    });

    it('não lança erro quando o envio é liberado', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        name: 'Cliente Livre',
        email: 'livre@empresa.com',
        deletedAt: null,
        customFields: {},
        leads: [],
      });
      mockPrisma.optOutRecord.findMany.mockResolvedValue([]);

      await expect(
        assertOptOutStatus(CONTACT_ID, 'email', ORG_A, { prisma: mockPrisma }),
      ).resolves.toBeUndefined();
    });
  });

  describe('recordContactOptOut', () => {
    it('atualiza contact, leads associados e grava na tabela unificada de opt-out', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        organizationId: ORG_A,
        email: 'contato@empresa.com',
        phone: '+5511999998888',
        whatsapp: '+5511999998888',
        customFields: { foo: 'bar' },
        leads: [{ id: 'lead-1', customFields: {} }],
      });

      await recordContactOptOut({
        organizationId: ORG_A,
        contactId: CONTACT_ID,
        scope: 'global',
        originChannel: 'whatsapp',
        reason: 'Solicitação de cancelamento',
        evidence: 'CANCELAR',
        actorUserId: 'user-admin',
        prisma: mockPrisma,
      });

      // 1. Atualizou Contact com flags de opt-out
      expect(mockPrisma.contact.update).toHaveBeenCalledWith({
        where: { id: CONTACT_ID },
        data: {
          customFields: expect.objectContaining({
            foo: 'bar',
            optOut: true,
            optOutWhatsApp: true,
            optOutEmail: true,
            optOutVoice: true,
            optOutReason: 'Solicitação de cancelamento',
          }),
        },
      });

      // 2. Atualizou Lead vinculado
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: {
          customFields: expect.objectContaining({
            optOut: true,
            optOutWhatsApp: true,
          }),
        },
      });

      // 3. Gravou OptOutRecord unificado
      expect(mockPrisma.optOutRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: ORG_A,
          scope: 'Global',
          leadId: 'lead-1',
          email: 'contato@empresa.com',
          phoneE164: '+5511999998888',
          originChannel: 'whatsapp',
          reason: 'Solicitação de cancelamento',
          evidence: 'CANCELAR',
          requestedBy: 'user-admin',
        }),
      });
    });
  });

  describe('Cadence Dispatchers Pre-send Interception', () => {
    it('whatsAppCadenceDispatcher suprime envio quando contato tem opt-out registrado com OPT_OUT_SUPPRESSED', async () => {
      // Mock prisma via vi.spyOn em lib/prisma
      const prismaModule = await import('../../../../lib/prisma.js');
      vi.spyOn(prismaModule.prisma.lead, 'findFirst').mockResolvedValue({
        id: 'lead-run-1',
        contactId: CONTACT_ID,
      } as any);

      vi.spyOn(prismaModule.prisma.contact, 'findFirst').mockResolvedValue({
        id: CONTACT_ID,
        name: ANONYMIZED_CONTACT_NAME,
        deletedAt: null,
        customFields: {},
        leads: [],
      } as any);

      const result = await whatsAppCadenceDispatcher.dispatch(
        { order: 1, channel: 'whatsapp', delayHoursFromPrevious: 0, templateRef: 'Oi' },
        {
          id: 'run-1',
          organizationId: ORG_A,
          leadId: 'lead-run-1',
          sequenceId: 'seq-1',
          status: 'active',
          currentTouchOrder: 1,
          startedAt: new Date(),
          attempts: [],
        },
      );

      expect(result.result).toBe('failed');
      expect(result.error).toContain('OPT_OUT_SUPPRESSED');
    });

    it('emailCadenceDispatcher suprime envio quando contato tem opt-out registrado com OPT_OUT_SUPPRESSED', async () => {
      const prismaModule = await import('../../../../lib/prisma.js');
      vi.spyOn(prismaModule.prisma.lead, 'findFirst').mockResolvedValue({
        id: 'lead-run-2',
        contactId: CONTACT_ID,
      } as any);

      vi.spyOn(prismaModule.prisma.contact, 'findFirst').mockResolvedValue({
        id: CONTACT_ID,
        name: 'Maria Bloqueada',
        email: 'maria@bloqueada.com',
        deletedAt: null,
        customFields: { optOut: true },
        leads: [],
      } as any);

      const result = await emailCadenceDispatcher.dispatch(
        { order: 1, channel: 'email', delayHoursFromPrevious: 0, templateRef: 'Assunto\n\nCorpo' },
        {
          id: 'run-2',
          organizationId: ORG_A,
          leadId: 'lead-run-2',
          sequenceId: 'seq-2',
          status: 'active',
          currentTouchOrder: 1,
          startedAt: new Date(),
          attempts: [],
        },
      );

      expect(result.result).toBe('failed');
      expect(result.error).toContain('OPT_OUT_SUPPRESSED');
    });

    it('buildVoiceCadenceDispatcher suprime envio quando contato tem opt-out registrado com OPT_OUT_SUPPRESSED', async () => {
      const prismaModule = await import('../../../../lib/prisma.js');
      vi.spyOn(prismaModule.prisma.lead, 'findFirst').mockResolvedValue({
        id: 'lead-run-3',
        contactId: CONTACT_ID,
      } as any);

      vi.spyOn(prismaModule.prisma.contact, 'findFirst').mockResolvedValue({
        id: CONTACT_ID,
        name: 'Pedro Voz',
        phone: '+5511999998888',
        deletedAt: null,
        customFields: { optOutVoice: true },
        leads: [],
      } as any);

      const mockVoicePort = {
        callLead: vi.fn(),
      };
      const voiceDispatcher = buildVoiceCadenceDispatcher(mockVoicePort);

      const result = await voiceDispatcher.dispatch(
        { order: 1, channel: 'voice', delayHoursFromPrevious: 0 },
        {
          id: 'run-3',
          organizationId: ORG_A,
          leadId: 'lead-run-3',
          sequenceId: 'seq-3',
          status: 'active',
          currentTouchOrder: 1,
          startedAt: new Date(),
          attempts: [],
        },
      );

      expect(result.result).toBe('failed');
      expect(result.error).toContain('OPT_OUT_SUPPRESSED');
      expect(mockVoicePort.callLead).not.toHaveBeenCalled();
    });
  });
});
