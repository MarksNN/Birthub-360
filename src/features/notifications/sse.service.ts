import type { Request, Response } from 'express';
import { logger } from '../../lib/logger.js';
import { connection, queuesEnabled } from '../../lib/queue/redis.js';

const clients = new Set<{ id: string; orgId: string; res: Response }>();

type AppNotification =
  | {
      type: 'voice-qualified';
      organizationId: string;
      leadId: string;
      message: string;
    }
  | {
      type: 'company-enriched';
      organizationId: string;
      companyId: string;
      message: string;
      fit?: { score: number; temperature: string };
    };

function deliverLocally(payload: AppNotification) {
  for (const client of clients) {
    if (client.orgId === payload.organizationId) {
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }
}

// Redis Pub/Sub é útil quando existem múltiplas instâncias/processos, mas é opcional.
// Quando ENABLE_QUEUES != true, não criamos subscriber nem tentamos conexão alguma;
// notificações SSE continuam funcionando dentro da própria instância via fallback local.
const subscriber = queuesEnabled ? connection.duplicate() : null;

if (subscriber) {
  subscriber.on('error', (err: any) => {
    logger.warn({ message: err.message }, 'Voice notification Redis subscriber unavailable');
  });

  void subscriber.subscribe('voice-notifications').catch((err: unknown) => {
    logger.warn(
      { message: err instanceof Error ? err.message : String(err) },
      'Could not subscribe to voice-notifications Redis channel',
    );
  });

  subscriber.on('message', (channel: string, message: string) => {
    if (channel !== 'voice-notifications') return;

    try {
      deliverLocally(JSON.parse(message) as AppNotification);
    } catch (err: any) {
      logger.warn(
        { message: err instanceof Error ? err.message : String(err) },
        'Invalid voice notification payload received from Redis',
      );
    }
  });
}

export const sseService = {
  addClient(req: Request, res: Response, organizationId: string) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now().toString();
    const client = { id: clientId, orgId: organizationId, res };
    clients.add(client);

    req.on('close', () => {
      clients.delete(client);
    });
  },

  notifyVoiceQualified(organizationId: string, leadId: string, message: string) {
    const payload: AppNotification = {
      type: 'voice-qualified',
      organizationId,
      leadId,
      message,
    };

    if (!queuesEnabled) {
      deliverLocally(payload);
      return;
    }

    void connection
      .publish('voice-notifications', JSON.stringify(payload))
      .catch((err: unknown) => {
        logger.warn(
          { message: err instanceof Error ? err.message : String(err) },
          'Could not publish voice notification through Redis; delivering locally',
        );
        deliverLocally(payload);
      });
  },

  notifyCompanyEnriched(
    organizationId: string,
    companyId: string,
    details?: { fit?: { score: number; temperature: string }; message?: string },
  ) {
    const payload: AppNotification = {
      type: 'company-enriched',
      organizationId,
      companyId,
      message:
        details?.message || 'Dados da empresa e pontuação de fit do lead enriquecidos com sucesso.',
      fit: details?.fit,
    };

    if (!queuesEnabled) {
      deliverLocally(payload);
      return;
    }

    void connection
      .publish('voice-notifications', JSON.stringify(payload))
      .catch((err: unknown) => {
        logger.warn(
          { message: err instanceof Error ? err.message : String(err) },
          'Could not publish company enrichment notification through Redis; delivering locally',
        );
        deliverLocally(payload);
      });
  },

  async closeAll() {
    for (const client of clients) {
      try {
        client.res.write('event: shutdown\ndata: {"message":"Server is shutting down"}\n\n');
        client.res.end();
      } catch {
        // Ignore errors on closing socket
      }
    }
    clients.clear();

    if (subscriber) {
      try {
        await subscriber.quit().catch(() => subscriber.disconnect());
      } catch {
        // Ignore subscriber quit error
      }
    }
  },
};
