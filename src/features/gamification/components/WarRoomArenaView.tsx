import { useState } from 'react';
import {
  Award,
  ChevronRight,
  Flame,
  HelpCircle,
  Play,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { toast } from '../../../lib/toast.js';
import { cn } from '../../../lib/utils.js';
import type {
  ArenaPedagogicalScore,
  WarRoomMode,
} from '../../../shared/contracts/warRoomArena.contract.js';

interface ObjectionPreset {
  id: string;
  category: string;
  prompt: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  idealPoints: string[];
}

const OBJECTION_PRESETS: ObjectionPreset[] = [
  {
    id: 'obj-price',
    category: 'Preço & Orçamento',
    prompt:
      '"O valor de vocês está 40% acima do orçamento aprovado para este ano. Não temos verba para avançar."',
    difficulty: 'Difícil',
    idealPoints: [
      'Investigação do impacto financeiro da ineficiência atual (SPIN)',
      'Demonstração de Payback / ROI em menos de 4 meses',
      'Ancoragem de custo de oportunidade vs custo da solução',
    ],
  },
  {
    id: 'obj-competition',
    category: 'Concorrência',
    prompt:
      '"Já estamos negociando com o concorrente X e a proposta deles cobre todas as nossas necessidades por menos."',
    difficulty: 'Médio',
    idealPoints: [
      'Validação empática sem desqualificar o concorrente',
      'Foco nos diferenciais exclusivos de telemetria e IA nativa do Birth Hub',
      'Proposição de teste prático ou PoC assistida',
    ],
  },
  {
    id: 'obj-timing',
    category: 'Timing & Prioridade',
    prompt:
      '"Nosso projeto de modernização de CRM ficou para o Q3 do próximo ano. Me procure em 6 meses."',
    difficulty: 'Médio',
    idealPoints: [
      'Isolamento da objeção para verificar se há receio de implantação',
      'Demonstração de onboarding guiado em menos de 7 dias úteis',
      'Oferta de congelamento de condições com início de piloto imediato',
    ],
  },
  {
    id: 'obj-authority',
    category: 'Decisor & Diretoria',
    prompt:
      '"Eu gostei bastante, mas quem assina é o Diretor de Operações e ele é extremamente avesso a trocar de ferramenta."',
    difficulty: 'Fácil',
    idealPoints: [
      'Construção de business case executivo conjunto em 1 página',
      'Mapeamento dos KPIs de interesse direto do Diretor (SLA, custo por lead)',
      'Agendamento de demo executiva de 20 minutos focada em governança',
    ],
  },
];

export function WarRoomArenaView() {
  const [selectedMode, setSelectedMode] = useState<WarRoomMode>('objection_duel');
  const [activeObjection, setActiveObjection] = useState<ObjectionPreset>(OBJECTION_PRESETS[0]);
  const [responseText, setResponseText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<ArenaPedagogicalScore | null>(null);
  const [isContested, setIsContested] = useState(false);
  const [totalXpEarned, setTotalXpEarned] = useState(380);

  const handleSelectPreset = (preset: ObjectionPreset) => {
    setActiveObjection(preset);
    setResponseText('');
    setEvaluationResult(null);
    setIsContested(false);
    setTimeRemaining(60);
    SoundFX.play('click');
  };

  const handleSubmitDefense = () => {
    if (!responseText.trim() || responseText.length < 15) {
      toast.error('Sua resposta deve ter no mínimo 15 caracteres para ser avaliada.');
      return;
    }

    setEvaluating(true);
    SoundFX.play('click');

    // Avaliação pedagógica nos 4 critérios objetivos
    setTimeout(() => {
      const lower = responseText.toLowerCase();
      const hasRoi =
        lower.includes('roi') ||
        lower.includes('retorno') ||
        lower.includes('payback') ||
        lower.includes('investimento');
      const hasSpin =
        lower.includes('como') ||
        lower.includes('qual') ||
        lower.includes('quanto') ||
        lower.includes('impacto');
      const hasPlaybook =
        lower.includes('birth') ||
        lower.includes('demonstração') ||
        lower.includes('teste') ||
        lower.includes('piloto');
      const hasEmpathy =
        lower.includes('entendo') ||
        lower.includes('compreendo') ||
        lower.includes('faz sentido') ||
        lower.includes('perfeito');

      const needIdentification = hasSpin ? 92 : 72;
      const valueAnchoring = hasRoi ? 95 : 68;
      const playbookAdherence = hasPlaybook ? 90 : 75;
      const clarityEmpathy = hasEmpathy ? 94 : 80;

      const composite = Math.round(
        needIdentification * 0.3 +
          valueAnchoring * 0.3 +
          playbookAdherence * 0.2 +
          clarityEmpathy * 0.2,
      );

      const xp = Math.round(composite * 1.5);

      const result: ArenaPedagogicalScore = {
        roundNumber: 1,
        needIdentificationScore: needIdentification,
        valueAnchoringScore: valueAnchoring,
        playbookAdherenceScore: playbookAdherence,
        clarityEmpathyScore: clarityEmpathy,
        compositeScore: composite,
        awardedXp: xp,
        feedback:
          composite >= 85
            ? 'Excelente aplicação do método de reenquadramento de valor com tom empático e proposta clara de próximo passo.'
            : 'Boa tentativa, mas procure aprofundar as perguntas investigativas de impacto financeiro antes de justificar a solução.',
      };

      setEvaluationResult(result);
      setTotalXpEarned((prev) => prev + xp);
      setEvaluating(false);
      SoundFX.play('success');
      toast.success(`Duelo avaliado! +${xp} XP adicionados ao seu perfil.`);
    }, 800);
  };

  const handleContest = () => {
    setIsContested(true);
    SoundFX.play('confirm');
    toast.info('Contestação enviada ao comitê de vendas para revisão de pontuação.');
  };

  return (
    <div className="space-y-6">
      {/* Header do Modo War Room */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-line bg-gradient-to-r from-surface-elevated/90 via-surface/80 to-surface-elevated/90 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-brand/20 to-brand-neon/10 border border-brand/40 text-brand shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <Swords className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand px-2 py-0.5 rounded-full bg-brand/10 border border-brand/30">
                War Room Arena • Live Combat
              </span>
              <span className="text-xs font-semibold text-ink-2">Eixo 14 Pedagógico</span>
            </div>
            <h2 className="text-xl font-display font-extrabold text-ink mt-0.5">
              Arena de Duelo de Objeções & Treinamento em Equipe
            </h2>
          </div>
        </div>

        {/* Seletor de Modo e Placar de XP */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedMode('objection_duel')}
              className={cn(
                'rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5',
                selectedMode === 'objection_duel'
                  ? 'bg-brand text-on-brand shadow-sm font-bold'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              <Swords className="h-3.5 w-3.5" /> Duelo 1v1
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('team_challenge')}
              className={cn(
                'rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5',
                selectedMode === 'team_challenge'
                  ? 'bg-brand text-on-brand shadow-sm font-bold'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              <Users className="h-3.5 w-3.5" /> Desafio de Time
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-500 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Flame className="h-4 w-4" />
            <span>{totalXpEarned} XP Arena</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Lista de Objeções do Playbook */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <Target className="h-4 w-4 text-brand" /> Objeções do Playbook
          </h3>

          <div className="space-y-2">
            {OBJECTION_PRESETS.map((preset) => {
              const isSelected = activeObjection.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    'w-full text-left p-3.5 rounded-xl border transition-all text-xs',
                    isSelected
                      ? 'border-brand bg-brand/10 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                      : 'border-line/70 bg-surface/60 hover:bg-surface-elevated/70 text-ink-2',
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-ink">{preset.category}</span>
                    <Badge
                      variant={
                        preset.difficulty === 'Difícil'
                          ? 'destructive'
                          : preset.difficulty === 'Médio'
                            ? 'warning'
                            : 'success'
                      }
                      className="text-[10px] py-0 px-2"
                    >
                      {preset.difficulty}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-ink-2 italic font-serif text-[11px]">
                    {preset.prompt}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="p-4 rounded-xl border border-line/60 bg-surface/40 text-xs space-y-2">
            <span className="font-bold text-ink flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> Dica de Treinamento
            </span>
            <p className="text-ink-2 text-[11px] leading-relaxed">
              Responda em tom profissional focando em perguntas abertas que façam o prospect
              mensurar o custo de não resolver a dor agora.
            </p>
          </div>
        </div>

        {/* Coluna Central e Direita: Campo de Combate e Avaliação */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 border-line bg-surface-elevated/80 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line/60">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-bold text-brand border-brand/40">
                  {activeObjection.category}
                </Badge>
                <span className="text-xs text-ink-2">Desafio de Argumentação</span>
              </div>
              <div className="text-xs font-mono font-bold text-ink-2 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Tempo de Resposta: <span>{timeRemaining}s</span>
              </div>
            </div>

            {/* Objeção em Destaque */}
            <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-amber-500 block mb-1">
                Objeção do Prospect:
              </span>
              <p className="text-base font-serif italic text-ink font-semibold">
                {activeObjection.prompt}
              </p>
            </div>

            {/* Pontos Ideais de Contorno */}
            <div className="mt-3">
              <span className="text-xs font-bold text-ink-2 block mb-1.5">
                Critérios esperados no Playbook:
              </span>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {activeObjection.idealPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="p-2 rounded-lg bg-surface-2/60 border border-line/50 text-[11px] text-ink-2 flex items-start gap-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Campo de Defesa */}
            <div className="mt-4 space-y-2">
              <label htmlFor="defense-input" className="block text-xs font-bold text-ink">
                Sua Resposta / Argumento de Contorno:
              </label>
              <textarea
                id="defense-input"
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Digite sua resposta estruturada aplicando SPIN Selling e Ancoragem de Valor..."
                className="w-full rounded-xl border border-line bg-surface p-3 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setResponseText('')}
                disabled={evaluating || !responseText}
                className="text-xs text-ink-2"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Limpar
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmitDefense}
                disabled={evaluating || !responseText.trim()}
                className="text-xs font-bold px-4"
              >
                {evaluating ? (
                  <>Avaliando com IA...</>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Submeter Resposta
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Feedback e Pontuação Pedagógica dos 4 Critérios */}
          {evaluationResult && (
            <Card className="p-5 border-brand/40 bg-surface-elevated/90 backdrop-blur-xl shadow-[0_0_30px_rgba(0,240,255,0.15)] animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-line/60">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  <h4 className="font-display text-sm font-bold text-ink">
                    Avaliação Pedagógica de Desempenho
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 rounded-full">
                    Score: {evaluationResult.compositeScore}/100
                  </span>
                  <span className="text-xs font-mono font-extrabold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    +{evaluationResult.awardedXp} XP
                  </span>
                </div>
              </div>

              {/* 4 Critérios Objetivos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-surface border border-line/60 text-center">
                  <span className="text-[10px] text-ink-2 uppercase font-bold block mb-1">
                    Identificação Necessidade
                  </span>
                  <span className="text-lg font-mono font-extrabold text-brand">
                    {evaluationResult.needIdentificationScore}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line/60 text-center">
                  <span className="text-[10px] text-ink-2 uppercase font-bold block mb-1">
                    Ancoragem de Valor
                  </span>
                  <span className="text-lg font-mono font-extrabold text-emerald-400">
                    {evaluationResult.valueAnchoringScore}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line/60 text-center">
                  <span className="text-[10px] text-ink-2 uppercase font-bold block mb-1">
                    Aderência Playbook
                  </span>
                  <span className="text-lg font-mono font-extrabold text-amber-400">
                    {evaluationResult.playbookAdherenceScore}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line/60 text-center">
                  <span className="text-[10px] text-ink-2 uppercase font-bold block mb-1">
                    Clareza & Empatia
                  </span>
                  <span className="text-lg font-mono font-extrabold text-purple-400">
                    {evaluationResult.clarityEmpathyScore}%
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-surface-2/60 border border-line/60 text-xs text-ink-2 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <span>{evaluationResult.feedback}</span>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleContest}
                  disabled={isContested}
                  className="text-xs text-ink-2"
                >
                  <HelpCircle className="h-3.5 w-3.5 mr-1" />
                  {isContested ? 'Contestação Registrada' : 'Contestar Avaliação'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
