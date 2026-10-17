import { api } from '../../../lib/api.js';
import type {
  RoleplayFeedback,
  RoleplayPersona,
  RoleplaySession,
} from '../domain/Roleplay.js';

export interface StartSessionResponse {
  session: RoleplaySession;
  persona: RoleplayPersona;
  initialGreeting: string;
}

export interface SendTurnResponse {
  response: string;
  turnCount: number;
}

export const roleplayApi = {
  /**
   * Lista as personas comerciais B2B pré-configuradas e vinculadas às matrizes ativas.
   */
  getPersonas: async (): Promise<RoleplayPersona[]> => {
    return api.get<RoleplayPersona[]>('/api/roleplay/personas');
  },

  /**
   * Inicia uma sessão de roleplay para a persona selecionada.
   */
  startSession: async (personaId: string): Promise<StartSessionResponse> => {
    return api.post<StartSessionResponse>('/api/roleplay/sessions', { personaId });
  },

  /**
   * Envia um turno do vendedor e obtém a réplica contextualizada da IA.
   */
  sendTurn: async (sessionId: string, message: string): Promise<SendTurnResponse> => {
    return api.post<SendTurnResponse>(`/api/roleplay/sessions/${sessionId}/messages`, {
      message,
    });
  },

  /**
   * Finaliza a sessão e solicita a avaliação pedagógica com notas SPIN e feedback acionável.
   */
  evaluateSession: async (sessionId: string): Promise<RoleplayFeedback> => {
    return api.post<RoleplayFeedback>(`/api/roleplay/sessions/${sessionId}/evaluate`, {});
  },

  /**
   * Retorna o histórico de sessões de treinamento realizadas pelo usuário logado no tenant ativo.
   */
  getUserHistory: async (): Promise<RoleplaySession[]> => {
    return api.get<RoleplaySession[]>('/api/roleplay/history');
  },
};
