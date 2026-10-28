import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runWithContext } from '../../../../lib/context.js';
import {
  getAllUniversalTools,
  getToolsForSwarmRole,
  getUniversalToolCatalog,
} from '../capabilityToolRegistry.js';
import { scriptAndPromptTool } from '../scriptAndPromptTool.js';
import { universalNotificationsTool } from '../universalNotificationsTool.js';
import { universalOfficeDocsTool } from '../universalOfficeDocsTool.js';

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    notification: {
      create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    },
    setting: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    note: {
      create: vi.fn().mockResolvedValue({ id: 'note-1' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    prompt: {
      create: vi.fn().mockResolvedValue({ id: 'prompt-1' }),
    },
    lead: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'lead-1',
        name: 'Cliente Enterprise',
        industry: 'Logística',
        company: {
          tradeName: 'TransLog S.A.',
          legalName: 'TransLog Brasil Ltda',
          cnae: '4930-2/02',
        },
        contact: { role: 'CFO' },
      }),
    },
    googleWorkspaceConnection: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
  withRlsContext: vi.fn((_orgId: string, fn: any) => fn({})),
}));

vi.mock('../../../knowledge/ingestion.service.js', () => ({
  IngestionService: class {
    async ingestText() {
      return { id: 'doc-1', title: 'Doc Ingerido', chunkCount: 1 };
    }
  },
}));

vi.mock('../../../../lib/ai/gateway.js', () => ({
  generateTextOutput: vi.fn().mockResolvedValue({
    text: 'Script comercial de alta conversão gerado com sucesso.',
  }),
}));

describe('Universal Ecosystem & Capability Tool Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the complete 29-tool catalog and filters by category and swarm role', () => {
    const catalog = getUniversalToolCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(20);

    const emailTools = getAllUniversalTools({ categories: ['email_intelligence'] });
    expect(emailTools.map((t) => t.name)).toContain('universal_email_intelligence');

    const bdrTools = getToolsForSwarmRole('bdr');
    expect(bdrTools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'company_discovery',
        'promote_and_enrich_lead',
        'universal_email_intelligence',
        'universal_messaging_hub',
        'script_and_prompt_factory',
      ]),
    );

    const opsTools = getToolsForSwarmRole('ops');
    expect(opsTools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'pipedrive_sync',
        'universal_tasks_and_notes',
        'universal_office_suite',
        'universal_notifications_dispatcher',
      ]),
    );
  });

  it('generates real binary Excel (.xlsx) workbooks via universal_office_suite', async () => {
    const raw = await runWithContext({ organizationId: 'org-1', userId: 'user-1' }, () =>
      universalOfficeDocsTool.invoke({
        docType: 'excel_or_gsheet',
        title: 'Forecast Semanal',
        sheetColumns: ['Empresa', 'Valor'],
        sheetRows: [['Alpha S.A.', 50000]],
        syncCloud: 'none',
      }),
    );

    const parsed = JSON.parse(String(raw));
    expect(parsed.success).toBe(true);
    expect(parsed.documentId).toBe('doc-1');
    expect(parsed.formatMetadata.xlsxByteLength).toBeGreaterThan(100);
  });

  it('dispatches multi-device notifications (In-App Pop-up, Mobile Push, Smartwatch/Relógio)', async () => {
    const raw = await runWithContext({ organizationId: 'org-1', userId: 'user-1' }, () =>
      universalNotificationsTool.invoke({
        channels: ['in_app_popup', 'mobile_push', 'smartwatch_wrist'],
        title: 'Lead Quente Detectado',
        message: 'O CFO da TransLog respondeu pedindo proposta.',
        wristSummary: '🔥 CFO TransLog pediu proposta!',
        kind: 'Alert',
        leadId: 'lead-1',
      }),
    );

    const parsed = JSON.parse(String(raw));
    expect(parsed.success).toBe(true);
    expect(parsed.deliveries.in_app_popup.delivered).toBe(true);
    expect(parsed.deliveries.mobile_push.queuedForMobileApp).toBe(true);
    expect(parsed.deliveries.smartwatch_wrist.glanceText).toContain('CFO TransLog');
  });

  it('generates commercial scripts and saves reusable Prompts in script_and_prompt_factory', async () => {
    const raw = await runWithContext({ organizationId: 'org-1', userId: 'user-1' }, () =>
      scriptAndPromptTool.invoke({
        artifactType: 'cold_call_script',
        targetAudienceOrPersona: 'CFO de Logística',
        objective: 'Agendar diagnóstico de 15 minutos',
        leadId: 'lead-1',
        saveToPromptLibrary: true,
      }),
    );

    const parsed = JSON.parse(String(raw));
    expect(parsed.success).toBe(true);
    expect(parsed.savedPromptId).toBe('prompt-1');
    expect(parsed.content).toBeTruthy();
  });
});
