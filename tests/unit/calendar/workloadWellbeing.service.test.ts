import { describe, expect, it, beforeEach } from 'vitest';
import {
  CalendarEventSummary,
  workloadWellbeingService,
  WORKLOAD_K_ANONYMITY_MIN,
} from '../../../src/features/calendar/services/workloadWellbeing.service.js';

describe('WorkloadWellbeingService — Onda 05 (Eixo 18)', () => {
  const orgId = 'org-wellbeing-test';
  const sellerId = 'seller-diego';

  beforeEach(() => {
    workloadWellbeingService.clear();
  });

  it('deve gerenciar preferências do vendedor e respeitar opt-out voluntário', () => {
    const pref = workloadWellbeingService.getOrCreatePreferences(orgId, sellerId);
    expect(pref.enableBreakSuggestions).toBe(true);
    expect(pref.optOutWellbeingFeatures).toBe(false);

    const updated = workloadWellbeingService.updatePreferences(orgId, sellerId, {
      optOutWellbeingFeatures: true,
    });
    expect(updated.optOutWellbeingFeatures).toBe(true);
  });

  it('deve calcular métricas operacionais objetivas de reuniões consecutivas (back-to-back)', () => {
    const events: CalendarEventSummary[] = [
      {
        id: 'evt-1',
        title: 'Demo Cliente A',
        startTime: '2026-10-19T09:00:00Z',
        endTime: '2026-10-19T10:00:00Z',
        isCommercialMeeting: true,
      },
      {
        id: 'evt-2',
        title: 'Alinhamento Cliente B',
        startTime: '2026-10-19T10:00:00Z', // 0 min gap -> back-to-back
        endTime: '2026-10-19T11:00:00Z',
        isCommercialMeeting: true,
      },
      {
        id: 'evt-3',
        title: 'Fechamento Cliente C',
        startTime: '2026-10-19T11:00:00Z', // 0 min gap -> back-to-back
        endTime: '2026-10-19T12:00:00Z',
        isCommercialMeeting: true,
      },
    ];

    const metrics = workloadWellbeingService.calculateDailyWorkloadMetrics(
      orgId,
      sellerId,
      '2026-10-19',
      events,
      5,
      2,
    );

    expect(metrics.totalMeetingsCount).toBe(3);
    expect(metrics.totalMeetingMinutes).toBe(180);
    expect(metrics.backToBackMeetingsCount).toBe(2);
    expect(metrics.maxConsecutiveMeetingMinutes).toBe(180);
  });

  it('deve gerar recomendação voluntária de intervalo quando houver reuniões consecutivas', () => {
    const metrics = workloadWellbeingService.calculateDailyWorkloadMetrics(
      orgId,
      sellerId,
      '2026-10-19',
      [
        {
          id: 'e-1',
          title: 'Reunião 1',
          startTime: '2026-10-19T14:00:00Z',
          endTime: '2026-10-19T15:00:00Z',
          isCommercialMeeting: true,
        },
        {
          id: 'e-2',
          title: 'Reunião 2',
          startTime: '2026-10-19T15:00:00Z',
          endTime: '2026-10-19T16:00:00Z',
          isCommercialMeeting: true,
        },
      ],
    );

    const recs = workloadWellbeingService.generateRecommendations(orgId, sellerId, metrics);

    expect(recs.length).toBeGreaterThan(0);
    const breakRec = recs.find((r) => r.type === 'SUGGEST_BREAK');
    expect(breakRec).toBeDefined();
    expect(breakRec?.isVoluntary).toBe(true);
    expect(breakRec?.explanation).toContain('reuniões consecutivas');
  });

  it('não deve emitir recomendações se o vendedor tiver ativado opt-out', () => {
    workloadWellbeingService.updatePreferences(orgId, sellerId, {
      optOutWellbeingFeatures: true,
    });

    const metrics = workloadWellbeingService.calculateDailyWorkloadMetrics(
      orgId,
      sellerId,
      '2026-10-19',
      [
        {
          id: 'e-1',
          title: 'Reunião 1',
          startTime: '2026-10-19T14:00:00Z',
          endTime: '2026-10-19T15:00:00Z',
          isCommercialMeeting: true,
        },
        {
          id: 'e-2',
          title: 'Reunião 2',
          startTime: '2026-10-19T15:00:00Z',
          endTime: '2026-10-19T16:00:00Z',
          isCommercialMeeting: true,
        },
      ],
    );

    const recs = workloadWellbeingService.generateRecommendations(orgId, sellerId, metrics);
    expect(recs).toHaveLength(0);
  });

  it('deve criar e concluir microtreinamentos pedagógicos de 3 minutos', () => {
    const session = workloadWellbeingService.createMicroTrainingSession(
      orgId,
      sellerId,
      'PRE_MEETING_CHECKLIST',
      'Logística S/A',
    );

    expect(session.trainingId).toBeDefined();
    expect(session.targetDurationMinutes).toBe(3);
    expect(session.isCompleted).toBe(false);
    expect(session.prompts).toHaveLength(3);

    const completed = workloadWellbeingService.completeMicroTraining(
      session.trainingId,
      orgId,
      5,
    );

    expect(completed.isCompleted).toBe(true);
    expect(completed.completedAt).toBeDefined();
    expect(completed.sellerRating).toBe(5);
  });

});

