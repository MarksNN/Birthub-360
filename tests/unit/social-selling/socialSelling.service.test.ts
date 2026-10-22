import { beforeEach, describe, expect, it } from 'vitest';
import {
  InMemorySocialSellingRepository,
} from '../../../src/features/social-selling/infra/PrismaSocialSellingRepository.js';
import {
  SocialSellingService,
} from '../../../src/features/social-selling/services/socialSellingApproach.service.js';

describe('Social Selling Persistence & Draft Expiration (Passo 037)', () => {
  let repo: InMemorySocialSellingRepository;
  let service: SocialSellingService;

  const orgA = 'org-social-alpha';
  const orgB = 'org-social-beta';

  beforeEach(() => {
    repo = new InMemorySocialSellingRepository();
    service = new SocialSellingService(repo);
  });

  it('deve persistir um rascunho de abordagem vinculado à organização', async () => {
    const draft = await service.createDraft({
      organizationId: orgA,
      targetCompany: 'Empresa Alvo S/A',
      targetRole: 'VP Comercial',
      channel: 'linkedin',
      content: 'Olá! Notei seu crescimento recente...',
      ttlHours: 48,
    });

    expect(draft.id).toBeDefined();
    expect(draft.organizationId).toBe(orgA);
    expect(draft.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const retrieved = await service.getDraft(orgA, draft.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.targetCompany).toBe('Empresa Alvo S/A');
  });

  it('deve respeitar isolamento multi-tenant (orgB não pode ler rascunho de orgA)', async () => {
    const draft = await service.createDraft({
      organizationId: orgA,
      targetCompany: 'Confidencial Alpha',
      targetRole: 'Diretor',
      channel: 'email',
      content: 'Abordagem confidencial',
    });

    const accessFromB = await service.getDraft(orgB, draft.id);
    expect(accessFromB).toBeNull();
  });

  it('deve expurgar rascunhos expirados com base no TTL configurado', async () => {
    // Rascunho já expirado (TTL negativo)
    await service.createDraft({
      organizationId: orgA,
      targetCompany: 'Empresa Expirada',
      targetRole: 'Gerente',
      channel: 'whatsapp',
      content: 'Promoção válida até ontem',
      ttlHours: -1,
    });

    // Rascunho válido
    await service.createDraft({
      organizationId: orgA,
      targetCompany: 'Empresa Ativa',
      targetRole: 'Diretor',
      channel: 'whatsapp',
      content: 'Proposta ativa',
      ttlHours: 24,
    });

    const activeDrafts = await service.listActiveDrafts(orgA);
    expect(activeDrafts.length).toBe(1);
    expect(activeDrafts[0].targetCompany).toBe('Empresa Ativa');
  });
});
