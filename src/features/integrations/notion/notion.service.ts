import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

export interface NotionConnection {
  id: string;
  organizationId: string;
  label: string;
  apiKey: string;
  databaseId: string;
  createdAt: Date;
}

export async function createNotionConnection(params: {
  organizationId: string;
  label: string;
  apiKey: string;
  databaseId: string;
}): Promise<NotionConnection> {
  const connection = await (prisma as any).notionConnection.create({ data: params });
  logger.info({ organizationId: params.organizationId }, '[Notion] Conexão criada');
  return connection;
}

export async function createNotionPage(params: {
  connectionId: string;
  title: string;
  content: string;
}): Promise<{ success: boolean; pageId?: string }> {
  // Em produção, chamaria API real do Notion
  return { success: true, pageId: 'notion-' + Date.now() };
}
