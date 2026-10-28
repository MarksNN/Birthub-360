import { AppError } from '../../../shared/middlewares/errorHandler.js';
import type {
  SavedViewEntity,
  SavedViewFilters,
  SavedViewRepository,
} from '../domain/SavedView.js';
import { prismaSavedViewRepository } from '../infra/PrismaSavedViewRepository.js';

export type { SavedViewEntity, SavedViewFilters, SavedViewRepository };

const VALID_FUNNELS = new Set(['Lead', 'Negocio']);

export class SavedViewService {
  constructor(private readonly repository: SavedViewRepository = prismaSavedViewRepository) {}

  async listSavedViews(organizationId: string, userId: string): Promise<SavedViewEntity[]> {
    return this.repository.listByUser(organizationId, userId);
  }

  async createSavedView(
    organizationId: string,
    userId: string,
    input: { name?: string; funnel?: string; filters?: SavedViewFilters },
  ): Promise<SavedViewEntity> {
    const name = input.name?.trim();
    if (!name) {
      throw new AppError('Nome da view é obrigatório.', 400);
    }
    if (!input.funnel || !VALID_FUNNELS.has(input.funnel)) {
      throw new AppError('Funil inválido — use "Lead" ou "Negocio".', 400);
    }

    return this.repository.create({
      organizationId,
      userId,
      name,
      funnel: input.funnel,
      filters: input.filters ?? {},
    });
  }

  async deleteSavedView(organizationId: string, userId: string, id: string): Promise<void> {
    const count = await this.repository.deleteById(organizationId, userId, id);
    if (count === 0) {
      throw new AppError('View não encontrada.', 404);
    }
  }
}

export const savedViewService = new SavedViewService();

export function listSavedViews(organizationId: string, userId: string) {
  return savedViewService.listSavedViews(organizationId, userId);
}

export function createSavedView(
  organizationId: string,
  userId: string,
  input: { name?: string; funnel?: string; filters?: SavedViewFilters },
) {
  return savedViewService.createSavedView(organizationId, userId, input);
}

export async function deleteSavedView(organizationId: string, userId: string, id: string) {
  return savedViewService.deleteSavedView(organizationId, userId, id);
}
