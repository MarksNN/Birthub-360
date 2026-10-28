import { randomUUID } from 'node:crypto';
import { logger } from '../../../lib/logger.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import type {
  CommercialTechniquePattern,
  IMethodologicalDigitalTwinPort,
  MentorshipEvaluation,
  MentorshipExercise,
  MethodologicalMentorProfile,
} from '../../../shared/contracts/methodologicalDigitalTwin.contract.js';

export class MethodologicalDigitalTwinService implements IMethodologicalDigitalTwinPort {
  private techniques = new Map<string, CommercialTechniquePattern>(); // key: `${orgId}:${techId}`
  private mentors = new Map<string, MethodologicalMentorProfile>(); // key: `${orgId}:${mentorId}`
  private exercises = new Map<string, MentorshipExercise>(); // key: `${orgId}:${exerciseId}`

  constructor() {
    // Carregar técnicas padrão metodológicas recomendadas (SPIN, Objeção de Preço, Diagnóstico)
    this.seedDefaultTechniques('global-catalog');
  }

  private seedDefaultTechniques(orgId: string): void {
    const defaultSpin: CommercialTechniquePattern = {
      techniqueId: 'tech-spin-implication',
      name: 'Implicação de Custo de Inação (SPIN)',
      category: 'spin_questioning',
      description:
        'Perguntas que direcionam o comprador a quantificar o prejuízo da inércia operacional.',
      triggerContext: 'Quando o lead afirma que o processo atual funciona razoavelmente.',
      exampleSyntheticSnippet:
        'Qual o custo mensal estimado das horas extras gastas compensando o retrabalho manual?',
      evaluationChecklist: [
        'Evidencia impacto financeiro ou operacional direto',
        'Não salta prematuramente para apresentação de produto',
        'Mantém tom consultivo de investigação conjunta',
      ],
      recommendedTalkRatioTarget: 0.35,
    };
    this.techniques.set(`${orgId}:${defaultSpin.techniqueId}`, defaultSpin);

    const defaultObjection: CommercialTechniquePattern = {
      techniqueId: 'tech-objection-tco',
      name: 'Desconstrução de Preço por TCO e Retorno',
      category: 'objection_handling',
      description:
        'Isola a objeção de preço demonstrando o custo total de posse versus retorno líquido gerado.',
      triggerContext: 'Quando o comprador argumenta que a proposta ultrapassa a verba orçada.',
      exampleSyntheticSnippet:
        'Compreendo a restrição orçamentária. Se pudermos demonstrar que a economia gerada paga a parcela em 90 dias, o projeto é prioritário?',
      evaluationChecklist: [
        'Isola a objeção antes de justificar valores',
        'Conecta o investimento ao benefício tangível mensurável',
        'Confirma o critério de prioridade do decisor',
      ],
      recommendedTalkRatioTarget: 0.4,
    };
    this.techniques.set(`${orgId}:${defaultObjection.techniqueId}`, defaultObjection);
  }

