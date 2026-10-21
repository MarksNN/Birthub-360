import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { AuditService } from '../../lib/audit/audit.service.js';
import {
  ConsentChainUnavailableError,
  REVOCATION_REASON_CODES,
} from '../../lib/security/consentAuditChain.service.js';
import { consentAuditChain } from '../../lib/security/consentChainFactory.js';
import { routeParam } from '../../shared/http/routeParams.js';
import type { AuthRequest } from '../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';
import { lgpdService } from './lgpd.service.js';

export const lgpdRouter = Router();

// Exclusão / Anonimização de Titular (LGPD Art. 18) — irreversível, por isso exige um papel
// mínimo (ADMIN/GESTOR), mesmo padrão de src/features/commercial-intelligence/routes/
// commercialIntelligence.routes.ts. Este router é montado em server.ts com
// `authenticateToken, requireTenant`, então `req.user` sempre existe aqui.
lgpdRouter.delete(
  '/titular/:contactId',
  requireRole(['ADMIN', 'GESTOR']),
  (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      // organizationId vem exclusivamente do usuário autenticado (req.user, populado por
      // authenticateToken a partir da sessão) — nunca de um header controlado pelo cliente.
      // Um fallback para `x-organization-id` aqui permitiria que qualquer requisição forjasse
      // esse header e apagasse/anonimizasse dados de OUTRO tenant.
      const { organizationId, id: actorId } = (req as AuthRequest).user;
      const contactId = routeParam(req.params.contactId, 'contactId');
      const result = await lgpdService.eraseContact(organizationId, contactId, actorId);

      // Registro explícito, além do UPDATE genérico de Contact que a extensão de auditoria do
      // Prisma já grava (src/lib/prisma.ts) — este identifica claramente, para quem lê a trilha em
      // AuditLogs.tsx, que a ação foi um exercício do direito de exclusão/anonimização (LGPD art.
      // 18), não uma edição de cadastro comum.
      await AuditService.log({
        action: 'DELETE',
        entity: 'LGPD_TITULAR',
        entityId: contactId,
        actorId,
        tenantId: organizationId,
        ipAddress: req.ip,
        afterState: { ...result },
      });

      res.json({
        message: 'Dados do titular anonimizados com sucesso.',
        result,
      });
    })().catch(next);
  },
);

// Exportação / Portabilidade de Titular (LGPD Art. 18 V) — mesmo papel mínimo da exclusão acima:
// os dados exportados aqui (nome, e-mail, telefone, WhatsApp, LinkedIn, observações) são o PII
// completo do titular; sem essa checagem, qualquer usuário autenticado do tenant (ex.: SDR)
// conseguia baixar o dossiê completo de qualquer contato, não só ADMIN/GESTOR.
lgpdRouter.get(
  '/titular/:contactId/export',
  requireRole(['ADMIN', 'GESTOR']),
  (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      // Mesmo raciocínio da rota de exclusão acima: organizationId só do usuário autenticado.
      const { organizationId, id: actorId } = (req as AuthRequest).user;
      const contactId = routeParam(req.params.contactId, 'contactId');
      const data = await lgpdService.exportContactData(organizationId, contactId);

      // Rota só de leitura — não passa pela extensão de auditoria do Prisma (que só cobre
      // create/update/delete, ver src/lib/prisma.ts), então sem este registro explícito o
      // download completo de PII de um titular não deixava nenhum rastro em AuditLog.
      await AuditService.log({
        action: 'EXPORT',
        entity: 'LGPD_TITULAR',
        entityId: contactId,
        actorId,
        tenantId: organizationId,
        ipAddress: req.ip,
      });

      res.json(data);
    })().catch(next);
  },
);

// Listagem de Logs de Auditoria de Segurança & LGPD
lgpdRouter.get(
  '/audit-logs',
  requireRole(['ADMIN', 'GESTOR']),
  (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      const { organizationId } = (req as AuthRequest).user;
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const { prisma } = await import('../../lib/prisma.js');

      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId: organizationId,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      });

      // ACHADO REAL (Piloto 025): a resposta trazia `logs` na raiz em vez de `data` — o cliente
      // HTTP genérico (`src/lib/api.ts`) sempre desembrulha `data.data`, então
      // `api.get('/api/lgpd/audit-logs')` sempre devolvia `undefined` pra qualquer chamador. A
      // aba "Auditoria & LGPD" nunca mostrou nenhum log, pra nenhum usuário, desde sempre.
      res.json({
        success: true,
        data: { logs },
      });
    })().catch(next);
  },
);

