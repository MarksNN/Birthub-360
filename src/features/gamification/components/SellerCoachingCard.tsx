import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, Target, Zap } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import { Gem3DIcon, Trophy3DIcon } from '../../../components/ui/icons/Isometric3DIcons.js';
import { Label } from '../../../components/ui/Label.js';
import { Select } from '../../../components/ui/Select.js';
import { api } from '../../../lib/api.js';
import { fadeInUp } from '../../../lib/motion.js';
import { SoundFX } from '../../../lib/soundEffects.js';

type SellerRole = 'SDR / Hunter' | 'Closer / Executivo de Contas' | 'Account Manager / Farmer';

interface SellerCoachingReport {
  motivationalHeadline: string;
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  celebrationPoint: string;
  criticalGaps: string[];
  actionableMicroHabits: string[];
  suggestedTrainingTopic: string;
  nextWeekTargetFocus: string;
}

interface CoachingResponse {
  report: SellerCoachingReport;
  period: string;
}

const GRADE_VARIANT: Record<
  SellerCoachingReport['overallGrade'],
  'success' | 'info' | 'warning' | 'danger'
> = {
  'A+': 'success',
  A: 'success',
  B: 'info',
  C: 'warning',
  D: 'danger',
};

const ROLE_OPTIONS: SellerRole[] = [
  'SDR / Hunter',
  'Closer / Executivo de Contas',
  'Account Manager / Farmer',
];

/**
 * Coaching semanal por IA, gerado sob demanda com estética 2026 e feedback gamificado.
 */
export function SellerCoachingCard() {
  const [role, setRole] = useState<SellerRole | ''>('');
  const [report, setReport] = useState<SellerCoachingReport | null>(null);
  const [period, setPeriod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    SoundFX.play('click');
    try {
      const data = await api.post<CoachingResponse>('/api/gamification/coaching/weekly', {
        role: role || undefined,
      });
      setReport(data.report);
      setPeriod(data.period);
      SoundFX.play('success');

      if (data.report?.overallGrade === 'A+' || data.report?.overallGrade === 'A') {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#00E5FF', '#38BDF8', '#10B981', '#FFFFFF'],
        });
      }
    } catch (e: any) {
      SoundFX.play('error');
      setError(e instanceof Error ? e.message : 'Falha ao gerar o coaching desta semana.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show" className="rounded-card-lg">
      <Card variant="bento" padding="lg" spotlight soundHover>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line/70 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-ink dark:text-brand">
                Desenvolvimento comercial · IA 2026
              </p>
              <h3 className="mt-0.5 text-base font-display font-bold text-ink">
                Coaching Semanal Inteligente
              </h3>
            </div>
          </div>
          {period && (
            <span className="rounded-full bg-surface-2 border border-line px-3 py-1 text-[11px] font-medium text-ink-2">
              Semana de {period}
            </span>
          )}
        </div>

        {!report && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3.5">
            <div className="flex-1">
              <Label htmlFor="seller-role">Como você atua nesta semana? (opcional)</Label>
              <Select
                id="seller-role"
                value={role}
                onChange={(e) => setRole(e.target.value as SellerRole | '')}
              >
                <option value="">Não informar</option>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              variant="cosmic"
              shine
              onClick={generate}
              disabled={loading}
              className="shrink-0 font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Analisando métricas...
                </>
              ) : (
                'Gerar coaching semanal'
              )}
            </Button>
          </div>
        )}

        {error && (
          <div
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-critical/30 bg-critical/10 p-3.5 backdrop-blur-md"
            role="alert"
          >
            <div className="flex items-center gap-2.5 text-sm text-critical">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
            <Button
              type="button"
              onClick={generate}
              variant="link"
              size="sm"
              className="h-auto shrink-0 px-0 text-critical font-bold"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-brand/25 bg-brand/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                {report.overallGrade === 'A+' ? (
                  <Trophy3DIcon size={32} animate />
                ) : report.overallGrade === 'A' ? (
                  <Gem3DIcon size={30} animate />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 border border-brand/30 text-brand font-black text-sm">
                    {report.overallGrade}
                  </span>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-brand">
                    Avaliação Geral
                  </p>
                  <p className="text-sm font-bold text-ink">{report.motivationalHeadline}</p>
                </div>
              </div>
              <Badge
                variant={GRADE_VARIANT[report.overallGrade]}
                dot
                className="text-xs font-black px-2.5 py-1"
              >
                Nota {report.overallGrade}
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-surface/80 border border-line/80 flex items-start gap-3 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-ok shrink-0 mt-0.5" />
              <p className="text-xs text-ink-2 leading-relaxed">{report.celebrationPoint}</p>
            </div>

            {report.criticalGaps.length > 0 && (
              <div className="p-3.5 rounded-xl bg-surface/60 border border-line/60">
                <p className="text-[11px] font-extrabold text-ink-2 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-warning" />
                  Gargalos Identificados
                </p>
                <ul className="space-y-1.5">
                  {report.criticalGaps.map((gap, i) => (
                    <li key={i} className="text-xs text-ink-2 flex items-start gap-2">
                      <span className="text-brand font-bold">·</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.actionableMicroHabits.length > 0 && (
              <div className="p-3.5 rounded-xl bg-surface/60 border border-line/60">
                <p className="text-[11px] font-extrabold text-ink-2 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-brand" />
                  Micro-hábitos desta semana
                </p>
                <ul className="space-y-1.5">
                  {report.actionableMicroHabits.map((habit, i) => (
                    <li key={i} className="text-xs text-ink-2 flex items-start gap-2">
                      <span className="text-brand font-bold">·</span>
                      <span>{habit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-ink-2 italic">
                Gerado por IA a partir dos seus números comerciais reais.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReport(null)}
                className="text-xs text-ink-2 hover:text-brand"
              >
                Trocar perfil de atuação
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
