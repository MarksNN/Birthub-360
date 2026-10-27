import type { PlaybookKey } from '../../../config/playbooks.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import type {
  AssistantHistoryMessage,
  AssistantHistoryRepository,
} from '../domain/AssistantHistory.js';

export class PrismaAssistantHistoryRepository implements AssistantHistoryRepository {
  async listRecent(
    organizationId: string,
    userId: string,
    brand: PlaybookKey,
    limit: number = 50,
  ): Promise<AssistantHistoryMessage[]> {
    const rows = await prisma.assistantMessage.findMany({
      where: { organizationId, userId, brand },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        brand: true,
        createdAt: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      brand: r.brand as PlaybookKey,
      createdAt: r.createdAt,
    }));
  }

  async appendTurn(
    organizationId: string,
    userId: string,
    brand: PlaybookKey,
    userText: string,
    assistantText: string,
  ): Promise<void> {
    try {
      await prisma.$transaction([
        prisma.assistantMessage.create({
          data: {
            organizationId,
            userId,
            brand,
            role: 'user',
            content: userText,
          },
        }),
        prisma.assistantMessage.create({
          data: {
            organizationId,
            userId,
            brand,
            role: 'assistant',
            content: assistantText,
          },
        }),
      ]);
    } catch (err: any) {
      logger.error(
        {
          organizationId,
          userId,
          brand,
          err,
        },
        'Failed to persist assistant history turn',
      );
    }
  }
}

export const prismaAssistantHistoryRepository = new PrismaAssistantHistoryRepository();
