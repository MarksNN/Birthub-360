import type { ObjectionMatrixItemRepository } from '../../playbook/objection-matrix/domain/ObjectionMatrixItem.js';
import { PrismaObjectionMatrixRepository } from '../../playbook/objection-matrix/infra/PrismaObjectionMatrixRepository.js';
import type { QualificationMatrixItemRepository } from '../../playbook/qualification-matrix/domain/QualificationMatrixItem.js';
import { PrismaQualificationMatrixRepository } from '../../playbook/qualification-matrix/infra/PrismaQualificationMatrixRepository.js';
import type {
  RoleplayFeedback,
  RoleplayMessage,
  RoleplayPersona,
  RoleplayRepository,
  RoleplaySession,
} from '../domain/Roleplay.js';
import { prismaRoleplayRepository } from '../infra/PrismaRoleplayRepository.js';
import { RoleplayAiService } from '../services/roleplay-ai.service.js';

export class RoleplayUseCases {
  constructor(
    private repository: RoleplayRepository = prismaRoleplayRepository,
    private aiService: RoleplayAiService = new RoleplayAiService(),
    private qualificationRepo: QualificationMatrixItemRepository = new PrismaQualificationMatrixRepository(),
    private objectionRepo: ObjectionMatrixItemRepository = new PrismaObjectionMatrixRepository(),
  ) {}

  async listPersonas(): Promise<RoleplayPersona[]> {
    return this.repository.listPersonas();
  }

  async startSession(
    organizationId: string,
    userId: string,
    personaId: string,
  ): Promise<{
    session: RoleplaySession;
    persona: RoleplayPersona;
    initialGreeting: string;
  }> {
    const persona = await this.repository.getPersonaById(personaId);
    if (!persona) {
      throw new Error(`Persona não encontrada: ${personaId}`);
    }

    const session = await this.repository.createSession({ organizationId, userId, personaId });
    const initialGreeting = `Olá. Sou ${persona.name}, ${persona.title}. Estou com minha agenda bastante concorrida hoje, mas tenho 10 minutos. O que você gostaria de me apresentar?`;

    const assistantMsg: RoleplayMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: initialGreeting,
      timestamp: new Date().toISOString(),
    };

    await this.repository.addMessage(organizationId, session.id, assistantMsg);

    return { session, persona, initialGreeting };
  }

  async sendTurn(
    organizationId: string,
    sessionId: string,
    userText: string,
  ): Promise<{ response: string; turnCount: number }> {
    const session = await this.repository.getSession(organizationId, sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    if (session.status === 'COMPLETED') throw new Error('Sessão já concluída');

    const persona = await this.repository.getPersonaById(session.personaId);
    if (!persona) throw new Error('Persona não encontrada');

    const userMsg: RoleplayMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    await this.repository.addMessage(organizationId, sessionId, userMsg);

    const personaDifficulty =
      persona.difficulty === 'AVANCADO'
        ? ('Difícil' as const)
        : persona.difficulty === 'INTERMEDIARIO'
          ? ('Médio' as const)
          : ('Fácil' as const);

    const personaInput = {
      name: persona.name,
      role: persona.title,
      companyProfile: persona.companyType,
      difficulty: personaDifficulty,
      mainObjection: persona.coreObjections[0] || 'Orçamento restrito',
      personality: persona.personalityTraits.join(', '),
    };

    const history = session.messages.map((m) => ({
      sender: (m.role === 'user' ? 'user' : 'persona') as 'user' | 'persona',
      text: m.content,
    }));

    // Busca matrizes ativas da organização para contextualizar a simulação (DT-007)
    let qualificationCriteria: string[] = [];
    let objections: string[] = [];
    try {
      const [qualRes, objRes] = await Promise.all([
        this.qualificationRepo.findAllWithFilters(organizationId, undefined, 1, 50),
        this.objectionRepo.findAllWithFilters(organizationId, undefined, 1, 50),
      ]);
      qualificationCriteria = qualRes.data.map((q) => `${q.questionCategory}: ${q.questionText}`);
      objections = objRes.data.map((o) => `${o.objectionTitle} (${o.objectionText})`);
    } catch {
      // Degradação graciosa em caso de falha de leitura secundária
    }

    // Execução real do LLM provider (DT-007: sem MOCK_DATA no caminho produtivo)
    const aiResponse = await this.aiService.simulateCustomerResponse({
      persona: personaInput,
      history,
      userMessage: userText,
      qualificationCriteria,
      objections,
    });

    const replyText = aiResponse.personaReply;
    const assistantReply: RoleplayMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toISOString(),
    };
    await this.repository.addMessage(organizationId, sessionId, assistantReply);

    const turn = session.messages.filter((m) => m.role === 'user').length + 1;
    return { response: replyText, turnCount: turn };
  }

  async evaluateSession(organizationId: string, sessionId: string): Promise<RoleplayFeedback> {
    const session = await this.repository.getSession(organizationId, sessionId);
    if (!session) throw new Error('Sessão não encontrada');

    const persona = await this.repository.getPersonaById(session.personaId);
    if (!persona) throw new Error('Persona não encontrada');

    const personaDifficulty =
      persona.difficulty === 'AVANCADO'
        ? ('Difícil' as const)
        : persona.difficulty === 'INTERMEDIARIO'
          ? ('Médio' as const)
          : ('Fácil' as const);

    const personaInput = {
      name: persona.name,
      role: persona.title,
      companyProfile: persona.companyType,
      difficulty: personaDifficulty,
      mainObjection: persona.coreObjections[0] || 'Orçamento restrito',
      personality: persona.personalityTraits.join(', '),
    };

    const history = session.messages.map((m) => ({
      sender: (m.role === 'user' ? 'user' : 'persona') as 'user' | 'persona',
      text: m.content,
    }));

    // Busca matrizes ativas da organização para enriquecer o parecer de avaliação pedagógica
    let qualificationCriteria: string[] = [];
    let objections: string[] = [];
    try {
      const [qualRes, objRes] = await Promise.all([
        this.qualificationRepo.findAllWithFilters(organizationId, undefined, 1, 50),
        this.objectionRepo.findAllWithFilters(organizationId, undefined, 1, 50),
      ]);
      qualificationCriteria = qualRes.data.map((q) => `${q.questionCategory}: ${q.questionText}`);
      objections = objRes.data.map((o) => `${o.objectionTitle} (${o.objectionText})`);
    } catch {
      // Degradação graciosa
    }

    // Avaliação real da IA (DT-007: sem fórmulas matemáticas arbitrárias falsificando avaliação de IA)
    const aiEvaluation = await this.aiService.evaluateSession(personaInput, history, {
      qualificationCriteria,
      objections,
    });

    const feedback: RoleplayFeedback = {
      overallScore: aiEvaluation.overallScore,
      spinSellingScores: {
        situation: aiEvaluation.clarityScore,
        problem: aiEvaluation.objectionHandlingScore,
        implication: Math.round(
          (aiEvaluation.clarityScore + aiEvaluation.objectionHandlingScore) / 2,
        ),
        needPayoff: aiEvaluation.closingAttemptScore,
      },
      objectionHandlingScore: aiEvaluation.objectionHandlingScore,
      strengths: aiEvaluation.strengths,
      improvementAreas: aiEvaluation.weaknesses,
      summary: aiEvaluation.actionableFeedback,
    };

    await this.repository.completeSession(organizationId, sessionId, feedback);
    return feedback;
  }

  async getUserHistory(organizationId: string, userId: string): Promise<RoleplaySession[]> {
    return this.repository.listSessionsByUser(organizationId, userId);
  }
}
