import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/Button.js';
import { Dialog } from '../../../../components/ui/Dialog.js';
import { Skeleton } from '../../../../components/ui/Skeleton.js';
import { toast } from '../../../../lib/toast.js';
import { cadenceApi } from '../../cadence.api.js';
import type { CadenceJourneyTemplate } from '../../domain/cadenceTemplates.js';
import { CHANNEL_LABEL } from './constants.js';

export function JourneyTemplatesDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [instantiating, setInstantiating] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CadenceJourneyTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // GET /api/cadence/templates já existia, testado, mas o diálogo importava a mesma constante
  // diretamente do domínio backend em vez de chamar a API — mesmo padrão de rota órfã já
  // confirmado em Contacts/Companies/Activities (achado do Piloto 016).
  useEffect(() => {
    if (!isOpen || templates.length > 0) return;
    setLoadingTemplates(true);
    cadenceApi
      .templates()
      .then(setTemplates)
      .catch(() => toast.error('Falha ao carregar os modelos de jornada.'))
      .finally(() => setLoadingTemplates(false));
  }, [isOpen, templates.length]);

  const [seeding, setSeeding] = useState(false);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await cadenceApi.seedDefaultPlaybooks();
      toast.success(res.message || '3 playbooks padrão carregados com sucesso!');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error((err as Error).message || 'Falha ao carregar playbooks padrão.');
    } finally {
      setSeeding(false);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    setInstantiating(templateId);
    try {
      await cadenceApi.createSequenceFromTemplate(templateId);
      toast.success('Sequência de jornada criada com sucesso!');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error((err as Error).message || 'Falha ao criar sequência a partir do modelo');
    } finally {
      setInstantiating(null);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Modelos de Jornada Multicanal Prontos"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-brand/30 bg-brand/5">
          <div>
            <h4 className="text-xs font-bold text-ink">Playbooks de Cadência Padrão</h4>
            <p className="text-[11px] text-ink-2">
              Injete os 3 templates prontos (Outbound Frio Logística, Reativação de Perdidos e
              Passagem de Bastão SDR/Closer) para acelerar a ativação da equipe.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="cosmic"
            disabled={seeding}
            onClick={handleSeedDefaults}
            className="shrink-0"
          >
            {seeding ? 'Carregando Playbooks…' : 'Carregar 3 Playbooks Padrão'}
          </Button>
        </div>

        <p className="text-xs text-ink-2">
          Modelos estruturados de cadência prontos para uso imediato em campanhas de prospecção,
          inbound, reativação ou recuperação de negócios.
        </p>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {loadingTemplates ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            templates.map((tpl) => {
              const isExpanded = expandedTemplate === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className="rounded-xl border border-line bg-surface-2 p-4 space-y-3 transition-colors hover:border-brand/40"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-ink">{tpl.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-xs text-ink-2 mt-1">{tpl.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedTemplate(isExpanded ? null : tpl.id)}
                      >
                        {isExpanded ? 'Ocultar' : `Ver ${tpl.touches.length} Toques`}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={instantiating === tpl.id}
                        onClick={() => handleUseTemplate(tpl.id)}
                      >
                        {instantiating === tpl.id ? 'Criando…' : 'Usar Modelo'}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-line">
                      <span className="text-[11px] font-bold uppercase text-ink-2">
                        Roteiro de Toques da Jornada:
                      </span>
                      <div className="space-y-1.5">
                        {tpl.touches.map((t, touchIndex) => (
                          <div
                            // `order` não é único em todo template (achado real: dois toques com
                            // order 0 no mesmo roteiro geravam "two children with the same key");
                            // o índice desempata sem esconder o dado.
                            key={`${t.order}-${touchIndex}`}
                            className="p-2.5 rounded-xl bg-surface border border-line text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-ink">
                                Toque {t.order}: {t.stepTitle} ({CHANNEL_LABEL[t.channel]})
                              </span>
                              <span className="text-[10px] text-ink-2 font-mono">
                                +{t.delayHoursFromPrevious}h
                              </span>
                            </div>
                            <p className="text-[11px] text-ink-2 whitespace-pre-wrap">
                              {t.templateRef}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
