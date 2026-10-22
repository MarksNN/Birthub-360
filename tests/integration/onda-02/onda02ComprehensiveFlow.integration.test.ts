import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/prisma';
import { requestContext } from '../../../src/lib/async-context';
import { accountKnowledgeGraph } from '../../../src/features/knowledge/services/accountKnowledgeGraph.service.js';
import { accountDetectiveAgent } from '../../../src/features/intelligence/agents/tactical/accountDetective.agent.js';
import { promiseGuardianAgent } from '../../../src/features/intelligence/agents/tactical/promiseGuardian.agent.js';
import { devilsAdvocateAgent } from '../../../src/features/intelligence/agents/tactical/devilsAdvocate.agent.js';
import { marketSensingService } from '../../../src/features/market-intelligence/server/marketSensing.service.js';
import { winLossAutopsyService } from '../../../src/features/intelligence/services/winLossAutopsy.service.js';
import { domainEventMesh } from '../../../src/lib/queue/domainEventMesh.service.js';
import { curatedObjectionService } from '../../../src/features/playbook/services/curatedObjection.service.js';
import { commercialLearningFlywheel } from '../../../src/features/intelligence/services/commercialLearningFlywheel.service.js';
import { PlaybookRoleplayAdapter } from '../../../src/features/playbook/infra/PlaybookRoleplayAdapter.js';

