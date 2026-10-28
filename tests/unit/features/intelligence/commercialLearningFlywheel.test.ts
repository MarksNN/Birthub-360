import { beforeEach, describe, expect, it } from 'vitest';
import {
  CommercialLearningFlywheelService,
  type FlywheelApproachRow,
  type FlywheelFewShotRow,
  type FlywheelPersistencePurger,
  type FlywheelPurgeTx,
} from '../../../../src/features/intelligence/services/commercialLearningFlywheel.service.js';

describe('CommercialLearningFlywheelService Unit Tests', () => {
  let flywheel: CommercialLearningFlywheelService;

  beforeEach(() => {
    flywheel = new CommercialLearningFlywheelService();
    flywheel.clear();
  });

  it('should record sent approach with tracking details', async () => {
    const record = await flywheel.recordApproachSent({
      organizationId: 'org-1',
      leadId: 'lead-100',
      channel: 'LINKEDIN',
      segment: 'Saúde',
      approachText: 'Olá Dr., vimos a recente expansão da sua clínica...',
    });

    expect(record.id).toMatch(/^appr-/);
    expect(record.leadId).toBe('lead-100');
    expect(record.channel).toBe('LINKEDIN');
  });

  it('should qualify approach as few-shot when outcome is within attribution window', async () => {
    await flywheel.recordApproachSent({
      organizationId: 'org-1',
      leadId: 'lead-200',
      channel: 'WHATSAPP',
      segment: 'Logística',
      approachText: 'Reduza sinistros em 35% com monitoramento em tempo real',
    });

    // Reunião agendada 3 dias após a abordagem
    const outcome = await flywheel.evaluateCommercialOutcome({
      organizationId: 'org-1',
      leadId: 'lead-200',
      outcomeType: 'MEETING_SCHEDULED',
    });

    expect(outcome).not.toBeNull();
    expect(outcome?.outcomeStatus).toBe('MEETING_SCHEDULED');
    expect(outcome?.attributionEvidence.leadId).toBe('lead-200');
    expect(outcome?.attributionEvidence.conversionWindowDays).toBeLessThanOrEqual(1);

    const fewShots = await flywheel.getFewShotExamples('org-1', 'WHATSAPP', 'Logística');
    expect(fewShots).toHaveLength(1);
    expect(fewShots[0].approachText).toContain('Reduza sinistros');
  });

  it('should reject qualification when outcome is beyond the attribution window (>30 days)', async () => {
    await flywheel.recordApproachSent({
      organizationId: 'org-1',
      leadId: 'lead-300',
      channel: 'EMAIL',
      segment: 'Varejo',
      approachText: 'Otimização de checkout omnicanal',
    });

    // Simula evento 45 dias depois
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45);

    const outcome = await flywheel.evaluateCommercialOutcome({
      organizationId: 'org-1',
      leadId: 'lead-300',
      outcomeType: 'DEAL_WON',
      occurredAt: futureDate.toISOString(),
    });

    expect(outcome).toBeNull();
  });

  it('should prevent cross-tenant leakage of few-shot examples', async () => {
    await flywheel.recordApproachSent({
      organizationId: 'org-A',
      leadId: 'lead-A',
      channel: 'LINKEDIN',
      segment: 'Fintech',
      approachText: 'Abordagem confidencial da Empresa A',
    });

    await flywheel.evaluateCommercialOutcome({
      organizationId: 'org-A',
      leadId: 'lead-A',
      outcomeType: 'DEAL_WON',
    });

    const tenantBExamples = await flywheel.getFewShotExamples('org-B', 'LINKEDIN', 'Fintech');
    expect(tenantBExamples).toHaveLength(0);

    const tenantAExamples = await flywheel.getFewShotExamples('org-A', 'LINKEDIN', 'Fintech');
    expect(tenantAExamples).toHaveLength(1);
  });
});

