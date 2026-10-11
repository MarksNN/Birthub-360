import { NAV_HIDDEN_TABS, NAV_TAB_ALIASES, type TabType } from '../components/layout/tabMeta.js';

// Contrato de navegação entre ferramentas que disparam navegação fora do fluxo normal de clique
// (hoje: comando de voz — ver VoiceCommandWidget.tsx). Existe porque esse widget é montado em
// MainLayout, irmão da tela ativa (não descendente dela), então não tem acesso direto a nenhum
// estado de navegação local.
type Navigator = (tab: TabType) => void;

let activeNavigator: Navigator | null = null;

export const navigationBus = {
  registerNavigator(fn: Navigator | null) {
    activeNavigator = fn;
  },

  requestNavigation(tab: string): boolean {
    if (!isKnownTab(tab) || !activeNavigator) return false;
    // P0 #693 item 6: alias (dialer → cadence) navega pro destino real; módulos no gate
    // MODULE_NOT_READY (voice-hub/outbound) não são destino — reportar false é o ack honesto.
    const target = NAV_TAB_ALIASES[tab] ?? tab;
    if (NAV_HIDDEN_TABS.has(target)) return false;
    activeNavigator(target);
    return true;
  },
};

function isKnownTab(tab: string): tab is TabType {
  return Object.hasOwn(TAB_ROUTE_SET, tab);
}

const TAB_ROUTE_SET: Record<TabType, true> = {
  dashboard: true,
  workspace: true,
  companies: true,
  contacts: true,
  crm: true,
  activities: true,
  cadence: true,
  prospect: true,
  intelligence: true,
  'market-intelligence': true,
  chatbook: true,
  roleplay: true,
  qualification_matrix: true,
  objections_matrix: true,
  topic_training: true,
  bitrix: true,
  reports: true,
  integrations: true,
  knowledge: true,
  analytics: true,
  winloss: true,
  calendar: true,
  notifications: true,
  automations: true,
  usage: true,
  editor: true,
  team: true,
  settings: true,
  commercial_intelligence: true,
  copiloto_ia: true,
  crm360: true,
  propostas: true,
  'mesa-tratamento': true,
  'daily-plan': true,
  'sdr-diagnostic': true,
  'module-access': true,
  'voice-hub': true,
  outbound: true,
  dialer: true,
  forecast: true,
  metas: true,
  pipeline_ponderado: true,
  playbooks: true,
  jornadas: true,
  processos: true,
  roteiros: true,
  settings_hub: true,
  settings_market: true,
  settings_sales: true,
  settings_performance: true,
  settings_predictability: true,
  settings_ai: true,
  settings_automation: true,
  settings_engagement: true,
};
