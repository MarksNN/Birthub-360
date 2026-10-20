import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Maximize2,
  Mic,
  Minimize2,
  PauseOctagon,
  Radio,
  RefreshCw,
  Sparkles,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { SoundFX } from '../../../lib/soundEffects.js';
import { toast } from '../../../lib/toast.js';
import {
  objectionDetectionService,
  type ObjectionCategory,
  type SuggestedRebuttal,
} from '../../../shared/services/objectionDetection.service.js';
import { useLiveCopilotSession } from '../copilotLiveBus.js';
import type { HUDSize, ObjectionDetectionResult } from '../types.js';

export interface LiveCopilotHUDProps {
  /** Sobrescreve ativação manual ou para testes */
  isActive?: boolean;
  /** Sessão fixa para testes isolados */
  sessionId?: string;
  leadName?: string;
  leadCompany?: string;
  onClose?: () => void;
  initialMinimized?: boolean;
  initialSize?: HUDSize;
}

const CATEGORY_STYLES: Record<
  ObjectionCategory,
  { label: string; badge: string; border: string; glow: string }
> = {
  price: {
    label: 'Preço & Orçamento',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
  },
  timing: {
    label: 'Timing & Prioridade',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
    border: 'border-violet-500/30',
    glow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]',
  },
  competition: {
    label: 'Concorrência',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    border: 'border-rose-500/30',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
  },
  authority: {
    label: 'Autoridade & Decisor',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
    border: 'border-sky-500/30',
    glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]',
  },
};

const STRATEGY_LABELS: Record<string, string> = {
  reframe: 'Reenquadramento',
  pivot: 'Pivot de Valor',
  case_study: 'Estudo de Caso',
  discovery_question: 'Pergunta Investigativa',
};

/**
 * LiveCopilotHUD
 *
 * Componente visual flutuante acionado durante chamadas telefônicas ativas (SIP / WebRTC / 3CX).
 * Apresenta sugestões de argumentação em tempo real, badges de confiança da IA, transcrição em
 * streaming e botões de ação rápida sem cobrir elementos vitais do CRM.
 *
 * Conformidade com WCAG 2.2 AA (foco, contraste, ARIA live regions e suporte a teclado).
 */
