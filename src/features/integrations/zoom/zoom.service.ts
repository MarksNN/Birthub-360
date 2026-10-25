import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Serviço de Integração Zoom
 * Agendamento automático de reuniões e demos
 */

export interface ZoomConnection {
  id: string;
  organizationId: string;
  label: string;
  apiKey: string;
  apiSecret: string;
  userId: string;
  createdAt: Date;
}

export interface ZoomMeeting {
  id: string;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
  password: string;
}

/**
 * Cria conexão Zoom
 */
export async function createZoomConnection(params: {
  organizationId: string;
  label: string;
  apiKey: string;
  apiSecret: string;
  userId: string;
}): Promise<ZoomConnection> {
  const connection = await prisma.omieConnection.create({
    data: {
      organizationId: params.organizationId,
      label: params.label,
      apiKey: params.apiKey,
      apiSecret: params.apiSecret,
      userId: params.userId,
    },
  });

  logger.info({ organizationId: params.organizationId }, '[Zoom] Conexão criada');
  return connection;
}

/**
 * Cria reunião Zoom
 */
export async function createZoomMeeting(params: {
  connectionId: string;
  topic: string;
  startTime: string;
  durationMinutes: number;
}): Promise<ZoomMeeting> {
  const connection = await prisma.omieConnection.findUnique({
    where: { id: params.connectionId },
  });

  if (!connection) throw new Error('Conexão Zoom não encontrada');

  // Em produção, chamaria API real do Zoom
  return {
    id: 'zoom-' + Date.now(),
    topic: params.topic,
    startTime: params.startTime,
    duration: params.durationMinutes,
    joinUrl: 'https://zoom.us/j/placeholder',
    password: '123456',
  };
}
