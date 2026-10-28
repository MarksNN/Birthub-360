import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';

// Hoist mock de ambiente
const mockEnv = vi.hoisted(() => ({
  AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS: 'org-authorized',
  AI_RATE_LIMIT_MAX: 15,
}));
vi.mock('../../../../config/env.js', () => ({ env: mockEnv }));

// Mocks dos serviços e dependências de IA
const logAiUsageMock = vi.fn();
vi.mock('../../../../lib/ai/gateway.js', () => ({
  logAiUsage: (...args: unknown[]) => logAiUsageMock(...args),
  getAiModel: vi.fn(),
}));

const searchChunksMock = vi.fn();
vi.mock('../../services/vector-search.service.js', () => ({
  VectorSearchService: {
    searchChunks: (...args: unknown[]) => searchChunksMock(...args),
  },
}));

const synthesizeSpeechMock = vi.fn();
vi.mock('../../services/voicebox.service.js', () => ({
  synthesizeSpeech: (...args: unknown[]) => synthesizeSpeechMock(...args),
}));

// Import do router sob teste
const { intelligenceRoutes } = await import('../intelligence.routes.js');
const { agentRoutes } = await import('../agent.routes.js');

function buildApp(userContext?: { id: string; organizationId: string; role: string }) {
  const app = express();
  app.use(express.json());

  // Simulação de autenticação
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (userContext) {
      (req as any).user = userContext;
    }
    next();
  });

  app.use('/api/intelligence', intelligenceRoutes);
  app.use('/api/agent', agentRoutes);
  app.use(errorHandler);
  return app;
}

describe('Testes de Segurança - Endpoints de IA (TD-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/intelligence/search (Busca Vetorial RAG)', () => {
    it('Cenário 1: Rejeita requisição anônima com 401', async () => {
      const app = buildApp(undefined); // Sem contexto de usuário

      const res = await request(app).get('/api/intelligence/search?q=contrato');

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({ success: false, error: 'Authentication required.' }),
      );
      expect(searchChunksMock).not.toHaveBeenCalled();
      expect(logAiUsageMock).not.toHaveBeenCalled();
    });

    it('Cenário 2: Rejeita usuário sem cargo autorizado (ex: VISUALIZADOR) com 403', async () => {
      const app = buildApp({ id: 'user-1', organizationId: 'org-1', role: 'VISUALIZADOR' });

      const res = await request(app).get('/api/intelligence/search?q=contrato');

      expect(res.status).toBe(403);
      expect(res.body).toEqual(expect.objectContaining({ success: false }));
      expect(searchChunksMock).not.toHaveBeenCalled();
      expect(logAiUsageMock).not.toHaveBeenCalled();
    });

    it('Cenário 3: Permite usuário com cargo SDR/CLOSER/GESTOR/ADMIN e isola por tenant', async () => {
      searchChunksMock.mockResolvedValueOnce([{ id: 'chunk-1', content: 'Info do Tenant A' }]);
      const app = buildApp({ id: 'user-sdr', organizationId: 'org-tenant-a', role: 'SDR' });

      const res = await request(app).get('/api/intelligence/search?q=contrato');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ results: [{ id: 'chunk-1', content: 'Info do Tenant A' }] });

      // Verificação de Tenant Isolation no serviço
      expect(searchChunksMock).toHaveBeenCalledWith('contrato', 'org-tenant-a', 5);

      // Verificação de Telemetria e Metering
      expect(logAiUsageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          promptId: 'search_vector_query',
          model: 'VectorSearch',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }),
      );
    });
  });

  describe('POST /api/intelligence/toolkit/execute (Execução de Ferramentas de IA)', () => {
    it('Cenário 1: Rejeita requisição anônima com 401', async () => {
      const app = buildApp(undefined);

      const res = await request(app)
        .post('/api/intelligence/toolkit/execute')
        .send({ functionName: 'summarizeLead', args: ['Lead data'] });

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({ success: false, error: 'Authentication required.' }),
      );
    });

    it('Cenário 2: Rejeita usuário sem cargo autorizado com 403', async () => {
      const app = buildApp({
        id: 'user-guest',
        organizationId: 'org-authorized',
        role: 'VISUALIZADOR',
      });

      const res = await request(app)
        .post('/api/intelligence/toolkit/execute')
        .send({ functionName: 'summarizeLead', args: ['Lead data'] });

      expect(res.status).toBe(403);
      expect(res.body).toEqual(expect.objectContaining({ success: false }));
    });
  });

  describe('POST /api/agent/tts (Síntese de Voz / Audio)', () => {
    it('Cenário 1: Rejeita requisição anônima com 401', async () => {
      const app = buildApp(undefined);

      const res = await request(app).post('/api/agent/tts').send({ text: 'Olá, bom dia' });

      expect(res.status).toBe(401);
      expect(synthesizeSpeechMock).not.toHaveBeenCalled();
      expect(logAiUsageMock).not.toHaveBeenCalled();
    });

    it('Cenário 2: Rejeita usuário sem permissão de escrita com 403', async () => {
      const app = buildApp({ id: 'user-ro', organizationId: 'org-1', role: 'VISUALIZADOR' });

      const res = await request(app).post('/api/agent/tts').send({ text: 'Olá, bom dia' });

      expect(res.status).toBe(403);
      expect(synthesizeSpeechMock).not.toHaveBeenCalled();
      expect(logAiUsageMock).not.toHaveBeenCalled();
    });

    it('Cenário 3: Permite usuário com papel permitido (CLOSER) e registra auditoria/metering', async () => {
      const fakeAudioBuffer = Buffer.from('RIFF....WAVEfmt');
      synthesizeSpeechMock.mockResolvedValueOnce(fakeAudioBuffer);

      const app = buildApp({ id: 'user-closer', organizationId: 'org-closer', role: 'CLOSER' });

      const res = await request(app)
        .post('/api/agent/tts')
        .send({ text: 'Mensagem de áudio de teste' });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('audio/wav');
      expect(synthesizeSpeechMock).toHaveBeenCalledWith('Mensagem de áudio de teste');

      // Auditoria e Metering
      expect(logAiUsageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          promptId: 'tts_generate',
          model: 'Voicebox',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }),
      );
    });
  });
});
