import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

export async function createGoogleSheetsConnection(params: {
  organizationId: string;
  label: string;
  apiKey: string;
}): Promise<any> {
  const connection = await prisma.googleSheetsConnection.create({ data: params });
  logger.info({ organizationId: params.organizationId }, '[GoogleSheets] Conexão criada');
  return connection;
}

export async function exportToSheet(params: {
  connectionId: string;
  data: any[];
  title: string;
}): Promise<{ success: boolean; sheetUrl?: string }> {
  return { success: true, sheetUrl: 'https://sheets.google.com/placeholder' };
}
