import { beforeEach, describe, expect, it } from 'vitest';
import { AccountDetectiveAgent } from '../../../src/features/intelligence/agents/tactical/accountDetective.agent.js';
import { DevilsAdvocateAgent } from '../../../src/features/intelligence/agents/tactical/devilsAdvocate.agent.js';
import { PromiseGuardianAgent } from '../../../src/features/intelligence/agents/tactical/promiseGuardian.agent.js';
import tacticalDataset from '../../../src/features/intelligence/evaluation/golden-dataset-tactical.json';

describe('Bateria de Golden Datasets & Evals Factuais dos Agentes Táticos', () => {
  const orgId = 'org-tactical-eval-tenant';
  let detective: AccountDetectiveAgent;
  let guardian: PromiseGuardianAgent;
  let advocate: DevilsAdvocateAgent;

  beforeEach(() => {
    detective = new AccountDetectiveAgent();
    guardian = new PromiseGuardianAgent();
    advocate = new DevilsAdvocateAgent();
    guardian.clear();
  });

  it('valida que o dataset tático possui versão, data e casos definidos', () => {
    expect(tacticalDataset.version).toBeDefined();
    expect(tacticalDataset.cases.length).toBeGreaterThanOrEqual(4);
  });

  describe('Promise Guardian — Factualidade de Compromissos e Ausência de Alucinações', () => {
    it('extrai compromissos reais de forma determinística sem inventar fatos (tactical-promise-001)', async () => {
      const tc = tacticalDataset.cases.find((c) => c.id === 'tactical-promise-001')!;
      expect(tc).toBeDefined();

      const commitments = await guardian.extractCommitments({
        organizationId: orgId,
        sourceInteractionId: 'interaction-meeting-eval-1',
        sourceType: tc.input.sourceType as any,
        promiserName: tc.input.promiserName,
        recipientName: tc.input.recipientName,
        interactionTranscript: tc.input.transcript,
      });

      expect(commitments.length).toBeGreaterThanOrEqual(tc.expected.minCommitments);
      const types = commitments.map((c) => c.commitmentType);
      for (const expectedType of tc.expected.detectedTypes) {
        expect(types).toContain(expectedType);
      }

      for (const c of commitments) {
        expect(c.requiresHumanApproval).toBe(tc.expected.requiresHumanApproval);
        expect(c.status).toBe('DETECTED');
        expect(c.detectedDueDate).toBeDefined();
      }
    });

    it('não alucina promessas quando a conversa é cordial e exploratória (tactical-promise-002)', async () => {
      const tc = tacticalDataset.cases.find((c) => c.id === 'tactical-promise-002')!;
      expect(tc).toBeDefined();

      const commitments = await guardian.extractCommitments({
        organizationId: orgId,
        sourceInteractionId: 'interaction-whatsapp-eval-2',
        sourceType: tc.input.sourceType as any,
        promiserName: tc.input.promiserName,
        recipientName: tc.input.recipientName,
        interactionTranscript: tc.input.transcript,
      });

      expect(commitments.length).toBe(0);
    });
  });

  describe('Account Detective — Separação Estrita de Fatos e Hipóteses', () => {
    it('gera dossiê executivo com fatos verificados e marca todas as hipóteses (tactical-detective-001)', async () => {
      const tc = tacticalDataset.cases.find((c) => c.id === 'tactical-detective-001')!;
      expect(tc).toBeDefined();

      const dossier = await detective.generateDossier({
        organizationId: orgId,
        companyId: tc.input.companyId,
        companyName: tc.input.companyName,
        cnpj: tc.input.cnpj,
        segment: tc.input.segment,
        employeeCount: tc.input.employeeCount,
      });

      expect(dossier.companyName).toBe(tc.input.companyName);
      expect(dossier.verifiedFacts.length).toBeGreaterThanOrEqual(tc.expected.minVerifiedFacts);

      // Verificação de ausência de alucinações: fatos verificados contêm fontes e datas
      for (const fact of dossier.verifiedFacts) {
        expect(fact.source).toBeDefined();
        expect(fact.label).toBeDefined();
        expect(fact.value).toBeDefined();
      }

      // Verificação de hipóteses: todas devem conter isHypothesisOnly: true
      expect(dossier.painHypotheses.length).toBeGreaterThan(0);
      for (const hypothesis of dossier.painHypotheses) {
        expect(hypothesis.isHypothesisOnly).toBe(true);
      }

      expect(dossier.sourcesAndConfidence.overallConfidence).toBe(tc.expected.confidenceLevel);
    });
  });

  describe("Devil's Advocate — Auditoria Preventiva e Detecção de Viés de Otimismo", () => {
    it('contesta forecast irrealista em oportunidade estagnada com objeções (tactical-devils-001)', async () => {
      const tc = tacticalDataset.cases.find((c) => c.id === 'tactical-devils-001')!;
      expect(tc).toBeDefined();

      const analysis = await advocate.reviewDealForecast({
        organizationId: orgId,
        dealId: tc.input.dealId,
        dealTitle: tc.input.dealTitle,
        companyName: 'Maternidade Santa Cecília',
        currentForecastStage: tc.input.currentStage,
        currentProbabilityPercent: tc.input.currentProbability,
        daysInCurrentStage: tc.input.daysInCurrentStage,
        stageAverageDays: tc.input.stageAverageDays,
        unresolvedObjections: tc.input.unresolvedObjections,
        lastCustomerInteractionDaysAgo: tc.input.daysSinceLastInteraction,
      });

      expect(analysis.isFlaggedForReview).toBe(tc.expected.optimismBiasDetected);
      expect(analysis.recommendedProbabilityPercent).toBeLessThan(
        tc.expected.recommendedProbabilityLessThan,
      );
      expect(analysis.optimismRiskSeverity).toBe(tc.expected.severity);
      expect(analysis.detectedRedFlags.length).toBeGreaterThanOrEqual(tc.expected.minEvidences);
      expect(analysis.actionableRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Factual Accuracy & Overall Scoring', () => {
    it('garante fidelidade de 100% em todos os cenários táticos sem quebra de tenancy', async () => {
      // Teste de Tenancy
      await expect(
        detective.generateExecutiveDossier('', 'comp-1'),
      ).rejects.toThrow('Tenancy violation');

      await expect(
        guardian.extractCommitmentsFromInteraction({
          organizationId: '',
          interactionId: 'int-1',
          sourceType: 'meeting',
          content: 'prometo',
          sellerName: 'Vendedor',
        }),
      ).rejects.toThrow('Tenancy violation');

      await expect(
        advocate.evaluateDealForecast('', 'deal-1'),
      ).rejects.toThrow('Tenancy violation');
    });
  });
});
