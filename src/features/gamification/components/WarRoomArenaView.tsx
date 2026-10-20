import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import { useAuth } from '../../../contexts/AuthContext.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { toast } from '../../../lib/toast.js';
import { cn } from '../../../lib/utils.js';
import type {
  ArenaPedagogicalScore,
  ObjectionRound,
  WarRoomArenaRoom,
  WarRoomMode,
} from '../../../shared/contracts/warRoomArena.contract.js';

const SAMPLE_OBJECTIONS = [
  {
    theme: 'Preço & Concorrência',
    prompt:
      'O concorrente de vocês faz por metade do preço mensal e ainda prometeu setup grátis. Por que eu deveria aprovar uma proposta tão mais cara?',
    suggestedTechnique: 'Ancoragem de ROI e Custo de Inação',
  },
  {
    theme: 'Timing & Prioridade',
    prompt:
      'Estamos congelando novos orçamentos até o próximo trimestre. Me procure novamente no ano que vem.',
    suggestedTechnique: 'Isolamento de Objeção e Custo de Atraso',
  },
  {
    theme: 'Autoridade & Decisor',
    prompt:
      'Eu gostei muito da apresentação, mas a diretoria não vai aprovar mudança de software no meio do ano fiscal.',
    suggestedTechnique: 'Mapeamento de Comitê e Rascunho Executivo',
  },
  {
    theme: 'Complexidade de TI',
    prompt:
      'A nossa equipe técnica disse que não tem braço para integrar uma nova API no sistema legado agora.',
    suggestedTechnique: 'Garantia de Onboarding Assistido e Suporte Dedicado',
  },
];

