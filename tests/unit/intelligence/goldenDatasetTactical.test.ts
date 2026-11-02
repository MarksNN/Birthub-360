import { beforeEach, describe, expect, it } from 'vitest';
import tacticalData from '../../evals/golden-dataset-tactical.json';
import { accountDetectiveAgent } from '../../../src/features/intelligence/agents/tactical/accountDetective.agent.js';
import { devilsAdvocateAgent } from '../../../src/features/intelligence/agents/tactical/devilsAdvocate.agent.js';
import { promiseGuardianAgent } from '../../../src/features/intelligence/agents/tactical/promiseGuardian.agent.js';
import { domainEventMesh } from '../../../src/lib/queue/domainEventMesh.service.js';

describe('Harness de Avaliação de Regressão Factual (Golden Dataset Tático)', () => {
  const tenantId = 'org-test-golden-tactical';

  beforeEach(() => {
    promiseGuardianAgent.clear();
    domainEventMesh.clearProcessedEvents();
  });

  describe('1. Promise Guardian — Acurácia, Precisão e Recall em Transcrições Comerciais', () => {
    it('deve atingir precisão e recall >= 90% na detecção de promessas e 0 promessas perdidas', async () => {
      let tp = 0;
      let fp = 0;
      let fn = 0;
      let matchedCases = 0;

      for (const c of tacticalData.promiseGuardianCases) {
        promiseGuardianAgent.clear();
        const detected = await promiseGuardianAgent.extractCommitmentsFromInteraction({
          organizationId: tenantId,
          interactionId: c.id,
          sourceType: c.sourceType as any,
          content: c.transcript,
          sellerName: c.sellerName,
        });

        const expectedTypes = c.expectedCommitments.map((x) => x.type);
        const detectedTypes = detected.map((x) => x.commitmentType);

        if (expectedTypes.length === 0) {
          if (detectedTypes.length === 0) {
            matchedCases += 1;
          } else {
            fp += detectedTypes.length;
          }
        } else {
          let matched = 0;
          for (const expected of expectedTypes) {
            if (detectedTypes.includes(expected as any)) {
              tp += 1;
              matched += 1;
            } else {
              fn += 1;
            }
          }
          for (const det of detectedTypes) {
            if (!expectedTypes.includes(det)) {
              fp += 1;
            }
          }
          if (matched === expectedTypes.length && detectedTypes.length === expectedTypes.length) {
            matchedCases += 1;
          }
        }
      }

      const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
      const accuracy = matchedCases / tacticalData.promiseGuardianCases.length;

      expect(accuracy).toBeGreaterThanOrEqual(0.9);
      expect(precision).toBeGreaterThanOrEqual(0.9);
      expect(recall).toBeGreaterThanOrEqual(0.9);
      expect(fn).toBe(0); // Nenhuma perda de promessa (zero false negatives)
    });
  });

  describe('2. Account Detective — Factualidade de Dossiê e Isolamento de Hipóteses', () => {
    it('deve garantir integridade das 10 seções e 100% de hipóteses estritamente isoladas como não-fatos', async () => {
      let allSectionsValid = 0;
      let totalHypotheses = 0;
      let isolatedHypotheses = 0;

      for (const c of tacticalData.accountDetectiveCases) {
        const dossier = await accountDetectiveAgent.generateExecutiveDossier(
          tenantId,
          c.companyId,
          c.input,
        );

        const has10Sections = [
          dossier.companyId,
          dossier.companyName,
          dossier.summary,
          dossier.verifiedFacts,
          dossier.recentSignals,
          dossier.commercialRisks,
          dossier.identifiedOpportunities,
          dossier.knownDecisionMakers,
          dossier.painHypotheses,
          dossier.recommendedDiscoveryQuestions,
          dossier.sourcesAndConfidence,
        ].every((section) => section !== undefined);

        if (has10Sections) allSectionsValid += 1;

        for (const h of dossier.painHypotheses) {
          totalHypotheses += 1;
          if (h.isHypothesisOnly === true) {
            isolatedHypotheses += 1;
          }
        }

        // Fatos verificados devem conter fonte idônea
        expect(dossier.verifiedFacts.length).toBeGreaterThanOrEqual(3);
        for (const f of dossier.verifiedFacts) {
          expect(f.source).toBeDefined();
          expect(f.source.length).toBeGreaterThan(0);
        }
      }

      expect(allSectionsValid).toBe(tacticalData.accountDetectiveCases.length);
      expect(isolatedHypotheses / totalHypotheses).toBe(1.0); // 100% isolamento (zero alucinação de fatos)
    });
  });

  describe("3. Devil's Advocate — Auditoria Preventiva e Detecção de Viés de Otimismo", () => {
    it('deve identificar viés de otimismo com precisão e recall >= 90%', async () => {
      let tp = 0;
      let fp = 0;
      let fn = 0;
      let tn = 0;
      let actionsMatched = 0;

      for (const c of tacticalData.devilsAdvocateCases) {
        const analysis = await devilsAdvocateAgent.evaluateDealForecast(
          tenantId,
          c.dealId,
          c.input,
        );

        if (c.expected.optimismBiasDetected) {
          if (analysis.optimismBiasDetected) tp += 1;
          else fn += 1;
        } else {
          if (!analysis.optimismBiasDetected) tn += 1;
          else fp += 1;
        }

        if (
          analysis.forecastRevisionRecommendation.recommendedAction ===
          c.expected.recommendedAction
        ) {
          actionsMatched += 1;
        }
      }

      const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
      const actionAccuracy = actionsMatched / tacticalData.devilsAdvocateCases.length;

      expect(precision).toBeGreaterThanOrEqual(0.9);
      expect(recall).toBeGreaterThanOrEqual(0.9);
      expect(actionAccuracy).toBeGreaterThanOrEqual(0.9);
    });
  });
});
