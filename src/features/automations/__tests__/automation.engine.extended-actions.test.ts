import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../lib/prisma.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import { automationEngine, PermanentAutomationError } from '../automation.engine.js';
import { cadenceIntegrationService } from '../cadenceIntegration.service.js';

vi.mock('../../../lib/queue/redis.js', () => ({
  connection: {},
  queuesEnabled: false,
}));

vi.mock('../automation-idempotency.service.js', () => ({
  buildTriggerIdempotencyKey: () => 'test-idemp-key',
  claimAutomationTrigger: vi.fn().mockResolvedValue('claimed'),
}));

vi.mock('../automation-history.service.js', () => ({
  automationHistoryService: {
    record: vi.fn().mockResolvedValue({ id: 'hist-1' }),
  },
}));

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    automation: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    lead: {
      update: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../../lib/queue/domainEventMesh.service.js', () => ({
  domainEventMesh: {
    publish: vi.fn().mockResolvedValue({ eventId: 'evt-1' }),
  },
}));

describe('AutomationEngine — Extended Actions (P3.1 & P3.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Chamar webhook externo', () => {
    it('dispara fetch com URL, headers e body renderizados', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      vi.stubGlobal('fetch', mockFetch);

      const automation = {
        id: 'auto-1',
        name: 'Disparar Webhook',
        action: 'Chamar webhook externo',
        actionConfig: {
          url: 'https://api.empresa.com/webhook/{{status}}',
          method: 'POST',
          secret: 'token-secreto-123',
          body: {
            lead: '{{leadId}}',
            fase: '{{status}}',
          },
        },
      };

      const event = {
        organizationId: 'org-test-1',
        trigger: 'Lead mudou de status' as const,
        entity: 'Lead' as const,
        entityId: 'lead-999',
        data: { leadId: 'lead-999', status: 'Qualificado' },
      };

      await (automationEngine as any).runAction(automation, event);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.empresa.com/webhook/Qualificado');
      expect(options.method).toBe('POST');
      expect(options.headers['x-automation-secret']).toBe('token-secreto-123');

      vi.unstubAllGlobals();
    });

    it('lança PermanentAutomationError quando url está vazia', async () => {
      const automation = {
        id: 'auto-1',
        name: 'Disparar Webhook Inválido',
        action: 'Chamar webhook externo',
        actionConfig: {},
      };

      const event = {
        organizationId: 'org-test-1',
        trigger: 'Lead criado' as const,
        entity: 'Lead' as const,
        entityId: 'lead-1',
        data: {},
      };

      await expect((automationEngine as any).runAction(automation, event)).rejects.toThrow(
        PermanentAutomationError,
      );
    });
  });

  describe('Mover para outra etapa de cadência (P3.4)', () => {
    it('delega para cadenceIntegrationService com parâmetros corretos', async () => {
      const spy = vi.spyOn(cadenceIntegrationService, 'executeCadenceAction').mockResolvedValue({
        success: true,
        action: 'move_to_step',
        leadId: 'lead-100',
        cadenceId: 'cad-enterprise',
        details: { currentStep: 2 },
      });

      const automation = {
        id: 'auto-2',
        name: 'Avançar Cadência',
        action: 'Mover para outra etapa de cadência',
        actionConfig: {
          cadenceId: 'cad-enterprise',
          action: 'move_to_step',
          stepIndex: 2,
        },
      };

      const event = {
        organizationId: 'org-1',
        trigger: 'Atividade concluída' as const,
        entity: 'Lead' as const,
        entityId: 'lead-100',
        data: {},
      };

      await (automationEngine as any).runAction(automation, event);

      expect(spy).toHaveBeenCalledWith('org-1', 'lead-100', {
        cadenceId: 'cad-enterprise',
        action: 'move_to_step',
        stepIndex: 2,
      });

      spy.mockRestore();
    });
  });

  describe('Atualizar campo customizado', () => {
    it('atualiza campo em Lead via Prisma com template renderizado', async () => {
      const automation = {
        id: 'auto-3',
        name: 'Atualizar Campo',
        action: 'Atualizar campo customizado',
        actionConfig: {
          entity: 'Lead',
          field: 'notes',
          value: 'Qualificado por {{sdrName}}',
        },
      };

      const event = {
        organizationId: 'org-1',
        trigger: 'Lead mudou de status' as const,
        entity: 'Lead' as const,
        entityId: 'lead-200',
        data: { sdrName: 'Ana Paula' },
      };

      await (automationEngine as any).runAction(automation, event);

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-200', organizationId: 'org-1' },
        data: { notes: 'Qualificado por Ana Paula' },
      });
    });
  });

  describe('Enrich lead', () => {
    it('publica evento no domainEventMesh para enriquecimento assíncrono', async () => {
      const automation = {
        id: 'auto-4',
        name: 'Enriquecer Lead Criado',
        action: 'Enrich lead',
        actionConfig: {},
      };

      const event = {
        organizationId: 'org-1',
        trigger: 'Lead criado' as const,
        entity: 'Lead' as const,
        entityId: 'lead-300',
        data: {},
      };

      await (automationEngine as any).runAction(automation, event);

      expect(domainEventMesh.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'LEAD_ENRICHMENT_REQUESTED',
          organizationId: 'org-1',
          aggregateId: 'lead-300',
        }),
      );
    });
  });

  describe('Gatilhos estendidos sem colisão com Postgres Enum', () => {
    it('não consulta o banco com enum inválido quando o trigger é estendido', async () => {
      const event = {
        organizationId: 'org-1',
        trigger: 'Deal mudou de estágio' as any,
        entity: 'Deal' as const,
        entityId: 'deal-10',
        data: { stage: 'Negociação' },
      };

      const result = await automationEngine.handle(event);

      // Deve retornar 0 sem lançar erro de sintaxe de enum no prisma
      expect(result).toBe(0);
      expect(prisma.automation.findMany).not.toHaveBeenCalled();
    });
  });
});