export function WarRoomArenaView() {
  const { currentUser } = useAuth();
  const userName = currentUser?.name || 'Consultor Comercial';

  const [activeMode, setActiveMode] = useState<WarRoomMode>('objection_duel');
  const [arenaState, setArenaState] = useState<
    'lobby' | 'active_round' | 'evaluating' | 'evaluated' | 'completed'
  >('lobby');
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [timerActive, setTimerActive] = useState(false);
  const [defenderInput, setDefenderInput] = useState('');
  const [evaluation, setEvaluation] = useState<ArenaPedagogicalScore | null>(null);
  const [duelHistory, setDuelHistory] = useState<ObjectionRound[]>([]);
  const [totalXpEarned, setTotalXpEarned] = useState(0);

  const activeObjection = SAMPLE_OBJECTIONS[currentRoundIndex % SAMPLE_OBJECTIONS.length];

  // Temporizador do Round
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            handleSubmitDefense();
            return 0;
          }
          if (prev === 11) {
            SoundFX.play('focus');
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  const handleStartDuel = (mode: WarRoomMode = activeMode) => {
    SoundFX.play('confirm');
    setActiveMode(mode);
    setCurrentRoundIndex(0);
    setTimeLeft(45);
    setDefenderInput('');
    setEvaluation(null);
    setDuelHistory([]);
    setTotalXpEarned(0);
    setArenaState('active_round');
    setTimerActive(true);
    toast.success('Duelo de Objeções iniciado! Responda antes do tempo esgotar.');
  };

  const handleSubmitDefense = () => {
    setTimerActive(false);
    setArenaState('evaluating');
    SoundFX.play('focus');

    // Simulação do motor pedagógico de scoring da IA
    setTimeout(() => {
      const responseLength = defenderInput.trim().length;
      const needScore = Math.min(95, Math.max(65, 75 + Math.floor(Math.random() * 20)));
      const valueScore = Math.min(98, Math.max(60, 72 + Math.floor(Math.random() * 25)));
      const playbookScore = Math.min(96, Math.max(70, responseLength > 80 ? 88 : 72));
      const empathyScore = Math.min(94, Math.max(65, 80 + Math.floor(Math.random() * 16)));
      const composite = Math.round((needScore + valueScore + playbookScore + empathyScore) / 4);
      const awardedXp = composite >= 85 ? 120 : composite >= 75 ? 80 : 50;

      const feedback =
        composite >= 85
          ? 'Excelente reenquadramento! O consultor ancorou o ROI com precisão e evitou concessão desnecessária de desconto, defendendo o diferencial de valor da solução.'
          : 'Boa tentativa. A resposta tocou no ponto certo, mas faltou fazer uma pergunta aberta de retorno para reter o controle da conversa comercial.';

      const roundScore: ArenaPedagogicalScore = {
        roundNumber: currentRoundIndex + 1,
        needIdentificationScore: needScore,
        valueAnchoringScore: valueScore,
        playbookAdherenceScore: playbookScore,
        clarityEmpathyScore: empathyScore,
        compositeScore: composite,
        awardedXp,
        feedback,
      };

      const completedRound: ObjectionRound = {
        roundNumber: currentRoundIndex + 1,
        objectionPrompt: activeObjection.prompt,
        challengerId: 'ai-lead-challenger',
        defenderId: currentUser?.id || 'seller-01',
        defenderResponseText: defenderInput || '(Tempo esgotado sem envio)',
        timeTakenSeconds: 45 - timeLeft,
        score: composite,
        evaluation: roundScore,
      };

      setEvaluation(roundScore);
      setDuelHistory((prev) => [...prev, completedRound]);
      setTotalXpEarned((prev) => prev + awardedXp);
      setArenaState('evaluated');
      SoundFX.play('success');
      toast.success(`Round avaliado pela IA: ${composite}/100 (+${awardedXp} XP)!`);
    }, 1400);
  };

  const handleNextRound = () => {
    SoundFX.play('confirm');
    if (currentRoundIndex >= 2) {
      setArenaState('completed');
      SoundFX.play('success');
      toast.success('Duelo finalizado com sucesso! XP computado no seu perfil.');
    } else {
      setCurrentRoundIndex((prev) => prev + 1);
      setTimeLeft(45);
      setDefenderInput('');
      setEvaluation(null);
      setArenaState('active_round');
      setTimerActive(true);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── HEADER DA ARENA DE WAR ROOM ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-surface-elevated to-surface border border-red-500/30 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-red-500/10 text-red-500 border-red-500/30 font-bold text-xs gap-1"
            >
              <Swords className="h-3.5 w-3.5" /> War Room Arena
            </Badge>
            <span className="text-xs font-semibold text-ink-2">
              Treinamento & Duelos de Objeção com IA
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight mt-1 flex items-center gap-2">
            Arena Interativa de War Room
            <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
          </h1>
          <p className="text-sm text-ink-2 mt-0.5">
            Coloque suas defesas de objeções à prova em tempo real. Avaliação pedagógica instantânea
            da IA por SPIN, ROI e empatia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {arenaState !== 'lobby' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                SoundFX.play('click');
                setArenaState('lobby');
                setTimerActive(false);
              }}
              className="text-xs font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Voltar ao Lobby
            </Button>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs">
            <Trophy className="h-4 w-4" />
            <span>XP Ganho: +{totalXpEarned}</span>
          </div>
        </div>
      </div>

      {/* ── VISTA DO LOBBY (ESCOLHA DE MODO E INÍCIO) ────────────────── */}
      {arenaState === 'lobby' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Modo 1: Duelo de Objeções 1v1 */}
            <Card
              className={cn(
                'p-5 cursor-pointer transition-all duration-200 border-2 relative overflow-hidden',
                activeMode === 'objection_duel'
                  ? 'border-brand bg-brand/5 shadow-lg shadow-brand/10'
                  : 'border-line/70 hover:border-brand/40 bg-surface-elevated/70',
              )}
              onClick={() => {
                SoundFX.play('click');
                setActiveMode('objection_duel');
              }}
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-brand/10 text-brand">
                  <Swords className="h-6 w-6" />
                </span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  1v1 Express
                </Badge>
              </div>
              <h3 className="font-display font-bold text-lg text-ink mt-3">Duelo de Objeções</h3>
              <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                Rounds cronometrados de 45 segundos contra clientes desafiadores gerados por IA.
              </p>
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs font-semibold text-brand">
                <span>3 Rounds · Feedback Instantâneo</span>
                <span>Até 360 XP</span>
              </div>
            </Card>

            {/* Modo 2: Desafio de Equipe */}
            <Card
              className={cn(
                'p-5 cursor-pointer transition-all duration-200 border-2 relative overflow-hidden',
                activeMode === 'team_challenge'
                  ? 'border-brand bg-brand/5 shadow-lg shadow-brand/10'
                  : 'border-line/70 hover:border-brand/40 bg-surface-elevated/70',
              )}
              onClick={() => {
                SoundFX.play('click');
                setActiveMode('team_challenge');
              }}
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Users className="h-6 w-6" />
                </span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  Squad Mode
                </Badge>
              </div>
              <h3 className="font-display font-bold text-lg text-ink mt-3">Desafio de Equipe</h3>
              <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                Toda a equipe responde ao mesmo caso crítico. A IA ranqueia a melhor abordagem do
                squad.
              </p>
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs font-semibold text-indigo-500">
                <span>Multiplayer Assíncrono</span>
                <span>Bônus de Squad</span>
              </div>
            </Card>

            {/* Modo 3: Torneio Sazonal */}
            <Card
              className={cn(
                'p-5 cursor-pointer transition-all duration-200 border-2 relative overflow-hidden',
                activeMode === 'seasonal_tournament'
                  ? 'border-brand bg-brand/5 shadow-lg shadow-brand/10'
                  : 'border-line/70 hover:border-brand/40 bg-surface-elevated/70',
              )}
              onClick={() => {
                SoundFX.play('click');
                setActiveMode('seasonal_tournament');
              }}
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Crown className="h-6 w-6" />
                </span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  Torneio Q4
                </Badge>
              </div>
              <h3 className="font-display font-bold text-lg text-ink mt-3">Torneio Sazonal</h3>
              <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                Mata-mata de closers em contas enterprise de alta complexidade. Troféu permanente no
                perfil.
              </p>
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs font-semibold text-amber-500">
                <span>Chaveamento de Elite</span>
                <span>Troféu & Badges</span>
              </div>
            </Card>
          </div>

          {/* Botão de Entrar na Arena */}
          <div className="p-6 rounded-2xl border border-line/70 bg-surface-elevated/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-display font-bold text-ink text-base">
                Pronto para combater as objeções mais duras?
              </h4>
              <p className="text-xs text-ink-2">
                Modo selecionado:{' '}
                <strong className="text-ink">{activeMode.replace('_', ' ').toUpperCase()}</strong>.
                Você defenderá o playbook contra o simulador cognitivo.
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => handleStartDuel(activeMode)}
              className="bg-red-600 hover:bg-red-500 text-white font-bold gap-2 px-6 shadow-lg shadow-red-600/20"
            >
              <Play className="h-4 w-4 fill-current" /> Entrar na Arena Agora
            </Button>
          </div>
        </div>
      )}

      {/* ── ROUND ATIVO / AVALIANDO / AVALIADO ───────────────────────── */}
      {(arenaState === 'active_round' ||
        arenaState === 'evaluating' ||
        arenaState === 'evaluated') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Central: Campo de Batalha (2 colunas) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 border-line/70 bg-surface-elevated/80 shadow-xl backdrop-blur-xl">
              {/* Barra do Round & Timer */}
              <div className="flex items-center justify-between pb-4 border-b border-line/60">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="font-bold text-xs bg-brand/10 text-brand border-brand/30"
                  >
                    Round {currentRoundIndex + 1} de 3
                  </Badge>
                  <span className="text-xs font-semibold text-ink-2">
                    Tema: {activeObjection.theme}
                  </span>
                </div>

                {/* Cronômetro */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold transition-all',
                    timeLeft <= 10
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 animate-pulse'
                      : 'bg-surface-2 text-ink border border-line',
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{timeLeft}s restantes</span>
                </div>
              </div>

              {/* Objeção do Lead (Desafiador) */}
              <div className="my-5 p-4 rounded-xl bg-surface/70 border border-line/60 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Objeção do Lead (Desafio)
                  </span>
                  <span className="text-[11px] text-ink-3">Simulação Cognitiva</span>
                </div>
                <blockquote className="text-sm md:text-base text-ink italic font-medium leading-relaxed">
                  &ldquo;{activeObjection.prompt}&rdquo;
                </blockquote>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-2">
                  <Sparkles className="h-3 w-3 text-brand" />
                  <span>
                    Dica de abordagem recomendada:{' '}
                    <strong>{activeObjection.suggestedTechnique}</strong>
                  </span>
                </div>
              </div>

              {/* Input de Defesa do Closer */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>Sua Defesa de Objeção:</span>
                  <span className="text-[10px] text-ink-3 font-normal">
                    {defenderInput.length} caracteres
                  </span>
                </label>

                <textarea
                  rows={4}
                  value={defenderInput}
                  onChange={(e) => setDefenderInput(e.target.value)}
                  disabled={arenaState !== 'active_round'}
                  placeholder="Estruture sua resposta: valide o sentimento do lead, isole a objeção, ancore o valor comercial e proponha o próximo passo..."
                  className="w-full rounded-xl border border-line/80 bg-surface/90 p-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all resize-none"
                />

                {arenaState === 'active_round' && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-[11px] text-ink-3">
                      <span>Pressione Enviar ou aguarde o timer zerar</span>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleSubmitDefense}
                      disabled={!defenderInput.trim()}
                      className="bg-brand text-on-brand font-bold gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Enviar Defesa
                    </Button>
                  </div>
                )}

                {arenaState === 'evaluating' && (
                  <div className="py-6 text-center text-sm font-semibold text-brand flex items-center justify-center gap-2 animate-pulse">
                    <Sparkles className="h-4 w-4 animate-spin" />
                    Motor Pedagógico de IA avaliando SPIN, aderência ao playbook e tom...
                  </div>
                )}
              </div>

              {/* Resultado do Round (Avaliado) */}
              {arenaState === 'evaluated' && evaluation && (
                <div className="mt-6 pt-5 border-t border-line/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-500 items-center justify-center font-bold text-sm">
                        ✓
                      </span>
                      <div>
                        <h4 className="font-display font-bold text-base text-ink">
                          Nota do Round: {evaluation.compositeScore}/100
                        </h4>
                        <span className="text-xs text-ink-2">
                          +{evaluation.awardedXp} XP concedidos
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleNextRound}
                      className="bg-brand text-on-brand font-bold gap-1.5"
                    >
                      {currentRoundIndex >= 2 ? 'Finalizar Duelo' : 'Próximo Round'}
                    </Button>
                  </div>

                  {/* Feedback Textual */}
                  <div className="p-3.5 rounded-xl bg-brand/5 border border-brand/20 text-xs text-ink leading-relaxed">
                    <strong className="text-brand block mb-1">Feedback Pedagógico da IA:</strong>
                    {evaluation.feedback}
                  </div>

                  {/* Barras de Critérios Pedagógicos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-2.5 rounded-lg border border-line bg-surface/50 text-center">
                      <span className="text-[10px] text-ink-3 block">Clareza SPIN</span>
                      <span className="text-base font-extrabold text-ink">
                        {evaluation.needIdentificationScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-line bg-surface/50 text-center">
                      <span className="text-[10px] text-ink-3 block">Ancoragem de ROI</span>
                      <span className="text-base font-extrabold text-ink">
                        {evaluation.valueAnchoringScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-line bg-surface/50 text-center">
                      <span className="text-[10px] text-ink-3 block">Aderência Playbook</span>
                      <span className="text-base font-extrabold text-ink">
                        {evaluation.playbookAdherenceScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-line bg-surface/50 text-center">
                      <span className="text-[10px] text-ink-3 block">Empatia & Tom</span>
                      <span className="text-base font-extrabold text-ink">
                        {evaluation.clarityEmpathyScore}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Coluna Direita: Placar & Informações dos Concorrentes */}
          <div className="space-y-4">
            <Card className="p-5 border-line/70 bg-surface-elevated/80 shadow-md">
              <h3 className="font-display font-bold text-sm text-ink pb-3 border-b border-line/60 flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" /> Participantes do Duelo
              </h3>

              <div className="mt-3 space-y-3">
                {/* Desafiador (IA) */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-xs font-bold">
                      IA
                    </span>
                    <div>
                      <span className="font-bold text-xs text-ink block">Lead B2B Decisor</span>
                      <span className="text-[10px] text-ink-3">Desafiador</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-rose-500 border-rose-500/30 font-semibold"
                  >
                    Atacando
                  </Badge>
                </div>

                {/* Defensor (Usuário) */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-brand/30 bg-brand/5">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-brand text-on-brand flex items-center justify-center text-xs font-bold">
                      {userName.charAt(0)}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-ink block">{userName}</span>
                      <span className="text-[10px] text-ink-3">Defensor</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand [font-variant-numeric:tabular-nums]">
                    +{totalXpEarned} XP
                  </span>
                </div>
              </div>

              {/* Histórico de Rounds Concluídos */}
              {duelHistory.length > 0 && (
                <div className="mt-5 pt-4 border-t border-line/60">
                  <h4 className="text-xs font-bold text-ink mb-2">Rounds Deste Duelo</h4>
                  <div className="space-y-2">
                    {duelHistory.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface/40 border border-line"
                      >
                        <span className="font-medium text-ink-2">Round {r.roundNumber}</span>
                        <span className="font-bold text-emerald-500">{r.score}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── ESTADO FINAL: DUELO CONCLUÍDO ───────────────────────────── */}
      {arenaState === 'completed' && (
        <Card className="p-8 border-brand/50 bg-gradient-to-b from-brand/10 to-surface-elevated text-center space-y-4 max-w-2xl mx-auto shadow-2xl">
          <div className="flex justify-center">
            <span className="p-4 rounded-full bg-amber-500/20 text-amber-500 ring-8 ring-amber-500/10">
              <Trophy className="h-10 w-10 animate-bounce" />
            </span>
          </div>

          <h2 className="font-display font-extrabold text-2xl text-ink">
            Duelo Concluído com Sucesso!
          </h2>
          <p className="text-sm text-ink-2 max-w-md mx-auto">
            Você enfrentou 3 rounds intensos de objeções reais. Sua pontuação e aprendizado foram
            computados na governança do perfil.
          </p>

          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-surface border border-line text-lg font-black text-brand">
            <span>+{totalXpEarned} XP Concedidos</span>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Button
              onClick={() => handleStartDuel(activeMode)}
              className="bg-brand text-on-brand font-bold gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Jogar Novamente
            </Button>
            <Button variant="outline" onClick={() => setArenaState('lobby')} className="font-bold">
              Voltar ao Lobby
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