export function LiveCopilotHUD({
  isActive: propIsActive,
  sessionId: propSessionId,
  leadName: propLeadName,
  leadCompany: propLeadCompany,
  onClose,
  initialMinimized = false,
  initialSize = 'standard',
}: LiveCopilotHUDProps) {
  const sessionState = useLiveCopilotSession();
  const hudId = useId();

  const isCallActive = propIsActive ?? sessionState.isCallActive;
  const currentLeadName = propLeadName || sessionState.session?.leadName || 'Lead em Atendimento';
  const currentCompany =
    propLeadCompany || sessionState.session?.leadCompany || 'Empresa em Prospecção';

  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [size, setSize] = useState<HUDSize>(initialSize);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeRebuttalIndex, setActiveRebuttalIndex] = useState(0);
  const [callDuration, setCallDuration] = useState(0);

  // Telemetria bimodal do Live Voice
  const voiceTelemetry = sessionState.bimodalVoice;
  const voiceState = voiceTelemetry?.state ?? 'LISTENING';
  const isFallback = voiceTelemetry?.isFallback ?? false;
  const latencyP50 = voiceTelemetry?.metrics?.latencyP50Ms ?? 380;
  const lastBargeInMs = voiceTelemetry?.lastBargeInMs ?? 145;

  const handleTriggerBargeIn = () => {
    SoundFX.play('focus');
    const res = sessionState.triggerBargeIn();
    toast.info(`Barge-in acionado (${res.latencyMs}ms): IA interrompida para o closer.`);
  };

  const handleToggleFallback = () => {
    SoundFX.play('click');
    const fallbackActive = sessionState.toggleFallback();
    if (fallbackActive) {
      toast.info('Modo Bimodal pausado. Transição para STT/TTS Assíncrono ativada.');
    } else {
      toast.success('Motor Bimodal Ultra-Low Latency WebRTC reativado.');
    }
  };

  // Exemplo de fallback inteligente caso a IA ainda não tenha disparado uma objeção
  const activeObjection: ObjectionDetectionResult = useMemo(() => {
    if (sessionState.latestObjection) {
      return sessionState.latestObjection;
    }
    // Sugestão inicial/padrão baseada no playbook comercial
    const defaultRebuttals = objectionDetectionService.getRebuttals('price');
    return {
      id: 'default-suggestion',
      sessionId: propSessionId || sessionState.session?.sessionId || 'live-call',
      category: 'price',
      confidence: 0.94,
      matchedSnippet: 'investimento fora do orçamento previsto para este trimestre',
      matchedPattern: 'Declaração explícita de preço alto / restrição de budget',
      explanation: 'O lead indicou restrição orçamentária imediata.',
      timestamp: Date.now(),
      latencyMs: latencyP50,
      suggestedRebuttals: defaultRebuttals,
    };
  }, [sessionState.latestObjection, propSessionId, sessionState.session?.sessionId, latencyP50]);

  // Cronômetro da chamada em andamento
  useEffect(() => {
    if (!isCallActive) {
      setCallDuration(0);
      return;
    }
    const interval = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isCallActive]);

  // Atalhos de teclado acessíveis (ESC minimiza, Alt+B Barge-In)
  useEffect(() => {
    if (!isCallActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isMinimized) {
        setIsMinimized(true);
      }
      if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleTriggerBargeIn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCallActive, isMinimized]);

  if (!isCallActive) return null;

  const currentRebuttal: SuggestedRebuttal | undefined =
    activeObjection.suggestedRebuttals[activeRebuttalIndex] ||
    activeObjection.suggestedRebuttals[0];

  const categoryStyle = CATEGORY_STYLES[activeObjection.category] || CATEGORY_STYLES.price;
  const confidencePercent = Math.round(activeObjection.confidence * 100);

  const handleCopyArgument = (scriptText: string, index: number) => {
    SoundFX.play('confirm');
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(scriptText);
    }
    setCopiedIndex(index);
    toast.success('Argumento copiado para a área de transferência');
    window.setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleInsertProposal = (scriptText: string) => {
    SoundFX.play('confirm');
    window.dispatchEvent(
      new CustomEvent('copilot:insert-proposal', {
        detail: { script: scriptText, category: activeObjection.category },
      }),
    );
    toast.success('Proposta comercial enriquecida com o argumento');
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const widthClass = {
    compact: 'w-[340px] sm:w-[360px]',
    standard: 'w-[430px] sm:w-[470px]',
    expanded: 'w-[540px] sm:w-[590px]',
  }[size];

  return (
    <aside
      id={hudId}
      role="region"
      aria-label="Copiloto IA durante chamada ativa"
      className="fixed bottom-5 right-5 z-[80] select-none pointer-events-auto max-w-[calc(100vw-24px)] font-sans antialiased"
    >
      <AnimatePresence initial={false}>
        {/* ESTADO MINIMIZADO (Pill Flutuante Discreto) */}
        {isMinimized ? (
          <motion.div
            key="minimized-pill"
            initial={{ scale: 0.85, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface-elevated/95 border border-brand/40 shadow-2xl backdrop-blur-xl hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-mono text-xs font-semibold text-ink [font-variant-numeric:tabular-nums]">
                {formatTimer(callDuration)}
              </span>
            </div>

            <div className="h-3.5 w-px bg-line" aria-hidden="true" />

            <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2 truncate max-w-[150px]">
              <Radio className="w-3.5 h-3.5 text-brand shrink-0 animate-pulse" />
              <span className="truncate">{categoryStyle.label}</span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">{latencyP50}ms</span>
            </div>

            <button
              type="button"
              onClick={handleTriggerBargeIn}
              title="Atalho: Alt+B para Barge-in"
              className="p-1 rounded-full text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <PauseOctagon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                SoundFX.play('focus');
                setIsMinimized(false);
              }}
              aria-label="Maximizar HUD do Copiloto IA"
              className="ml-1 p-1 rounded-full text-ink-2 hover:text-ink hover:bg-surface-interactive transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          /* ESTADO EXPANDIDO / PADRÃO / COMPACTO */
          <motion.div
            key="expanded-hud"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className={`flex flex-col rounded-2xl bg-surface-elevated/95 border border-brand/35 shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-200 ${widthClass} ${categoryStyle.glow}`}
          >
            {/* ── BARRA SUPERIOR DO HUD ────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-line/70 bg-gradient-to-r from-surface-elevated to-surface">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-ink truncate">{currentLeadName}</span>
                    <span className="text-[10px] text-ink-3">·</span>
                    <span className="text-[11px] text-ink-2 truncate">{currentCompany}</span>
                  </div>
                </div>
              </div>

              {/* Controles do HUD (Tamanho, Minimizar, Fechar) */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <div className="flex items-center gap-1 text-[11px] font-mono text-ink-2 mr-1">
                  <Clock className="w-3 h-3 text-brand" />
                  <span>{formatTimer(callDuration)}</span>
                </div>

                {/* Alternador de Tamanho */}
                <button
                  type="button"
                  onClick={() => {
                    const nextSize: HUDSize =
                      size === 'compact'
                        ? 'standard'
                        : size === 'standard'
                          ? 'expanded'
                          : 'compact';
                    setSize(nextSize);
                  }}
                  aria-label={`Tamanho atual: ${size}. Clique para alternar.`}
                  className="p-1 rounded-md text-ink-2 hover:text-ink hover:bg-surface-interactive transition-colors cursor-pointer text-[10px] font-semibold border border-line/50 px-1.5"
                >
                  {size === 'compact' ? 'SM' : size === 'standard' ? 'MD' : 'LG'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  aria-label="Minimizar Copiloto HUD"
                  className="p-1 rounded-md text-ink-2 hover:text-ink hover:bg-surface-interactive transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar painel do Copiloto"
                    className="p-1 rounded-md text-ink-2 hover:text-critical hover:bg-surface-interactive transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* ── HUD DO LIVE COPILOT DE VOZ (MOTOR BIMODAL) ───────────── */}
            <div className="px-4 py-2 bg-gradient-to-r from-brand/5 via-surface/40 to-surface border-b border-line/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          voiceState === 'SPEAKING'
                            ? 'bg-purple-400'
                            : voiceState === 'INTERRUPTED'
                              ? 'bg-rose-500'
                              : isFallback
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          voiceState === 'SPEAKING'
                            ? 'bg-purple-500'
                            : voiceState === 'INTERRUPTED'
                              ? 'bg-rose-600'
                              : isFallback
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                        }`}
                      />
                    </span>

                    <span className="text-[11px] font-bold text-ink">
                      {voiceState === 'LISTENING' && 'Voz: Ouvindo Lead'}
                      {voiceState === 'SPEAKING' && 'Voz: IA Respondendo'}
                      {voiceState === 'PROCESSING' && 'Voz: Sintetizando'}
                      {voiceState === 'INTERRUPTED' && `Barge-In (${lastBargeInMs}ms)`}
                      {voiceState === 'FALLBACK' && 'Modo Fallback STT/TTS'}
                      {voiceState === 'CONNECTING' && 'Conectando WebRTC...'}
                      {voiceState === 'IDLE' && 'Voz em Espera'}
                    </span>
                  </div>

                  {/* Badges de Telemetria */}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                    P50 {latencyP50}ms
                  </span>

                  <span className="hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-ink-2 border border-line">
                    {voiceTelemetry?.transport ? voiceTelemetry.transport.toUpperCase() : 'WEBRTC'}
                  </span>
                </div>

                {/* Controles de Barge-In & Fallback */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleTriggerBargeIn}
                    title="Interromper IA instantaneamente (Atalho: Alt+B)"
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <PauseOctagon className="w-3 h-3" />
                    <span>Barge-In</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleFallback}
                    title={isFallback ? 'Voltar para Bimodal WebRTC' : 'Ativar fallback assíncrono'}
                    className={`p-1 rounded-md border text-[10px] font-semibold transition-colors cursor-pointer ${
                      isFallback
                        ? 'bg-amber-500/20 text-amber-600 border-amber-500/40'
                        : 'bg-surface hover:bg-surface-interactive text-ink-2 border-line'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${isFallback ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Indicador de Onda Sonora em Tempo Real */}
              <div className="flex items-center gap-1 mt-1.5 h-2 w-full px-1" aria-hidden="true">
                {[40, 70, 30, 90, 60, 45, 80, 50, 65, 35, 75, 55, 85, 40, 95, 60, 30, 70].map(
                  (heightPct, i) => (
                    <motion.span
                      key={i}
                      className={`flex-1 rounded-full ${
                        voiceState === 'SPEAKING'
                          ? 'bg-purple-500'
                          : voiceState === 'INTERRUPTED'
                            ? 'bg-rose-500'
                            : isFallback
                              ? 'bg-amber-400'
                              : 'bg-brand'
                      }`}
                      animate={{
                        scaleY:
                          voiceState === 'LISTENING' || voiceState === 'SPEAKING'
                            ? [0.3, heightPct / 100, 0.3]
                            : 0.2,
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8 + (i % 5) * 0.15,
                        ease: 'easeInOut',
                      }}
                    />
                  ),
                )}
              </div>
            </div>


            {/* ── CARD DE DETECÇÃO DE OBJEÇÃO & CONFIANÇA IA ───────────── */}
            <div className="p-3.5 border-b border-line/50 bg-gradient-to-b from-surface-subtle/30 to-transparent">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${categoryStyle.badge}`}
                  >
                    <Zap className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{categoryStyle.label}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      confidencePercent >= 85
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : confidencePercent >= 70
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{confidencePercent}% Confiança</span>
                  </span>

                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/30">
                    <Activity className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
                    <span>WebRTC Live (&lt;420ms)</span>
                  </span>
                </div>

                <span className="text-[10px] font-mono text-ink-3">
                  {activeObjection.latencyMs}ms edge
                </span>
              </div>

              {/* Trecho falado pelo Lead identificado pela IA */}
              <p
                role="status"
                aria-live="polite"
                className="text-xs text-ink italic bg-surface-subtle/60 p-2 rounded-lg border border-line/40 leading-relaxed"
              >
                &ldquo;{activeObjection.matchedSnippet}&rdquo;
              </p>

              {/* Proporção de Fala vs Escuta (SPIN Selling Balance) */}
              <div className="mt-2 pt-2 border-t border-line/40 flex items-center justify-between text-[10px] text-ink-2">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Consultor: 38%
                </span>
                <span className="font-semibold text-emerald-400">Zona Ideal SPIN Selling</span>
                <span className="flex items-center gap-1">
                  Prospect: 62%
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
              </div>
            </div>

            {/* ── SUGESTÃO DE ARGUMENTAÇÃO RECOMENDADA ──────────────────── */}
            {currentRebuttal && (
              <div className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-brand">
                      {STRATEGY_LABELS[currentRebuttal.strategy] || currentRebuttal.strategy}
                    </span>
                    <span className="text-xs font-semibold text-ink">
                      · {currentRebuttal.title}
                    </span>
                  </div>

                  {activeObjection.suggestedRebuttals.length > 1 && (
                    <div className="flex items-center gap-1 text-[11px] text-ink-2">
                      <span>
                        {activeRebuttalIndex + 1}/{activeObjection.suggestedRebuttals.length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveRebuttalIndex(
                            (prev) => (prev + 1) % activeObjection.suggestedRebuttals.length,
                          )
                        }
                        aria-label="Ver próxima alternativa de argumento"
                        className="p-0.5 rounded hover:bg-surface-interactive text-ink-2 hover:text-ink cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Script Sugerido */}
                <div className="text-xs sm:text-[13px] text-ink font-medium leading-relaxed bg-brand/5 border border-brand/20 p-2.5 rounded-xl shadow-inner">
                  {currentRebuttal.script}
                </div>

                {/* Dica / Key Takeaway */}
                {currentRebuttal.keyTakeaway && (
                  <p className="text-[11px] text-ink-2 flex items-center gap-1.5 italic">
                    <AlertCircle className="w-3 h-3 text-brand shrink-0" />
                    <span>{currentRebuttal.keyTakeaway}</span>
                  </p>
                )}

                {/* ── BOTÕES DE AÇÃO RÁPIDA ───────────────────────────────── */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyArgument(currentRebuttal.script, activeRebuttalIndex)}
                    aria-label="Copiar argumento para a área de transferência"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-on-brand hover:brightness-110 active:scale-[0.98] font-semibold text-xs transition-all shadow-md cursor-pointer"
                  >
                    {copiedIndex === activeRebuttalIndex ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar argumento</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertProposal(currentRebuttal.script)}
                    aria-label="Inserir argumento na proposta comercial"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-surface hover:bg-surface-interactive text-ink text-xs font-medium transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand" />
                    <span>Inserir na proposta</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── TRANSCRIÇÃO EM STREAMING (Expandido ou Padrão) ────────── */}
            {size !== 'compact' && (
              <div className="border-t border-line/60 bg-surface/50 px-3.5 py-2">
                <div className="flex items-center justify-between text-[11px] text-ink-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3 h-3 text-brand animate-pulse" />
                    <span className="font-semibold text-ink">Áudio & Transcrição Live</span>
                  </div>

                  <div className="flex items-center gap-0.5" aria-hidden="true">
                    <span
                      className="h-1.5 w-1 rounded-full bg-brand animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-2.5 w-1 rounded-full bg-brand animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-1.5 w-1 rounded-full bg-brand animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>

                <div
                  role="log"
                  aria-live="polite"
                  className="max-h-20 overflow-y-auto text-[11px] text-ink-2 leading-tight space-y-1 custom-scrollbar"
                >
                  {(sessionState.transcripts?.length ?? 0) > 0 ? (
                    sessionState.transcripts.slice(-3).map((item) => (
                      <p key={item.id} className="truncate">
                        <strong className="text-ink">
                          {item.speaker === 'lead' ? 'Lead: ' : 'Closer: '}
                        </strong>
                        {item.text}
                      </p>
                    ))
                  ) : (
                    <p className="text-ink-3 italic">Ouvindo canal de voz em tempo real…</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
