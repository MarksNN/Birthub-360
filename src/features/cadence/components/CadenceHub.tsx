import confetti from 'canvas-confetti';
import { Play, Plus, Repeat, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button.js';
import { PageTitleCard } from '../../../components/ui/PageTitleCard.js';
import { useAuth } from '../../../contexts/AuthContext.js';
import { hasRequiredRole } from '../../../lib/auth/authorization.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import {
  CADENCE_WRITE_ROLES,
  CadenceRunsSection,
  JourneyTemplatesDialog,
  NewSequenceDialog,
  OptOutsSection,
  SequencesSection,
  StartRunDialog,
} from './hub/index.js';

/**
 * Tela de cadência multicanal e ciclo de receita (Agente 17, Onda 10) — ver
 * `.agents/handoffs/onda-7/17-para-02-rota-cadencia.md`. Densidade alta, sem hero centralizada
 * (constituição de design, `.claude/CLAUDE.md` §4/§7): duas seções de dado real (execuções de
 * cadência, registros de opt-out) mais uma nota honesta do que ainda não existe — nada de dado
 * fictício preenchendo espaço.
 *
 * Cada seção busca e trata seu próprio loading/erro/vazio de forma independente (mesmo padrão de
 * `AgingTab.tsx`/`CrmQualityTab.tsx`): uma falha em `/api/cadence/opt-outs` não deve impedir
 * `/api/cadence/runs` de aparecer, e vice-versa.
 */
export function CadenceHub() {
  const { currentUser } = useAuth();
  // Mesmo achado de RBAC do Piloto 017 (Playbook): o botão de encerrar sequência só some pra quem
  // já não pode escrever neste módulo (mesmas `writeRoles` do backend) — a rota já protege de
  // verdade, isto é só não mostrar uma ação que resultaria em 403.
  const canManage = !!currentUser && hasRequiredRole(currentUser.role, CADENCE_WRITE_ROLES);
  const [runsKey, setRunsKey] = useState(0);
  const [sequencesKey, setSequencesKey] = useState(0);
  const [newSequenceOpen, setNewSequenceOpen] = useState(false);
  const [startRunOpen, setStartRunOpen] = useState(false);
  const [journeyTemplatesOpen, setJourneyTemplatesOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto bg-bg text-ink p-6 md:p-8 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageTitleCard
          title="Cadência & Ciclo de Receita"
          subtitle="Opt-outs unificados por lead/canal, detecção inteligente de resposta (Reply Tracking) e o estado real de cada sequência multicanal em andamento."
          icon={<Repeat className="h-5 w-5" aria-hidden="true" />}
          accent="success"
          actions={
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                soundClick
                onClick={() => setJourneyTemplatesOpen(true)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Modelos de Jornada
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                soundClick
                onClick={() => setNewSequenceOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Nova sequência
              </Button>
              <Button
                type="button"
                size="sm"
                variant="brand"
                soundClick
                onClick={() => setStartRunOpen(true)}
                className="rounded-full font-display font-bold"
              >
                <Play className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Iniciar cadência
              </Button>
            </>
          }
        />

        {/*
          Chaves com prefixo de propósito: as duas seções são irmãs e os dois contadores começam
          em 0 (e voltam a coincidir sempre que só um deles é incrementado) — `key={runsKey}` e
          `key={sequencesKey}` puros colidiam ("Encountered two children with the same key"), e o
          React deixava cópias antigas de CadenceRunsSection no DOM a cada remontagem (achado real
          reproduzido pelo cadence.spec.ts: três filtros "Encerrada" na mesma página).
        */}
        <CadenceRunsSection key={`runs-${runsKey}`} />
        <SequencesSection key={`sequences-${sequencesKey}`} canManage={canManage} />
        <OptOutsSection />
      </div>

      <JourneyTemplatesDialog
        isOpen={journeyTemplatesOpen}
        onClose={() => setJourneyTemplatesOpen(false)}
        onCreated={() => {
          SoundFX.play('confirm');
          setRunsKey((k) => k + 1);
          setSequencesKey((k) => k + 1);
        }}
      />
      <NewSequenceDialog
        isOpen={newSequenceOpen}
        onClose={() => setNewSequenceOpen(false)}
        onCreated={() => {
          SoundFX.play('confirm');
          setRunsKey((k) => k + 1);
          setSequencesKey((k) => k + 1);
        }}
      />
      <StartRunDialog
        isOpen={startRunOpen}
        onClose={() => setStartRunOpen(false)}
        onStarted={() => {
          SoundFX.play('success');
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: [
              '--color-brand-primary',
              '--color-brand-secondary',
              '--color-brand-accent',
              '--color-success',
              '--color-info',
            ].map((token) =>
              getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
            ),
            disableForReducedMotion: true,
          });
          setRunsKey((k) => k + 1);
        }}
      />
    </div>
  );
}
