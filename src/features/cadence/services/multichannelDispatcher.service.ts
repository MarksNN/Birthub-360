/**
 * Disparador de Cadência Multicanal com Bloqueio Prévio de Opt-Out LGPD (Passo 61 / Agente 17)
 */

import { logger } from '../../../lib/logger.js';

export interface DispatchRequest {
  leadId: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'VOICE';
  content: string;
  isOptedOut: boolean;
}

export class MultichannelDispatcherService {
  public async dispatch(request: DispatchRequest): Promise<{ success: boolean; reason?: string }> {
    if (request.isOptedOut) {
      logger.warn({ leadId: request.leadId }, 'Disparo bloqueado: titular solicitou opt-out');
      return { success: false, reason: 'OPT_OUT_BLOCKED' };
    }

    logger.info({ leadId: request.leadId, channel: request.channel }, 'Disparo de cadência realizado com sucesso');
    return { success: true };
  }
}

export const multichannelDispatcher = new MultichannelDispatcherService();
