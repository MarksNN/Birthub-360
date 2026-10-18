import { describe, expect, it } from 'vitest';
import { AccountKnowledgeGraphService } from '../../../src/features/knowledge/services/accountKnowledgeGraph.service.js';
import { MarketSensingService } from '../../../src/features/market-intelligence/server/marketSensing.service.js';
import { AccountDetectiveAgent } from '../../../src/features/intelligence/agents/tactical/accountDetective.agent.js';
import { PromiseGuardianAgent } from '../../../src/features/intelligence/agents/tactical/promiseGuardian.agent.js';
import { DevilsAdvocateAgent } from '../../../src/features/intelligence/agents/tactical/devilsAdvocate.agent.js';
import { WinLossAutopsyService } from '../../../src/features/intelligence/services/winLossAutopsy.service.js';

describe('Onda 02 — Teste de Homologação E2E das 5 Jornadas Comerciais Integradas', () => {
  const orgId = 'org-e2e-onda02-enterprise';
  const graphService = new AccountKnowledgeGraphService();
  const sensingService = new MarketSensingService();
  const detectiveAgent = new AccountDetectiveAgent();
  const guardianAgent = new PromiseGuardianAgent();
  const devilsAdvocate = new DevilsAdvocateAgent();
  const winLossService = new WinLossAutopsyService();

  it('Jornada 1 — Pesquisa de Conta (CRM → Grafo de Contas → Detetive de Conta → Market Sensing → Dossiê → Social Selling)', async () => {
    // 1. Criar nós de conta e decisores no Grafo
    await graphService.upsertNode({
      id: 'acc-e2e-1',
      organizationId: orgId,
      type: 'account',
      label: 'Express Logística Nacional',
      properties: { segment: 'Logística Rodoviária', fleetSize: 200 },
    });
    await graphService.upsertNode({
      id: 'cont-e2e-ceo',
      organizationId: orgId,
      type: 'contact',
      label: 'Dr. Roberto Magalhães (CEO)',
      properties: { role: 'CEO', buyingRole: 'executive_sponsor' },
    });
    await graphService.addRelationship({
      organizationId: orgId,
      sourceId: 'cont-e2e-ceo',
      targetId: 'acc-e2e-1',
      type: 'WORKS_AT',
      confidence: 'confirmed',
      source: 'crm',
    });

    // 2. Coletar sinais de mercado exógenos
    await sensingService.ingestSignal({
      organizationId: orgId,
      companyId: 'acc-e2e-1',
      companyName: 'Express Logística Nacional',
      signalType: 'geographic_expansion',
      source: 'news',
      title: 'Express Logística inaugura novo centro de distribuição em Campinas',
      summary: 'Expansão de 30% da malha de atendimento no interior de SP.',
      confidence: 'high',
    });

    // 3. Executar o Detetive de Conta para gerar Dossiê
    const dossier = await detectiveAgent.generateDossier({
      organizationId: orgId,
      companyId: 'acc-e2e-1',
      companyName: 'Express Logística Nacional',
      segment: 'Logística',
    });
    expect(dossier.verifiedFacts.length).toBeGreaterThan(0);

    // 4. Gerar estratégia de abordagem para Social Selling (Multi-Threading)
    const approaches = await graphService.generateMultiThreadingStrategy(orgId, 'acc-e2e-1');
    expect(approaches.length).toBeGreaterThan(0);
    expect(approaches[0].suggestedOpeningDraft).toBeDefined();
  });

  it('Jornada 2 — Mudança Externa (Notícia/Evento → Verificação → Conta Relacionada → RevOps → Alerta Comercial)', async () => {
    // 1. Notícia detectada no mercado
    const signal = await sensingService.detectSignalFromNews({
      organizationId: orgId,
      companyName: 'TransCarga Global',
      newsHeadline: 'TransCarga Global anuncia plano de renovação de 100 carretas frigoríficas',
      sourceName: 'Diário do Transporte',
    });
    expect(signal.signalType).toBe('expansion');

    // 2. Buscar sinais vinculados
    const retrieved = await sensingService.getSignalsByCompany(orgId, signal.companyId || '');
    expect(retrieved).toBeDefined();
  });

  it('Jornada 3 — Compromisso Comercial (VoiceHub/Mobile → Transcrição → Guardião de Promessas → Tarefa CRM)', async () => {
    const transcript = `
      Vendedor (Carla): Vou ligar na segunda-feira às 10h para checar se o departamento jurídico validou a minuta.
      Cliente (Sérgio): Perfeito Carla, estarei com o parecer em mãos.
    `;

    const commitments = await guardianAgent.extractCommitments({
      organizationId: orgId,
      sourceInteractionId: 'call-voice-hub-88',
      sourceType: 'voice_call',
      promiserName: 'Carla Vendedora',
      recipientName: 'Sérgio Comprador',
      interactionTranscript: transcript,
    });

    expect(commitments.length).toBeGreaterThan(0);
    const approved = await guardianAgent.approveCommitment(orgId, commitments[0].id, 'coordenador-pedro');
    expect(approved.status).toBe('APPROVED');
    expect(approved.crmTaskId).toBeDefined();
  });

  it('Jornada 4 — Deal Perdido (DEAL_LOST → Win-Loss Analysis → Curadoria → Playbook → Roleplay)', async () => {
    const autopsy = await winLossService.performAutopsy({
      organizationId: orgId,
      dealId: 'deal-perda-555',
      dealTitle: 'Implementação de Rastreamento Satelital',
      companyName: 'Frota Forte Distribuição',
      dealValue: 180000,
      salesCycleDays: 70,
      outcome: 'DEAL_LOST',
      closedAt: new Date().toISOString(),
      stageHistory: [{ stageName: 'Proposta', enteredAt: '2026-08-01', durationDays: 70 }],
      activities: [],
      messagesAndNotes: [{ source: 'email', date: '2026-10-05', text: 'Fechamos com outra empresa por prazo de pagamento estendido.' }],
      unresolvedObjections: ['Prazo de pagamento muito curto'],
    });

    expect(autopsy.sectionD_FactorHypotheses.length).toBeGreaterThan(0);
    expect(autopsy.sectionH_CuratedLearningCandidates.length).toBeGreaterThan(0);

    // Promover para o Playbook com curadoria humana
    const promotion = await winLossService.promoteLearningToPlaybook({
      organizationId: orgId,
      reportId: autopsy.id,
      candidateIndex: 0,
      reviewedBy: 'Gestor Comercial Amanda',
    });
    expect(promotion.promoted).toBe(true);
  });

  it('Jornada 5 — Forecast Preventivo (CRM → RevOps → Advogado do Diabo → Evidências de Risco → Revisão de Probabilidade)', async () => {
    const forecastAudit = await devilsAdvocate.reviewDealForecast({
      organizationId: orgId,
      dealId: 'deal-forecast-critical-12',
      dealTitle: 'Mega Contrato Frotas Sudeste',
      companyName: 'Sudeste Log',
      currentForecastStage: 'Contrato em Assinatura',
      currentProbabilityPercent: 95,
      daysInCurrentStage: 35, // Inatividade alta
      unresolvedObjections: ['Diretor Financeiro vetou a cláusula de reajuste'],
      lastCustomerInteractionDaysAgo: 20,
    });

    expect(forecastAudit.isFlaggedForReview).toBe(true);
    expect(forecastAudit.optimismRiskSeverity).toBe('high');
    expect(forecastAudit.detectedRedFlags.length).toBeGreaterThan(0);
    expect(forecastAudit.actionableRecommendations[0]).toContain('probabilidade');
  });
});
