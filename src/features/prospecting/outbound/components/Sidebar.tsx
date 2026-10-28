import type React from 'react';
import { useState } from 'react';
import {
  Database,
  ShieldCheck,
  Check,
  History,
  Trash2,
  ChevronUp,
  ChevronDown,
  Target,
  Info,
  Key,
  Terminal,
  Eye,
  Cpu,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { ThemeMode } from '../types.js';
import { BirthubLogo } from './BirthubLogo.js';
import { RecentSearchModal } from './RecentSearchModal.js';

interface SidebarProps {
  onNavigateTab: (tab: string) => void;
  integrationsConfig: {
    bitrixBirthhub360Webhook?: string;
    bitrixTotaltracWebhook?: string;
    activeBitrixTarget?: 'auto' | 'birthhub360' | 'totaltrac' | 'custom';
    googlePlacesApiKey?: string;
    apolloApiKey?: string;
    blandAiApiKey?: string;
    groqApiKey?: string;
    hunterApiKey?: string;
  };
  setIntegrationsConfig: React.Dispatch<React.SetStateAction<any>>;
  dbStats?: {
    campaignsCount: number;
    leadsCount: number;
    messagesCount: number;
  };
  theme: ThemeMode;
  onOpenBrandGuide: () => void;
  isOpenMobile?: boolean;
  setIsOpenMobile?: (open: boolean) => void;
  aiConfig?: any;
  setAiConfig?: React.Dispatch<React.SetStateAction<any>>;
  pitch?: string;
  setPitch?: (pitch: string) => void;
  googleApiKey?: string;
  setGoogleApiKey?: (key: string) => void;
  apolloApiKey?: string;
  setApolloApiKey?: (key: string) => void;
  ollamaStatus?: any;
  checkOllama?: () => void;
  isCheckingOllama?: boolean;
  recentSearches?: any[];
  onSelectRecentSearch?: (search: any) => void;
  onExecuteRecentSearch?: (search: any) => void;
  onDeleteRecentSearch?: (search: any) => void;
  onClearRecentSearches?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onNavigateTab,
  integrationsConfig,
  setIntegrationsConfig,
  dbStats,
  theme,
  onOpenBrandGuide,
  isOpenMobile = false,
  setIsOpenMobile = () => {},
  aiConfig = { groqModel: 'llama-3.3-70b-versatile', provider: 'gemini', temperature: 0.7 },
  setAiConfig = () => {},
  pitch = '',
  setPitch = () => {},
  googleApiKey: propGoogleApiKey = '',
  setGoogleApiKey: propSetGoogleApiKey = () => {},
  apolloApiKey: propApolloApiKey = '',
  setApolloApiKey: propSetApolloApiKey = () => {},
  ollamaStatus = { connected: true, model: 'llama3:latest' },
  checkOllama = () => {},
  isCheckingOllama = false,
  recentSearches = [],
  onSelectRecentSearch = () => {},
  onExecuteRecentSearch = () => {},
  onDeleteRecentSearch = () => {},
  onClearRecentSearches = () => {},
}) => {
  const isDark = theme === 'dark';
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPitchHelp, setShowPitchHelp] = useState(false);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState(propGoogleApiKey);
  const [apolloApiKey, setApolloApiKey] = useState(propApolloApiKey);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState<any>(null);

  const handleProviderChange = (e: any) => {
    const provider = e.target.value;
    setAiConfig((prev: any) => ({ ...prev, provider }));
  };
  const formatSearchTime = (_time: any) => 'Recente';
  const handleOpenSearchModal = (a: any, b?: any) => {
    const search = b !== undefined ? b : a;
    setModalSearch(search);
    setIsModalOpen(true);
  };

  const handleApplyToForm = (_search: any) => {};
  const handleApplyAndSearch = (_search: any) => {};
  const handleDeleteSearch = (_id: string) => {};

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.currentTarget.click();
            }
          }}
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-80 sm:w-88 border-r flex flex-col transition-all duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } overflow-y-auto ${
          isDark
            ? 'bg-[#0c121e]/95 border-slate-800/80 text-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.25)]'
            : 'bg-white/95 border-slate-200/80 text-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.03)]'
        } backdrop-blur-2xl`}
      >
        {/* Sidebar Header with Birth Hub 360 Identity */}
        <div
          className={`p-4 border-b sticky top-0 z-10 backdrop-blur ${
            isDark
              ? 'border-slate-800/80 bg-[#0c121e]/85'
              : 'border-slate-200/80 bg-white/90 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <BirthubLogo variant="with-subtitle" size="sm" theme={theme} />
            <button
              type="button"
              onClick={() => setIsOpenMobile(false)}
              className={`lg:hidden p-1.5 rounded-lg transition ${
                isDark
                  ? 'text-slate-400 hover:text-[#F8F9FF] hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              ✕
            </button>
          </div>
          <div
            className={`mt-2.5 flex items-center justify-between text-[11px] px-2 py-1 rounded border ${
              isDark
                ? 'text-slate-400 bg-slate-800/50 border-slate-800'
                : 'text-slate-600 bg-slate-100 border-slate-200'
            }`}
          >
            <span className="flex items-center gap-1 font-medium">
              <Terminal className="w-3.5 h-3.5 text-[var(--brand-primary)]" /> Streamlit & LLaMA3
            </span>
            <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
              v1.0 • PT-BR
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* SEÇÃO 0: BUSCAS RECENTES */}
          <div
            className={`space-y-2.5 p-3.5 rounded-xl border transition ${
              isDark
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700/80 shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
                : 'bg-white/90 hover:bg-white border-slate-200/80 hover:border-slate-300/80 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowRecentSearches(!showRecentSearches)}
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[var(--brand-primary)]"
              >
                <History className="w-3.5 h-3.5" />
                <span>Buscas Recentes</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {recentSearches.length}
                </span>
              </button>

              <div className="flex items-center gap-1">
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearRecentSearches}
                    title="Limpar histórico de buscas"
                    className="text-[10px] text-slate-400 hover:text-red-400 p-1 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowRecentSearches(!showRecentSearches)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  {showRecentSearches ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {showRecentSearches && (
              <div className="space-y-1.5 pt-1">
                {recentSearches.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-1">
                    Nenhuma busca recente gravada. Realize uma prospecção para salvar
                    automaticamente.
                  </p>
                ) : (
                  recentSearches.map((search) => (
                    <div
                      key={search.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.currentTarget.click();
                        }
                      }}
                      onClick={() => onSelectRecentSearch(search)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition border flex flex-col gap-1 group cursor-pointer ${
                        isDark
                          ? 'bg-slate-900/90 hover:bg-slate-850 hover:border-[var(--brand-primary)]/50 border-slate-800 text-slate-300'
                          : 'bg-slate-50 hover:bg-slate-100 hover:border-[var(--brand-primary)]/50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium text-xs leading-snug">
                        <span className="truncate pr-1 group-hover:text-[var(--brand-primary)] transition-colors font-semibold">
                          {search.query}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {formatSearchTime(search.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span className="text-emerald-500 font-medium">
                          {search.limit} {search.limit === 1 ? 'lead' : 'leads'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenSearchModal(e, search)}
                            title="Ver detalhes da busca"
                            className={`p-1 rounded transition flex items-center gap-1 ${
                              isDark
                                ? 'hover:bg-slate-800 text-slate-400 hover:text-[var(--brand-primary)]'
                                : 'hover:bg-slate-200 text-slate-500 hover:text-[var(--brand-primary)]'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detalhes</span>
                          </button>
                          <span className="text-[var(--brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                            Carregar ➔
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 1: MOTOR DE IA ... */}
          <div
            className={`space-y-3 p-3.5 rounded-xl border transition ${
              isDark
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700/80 shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
                : 'bg-white/90 hover:bg-white border-slate-200/80 hover:border-slate-300/80 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[var(--brand-primary)]" /> Motor de IA (LLM)
              </label>
              <button
                type="button"
                onClick={checkOllama}
                disabled={isCheckingOllama}
                title="Testar conexão com Ollama"
                className="text-[11px] text-[var(--brand-primary)] hover:text-[#FF8008] flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingOllama ? 'animate-spin' : ''}`} />
                Testar
              </button>
            </div>

            <div
              className={`grid grid-cols-3 gap-1 p-1 rounded-lg border text-xs ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => handleProviderChange('ollama')}
                className={`py-1.5 px-2 rounded-md font-semibold transition ${
                  aiConfig.provider === 'ollama'
                    ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Ollama
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('groq')}
                className={`py-1.5 px-2 rounded-md font-semibold transition ${
                  aiConfig.provider === 'groq'
                    ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Groq
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`py-1.5 px-2 rounded-md font-semibold transition ${
                  aiConfig.provider === 'gemini'
                    ? 'bg-[var(--brand-primary)] text-[#F8F9FF] shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Gemini
              </button>
            </div>

            {aiConfig.provider === 'ollama' && (
              <div className="space-y-2.5 pt-1 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                      URL Endpoint Ollama
                    </span>
                    <span className="text-[10px] text-slate-500">Localhost</span>
                  </div>
                  <input
                    type="text"
                    value={aiConfig.ollamaUrl}
                    onChange={(e) =>
                      setAiConfig((prev: any) => ({ ...prev, ollamaUrl: e.target.value }))
                    }
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs outline-none border focus:border-[var(--brand-primary)] ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                    placeholder="http://localhost:11434"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                      Modelo Ollama
                    </span>
                    <span className="text-[10px] text-[var(--brand-primary)] font-mono">
                      llama3
                    </span>
                  </div>
                  <input
                    type="text"
                    value={aiConfig.ollamaModel}
                    onChange={(e) =>
                      setAiConfig((prev: any) => ({ ...prev, ollamaModel: e.target.value }))
                    }
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none border focus:border-[var(--brand-primary)] ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                    placeholder="llama3"
                  />
                </div>

                <div
                  className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {ollamaStatus?.online ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className="truncate">
                      {ollamaStatus?.online
                        ? `Ollama Conectado (${ollamaStatus.latencyMs}ms)`
                        : 'Ollama Offline (Fallback ativo)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('terminal')}
                    className="text-[10px] text-[var(--brand-primary)] hover:underline shrink-0 font-medium"
                  >
                    Guia
                  </button>
                </div>
              </div>
            )}

            {aiConfig.provider === 'groq' && (
              <div className="space-y-2.5 pt-1 text-xs">
                <div>
                  <label className={`mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Groq API Key
                  </label>
                  <input
                    type="password"
                    value={aiConfig.groqApiKey}
                    onChange={(e) => {
                      setAiConfig((prev: any) => ({ ...prev, groqApiKey: e.target.value }));
                      setIntegrationsConfig((prev: any) => ({
                        ...prev,
                        groqApiKey: e.target.value,
                      }));
                    }}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none border focus:border-[var(--brand-primary)] ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                    placeholder="gsk_..."
                  />
                </div>
                <div>
                  <label className={`mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Modelo Groq
                  </label>
                  <select
                    value={aiConfig.groqModel}
                    onChange={(e) =>
                      setAiConfig((prev: any) => ({ ...prev, groqModel: e.target.value }))
                    }
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs outline-none border focus:border-[var(--brand-primary)] ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B Versatile</option>
                    <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                  </select>
                </div>
              </div>
            )}

            {aiConfig.provider === 'gemini' && (
              <div className="space-y-2 pt-1 text-xs">
                <div className="p-2 rounded-lg bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-[11px] text-[#FF8008]">
                  ✨ Motor Server-Side com Gemini 3.7 Flash ativo (sem necessidade de chave no
                  cliente).
                </div>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`w-full flex items-center justify-between text-[11px] py-1 ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <span>Hiperparâmetros (Temperatura)</span>
                {showAdvanced ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showAdvanced && (
                <div
                  className={`space-y-2 pt-2 text-xs border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                        Temperatura
                      </span>
                      <span className="font-mono text-[var(--brand-primary)] font-bold">
                        {aiConfig.temperature}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={aiConfig.temperature}
                      onChange={(e) =>
                        setAiConfig((prev: any) => ({
                          ...prev,
                          temperature: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-[var(--brand-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className={`space-y-2.5 p-3.5 rounded-xl border transition ${
              isDark
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700/80 shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
                : 'bg-white/90 hover:bg-white border-slate-200/80 hover:border-slate-300/80 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" /> Proposta de Valor
              </label>
              <button
                type="button"
                onClick={() => setShowPitchHelp(!showPitchHelp)}
                className="text-slate-400 hover:text-slate-200"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            {showPitchHelp && (
              <p
                className={`text-[11px] p-2 rounded border leading-relaxed ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                A proposta de valor é injetada nos prompts do LLaMA3 para gerar roteiros específicos
                de segurança logística e inteligência operacional.
              </p>
            )}

            <textarea
              rows={3}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className={`w-full rounded-lg px-2.5 py-2 text-xs outline-none resize-none leading-relaxed border focus:border-[var(--brand-primary)] ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
              placeholder="Descreva o que sua empresa oferece..."
            />
          </div>

          <div
            className={`space-y-2.5 p-3.5 rounded-xl border transition ${
              isDark
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700/80 shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
                : 'bg-white/90 hover:bg-white border-slate-200/80 hover:border-slate-300/80 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowIntegrations(!showIntegrations)}
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-left"
              >
                <Key className="w-3.5 h-3.5 text-[#FFC500]" />
                <span>Integrações & Conexões</span>
              </button>
              <button
                type="button"
                onClick={() => setShowIntegrations(!showIntegrations)}
                className="text-slate-400 hover:text-slate-200"
              >
                {showIntegrations ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div
                className={`p-1.5 rounded-lg border flex items-center justify-between ${
                  integrationsConfig.apolloApiKey
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <span>Apollo.io</span>
                <Check className="w-3 h-3" />
              </div>
              <div
                className={`p-1.5 rounded-lg border flex items-center justify-between ${
                  integrationsConfig.googlePlacesApiKey
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <span>Google Places</span>
                <Check className="w-3 h-3" />
              </div>
              <div
                className={`p-1.5 rounded-lg border flex items-center justify-between ${
                  integrationsConfig.bitrixBirthhub360Webhook
                    ? 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <span>Bitrix24 CRM</span>
                <Check className="w-3 h-3" />
              </div>
              <div
                className={`p-1.5 rounded-lg border flex items-center justify-between ${
                  integrationsConfig.hunterApiKey
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <span>Hunter.io</span>
                <Check className="w-3 h-3" />
              </div>
              <div
                className={`p-1.5 rounded-lg border flex items-center justify-between ${
                  integrationsConfig.blandAiApiKey
                    ? 'border-purple-500/30 bg-purple-500/10 text-purple-500'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <span>Bland AI (Voz)</span>
                <Check className="w-3 h-3" />
              </div>
              <div
                className={`p-1.5 rounded-lg border flex items-center justify-between ${
                  integrationsConfig.groqApiKey
                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-500'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <span>Groq LLaMA3</span>
                <Check className="w-3 h-3" />
              </div>
            </div>

            {showIntegrations && (
              <div className="space-y-2 pt-1">
                <div>
                  <label
                    className={`text-[11px] mb-1 flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                  >
                    <span>Destino Bitrix24 CRM</span>
                    <span className="text-[10px] text-[var(--brand-primary)] font-mono">
                      1-Click
                    </span>
                  </label>
                  <select
                    value={integrationsConfig.activeBitrixTarget}
                    onChange={(e) =>
                      setIntegrationsConfig((prev: any) => ({
                        ...prev,
                        activeBitrixTarget: e.target.value as any,
                      }))
                    }
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs outline-none border focus:border-[var(--brand-primary)] ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="auto">Automático (conforme sua marca)</option>
                    <option value="birthhub360">Birth Hub 360</option>
                    <option value="custom">Personalizado</option>
                  </select>
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    No modo automático, o lead vai para o Bitrix24 configurado para sua marca.
                  </p>
                </div>

                <div>
                  <label
                    className={`text-[11px] mb-1 flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                  >
                    <span>Google Places API Key</span>
                  </label>
                  <input
                    type="password"
                    value={googleApiKey}
                    onChange={(e) => {
                      setGoogleApiKey(e.target.value);
                      setIntegrationsConfig((prev: any) => ({
                        ...prev,
                        googlePlacesApiKey: e.target.value,
                      }));
                    }}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none border focus:border-[var(--brand-primary)] ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                    placeholder="AIzaSyC_B35BY..."
                  />
                </div>

                <div>
                  <label
                    className={`text-[11px] mb-1 flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                  >
                    <span>Apollo.io API Key</span>
                  </label>
                  <input
                    type="password"
                    value={apolloApiKey}
                    onChange={(e) => {
                      setApolloApiKey(e.target.value);
                      setIntegrationsConfig((prev: any) => ({
                        ...prev,
                        apolloApiKey: e.target.value,
                      }));
                    }}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none border focus:border-[var(--brand-primary)] ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                    placeholder="wZExKqNibGQ..."
                  />
                </div>
              </div>
            )}
          </div>

          <div
            className={`space-y-2 p-3.5 rounded-xl border transition ${
              isDark
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700/80 shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
                : 'bg-white/90 hover:bg-white border-slate-200/80 hover:border-slate-300/80 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[var(--brand-primary)]" /> Banco Relacional
              </label>
              <button
                type="button"
                onClick={() => onNavigateTab('database')}
                className="text-[10px] font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] underline"
              >
                SQL Explorer
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              <div
                className={`p-2 rounded-lg border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-[#F8F9FF]'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="font-bold">{dbStats?.campaignsCount ?? 0}</div>
                <div className="text-[9px] text-slate-400 uppercase">Campanhas</div>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-[#F8F9FF]'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="font-bold">{dbStats?.leadsCount ?? 0}</div>
                <div className="text-[9px] text-slate-400 uppercase">Leads</div>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-emerald-400'
                    : 'bg-slate-100 border-slate-200 text-emerald-600'
                }`}
              >
                <div className="font-bold">{dbStats?.messagesCount ?? 0}</div>
                <div className="text-[9px] text-slate-400 uppercase">Mensagens</div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center">
              SQLite Ativo • Persistência ACID em tempo real
            </p>
          </div>
        </div>

        <div
          className={`p-3 border-t flex items-center justify-between ${
            isDark
              ? 'border-slate-800/80 bg-[#0c121e]/90'
              : 'border-slate-200/80 bg-white/90 shadow-sm'
          }`}
        >
          <button
            type="button"
            onClick={onOpenBrandGuide}
            className={`flex items-center gap-1.5 text-xs transition font-medium ${
              isDark
                ? 'text-slate-300 hover:text-[var(--brand-primary)]'
                : 'text-slate-700 hover:text-[var(--brand-primary)]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
            <span>Manual da Marca Birth Hub 360</span>
          </button>
          <div className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]"
              title="Pantone 172 C"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC500]" title="Pantone 109 C" />
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#333333] border border-slate-600"
              title="Pantone 447 C"
            />
          </div>
        </div>
      </aside>

      <RecentSearchModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalSearch(null);
        }}
        search={modalSearch}
        onApplyToForm={handleApplyToForm}
        onApplyAndSearch={handleApplyAndSearch}
        onDeleteSearch={handleDeleteSearch}
        theme={theme}
      />
    </>
  );
};
