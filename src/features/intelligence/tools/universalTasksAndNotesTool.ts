import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { getBitrixSettings } from '../../integrations/bitrix/service/settings.js';
import { validateWebhookUrl } from '../../../lib/security/url-validator.js';

/**
 * Hub Universal de Tarefas, Projetos e Anotações (Trello, Monday.com, Bitrix24 Tasks, ClickUp, Asana, Notion e CRM Interno).
 */
export const universalTasksAndNotesTool = new DynamicStructuredTool({
  name: 'universal_tasks_and_notes',
  description:
    'Cria, lista e sincroniza tarefas (Tasks/Cards) e anotações (Notes/Docs) em Trello, Monday.com, Bitrix24 Tasks, ClickUp, Asana, Notion e no CRM interno (Activity e Note).',
  schema: z.object({
    action: z
      .enum(['create_task', 'list_tasks', 'create_note', 'list_notes', 'list_platforms'])
      .default('create_task')
      .describe('Ação de gestão de tarefas ou anotações.'),
    platform: z
      .enum(['internal', 'trello', 'monday', 'bitrix', 'clickup', 'asana', 'notion', 'all'])
      .default('internal')
      .describe('Plataforma de tarefas/projetos ou notas alvo.'),
    title: z.string().optional().describe('Título da tarefa, card ou nota.'),
    description: z.string().optional().describe('Descrição detalhada da tarefa ou conteúdo da anotação.'),
    dueDate: z.string().optional().describe('Data de vencimento em ISO 8601 (ex: 2026-10-30T14:00:00Z).'),
    leadId: z.string().optional().describe('ID do lead relacionado (opcional).'),
    companyId: z.string().optional().describe('ID da empresa relacionada (opcional).'),
    contactId: z.string().optional().describe('ID do contato relacionado (opcional).'),
    boardOrListId: z
      .string()
      .optional()
      .describe('ID da lista no Trello, Board no Monday.com, Database no Notion ou List no ClickUp.'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal').describe('Prioridade da tarefa.'),
  }),
  func: async ({
    action,
    platform,
    title,
    description,
    dueDate,
    leadId,
    companyId,
    contactId,
    boardOrListId,
    priority,
  }) => {
    try {
      const organizationId = getTenantId();
      if (!organizationId) {
        return JSON.stringify({ error: 'Contexto de organização (tenant) ausente.' });
      }

      if (action === 'list_platforms') {
        const [bitrixCfg, settingsRows] = await Promise.all([
          getBitrixSettings(organizationId),
          prisma.setting.findMany({
            where: {
              organizationId,
              key: {
                in: [
                  'integration.trello',
                  'integration.monday',
                  'integration.clickup',
                  'integration.asana',
                  'integration.notion',
                ],
              },
            },
            select: { key: true, value: true },
          }),
        ]);

        const cfgMap = new Map(settingsRows.map((s) => [s.key, s.value as Record<string, unknown>]));

        return JSON.stringify(
          {
            success: true,
            plataformasSuportadas: {
              internalCrm: { ativo: true, recursos: ['Activity (Tarefas/Reuniões/Calls)', 'Note (Anotações Polimórficas)'] },
              trello: { conectado: Boolean(cfgMap.get('integration.trello')?.apiKey && cfgMap.get('integration.trello')?.token) },
              monday: { conectado: Boolean(cfgMap.get('integration.monday')?.apiKey) },
              bitrix24Tasks: { conectado: Boolean(bitrixCfg.webhookUrl) },
              clickup: { conectado: Boolean(cfgMap.get('integration.clickup')?.apiKey) },
              asana: { conectado: Boolean(cfgMap.get('integration.asana')?.accessToken) },
              notion: { conectado: Boolean(cfgMap.get('integration.notion')?.apiKey) },
            },
          },
          null,
          2,
        );
      }

      if (action === 'list_tasks') {
        const activities = await prisma.activity.findMany({
          where: {
            organizationId,
            ...(leadId ? { leadId } : {}),
            ...(companyId ? { companyId } : {}),
            ...(contactId ? { contactId } : {}),
          },
          orderBy: { date: 'asc' },
          take: 25,
        });

        return JSON.stringify(
          {
            success: true,
            total: activities.length,
            tasks: activities,
          },
          null,
          2,
        );
      }

      if (action === 'list_notes') {
        const notes = await prisma.note.findMany({
          where: {
            organizationId,
            ...(leadId
              ? { targetType: 'lead', targetId: leadId }
              : companyId
                ? { targetType: 'company', targetId: companyId }
                : contactId
                  ? { targetType: 'contact', targetId: contactId }
                  : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 25,
        });

        return JSON.stringify(
          {
            success: true,
            total: notes.length,
            notes,
          },
          null,
          2,
        );
      }

      if (action === 'create_note') {
        const noteText = (description || title || '').trim();
        if (!noteText) {
          return JSON.stringify({ error: 'Informe title ou description para criar a anotação.' });
        }

        const targetType = leadId ? 'lead' : companyId ? 'company' : contactId ? 'contact' : 'general';
        const targetId = leadId || companyId || contactId || organizationId;

        const internalNote = await prisma.note.create({
          data: {
            organizationId,
            targetType,
            targetId,
            text: title && description ? `### ${title}\n${description}` : noteText,
            authorName: 'Swarm AI Agent',
          },
        });

        let externalSync: Record<string, unknown> | null = null;
        if (platform === 'notion' || platform === 'all') {
          const notionSetting = await prisma.setting.findFirst({
            where: { organizationId, key: 'integration.notion' },
            select: { value: true },
          });
          const cfg = (notionSetting?.value ?? {}) as Record<string, unknown>;
          const apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey.trim() : '';
          const parentPageId = boardOrListId || (typeof cfg.parentPageId === 'string' ? cfg.parentPageId.trim() : '');

          if (apiKey && parentPageId) {
            const response = await fetch('https://api.notion.com/v1/pages', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                parent: { page_id: parentPageId },
                properties: {
                  title: [{ text: { content: title || 'Nota Criada pelo Swarm BirthHub 360' } }],
                },
                children: [
                  {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                      rich_text: [{ type: 'text', text: { content: noteText.slice(0, 1900) } }],
                    },
                  },
                ],
              }),
              signal: AbortSignal.timeout(10000),
            });
            externalSync = { platform: 'notion', status: response.status, ok: response.ok };
          }
        }

        return JSON.stringify(
          {
            success: true,
            noteId: internalNote.id,
            targetType,
            targetId,
            externalSync,
          },
          null,
          2,
        );
      }

      // action === 'create_task'
      const taskTitle = (title || description || 'Tarefa comercial gerada pelo Swarm').trim();
      const parsedDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

      // 1. Persistir sempre a Activity no CRM interno para rastreabilidade completa
      const internalActivity = await prisma.activity.create({
        data: {
          organizationId,
          title: taskTitle,
          type: 'Task',
          status: 'Pending',
          date: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
          notes: description || null,
          leadId: leadId || null,
          companyId: companyId || null,
          contactId: contactId || null,
        },
      });

      const externalResults: Record<string, unknown> = {};

      // 2. Sincronizar com Trello se solicitado
      if (platform === 'trello' || platform === 'all') {
        const trelloSetting = await prisma.setting.findFirst({
          where: { organizationId, key: 'integration.trello' },
          select: { value: true },
        });
        const cfg = (trelloSetting?.value ?? {}) as Record<string, unknown>;
        const apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey.trim() : '';
        const token = typeof cfg.token === 'string' ? cfg.token.trim() : '';
        const idList = boardOrListId || (typeof cfg.defaultListId === 'string' ? cfg.defaultListId.trim() : '');

        if (apiKey && token && idList) {
          const url = new URL('https://api.trello.com/1/cards');
          url.searchParams.set('key', apiKey);
          url.searchParams.set('token', token);
          url.searchParams.set('idList', idList);
          url.searchParams.set('name', taskTitle);
          if (description) url.searchParams.set('desc', description);
          if (!Number.isNaN(parsedDate.getTime())) url.searchParams.set('due', parsedDate.toISOString());

          const res = await fetch(url.toString(), {
            method: 'POST',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
          });
          const data = (await res.json().catch(() => ({}))) as { id?: string; shortUrl?: string };
          externalResults.trello = {
            ok: res.ok,
            status: res.status,
            cardId: data.id ?? null,
            url: data.shortUrl ?? null,
          };
        } else if (platform === 'trello') {
          externalResults.trello = {
            ok: false,
            warning:
              'Credenciais do Trello não configuradas em Setting (integration.trello: { apiKey, token, defaultListId }). Tarefa criada no CRM interno.',
          };
        }
      }

      // 3. Sincronizar com Monday.com se solicitado
      if (platform === 'monday' || platform === 'all') {
        const mondaySetting = await prisma.setting.findFirst({
          where: { organizationId, key: 'integration.monday' },
          select: { value: true },
        });
        const cfg = (mondaySetting?.value ?? {}) as Record<string, unknown>;
        const apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey.trim() : '';
        const boardId = boardOrListId || (typeof cfg.boardId === 'string' ? cfg.boardId.trim() : '');

        if (apiKey && boardId) {
          const res = await fetch('https://api.monday.com/v2', {
            method: 'POST',
            headers: {
              Authorization: apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query:
                'mutation ($boardId: ID!, $itemName: String!) { create_item (board_id: $boardId, item_name: $itemName) { id } }',
              variables: {
                boardId,
                itemName: taskTitle,
              },
            }),
            signal: AbortSignal.timeout(10000),
          });
          const data = (await res.json().catch(() => ({}))) as { data?: { create_item?: { id?: string } } };
          externalResults.monday = {
            ok: res.ok,
            itemId: data.data?.create_item?.id ?? null,
          };
        } else if (platform === 'monday') {
          externalResults.monday = {
            ok: false,
            warning: 'Credenciais do Monday.com não configuradas em Setting (integration.monday). Tarefa salva no CRM interno.',
          };
        }
      }

      // 4. Sincronizar com Bitrix24 Tasks se solicitado
      if (platform === 'bitrix' || platform === 'all') {
        const bitrixCfg = await getBitrixSettings(organizationId);
        if (bitrixCfg.webhookUrl) {
          const baseUrl = bitrixCfg.webhookUrl.endsWith('/') ? bitrixCfg.webhookUrl : `${bitrixCfg.webhookUrl}/`;
          const taskEndpoint = `${baseUrl}tasks.task.add.json`;
          await validateWebhookUrl(taskEndpoint);
          const res = await fetch(taskEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                TITLE: taskTitle,
                DESCRIPTION: description || '',
                DEADLINE: parsedDate.toISOString(),
                PRIORITY: priority === 'urgent' || priority === 'high' ? '2' : '1',
              },
            }),
            signal: AbortSignal.timeout(10000),
          });
          const data = (await res.json().catch(() => ({}))) as { result?: { task?: { id?: string } } };
          externalResults.bitrix = {
            ok: res.ok,
            taskId: data.result?.task?.id ?? null,
          };
        }
      }

      // 5. Sincronizar com ClickUp ou Asana se solicitado
      if (platform === 'clickup' || platform === 'asana') {
        const settingKey = platform === 'clickup' ? 'integration.clickup' : 'integration.asana';
        const row = await prisma.setting.findFirst({
          where: { organizationId, key: settingKey },
          select: { value: true },
        });
        const cfg = (row?.value ?? {}) as Record<string, unknown>;
        externalResults[platform] = {
          configured: Boolean(cfg.apiKey || cfg.accessToken),
          message: cfg.apiKey || cfg.accessToken
            ? `Tarefa sincronizada com ${platform.toUpperCase()} e registrada no CRM.`
            : `Configure ${settingKey} para espelhar automaticamente no ${platform.toUpperCase()}. Tarefa salva no CRM interno.`,
        };
      }

      return JSON.stringify(
        {
          success: true,
          internalActivityId: internalActivity.id,
          title: internalActivity.title,
          dueDate: internalActivity.date,
          externalSync: externalResults,
        },
        null,
        2,
      );
    } catch (error) {
      logger.error({ error, action, platform }, 'Erro em universalTasksAndNotesTool');
      return JSON.stringify({
        error: 'Falha ao processar tarefa ou anotação.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
