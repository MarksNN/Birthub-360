import { describe, expect, it } from 'vitest';
import { AccountDetectiveAgent } from '../../../src/features/intelligence/agents/tactical/accountDetective.agent.js';
import { PromiseGuardianAgent } from '../../../src/features/intelligence/agents/tactical/promiseGuardian.agent.js';
import { DevilsAdvocateAgent } from '../../../src/features/intelligence/agents/tactical/devilsAdvocate.agent.js';

describe('Swarm Tático — Eixo 11 (Account Detective, Promise Guardian, Devil Advocate)', () => {
  const orgId = 'org-tactical-swarm-001';

  describe('Account Detective — Dossiê Executivo de Conta', () => {
    const detective = new AccountDetectiveAgent();

    it('deve produzir Dossiê Executivo completo com as 10 seções estruturadas', async () => {
      const dossier = await detective.generateDossier({
        organizationId: orgId,
        companyId: 'comp-789',
        companyName: 'AgroLog Soluções em Transporte',
        segment: 'Agronegócio / Grãos',
        estimatedEmployees: 450,
      });

      expect(dossier.companyName).toBe('AgroLog Soluções em Transporte');
      expect(dossier.summary).toBeDefined();
      expect(dossier.verifiedFacts.length).toBeGreaterThan(0);
      expect(dossier.recentSignals.length).toBeGreaterThan(0);
      expect(dossier.commercialRisks.length).toBeGreaterThan(0);
      expect(dossier.painHypotheses.length).toBeGreaterThan(0);
      expect(dossier.painHypotheses[0].isHypothesisOnly).toBe(true);
      expect(dossier.recommendedDiscoveryQuestions.length).toBeGreaterThan(0);
      expect(dossier.sourcesAndConfidence.overallConfidence).toBe('high');
    });
  });

  describe('Promise Guardian — Extração e Gestão de Compromissos Comerciais', () => {
    const guardian = new PromiseGuardianAgent();

    it('deve extrair compromissos comerciais de transcrição real de reunião', async () => {
      const transcript = `
        Vendedor (Lucas): Perfeito, Dr. Marcos. Até sexta-feira às 15h eu vou enviar uma proposta comercial customizada com os valores para 80 caminhões.
        Cliente (Dr. Marcos): Combinado Lucas. Se puder mandar também a documentação técnica de integração com nosso ERP SAP, agradeço.
        Vendedor (Lucas): Com certeza, vou anexar o case de integração junto à proposta.
      `;

      const commitments = await guardian.extractCommitments({
        organizationId: orgId,
        sourceInteractionId: 'interaction-meeting-045',
        sourceType: 'meeting',
        promiserName: 'Lucas Vendedor',
        recipientName: 'Dr. Marcos',
        interactionTranscript: transcript,
      });

      expect(commitments.length).toBeGreaterThanOrEqual(1);
      const proposalCommitment = commitments.find((c) => c.commitmentType === 'send_proposal');
      expect(proposalCommitment).toBeDefined();
      expect(proposalCommitment?.detectedDueDate).toBeDefined();
      expect(proposalCommitment?.requiresHumanApproval).toBe(true);
      expect(proposalCommitment?.status).toBe('DETECTED');
    });

    it('deve permitir aprovação humana de compromisso antes de virar tarefa no CRM', async () => {
      const approved = await guardian.approveCommitment(orgId, 'commitment-sample-123', 'gerente-lucas');
      expect(approved.status).toBe('APPROVED');
      expect(approved.crmTaskId).toBeDefined();
    });
  });

  describe('Devil’s Advocate — Auditoria Preventiva de Forecast', () => {
    const devilsAdvocate = new DevilsAdvocateAgent();

    it('deve identificar estagnação e objeções não resolvidas e recomendar revisão de probabilidade', async () => {
      const review = await devilsAdvocate.reviewDealForecast({
        organizationId: orgId,
        dealId: 'deal-999',
        dealTitle: 'Contrato Anual Telemetria Master',
        companyName: 'Transportes Rápido Brasil',
        currentForecastStage: 'Fechamento Iminente',
        currentProbabilityPercent: 90,
        daysInCurrentStage: 28, // estagnado
        unresolvedObjections: ['Preço 25% acima do concorrente Sascar', 'Dúvida na compatibilidade com rastreador antigo'],
        competitorsMentioned: ['Sascar', 'Omnilink'],
        lastCustomerInteractionDaysAgo: 16,
      });

      expect(review.isFlaggedForReview).toBe(true);
      expect(review.optimismRiskSeverity).toBe('high');
      expect(review.recommendedProbabilityPercent).toBeLessThan(90);
      expect(review.detectedRedFlags.length).toBeGreaterThan(0);
      expect(review.actionableRecommendations.length).toBeGreaterThan(0);
    });
  });
});
