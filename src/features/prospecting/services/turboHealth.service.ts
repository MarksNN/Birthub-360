import { getPaidProspectingKey } from '../../../config/prospecting-integrations.js';
import { checkApolloConnection } from './apollo.service.js';
import { discoverViaCompanyCatalog } from './companyCatalogDiscovery.service.js';
export async function getTurboProviderHealth() {
  const apollo = await checkApolloConnection();
  const { getTurboAIProviderHealth } = await import('../../../lib/ai/turboSearch.js');
  const ai = await getTurboAIProviderHealth();
  const catalog = await discoverViaCompanyCatalog({
    segmento: '',
    localizacao: '',
    quantidade: 1,
  }).catch(() => ({ available: false }));
  return [
    {
      id: 'apollo',
      configured: apollo.configured,
      status: apollo.connected ? 'authenticated' : 'unavailable',
      message: apollo.connected
        ? 'Autenticação válida; acesso aos endpoints e créditos dependem do plano.'
        : 'Autenticação não validada',
      billable: true,
    },
    {
      id: 'googlePlaces',
      configured: !!getPaidProspectingKey('GOOGLE_MAPS_API_KEY'),
      status: 'not_validated',
      message: 'Teste de busca pode consumir créditos; configuração não comprova conexão.',
      billable: true,
    },
    {
      id: 'brasilapi',
      configured: true,
      status: 'not_validated',
      message: 'Consulta CNPJ disponível; disponibilidade validada por consulta explícita.',
      billable: false,
    },
    {
      id: 'cnpjDataset',
      configured: true,
      status: catalog.available ? 'ready' : 'unavailable',
      message: catalog.available
        ? 'Snapshot CNPJ publicado disponível para nome, CNAE principal e localização.'
        : 'Nenhum snapshot CNPJ publicado acessível nesta verificação.',
      billable: false,
    },
    {
      id: 'crawlee',
      configured: false,
      status: 'unavailable',
      message: 'Rastreamento não habilitado sem proteção de URLs, robots e termos.',
      billable: false,
    },
    {
      id: 'searxng',
      configured: !!process.env.SEARXNG_URL,
      status: 'not_validated',
      message: 'Descoberta complementar ainda não integrada ao motor.',
      billable: false,
    },
    ...ai,
  ];
}
