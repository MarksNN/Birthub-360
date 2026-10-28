/**
 * Rotas da API para gerenciamento das conexões de CRMs Externos (HubSpot, Pipedrive, RD, Monday).
 * Acionadas pelo ExternalCrmPanel.
 */

import type { Request, Response } from 'express';
import express, { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../../lib/logger.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { ExternalCrmService } from './ExternalCrmService.js';

export const externalCrmRoutes = Router();

interface AuthenticatedRequest extends Request {
  user?: { id?: string; role?: string; organizationId?: string };
}

// Restringe todas as rotas para ADMIN/GESTOR
externalCrmRoutes.use(requireRole(['ADMIN', 'GESTOR']));

// GET /api/integrations/external-crm
// Lista conexões ativas de um provider específico
externalCrmRoutes.get('/', async (req: Request, res: Response) => {
  const organizationId = (req as AuthenticatedRequest).user?.organizationId;
  if (!organizationId) return res.status(401).send({ error: 'Unauthorized' });

  const provider = req.query.provider as string | undefined;

  try {
    const connections = await ExternalCrmService.listConnections(organizationId);
    if (provider) {
      return res.send(connections.filter((c) => c.provider === provider));
    }
    return res.send(connections);
  } catch (err: any) {
    logger.error({ err, organizationId }, 'Erro ao listar conexões de CRM externo');
    return res.status(500).send({ error: 'Falha interna' });
  }
});

// POST /api/integrations/external-crm
// Cria nova conexão
externalCrmRoutes.post('/', express.json(), async (req: Request, res: Response) => {
  const organizationId = (req as AuthenticatedRequest).user?.organizationId;
  if (!organizationId) return res.status(401).send({ error: 'Unauthorized' });

  const schema = z.object({
    provider: z.string(),
    label: z.string(),
    config: z.any(),
    inboundEventsEnabled: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).send({ error: 'Dados inválidos', details: parsed.error.issues });
  }

  const { provider, label, config, inboundEventsEnabled } = parsed.data;

  try {
    const connection = await ExternalCrmService.createConnection({
      organizationId,
      provider,
      label,
      config: config as Record<string, string>,
      inboundEventsEnabled,
    });

    return res.status(201).send({
      id: connection.id,
      provider: connection.provider,
      label: connection.label,
    });
  } catch (err: any) {
    logger.error({ err, organizationId }, 'Erro ao criar conexão de CRM externo');
    return res.status(400).send({ error: err instanceof Error ? err.message : 'Falha interna' });
  }
});

// DELETE /api/integrations/external-crm/:id
// Remove conexão
externalCrmRoutes.delete('/:id', async (req: Request, res: Response) => {
  const organizationId = (req as AuthenticatedRequest).user?.organizationId;
  if (!organizationId) return res.status(401).send({ error: 'Unauthorized' });

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).send({ error: 'ID obrigatório' });

  try {
    await ExternalCrmService.deleteConnection(id, organizationId);
    return res.send({ success: true });
  } catch (err: any) {
    logger.error({ err, organizationId }, 'Erro ao remover conexão de CRM externo');
    return res.status(500).send({ error: 'Falha interna' });
  }
});

// POST /api/integrations/external-crm/:id/test
// Testa a validade das credenciais de uma conexão existente
externalCrmRoutes.post('/:id/test', async (req: Request, res: Response) => {
  const organizationId = (req as AuthenticatedRequest).user?.organizationId;
  if (!organizationId) return res.status(401).send({ error: 'Unauthorized' });

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).send({ error: 'ID obrigatório' });

  try {
    const isValid = await ExternalCrmService.validateConnection(id, organizationId);
    if (!isValid) {
      return res.status(400).send({
        success: false,
        valid: false,
        error: 'Credenciais inválidas ou sem permissão de acesso no CRM externo.',
      });
    }
    return res.send({
      success: true,
      valid: true,
      message: 'Conexão validada com sucesso!',
    });
  } catch (err: any) {
    logger.error(
      { err, organizationId, connectionId: id },
      'Erro ao testar conexão de CRM externo',
    );
    return res.status(500).send({
      success: false,
      error: err instanceof Error ? err.message : 'Falha ao validar credenciais.',
    });
  }
});

// POST /api/integrations/external-crm/:id/sync
// Dispara importação / sincronização manual de leads
externalCrmRoutes.post('/:id/sync', async (req: Request, res: Response) => {
  const organizationId = (req as AuthenticatedRequest).user?.organizationId;
  if (!organizationId) return res.status(401).send({ error: 'Unauthorized' });

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).send({ error: 'ID obrigatório' });

  try {
    const result = await ExternalCrmService.importLeads(id, organizationId);
    return res.send({
      success: true,
      importedCount: result.leads.length,
      nextCursor: result.nextCursor,
      message: `${result.leads.length} lead(s) processado(s) na sincronização.`,
    });
  } catch (err: any) {
    logger.error({ err, organizationId, connectionId: id }, 'Erro ao sincronizar CRM externo');
    return res.status(500).send({
      success: false,
      error: err instanceof Error ? err.message : 'Falha ao sincronizar com CRM externo.',
    });
  }
});
