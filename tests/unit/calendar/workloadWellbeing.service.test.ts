import { describe, expect, it, beforeEach } from 'vitest';
import {
  CalendarEventSummary,
  workloadWellbeingService,
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

  it('deve gerar relatório coletivo anônimo com mínimo seguro de 5 participantes para evitar reidentificação', () => {
    // Menos de 5 participantes -> retorna dados zerados
    const insufficientMetrics = [
      workloadWellbeingService.calculateDailyWorkloadMetrics(orgId, 's-1', '2026-10-19', []),
    ];
    const reportSmall = workloadWellbeingService.getCollectiveAggregatedWorkload(
      orgId,
      insufficientMetrics,
    );
    expect(reportSmall.anonymizedSampleCount).toBe(1);
    expect(reportSmall.averageDailyMeetingMinutes).toBe(0);

    // Amostra de 5 participantes -> dados agregados calculados com sucesso
    const sample5 = ['s1', 's2', 's3', 's4', 's5'].map((id) =>
      workloadWellbeingService.calculateDailyWorkloadMetrics(orgId, id, '2026-10-19', [
        {
          id: `evt-${id}`,
          title: 'Reunião',
          startTime: '2026-10-19T10:00:00Z',
          endTime: '2026-10-19T11:00:00Z',
          isCommercialMeeting: true,
        },
      ]),
    );

    const reportAggregated = workloadWellbeingService.getCollectiveAggregatedWorkload(orgId, sample5);
    expect(reportAggregated.anonymizedSampleCount).toBe(5);
    expect(reportAggregated.averageDailyMeetingMinutes).toBe(60);
  });
});
