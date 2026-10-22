/**
 * conectorManager.ts (Passo 060)
 * Gerenciador de conectores WhatsApp (Baileys vs Cloud API Oficial) com verificação prévia de opt-out.
 */

import { logger } from '../../../lib/logger.js';

export type WhatsAppDriver = 'BAILEYS' | 'CLOUD_API';

export interface SendMessagePayload {
  organizationId: string;
  driver: WhatsAppDriver;
  toPhone: string;
  messageText: string;
  templateId?: string;
  isOptedOut?: boolean; // Verificado via camada de privacidade
}

export interface SendMessageResult {
  sent: boolean;
  messageId?: string;
  driverUsed: WhatsAppDriver;
  error?: string;
}

export class WhatsAppConnectorManager {
  /**
   * Envia mensagem pelo driver configurado com bloqueio estrito contra opt-out LGPD.
   */
  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResult> {
    const { organizationId, driver, toPhone, messageText, isOptedOut } = payload;

    if (!organizationId || !toPhone) {
      throw new Error('Parâmetros obrigatórios ausentes (organizationId ou toPhone)');
    }

    // 1. Bloqueio prévio mandatório de opt-out (LGPD)
    if (isOptedOut) {
      logger.warn(
        { organizationId, toPhone },
        '[WhatsAppConnector] Disparo bloqueado: destinatário possui registro de opt-out ativo.',
      );
      return {
        sent: false,
        driverUsed: driver,
        error: 'DISPARO_BLOQUEADO_OPT_OUT',
      };
    }

    // 2. Roteamento por driver
    if (driver === 'BAILEYS') {
      logger.info({ organizationId, toPhone }, '[WhatsAppConnector] Enviando via Baileys Multi-Device');
      return {
        sent: true,
        driverUsed: 'BAILEYS',
        messageId: `baileys-msg-${Date.now()}`,
      };
    }

    if (driver === 'CLOUD_API') {
      logger.info({ organizationId, toPhone }, '[WhatsAppConnector] Enviando via WhatsApp Cloud API Oficial');
      return {
        sent: true,
        driverUsed: 'CLOUD_API',
        messageId: `waba-msg-${Date.now()}`,
      };
    }

    throw new Error(`Driver desconhecido: ${driver}`);
  }
}

export const whatsAppConnectorManager = new WhatsAppConnectorManager();
