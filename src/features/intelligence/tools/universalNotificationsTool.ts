import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/context.js';
import { integrationSettingsRepository } from '../../../lib/integrations/integrationSettings.repository.js';
import { logger } from '../../../lib/logger.js';
import { validateWebhookUrl } from '../../../lib/security/url-validator.js';
import { notificationService } from '../../notifications/notification.service.js';
import { sseService } from '../../notifications/sse.service.js';
import { reconfigurationPayload } from './integrationConfigState.js';

/**
 * Dispatcher Universal de Notificações Multi-Dispositivo:
 * - Pop-up / Toast em tempo real na plataforma (In-App Notification + SSE stream)
 * - Notificação Push no Celular (Android Capacitor / iOS / WebPush / FCM / ntfy)
 * - Notificação no Relógio / Smartwatch (Apple Watch / WearOS com resumo curto de pulso e vibração háptica)
 * - Alerta via Mensagem de Texto (SMS) para urgências críticas
 */
export const universalNotificationsTool = new DynamicStructuredTool({
  name: 'universal_notifications_dispatcher',
  description:
    'Dispara alertas e notificações em múltiplos dispositivos simultaneamente: Pop-up/Toast na tela do sistema, Push no Celular (Android/iOS), Notificação compacta no Relógio (Smartwatch Apple Watch/WearOS) e SMS de urgência.',
  schema: z.object({
    channels: z
      .array(z.enum(['in_app_popup', 'mobile_push', 'smartwatch_wrist', 'sms_alert']))
      .min(1)
      .default(['in_app_popup', 'mobile_push', 'smartwatch_wrist'])
      .describe('Canais e dispositivos onde a notificação deve ser entregue.'),
    title: z.string().min(2).max(120).describe('Título do alerta.'),
    message: z.string().min(2).max(1000).describe('Mensagem completa da notificação.'),
    wristSummary: z
      .string()
      .max(65)
      .optional()
      .describe(
        'Texto ultra-curto (até 65 caracteres) otimizado para leitura rápida na tela do relógio (Smartwatch).',
      ),
    kind: z
      .enum(['Info', 'Success', 'Warning', 'Alert'])
      .default('Info')
      .describe('Severidade visual da notificação.'),
    userId: z
      .string()
      .optional()
      .describe('ID do usuário destinatário (vazio envia para toda a equipe da organização).'),
    leadId: z.string().optional().describe('ID do lead associado ao alerta (opcional).'),
  }),
  func: async ({ channels, title, message, wristSummary, kind, userId, leadId }) => {
    try {
      const organizationId = getTenantId();
      if (!organizationId) {
        return JSON.stringify({ error: 'Contexto de organização (tenant) ausente.' });
      }

      const deliveries: Record<string, unknown> = {};

      // 1. In-App Pop-up / Sino + Stream SSE em tempo real
      if (channels.includes('in_app_popup')) {
        const created = await notificationService.create({
          organizationId,
          title,
          body: message,
          kind,
          entity: leadId ? 'lead' : 'swarm',
          entityId: leadId ?? null,
          userId: userId ?? null,
        });

        if (leadId) {
          sseService.notifyVoiceQualified(organizationId, leadId, `${title}: ${message}`);
        }

        deliveries.in_app_popup = {
          delivered: Boolean(created?.id),
          notificationId: created?.id ?? null,
          realtimePopupSseTriggered: Boolean(leadId),
        };
      }

      // 2. Push no Celular (Android Capacitor / iOS / FCM / Webhook Push gateway) + Relógio (Smartwatch)
      if (channels.includes('mobile_push') || channels.includes('smartwatch_wrist')) {
        const compactGlance = (wristSummary || `${title}: ${message}`).slice(0, 65);
        // URL do gateway (secret no catálogo — tópico ntfy é capability URL) decifrada só para o
        // fetch; nunca entra em `deliveries` (que volta para o LLM).
        // Ilegível ≠ não configurado: sem fetch e com aviso de reconfiguração (falha fechada).
        const push = await integrationSettingsRepository.lookup(organizationId, 'push_wearables');
        const pushWebhookUrl =
          push.state === 'configured' ? (push.values.webhookUrl?.trim() ?? '') : '';

        const wearablePayload = {
          title,
          body: message,
          smartwatchGlanceText: compactGlance,
          hapticPattern:
            kind === 'Alert' || kind === 'Warning' ? 'urgent-double-pulse' : 'gentle-tap',
          androidWearOsBridged: true,
          appleWatchShortLookTitle: title.slice(0, 32),
          entityId: leadId ?? null,
        };

        let remotePushDispatched = false;
        if (pushWebhookUrl) {
          try {
            await validateWebhookUrl(pushWebhookUrl);
            const res = await fetch(pushWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(wearablePayload),
              signal: AbortSignal.timeout(8000),
            });
            remotePushDispatched = res.ok;
          } catch (err) {
            logger.warn(
              { err },
              'Push gateway externo indisponível; mantendo notificação sincronizada via app.',
            );
          }
        }

        if (channels.includes('mobile_push')) {
          deliveries.mobile_push = {
            queuedForMobileApp: true,
            remotePushGatewayDispatched: remotePushDispatched,
            priority: kind === 'Alert' ? 'high' : 'normal',
            ...(push.state === 'unreadable'
              ? { remotePushGateway: reconfigurationPayload('push_wearables', push.message) }
              : {}),
          };
        }

        if (channels.includes('smartwatch_wrist')) {
          deliveries.smartwatch_wrist = {
            queuedForWearable: true,
            glanceText: compactGlance,
            hapticPattern: wearablePayload.hapticPattern,
          };
        }
      }

      // 3. Alerta SMS se solicitado
      if (channels.includes('sms_alert')) {
        // Estado por campo (`fields`), nunca `masked`: a máscara de ilegível é string não vazia.
        const smsStatus = await integrationSettingsRepository.getStatus(organizationId, 'sms');
        deliveries.sms_alert = {
          gatewayConfigured: smsStatus.configured && smsStatus.fields.webhookUrl === 'set',
          ...(smsStatus.unreadable
            ? {
                gatewayUnreadable: true,
                acao: 'Credenciais de SMS ilegíveis — reconfigure a integração no Hub Universal.',
              }
            : {}),
          textPreview: `[BirthHub 360] ${title}: ${message}`.slice(0, 160),
        };
      }

      return JSON.stringify(
        {
          success: true,
          title,
          channelsDispatched: channels,
          deliveries,
        },
        null,
        2,
      );
    } catch (error) {
      logger.error({ error, channels, title }, 'Erro em universalNotificationsTool');
      return JSON.stringify({
        error: 'Falha ao disparar notificações multi-dispositivo.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
