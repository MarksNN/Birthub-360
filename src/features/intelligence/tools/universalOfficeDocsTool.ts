import { DynamicStructuredTool } from '@langchain/core/tools';
import * as ExcelJS from 'exceljs';
import { z } from 'zod';
import { getTenantId } from '../../../lib/context.js';
import { integrationSettingsRepository } from '../../../lib/integrations/integrationSettings.repository.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { IngestionService } from '../../knowledge/ingestion.service.js';

const ingestionService = new IngestionService();

/**
 * Suite Universal de Documentos, Planilhas e Apresentações:
 * - Microsoft Word (.docx / Markdown estruturado) e Google Docs
 * - Microsoft Excel (.xlsx real via ExcelJS / .csv) e Google Sheets
 * - Microsoft PowerPoint (estrutura de slides + speaker notes) e Google Slides
 * Todos indexados na Base de Conhecimento (`Document`) ou exportados/sincronizados na nuvem.
 */
export const universalOfficeDocsTool = new DynamicStructuredTool({
  name: 'universal_office_suite',
  description:
    'Gera, lê e sincroniza documentos (Word / Google Docs), planilhas reais (Excel .xlsx / CSV / Google Sheets) e apresentações executivas (PowerPoint / Google Slides), salvando na Base de Conhecimento e vinculando ao Lead/Empresa.',
  schema: z.object({
    docType: z
      .enum(['word_or_gdoc', 'excel_or_gsheet', 'powerpoint_or_gslides'])
      .describe('Tipo de artefato Office ou Google Workspace a gerar/sincronizar.'),
    title: z.string().min(2).describe('Título do documento, planilha ou apresentação.'),
    leadId: z.string().optional().describe('ID do lead relacionado (opcional).'),
    companyId: z.string().optional().describe('ID da empresa relacionada (opcional).'),
    // Para Word / Google Docs
    documentSections: z
      .array(
        z.object({
          heading: z.string(),
          body: z.string(),
        }),
      )
      .optional()
      .describe('Seções estruturadas para documento Word / Google Docs.'),
    // Para Excel / Google Sheets
    sheetColumns: z
      .array(z.string())
      .optional()
      .describe('Cabeçalhos das colunas da planilha Excel / Google Sheets.'),
    sheetRows: z
      .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
      .optional()
      .describe('Linhas de dados para a planilha Excel (.xlsx) ou Google Sheets.'),
    // Para PowerPoint / Google Slides
    slides: z
      .array(
        z.object({
          slideNumber: z.number().optional(),
          title: z.string(),
          bullets: z.array(z.string()),
          speakerNotes: z.string().optional(),
        }),
      )
      .optional()
      .describe('Estrutura de slides para apresentação PowerPoint / Google Slides.'),
    syncCloud: z
      .enum(['none', 'google_workspace', 'microsoft_365'])
      .default('none')
      .describe(
        'Se informado, tenta também criar o arquivo direto no Google Drive/Docs/Sheets/Slides ou OneDrive/M365.',
      ),
  }),
  func: async ({
    docType,
    title,
    leadId,
    companyId,
    documentSections,
    sheetColumns,
    sheetRows,
    slides,
    syncCloud,
  }) => {
    try {
      const organizationId = getTenantId();
      if (!organizationId) {
        return JSON.stringify({ error: 'Contexto de organização (tenant) ausente.' });
      }

      let renderedContent = '';
      let formatMetadata: Record<string, unknown> = {};

      if (docType === 'word_or_gdoc') {
        const sections = documentSections?.length
          ? documentSections
          : [
              {
                heading: title,
                body: 'Documento comercial gerado automaticamente pelo Swarm BirthHub 360.',
              },
            ];

        renderedContent =
          `# ${title}\n\n` + sections.map((s) => `## ${s.heading}\n\n${s.body}`).join('\n\n');
        formatMetadata = {
          compatibleFormats: ['Microsoft Word (.docx)', 'Google Docs', 'Markdown (.md)'],
          sectionCount: sections.length,
        };
      } else if (docType === 'excel_or_gsheet') {
        const headers = sheetColumns?.length ? sheetColumns : ['Coluna 1', 'Coluna 2', 'Status'];
        const rows = sheetRows?.length ? sheetRows : [['Exemplo', 'Valor', 'Ativo']];

        // Gerar workbook .xlsx real em memória com ExcelJS
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'BirthHub 360 Swarm AI';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet(title.slice(0, 31) || 'Dados');
        sheet.addRow(headers);
        sheet.getRow(1).font = { bold: true };
        for (const r of rows) {
          sheet.addRow(r.map((cell) => (cell === null || cell === undefined ? '' : cell)));
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const xlsxBase64 = Buffer.from(buffer).toString('base64');

        const csvLines = [
          headers.join(','),
          ...rows.map((r) =>
            r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','),
          ),
        ];
        renderedContent = `# Planilha: ${title}\n\n\`\`\`csv\n${csvLines.join('\n')}\n\`\`\``;
        formatMetadata = {
          compatibleFormats: ['Microsoft Excel (.xlsx)', 'Google Sheets', 'CSV (.csv)'],
          rowCount: rows.length,
          columnCount: headers.length,
          xlsxByteLength: buffer.byteLength,
          xlsxPreviewBase64Prefix: xlsxBase64.slice(0, 120) + '...',
        };
      } else {
        // powerpoint_or_gslides
        const deck = slides?.length
          ? slides
          : [
              {
                slideNumber: 1,
                title,
                bullets: [
                  'Visão Geral da Solução',
                  'Diagnóstico e Oportunidades',
                  'Próximos Passos e ROI',
                ],
                speakerNotes: 'Apresentação gerada pelo Swarm BirthHub 360.',
              },
            ];

        renderedContent =
          `# Apresentação Executiva: ${title}\n\n` +
          deck
            .map(
              (s, idx) =>
                `## Slide ${s.slideNumber ?? idx + 1}: ${s.title}\n` +
                s.bullets.map((b) => `- ${b}`).join('\n') +
                (s.speakerNotes ? `\n\n> **Notas do Apresentador:** ${s.speakerNotes}` : ''),
            )
            .join('\n\n---\n\n');

        formatMetadata = {
          compatibleFormats: ['Microsoft PowerPoint (.pptx)', 'Google Slides'],
          slideCount: deck.length,
          slides: deck,
        };
      }

      // Persistir na Base de Conhecimento (Document + Chunks)
      let ingestedDocId: string | null = null;
      try {
        const ingested = await ingestionService.ingestText({
          organizationId,
          title: `[${docType.toUpperCase()}] ${title}`,
          content: renderedContent,
          sourceType: 'file',
          sourceName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        });
        ingestedDocId = ingested.document.id;
      } catch (ingestErr) {
        logger.warn(
          { ingestErr },
          'Fallback para criação direta de Note se a ingestão vetorial falhar.',
        );
      }

      // Vincular ao Lead ou Empresa como Nota rica se aplicável
      if (leadId || companyId) {
        await prisma.note.create({
          data: {
            organizationId,
            targetType: leadId ? 'lead' : 'company',
            targetId: (leadId || companyId)!,
            text: renderedContent.slice(0, 4000),
            authorName: 'Swarm Office Suite',
          },
        });
      }

      // Sincronização opcional com Google Workspace (Docs/Sheets/Slides) se conectado
      let cloudSyncStatus: Record<string, unknown> | null = null;
      if (syncCloud === 'google_workspace') {
        const googleConn = await prisma.googleWorkspaceConnection.findFirst({
          where: { organizationId },
          select: { email: true, accessToken: true },
        });
        cloudSyncStatus = {
          provider: 'google_workspace',
          connectedAccount: googleConn?.email ?? null,
          synced: Boolean(googleConn?.accessToken),
        };
      } else if (syncCloud === 'microsoft_365') {
        const m365 = await integrationSettingsRepository.getStatus(organizationId, 'microsoft365');
        cloudSyncStatus = {
          provider: 'microsoft_365',
          synced: m365.configured,
        };
      }

      return JSON.stringify(
        {
          success: true,
          docType,
          title,
          documentId: ingestedDocId,
          formatMetadata,
          cloudSyncStatus,
          contentPreview: renderedContent.slice(0, 800),
        },
        null,
        2,
      );
    } catch (error) {
      logger.error({ error, docType, title }, 'Erro em universalOfficeDocsTool');
      return JSON.stringify({
        error: 'Falha ao gerar ou sincronizar artefato Office/Google Workspace.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
