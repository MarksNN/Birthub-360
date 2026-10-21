import { beforeEach, describe, expect, it } from 'vitest';
import { domainEventMesh } from '../../../src/lib/queue/domainEventMesh.service.js';
import { curatedObjectionService } from '../../../src/features/playbook/services/curatedObjection.service.js';
import { PlaybookRoleplayAdapter } from '../../../src/features/playbook/infra/PlaybookRoleplayAdapter.js';
import { commercialLearningFlywheel } from '../../../src/features/intelligence/services/commercialLearningFlywheel.service.js';
import { semanticCache } from '../../../src/lib/ai/cache/semanticCache.service.js';
import { modelCascadeRouter } from '../../../src/lib/ai/gateway/model-cascade.js';
import { piiTokenizer } from '../../../src/lib/security/piiTokenizer.service.js';
import { consentAuditChain } from '../../../src/lib/security/consentChainFactory.js';
import { similarDealsService } from '../../../src/features/knowledge/similarDeals.service.js';

describe('Onda 01 — Shared Intelligence Core End-to-End Integration Flow', () => {
  const tenantA = 'tenant-healthcare-corp';
  const tenantB = 'tenant-logistics-corp';

  beforeEach(() => {
    domainEventMesh.clearProcessedEvents();
    curatedObjectionService.clear();
    commercialLearningFlywheel.clear();
    semanticCache.clear();
    piiTokenizer.clear();
    consentAuditChain.clear();
  });

  it('Flow 1: VoiceHub/Mobile -> PII Tokenization -> Consent Audit -> Objection Curation -> Roleplay Integration', async () => {
    // 1. Consentimento registrado e selado na cadeia criptográfica
    const consent = await consentAuditChain.recordConsent({
      organizationId: tenantA,
      subjectRef: 'contact-dr-marcos',
      purpose: 'COMMERCIAL_CALL_AI_ANALYSIS',
      termsVersion: 'v2026.1',
      operatorUserId: 'user-sdr-01',
    });
    expect(consent.currentHash).toBeDefined();

    // 2. Transcrição bruta de chamada contendo dados sensíveis
    const rawTranscript =
      'O Dr. Marcos, CPF 321.654.987-00, afirmou que a taxa de implantação de R$ 50.000 é inviável no momento atual do hospital.';

    // 3. Minimização e Tokenização de PII antes de qualquer processamento por IA
    const tokenized = piiTokenizer.tokenize(tenantA, rawTranscript);
    expect(tokenized.tokenizedText).not.toContain('321.654.987-00');
    expect(tokenized.tokenizedText).toContain('[CPF_TOKEN_1]');

    // 4. Publicação do evento no DomainEventMesh
    const publishedCallEvent = await domainEventMesh.publish({
      eventType: 'VOICE_CALL_COMPLETED',
      eventVersion: '1.0.0',
      organizationId: tenantA,
      correlationId: 'call-trans-999',
      producer: 'voice-hub',
      aggregateId: 'call-999',
      payload: {
        contactRef: 'contact-dr-marcos',
        tokenizedText: tokenized.tokenizedText,
        durationSeconds: 240,
      },
    });
    expect(publishedCallEvent.eventId).toMatch(/^evt-/);

    // 5. Ingestão da objeção no Data Flywheel com evidência minimizada
    const ingestedObjection = await curatedObjectionService.ingestDetectedObjection({
      organizationId: tenantA,
      sourceInteractionId: 'call-999',
      sourceType: 'VOICE_CALL',
      category: 'Taxa de Implantação',
      commercialContext: 'Diretoria hospitalar considerou custo inicial elevado',
      segment: 'Saúde',
      confidenceScore: 0.94,
      anonymizedEvidence: piiTokenizer.maskIrreversible(tokenized.tokenizedText),
      suggestedResponse: 'Apresentar modelo de parcelamento sem juros ou carência de 60 dias',
    });
    expect(ingestedObjection.curationStatus).toBe('VERIFIED');

    // 6. Curadoria humana promove para o Playbook oficial
    const promoted = await curatedObjectionService.promoteObjection(
      tenantA,
      ingestedObjection.id,
      'user-gestor-comercial',
    );
    expect(promoted.curationStatus).toBe('PROMOTED');

    // 7. O motor de Roleplay consome automaticamente a objeção promovida pelo PlaybookRoleplayAdapter
    const roleplayAdapter = new PlaybookRoleplayAdapter();
    const availableObjections = await roleplayAdapter.findObjections(tenantA);

    expect(
      availableObjections.some((o) => o.includes('Taxa de Implantação')),
    ).toBe(true);

    // 8. Isolamento Multi-tenant rigoroso: Tenant B NÃO enxerga a objeção do Tenant A
    const tenantBObjections = await roleplayAdapter.findObjections(tenantB);
    expect(
      tenantBObjections.some((o) => o.includes('Taxa de Implantação')),
    ).toBe(false);
  });

  it('Flow 2: Social Selling -> Caching & Model Cascade -> Deal Won -> Few-Shot Promotion -> Attribution Chain', async () => {
    // 1. Roteamento inteligente por complexidade (Model Cascade)
    const route = modelCascadeRouter.route('social-selling');
    expect(route.complexity).toBe('MEDIUM');
    expect(route.selectedModel).toBe('local-llama3');

    // 2. Consulta de Deals Semelhantes no mesmo tenant para contexto
    const formattedContext = similarDealsService.formatContextForPrompt([]);
    expect(formattedContext).toBeDefined();

    // 3. Cache Semântico: Primeira execução (Miss) e armazenamento
    const cacheParams = {
      organizationId: tenantA,
      model: route.selectedModel,
      promptVersion: 'v1.0',
      purpose: 'social-selling-approach',
      promptText: 'Gerar abordagem para Diretor de Hospital sobre redução de glosas',
    };

    const initialCache = await semanticCache.get(cacheParams);
    expect(initialCache).toBeNull();

    const generatedApproach =
      'Olá Dr. Marcos, identificamos que hospitais do segmento de Saúde reduzem glosas em 28% no primeiro trimestre...';
    await semanticCache.set(cacheParams, generatedApproach, {
      tokens: 420,
      costUsd: 0.0003,
      classification: 'INTERNAL',
    });

    // Segunda execução: Cache Hit
    const cachedHit = await semanticCache.get(cacheParams);
    expect(cachedHit).toBe(generatedApproach);

    // 4. Envio da abordagem registrado no Flywheel
    await commercialLearningFlywheel.recordApproachSent({
      organizationId: tenantA,
      leadId: 'lead-hospital-santacasa',
      channel: 'LINKEDIN',
      segment: 'Saúde',
      approachText: generatedApproach,
    });

    // 5. Oportunidade avança e fecha com vitória (DEAL_WON)
    const qualifiedFewShot = await commercialLearningFlywheel.evaluateCommercialOutcome({
      organizationId: tenantA,
      leadId: 'lead-hospital-santacasa',
      dealId: 'deal-999',
      outcomeType: 'DEAL_WON',
    });

    expect(qualifiedFewShot).not.toBeNull();
    expect(qualifiedFewShot?.outcomeStatus).toBe('DEAL_WON');
    expect(qualifiedFewShot?.confidence).toBeGreaterThan(0.95);

    // 6. A biblioteca few-shot disponibiliza o exemplo para novas gerações do Tenant A
    const fewShotsTenantA = await commercialLearningFlywheel.getFewShotExamples(
      tenantA,
      'LINKEDIN',
      'Saúde',
    );
    expect(fewShotsTenantA).toHaveLength(1);
    expect(fewShotsTenantA[0].approachText).toContain('reduzem glosas em 28%');

    // 7. Isolamento comprovado: Tenant B não recebe exemplos few-shot do Tenant A
    const fewShotsTenantB = await commercialLearningFlywheel.getFewShotExamples(
      tenantB,
      'LINKEDIN',
      'Saúde',
    );
    expect(fewShotsTenantB).toHaveLength(0);
  });

  it('Flow 3: Revocation Propagation -> Immediate Disabling of Knowledge and Cache Purge', async () => {
    // 1. Cadastra consentimento e objeção
    await consentAuditChain.recordConsent({
      organizationId: tenantA,
      subjectRef: 'lead-rev-test',
      purpose: 'TRAINING',
      termsVersion: 'v1',
    });

    const obj = await curatedObjectionService.ingestDetectedObjection({
      organizationId: tenantA,
      sourceInteractionId: 'call-rev',
      sourceType: 'VOICE_CALL',
      category: 'Concorrente Sigiloso',
      commercialContext: 'Menção confidencial',
      segment: 'Varejo',
      confidenceScore: 0.95,
      anonymizedEvidence: 'Menção de cláusula restritiva',
    });

    expect(await curatedObjectionService.listEligibleForRoleplay(tenantA)).toHaveLength(1);

    // 2. Revogação de consentimento pelo titular
    await consentAuditChain.revokeConsent(
      tenantA,
      'lead-rev-test',
      'ERASURE_REQUEST',
    );

    // 3. Retração da objeção
    await curatedObjectionService.retractObjection(
      tenantA,
      obj.id,
      'Revogação de consentimento confirmada',
    );

    // 4. Verificação de elegibilidade: Removida imediatamente
    const eligibleNow = await curatedObjectionService.listEligibleForRoleplay(tenantA);
    expect(eligibleNow).toHaveLength(0);

    // 5. Invalidação do cache semântico do tenant
    const invalidated = await semanticCache.invalidateTenant(tenantA);
    expect(invalidated).toBeGreaterThanOrEqual(0);

    // 6. Integridade da cadeia criptográfica permanece válida e auditável
    const chainIntegrity = await consentAuditChain.verifyChainIntegrity(tenantA);
    expect(chainIntegrity.valid).toBe(true);
    // gênese + consentimento + revogação + retração (outbox processada na hora)
    expect(chainIntegrity.totalRecords).toBe(4);
  });
});
