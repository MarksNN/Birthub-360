/**
 * mobileFieldMeeting.routes.ts
 *
 * Rotas de conciliação mobile de reuniões de campo com o Copiloto IA (Capacidade 6 - Mobile).
 */

import { Router } from 'express';
import { COPILOTO_IA_ROLES } from '../../../lib/auth/authorization.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import type { FieldMeetingAudioPayload } from '../offlineSync.service.js';
import { mobileFieldMeetingService } from './mobileFieldMeeting.service.js';

const router = Router();

// Aplica autorização por papel compatível com funções comerciais e de copiloto
router.use(requireRole([...COPILOTO_IA_ROLES]));

/**
 * POST /api/mobile/field-meetings/sync
 * Ponto de entrada chamado pelo OfflineSyncService ao restabelecer conectividade.
 */
router.post('/field-meetings/sync', async (req, res, next) => {
  try {
    const { organizationId, id: userId } = (req as AuthRequest).user;
    const body = req.body as FieldMeetingAudioPayload;

    const result = await mobileFieldMeetingService.syncFieldMeeting(
      organizationId,
      body,
      userId,
      req.ip,
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export const mobileFieldMeetingRoutes = router;