  async registerTechniquePattern(params: {
    organizationId: string;
    technique: Omit<CommercialTechniquePattern, 'techniqueId'>;
  }): Promise<CommercialTechniquePattern> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }

    const techniqueId = `tech-${randomUUID().substring(0, 8)}`;
    const fullTechnique: CommercialTechniquePattern = {
      ...params.technique,
      techniqueId,
    };

    this.techniques.set(`${params.organizationId}:${techniqueId}`, fullTechnique);
    logger.info(
      `[DigitalTwin] Técnica metodológica ${fullTechnique.name} (${techniqueId}) registrada no tenant ${params.organizationId}.`,
    );

    return fullTechnique;
  }

  async listAvailableTechniques(organizationId: string): Promise<CommercialTechniquePattern[]> {
    const results: CommercialTechniquePattern[] = [];
    for (const [key, tech] of this.techniques.entries()) {
      if (key.startsWith(`${organizationId}:`) || key.startsWith('global-catalog:')) {
        results.push(tech);
      }
    }
    return results;
  }

  async createMentorProfile(params: {
    organizationId: string;
    syntheticPersonaName: string;
    targetMethodology: string;
    curatedBy: string;
    techniqueIds: string[];
  }): Promise<MethodologicalMentorProfile> {
    if (!params.organizationId) {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }

    const mentorId = `mentor-${randomUUID().substring(0, 8)}`;
    const profile: MethodologicalMentorProfile = {
      mentorId,
      organizationId: params.organizationId,
      syntheticPersonaName: params.syntheticPersonaName,
      targetMethodology: params.targetMethodology,
      curatedBy: params.curatedBy,
      isSyntheticCoach: true, // Proibição de clonagem: garantia expressa de treinador sintético
      allowedTechniques: params.techniqueIds,
      updatedAt: new Date().toISOString(),
    };

    this.mentors.set(`${params.organizationId}:${mentorId}`, profile);
    logger.info(
      `[DigitalTwin] Mentor metodológico sintético "${profile.syntheticPersonaName}" (${mentorId}) criado no tenant ${params.organizationId}.`,
    );

    return profile;
  }

  async startMentorshipExercise(params: {
    organizationId: string;
    sellerId: string;
    techniqueId: string;
  }): Promise<MentorshipExercise> {
    const tech =
      this.techniques.get(`${params.organizationId}:${params.techniqueId}`) ||
      this.techniques.get(`global-catalog:${params.techniqueId}`);

    if (!tech) {
      throw new Error(`Técnica ${params.techniqueId} não encontrada no catálogo do tenant.`);
    }

    const exerciseId = `ex-${randomUUID().substring(0, 8)}`;
    const exercise: MentorshipExercise = {
      exerciseId,
      organizationId: params.organizationId,
      sellerId: params.sellerId,
      techniqueId: tech.techniqueId,
      scenarioDescription: `Simulação de negociação com CFO de grande empresa de logística. Contexto: ${tech.triggerContext}`,
      buyerObjection:
        'Nosso orçamento para novas ferramentas este ano já foi completamente alocado.',
      expectedBehaviors: tech.evaluationChecklist,
    };

    this.exercises.set(`${params.organizationId}:${exerciseId}`, exercise);
    return exercise;
  }

  async evaluateSellerResponse(params: {
    organizationId: string;
    exerciseId: string;
    sellerId: string;
    responseText: string;
    recordedDurationSeconds: number;
  }): Promise<MentorshipEvaluation> {
    const exercise = this.exercises.get(`${params.organizationId}:${params.exerciseId}`);
    if (!exercise) {
      throw new Error(`Exercício ${params.exerciseId} não encontrado no tenant.`);
    }

    const lower = params.responseText.toLowerCase();
    let score = 70;
    const strengths: string[] = [];
    const improvements: string[] = [];

    // Checagem objetiva dos critérios da técnica
    if (
      lower.includes('custo') ||
      lower.includes('impacto') ||
      lower.includes('economia') ||
      lower.includes('tco')
    ) {
      score += 15;
      strengths.push('Articulação direta de impacto financeiro e TCO.');
    } else {
      improvements.push('Quantificar em valores ou horas o custo do gargalo com o cliente.');
    }

    if (
      lower.includes('prioritário') ||
      lower.includes('quando') ||
      lower.includes('próximo') ||
      lower.includes('passo')
    ) {
      score += 15;
      strengths.push('Fechamento de compromisso com confirmação clara de próximos passos.');
    } else {
      improvements.push('Propor um próximo passo estruturado (diagnóstico ou alinhamento de ROI).');
    }

    // Proporção de fala simulada (ideal: 30-45% em discovery/objeção)
    const talkRatioPercent = params.recordedDurationSeconds > 40 ? 55 : 38;

    const evaluation: MentorshipEvaluation = {
      exerciseId: params.exerciseId,
      sellerId: params.sellerId,
      scorePercent: Math.min(score, 100),
      spinAdherencePercent: score >= 85 ? 90 : 75,
      talkRatioPercent,
      strengths: strengths.length > 0 ? strengths : ['Postura respeitosa e profissional'],
      improvementAreas:
        improvements.length > 0 ? improvements : ['Praticar respostas mais concisas'],
      pedagogicalFeedback:
        score >= 85
          ? 'Excelente aplicação da técnica metodológica. Objeção contornada com embasamento de valor sem agressividade comercial.'
          : 'Aplicação parcial da metodologia. Recomendamos enfatizar o custo de inação antes de propor a solução técnica.',
      nextRecommendedExercise: score < 85 ? 'tech-spin-implication' : undefined,
      evaluatedAt: new Date().toISOString(),
    };

    await domainEventMesh.publish({
      eventType: 'METHODOLOGICAL_MENTORSHIP_COMPLETED',
      eventVersion: '1.0.0',
      organizationId: params.organizationId,
      correlationId: `mentorship-${params.exerciseId}`,
      producer: 'methodological-digital-twin-service',
      aggregateId: params.sellerId,
      payload: {
        exerciseId: params.exerciseId,
        sellerId: params.sellerId,
        techniqueId: exercise.techniqueId,
        scorePercent: evaluation.scorePercent,
        spinAdherencePercent: evaluation.spinAdherencePercent,
      },
    });

    logger.info(
      `[DigitalTwin] Exercício ${params.exerciseId} concluído pelo vendedor ${params.sellerId}. Nota: ${evaluation.scorePercent}%.`,
    );

    return evaluation;
  }

  clear(): void {
    this.techniques.clear();
    this.mentors.clear();
    this.exercises.clear();
    this.seedDefaultTechniques('global-catalog');
  }
}

export const methodologicalDigitalTwinService = new MethodologicalDigitalTwinService();
