import { describe, expect, it, beforeEach } from 'vitest';
import { multimodalRoleplaySimulatorService } from '../../../src/features/roleplay/services/multimodalRoleplaySimulator.service.js';

describe('MultimodalRoleplaySimulatorService — Evolução 17 (C3)', () => {
  const orgId = 'org-roleplay-test';
  const sellerId = 'seller-carolina';

  beforeEach(() => {
    multimodalRoleplaySimulatorService.clear();
  });

  it('deve iniciar uma sessão com persona B2B e metodologia selecionada', async () => {
    const session = await multimodalRoleplaySimulatorService.startSession({
      organizationId: orgId,
      sellerId,
      framework: 'SPIN',
      personaArchetype: 'cfo_skeptical',
    });

    expect(session.sessionId).toBeDefined();
    expect(session.status).toBe('active');
    expect(session.persona.archetype).toBe('cfo_skeptical');
    expect(session.persona.name).toContain('Roberto');
    expect(session.turns).toHaveLength(1);
    expect(session.turns[0].speaker).toBe('buyer');
  });

  it('deve submeter turnos do vendedor e receber réplicas dinâmicas do comprador', async () => {
    const session = await multimodalRoleplaySimulatorService.startSession({
      organizationId: orgId,
      sellerId,
      framework: 'SPIN',
      personaArchetype: 'cfo_skeptical',
    });

    const turn1 = await multimodalRoleplaySimulatorService.submitTurn({
      organizationId: orgId,
      sessionId: session.sessionId,
      sellerMessage: 'Quanto custa hoje para a sua empresa cada falha de entrega sem telemetria?',
      talkDurationSeconds: 10,
    });

    expect(turn1.session.turns).toHaveLength(3); // Initial buyer + seller + buyer reply
    expect(turn1.session.turns[1].methodologyTechniqueUsed).toBe('IMPLICATION_QUESTION');
    expect(turn1.buyerReply).toContain('desperdício direto');

    const turn2 = await multimodalRoleplaySimulatorService.submitTurn({
      organizationId: orgId,
      sessionId: session.sessionId,
      sellerMessage: 'Podemos agendar uma demonstração detalhada do cálculo de ROI na quinta-feira às 14h?',
      talkDurationSeconds: 8,
    });

    expect(turn2.session.turns).toHaveLength(5);
    expect(turn2.session.turns[3].methodologyTechniqueUsed).toBe('NEXT_STEP_PROPOSITION');
    expect(turn2.buyerReply).toContain('quinta-feira');
  });

  it('deve avaliar a sessão com pontuação pedagógica ponderada e talk/listen ratio', async () => {
    const session = await multimodalRoleplaySimulatorService.startSession({
      organizationId: orgId,
      sellerId,
      framework: 'SPIN',
      personaArchetype: 'cfo_skeptical',
    });

    await multimodalRoleplaySimulatorService.submitTurn({
      organizationId: orgId,
      sessionId: session.sessionId,
      sellerMessage: 'Qual o impacto e quanto custa o retrabalho operacional atual?',
      talkDurationSeconds: 10,
    });

    await multimodalRoleplaySimulatorService.submitTurn({
      organizationId: orgId,
      sessionId: session.sessionId,
      sellerMessage: 'Podemos agendar a apresentação técnica na quinta-feira?',
      talkDurationSeconds: 7,
    });

    const evaluation = await multimodalRoleplaySimulatorService.evaluateSession({
      organizationId: orgId,
      sessionId: session.sessionId,
    });

    expect(evaluation.framework).toBe('SPIN');
    expect(evaluation.compositeScore).toBeGreaterThanOrEqual(80);
    expect(evaluation.needDiscoveryScore).toBe(92);
    expect(evaluation.nextStepAlignmentScore).toBe(95);
    expect(evaluation.talkListenRatio).toBeLessThan(0.6); // Escuta ativa preservada
    expect(evaluation.awardedXp).toBe(200);

    const saved = await multimodalRoleplaySimulatorService.getSession(orgId, session.sessionId);
    expect(saved?.status).toBe('completed');
  });

  it('deve rejeitar operações sem tenancy (Tenancy Guard)', async () => {
    await expect(
      multimodalRoleplaySimulatorService.startSession({
        organizationId: '',
        sellerId,
        framework: 'SPIN',
        personaArchetype: 'cfo_skeptical',
      }),
    ).rejects.toThrow(/Tenancy violation/);
  });
});
