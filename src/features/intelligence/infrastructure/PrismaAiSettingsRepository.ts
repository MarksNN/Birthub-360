import { prisma } from '../../../lib/prisma.js';
import type { AiSettingInput, AiSettingItem, AiSettingsRepository } from '../domain/AiSettings.js';

export class PrismaAiSettingsRepository implements AiSettingsRepository {
  async listAll(): Promise<AiSettingItem[]> {
    return prisma.aiEngineSetting.findMany({
      orderBy: { toolKey: 'asc' },
    });
  }

  async saveMany(settings: AiSettingInput[]): Promise<AiSettingItem[]> {
    return prisma.$transaction(
      settings.map((s) =>
        prisma.aiEngineSetting.upsert({
          where: { toolKey: s.toolKey },
          update: {
            provider: s.provider,
            model: s.model,
            temperature: s.temperature,
            maxTokens: s.maxTokens,
            topP: s.topP,
          },
          create: {
            toolKey: s.toolKey,
            provider: s.provider,
            model: s.model,
            temperature: s.temperature,
            maxTokens: s.maxTokens,
            topP: s.topP,
          },
        }),
      ),
    );
  }
}

export const prismaAiSettingsRepository = new PrismaAiSettingsRepository();
