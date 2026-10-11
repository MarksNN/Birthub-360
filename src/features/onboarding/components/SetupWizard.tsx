import type React from 'react';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { PRODUCT_MODULES } from '../../../config/product-modules.js';
import {
  setOrganizationModulesCache,
  useOrganizationModules,
} from '../../../hooks/useOrganizationModules.js';
import {
  describeOrganizationModulesError,
  organizationModulesApi,
} from '../organizationModules.api.js';
import {
  Settings,
  LayoutTemplate,
  Search,
  Mic,
  Radar,
  Globe,
  Cpu,
  Check,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  Settings: <Settings className="w-8 h-8" />,
  LayoutTemplate: <LayoutTemplate className="w-8 h-8" />,
  Search: <Search className="w-8 h-8" />,
  Mic: <Mic className="w-8 h-8" />,
  Radar: <Radar className="w-8 h-8" />,
  Globe: <Globe className="w-8 h-8" />,
  Cpu: <Cpu className="w-8 h-8" />,
};

export function SetupWizard() {
  const [step, setStep] = useState(1);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set(['crm-comercial']));
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    data: modulesView,
    error: loadError,
    isLoading: isLoadingModules,
    reload,
  } = useOrganizationModules();

  // Pré-seleciona o que a org já salvou (configured:true). Org sem save mantém só o obrigatório.
  useEffect(() => {
    if (modulesView?.configured) {
      setSelectedModules(new Set(['crm-comercial', ...modulesView.activeModules]));
    }
  }, [modulesView]);

  const toggleModule = (key: string) => {
    const next = new Set(selectedModules);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedModules(next);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      // P0 #693: set completo num único PUT (contrato do Agente 01), sem loop de POSTs.
      await organizationModulesApi.setAll(Array.from(selectedModules));
      const view = await organizationModulesApi.completeOnboarding();
      if (view && typeof view === 'object' && 'modules' in view) {
        setOrganizationModulesCache(view);
      }
      window.location.href = '/app';
    } catch (err) {
      // Erro visível na tela (antes: só console.error e o botão voltava sem explicação).
      setSaveError(describeOrganizationModulesError(err));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full">
        {/* Header do Wizard */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-ink mb-2">Bem-vindo(a) ao Birth Hub 360</h1>
          <p className="text-ink-2">Configure os módulos que sua organização vai utilizar.</p>
        </div>

        {loadError && (
          <div
            role="alert"
            className="mb-8 flex gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-left"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-ink">Não foi possível carregar os módulos</p>
              <p className="text-ink-2 mt-1">{loadError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" /> Tentar novamente
            </Button>
          </div>
        )}

        {isLoadingModules && !loadError && (
          <p className="mb-8 text-center text-sm text-ink-2" aria-live="polite">
            Carregando módulos da organização...
          </p>
        )}

        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRODUCT_MODULES.map((mod) => (
                <Card
                  key={mod.key}
                  padding="lg"
                  variant="bento"
                  spotlight
                  soundHover
                  soundClick
                  className={`cursor-pointer transition-all border relative active:scale-95 group/mod ${mod.alwaysActive ? 'opacity-70 pointer-events-none' : ''} ${selectedModules.has(mod.key) || mod.alwaysActive ? 'border-brand shadow-[0_8px_32px_-12px_rgba(212,175,55,0.4)]' : 'border-line hover:border-brand/40'}`}
                  onClick={() => !mod.alwaysActive && toggleModule(mod.key)}
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand/40 to-transparent opacity-0 group-hover/mod:opacity-100 transition-opacity duration-700 z-20"
                    aria-hidden="true"
                  />
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 relative z-30 ${mod.colorTheme}`}
                  >
                    {iconMap[mod.iconName] || <Settings />}
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-2">{mod.label}</h3>
                  <p className="text-sm text-ink-2">{mod.description}</p>

                  {(selectedModules.has(mod.key) || mod.alwaysActive) && (
                    <div className="absolute top-4 right-4 text-brand">
                      <Check className="w-6 h-6" />
                    </div>
                  )}
                  {mod.alwaysActive && (
                    <div className="mt-4 text-xs font-semibold text-ink-2 uppercase tracking-wide">
                      Módulo Base Obrigatório
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-8 border-t border-line">
              <Button
                onClick={() => setStep(2)}
                size="lg"
                soundClick
                className="bg-brand text-on-brand hover:bg-brand-active active:scale-95 transition-all shadow-md"
              >
                Continuar <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in text-center max-w-xl mx-auto space-y-8">
            <div className="w-24 h-24 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-ink">Confirmar configuração</h2>
            <p className="text-ink-2 text-lg">
              Você selecionou {selectedModules.size}{' '}
              {selectedModules.size === 1 ? 'módulo' : 'módulos'}. A configuração só é gravada
              quando você confirmar abaixo; depois, poderá alterá-la na aba de Administração.
            </p>

            {saveError && (
              <div
                role="alert"
                className="flex gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-left"
              >
                <AlertTriangle
                  className="w-5 h-5 shrink-0 mt-0.5 text-red-600"
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <p className="font-semibold text-ink">Configuração não foi salva</p>
                  <p className="text-ink-2 mt-1">{saveError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4 pt-8">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                size="lg"
                soundClick
                className="active:scale-95 transition-all"
              >
                Voltar
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                size="lg"
                soundClick
                className="bg-brand text-on-brand hover:bg-brand-active shadow-xl shadow-brand/20 active:scale-95 transition-all"
              >
                {isLoading
                  ? 'Salvando...'
                  : saveError
                    ? 'Tentar salvar novamente'
                    : 'Salvar e ir para o Dashboard'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
