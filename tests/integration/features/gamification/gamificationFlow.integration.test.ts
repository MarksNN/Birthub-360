import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { gamificationRoutes } from '@/features/gamification/routes/gamification.routes';
import { errorHandler } from '@/shared/middlewares/errorHandler';
import { prismaGamificationRepository } from '@/features/gamification/infra/PrismaGamificationRepository';
import { sellerPerformanceAggregator } from '@/features/gamification/services/sellerPerformanceAggregator.service';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      groupBy: vi.fn(),
    },
    lead: {
      groupBy: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

function buildApp(user = { id: 'user-1', organizationId: 'org-1', name: 'Maria Silva', role: 'SDR' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: typeof user }).user = user;
    next();
  });
  app.use('/api/gamification', gamificationRoutes);
  app.use(errorHandler);
  return app;
}

describe('Gamification Flow — Integração Multi-Tenant e Endpoints', () => {
  it('GET /api/gamification/leaderboard retorna ranking enriquecido do tenant', async () => {
    vi.spyOn(prismaGamificationRepository, 'getLeaderboard').mockResolvedValue([
      {
        sellerName: 'Maria Silva',
        totalPoints: 2500,
        level: 3,
        levelTitle: 'Closer Sênior',
        callsCount: 40,
        meetingsCount: 15,
        qualifiedCount: 20,
        dealsClosed: 5,
        wonRevenue: 100000,
        badges: [],
        streakDays: 8,
      },
    ]);

    vi.spyOn(sellerPerformanceAggregator, 'compute').mockResolvedValue({
      callsMade: 40,
      meetingsScheduled: 15,
      dealsClosed: 5,
      avgTicket: 20000,
      conversionRatePercent: 25,
      topLossReason: 'Preço',
    });

    const app = buildApp({ id: 'user-1', organizationId: 'org-tenant-100', name: 'Maria Silva', role: 'SDR' });
    const res = await request(app).get('/api/gamification/leaderboard?period=month');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.period).toBe('month');
    expect(res.body.data.rankings).toHaveLength(1);
    expect(res.body.data.rankings[0].sellerName).toBe('Maria Silva');
    expect(res.body.data.rankings[0].performance).toBeDefined();
    expect(res.body.data.rankings[0].performance.conversionRatePercent).toBe(25);
  });

  it('GET /api/gamification/profile retorna perfil do vendedor autenticado', async () => {
    vi.spyOn(prismaGamificationRepository, 'getSellerScore').mockResolvedValue({
      sellerName: 'Maria Silva',
      totalPoints: 2500,
      level: 3,
      levelTitle: 'Closer Sênior',
      callsCount: 40,
      meetingsCount: 15,
      qualifiedCount: 20,
      dealsClosed: 5,
      wonRevenue: 100000,
      badges: [],
      streakDays: 8,
    });

    vi.spyOn(sellerPerformanceAggregator, 'compute').mockResolvedValue({
      callsMade: 40,
      meetingsScheduled: 15,
      dealsClosed: 5,
      avgTicket: 20000,
      conversionRatePercent: 25,
      topLossReason: 'Timing',
    });

    const app = buildApp({ id: 'user-1', organizationId: 'org-tenant-100', name: 'Maria Silva', role: 'SDR' });
    const res = await request(app).get('/api/gamification/profile');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sellerName).toBe('Maria Silva');
    expect(res.body.data.level).toBe(3);
    expect(res.body.data.performance.topLossReason).toBe('Timing');
  });

  it('GET /api/gamification/profile retorna perfil padrão seguro para vendedor sem dados prévios', async () => {
    vi.spyOn(prismaGamificationRepository, 'getSellerScore').mockResolvedValue(null);

    const app = buildApp({ id: 'user-2', organizationId: 'org-tenant-100', name: 'Consultor Novato', role: 'SDR' });
    const res = await request(app).get('/api/gamification/profile');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sellerName).toBe('Consultor Novato');
    expect(res.body.data.level).toBe(1);
    expect(res.body.data.totalPoints).toBe(0);
  });
});
