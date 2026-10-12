import { AnimatePresence, motion } from 'framer-motion';
import { Check, Command, Mic, Sparkles, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playbookInfo } from '../../config/playbooks.js';
import { useActivePlaybook } from '../../hooks/useActivePlaybook.js';
import { clientLogger } from '../../lib/clientLogger.js';
import { navigationBus } from '../../lib/navigationBus.js';
import { SoundFX } from '../../lib/soundEffects.js';
import { toast } from '../../lib/toast.js';
import { voiceCommandBus } from '../../lib/voiceCommandBus.js';

// SpeechRecognitionLike / Window.SpeechRecognition são tipos ambient globais definidos em
// src/types/speech-recognition.d.ts (Web Speech API não faz parte da lib "DOM" do TypeScript).

export function VoiceCommandWidget() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);
  const { setPlaybook } = useActivePlaybook();

  // `stopListening` é declarado abaixo deste efeito (TDZ) — incluí-lo no array quebraria com
  // "used before declaration"; o efeito só constrói o objeto `recognition` uma vez no mount e os
  // handlers fecham sobre o binding real de `stopListening`, resolvido só quando disparados.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentário acima
  useEffect(() => {
    // Inicializa Web Speech API se suportado pelo navegador
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'pt-BR';

      rec.onresult = (event) => {
        const currentText = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');

        setTranscript(currentText);

        // Processamento de Comandos de Voz em Português. `navigateOrReportFailure` só anuncia
        // sucesso quando `navigationBus.requestNavigation` confirma que a navegação foi
        // realmente disparada (bloqueador #7 do AGENTS.md: "comando de voz que afirma navegar
        // sem realizar navegação") — nunca um falso positivo.
        const textLower = currentText.toLowerCase();

        const navigateOrReportFailure = (tab: string, successLabel: string) => {
          const navigated = navigationBus.requestNavigation(tab);
          if (navigated) {
            SoundFX.play('confirm');
          } else {
            SoundFX.play('error');
          }
          setLastAction(
            navigated
              ? successLabel
              : 'Não consegui navegar até aqui agora — tente de novo em instantes.',
          );
          stopListening();
        };

        // Comandos registrados pela tela atualmente ativa (ex.: Mesa de Tratamento — "iniciar
        // foco", "sincronizar") sempre têm prioridade sobre o vocabulário global de navegação
        // abaixo: são mais específicos e, quando existem, é porque a tela precisa deles agora.
        const localHint = voiceCommandBus.tryHandle(textLower);
        if (localHint) {
          SoundFX.play('confirm');
          setLastAction(localHint);
          stopListening();
        } else if (textLower.includes('crm') || textLower.includes('pipeline')) {
          navigateOrReportFailure('crm', 'Navegou para o CRM Board');
        } else if (textLower.includes('prospector') || textLower.includes('buscar lead')) {
          navigateOrReportFailure('prospect', 'Navegou para o Prospector');
        } else if (
          textLower.includes('logística') ||
          textLower.includes('logistica') ||
          textLower.includes('frota') ||
          textLower.includes('telemetria')
        ) {
          // Este comando alternava entre as duas marcas então existentes (hoje um único
          // playbook geral) — mantido como confirmação de que o playbook comercial está ativo.
          setPlaybook('geral');
          SoundFX.play('confirm');
          setLastAction(`Playbook ativo: ${playbookInfo('geral').label}`);
          stopListening();
        } else if (textLower.includes('inteligência') || textLower.includes('metodologia')) {
          navigateOrReportFailure('intelligence', 'Abriu o Hub de IA');
        } else if (textLower.includes('contato') || textLower.includes('contatos')) {
          navigateOrReportFailure('contacts', 'Navegou para Lista de Contatos');
        } else if (textLower.includes('empresa') || textLower.includes('empresas')) {
          navigateOrReportFailure('companies', 'Navegou para Lista de Empresas');
        } else if (
          currentText.trim().length > 0 &&
          event.results[event.results.length - 1]?.isFinal
        ) {
          SoundFX.play('error');
          setLastAction(
            'Não entendi o comando. Tente: CRM, Prospector, Contatos, Empresas ou Inteligência.',
          );
          stopListening();
        }
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPlaybook]);

  const toggleListening = () => {
    if (!recognition) {
      toast.error(
        'Seu navegador não suporta reconhecimento de voz. Experimente usar o Google Chrome.',
      );
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      SoundFX.play('focus');
      setTranscript('');
      setLastAction(null);
      setIsListening(true);
      try {
        recognition.start();
      } catch (err: any) {
        clientLogger.error({ err }, 'Falha ao iniciar reconhecimento de voz');
      }
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognition) {
      try {
        recognition.stop();
      } catch (err: any) {
        clientLogger.error({ err }, 'Falha ao parar reconhecimento de voz');
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-16 z-[900]">
      <div className="relative group">
        <button
          type="button"
          onClick={toggleListening}
          aria-label="Comando de Voz por Microfone"
          className={`relative flex items-center justify-center w-11 h-11 rounded-2xl text-[#F8F9FF] shadow-xl transition-all duration-300 border cursor-pointer ${
            isListening
              ? 'border-critical/60 bg-critical animate-pulse ring-4 ring-critical/40 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
              : 'border-brand/40 bg-gradient-to-br from-brand via-brand-2 to-brand text-on-brand hover:scale-105 active:scale-95 shadow-[0_6px_25px_rgba(212,175,55,0.4)] hover:shadow-[0_8px_30px_rgba(212,175,55,0.55)]'
          }`}
        >
          {/* Luz especular interna */}
          <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

          {isListening ? (
            <Volume2 className="w-5 h-5 animate-pulse text-[#F8F9FF] relative z-10" />
          ) : (
            <Mic className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10" />
          )}
        </button>

        {/* Tooltip Hover */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-surface-elevated/95 backdrop-blur-md text-ink text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-line flex items-center gap-1.5">
          <Command className="w-3.5 h-3.5 text-brand" />
          <span>Comando por Voz ({isListening ? 'Ouvindo...' : 'Clique para Falar'})</span>
        </div>
      </div>

      {/* Painel de Transcrição e Feedback de Voz */}
      <AnimatePresence>
        {(isListening || lastAction || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-80 p-4 rounded-2xl bg-surface-elevated/95 border border-brand/35 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl text-xs space-y-3 z-50 relative overflow-hidden"
          >
            {/* Top specular highlight */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent pointer-events-none" />

            <div className="flex items-center justify-between border-b border-line/80 pb-2.5">
              <span className="font-extrabold text-brand flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand animate-pulse" /> Assistente de Voz 2026
              </span>
              <button
                type="button"
                onClick={() => {
                  setTranscript('');
                  setLastAction(null);
                }}
                className="text-[10px] text-ink-2 hover:text-ink font-semibold"
              >
                Limpar
              </button>
            </div>

            {isListening && (
              <div className="space-y-2 text-center py-1">
                {/* Visualizador de Onda Sonora 2026 */}
                <div className="flex items-center justify-center gap-1 h-6">
                  {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7].map((height, i) => (
                    <motion.span
                      key={`sound-wave-${i}`}
                      className="w-1 rounded-full bg-brand"
                      animate={{
                        height: ['4px', `${height * 20}px`, '4px'],
                      }}
                      transition={{
                        duration: 0.6 + i * 0.1,
                        repeat: Infinity,
                        ease: 'easeInOut' as const,
                      }}
                    />
                  ))}
                </div>

                <p className="text-[11px] text-ink-2 italic">
                  &quot;Diga: CRM, Prospector, Contatos, Empresas, Logística...&quot;
                </p>

                {transcript && (
                  <p className="text-ink font-bold bg-surface p-2.5 rounded-xl border border-brand/30 shadow-xs">
                    &ldquo;{transcript}&rdquo;
                  </p>
                )}
              </div>
            )}

            {lastAction && (
              <div className="p-3 rounded-xl bg-success/15 border border-success/35 text-success-active dark:text-success flex items-center gap-2.5 backdrop-blur-sm">
                <Check className="w-4 h-4 text-success-active dark:text-success shrink-0" />
                <span className="font-bold">{lastAction}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
