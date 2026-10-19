import { beforeEach, describe, expect, it } from 'vitest';
import { selfDrivingCrmService } from '../../../src/features/cadence/services/selfDrivingCrm.service.js';
import { recordOptOut } from '../../../src/features/cadence/application/optOutService.js';

describe('SelfDrivingCrmService — Eixo 7 (Cadências Adaptativas & Resgate Inteligente)', () => {
  const orgA = 'org-cadence-alpha';
  const orgB = 'org-cadence-beta';

  beforeEach(() => {
    selfDrivingCrmService.clear();
  });

  describe('Ingestão de Sinais de Engajamento Multi-Canal', () => {
    it('deve registrar sinais auditáveis com proveniência e nível de confiança', async () => {
      const signal = await selfDrivingCrmService.registerEngagementSignal({
        organizationId: orgA,
        leadId: 'lead-transp-01',
        dealId: 'deal-01',
        channel: 'voice_call',
        signalType: 'CALL_UNANSWERED',
        confidence: 0.95,
      });

      expect(signal.id).toBeDefined();
      expect(signal.channel).toBe('voice_call');
      expect(signal.signalType).toBe('CALL_UNANSWERED');
      expect(signal.verified).toBe(true);
      expect(signal.timestamp).toBeDefined();
    });

    it('deve bloquear sinal sem organizationId por garantia de Tenancy', async () => {
      await expect(
        selfDrivingCrmService.registerEngagementSignal({
          organizationId: '',
          leadId: 'lead-01',
          channel: 'email',
          signalType: 'EMAIL_REPLIED',
        }),
      ).rejects.toThrow(/Tenancy violation/);
    });
  });

  describe('Recomendação de Cadência Adaptativa', () => {
    it('deve recomendar redução de ligações e priorização de WhatsApp quando lead não atende voz mas responde WhatsApp', async () => {
      const leadId = 'lead-multi-02';

      // Registrar 2 ligações não atendidas
      await selfDrivingCrmService.registerEngagementSignal({
        organizationId: orgA,
        leadId,
        channel: 'voice_call',
        signalType: 'CALL_UNANSWERED',
      });
      await selfDrivingCrmService.registerEngagementSignal({
        organizationId: orgA,
        leadId,
        channel: 'voice_call',
        signalType: 'CALL_UNANSWERED',
      });

      // Registrar 1 resposta no WhatsApp
      await selfDrivingCrmService.registerEngagementSignal({
        organizationId: orgA,
        leadId,
        channel: 'whatsapp',
        signalType: 'WHATSAPP_REPLIED',
      });

      const recommendation = await selfDrivingCrmService.evaluateCadenceOptimization({
        organizationId: orgA,
        leadId,
      });

      expect(recommendation).not.toBeNull();
      expect(recommendation?.recommendedAction).toBe('reduce_calls_shift_whatsapp');
      expect(recommendation?.prioritizedChannel).toBe('whatsapp');
      expect(recommendation?.status).toBe('PENDING_REVIEW');
      expect(recommendation?.autonomyLevel).toBe('DRAFT');
      expect(recommendation?.rationale).toContain('migrar cadência para WhatsApp');
    });

    it('deve retornar null se não houver sinais de desvio ou padrão conclusivo', async () => {
      const recommendation = await selfDrivingCrmService.evaluateCadenceOptimization({
        organizationId: orgA,
        leadId: 'lead-sem-sinais-03',
      });

      expect(recommendation).toBeNull();
    });

    it('deve aplicar recomendação mediante aprovação humana com rastro de auditoria', async () => {
      const leadId = 'lead-appr-04';
      await selfDrivingCrmService.registerEngagementSignal({
        organizationId: orgA,
        leadId,
        channel: 'voice_call',
        signalType: 'CALL_UNANSWERED',
      });
      await selfDrivingCrmService.registerEngagementSignal({
        organizationId: orgA,
        leadId,
        channel: 'voice_call',
        signalType: 'CALL_UNANSWERED',
      });
      await selfDrivingCrmService.registerEngagementSignal({
        organizationId: orgA,
        leadId,
        channel: 'whatsapp',
        signalType: 'WHATSAPP_REPLIED',
      });

      const rec = await selfDrivingCrmService.evaluateCadenceOptimization({
        organizationId: orgA,
        leadId,
      });

      expect(rec).toBeDefined();

      const approval = await selfDrivingCrmService.approveCadenceRecommendation({
        organizationId: orgA,
        recommendationId: rec!.id,
        approvedBy: 'supervisor-comercial',
      });

      expect(approval.success).toBe(true);
      expect(approval.recommendation.status).toBe('APPROVED');
      expect(approval.recommendation.approvedBy).toBe('supervisor-comercial');
      expect(approval.executionLog.toLowerCase()).toContain('whatsapp');
    });
  });

  describe('Resgate de Leads Estagnados & Trava de Opt-Out', () => {
    it('deve identificar lead inativo há mais de 15 dias e sugerir estratégia de resgate', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

      selfDrivingCrmService.seedLead({
        leadId: 'lead-stag-01',
        leadName: 'Transportes Rápido Ltda',
        currentStage: 'Diagnóstico',
        lastActivityAt: twentyDaysAgo,
        hasActiveDeal: false,
        isWonOrLost: false,
      });

      const stagnated = await selfDrivingCrmService.detectStagnatedLeads({
        organizationId: orgA,
        inactivityThresholdDays: 15,
      });

      expect(stagnated.length).toBe(1);
      const lead = stagnated[0];
      expect(lead.leadId).toBe('lead-stag-01');
      expect(lead.eligibleForReactivation).toBe(true);
      expect(lead.recommendedStrategy).toBe('diagnostic_refresh');
      expect(lead.suggestedCopySubject).toContain('Transportes Rápido');
    });

    it('deve BLOQUEAR categoricamente reativação de lead com opt-out formal (Art. 18 LGPD)', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Registrar lead estagnado
      selfDrivingCrmService.seedLead({
        leadId: 'lead-optout-02',
        leadName: 'Logística Segura S.A.',
        currentStage: 'Apresentação',
        lastActivityAt: thirtyDaysAgo,
        hasActiveDeal: false,
        isWonOrLost: false,
      });

      // Registrar opt-out global no serviço de consentimento
      await recordOptOut(selfDrivingCrmService.getOptOutRepository(), {
        organizationId: orgA,
        scope: 'global',
        subject: { leadId: 'lead-optout-02' },
        reason: 'Solicitou não ser mais contatado',
        originChannel: 'whatsapp',
      });

      const stagnated = await selfDrivingCrmService.detectStagnatedLeads({
        organizationId: orgA,
        inactivityThresholdDays: 15,
      });

      expect(stagnated.length).toBe(1);
      const lead = stagnated[0];
      expect(lead.isOptedOut).toBe(true);
      expect(lead.eligibleForReactivation).toBe(false);
      expect(lead.ineligibilityReason).toContain('opt-out');
      expect(lead.recommendedStrategy).toBeUndefined(); // Nenhuma mensagem sugerida para quem fez opt-out
    });

    it('não deve propor reativação para leads já fechados como Ganho ou Perdido Definitivo', async () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

      selfDrivingCrmService.seedLead({
        leadId: 'lead-closed-03',
        leadName: 'Comércio Sul S.A.',
        currentStage: 'Negócio Ganho',
        lastActivityAt: fortyDaysAgo,
        hasActiveDeal: false,
        isWonOrLost: true, // Já encerrado
      });

      const stagnated = await selfDrivingCrmService.detectStagnatedLeads({
        organizationId: orgA,
        inactivityThresholdDays: 15,
      });

      expect(stagnated.length).toBe(1);
      const lead = stagnated[0];
      expect(lead.eligibleForReactivation).toBe(false);
      expect(lead.ineligibilityReason).toContain('já encerrado formalmente');
    });
  });
});
