import { beforeEach, describe, expect, it } from 'vitest';
import { methodologicalDigitalTwinService } from '../../../src/features/intelligence/services/methodologicalDigitalTwin.service.js';

describe('Eixo 8: Digital Twins Metodológicos Service (Agente 07 & 13)', () => {
  const orgA = 'org-birthub-tenant-alpha';
  const orgB = 'org-birthub-tenant-beta';

  beforeEach(() => {
    methodologicalDigitalTwinService.clear();
  });

  it('deve listar técnicas metodológicas padrão (SPIN e Objeção de Preço)', async () => {
    const list = await methodologicalDigitalTwinService.listAvailableTechniques(orgA);
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((t) => t.category === 'spin_questioning')).toBe(true);
    expect(list.some((t) => t.category === 'objection_handling')).toBe(true);
  });

  it('deve registrar nova técnica e criar mentor sintético sem clonagem de pessoas reais', async () => {
    const tech = await methodologicalDigitalTwinService.registerTechniquePattern({
      organizationId: orgA,
      technique: {
        name: 'Ancoragem de ROI em Diagnóstico',
        category: 'value_anchoring',
        description: 'Demonstração de retorno percentual antecipado.',
        triggerContext: 'Quando o decisor questiona o valor total do investimento.',
        exampleSyntheticSnippet: 'Se eliminarmos esse gargalo, o ganho de eficiência mensal é de R$ 45.000.',
        evaluationChecklist: ['Articula economia tangível', 'Confirma horizonte temporal'],
        recommendedTalkRatioTarget: 0.35,
      },
    });

    expect(tech.techniqueId).toBeDefined();

    const mentor = await methodologicalDigitalTwinService.createMentorProfile({
      organizationId: orgA,
      syntheticPersonaName: 'Coach Sintético de Grandes Contas',
      targetMethodology: 'Ancoragem e SPIN',
      curatedBy: 'gestor-metodologia',
      techniqueIds: [tech.techniqueId],
    });

    expect(mentor.isSyntheticCoach).toBe(true);
    expect(mentor.allowedTechniques).toContain(tech.techniqueId);
  });

  it('deve executar exercício de simulação e avaliar resposta do vendedor pedagogicamente', async () => {
    const exercise = await methodologicalDigitalTwinService.startMentorshipExercise({
      organizationId: orgA,
      sellerId: 'seller-lucas',
      techniqueId: 'tech-objection-tco',
    });

    expect(exercise.exerciseId).toBeDefined();
    expect(exercise.buyerObjection).toContain('orçamento');

    // Resposta com aplicação da técnica (TCO, custo, próximo passo)
    const evaluation = await methodologicalDigitalTwinService.evaluateSellerResponse({
      organizationId: orgA,
      exerciseId: exercise.exerciseId,
      sellerId: 'seller-lucas',
      responseText: 'Compreendo a questão orçamentária. No entanto, analisando o TCO e o impacto do custo operacional atual, o projeto se paga em 4 meses. Quando podemos agendar uma reunião técnica para detalhar esses números?',
      recordedDurationSeconds: 25,
    });

    expect(evaluation.scorePercent).toBeGreaterThanOrEqual(85);
    expect(evaluation.talkRatioPercent).toBe(38);
    expect(evaluation.strengths.length).toBeGreaterThan(0);
  });

  it('deve indicar áreas de melhoria quando a resposta ignorar os critérios da metodologia', async () => {
    const exercise = await methodologicalDigitalTwinService.startMentorshipExercise({
      organizationId: orgA,
      sellerId: 'seller-rodrigo',
      techniqueId: 'tech-spin-implication',
    });

    // Resposta fraca sem perguntas ou menção a custo/impacto
    const evaluation = await methodologicalDigitalTwinService.evaluateSellerResponse({
      organizationId: orgA,
      exerciseId: exercise.exerciseId,
      sellerId: 'seller-rodrigo',
      responseText: 'Nosso produto é excelente e muito fácil de usar. Você vai adorar a plataforma.',
      recordedDurationSeconds: 15,
    });

    expect(evaluation.scorePercent).toBeLessThan(80);
    expect(evaluation.improvementAreas.length).toBeGreaterThan(0);
    expect(evaluation.nextRecommendedExercise).toBeDefined();
  });

  it('deve garantir isolamento multi-tenant de exercícios e avaliações', async () => {
    const exercise = await methodologicalDigitalTwinService.startMentorshipExercise({
      organizationId: orgA,
      sellerId: 'seller-a',
      techniqueId: 'tech-objection-tco',
    });

    // Tenant B tentando avaliar o exercício do Tenant A
    await expect(
      methodologicalDigitalTwinService.evaluateSellerResponse({
        organizationId: orgB,
        exerciseId: exercise.exerciseId,
        sellerId: 'seller-b',
        responseText: 'Resposta',
        recordedDurationSeconds: 20,
      }),
    ).rejects.toThrow(/não encontrado/);
  });
});
