import { beforeEach, describe, expect, it } from 'vitest';
import { accountDetectiveAgent } from '../../../src/features/intelligence/agents/tactical/accountDetective.agent.js';
import { promiseGuardianAgent } from '../../../src/features/intelligence/agents/tactical/promiseGuardian.agent.js';
import { devilsAdvocateAgent } from '../../../src/features/intelligence/agents/tactical/devilsAdvocate.agent.js';
import { domainEventMesh } from '../../../src/lib/queue/domainEventMesh.service.js';

describe('Onda 02 — Eixo 11: Multi-Agent Tactical Swarm (3 Competências Táticas)', () => {
  const tenantId = 'tenant-logistics-corp';

  beforeEach(() => {
    promiseGuardianAgent.clear();
    domainEventMesh.clearProcessedEvents();
  });

  describe('1. Detetive de Conta (Account Detective)', () => {
    it('deve gerar Dossiê Executivo de 10 seções sem inventar fatos, marcando hipóteses como tal', async () => {
      const dossier = await accountDetectiveAgent.generateExecutiveDossier(tenantId, 'comp-100', {
        companyName: 'TransLog Brasil S/A',
        cnpj: '12.345.678/0001-90',
        cnae: '4930-2/02 - Transporte rodoviário de carga',
        segment: 'Logística',
        employeeCount: 450,
        recentNewsTitles: ['TransLog investe R$ 15 milhões em nova frota sustentável'],
        knownContacts: [
          { name: 'Dr. Roberto', role: 'Diretor de Operações', influence: 'Alta' },
        ],
      });

      expect(dossier.companyName).toBe('TransLog Brasil S/A');
      expect(dossier.verifiedFacts.length).toBeGreaterThanOrEqual(3);
      expect(dossier.verifiedFacts[0].source).toBe('Cadastro Base Receita Federal');
      expect(dossier.recentSignals[0].summary).toContain('TransLog investe');

      // Garantir que hipóteses de dor são marcadas explicitamente como hipóteses (nunca fatos)
      expect(dossier.painHypotheses.length).toBeGreaterThan(0);
      for (const h of dossier.painHypotheses) {
        expect(h.isHypothesisOnly).toBe(true);
      }

      // Perguntas de descoberta recomendadas
      expect(dossier.recommendedDiscoveryQuestions.length).toBeGreaterThanOrEqual(3);
      expect(dossier.sourcesAndConfidence.overallConfidence).toBe('high');
    });

    it('deve exigir organizationId para evitar vazamento entre organizações', async () => {
      await expect(
        accountDetectiveAgent.generateExecutiveDossier('', 'comp-100'),
      ).rejects.toThrow(/Tenancy violation/);
    });
  });

  describe('2. Guardião de Promessas (Promise Guardian)', () => {
    it('deve detectar compromissos comerciais em transcrições com status pending_human_review', async () => {
      const transcript =
        'Combinado então, Dr. Marcos. Eu vou te enviar a proposta até sexta-feira com o case de sucesso.';

      const commitments = await promiseGuardianAgent.extractCommitmentsFromInteraction({
        organizationId: tenantId,
        interactionId: 'call-rec-888',
        sourceType: 'voice_call',
        content: transcript,
        sellerName: 'Vinícius Closer',
        dealId: 'deal-555',
      });

      expect(commitments.length).toBeGreaterThanOrEqual(1);
      const proposalCommitment = commitments.find((c) => c.commitmentType === 'send_proposal');
      expect(proposalCommitment).toBeDefined();
      expect(proposalCommitment?.promiserName).toBe('Vinícius Closer');
      expect(proposalCommitment?.approvalStatus).toBe('pending_human_review'); // Travado sem execução autônoma
      expect(proposalCommitment?.evidenceSnippet).toContain('proposta');

      // Aprovação humana do gestor
      const approved = await promiseGuardianAgent.approveCommitment(tenantId, proposalCommitment!.id);
      expect(approved.success).toBe(true);
      expect(proposalCommitment?.approvalStatus).toBe('approved');
      expect(proposalCommitment?.suggestedCrmTaskId).toBeDefined();
    });
  });

  describe('3. Advogado do Diabo (Devil\'s Advocate)', () => {
    it('deve detectar viés de otimismo quando o deal tem probabilidade inflada mas está estagnado', async () => {
      const analysis = await devilsAdvocateAgent.evaluateDealForecast(tenantId, 'deal-opt-99', {
        dealTitle: 'Contrato Transporte 2027',
        currentStage: 'Negociação Final',
        currentProbability: 85, // Vendedor declarou 85% de chance
        daysInCurrentStage: 22, // 22 dias na etapa (média é 7)
        daysSinceLastInteraction: 12, // 12 dias sem contato do lead
        stageAverageDays: 7,
        unresolvedObjections: ['Preço por km rodado considerado 20% acima do teto'],
        competitorsMentioned: ['Transportadora Rival'],
      });

      expect(analysis.optimismBiasDetected).toBe(true);
      expect(analysis.overallHealthScore).toBeLessThan(50);
      expect(analysis.stagnationMetrics.isStagnant).toBe(true);
      expect(analysis.forecastRevisionRecommendation.recommendedAction).toBe('downgrade_probability');
      expect(analysis.forecastRevisionRecommendation.recommendedProbability).toBeLessThanOrEqual(40);
      expect(analysis.forecastRevisionRecommendation.evidence.length).toBeGreaterThanOrEqual(2);
    });

    it('deve manter probabilidade quando os indicadores do deal são consistentes e saudáveis', async () => {
      const healthyAnalysis = await devilsAdvocateAgent.evaluateDealForecast(tenantId, 'deal-healthy-1', {
        dealTitle: 'Expansão de Filial',
        currentStage: 'Proposta Apresentada',
        currentProbability: 60,
        daysInCurrentStage: 3,
        daysSinceLastInteraction: 1,
        stageAverageDays: 8,
        unresolvedObjections: [],
        competitorsMentioned: [],
      });

      expect(healthyAnalysis.optimismBiasDetected).toBe(false);
      expect(healthyAnalysis.overallHealthScore).toBe(100);
      expect(healthyAnalysis.forecastRevisionRecommendation.recommendedAction).toBe('maintain');
      expect(healthyAnalysis.forecastRevisionRecommendation.recommendedProbability).toBe(60);
    });
  });
});
