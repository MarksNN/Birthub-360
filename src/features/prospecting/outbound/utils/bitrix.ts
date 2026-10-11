import type { User, IntegrationsConfig } from '../types.js';

// Decide qual webhook do Bitrix24 usar. Por padrão ('auto') segue a organização do
// usuário logado para o Bitrix da Birthub 360. 'totaltrac'/'birthhub360'/'custom' continuam disponíveis como
// substituição explícita para compatibilidade.
export function resolveBitrixWebhook(
  user: User | null | undefined,
  config: IntegrationsConfig | undefined,
): string {
  const target = config?.activeBitrixTarget || 'auto';

  if (target === 'custom') {
    return config?.customBitrixWebhook || '';
  }
  if (target === 'birthhub360') {
    return config?.bitrixAtlasGrWebhook || 'https://birthhub360.bitrix24.com.br/rest/';
  }
  if (target === 'totaltrac') {
    return config?.bitrixBirthhub360Webhook || '';
  }

  // 'auto'
  if (user?.company === 'atlas') {
    return config?.bitrixAtlasGrWebhook || 'https://birthhub360.bitrix24.com.br/rest/';
  }
  return config?.bitrixBirthhub360Webhook || '';
}
