import { describe, expect, it } from 'vitest';
import { evaluateRestoreDrillAcceptance } from '../../../scripts/backup/run-backup-restore-drill.js';
import { computePeriodEnd } from '../../../src/lib/voice-hub/services/billingService.js';
import { isWorkerEntrypoint } from '../../../src/lib/queue/redis.js';
import { ACTIVE_NAV_TABS } from '../../../src/lib/navigationBus.js';
import { OrganizationModulesService } from '../../../src/features/organization-modules/services/organizationModules.service.js';
import type { OrganizationModulesRepository } from '../../../src/features/organization-modules/domain/organizationModules.repository.js';
import type { OrganizationModulesStoredState } from '../../../src/features/organization-modules/domain/organizationModules.types.js';

describe('Wave 2 Technical Debt Remediations (Unit Verification)', () => {
  describe('DEBT-OPS-004: Backup restore drill acceptance predicate', () => {
    const validMetrics = {
      expectedTableCount: 3,
      tableCounts: [
        { table: 'users', original: 10, restored: 10, match: true },
        { table: 'leads', original: 20, restored: 20, match: true },
        { table: 'contacts', original: 30, restored: 30, match: true },
      ],
      invalidIndexes: 0,
      orphanContacts: 0,
      orphanLeads: 0,
      corruptSqlDetected: true,
      missingFileDetected: true,
      rtoMeasuredSec: 420,
      rtoTargetSec: 900,
    };

    it('approves restore drill when schema is up to date and all constraints met', () => {
      const result = evaluateRestoreDrillAcceptance({
        ...validMetrics,
        migrateStatusExitOk: true,
        migrateStatusOutput: 'Database schema is up to date!',
      });
      expect(result.pass).toBe(true);
      expect(result.migrationsUpToDate).toBe(true);
      expect(result.allTablesMatch).toBe(true);
      expect(result.rtoWithinTarget).toBe(true);
    });

    it('rejects restore drill when schema is not up to date or migrate fails', () => {
      const result = evaluateRestoreDrillAcceptance({
        ...validMetrics,
        migrateStatusExitOk: false,
        migrateStatusOutput: '1 unapplied migration found',
      });
      expect(result.pass).toBe(false);
      expect(result.migrationsUpToDate).toBe(false);
    });

    it('rejects restore drill when RTO exceeds SLA (900s)', () => {
      const result = evaluateRestoreDrillAcceptance({
        ...validMetrics,
        rtoMeasuredSec: 905,
        migrateStatusExitOk: true,
        migrateStatusOutput: 'Database schema is up to date!',
      });
      expect(result.pass).toBe(false);
      expect(result.rtoWithinTarget).toBe(false);
    });

    it('rejects restore drill when table counts mismatch or query fails', () => {
      const result = evaluateRestoreDrillAcceptance({
        ...validMetrics,
        tableCounts: [
          { table: 'users', original: 10, restored: 10, match: true },
          { table: 'leads', original: 20, restored: 19, match: false },
          { table: 'contacts', original: 30, restored: 30, match: true },
        ],
        migrateStatusExitOk: true,
        migrateStatusOutput: 'Database schema is up to date!',
      });
      expect(result.pass).toBe(false);
      expect(result.allTablesMatch).toBe(false);
    });
  });

  describe('DEBT-BILL-003: computePeriodEnd calendar clamping', () => {
    it('clamps 31-Jan monthly renewal to the last day of February (28-Feb in non-leap year)', () => {
      const start = new Date(Date.UTC(2026, 0, 31, 12, 0, 0));
      const end = computePeriodEnd('monthly', start);
      expect(end?.toISOString()).toBe('2026-02-28T12:00:00.000Z');
    });

    it('clamps 31-Jan monthly renewal to 29-Feb in a leap year', () => {
      const start = new Date(Date.UTC(2024, 0, 31, 12, 0, 0));
      const end = computePeriodEnd('monthly', start);
      expect(end?.toISOString()).toBe('2024-02-29T12:00:00.000Z');
    });

    it('clamps 31-Mar monthly renewal to 30-Apr', () => {
      const start = new Date(Date.UTC(2026, 2, 31, 15, 0, 0));
      const end = computePeriodEnd('monthly', start);
      expect(end?.toISOString()).toBe('2026-04-30T15:00:00.000Z');
    });

    it('clamps 29-Feb annual renewal in leap year to 28-Feb in non-leap year', () => {
      const start = new Date(Date.UTC(2024, 1, 29, 10, 0, 0));
      const end = computePeriodEnd('yearly', start);
      expect(end?.toISOString()).toBe('2025-02-28T10:00:00.000Z');
    });
  });

  describe('DEBT-QUEUE-001: Worker process entrypoint detection', () => {
    it('accurately identifies Unix and Windows worker entrypoints', () => {
      expect(isWorkerEntrypoint('/app/dist/worker.cjs')).toBe(true);
      expect(isWorkerEntrypoint('C:\\app\\dist\\worker.cjs')).toBe(true);
      expect(isWorkerEntrypoint('/usr/src/app/src/worker.ts')).toBe(true);
      expect(isWorkerEntrypoint('C:\\Github\\Birthub-360\\src\\worker.ts')).toBe(true);
      expect(isWorkerEntrypoint('/app/dist/worker-whatsapp.js')).toBe(true);
      expect(isWorkerEntrypoint('C:\\app\\worker-cadence.mjs')).toBe(true);
    });

    it('does not classify web server entrypoints as workers', () => {
      expect(isWorkerEntrypoint('/app/dist/server.js')).toBe(false);
      expect(isWorkerEntrypoint('C:\\app\\src\\server.ts')).toBe(false);
      expect(isWorkerEntrypoint('/app/dist/bootstrap/index.js')).toBe(false);
    });
  });

  describe('DEBT-UX-005: Android deep links parity with active web routes', () => {
    it('contains diagnostic, signals-risks, forecast, metas, and omits legacy sdr-diagnostic-joao', () => {
      expect(ACTIVE_NAV_TABS).toContain('sdr-diagnostic');
      expect(ACTIVE_NAV_TABS).toContain('signals-risks');
      expect(ACTIVE_NAV_TABS).toContain('forecast');
      expect(ACTIVE_NAV_TABS).toContain('metas');
      expect(ACTIVE_NAV_TABS).not.toContain('sdr-diagnostic-joao');
    });
  });

  describe('DEBT-ONB-001: Concurrent organization module mutations serialization', () => {
    it('serializes concurrent enable(A) and enable(B) without overwriting selection', async () => {
      let state: OrganizationModulesStoredState = {
        enabledModules: ['crm'],
        onboardingCompletedAt: null,
        updatedByUserId: null,
      };

      const repo: OrganizationModulesRepository = {
        async load(_orgId: string) {
          return { ...state };
        },
        async save(_orgId: string, settings: OrganizationModulesStoredState) {
          // Simulate async I/O delay
          await new Promise((resolve) => setTimeout(resolve, 15));
          state = { ...settings };
        },
      };

      const service = new OrganizationModulesService(repo);

      // Execute concurrent mutations
      await Promise.all([
        service.enable('org-test-1', 'user-1', 'social-selling'),
        service.enable('org-test-1', 'user-2', 'hub-inteligencia'),
      ]);

      const finalState = await service.get('org-test-1');
      expect(finalState.activeModules).toContain('social-selling');
      expect(finalState.activeModules).toContain('hub-inteligencia');
    });
  });
});
