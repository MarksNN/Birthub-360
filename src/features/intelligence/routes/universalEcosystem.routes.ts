import * as ExcelJS from 'exceljs';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { hasRequiredRole } from '../../../lib/auth/authorization.js';
import { runWithContext } from '../../../lib/context.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { UniversalSpecialistAgent } from '../agents/universalSpecialist.agent.js';
import {
  ECOSYSTEM_PLAYBOOKS,
  type PlaybookId,
  runEcosystemPlaybook,
} from '../services/ecosystemPlaybooks.service.js';
import {
  listUniversalConnectorsStatus,
  saveUniversalConnectorConfig,
} from '../services/universalConnectors.service.js';
import {
  getUniversalToolCatalog,
  type UniversalToolCategory,
} from '../tools/capabilityToolRegistry.js';
import { universalOfficeDocsTool } from '../tools/universalOfficeDocsTool.js';

const router = Router();
const writeRoles = requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']);
const ADMIN_OR_GESTOR_ROLES = ['ADMIN', 'GESTOR'];
const adminOrGestor = requireRole(ADMIN_OR_GESTOR_ROLES);

/**
 * GET /api/agent/ecosystem/connectors
 * Lista o status real de todas as 21+ plataformas corporativas (CRMs, E-mail, Mensageria, Tarefas, Reuniões, Wearables).
 */
router.get(
  '/ecosystem/connectors',
  writeRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, role } = (req as AuthRequest).user;
      // maskedConfig (mesmo mascarado) só para quem pode editar credenciais (PUT abaixo);
      // CLOSER/SDR veem só connected/statusDetail.
      const connectors = await listUniversalConnectorsStatus(organizationId, {
        includeMaskedConfig: hasRequiredRole(role, ADMIN_OR_GESTOR_ROLES),
      });
      res.json({ success: true, data: connectors });
    } catch (err) {
      next(err);
    }
  },
);

const saveConnectorSchema = z.object({
  config: z.record(z.string(), z.string()),
});

/**
 * PUT /api/agent/ecosystem/connectors/:provider
 * Salva/atualiza credenciais de qualquer conector universal com validação SSRF e mascaramento de segredos.
 */
router.put(
  '/ecosystem/connectors/:provider',
  adminOrGestor,
  validateRequest(saveConnectorSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const provider = String(req.params.provider || '').trim();
      const { config } = req.body as z.infer<typeof saveConnectorSchema>;
      const result = await saveUniversalConnectorConfig(organizationId, provider, config);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/agent/ecosystem/catalog
 * Retorna o catálogo completo de ferramentas universais reutilizáveis pelo Swarm e por qualquer agente separado.
 */
router.get(
  '/ecosystem/catalog',
  writeRoles,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const catalog = getUniversalToolCatalog();
      res.json({ success: true, data: catalog });
    } catch (err) {
      next(err);
    }
  },
);

const standaloneRunSchema = z.object({
  mission: z.string().trim().min(2).max(4000),
  agentTitle: z.string().trim().max(120).optional(),
  customSystemPrompt: z.string().trim().max(4000).optional(),
  categories: z
    .array(
      z.enum([
        'prospecting_enrichment',
        'email_intelligence',
        'messaging_omnichannel',
        'tasks_projects_notes',
        'meetings_calendar',
        'office_docs_sheets_slides',
        'multi_device_notifications',
        'scripts_prompts_enablement',
        'crm_erp_sync',
        'pipeline_revops',
      ]),
    )
    .optional(),
  sessionId: z.string().trim().max(200).optional(),
});

/**
 * POST /api/agent/ecosystem/standalone-run
 * Executa qualquer Agente Separado (standalone) equipado com as ferramentas universais selecionadas.
 */
router.post(
  '/ecosystem/standalone-run',
  writeRoles,
  validateRequest(standaloneRunSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, organizationId } = (req as AuthRequest).user;
      const body = req.body as z.infer<typeof standaloneRunSchema>;

      const agent = new UniversalSpecialistAgent({
        agentTitle: body.agentTitle,
        customSystemPrompt: body.customSystemPrompt,
        categories: body.categories as UniversalToolCategory[] | undefined,
      });

      const result = await runWithContext({ organizationId, userId }, () =>
        agent.run(body.mission, body.sessionId),
      );

      res.json({ success: !result.error, data: result });
    } catch (err) {
      next(err);
    }
  },
);

