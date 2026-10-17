import { useState } from 'react';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Building2,
  User,
  Layers,
  Zap,
  Loader2,
  Share2,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';
import { Select } from '../../../components/ui/Select.js';
import { Badge } from '../../../components/ui/Badge.js';
import {
  socialSellingApi,
  type GeneratedApproachResult,
  type GenerateApproachInput,
  type SocialSellingTone,
} from '../api/socialSelling.api.js';

export function ApproachGeneratorCard() {
  const [formData, setFormData] = useState<GenerateApproachInput>({
    targetCompany: '',
    targetRole: '',
    segment: '',
    triggerEvent: '',
    channel: 'linkedin',
    tone: 'consultivo',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedApproachResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await socialSellingApi.generateApproach(formData);
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao gerar abordagem com IA';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.fullMessage) return;
    try {
      await navigator.clipboard.writeText(result.fullMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback sem crash
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
      {/* Formulário de Configuração */}
      <div className="lg:col-span-5 bg-surface rounded-2xl border border-line p-5 space-y-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Social Selling & IA Consultiva
          </div>
          <h2 className="text-base font-bold text-ink">Gerador de Abordagens</h2>
          <p className="text-xs text-ink-2">
            Crie copys personalizadas baseadas em gatilhos e cargos decisores para LinkedIn,
            WhatsApp e E-mail.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-ink-2" /> Empresa Alvo
            </label>
            <Input
              type="text"
              placeholder="Ex: Banco Neon, TOTVS, Logística Alfa"
              value={formData.targetCompany}
              onChange={(e) => setFormData({ ...formData, targetCompany: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-ink-2" /> Cargo do Decisor
            </label>
            <Input
              type="text"
              placeholder="Ex: Diretor Comercial, Head de RevOps"
              value={formData.targetRole}
              onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-ink-2" /> Segmento
              </label>
              <Input
                type="text"
                placeholder="Ex: Fintech, Saúde, SaaS"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-ink-2" /> Canal
              </label>
              <Select
                value={formData.channel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    channel: e.target.value as 'linkedin' | 'whatsapp' | 'email',
                  })
                }
              >
                <option value="linkedin">LinkedIn (InMail / Conexão)</option>
                <option value="whatsapp">WhatsApp (Direto / Curto)</option>
                <option value="email">Cold E-mail (Consultivo)</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-ink-2" /> Evento Gatilho / Contexto
            </label>
            <Input
              type="text"
              placeholder="Ex: Anúncio de rodada de investimento, novas contratações"
              value={formData.triggerEvent}
              onChange={(e) => setFormData({ ...formData, triggerEvent: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Tom de Voz</label>
            <Select
              value={formData.tone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tone: e.target.value as SocialSellingTone,
                })
              }
            >
              <option value="consultivo">Consultivo e Estratégico</option>
              <option value="executivo">Executivo e Conciso (C-Level)</option>
              <option value="provocativo">Provocativo (Desafio de Status Quo)</option>
              <option value="storytelling">Storytelling e Caso de Sucesso</option>
            </Select>
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-xs text-danger font-medium">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !formData.targetCompany || !formData.targetRole}
            className="w-full flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Estruturando Abordagem...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Gerar Abordagem com IA
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Card de Visualização do Resultado */}
      <div className="lg:col-span-7 bg-surface rounded-2xl border border-line p-5 flex flex-col justify-between shadow-sm">
        {result ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                  Abordagem Gerada
                </span>
                <h3 className="text-sm font-bold text-ink">{result.headline}</h3>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                  {result.channel}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Partes estruturadas */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-soft/40 border border-line/60">
                <div className="text-[10px] font-bold text-ink-2 uppercase tracking-wide mb-1">
                  Gancho Inicial (Hook)
                </div>
                <p className="text-xs text-ink leading-relaxed">{result.hook}</p>
              </div>

              <div className="p-3 rounded-xl bg-soft/40 border border-line/60">
                <div className="text-[10px] font-bold text-ink-2 uppercase tracking-wide mb-1">
                  Tese de Valor (Body)
                </div>
                <p className="text-xs text-ink leading-relaxed">{result.body}</p>
              </div>

              <div className="p-3 rounded-xl bg-soft/40 border border-line/60">
                <div className="text-[10px] font-bold text-ink-2 uppercase tracking-wide mb-1">
                  Chamada para Ação (CTA)
                </div>
                <p className="text-xs text-brand font-medium leading-relaxed">
                  {result.callToAction}
                </p>
              </div>
            </div>

            {/* Mensagem Completa */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-ink">Mensagem Completa para Envio:</div>
              <div className="p-4 bg-soft/60 rounded-xl border border-line text-xs text-ink whitespace-pre-wrap leading-relaxed select-all">
                {result.fullMessage}
              </div>
            </div>

            {/* Metadados FinOps */}
            <div className="pt-3 border-t border-line flex items-center justify-between text-[11px] text-ink-2">
              <div>
                Modelo: <span className="font-semibold text-ink">{result.modelUsed}</span>
              </div>
              <div>
                Tokens estimados:{' '}
                <span className="font-semibold text-ink">{result.estimatedTokens}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold text-ink">Nenhuma abordagem gerada ainda</h3>
              <p className="text-xs text-ink-2">
                Preencha os dados da empresa-alvo e o perfil do decisor à esquerda para que a IA
                elabore um roteiro consultivo personalizado.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