describe('REMED-07 — k-anonymity server-side (K=5 vendedores distintos, universo fixo)', () => {
  const org = 'org-kanon';
  const week = '2026-10-19'; // segunda-feira
  const meeting = (id: string, minutes = 60) => [
    {
      id: `evt-${id}`,
      title: 'Reunião',
      startTime: '2026-10-19T10:00:00Z',
      endTime: new Date(Date.parse('2026-10-19T10:00:00Z') + minutes * 60_000).toISOString(),
      isCommercialMeeting: true,
    },
  ];
  const seed = (sellers: string[], o = org, date = week, minutes = 60) => {
    for (const s of sellers) {
      workloadWellbeingService.calculateDailyWorkloadMetrics(o, s, date, meeting(s, minutes));
    }
  };

  beforeEach(() => workloadWellbeingService.clear());

  it('K exportado é 5', () => {
    expect(WORKLOAD_K_ANONYMITY_MIN).toBe(5);
  });

  it('4 vendedores distintos: nega e não revela o tamanho', () => {
    seed(['a', 'b', 'c', 'd']);
    const r = workloadWellbeingService.getCollectiveAggregatedWorkload(org, week);
    expect(r.anonymizedSampleCount).toBe(0);
    expect(r.averageDailyMeetingMinutes).toBe(0);
  });

  it('5 vendedores distintos: aceita', () => {
    seed(['a', 'b', 'c', 'd', 'e']);
    const r = workloadWellbeingService.getCollectiveAggregatedWorkload(org, week);
    expect(r.anonymizedSampleCount).toBe(5);
    expect(r.averageDailyMeetingMinutes).toBe(60);
    expect(r.periodStart).toBe('2026-10-19');
    expect(r.periodEnd).toBe('2026-10-25');
  });

  it('duplicados do mesmo vendedor não contam (recalcular o dia substitui)', () => {
    seed(['a', 'b', 'c', 'd', 'd', 'd']);
    seed(['d'], org, '2026-10-20');
    expect(workloadWellbeingService.getCollectiveAggregatedWorkload(org, week).anonymizedSampleCount).toBe(0);
  });

  it('sellerId vazio não conta nem entra nas médias; outro tenant e outra semana não contam', () => {
    seed(['a', 'b', 'c', 'd', '   ', '']);
    seed(['e'], 'org-outro');
    seed(['f'], org, '2026-10-27');
    expect(workloadWellbeingService.getCollectiveAggregatedWorkload(org, week).anonymizedSampleCount).toBe(0);
    seed(['e'], org, week, 60);
    seed([''], org, week, 600);
    const r = workloadWellbeingService.getCollectiveAggregatedWorkload(org, week);
    expect(r.anonymizedSampleCount).toBe(5);
    expect(r.averageDailyMeetingMinutes).toBe(60);
  });

  it('cada vendedor pesa 1: vários dias de um vendedor não dominam a média', () => {
    seed(['a', 'b', 'c', 'd', 'e'], org, week, 60);
    for (const day of ['2026-10-20', '2026-10-21', '2026-10-22']) seed(['a'], org, day, 60);
    expect(workloadWellbeingService.getCollectiveAggregatedWorkload(org, week).averageDailyMeetingMinutes).toBe(60);
  });

  it('diferença entre consultas: universo fixo + arredondamento escondem o 6º vendedor', () => {
    seed(['a', 'b', 'c', 'd', 'e'], org, week, 60);
    const before = workloadWellbeingService.getCollectiveAggregatedWorkload(org, week);
    seed(['f'], org, week, 72);
    const after = workloadWellbeingService.getCollectiveAggregatedWorkload(org, week);
    expect(after.anonymizedSampleCount).toBe(6);
    // média real 62 → publicada 60: a diferença não revela os 72 min do novo vendedor
    expect(after.averageDailyMeetingMinutes).toBe(before.averageDailyMeetingMinutes);
    expect(after.averageDailyMeetingMinutes % 5).toBe(0);
  });

  it('a API não aceita métricas do chamador (assinatura só tenant + semana)', () => {
    expect(workloadWellbeingService.getCollectiveAggregatedWorkload.length).toBe(2);
    expect(() => workloadWellbeingService.getCollectiveAggregatedWorkload(org, 'xx')).toThrow();
  });
});