const officeGenerateSchema = z.object({
  docType: z.enum(['word_or_gdoc', 'excel_or_gsheet', 'powerpoint_or_gslides']),
  title: z.string().trim().min(2).max(200),
  leadId: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  documentSections: z.array(z.object({ heading: z.string(), body: z.string() })).optional(),
  sheetColumns: z.array(z.string()).optional(),
  sheetRows: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).optional(),
  slides: z
    .array(
      z.object({
        slideNumber: z.number().optional(),
        title: z.string(),
        bullets: z.array(z.string()),
        speakerNotes: z.string().optional(),
      }),
    )
    .optional(),
});

/**
 * POST /api/agent/ecosystem/office/generate
 * Gera artefatos reais de Word/Google Docs, Excel (.xlsx binário real via ExcelJS) e PowerPoint/Slides
 * com download imediato e indexação na Base de Conhecimento.
 */
router.post(
  '/ecosystem/office/generate',
  writeRoles,
  validateRequest(officeGenerateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, organizationId } = (req as AuthRequest).user;
      const body = req.body as z.infer<typeof officeGenerateSchema>;

      const rawResult = await runWithContext({ organizationId, userId }, () =>
        universalOfficeDocsTool.invoke({
          ...body,
          syncCloud: 'none',
        }),
      );

      const parsed = JSON.parse(String(rawResult)) as Record<string, unknown>;

      // Se for Excel, gerar também o base64 completo para download imediato do .xlsx no navegador
      let downloadBase64: string | null = null;
      let downloadMimeType = 'text/markdown;charset=utf-8';
      let downloadFilename = `${body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;

      if (body.docType === 'excel_or_gsheet') {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'BirthHub 360 Swarm AI';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet(body.title.slice(0, 31) || 'Dados');
        const headers = body.sheetColumns?.length ? body.sheetColumns : ['Item', 'Valor', 'Status'];
        const rows = body.sheetRows?.length ? body.sheetRows : [['Exemplo', '100', 'Ativo']];
        sheet.addRow(headers);
        sheet.getRow(1).font = { bold: true };
        for (const r of rows) {
          sheet.addRow(r.map((c) => (c === null || c === undefined ? '' : c)));
        }
        const buf = await workbook.xlsx.writeBuffer();
        downloadBase64 = Buffer.from(buf).toString('base64');
        downloadMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        downloadFilename = `${body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.xlsx`;
      } else if (body.docType === 'word_or_gdoc') {
        const content = String(parsed.contentPreview || `# ${body.title}`);
        downloadBase64 = Buffer.from(content, 'utf-8').toString('base64');
        downloadFilename = `${body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-doc.md`;
      } else {
        const content = String(parsed.contentPreview || `# ${body.title}`);
        downloadBase64 = Buffer.from(content, 'utf-8').toString('base64');
        downloadFilename = `${body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-slides.md`;
      }

      res.json({
        success: true,
        data: {
          ...parsed,
          download: {
            filename: downloadFilename,
            mimeType: downloadMimeType,
            base64: downloadBase64,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/agent/ecosystem/playbooks
 * Lista as receitas/playbooks multi-plataforma automatizados ponta a ponta.
 */
router.get('/ecosystem/playbooks', writeRoles, (_req: Request, res: Response) => {
  res.json({ success: true, data: ECOSYSTEM_PLAYBOOKS });
});

const runPlaybookSchema = z.object({
  segment: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  leadId: z.string().trim().max(120).optional(),
  transcript: z.string().trim().max(12000).optional(),
});

/**
 * POST /api/agent/ecosystem/playbooks/:playbookId/run
 * Executa um playbook multi-plataforma completo encadeando as ferramentas universais.
 */
router.post(
  '/ecosystem/playbooks/:playbookId/run',
  writeRoles,
  validateRequest(runPlaybookSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, organizationId } = (req as AuthRequest).user;
      const playbookId = String(req.params.playbookId || '').trim() as PlaybookId;
      const body = req.body as z.infer<typeof runPlaybookSchema>;
      const report = await runEcosystemPlaybook(organizationId, userId, playbookId, body);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  },
);

export const universalEcosystemRoutes = router;
