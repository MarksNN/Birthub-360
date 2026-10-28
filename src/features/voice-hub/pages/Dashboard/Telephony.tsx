import { Download, Globe, Loader2, Music, Phone, Play, Shield } from 'lucide-react';
import { useState } from 'react';

export default function TelephonyPage() {
  const [musicPrompt, setMusicPrompt] = useState(
    'Uma música de elevador relaxante com toques de bossa nova, agradável e suave.',
  );
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState<string | null>(null);
  const [musicError, setMusicError] = useState<string | null>(null);

  const handleGenerateMusic = async () => {
    setIsGeneratingMusic(true);
    setMusicError(null);
    setGeneratedMusicUrl(null);

    try {
      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: musicPrompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar música');

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      setGeneratedMusicUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setMusicError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Telefonia & Números</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Phone className="h-4 w-4 text-brand" />
            Consulta e Compra de Números (DID)
          </h3>
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            A busca de números e a consulta de preços ainda não estão conectadas a um provedor.
            Nenhuma disponibilidade ou tarifa foi consultada nesta tela.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-600" />
              BYOC (Bring Your Own Carrier)
            </h3>
            <p className="text-xs text-slate-500 mb-4">Conecte seu próprio tronco SIP/Twilio.</p>
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Configuração de tronco SIP indisponível nesta tela. Nenhuma conexão será criada aqui.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              Compliance
            </h3>
            <p className="text-sm text-slate-600" role="status">
              Os estados de mascaramento e gravação devem ser conferidos nas configurações reais do
              provedor. Esta tela não consulta nem altera essas políticas.
            </p>
          </div>
        </div>
      </div>

      <h3 className="font-bold text-slate-800 mb-4 mt-8">Gerador de Música de Espera (URA)</h3>
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <p className="text-sm text-slate-600">
            Crie uma música de espera exclusiva para seus clientes usando Inteligência Artificial.
            Descreva o estilo, instrumentos e o clima desejado.
          </p>
          <textarea
            value={musicPrompt}
            onChange={(e) => setMusicPrompt(e.target.value)}
            className="w-full p-4 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand outline-none resize-none h-24"
            placeholder="Ex: Uma música calma de piano com violão, estilo corporativo acolhedor..."
          />
          {musicError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {musicError}
            </div>
          )}
          <button
            type="button"
            onClick={handleGenerateMusic}
            disabled={isGeneratingMusic || !musicPrompt.trim()}
            className="px-6 py-2 bg-brand text-white rounded-lg hover:opacity-90 font-medium flex items-center justify-center gap-2 disabled:opacity-50 w-full md:w-auto transition-opacity"
          >
            {isGeneratingMusic ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando música (pode levar 1-2
                minutos)...
              </>
            ) : (
              <>
                <Music className="h-4 w-4" /> Gerar Música (30s)
              </>
            )}
          </button>
        </div>

        <div className="w-full md:w-1/3 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
          {generatedMusicUrl ? (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Play className="h-4 w-4 text-green-600" /> Pré-visualização
              </h4>
              <audio src={generatedMusicUrl} controls className="w-full h-10" />
              <a
                href={generatedMusicUrl}
                download="musica_espera.wav"
                className="w-full py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" /> Baixar Áudio (.wav)
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 h-full gap-3 opacity-60">
              <Music className="h-8 w-8" />
              <span className="text-sm text-center">A música gerada aparecerá aqui</span>
            </div>
          )}
        </div>
      </div>

      <h3 className="font-bold text-slate-800 mb-4">Meus Números</h3>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="p-3">Número</th>
              <th className="p-3">Provedor</th>
              <th className="p-3">Destino (Webhook)</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td colSpan={4} className="p-6 text-center text-slate-600">
                Inventário de números ainda não integrado. Nenhuma consulta ao provedor foi
                realizada — não é possível confirmar números, webhooks ou status de ativação.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
