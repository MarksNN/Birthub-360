import { describe, expect, it } from 'vitest';
import {
  WhatsAppConnectorManager,
  type SendMessagePayload,
} from '../../../../src/features/integrations/whatsapp/conectorManager.js';

describe('WhatsAppConnectorManager (Passo 060)', () => {
  const manager = new WhatsAppConnectorManager();
  const orgId = 'org-whatsapp-test';

  it('deve enviar mensagem com sucesso via driver BAILEYS', async () => {
    const payload: SendMessagePayload = {
      organizationId: orgId,
      driver: 'BAILEYS',
      toPhone: '5511999998888',
      messageText: 'Olá! Podemos falar sobre sua operação?',
    };

    const res = await manager.sendMessage(payload);
    expect(res.sent).toBe(true);
    expect(res.driverUsed).toBe('BAILEYS');
    expect(res.messageId).toBeDefined();
  });

  it('deve enviar mensagem com sucesso via driver CLOUD_API oficial', async () => {
    const payload: SendMessagePayload = {
      organizationId: orgId,
      driver: 'CLOUD_API',
      toPhone: '5511999997777',
      messageText: 'Template oficial de notificação',
      templateId: 'lead_followup_v1',
    };

    const res = await manager.sendMessage(payload);
    expect(res.sent).toBe(true);
    expect(res.driverUsed).toBe('CLOUD_API');
    expect(res.messageId).toContain('waba-msg');
  });

  it('deve bloquear disparo imediatamente se o lead estiver em opt-out LGPD', async () => {
    const payload: SendMessagePayload = {
      organizationId: orgId,
      driver: 'CLOUD_API',
      toPhone: '5511988887777',
      messageText: 'Tentativa para contato que solicitou opt-out',
      isOptedOut: true,
    };

    const res = await manager.sendMessage(payload);
    expect(res.sent).toBe(false);
    expect(res.error).toBe('DISPARO_BLOQUEADO_OPT_OUT');
  });
});
