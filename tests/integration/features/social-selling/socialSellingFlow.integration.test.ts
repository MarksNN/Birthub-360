import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { socialSellingRoutes } from '@/features/social-selling/server/socialSelling.routes.js';
import { socialSellingApproachService } from '@/features/social-selling/server/socialSellingApproach.service.js';
import { errorHandler } from '@/shared/middlewares/errorHandler.js';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiUsageLog: {
      create: vi.fn(),
    },
  },
}));

function buildApp(user = { id: 'user-sales-1', organizationId: 'org-tenant-200', role: 'SDR' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: typeof user }).user = user;
    next();
  });
  app.use('/api/social-selling', socialSellingRoutes);
  app.use(errorHandler);
  return app;
}

describe('Social Selling Flow — Geração de Abordagens Consultivas e FinOps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/social-selling/approach/generate produz abordagem formatada para LinkedIn', async () => {
    vi.spyOn(socialSellingApproachService, 'generateApproach').mockResolvedValue({
      headline: 'Estratégia comercial e previsibilidade para Logística Alfa',
      hook: 'Olá Carlos! Acompanhando o cenário de Frotas, percebo o desafio de manter a taxa de conversão.',
      body: 'Gargalos no repasse entre pré-vendas e fechamento reduzem a margem operacional das transportadoras.',
      callToAction: 'Como vocês têm estruturado a governança dos leads hoje?',
      fullMessage: 'Mensagem completa formatada para InMail',
      channel: 'linkedin',
      tone: 'consultivo',
      modelUsed: 'local-llama3-fast',
      estimatedTokens: 280,
    });

    const app = buildApp({ id: 'user-sales-1', organizationId: 'org-tenant-200', role: 'SDR' });
    const res = await request(app)
      .post('/api/social-selling/approach/generate')
      .send({
        targetCompany: 'Logística Alfa',
        targetRole: 'Diretor de Operações',
        segment: 'Frotas',
        triggerEvent: 'Expansão de frota',
        channel: 'linkedin',
        tone: 'consultivo',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.headline).toContain('Logística Alfa');
    expect(res.body.data.channel).toBe('linkedin');
    expect(res.body.data.estimatedTokens).toBe(280);
    expect(socialSellingApproachService.generateApproach).toHaveBeenCalledWith(
      'org-tenant-200',
      'user-sales-1',
      expect.objectContaining({
        targetCompany: 'Logística Alfa',
        channel: 'linkedin',
      }),
    );
  });

  it('POST /api/social-selling/approach/generate suporta canais WhatsApp e E-mail', async () => {
    vi.spyOn(socialSellingApproachService, 'generateApproach').mockResolvedValue({
      headline: 'Abordagem WhatsApp',
      hook: 'Olá!',
      body: 'Corpo',
      callToAction: 'Vamos conversar?',
      fullMessage: 'Texto zap',
      channel: 'whatsapp',
      tone: 'executivo',
      modelUsed: 'local-llama3-fast',
      estimatedTokens: 150,
    });

    const app = buildApp();
    const res = await request(app)
      .post('/api/social-selling/approach/generate')
      .send({
        channel: 'whatsapp',
        tone: 'executivo',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.channel).toBe('whatsapp');
    expect(res.body.data.tone).toBe('executivo');
  });

  it('propaga erro adequadamente quando o AI Gateway falha', async () => {
    vi.spyOn(socialSellingApproachService, 'generateApproach').mockRejectedValue(
      new Error('AI Gateway quota exceeded'),
    );

    const app = buildApp();
    const res = await request(app)
      .post('/api/social-selling/approach/generate')
      .send({});

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
