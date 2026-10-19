import { beforeEach, describe, expect, it } from 'vitest';
import { bimodalLiveVoiceService } from '../../src/features/ai-voice/server/bimodalLiveVoice.service.js';
import { methodologicalDigitalTwinService } from '../../src/features/intelligence/services/methodologicalDigitalTwin.service.js';
import { mobileEdgeAiService } from '../../src/features/mobile/mobileEdgeAi.service.js';
import { warRoomArenaService } from '../../src/features/gamification/services/warRoomArena.service.js';
import { shadowCopywritingService } from '../../src/features/social-selling/server/shadowCopywriting.service.js';
import { behavioralEngineService } from '../../src/features/gamification/services/behavioralEngine.service.js';

describe('ONDA 04 — Fluxo Abrangente Integrado e Cinco Jornadas Comerciais E2E', () => {
  const tenantA = 'org-birthub-tenant-alpha';
  const tenantB = 'org-birthub-tenant-beta';

  beforeEach(() => {
    bimodalLiveVoiceService.clear();
    methodologicalDigitalTwinService.clear();
    mobileEdgeAiService.clear();
    warRoomArenaService.clear();
    shadowCopywritingService.clear();
    behavioralEngineService.clear();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada A: Roleplay Live
  // Persona → Streaming → Interrupção (Barge-in) → Contexto RAG → Avaliação → Gamificação
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada A: deve conduzir sessão de voz Live bidirecional, suportar barge-in subsegundo e pontuar vendedor na Gamificação', async () => {
    // 1. Iniciar sessão de voz Live no Roleplay
    const session = await bimodalLiveVoiceService.createSession({
      organizationId: tenantA,
      sessionId: 'sess-live-e2e-01',
      sellerId: 'seller-lucas',
      contextMode: 'roleplay_simulation',
      personaName: 'CFO Cético - Logística',
      enableBargeIn: true,
      sampleRate: 24000,
    });

    expect(session.state).toBe('LISTENING');
    expect(session.transport).toBe('webrtc');

    // 2. Vendedor fala com a IA (streaming de áudio)
    await bimodalLiveVoiceService.sendAudioStream({
      sessionId: 'sess-live-e2e-01',
      organizationId: tenantA,
      audioChunkBase64: 'audio-chunk-vendedor-01',
      isFinalChunk: true,
    });

    const activeSession = bimodalLiveVoiceService.getSession(tenantA, 'sess-live-e2e-01');
    expect(activeSession?.state).toBe('SPEAKING');
    expect(activeSession?.turns.length).toBe(2);

    // 3. Barge-in: Vendedor interrompe a fala da IA com uma nova objeção
    const bargeIn = await bimodalLiveVoiceService.triggerBargeIn({
      sessionId: 'sess-live-e2e-01',
      organizationId: tenantA,
      interruptionReason: 'Vendedor esclareceu premissa de TCO antes do encerramento da resposta',
    });

    expect(bargeIn.interrupted).toBe(true);
    expect(bargeIn.latencyMs).toBeLessThan(200);
    expect(activeSession?.state).toBe('LISTENING');

    // 4. Encerramento da sessão e integração com a Gamificação da plataforma
    const closedSession = await bimodalLiveVoiceService.closeSession({
      sessionId: 'sess-live-e2e-01',
      organizationId: tenantA,
    });

    expect(closedSession.state).toBe('DISCONNECTED');

    // Recompensa backend auditada via Behavioral Engine
    const reward = await behavioralEngineService.rewardSellerXp({
      organizationId: tenantA,
      sellerId: 'seller-lucas',
      xpAmount: 180,
      reason: 'Conclusão de Roleplay com simulação de voz em tempo real e manejo de barge-in',
      activityType: 'ROLEPLAY_SIMULATION',
    });

    expect(reward.success).toBe(true);
    expect(reward.newXp).toBe(180);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada B: Mentoria Metodológica
  // Padrões autorizados → Curadoria → Mentor Sintético → Exercício → Feedback → Evolução
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada B: deve aplicar padrões agregados com mentor virtual sintético e avaliar aderência a SPIN e TCO', async () => {
    // 1. Mentor sintético configurado com técnicas aprovadas
    const mentor = await methodologicalDigitalTwinService.createMentorProfile({
      organizationId: tenantA,
      syntheticPersonaName: 'Mentor Comercial de Vendas Consultivas',
      targetMethodology: 'SPIN & TCO',
      curatedBy: 'lideranca-comercial-marcos',
      techniqueIds: ['tech-spin-implication', 'tech-objection-tco'],
    });

    expect(mentor.isSyntheticCoach).toBe(true);

    // 2. Vendedor inicia exercício prático
    const exercise = await methodologicalDigitalTwinService.startMentorshipExercise({
      organizationId: tenantA,
      sellerId: 'seller-lucas',
      techniqueId: 'tech-objection-tco',
    });

    expect(exercise.exerciseId).toBeDefined();

    // 3. Vendedor submete resposta aplicando desconstrução de TCO
    const evaluation = await methodologicalDigitalTwinService.evaluateSellerResponse({
      organizationId: tenantA,
      exerciseId: exercise.exerciseId,
      sellerId: 'seller-lucas',
      responseText: 'Entendo perfeitamente o impacto do orçamento. Quando calculamos o TCO e o custo da ociosidade das frotas, a economia de R$ 40.000/mês cobre o investimento em 90 dias. Quando seria oportuno validarmos essa conta com a diretoria financeira?',
      recordedDurationSeconds: 22,
    });

    expect(evaluation.scorePercent).toBeGreaterThanOrEqual(85);
    expect(evaluation.spinAdherencePercent).toBeGreaterThanOrEqual(85);
    expect(evaluation.talkRatioPercent).toBeLessThan(45);
    expect(evaluation.strengths.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada C: Visita Offline
  // Briefing → Offline → Cache → Geofence consentido → Trava Anti-Gravação → Sync
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada C: deve consultar briefing offline, detectar geofence consentido sem gravação autônoma e sincronizar tarefas', async () => {
    // 1. Pré-carregar briefing no cache local encriptado
    await mobileEdgeAiService.cacheVisitBriefing({
      organizationId: tenantA,
      dealId: 'deal-visita-44',
      briefing: {
        companyName: 'Transportes Transul S.A.',
        targetContactName: 'Mariana Duarte',
        targetContactRole: 'VP de Logística',
        meetingObjective: 'Alinhamento executivo de redução de tempo de expedição',
        keyOpportunities: ['Rastreamento inteligente de rotas', 'Automação de propostas'],
        knownObjections: ['Treinamento de equipe em filiais remotas'],
        revOpsRisks: ['Fechamento do orçamento anual em 15 dias'],
        recommendedTalkingPoints: ['Case de redução de 22% em custos de frete fracionado'],
      },
    });

    // 2. Vendedor entra em modo offline durante trajeto
    const offlineBriefing = await mobileEdgeAiService.getVisitBriefing({
      organizationId: tenantA,
      dealId: 'deal-visita-44',
      offlineMode: true,
    });

    expect(offlineBriefing).toBeDefined();
    expect(offlineBriefing?.companyName).toBe('Transportes Transul S.A.');
    expect(offlineBriefing?.isStale).toBe(false);

    // 3. Registrar regra de geofencing com trava mandatória
    await mobileEdgeAiService.registerGeofence({
      organizationId: tenantA,
      rule: {
        companyName: 'Transportes Transul S.A.',
        latitude: -23.5601,
        longitude: -46.6502,
        radiusMeters: 300,
        active: true,
      },
    });

    // 4. Vendedor chega à sede com opt-in concedido
    const geofenceEvent = await mobileEdgeAiService.processGeofenceLocation({
      organizationId: tenantA,
      sellerId: 'seller-lucas',
      latitude: -23.5602,
      longitude: -46.6501,
      accuracyMeters: 8,
      consentOptIn: true,
    });

    expect(geofenceEvent).toBeDefined();
    expect(geofenceEvent?.suggestedAction).toBe('OPEN_BRIEFING');
    expect(geofenceEvent?.recordingTriggered).toBe(false); // Trava mandatória comprovada

    // 5. Vendedor toma notas offline
    await mobileEdgeAiService.queueOfflineTask({
      organizationId: tenantA,
      sellerId: 'seller-lucas',
      taskType: 'SUMMARIZE_NOTE',
      payload: {
        notes: 'Cliente confirmou interesse na redução de frete. Reunião de validação de ROI agendada para quinta.',
      },
    });

    // 6. Reconexão e sincronização
    const sync = await mobileEdgeAiService.syncPendingOfflineTasks(tenantA);
    expect(sync.syncedCount).toBe(1);
    expect(sync.errors.length).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada D: War Room Arena
  // Convite → Duelo de Objeções → Avaliação Pedagógica → Pontuação → Ranking
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada D: deve orquestrar duelo de objeções com avaliação pedagógica objetiva e premiar vencedor na Gamificação', async () => {
    // 1. Criar sala de duelo na War Room
    const room = await warRoomArenaService.createRoom({
      organizationId: tenantA,
      roomName: 'Arena B2B: Negociações de Médio Porte',
      mode: 'objection_duel',
      creatorUserId: 'seller-lucas',
      creatorName: 'Lucas (Desafiante)',
    });

    // 2. Defensor entra na arena
    await warRoomArenaService.joinRoom({
      organizationId: tenantA,
      roomId: room.roomId,
      userId: 'seller-rodrigo',
      name: 'Rodrigo (Defensor)',
      role: 'defender',
    });

    // 3. Rodada 1: Desafiante formula objeção agressiva
    await warRoomArenaService.submitObjectionRound({
      organizationId: tenantA,
      roomId: room.roomId,
      challengerId: 'seller-lucas',
      defenderId: 'seller-rodrigo',
      objectionPrompt: 'Sua plataforma custa o dobro da solução que já temos em operação.',
      defenderResponseText: 'Compreendo a preocupação imediata com o valor da licença. Contudo, quando avaliamos o TCO e o impacto do tempo perdido com integrações frágeis, nossa taxa de eficiência gera uma economia líquida comprovada de ROI positivo em 90 dias. Vamos agendar uma sessão rápida com o time de engenharia na próxima terça para demonstrar?',
      timeTakenSeconds: 30,
    });

    // 4. IA avalia rodada
    const evaluation = await warRoomArenaService.resolveRoundEvaluation({
      organizationId: tenantA,
      roomId: room.roomId,
      roundNumber: 1,
    });

    expect(evaluation.score.overallScore).toBeGreaterThanOrEqual(80);
    expect(evaluation.score.criteriaScores.nextStepProposed).toBe(true);
    expect(evaluation.score.rewardXp).toBeGreaterThanOrEqual(160);

    // 5. Encerramento e distribuição de recompensas
    const closed = await warRoomArenaService.closeRoomAndReward({
      organizationId: tenantA,
      roomId: room.roomId,
    });

    expect(closed.room.status).toBe('COMPLETED');
    expect(closed.winnerUserId).toBe('seller-rodrigo');
    expect(closed.totalXpDistributed).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada E: Shadow Copywriting
  // Opt-In → Perfil de Estilo → Geração com RAG → Revisão Humana Obrigatória → Registro
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada E: deve personalizar abordagem comercial respeitando opt-in, sem inventar fatos e com revisão humana mandatória', async () => {
    // 1. Vendedor concede opt-in e fornece amostras de sua própria autoria
    const profile = await shadowCopywritingService.registerSellerOptIn({
      organizationId: tenantA,
      sellerId: 'seller-lucas',
      sampleTexts: [
        'Olá, Roberto! Acompanhando os movimentos estratégicos da diretoria de frotas.',
        'Previsibilidade operacional requer diagnóstico prévio de pontos de atrito.',
        'Cordialmente, Lucas.',
      ],
    });

    expect(profile.optInStatus).toBe('ACTIVE');
    expect(profile.styleParameters.formality).toBe('executive');

    // 2. Geração de abordagem contextual com RAG do tenant
    const approach = await shadowCopywritingService.generatePersonalizedApproach({
      organizationId: tenantA,
      sellerId: 'seller-lucas',
      channel: 'linkedin',
      targetCompany: 'Expresso Rápido Paulistano',
      targetRole: 'Diretor de Logística',
      factualContext: 'Redução de tempo de carregamento em 25% e eliminação de multas contratuais de atraso',
    });

    expect(approach.headline).toContain('Expresso Rápido Paulistano');
    expect(approach.fullMessage).toContain('Expresso Rápido Paulistano');
    expect(approach.styleApplied.formality).toBe('executive');
    expect(approach.requiresHumanReview).toBe(true); // Trava inegociável
    expect(approach.factualVerificationPass).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Garantia de Isolamento Multi-Tenant em Todos os Cinco Eixos
  // Tenant Alpha e Tenant Beta são hermeticamente isolados
  // ──────────────────────────────────────────────────────────────────────────
  it('Garantia de Isolamento Multi-Tenant: Tenant Alpha nunca vaza voz, mentorias, briefings, duelos ou estilos para Tenant Beta', async () => {
    // 1. Isolamento de Voz Live (Eixo 5)
    await bimodalLiveVoiceService.createSession({
      organizationId: tenantA,
      sessionId: 'sess-alpha-private',
      sellerId: 'seller-a',
      contextMode: 'roleplay_simulation',
    });
    await expect(
      bimodalLiveVoiceService.triggerBargeIn({
        organizationId: tenantB,
        sessionId: 'sess-alpha-private',
      }),
    ).rejects.toThrow(/não encontrada/);

    // 2. Isolamento de Mentoria Digital Twin (Eixo 8)
    const exA = await methodologicalDigitalTwinService.startMentorshipExercise({
      organizationId: tenantA,
      sellerId: 'seller-a',
      techniqueId: 'tech-objection-tco',
    });
    await expect(
      methodologicalDigitalTwinService.evaluateSellerResponse({
        organizationId: tenantB,
        exerciseId: exA.exerciseId,
        sellerId: 'seller-b',
        responseText: 'Resposta de teste',
        recordedDurationSeconds: 15,
      }),
    ).rejects.toThrow(/não encontrado/);

    // 3. Isolamento de Briefing Mobile Edge AI (Eixo 9)
    await mobileEdgeAiService.cacheVisitBriefing({
      organizationId: tenantA,
      dealId: 'deal-secreto-alpha',
      briefing: {
        companyName: 'Holding Alpha',
        targetContactName: 'Contato Alpha',
        targetContactRole: 'CFO',
        meetingObjective: 'Confidencial',
        keyOpportunities: [],
        knownObjections: [],
        revOpsRisks: [],
        recommendedTalkingPoints: [],
      },
    });
    const leakCheck = await mobileEdgeAiService.getVisitBriefing({
      organizationId: tenantB,
      dealId: 'deal-secreto-alpha',
    });
    expect(leakCheck).toBeNull();

    // 4. Isolamento da War Room Arena (Eixo 14)
    const roomA = await warRoomArenaService.createRoom({
      organizationId: tenantA,
      roomName: 'Torneio Confidencial Alpha',
      mode: 'objection_duel',
      creatorUserId: 'user-a',
      creatorName: 'User A',
    });
    await expect(
      warRoomArenaService.joinRoom({
        organizationId: tenantB,
        roomId: roomA.roomId,
        userId: 'user-b',
        name: 'User B',
        role: 'defender',
      }),
    ).rejects.toThrow(/não encontrada/);

    // 5. Isolamento de Shadow Copywriting (Eixo 15)
    await shadowCopywritingService.registerSellerOptIn({
      organizationId: tenantA,
      sellerId: 'seller-alpha-1',
      sampleTexts: ['Olá! Diretoria executiva confidencial. Um abraço,'],
    });
    const profileLeak = await shadowCopywritingService.getSellerStyleProfile({
      organizationId: tenantB,
      sellerId: 'seller-alpha-1',
    });
    expect(profileLeak).toBeNull();
  });
});
