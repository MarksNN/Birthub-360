import { describe, expect, it } from 'vitest';
import { shadowCopywritingService } from '../../../src/features/social-selling/server/shadowCopywriting.service.js';

describe('ShadowCopywritingService (Eixo 15)', () => {
  const tenantA = 'org-birthub-tenant-alpha';
  const tenantB = 'org-birthub-tenant-beta';

  it('deve registrar consentimento e preferências de estilo com opt-in explícito', async () => {
    const profile = await shadowCopywritingService.registerOptInAndPreferences({
      organizationId: tenantA,
      sellerId: 'seller-marina',
      sellerName: 'Marina Sales',
      preferences: {
        formalityLevel: 45,
        concisenessLevel: 80,
        emojiPolicy: 'minimal',
        preferredGreeting: 'Olá, {nome}!',
        preferredClosing: 'Um abraço e boa semana,',
        consultativeTone: 'direct',
      },
    });

    expect(profile.isOptedIn).toBe(true);
    expect(profile.sellerId).toBe('seller-marina');
    expect(profile.preferences.formalityLevel).toBe(45);
    expect(profile.preferences.concisenessLevel).toBe(80);
  });

  it('deve extrair parâmetros de estilo a partir de amostras voluntárias autorizadas', async () => {
    const updated = await shadowCopywritingService.extractStyleFromVoluntarySamples({
      organizationId: tenantA,
      sellerId: 'seller-marina',
      voluntarySamples: [
        'Olá, Roberto! Vi que expandiram a frota recentemente. Como têm lidado com o custo de telemetria?',
        'Oi, Camila! Acompanho seu trabalho na LogiTech. Temos gerado 25% de economia em operações semelhantes.',
      ],
    });

    expect(updated.sampleCount).toBe(2);
    expect(updated.version).toBe(2);
    expect(updated.preferences.concisenessLevel).toBeGreaterThanOrEqual(70);
  });

  it('deve gerar texto personalizado sem alterar fatos e com exigência estrita de aprovação humana', async () => {
    const copy = await shadowCopywritingService.generatePersonalizedCopy({
      organizationId: tenantA,
      sellerId: 'seller-marina',
      channel: 'linkedin',
      recipientName: 'Carlos Mendonça',
      targetCompany: 'Viação Ouro e Prata',
      targetRole: 'Diretor de Operações',
      valuePropositionContext: 'Redução de custos operacionais de frotas e telemetria inteligente',
      factualConstraints: ['Garantia de SLA 99.9%', 'Sem custo de setup inicial'],
    });

    expect(copy.copyId).toBeDefined();
    expect(copy.fullMessage).toContain('Carlos Mendonça');
    expect(copy.fullMessage).toContain('Viação Ouro e Prata');
    expect(copy.fullMessage).toContain('Garantia de SLA 99.9%');
    expect(copy.requiresHumanReview).toBe(true);
    expect(copy.isApprovedBySeller).toBe(false);

    // Vendedor revisa e aprova
    const approved = await shadowCopywritingService.approveAndFinalizeCopy({
      organizationId: tenantA,
      copyId: copy.copyId,
      sellerId: 'seller-marina',
    });

    expect(approved.isReadyForDispatch).toBe(true);
    expect(approved.finalizedText).toBe(copy.fullMessage);
  });

  it('deve revogar consentimento e expurgar perfil conforme direito do titular LGPD (Art. 18)', async () => {
    const revokeResult = await shadowCopywritingService.revokeConsentAndPurgeProfile({
      organizationId: tenantA,
      sellerId: 'seller-marina',
    });

    expect(revokeResult.revoked).toBe(true);

    // Tentativa subsequente de geração deve ser bloqueada
    await expect(
      shadowCopywritingService.generatePersonalizedCopy({
        organizationId: tenantA,
        sellerId: 'seller-marina',
        channel: 'linkedin',
        recipientName: 'Carlos',
        targetCompany: 'Viação Ouro e Prata',
        targetRole: 'Diretor',
        valuePropositionContext: 'Contexto',
        factualConstraints: [],
      }),
    ).rejects.toThrow(/não encontrado/);
  });

  it('deve impedir que uma organização acesse ou altere perfil de outra (Multi-Tenancy Guard)', async () => {
    await shadowCopywritingService.registerOptInAndPreferences({
      organizationId: tenantA,
      sellerId: 'seller-isabela',
      sellerName: 'Isabela',
      preferences: {},
    });

    await expect(
      shadowCopywritingService.extractStyleFromVoluntarySamples({
        organizationId: tenantB,
        sellerId: 'seller-isabela',
        voluntarySamples: ['Exemplo'],
      }),
    ).rejects.toThrow(/Tenancy violation/);
  });
});