// Consulta de Status de Opt-Out por Contato e Canal (B-13 e §27)
lgpdRouter.get('/opt-out/:contactId', (req: Request, res: Response, next: NextFunction): void => {
  (async () => {
    const { organizationId } = (req as AuthRequest).user;
    const contactId = routeParam(req.params.contactId, 'contactId');
    const channel = (req.query.channel as string) || 'global';
    const status = await lgpdService.checkOptOut(contactId, channel, organizationId);
    res.json({ success: true, data: status });
  })().catch(next);
});

// Registro de Opt-Out Manual / Expresso de Contato
lgpdRouter.post(
  '/opt-out',
  requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']),
  (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      const { organizationId, id: actorId } = (req as AuthRequest).user;
      const { contactId, channel, scope, originChannel, reason, evidence } = req.body;
      if (!contactId || typeof contactId !== 'string') {
        res.status(400).json({ success: false, error: 'contactId é obrigatório.' });
        return;
      }

      await lgpdService.recordOptOut({
        organizationId,
        contactId,
        channel,
        scope,
        originChannel: originChannel || 'manual',
        reason,
        evidence,
        actorUserId: actorId,
      });

      await AuditService.log({
        action: 'UPDATE',
        entity: 'LGPD_OPTOUT',
        entityId: contactId,
        actorId,
        tenantId: organizationId,
        ipAddress: req.ip,
        afterState: { channel, scope, reason },
      });

      res.status(201).json({
        success: true,
        message: 'Opt-out registrado com sucesso.',
      });
    })().catch(next);
  },
);

// ── Cadeia de consentimento (REMED-06 / P2-4) ────────────────────────────────
// organizationId sempre da sessão. Se a migração do Agente 01 ainda não existir, a cadeia falha
// fechada e as rotas respondem 503 (nunca gravam em memória em produção).
const consentBodySchema = z.object({
  subjectRef: z.string().trim().min(1).max(128),
  purpose: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Z0-9_]+$/),
  termsVersion: z.string().trim().min(1).max(32),
  retentionDays: z.number().int().positive().max(3650).optional(),
});
const revokeBodySchema = z.object({
  reasonCode: z.enum(REVOCATION_REASON_CODES),
  /** Detalhe livre opcional: NUNCA vai para a cadeia; fica em tabela expurgável. */
  detail: z.string().trim().max(500).optional(),
});

function consentError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof ConsentChainUnavailableError) {
    res.status(503).json({ success: false, error: 'Cadeia de consentimento indisponível.' });
    return;
  }
  next(err);
}

lgpdRouter.post(
  '/consentimentos',
  requireRole(['ADMIN', 'GESTOR']),
  (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      const parsed = consentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Payload inválido.' });
        return;
      }
      const { organizationId, id: actorId } = (req as AuthRequest).user;
      const event = await consentAuditChain.recordConsent({
        organizationId,
        operatorUserId: actorId,
        ...parsed.data,
      });
      res.status(201).json({ id: event.id, sequence: (event as { sequence?: number }).sequence });
    })().catch((err) => consentError(err, res, next));
  },
);

lgpdRouter.post(
  '/consentimentos/:subjectRef/revogacao',
  requireRole(['ADMIN', 'GESTOR']),
  (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      const parsed = revokeBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'reasonCode inválido.' });
        return;
      }
      const { organizationId, id: actorId } = (req as AuthRequest).user;
      const subjectRef = routeParam(req.params.subjectRef, 'subjectRef');
      const event = await consentAuditChain.revokeConsent(
        organizationId,
        subjectRef,
        parsed.data.reasonCode,
        actorId,
        { detail: parsed.data.detail },
      );
      await AuditService.log({
        action: 'UPDATE',
        entity: 'LGPD_CONSENT_REVOCATION',
        entityId: event.id,
        actorId,
        tenantId: organizationId,
        ipAddress: req.ip,
      });
      res.status(202).json({ id: event.id, purge: 'ENQUEUED' });
    })().catch((err) => consentError(err, res, next));
  },
);

lgpdRouter.get(
  '/consentimentos/verificacao',
  requireRole(['ADMIN', 'GESTOR']),
  (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      const { organizationId } = (req as AuthRequest).user;
      res.json(await consentAuditChain.verifyChainIntegrity(organizationId));
    })().catch((err) => consentError(err, res, next));
  },
);
