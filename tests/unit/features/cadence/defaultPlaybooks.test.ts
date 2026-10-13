import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  DEFAULT_PLAYBOOK_TEMPLATES,
  CADENCE_JOURNEY_TEMPLATES,
} from '../../../../src/features/cadence/domain/cadenceTemplates.js';

const mockPrisma = {
  cadenceSequence: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};
vi.mock('../../../../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../../src/shared/middlewares/requireRole.js', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

const { cadenceRoutes } = await import('../../../../src/features/cadence/cadence.routes.js');

function buildApp(user = { id: 'usr-sdr-1', organizationId: 'org-cadence-test', role: 'ADMIN' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = user;
    next();
  });
  app.use('/api/cadence', cadenceRoutes);
  return app;
}

describe('Playbooks de Cadência Padrão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve conter exatamente os 3 templates padrão solicitados', () => {
    expect(DEFAULT_PLAYBOOK_TEMPLATES).toHaveLength(3);

    const names = DEFAULT_PLAYBOOK_TEMPLATES.map((t) => t.name);
    expect(names).toContain('Outbound Frio Logística');
    expect(names).toContain('Reativação de Perdidos');
    expect(names).toContain('Passagem de Bastão SDR/Closer');
  });

  it('deve incluir os 3 templates em CADENCE_JOURNEY_TEMPLATES no topo', () => {
    expect(CADENCE_JOURNEY_TEMPLATES.slice(0, 3)).toEqual(DEFAULT_PLAYBOOK_TEMPLATES);
  });

  it('deve configurar canais multicanal (whatsapp, email, voice) no playbook Outbound Frio Logística', () => {
    const outbound = DEFAULT_PLAYBOOK_TEMPLATES.find(
      (t) => t.name === 'Outbound Frio Logística',
    );
    expect(outbound).toBeDefined();
    expect(outbound?.category).toBe('Outbound');
    const channels = outbound?.touches.map((t) => t.channel);
    expect(channels).toContain('whatsapp');
    expect(channels).toContain('email');
    expect(channels).toContain('voice');
  });

  it('deve configurar toques de resgate e reativação no playbook Reativação de Perdidos', () => {
    const reativacao = DEFAULT_PLAYBOOK_TEMPLATES.find(
      (t) => t.name === 'Reativação de Perdidos',
    );
    expect(reativacao).toBeDefined();
    expect(reativacao?.category).toBe('Reativação');
    expect(reativacao?.touches.length).toBeGreaterThanOrEqual(3);
  });

  it('deve configurar passagem de bastão com briefing e anti no-show em Passagem de Bastão SDR/Closer', () => {
    const passagem = DEFAULT_PLAYBOOK_TEMPLATES.find(
      (t) => t.name === 'Passagem de Bastão SDR/Closer',
    );
    expect(passagem).toBeDefined();
    expect(passagem?.category).toBe('Fechamento');
    const stepTitles = passagem?.touches.map((t) => t.stepTitle);
    expect(stepTitles?.some((title) => title.includes('Closer'))).toBe(true);
  });

  it('deve injetar os 3 playbooks no banco via POST /api/cadence/templates/seed-defaults', async () => {
    mockPrisma.cadenceSequence.findMany.mockResolvedValueOnce([]); // Nenhuma existente ainda
    mockPrisma.cadenceSequence.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: `seq-${data.name}`, ...data }),
    );

    const app = buildApp();
    const res = await request(app).post('/api/cadence/templates/seed-defaults').send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);
    expect(mockPrisma.cadenceSequence.create).toHaveBeenCalledTimes(3);
  });

  it('deve ser idempotente caso as sequências já existam na organização', async () => {
    mockPrisma.cadenceSequence.findMany.mockResolvedValueOnce([
      { name: 'Outbound Frio Logística' },
      { name: 'Reativação de Perdidos' },
      { name: 'Passagem de Bastão SDR/Closer' },
    ]);

    const app = buildApp();
    const res = await request(app).post('/api/cadence/templates/seed-defaults').send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(0);
    expect(mockPrisma.cadenceSequence.create).not.toHaveBeenCalled();
  });
});
