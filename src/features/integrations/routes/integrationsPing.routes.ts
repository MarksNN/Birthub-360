/**
 * Rotas de teste e validação em tempo real de integrações (ping endpoint).
 * Permite validar tokens e credenciais antes e depois de salvar conexões.
 */

import { type Request, type Response, Router } from 'express';
import express from 'express';
import { z } from 'zod';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { normalizeWebhookUrl, testWebhook } from '../bitrix/service/client.js';
import { type CrmConnectionConfig, getCrmProvider } from '../shared/CrmProvider.js';

// Certifica o registro dos providers de CRM externo
import '../hubspot/HubspotProvider.js';
import '../pipedrive/PipedriveProvider.js';
import '../rdstation/RdStationProvider.js';
import '../monday/MondayProvider.js';

export const integrationsPingRoutes = Router();

interface AuthenticatedRequest extends Request {
  user?: { id?: string; role?: string; organizationId?: string };
}

// Restrito para ADMIN e GESTOR
integrationsPingRoutes.use(requireRole(['ADMIN', 'GESTOR']));

const pingBodySchema = z.object({
  provider: z.string().optional(),
  token: z.string().optional(),
  apiKey: z.string().optional(),
  accessToken: z.string().optional(),
  domain: z.string().optional(),
  boardId: z.string().optional(),
  webhookUrl: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

async function handlePing(idOrProvider: string, req: Request, res: Response): Promise<Response> {
  const organizationId = (req as AuthenticatedRequest).user?.organizationId;
  if (!organizationId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const parseResult = pingBodySchema.safeParse(req.body ?? {});
  const body = parseResult.success ? parseResult.data : {};

  const identifier = (idOrProvider || body.provider || '').trim().toLowerCase();
  const token = body.token || body.apiKey || body.accessToken || '';

  // 1. CRM Externo (HubSpot, Pipedrive, RD Station, Monday)
  if (['hubspot', 'pipedrive', 'rdstation', 'monday'].includes(identifier)) {
    try {
      const provider = getCrmProvider(identifier);
      const config: CrmConnectionConfig = {
        apiKey: body.apiKey || body.token || (body.config?.apiKey as string),
        accessToken: body.accessToken || body.token || (body.config?.accessToken as string),
        domain: body.domain || (body.config?.domain as string),
        boardId: body.boardId || (body.config?.boardId as string),
      };

      if (!config.apiKey && !config.accessToken && !token) {
        return res.status(400).json({
          success: false,
          valid: false,
          error: 'Token ou chave de API não fornecida para validação.',
        });
      }

      const isValid = await provider.validateConnection(config);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          valid: false,
          error: `Falha ao autenticar no ${provider.displayName}. Verifique o token e as permissões.`,
        });
      }

      return res.json({
        success: true,
        valid: true,
        provider: identifier,
        message: `Conexão com ${provider.displayName} validada com sucesso!`,
      });
    } catch (err: any) {
      logger.warn({ err, identifier }, 'Erro na validação de credenciais do CRM externo');
      return res.status(400).json({
        success: false,
        valid: false,
        error: err instanceof Error ? err.message : 'Falha na validação das credenciais.',
      });
    }
  }

  // 2. Bitrix24
  if (identifier === 'bitrix' || identifier === 'bitrix24') {
    const rawWebhook = body.webhookUrl || token || (body.config?.webhookUrl as string);
    if (!rawWebhook) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'URL do webhook do Bitrix24 não informada.',
      });
    }

    try {
      const normalized = normalizeWebhookUrl(rawWebhook);
      const testRes = await testWebhook(normalized);
      return res.json({
        success: true,
        valid: true,
        provider: 'bitrix',
        portalDomain: testRes.portalDomain,
        message: `Portal Bitrix24 (${testRes.portalDomain}) validado com sucesso!`,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: err instanceof Error ? err.message : 'Falha ao conectar com o webhook Bitrix24.',
      });
    }
  }

  // 3. Slack
  if (identifier === 'slack') {
    const webhookUrl = body.webhookUrl || token || (body.config?.webhookUrl as string);
    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'URL do webhook do Slack não informada.',
      });
    }
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'URL inválida. Deve iniciar com https://hooks.slack.com/',
      });
    }
    return res.json({
      success: true,
      valid: true,
      provider: 'slack',
      message: 'Formato do Webhook do Slack validado com sucesso!',
    });
  }

  // 4. Verificação de conexão existente por ID no banco de dados
  try {
    const existingCrm = await prisma.externalCrmConnection.findFirst({
      where: { id: idOrProvider, organizationId },
    });

    if (existingCrm) {
      const provider = getCrmProvider(existingCrm.provider);
      let parsedConfig: CrmConnectionConfig;
      try {
        parsedConfig = JSON.parse(existingCrm.config);
      } catch {
        parsedConfig = {};
      }

      // Se novos dados vieram no body, mescla
      if (token) {
        parsedConfig.apiKey = token;
        parsedConfig.accessToken = token;
      }
      if (body.domain) parsedConfig.domain = body.domain;
      if (body.boardId) parsedConfig.boardId = body.boardId;

      const isValid = await provider.validateConnection(parsedConfig);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          valid: false,
          error: `Credenciais inválidas para a conexão ${existingCrm.label}.`,
        });
      }

      return res.json({
        success: true,
        valid: true,
        id: existingCrm.id,
        provider: existingCrm.provider,
        message: `Conexão "${existingCrm.label}" testada e validada com sucesso!`,
      });
    }

    const existingBitrix = await prisma.bitrixConnection.findFirst({
      where: { id: idOrProvider, organizationId },
    });

    if (existingBitrix) {
      const testRes = await testWebhook(normalizeWebhookUrl(existingBitrix.webhookUrl));
      return res.json({
        success: true,
        valid: true,
        id: existingBitrix.id,
        provider: 'bitrix',
        portalDomain: testRes.portalDomain,
        message: `Conexão Bitrix24 "${existingBitrix.label}" validada com sucesso!`,
      });
    }
  } catch (err: any) {
    logger.warn({ err, idOrProvider }, 'Erro ao testar conexão persistida');
  }

  return res.status(404).json({
    success: false,
    valid: false,
    error: `Provedor ou ID de conexão "${idOrProvider}" não suportado para teste de conexão.`,
  });
}

// POST /api/integrations/:id/ping
integrationsPingRoutes.post('/:id/ping', express.json(), async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  return handlePing(id || '', req, res);
});

// POST /api/integrations/ping (fallback com provider no body)
integrationsPingRoutes.post('/ping', express.json(), async (req: Request, res: Response) => {
  const provider = (req.body?.provider as string) || '';
  return handlePing(provider, req, res);
});