describe('Onda 02 — Comprehensive Five Integrated Commercial Journeys', () => {
  const tenantA = 'tenant-healthtech-global';
  const tenantB = 'tenant-logistics-corp';

  beforeEach(async () => {
    // REMED-02: grafo e autópsia agora persistem no Postgres (FK Organization) — semeia os tenants
    // e limpa as tabelas em vez do antigo .clear() em memória.
    await requestContext.run({ bypassRls: true }, async () => {
      for (const id of [tenantA, tenantB]) {
        await prisma.organization.upsert({ where: { id }, create: { id, name: id }, update: {} });
      }
    });
    for (const org of [tenantA, tenantB]) {
      await requestContext.run({ tenantId: org }, async () => {
        await prisma.accountGraphEdge.deleteMany({ where: { organizationId: org } });
        await prisma.accountGraphNode.deleteMany({ where: { organizationId: org } });
        await prisma.winLossAutopsyReport.deleteMany({ where: { organizationId: org } });
      });
    }
    promiseGuardianAgent.clear();
    marketSensingService.clear();
    curatedObjectionService.clear();
    commercialLearningFlywheel.clear();
    domainEventMesh.clearProcessedEvents();
  });

  it('Jornada 1 — Pesquisa de Conta: CRM -> Grafo de Contas -> Detetive de Conta -> Market Sensing -> Dossiê Executivo -> Social Selling Multi-Threading', async () => {
    const accountId = 'acc-hospital-alvorada';

    // 1. CRM estrutura a conta no Grafo Semântico
    await accountKnowledgeGraph.upsertNode({
      id: accountId,
      organizationId: tenantA,
      type: 'account',
      label: 'Hospital Alvorada S/A',
      properties: { segment: 'Saúde Suplementar' },
    });

    await accountKnowledgeGraph.upsertNode({
      id: 'cont-cfo-alvorada',
      organizationId: tenantA,
      type: 'contact',
      label: 'Dra. Beatriz Santos',
      properties: { role: 'Diretora Financeira (CFO)' },
    });

    await accountKnowledgeGraph.addRelationship({
      organizationId: tenantA,
      sourceId: 'cont-cfo-alvorada',
      targetId: accountId,
      type: 'DECISION_MAKER_FOR',
      confidence: 'confirmed',
      source: 'crm_history',
    });

    // 2. Detetive de Conta investiga e gera o Dossiê Executivo
    const dossier = await accountDetectiveAgent.generateExecutiveDossier(tenantA, accountId, {
      companyName: 'Hospital Alvorada S/A',
      cnpj: '11.222.333/0001-44',
      cnae: '8610-1/01 - Atividades de atendimento hospitalar',
      employeeCount: 620,
      knownContacts: [{ name: 'Dra. Beatriz Santos', role: 'CFO', influence: 'Alta' }],
    });

    expect(dossier.verifiedFacts.length).toBeGreaterThanOrEqual(3);
    expect(dossier.painHypotheses.every((h) => h.isHypothesisOnly)).toBe(true);

    // 3. Market Sensing detecta sinal de expansão e vincula à conta
    const signal = await marketSensingService.ingestSignal({
      organizationId: tenantA,
      companyId: accountId,
      companyName: 'Hospital Alvorada S/A',
      signalType: 'geographic_expansion',
      source: 'news',
      title: 'Hospital Alvorada anuncia novo complexo cirúrgico de R$ 30M',
      summary: 'Expansão de leitos de UTI e nova ala de robótica',
      confidence: 'high',
    });
    expect(signal.companyId).toBe(accountId);

    // 4. Grafo de Contas produz a estratégia de abordagem Multi-Threading para Social Selling
    const graphView = await accountKnowledgeGraph.getAccountGraph(tenantA, accountId);
    expect(graphView.recommendedApproaches?.length).toBeGreaterThan(0);

    const finApproach = graphView.recommendedApproaches?.find(
      (a) => a.roleCategory === 'financial_buyer',
    );
    expect(finApproach).toBeDefined();
    expect(finApproach?.suggestedOpeningDraft).toContain('Dra. Beatriz');
    expect(finApproach?.strategicAngle).toContain('eficiência de capital');
  });

  it('Jornada 2 — Mudança Externa: Notícia/Regulatório -> Verificação -> Conta Relacionada -> RevOps -> Alerta Comercial -> Abordagem Consultiva', async () => {
    // 1. Órgão regulador publica norma oficial
    const regSignal = await marketSensingService.ingestRegulatoryUpdate({
      organizationId: tenantA,
      officialGazetteRef: 'DOU Seção 1 - Edição 204',
      legalActNumber: 'Resolução Normativa ANS nº 580',
      issuingAuthority: 'Agência Nacional de Saúde Suplementar',
      publicationDate: '2026-10-17',
      effectiveDate: '2027-01-01',
      summary: 'Exigência de interoperabilidade de prontuários com criptografia ponta a ponta',
      targetSectors: ['Saúde Suplementar', 'Operadoras de Saúde'],
      complianceDeadline: '2027-04-30',
    });

    expect(regSignal.confidence).toBe('high');
    expect(regSignal.source).toBe('official_gazette');

    // 2. Cálculo de Relevância Comercial pelo Motor de Market Sensing
    const relevanceScore = marketSensingService.calculateSignalRelevanceScore(regSignal);
    expect(relevanceScore).toBeGreaterThanOrEqual(85);

    // 3. Notificação propagada com sucesso no DomainEventMesh
    const outbox = domainEventMesh.getOutboxRecords();
    const event = outbox.find((e) => e.eventType === 'MARKET_SIGNAL_DETECTED');
    expect(event).toBeDefined();
    expect(event?.organizationId).toBe(tenantA);
  });

  it('Jornada 3 — Compromisso Comercial: VoiceHub/Mobile -> Transcrição -> Guardião de Promessas -> Tarefa de CRM -> Acompanhamento Supervisionado', async () => {
    const rawTranscript =
      'Olá Dr. Marcos, vou tirar essa dúvida técnica sobre LGPD com nosso time de engenharia e te ligo amanhã às 14h para apresentar a proposta.';

    // 1. Guardião de Promessas extrai compromissos da conversa
    const commitments = await promiseGuardianAgent.extractCommitmentsFromInteraction({
      organizationId: tenantA,
      interactionId: 'call-inter-4001',
      sourceType: 'voice_call',
      content: rawTranscript,
      sellerName: 'Marcos Executivo',
      dealId: 'deal-hospital-44',
    });

    expect(commitments.length).toBeGreaterThanOrEqual(2);
    const techCommitment = commitments.find(
      (c) => c.commitmentType === 'answer_technical_question',
    );
    const callCommitment = commitments.find((c) => c.commitmentType === 'return_call');

    expect(techCommitment?.approvalStatus).toBe('pending_human_review');
    expect(callCommitment?.approvalStatus).toBe('pending_human_review');

    // 2. Supervisor comercial aprova a geração da tarefa no CRM
    const approved = await promiseGuardianAgent.approveCommitment(tenantA, techCommitment!.id);
    expect(approved.success).toBe(true);
    expect(techCommitment?.approvalStatus).toBe('approved');
    expect(techCommitment?.suggestedCrmTaskId).toMatch(/^task-/);
  });

  it('Jornada 4 — Deal Perdido: DEAL_LOST -> Win-Loss Deep Autopsy -> Curadoria Gestor -> Playbook -> Roleplay Simulator', async () => {
    // 1. Deal perdido é submetido à autópsia forense
    const autopsy = await winLossAutopsyService.generateAutopsy({
      organizationId: tenantA,
      dealId: 'deal-hospital-unimed',
      outcome: 'DEAL_LOST',
      dealTitle: 'Migração de Prontuário Eletrônico',
      companyName: 'Operadora Saúde Regional',
      dealValue: 240000,
      timelineEvents: [
        {
          timestamp: '2026-08-15T10:00:00Z',
          stageName: 'Qualificação',
          activityType: 'call',
          description: 'SDR realizou qualificação inicial',
          actor: 'SDR Carlos',
        },
        {
          timestamp: '2026-10-17T17:00:00Z',
          stageName: 'Perdido',
          activityType: 'status_change',
          description: 'Perdido para concorrente que ofereceu parcelamento sem juros em 36x',
          actor: 'Closer Rodrigo',
        },
      ],
      messagesAndNotes: [
        {
          role: 'Cliente',
          content:
            'A proposta técnica de vocês foi a melhor, mas o fluxo de desembolso em 36x da concorrência foi decisivo para a nossa diretoria.',
          date: '2026-10-17',
        },
      ],
      unresolvedObjections: ['Condições de parcelamento e fluxo de desembolso'],
      competitorsMentioned: ['Concorrente Financiado'],
    });

    // 2. Verificação das 9 seções forenses
    expect(autopsy.sectionA_Timeline.length).toBe(2);
    expect(autopsy.sectionC_NegativeSignalsAndObjections.length).toBeGreaterThan(0);
    expect(autopsy.sectionD_FactorHypotheses[0].category).toBe('pricing');
    expect(autopsy.sectionD_FactorHypotheses[0].confidenceScore).toBeLessThan(1.0); // Hipótese, não certeza absoluta
    expect(autopsy.sectionH_CuratedLearningCandidates.length).toBe(1);

    // 3. Gestor curadoria e promove o aprendizado para o Playbook Oficial
    const promotion = await winLossAutopsyService.promoteLearningToPlaybook({
      organizationId: tenantA,
      reportId: autopsy.id,
      candidateIndex: 0,
      reviewedBy: 'Gestor Comercial Amanda',
    });
    expect(promotion.promoted).toBe(true);
    expect(promotion.playbookEntryId).toBeDefined();

    // 4. O aprendizado curado é imediatamente disponibilizado para o Roleplay (Onda 01 Adapter)
    const roleplayAdapter = new PlaybookRoleplayAdapter();
    const roleplayPrompts = await roleplayAdapter.findObjections(tenantA);
    expect(roleplayPrompts.length).toBeGreaterThan(0);
  });

  it('Jornada 5 — Forecast Preventivo: CRM -> RevOps -> Advogado do Diabo -> Evidências de Risco -> Recomendação Calibrada de Forecast', async () => {
    // 1. Advogado do Diabo audita uma oportunidade de alto valor prestes a fechar no trimestre
    const devilsAudit = await devilsAdvocateAgent.evaluateDealForecast(
      tenantA,
      'deal-megacorp-99',
      {
        dealTitle: 'Implantação Global EMR',
        currentStage: 'Fechamento Verbal',
        currentProbability: 90, // Vendedor declarou 90%
        daysInCurrentStage: 28, // Quase um mês sem avançar na etapa de fechamento
        daysSinceLastInteraction: 14, // 14 dias sem resposta do patrocinador
        stageAverageDays: 5,
        unresolvedObjections: ['Aprovação pendente no comitê de compliance da matriz'],
        competitorsMentioned: ['Provedor Global'],
      },
    );

    // 2. Detecção de Viés de Otimismo e Risco de Perda Silenciosa
    expect(devilsAudit.optimismBiasDetected).toBe(true);
    expect(devilsAudit.overallHealthScore).toBeLessThan(50);
    expect(devilsAudit.forecastRevisionRecommendation.recommendedAction).toBe(
      'downgrade_probability',
    );
    expect(devilsAudit.forecastRevisionRecommendation.recommendedProbability).toBeLessThanOrEqual(
      40,
    );
    expect(devilsAudit.forecastRevisionRecommendation.evidence.length).toBeGreaterThanOrEqual(2);

    // 3. Evento DEVILS_ADVOCATE_ALERT registrado no barramento para revisão do comitê de receita
    const outbox = domainEventMesh.getOutboxRecords();
    const alertEvent = outbox.find((e) => e.eventType === 'DEVILS_ADVOCATE_ALERT');
    expect(alertEvent).toBeDefined();
    expect(alertEvent?.payload?.dealId).toBe('deal-megacorp-99');
  });

  it('Garantia de Isolamento Multi-Tenant: Tenant A nunca vaza grafos, sinais ou autópsias para Tenant B', async () => {
    await accountKnowledgeGraph.upsertNode({
      id: 'acc-confidential-a',
      organizationId: tenantA,
      type: 'account',
      label: 'Conta Ultrasecreta A',
    });

    await marketSensingService.ingestSignal({
      organizationId: tenantA,
      companyId: 'acc-confidential-a',
      companyName: 'Conta Ultrasecreta A',
      signalType: 'mna',
      source: 'financial_filing',
      title: 'Fusão Confidencial A',
      summary: 'Dados confidenciais',
      confidence: 'high',
    });

    // Tenant B consulta sinais e grafo
    const signalsTenantB = await marketSensingService.searchSignals({ organizationId: tenantB });
    expect(signalsTenantB.length).toBe(0);

    const graphTenantB = await accountKnowledgeGraph.getAccountGraph(tenantB, 'acc-confidential-a');
    expect(graphTenantB.contacts.length).toBe(0);
    expect(graphTenantB.edges.length).toBe(0);
  });
});
