import { describe, expect, it } from 'vitest';
import type { BimodalSessionConfig, LiveLatencyMetrics } from '../../../src/shared/contracts/bimodalLiveVoice.contract.js';
import type { MethodologicalMentorProfile, CommercialTechniquePattern } from '../../../src/shared/contracts/methodologicalDigitalTwin.contract.js';
import type { CachedMeetingBriefing, GeofenceMatchResult } from '../../../src/shared/contracts/mobileEdgeBriefing.contract.js';
import type { WarRoomDuelSession, WarRoomPedagogicalEvaluation } from '../../../src/shared/contracts/warRoomArena.contract.js';
import type { SellerStyleProfile, PersonalizedCopyResult } from '../../../src/shared/contracts/shadowCopywriting.contract.js';
import type { DomainEventEnvelope, DomainEventType } from '../../../src/shared/contracts/domainEventMesh.contract.js';

describe('Onda 04 — Validação de Contratos Canônicos', () => {
  it('Eixo 5: Bimodal Live — deve validar tipagem estrita de sessão de voz e métricas de latência', () => {
    const config: BimodalSessionConfig = {
      organizationId: 'org-tenant-1',
      sessionId: 'sess-live-100',
      sellerId: 'seller-ana',
      contextMode: 'roleplay_simulation',
      personaName: 'CFO Cético',
      enableBargeIn: true,
      ragContextAllowed: true,
    };

    const metrics: LiveLatencyMetrics = {
      timeToFirstAudioMs: 450,
      latencyP50Ms: 520,
      latencyP95Ms: 890,
      latencyP99Ms: 1100,
      bargeInResponseMs: 140,
      reconnectCount: 0,
      packetsLost: 0,
    };

    expect(config.sessionId).toBe('sess-live-100');
    expect(config.enableBargeIn).toBe(true);
    expect(metrics.timeToFirstAudioMs).toBeLessThan(800);
    expect(metrics.bargeInResponseMs).toBeLessThan(200);
  });

  it('Eixo 8: Digital Twins Metodológicos — deve validar padrões de técnica e mentor sintético sem clone humano', () => {
    const technique: CommercialTechniquePattern = {
      techniqueId: 'tech-spin-implication',
      name: 'SPIN Implication Questioning',
      category: 'spin_questioning',
      description: 'Perguntas de implicação que exploram as consequências financeiras do problema',
      triggerContext: 'Quando o comprador reconhece o gargalo mas minimiza o impacto',
      exampleSyntheticSnippet: 'Qual o custo mensal de retrabalho que esse gargalo tem gerado para a equipe?',
      evaluationChecklist: ['Identifica custo oculto', 'Não propõe solução antes da hora'],
      recommendedTalkRatioTarget: 0.35,
    };

    const mentor: MethodologicalMentorProfile = {
      mentorId: 'mentor-spin-master',
      organizationId: 'org-tenant-1',
      syntheticPersonaName: 'Treinador Metodológico SPIN',
      targetMethodology: 'SPIN Selling',
      curatedBy: 'Diretoria Comercial',
      isSyntheticCoach: true,
      allowedTechniques: ['tech-spin-implication'],
      updatedAt: new Date().toISOString(),
    };

    expect(mentor.isSyntheticCoach).toBe(true);
    expect(technique.category).toBe('spin_questioning');
    expect(technique.recommendedTalkRatioTarget).toBe(0.35);
  });

  it('Eixo 9: Mobile Edge AI — deve validar briefing em cache e proteção de gravação no geofencing', () => {
    const briefing: CachedMeetingBriefing = {
      briefingId: 'brf-001',
      organizationId: 'org-tenant-1',
      sellerId: 'seller-ana',
      companyId: 'comp-via-1',
      companyName: 'Viação Ouro e Prata',
      meetingGoal: 'Apresentar proposta de otimização de rotas e telemetria',
      summaryHistory: 'Última interação há 14 dias com o Diretor de Operações',
      openOpportunities: [{ dealId: 'deal-1', title: 'Renovação Frotas', value: 120000, stage: 'Proposta' }],
      revOpsRisks: ['Risco de congelamento orçamentário no Q4'],
      knownObjections: ['Preço de implantação'],
      suggestedActionItems: ['Destacar payback inferior a 6 meses'],
      lastSyncedAt: new Date().toISOString(),
      isStale: false,
      contentHashSha256: 'a1b2c3d4e5f6',
    };

    const geofenceResult: GeofenceMatchResult = {
      inProximity: true,
      companyId: 'comp-via-1',
      companyName: 'Viação Ouro e Prata',
      distanceMeters: 45,
      suggestedAction: 'PROMPT_OPEN_BRIEFING',
      isRecordingBlocked: true,
    };

    expect(briefing.openOpportunities[0].value).toBe(120000);
    expect(geofenceResult.isRecordingBlocked).toBe(true);
    expect(geofenceResult.suggestedAction).toBe('PROMPT_OPEN_BRIEFING');
  });

  it('Eixo 14: War Room Arena — deve validar estrutura de duelos, pontuação pedagógica e critérios objetivos', () => {
    const evalData: WarRoomPedagogicalEvaluation = {
      criteriaScores: {
        needIdentification: 90,
        questionQuality: 85,
        playbookAdherence: 95,
        clarityAndFactuality: 90,
        objectionReframing: 88,
        nextStepProposition: 92,
      },
      compositeScore: 90,
      pedagogicalRationale: 'Excelente transição de objeção de preço para valor do TCO.',
      awardedXp: 200,
    };

    const duel: WarRoomDuelSession = {
      duelId: 'duel-101',
      organizationId: 'org-tenant-1',
      mode: 'objection_duel',
      status: 'EVALUATED',
      participantA: { userId: 'user-1', userName: 'Lucas', role: 'SDR' },
      participantB: { userId: 'user-2', userName: 'Juliana', role: 'Closer' },
      rounds: [
        {
          roundNumber: 1,
          attackerId: 'user-1',
          defenderId: 'user-2',
          objectionText: 'Já temos um software interno que resolve isso.',
          defenseResponseText: 'Compreendo perfeitamente. Como vocês lidam com a manutenção e atualização contínua dele?',
          evaluation: evalData,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      finalWinnerId: 'user-2',
      createdAt: new Date().toISOString(),
    };

    expect(duel.rounds[0].evaluation?.compositeScore).toBe(90);
    expect(duel.status).toBe('EVALUATED');
  });

  it('Eixo 15: Shadow Copywriting — deve validar perfil consentido, controles de PII e aprovação humana', () => {
    const profile: SellerStyleProfile = {
      profileId: 'prof-lucas',
      organizationId: 'org-tenant-1',
      sellerId: 'seller-lucas',
      sellerName: 'Lucas SDR',
      isOptedIn: true,
      sampleCount: 15,
      preferences: {
        formalityLevel: 40,
        concisenessLevel: 80,
        emojiPolicy: 'minimal',
        preferredGreeting: 'Olá, {nome}!',
        preferredClosing: 'Grande abraço,',
        consultativeTone: 'direct',
        preferredTerms: ['previsibilidade', 'eficiência operacional'],
        avoidedTerms: ['sinergia', 'revolucionário'],
      },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const copyResult: PersonalizedCopyResult = {
      copyId: 'copy-100',
      organizationId: 'org-tenant-1',
      sellerId: 'seller-lucas',
      channel: 'linkedin',
      fullMessage: 'Olá, Carlos! Vi que a LogiTech expandiu frotas recentemente. Como vocês garantem previsibilidade?',
      appliedStyleSummary: {
        formalityApplied: 40,
        concisenessApplied: 80,
        greetingUsed: 'Olá, Carlos!',
        closingUsed: '',
      },
      requiresHumanReview: true,
      isApprovedBySeller: false,
      generatedAt: new Date().toISOString(),
    };

    expect(profile.isOptedIn).toBe(true);
    expect(copyResult.requiresHumanReview).toBe(true);
    expect(copyResult.isApprovedBySeller).toBe(false);
  });

  it('DomainEventMesh: deve aceitar todos os novos eventos canônicos da Onda 04', () => {
    const eventTypes: DomainEventType[] = [
      'LIVE_VOICE_SESSION_STARTED',
      'LIVE_VOICE_BARGE_IN_TRIGGERED',
      'LIVE_VOICE_FALLBACK_ENGAGED',
      'METHODOLOGICAL_MENTORSHIP_COMPLETED',
      'GEOFENCE_PROXIMITY_DETECTED',
      'OFFLINE_BRIEFING_ACCESSED',
      'WAR_ROOM_DUEL_RESOLVED',
      'WAR_ROOM_TOURNAMENT_UPDATED',
      'SHADOW_STYLE_PROFILE_UPDATED',
      'SHADOW_APPROACH_GENERATED',
    ];

    for (const evt of eventTypes) {
      const envelope: DomainEventEnvelope = {
        eventId: `evt-onda04-${evt}`,
        eventType: evt,
        eventVersion: '1.0.0',
        organizationId: 'org-tenant-1',
        correlationId: 'corr-onda-04',
        occurredAt: new Date().toISOString(),
        producer: 'onda04Contracts.test',
        aggregateId: 'agg-04',
        payload: { test: true },
      };

      expect(envelope.eventType).toBe(evt);
    }
  });
});
