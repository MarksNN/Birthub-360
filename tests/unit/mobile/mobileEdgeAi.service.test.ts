import { beforeEach, describe, expect, it } from 'vitest';
import { mobileEdgeAiService } from '../../../src/features/mobile/mobileEdgeAi.service.js';

describe('Eixo 9: Mobile Edge AI & Geofencing Service (Agente 09 & 15)', () => {
  const orgA = 'org-birthub-tenant-alpha';
  const orgB = 'org-birthub-tenant-beta';

  beforeEach(() => {
    mobileEdgeAiService.clear();
  });

  it('deve armazenar briefing de visita em cache e permitir leitura offline com indicador de stale', async () => {
    const cached = await mobileEdgeAiService.cacheVisitBriefing({
      organizationId: orgA,
      dealId: 'deal-log-01',
      briefing: {
        companyName: 'Viação Ouro e Prata Frotas',
        targetContactName: 'Carlos Silveira',
        targetContactRole: 'Diretor Operacional',
        meetingObjective: 'Apresentação de proposta com foco em redução de tempo de despacho',
        keyOpportunities: ['Redução de custo de frota', 'Painel executivo em tempo real'],
        knownObjections: ['Treinamento da equipe de motoristas'],
        revOpsRisks: ['Ciclo orçamentário fecha em 20 dias'],
        recommendedTalkingPoints: ['Case de sucesso em empresa de logística rodoviária'],
      },
    });

    expect(cached.briefingId).toBeDefined();
    expect(cached.isStale).toBe(false);

    // Leitura offline
    const retrieved = await mobileEdgeAiService.getVisitBriefing({
      organizationId: orgA,
      dealId: 'deal-log-01',
      offlineMode: true,
    });

    expect(retrieved).toBeDefined();
    expect(retrieved?.companyName).toBe('Viação Ouro e Prata Frotas');
    expect(retrieved?.isStale).toBe(false);
  });

  it('deve cadastrar geofence garantindo que gravação automática esteja proibida por contrato', async () => {
    const rule = await mobileEdgeAiService.registerGeofence({
      organizationId: orgA,
      rule: {
        companyName: 'Sede Logística São Paulo',
        latitude: -23.5505,
        longitude: -46.6333,
        radiusMeters: 250,
        active: true,
      },
    });

    expect(rule.geofenceId).toBeDefined();
    expect(rule.autoRecordingProhibited).toBe(true);
    expect(rule.consentRequired).toBe(true);
  });

  it('deve descartar localização se o vendedor NÃO concedeu opt-in para geofencing', async () => {
    await mobileEdgeAiService.registerGeofence({
      organizationId: orgA,
      rule: {
        companyName: 'Sede Logística São Paulo',
        latitude: -23.5505,
        longitude: -46.6333,
        radiusMeters: 250,
        active: true,
      },
    });

    const event = await mobileEdgeAiService.processGeofenceLocation({
      organizationId: orgA,
      sellerId: 'seller-lucas',
      latitude: -23.5505,
      longitude: -46.6333,
      accuracyMeters: 10,
      consentOptIn: false, // Sem consentimento
    });

    expect(event).toBeNull();
  });

  it('deve detectar proximidade mediante opt-in e sugerir briefing SEM disparar gravação', async () => {
    await mobileEdgeAiService.registerGeofence({
      organizationId: orgA,
      rule: {
        companyName: 'Sede Logística São Paulo',
        latitude: -23.5505,
        longitude: -46.6333,
        radiusMeters: 300,
        active: true,
      },
    });

    const event = await mobileEdgeAiService.processGeofenceLocation({
      organizationId: orgA,
      sellerId: 'seller-lucas',
      latitude: -23.5506,
      longitude: -46.6334,
      accuracyMeters: 12,
      consentOptIn: true,
    });

    expect(event).toBeDefined();
    expect(event?.eventType).toBe('ENTERED_RADIUS');
    expect(event?.suggestedAction).toBe('OPEN_BRIEFING');
    expect(event?.recordingTriggered).toBe(false); // Inviolável
  });

  it('deve enfileirar tarefas de Edge AI offline e sincronizar com sucesso', async () => {
    const task = await mobileEdgeAiService.queueOfflineTask({
      organizationId: orgA,
      sellerId: 'seller-lucas',
      taskType: 'SUMMARIZE_NOTE',
      payload: { noteText: 'Reunião muito produtiva. Foco em redução de custos operacionais.' },
    });

    expect(task.status).toBe('QUEUED');

    const syncResult = await mobileEdgeAiService.syncPendingOfflineTasks(orgA);
    expect(syncResult.syncedCount).toBe(1);
    expect(syncResult.errors.length).toBe(0);
  });

  it('deve garantir isolamento multi-tenant de briefings e geofences', async () => {
    await mobileEdgeAiService.cacheVisitBriefing({
      organizationId: orgA,
      dealId: 'deal-privado-a',
      briefing: {
        companyName: 'Empresa Alpha',
        targetContactName: 'Contato A',
        targetContactRole: 'CEO',
        meetingObjective: 'Alinhamento',
        keyOpportunities: [],
        knownObjections: [],
        revOpsRisks: [],
        recommendedTalkingPoints: [],
      },
    });

    // Tenant B tentando ler briefing do Tenant A
    const retrievedB = await mobileEdgeAiService.getVisitBriefing({
      organizationId: orgB,
      dealId: 'deal-privado-a',
    });
    expect(retrievedB).toBeNull();
  });
});
