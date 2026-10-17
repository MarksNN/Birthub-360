import { api } from '../../lib/api.js';
import type {
  GenerateApproachInput,
  GeneratedApproachResult,
} from './domain/socialSelling.types.js';

export const socialSellingApi = {
  generateApproach: async (input: GenerateApproachInput): Promise<GeneratedApproachResult> => {
    const response = await api.post<
      { data?: GeneratedApproachResult; success?: boolean } & GeneratedApproachResult
    >('/api/social-selling/approach/generate', input);
    if ('headline' in response && response.headline) {
      return response;
    }
    if (response?.data?.headline) {
      return response.data;
    }
    throw new Error('Formato inválido retornado pelo serviço de Social Selling');
  },
};
