import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Check, ChevronRight, Sparkles, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { useState } from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';
import { Button } from './Button.js';
import { Gamified3DOrb } from './Gamified3DOrb.js';
import {
  FlameStreakIcon,
  Gem3DIcon,
  ShieldSecurityIcon,
  Trophy3DIcon,
} from './icons/Isometric3DIcons.js';
import { TiltCard } from './TiltCard.js';

import type { SellerScore } from '../../features/gamification/domain/Gamification.js';
import { BADGE_DEFINITIONS } from '../../features/gamification/domain/Gamification.js';

export interface GamificationWidgetProps {
  initialXp?: number;
  nextLevelXp?: number;
  level?: number;
  streakDays?: number;
  show3DCore?: boolean;
  sellerScore?: SellerScore | null;
}

export function GamificationWidget({
  initialXp = 0,
  nextLevelXp = 2000,
  level = 1,
  streakDays = 0,
  show3DCore = true,
  sellerScore = null,
}: GamificationWidgetProps) {
  const [activeTab, setActiveTab] = useState<'missions' | 'achievements'>('missions');
  const [showPanel, setShowPanel] = useState(false);
  const currentLevel = sellerScore ? sellerScore.level : level;
  const [localBonusXp, setLocalBonusXp] = useState(0);
  const xp = sellerScore ? sellerScore.totalPoints + localBonusXp : initialXp + localBonusXp;
  const streak = sellerScore ? sellerScore.streakDays : streakDays;
  const [soundActive, setSoundActive] = useState(() => SoundFX.isEnabled());

  const [missions, setMissions] = useState([
    { id: 1, title: 'Completar perfil do SDR e ICP', xp: 250, done: false },
    {
      id: 2,
      title: 'Qualificar 5 novos leads corporativos hoje',
      xp: 500,
      done: Boolean(sellerScore && sellerScore.qualifiedCount >= 5),
    },
    {
      id: 3,
      title: 'Agendar 2 reuniões de demonstração executiva',
      xp: 800,
      done: Boolean(sellerScore && sellerScore.meetingsCount >= 2),
    },
    {
      id: 4,
      title: 'Realizar ligações e contatos comerciais ativos',
      xp: 450,
      done: Boolean(sellerScore && sellerScore.callsCount >= 10),
    },
  ]);

  const achievements = sellerScore?.badges?.length
    ? sellerScore.badges.map((b) => ({
        id: b.id,
        title: b.title,
        desc: b.description,
        icon:
          b.id === 'CLOSER_ELITE'
            ? Trophy3DIcon
            : b.id === 'DISCIPLINE_STREAK'
              ? FlameStreakIcon
              : b.id === 'MEETING_PRO'
                ? Gem3DIcon
                : ShieldSecurityIcon,
        unlocked: b.unlocked,
        reward: `+${b.id === 'CLOSER_ELITE' ? 1000 : 300} XP`,
      }))
    : [
        {
          id: 'first-deal',
          title: BADGE_DEFINITIONS.FIRST_BLOOD.title,
          desc: BADGE_DEFINITIONS.FIRST_BLOOD.description,
          icon: Trophy3DIcon,
          unlocked: Boolean(sellerScore && sellerScore.dealsClosed >= 1),
          reward: '+300 XP',
        },
        {
          id: 'streak-master',
          title: BADGE_DEFINITIONS.DISCIPLINE_STREAK.title,
          desc: BADGE_DEFINITIONS.DISCIPLINE_STREAK.description,
          icon: FlameStreakIcon,
          unlocked: streak >= 3,
          reward: '+500 XP',
        },
        {
          id: 'call-master',
          title: BADGE_DEFINITIONS.CALL_MASTER.title,
          desc: BADGE_DEFINITIONS.CALL_MASTER.description,
          icon: ShieldSecurityIcon,
          unlocked: Boolean(sellerScore && sellerScore.callsCount >= 50),
          reward: '+400 XP',
        },
        {
          id: 'closer-elite',
          title: BADGE_DEFINITIONS.CLOSER_ELITE.title,
          desc: BADGE_DEFINITIONS.CLOSER_ELITE.description,
          icon: Gem3DIcon,
          unlocked: Boolean(sellerScore && sellerScore.wonRevenue >= 100000),
          reward: '+1000 XP',
        },
      ];

  const toggleSound = () => {
    const next = SoundFX.toggleMute();
    setSoundActive(next);
  };

  const handleOrbBoost = () => {
    setLocalBonusXp((prev) => {
      const nextBonus = prev + 25;
      const basePoints = sellerScore ? sellerScore.totalPoints : initialXp;
      if (basePoints + nextBonus >= nextLevelXp) {
        triggerLevelUp();
      }
      return nextBonus;
    });
  };

  const triggerLevelUp = () => {
    SoundFX.play('success');
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
      colors: [
        '--color-brand-accent',
        '--color-brand-primary',
        '--color-brand-secondary',
        '--color-success',
      ].map((token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim()),
    });
  };

  const toggleMission = (id: number) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const newDone = !m.done;
          if (newDone) {
            SoundFX.play('confirm');
            setLocalBonusXp((currentBonus) => {
              const updatedBonus = currentBonus + m.xp;
              const basePoints = sellerScore ? sellerScore.totalPoints : initialXp;
              if (basePoints + updatedBonus >= nextLevelXp) {
                setTimeout(triggerLevelUp, 300);
              }
              return updatedBonus;
            });
          } else {
            SoundFX.play('click');
            setLocalBonusXp((currentBonus) => Math.max(0, currentBonus - m.xp));
          }
          return { ...m, done: newDone };
        }
        return m;
      }),
    );
  };

  const progressPercent = Math.min(100, Math.round((xp / nextLevelXp) * 100));

  return (
    <div className="relative overflow-hidden rounded-card-lg border border-brand/40 bg-surface-elevated/85 backdrop-blur-2xl p-5 shadow-glow-brand transition-all duration-300">
      {/* Luz Especular de Fundo */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-accent-cyan/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

      {/* Top Header com Grid Bento */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Lado Esquerdo: 3D Orb + Nível + Metas */}
        <div className="flex items-center gap-4">
          {show3DCore && (
            <div className="relative shrink-0">
              <Gamified3DOrb
                size={76}
                interactive
                onOrbClick={handleOrbBoost}
                className="cursor-pointer"
              />
              <span className="absolute -bottom-1 -right-1 rounded-full bg-surface-2 border border-brand/40 px-1.5 py-0.5 text-[9px] font-extrabold text-brand shadow">
                3D
              </span>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-active/20 border border-brand/40 px-2.5 py-0.5 text-xs font-bold text-brand">
                <Trophy className="h-3.5 w-3.5" /> Nível {currentLevel}
              </span>

              {streak > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/15 border border-danger/30 px-2.5 py-0.5 text-xs font-bold text-danger">
                  <FlameStreakIcon size={16} animate /> {streak} Dias Seguidos
                </span>
              )}

              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                Combo 1.5x Ativo
              </span>
            </div>

            <h3 className="mt-1 font-display text-base font-bold text-ink flex items-center gap-2">
              Centro de Conquistas & Gamificação
              <Sparkles className="h-4 w-4 text-brand" />
            </h3>

            <p className="text-xs text-ink-2">
              <span className="font-semibold text-brand [font-variant-numeric:tabular-nums]">
                {xp.toLocaleString('pt-BR')}
              </span>{' '}
              / {nextLevelXp.toLocaleString('pt-BR')} XP para o Nível {currentLevel + 1}
            </p>
          </div>
        </div>

        {/* Lado Direito: Ações e Toggles */}
        <div className="flex items-center gap-2">
          {/* Botão de Som Mute/Unmute */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSound}
            aria-label={soundActive ? 'Desativar efeitos sonoros' : 'Ativar efeitos sonoros'}
            title={soundActive ? 'Som ativado' : 'Som mudo'}
            className="text-ink-2 hover:text-brand"
          >
            {soundActive ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4 text-ink-2/60" />
            )}
          </Button>

          {/* Toggle de Missões e Conquistas */}
          <Button
            type="button"
            variant={showPanel ? 'cosmic' : 'secondary'}
            size="sm"
            onClick={() => {
              SoundFX.play('navigate');
              setShowPanel(!showPanel);
            }}
            shine={showPanel}
            className="text-xs font-semibold"
            aria-expanded={showPanel}
            aria-label="Abrir missões e conquistas"
          >
            <Zap className="h-3.5 w-3.5 text-brand" />
            <span>Missões & Badges</span>
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-300',
                showPanel && 'rotate-90',
              )}
            />
          </Button>
        </div>
      </div>

      {/* Barra de Progresso com Glow Metálico */}
      <div className="relative z-10 mt-4">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-line/80 bg-surface-2/80 p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-full rounded-full bg-gradient-to-r from-brand via-brand-2 to-white shadow-glow-brand-strong"
          >
            {/* Feixe de luz correndo sobre o progresso */}
            <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)] animate-pulse" />
          </motion.div>
        </div>
      </div>

      {/* Painel Expansível de Missões e Badges */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 mt-4 overflow-hidden border-t border-line/70 pt-4"
          >
            {/* Tabs de Seleção */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    SoundFX.play('click');
                    setActiveTab('missions');
                  }}
                  className={cn(
                    'rounded-control px-3 py-1 text-xs font-bold transition-all',
                    activeTab === 'missions'
                      ? 'bg-brand text-on-brand shadow-sm'
                      : 'text-ink-2 hover:bg-surface-interactive hover:text-ink',
                  )}
                >
                  Missões Diárias
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SoundFX.play('click');
                    setActiveTab('achievements');
                  }}
                  className={cn(
                    'rounded-control px-3 py-1 text-xs font-bold transition-all',
                    activeTab === 'achievements'
                      ? 'bg-brand text-on-brand shadow-sm'
                      : 'text-ink-2 hover:bg-surface-interactive hover:text-ink',
                  )}
                >
                  Conquistas 3D
                </button>
              </div>

              <span className="text-[11px] font-bold text-brand flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Toque no Cristal 3D (+25 XP)
              </span>
            </div>

            {/* Conteúdo Tab: Missões Diárias */}
            {activeTab === 'missions' && (
              <div className="space-y-2">
                {missions.map((mission) => (
                  <button
                    key={mission.id}
                    type="button"
                    aria-pressed={mission.done}
                    onClick={() => toggleMission(mission.id)}
                    className={cn(
                      'group flex w-full items-center justify-between rounded-xl border p-3 text-xs text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer',
                      mission.done
                        ? 'border-success/40 bg-success/10 text-ink-2'
                        : 'border-line/70 bg-surface/70 hover:border-brand/40 hover:bg-surface-interactive text-ink',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                          mission.done
                            ? 'border-success bg-success text-slate-950 font-bold'
                            : 'border-line group-hover:border-brand/60',
                        )}
                      >
                        {mission.done && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </span>
                      <span
                        className={cn(
                          'text-xs transition-colors',
                          mission.done ? 'line-through text-ink-2/70 font-medium' : 'font-semibold',
                        )}
                      >
                        {mission.title}
                      </span>
                    </span>

                    <span className="flex items-center gap-1 font-extrabold text-brand shrink-0">
                      <Award className="h-3.5 w-3.5" /> +{mission.xp} XP
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Conteúdo Tab: Conquistas 3D */}
            {activeTab === 'achievements' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                {achievements.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TiltCard
                      key={item.id}
                      maxTiltDegrees={5}
                      className={cn(
                        'rounded-xl border p-3 flex flex-col justify-between transition-all backdrop-blur-md',
                        item.unlocked
                          ? 'border-brand/35 bg-surface-elevated/90 shadow-sm'
                          : 'border-line/50 bg-surface/40 opacity-60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Icon size={32} animate={item.unlocked} />
                        {item.unlocked ? (
                          <span className="rounded-full bg-success/20 border border-success/40 px-1.5 py-0.5 text-[9px] font-bold text-success">
                            Desbloqueada
                          </span>
                        ) : (
                          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold text-ink-2">
                            Bloqueada
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <h4 className="font-bold text-xs text-ink">{item.title}</h4>
                        <p className="text-[11px] text-ink-2 mt-0.5 leading-tight">{item.desc}</p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[10px] font-extrabold text-brand">
                        <span>Recompensa</span>
                        <span>{item.reward}</span>
                      </div>
                    </TiltCard>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
