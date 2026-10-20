import { describe, expect, it, beforeEach } from 'vitest';
import { conversationalIntelligenceService } from '../../../src/features/ai-voice/server/conversationalIntelligence.service.js';
import { SpeakerTurn } from '../../../src/shared/contracts/conversationalCoaching.contract.js';

describe('ConversationalIntelligenceService — Onda 05 (Eixo 13)', () => {
  const orgId = 'org-coaching-test';
  const sellerId = 'seller-beatriz';
  const callId = 'call-abc-123';

  beforeEach(() => {
    conversationalIntelligenceService.clear();
  });

  it('deve calcular métricas de dinâmica de fala (Talk-to-Listen ratio) com precisão', () => {
    const turns: SpeakerTurn[] = [
      {
        turnId: 'turn-1',
        speaker: 'seller',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        text: 'Olá, obrigado pelo seu tempo hoje. Gostaria de entender o cenário operacional de vocês.',
      },
      {
        turnId: 'turn-2',
        speaker: 'customer',
        startTimeSeconds: 32,
        endTimeSeconds: 52,
        durationSeconds: 20,
        text: 'Olá Beatriz. Hoje enfrentamos gargalos no monitoramento em tempo real da nossa frota.',
      },
    ];

    const metrics = conversationalIntelligenceService.calculateDynamicMetrics(turns);

    expect(metrics.sellerTalkTimeSeconds).toBe(30);
    expect(metrics.customerTalkTimeSeconds).toBe(20);
    expect(metrics.sellerTalkRatio).toBe(0.6); // 60% vendedor
    expect(metrics.customerTalkRatio).toBe(0.4); // 40% cliente
    expect(metrics.totalTurns).toBe(2);
    expect(metrics.averageTurnDurationSeconds).toBe(25);
    expect(metrics.isEstimate).toBe(false);
  });

  it('deve categorizar perguntas abertas vs fechadas formuladas pelo vendedor', () => {
    const turns: SpeakerTurn[] = [
      {
        turnId: 't-1',
        speaker: 'seller',
        startTimeSeconds: 0,
        endTimeSeconds: 10,
        durationSeconds: 10,
        text: 'Como vocês lidam com a perda de pacotes atualmente?',
      },
      {
        turnId: 't-2',
        speaker: 'seller',
        startTimeSeconds: 20,
        endTimeSeconds: 25,
        durationSeconds: 5,
        text: 'Vocês utilizam o sistema X?',
      },
      {
        turnId: 't-3',
        speaker: 'seller',
        startTimeSeconds: 40,
        endTimeSeconds: 50,
        durationSeconds: 10,
        text: 'Qual o impacto financeiro dessa demora no fechamento do mês?',
      },
    ];

    const analysis = conversationalIntelligenceService.analyzeQuestions(turns);

    expect(analysis.totalQuestionsAskedBySeller).toBe(3);
    expect(analysis.openQuestionsCount).toBe(2);
    expect(analysis.closedQuestionsCount).toBe(1);
    expect(analysis.openQuestionRatio).toBe(0.67);
    expect(analysis.sampleOpenQuestions).toHaveLength(2);
  });

  it('deve extrair objeções explícitas e verificar se foram respondidas pelo vendedor', () => {
    const turns: SpeakerTurn[] = [
      {
        turnId: 't-1',
        speaker: 'customer',
        startTimeSeconds: 10,
        endTimeSeconds: 20,
        durationSeconds: 10,
        text: 'Entendi, mas o valor da mensalidade está muito caro para o nosso orçamento.',
      },
      {
        turnId: 't-2',
        speaker: 'seller',
        startTimeSeconds: 21,
        endTimeSeconds: 45,
        durationSeconds: 24,
        text: 'Compreendo perfeitamente a cautela com o budget. Comparando com o custo mensal de 15 mil reais em retrabalho, nosso retorno se paga no segundo mês.',
      },
    ];

    const objections = conversationalIntelligenceService.extractExplicitObjections(turns);

    expect(objections).toHaveLength(1);
    expect(objections[0].category).toBe('price');
    expect(objections[0].wasAddressedBySeller).toBe(true);
    expect(objections[0].playbookReferenceId).toBe('playbook-pricing-roi-reframe');
  });

  it('deve avaliar a aderência ao framework de vendas SPIN com pontuação objetiva', () => {
    const turns: SpeakerTurn[] = [
      {
        turnId: 't-1',
        speaker: 'seller',
        startTimeSeconds: 0,
        endTimeSeconds: 15,
        durationSeconds: 15,
        text: 'Como funciona a alocação de cargas no cenário atual de vocês?',
      },
      {
        turnId: 't-2',
        speaker: 'seller',
        startTimeSeconds: 30,
        endTimeSeconds: 45,
        durationSeconds: 15,
        text: 'Onde mais trava o processo quando ocorrem picos sazonais?',
      },
      {
        turnId: 't-3',
        speaker: 'seller',
        startTimeSeconds: 60,
        endTimeSeconds: 75,
        durationSeconds: 15,
        text: 'Qual o custo disso para a pontualidade das entregas?',
      },
    ];

    const methodology = conversationalIntelligenceService.evaluateMethodology(turns, 'SPIN');

    expect(methodology.framework).toBe('SPIN');
    expect(methodology.adherenceScore).toBe(75); // 3 de 4 critérios atendidos
    expect(methodology.criteriaChecked[0].verified).toBe(true); // Situação
    expect(methodology.criteriaChecked[1].verified).toBe(true); // Problema
    expect(methodology.criteriaChecked[2].verified).toBe(true); // Implicação
    expect(methodology.criteriaChecked[3].verified).toBe(false); // Necessidade de solução
  });

  it('deve gerar relatório completo de coaching pós-chamada com recomendações pedagógicas para Roleplay', async () => {
    const turns: SpeakerTurn[] = [
      {
        turnId: 't-1',
        speaker: 'seller',
        startTimeSeconds: 0,
        endTimeSeconds: 80,
        durationSeconds: 80,
        text: 'Vou apresentar todos os módulos do nosso sistema sem pausas.',
      },
      {
        turnId: 't-2',
        speaker: 'customer',
        startTimeSeconds: 81,
        endTimeSeconds: 100,
        durationSeconds: 19,
        text: 'Achei o investimento alto e precisamos falar depois do trimestre.',
      },
    ];

    const report = await conversationalIntelligenceService.generatePostCallReport({
      organizationId: orgId,
      callId,
      sellerId,
      turns,
      expectedFramework: 'SPIN',
    });

    expect(report.reportId).toBe(`coaching-${callId}`);
    expect(report.organizationId).toBe(orgId);
    expect(report.dynamics.sellerTalkRatio).toBeGreaterThan(0.7);
    expect(report.pedagogicalRecommendations.length).toBeGreaterThan(0);
    // Deve sugerir exercício de escuta ativa
    const listeningRec = report.pedagogicalRecommendations.find(
      (r) => r.category === 'active_listening',
    );
    expect(listeningRec).toBeDefined();
    expect(listeningRec?.recommendedRoleplayExercise?.scenarioId).toBe(
      'roleplay-active-listening-warmup',
    );
  });

  it('deve isolar relatórios por tenant impedindo vazamento entre organizações', async () => {
    const turns: SpeakerTurn[] = [
      {
        turnId: 't-1',
        speaker: 'seller',
        startTimeSeconds: 0,
        endTimeSeconds: 10,
        durationSeconds: 10,
        text: 'Pergunta de teste',
      },
    ];

    const report = await conversationalIntelligenceService.generatePostCallReport({
      organizationId: orgId,
      callId: 'call-isolated',
      sellerId,
      turns,
    });

    const accessOrgA = conversationalIntelligenceService.getReport(report.reportId, orgId);
    const accessOrgB = conversationalIntelligenceService.getReport(
      report.reportId,
      'org-concorrente',
    );

    expect(accessOrgA).not.toBeNull();
    expect(accessOrgB).toBeNull();
  });
});
