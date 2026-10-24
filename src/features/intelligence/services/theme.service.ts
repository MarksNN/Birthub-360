import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';

/**
 * Gestão de Temas (Dark Mode, Custom Themes)
 */

export interface UserTheme {
  userId: string;
  organizationId: string;
  mode: 'light' | 'dark' | 'auto';
  customTheme: string | null;
}

export async function getUserTheme(userId: string, organizationId: string): Promise<UserTheme> {
  const theme = await prisma.userTheme.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });

  return theme || {
    userId,
    organizationId,
    mode: 'light',
    customTheme: null,
  };
}

export async function setUserTheme(params: {
  userId: string;
  organizationId: string;
  mode: 'light' | 'dark' | 'auto';
  customTheme?: string;
}): Promise<void> {
  await prisma.userTheme.upsert({
    where: { userId_organizationId: { userId: params.userId, organizationId: params.organizationId } },
    create: {
      userId: params.userId,
      organizationId: params.organizationId,
      mode: params.mode,
      customTheme: params.customTheme || null,
    },
    update: {
      mode: params.mode,
      customTheme: params.customTheme || null,
    },
  });

  logger.info({ userId: params.userId, mode: params.mode }, '[Theme] Tema atualizado');
}
