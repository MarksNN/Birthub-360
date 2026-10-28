import { AppError } from '../../../shared/middlewares/errorHandler.js';
import type {
  CreatePromptData,
  PromptEntity,
  PromptRepository,
  UpdatePromptData,
} from '../domain/Prompt.js';
import { prismaPromptRepository } from '../infra/PrismaPromptRepository.js';

export type { CreatePromptData, PromptEntity, PromptRepository, UpdatePromptData };

export interface CreatePromptInput {
  name: string;
  category: string;
  content: string;
  variables?: Record<string, unknown>;
}

export class PromptService {
  constructor(private readonly repository: PromptRepository = prismaPromptRepository) {}

  async listPrompts(organizationId: string): Promise<PromptEntity[]> {
    return this.repository.listByOrganization(organizationId);
  }

  async getPromptById(organizationId: string, id: string): Promise<PromptEntity> {
    const prompt = await this.repository.findById(organizationId, id);
    if (!prompt) {
      throw new AppError('Prompt não encontrado.', 404);
    }
    return prompt;
  }

  async getPromptByCategory(
    organizationId: string,
    category: string,
  ): Promise<PromptEntity | null> {
    return this.repository.findByCategory(organizationId, category);
  }

  async createPrompt(organizationId: string, input: CreatePromptInput): Promise<PromptEntity> {
    const name = input.name?.trim();
    if (!name) {
      throw new AppError('Nome do prompt é obrigatório.', 400);
    }
    const category = input.category?.trim();
    if (!category) {
      throw new AppError('Categoria do prompt é obrigatória.', 400);
    }
    const content = input.content?.trim();
    if (!content) {
      throw new AppError('Conteúdo do prompt é obrigatório.', 400);
    }

    return this.repository.create({
      organizationId,
      name,
      category,
      content,
      variables: input.variables ?? {},
    });
  }

  async updatePrompt(
    organizationId: string,
    id: string,
    input: Partial<CreatePromptInput>,
  ): Promise<PromptEntity> {
    const updated = await this.repository.update(organizationId, id, input);
    if (!updated) {
      throw new AppError('Prompt não encontrado para atualização.', 404);
    }
    return updated;
  }

  async deletePrompt(organizationId: string, id: string): Promise<void> {
    const deleted = await this.repository.deleteById(organizationId, id);
    if (!deleted) {
      throw new AppError('Prompt não encontrado.', 404);
    }
  }
}

export const promptService = new PromptService();

export function listPrompts(organizationId: string) {
  return promptService.listPrompts(organizationId);
}

export function createPrompt(organizationId: string, input: CreatePromptInput) {
  return promptService.createPrompt(organizationId, input);
}

export function updatePrompt(
  organizationId: string,
  id: string,
  input: Partial<CreatePromptInput>,
) {
  return promptService.updatePrompt(organizationId, id, input);
}

export function deletePrompt(organizationId: string, id: string) {
  return promptService.deletePrompt(organizationId, id);
}

export function getPrompt(organizationId: string, id: string) {
  return promptService.getPromptById(organizationId, id);
}

export function updatePromptVariables(
  organizationId: string,
  id: string,
  variables: Record<string, unknown>,
) {
  return promptService.updatePrompt(organizationId, id, { variables });
}
