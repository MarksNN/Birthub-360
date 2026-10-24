import { prisma } from '../../../../lib/prisma.js';

export interface BitrixSettings {
  webhookUrl: string | null;
  enabled: boolean;
}

export async function getBitrixSettings(organizationId: string): Promise<BitrixSettings> {
  const connection = await prisma.bitrixConnection.findFirst({
    where: { organizationId },
    select: { webhookUrl: true },
    orderBy: { createdAt: 'desc' },
  });

  const webhookUrl = connection?.webhookUrl || process.env.BITRIX24_WEBHOOK_URL || null;

  return {
    webhookUrl,
    enabled: Boolean(webhookUrl),
  };
}
