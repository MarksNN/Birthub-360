import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as distributedLock from '../../../../lib/queue/distributedLock.js';
import * as coldLeadsScanner from '../../application/cold-leads-scanner.service.js';
import * as stagnationScanner from '../../application/stagnation-scanner.service.js';
import { unifiedScannerService } from '../unifiedScanner.service.js';

describe('UnifiedScannerService (P3.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pula execução quando o lock distribuído não é adquirido (outra instância rodando)', async () => {
    vi.spyOn(distributedLock, 'acquireDistributedLock').mockResolvedValue({
      acquired: false,
      runId: 'existing-run-id',
      release: vi.fn(),
    });

    const result = await unifiedScannerService.runUnifiedScan();

    expect(result.runId).toBe('existing-run-id');
    expect(result.coldLeads.executed).toBe(false);
    expect(result.stagnation.executed).toBe(false);
    expect(result.success).toBe(true);
  });

  it('executa tanto stagnation quanto cold leads quando o lock é adquirido', async () => {
    vi.spyOn(distributedLock, 'acquireDistributedLock').mockResolvedValue({
      acquired: true,
      runId: 'test-run-123',
      release: vi.fn(),
    });

    vi.spyOn(stagnationScanner, 'runStagnationScan').mockResolvedValue({
      runId: 'stag-1',
      leadsScanned: 15,
      automationsEvaluated: 3,
      fired: 2,
      failures: 0,
    });

    vi.spyOn(coldLeadsScanner, 'runColdLeadsScan').mockResolvedValue({
      runId: 'cold-1',
      scanned: 25,
      organizations: 2,
      failures: 1,
    });

    const result = await unifiedScannerService.runUnifiedScan();

    expect(result.runId).toBe('test-run-123');
    expect(result.stagnation.executed).toBe(true);
    expect(result.stagnation.leadsScanned).toBe(15);
    expect(result.stagnation.fired).toBe(2);

    expect(result.coldLeads.executed).toBe(true);
    expect(result.coldLeads.scanned).toBe(25);
    expect(result.coldLeads.organizations).toBe(2);
    expect(result.coldLeads.failures).toBe(1);

    expect(result.success).toBe(true);
  });

  it('isola falha de um scanner sem impedir a execução do outro', async () => {
    vi.spyOn(distributedLock, 'acquireDistributedLock').mockResolvedValue({
      acquired: true,
      runId: 'test-run-failover',
      release: vi.fn(),
    });

    vi.spyOn(stagnationScanner, 'runStagnationScan').mockRejectedValue(
      new Error('DB connection drop'),
    );

    vi.spyOn(coldLeadsScanner, 'runColdLeadsScan').mockResolvedValue({
      runId: 'cold-2',
      scanned: 10,
      organizations: 1,
      failures: 0,
    });

    const result = await unifiedScannerService.runUnifiedScan();

    expect(result.stagnation.executed).toBe(false);
    expect(result.coldLeads.executed).toBe(true);
    expect(result.coldLeads.scanned).toBe(10);
    expect(result.success).toBe(false);
  });
});
