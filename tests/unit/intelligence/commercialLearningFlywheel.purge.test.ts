import { describe, expect, it } from 'vitest';
import {
  CommercialLearningFlywheelService,
  commercialLearningFlywheel,
  type FlywheelPurgeTx,
} from '../../../src/features/intelligence/services/commercialLearningFlywheel.service.js';
import { winLossAutopsyService } from '../../../src/features/intelligence/services/winLossAutopsy.service.js';
import {
  ConsentAuditChainService,
  InMemoryConsentAuditChainRepository,
} from '../../../src/lib/security/consentAuditChain.service.js';
import { EnvTenantPepperProvider, InMemorySubjectKeyStore, SubjectTokenizer } from '../../../src/lib/security/subjectTokenizer.js';
import {
  CONSENT_PURGE_CHANNEL,
  makeBroadcaster,
  purgeLocalSubjectState,
  registerConsentPurgers,
  subscribeToPurgeBroadcasts,
} from '../../../src/bootstrap/consentPurgeWiring.js';

const newChain = () =>
  new ConsentAuditChainService({
    repo: new InMemoryConsentAuditChainRepository(),
    tokenizer: new SubjectTokenizer(new EnvTenantPepperProvider('p'.repeat(48)), new InMemorySubjectKeyStore()),
  });

describe('REMED-06 / Ajuste 1 — retração do Flywheel com expurgo real', () => {
  const seed = async (svc: CommercialLearningFlywheelService, org: string, lead: string, text = 'texto') => {
    await svc.recordApproachSent({ organizationId: org, leadId: lead, channel: 'EMAIL', segment: 'agro', approachText: text });
    await svc.evaluateCommercialOutcome({ organizationId: org, leadId: lead, outcomeType: 'DEAL_WON' });
  };

  it('remove abordagens e few-shot do titular sem tocar outros titulares/tenants', async () => {
    const svc = new CommercialLearningFlywheelService();
    await seed(svc, 'o1', 'L1');
    await seed(svc, 'o1', 'L2');
    await seed(svc, 'o2', 'L1');
    const r = await svc.purgeSubject('o1', 'L1');
    expect(r).toMatchObject({ approachesPurged: 1, fewShotPurged: 1 });
    expect((await svc.getFewShotExamples('o1', 'EMAIL')).map((f) => f.attributionEvidence.leadId)).toEqual(['L2']);
    expect(await svc.getFewShotExamples('o2', 'EMAIL')).toHaveLength(1);
  });

  it('deleteMany físico no banco, escopado por tenant+titular, em transação', async () => {
    const calls: string[] = [];
    const tx: FlywheelPurgeTx = {
      flywheelFewShotExample: {
        deleteMany: async ({ where }) => (calls.push(`fs:${where.organizationId}:${where.leadId}`), { count: 2 }),
      },
      flywheelApproachRecord: {
        deleteMany: async ({ where }) => (calls.push(`ap:${where.organizationId}:${where.leadId}`), { count: 3 }),
      },
    };
    const svc = new CommercialLearningFlywheelService({ $transaction: (fn) => fn(tx) });
    const r = await svc.purgeSubject('o1', 'L1');
    expect(calls).toEqual(['fs:o1:L1', 'ap:o1:L1']);
    expect(r).toMatchObject({ persistedFewShotPurged: 2, persistedApproachesPurged: 3 });
  });

  it('recusa expurgo sem tenant ou titular', async () => {
    const svc = new CommercialLearningFlywheelService();
    await expect(svc.purgeSubject('', 'L1')).rejects.toThrow(/Tenancy/);
    await expect(svc.purgeSubject('o1', '')).rejects.toThrow(/Tenancy/);
  });

  it('Agente 15 (4): revogação expurga Flywheel/autópsia e a cadeia guarda só RETRACTION sem PII', async () => {
    const SECRET_TEXT = 'Olá Maria Souza, CPF 000.000.000-00';
    const LEAD = 'lead-maria-souza';
    commercialLearningFlywheel.clear();
    await seed(commercialLearningFlywheel, 'o1', LEAD, SECRET_TEXT);
    const chain = newChain();
    registerConsentPurgers(chain);

    await chain.revokeConsent('o1', LEAD, 'ERASURE_REQUEST');

    expect(await commercialLearningFlywheel.getFewShotExamples('o1', 'EMAIL')).toHaveLength(0);
    const events = await chain.getChain('o1');
    expect(events.filter((e) => e.kind === 'RETRACTION')).toHaveLength(1);
    const json = JSON.stringify(events);
    expect(json).not.toContain(LEAD);
    expect(json).not.toContain('Maria');
    expect((await chain.verifyChainIntegrity('o1')).valid).toBe(true);
  });

  it('expurgo local cobre autópsia (por dealId) e invalida cache semântico', async () => {
    const r = await purgeLocalSubjectState('o-x', 'deal-1');
    expect(r).toMatchObject({ approaches: 0, fewShot: 0, autopsyReports: 0 });
    expect(typeof winLossAutopsyService.purgeSubject).toBe('function');
  });

  it('invalidação entre instâncias via pub/sub: publica e a outra instância expurga localmente', async () => {
    const handlers: Array<(c: string, m: string) => void> = [];
    const bus = {
      published: [] as string[],
      publish: async (c: string, m: string) => {
        bus.published.push(m);
        for (const h of handlers) h(c, m);
      },
      subscribe: async () => 1,
      on: (_e: 'message', cb: (c: string, m: string) => void) => handlers.push(cb),
    };
    commercialLearningFlywheel.clear();
    await seed(commercialLearningFlywheel, 'o9', 'L9');
    await subscribeToPurgeBroadcasts(bus, 'instancia-B');
    await makeBroadcaster(bus, 'instancia-A')('o9', 'L9');
    await new Promise((r) => setTimeout(r, 10));
    expect(JSON.parse(bus.published[0])).toMatchObject({ organizationId: 'o9', subjectRef: 'L9' });
    expect(await commercialLearningFlywheel.getFewShotExamples('o9', 'EMAIL')).toHaveLength(0);
    expect(CONSENT_PURGE_CHANNEL).toBe('lgpd:consent-purge:v1');
  });
});

describe('Flywheel — RLS do PR #35', () => {
  it('seta app.current_tenant_id na transação antes do deleteMany', async () => {
    const calls: string[] = [];
    const tx: FlywheelPurgeTx = {
      $executeRaw: async (q, ...v) => (calls.push(`${q.join('?')}|${v.join(',')}`), 1),
      flywheelFewShotExample: { deleteMany: async () => (calls.push('fs'), { count: 0 }) },
      flywheelApproachRecord: { deleteMany: async () => (calls.push('ap'), { count: 0 }) },
    };
    await new CommercialLearningFlywheelService({ $transaction: (fn) => fn(tx) }).purgeSubject('o1', 'L1');
    expect(calls[0]).toContain("set_config('app.current_tenant_id'");
    expect(calls[0]).toContain('|o1');
    expect(calls.slice(1)).toEqual(['fs', 'ap']);
  });
});