/** Fake de persistência que emula a RLS tenant_isolation (app.current_tenant_id por transação). */
function makeFakeStore() {
  const approaches: FlywheelApproachRow[] = [];
  const fewShots: FlywheelFewShotRow[] = [];
  const txCount = { value: 0 };
  const persistence: FlywheelPersistencePurger = {
    async $transaction<T>(fn: (tx: FlywheelPurgeTx) => Promise<T>): Promise<T> {
      txCount.value++;
      let tenant: string | undefined;
      const tx: FlywheelPurgeTx = {
        async $executeRaw(_q, ...values) {
          tenant = values[0] as string;
          return 0;
        },
        flywheelApproachRecord: {
          async deleteMany() {
            return { count: 0 };
          },
          async create({ data }) {
            if (data.organizationId !== tenant) throw new Error('RLS: WITH CHECK violation');
            approaches.push(data);
            return data;
          },
          async findMany({ where, take }) {
            return approaches
              .filter((a) => a.organizationId === tenant && a.organizationId === where.organizationId)
              .filter((a) => a.leadId === where.leadId)
              .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
              .slice(0, take);
          },
        },
        flywheelFewShotExample: {
          async deleteMany() {
            return { count: 0 };
          },
          async create({ data }) {
            if (data.organizationId !== tenant) throw new Error('RLS: WITH CHECK violation');
            fewShots.push(data);
            return data;
          },
          async findMany({ where }) {
            return fewShots.filter(
              (f) =>
                f.organizationId === tenant &&
                f.organizationId === where.organizationId &&
                f.channel === where.channel &&
                f.isActive === where.isActive,
            );
          },
        },
      };
      return fn(tx);
    },
  };
  return { persistence, approaches, fewShots, txCount };
}

describe('CommercialLearningFlywheelService com persistência durável (RLS)', () => {
  it('grava abordagem e few-shot no banco, não em memória, e sobrevive a nova instância', async () => {
    const store = makeFakeStore();
    const a = new CommercialLearningFlywheelService(store.persistence);
    await a.recordApproachSent({
      organizationId: 'org-1',
      leadId: 'lead-1',
      agentSlug: 'ad-copy-machine',
      channel: 'EMAIL',
      segment: 'Saúde',
      approachText: 'Texto persistido',
    });
    expect(store.approaches).toHaveLength(1);
    expect(store.approaches[0].agentSlug).toBe('ad-copy-machine');
    expect(a.localSubjectRefs('org-1')).toEqual([]);

    const outcome = await a.evaluateCommercialOutcome({
      organizationId: 'org-1',
      leadId: 'lead-1',
      outcomeType: 'DEAL_WON',
    });
    expect(outcome?.outcomeStatus).toBe('DEAL_WON');
    expect(store.fewShots).toHaveLength(1);

    // "Restart": nova instância sobre o mesmo banco enxerga o aprendizado.
    const b = new CommercialLearningFlywheelService(store.persistence);
    const examples = await b.getFewShotExamples('org-1', 'EMAIL', 'Saúde');
    expect(examples).toHaveLength(1);
    expect(examples[0].approachText).toBe('Texto persistido');
  });

  it('isola tenants: outro tenant não lê nem atribui abordagem alheia', async () => {
    const store = makeFakeStore();
    const svc = new CommercialLearningFlywheelService(store.persistence);
    await svc.recordApproachSent({
      organizationId: 'org-A',
      leadId: 'lead-A',
      channel: 'LINKEDIN',
      segment: 'Fintech',
      approachText: 'Confidencial A',
    });
    await svc.evaluateCommercialOutcome({
      organizationId: 'org-A',
      leadId: 'lead-A',
      outcomeType: 'DEAL_WON',
    });
    expect(await svc.getFewShotExamples('org-B', 'LINKEDIN', 'Fintech')).toHaveLength(0);
    expect(
      await svc.evaluateCommercialOutcome({
        organizationId: 'org-B',
        leadId: 'lead-A',
        outcomeType: 'DEAL_WON',
      }),
    ).toBeNull();
    expect(await svc.getFewShotExamples('org-A', 'LINKEDIN', 'Fintech')).toHaveLength(1);
  });

  it('propaga falha de persistência (sem fallback silencioso)', async () => {
    const failing: FlywheelPersistencePurger = {
      async $transaction() {
        throw new Error('db down');
      },
    };
    const svc = new CommercialLearningFlywheelService(failing);
    await expect(
      svc.recordApproachSent({
        organizationId: 'org-1',
        leadId: 'lead-1',
        channel: 'EMAIL',
        segment: 'x',
        approachText: 'y',
      }),
    ).rejects.toThrow('db down');
    expect(svc.localSubjectRefs('org-1')).toEqual([]);
  });
});
