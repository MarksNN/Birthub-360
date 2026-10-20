import { describe, expect, it } from 'vitest';
import {
  CommercialLearningFlywheelService,
  type FlywheelPurgeTx,
} from '../../../src/features/intelligence/services/commercialLearningFlywheel.service.js';
import { ConsentAuditChainService } from '../../../src/lib/security/consentAuditChain.service.js';

describe('REMED-06 / Ajuste 1 — retração do Flywheel com expurgo real', () => {
  const seed = async (svc: CommercialLearningFlywheelService, org: string, lead: string) => {
    await svc.recordApproachSent({ organizationId: org, leadId: lead, channel: 'EMAIL', segment: 'agro', approachText: 'texto' });
    await svc.evaluateCommercialOutcome({ organizationId: org, leadId: lead, outcomeType: 'DEAL_WON' });
  };

  it('remove abordagens e few-shot do titular sem tocar outros titulares/tenants', async () => {
    const svc = new CommercialLearningFlywheelService();
    await seed(svc, 'o1', 'L1');
    await seed(svc, 'o1', 'L2');
    await seed(svc, 'o2', 'L1');
    const r = await svc.purgeSubject('o1', 'L1');
    expect(r.approachesPurged).toBe(1);
    expect(r.fewShotPurged).toBe(1);
    const left = await svc.getFewShotExamples('o1', 'EMAIL');
    expect(left.map((f) => f.attributionEvidence.leadId)).toEqual(['L2']);
    expect(await svc.getFewShotExamples('o2', 'EMAIL')).toHaveLength(1);
    expect(await svc.evaluateCommercialOutcome({ organizationId: 'o1', leadId: 'L1', outcomeType: 'DEAL_WON' })).toBeNull();
  });

  it('executa deleteMany físico no banco, escopado por tenant+titular, em transação', async () => {
    const calls: string[] = [];
    const tx: FlywheelPurgeTx = {
      flywheelFewShotExample: { deleteMany: async ({ where }) => (calls.push(`fs:${where.organizationId}:${where.leadId}`), { count: 2 }) },
      flywheelApproachRecord: { deleteMany: async ({ where }) => (calls.push(`ap:${where.organizationId}:${where.leadId}`), { count: 3 }) },
    };
    const svc = new CommercialLearningFlywheelService({ $transaction: (fn) => fn(tx) });
    const r = await svc.purgeSubject('o1', 'L1');
    expect(calls).toEqual(['fs:o1:L1', 'ap:o1:L1']);
    expect(r.persistedFewShotPurged).toBe(2);
    expect(r.persistedApproachesPurged).toBe(3);
  });

  it('recusa expurgo sem tenant ou titular', async () => {
    const svc = new CommercialLearningFlywheelService();
    await expect(svc.purgeSubject('', 'L1')).rejects.toThrow(/Tenancy/);
    await expect(svc.purgeSubject('o1', '')).rejects.toThrow(/Tenancy/);
  });

  it('revogação na cadeia de consentimento dispara o expurgo', async () => {
    const svc = new CommercialLearningFlywheelService();
    const chain = new ConsentAuditChainService();
    chain.onRevocation((o, s) => svc.purgeSubject(o, s));
    await seed(svc, 'o1', 'L1');
    await chain.revokeConsent('o1', 'L1', 'titular revogou');
    expect(await svc.getFewShotExamples('o1', 'EMAIL')).toHaveLength(0);
  });
});
