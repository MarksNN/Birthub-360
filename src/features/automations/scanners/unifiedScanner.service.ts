import { acquireDistributedLock } from '../../../lib/queue/distributedLock.js';
import { logger } from '../../../lib/logger.js';
import { runColdLeadsScan } from '../application/cold-leads-scanner.service.js';
import { runStagnationScan } from '../application/stagnation-scanner.service.js';

export const UNIFIED_SCANNER_LOCK_KEY = 'unified-scanner:lock';
export const UNIFIED_SCANNER_LOCK_TTL_SECONDS = 60 * 45; // 45 minutos

export interface UnifiedScanResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  coldLeads: {
    scanned: number;
    organizations: number;
    failures: number;
    executed: boolean;
  };
  stagnation: {
    leadsScanned: number;
    automationsEvaluated: number;
    fired: number;
    failures: number;
    executed: boolean;
  };
  success: boolean;
}

/**
 * P3.3 (Plano de Evolução): Orquestrador unificado de scanners de automação.
 * Executa as varreduras de estagnação de negócios e de reaquecimento de leads frios
 * sob uma única cadência coordenada com lock distribuído e observabilidade centralizada.
 */
export class UnifiedScannerService {
  async runUnifiedScan(): Promise<UnifiedScanResult> {
    const started = Date.now();
    const lock = await acquireDistributedLock(
      UNIFIED_SCANNER_LOCK_KEY,
      UNIFIED_SCANNER_LOCK_TTL_SECONDS,
    );
    const { runId } = lock;

    if (!lock.acquired) {
      logger.info(
        { runId },
        'Unified scanner pulado: outra instância do cluster já está executando.',
      );
      return {
        runId,
        startedAt: new Date(started).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
        coldLeads: { scanned: 0, organizations: 0, failures: 0, executed: false },
        stagnation: {
          leadsScanned: 0,
          automationsEvaluated: 0,
          fired: 0,
          failures: 0,
          executed: false,
        },
        success: true,
      };
    }

    logger.info({ runId }, 'Iniciando ciclo unificado de scanners (stagnation + cold leads)...');

    let stagnationResult = {
      leadsScanned: 0,
      automationsEvaluated: 0,
      fired: 0,
      failures: 0,
      executed: false,
    };

    let coldLeadsResult = {
      scanned: 0,
      organizations: 0,
      failures: 0,
      executed: false,
    };

    let overallSuccess = true;

    // 1. Executa Stagnation Scan
    try {
      logger.info({ runId }, 'Unified scanner: executando scan de estagnação...');
      const res = await runStagnationScan();
      stagnationResult = {
        leadsScanned: res.leadsScanned,
        automationsEvaluated: res.automationsEvaluated,
        fired: res.fired,
        failures: res.failures,
        executed: true,
      };
    } catch (err: any) {
      logger.error({ err, runId }, 'Unified scanner: falha na varredura de estagnação');
      overallSuccess = false;
    }

    // 2. Executa Cold Leads Scan (isolado de falhas da etapa anterior)
    try {
      logger.info({ runId }, 'Unified scanner: executando scan de cold leads...');
      const res = await runColdLeadsScan();
      coldLeadsResult = {
        scanned: res.scanned,
        organizations: res.organizations,
        failures: res.failures,
        executed: true,
      };
    } catch (err: any) {
      logger.error({ err, runId }, 'Unified scanner: falha na varredura de cold leads');
      overallSuccess = false;
    }

    const durationMs = Date.now() - started;
    logger.info(
      {
        runId,
        durationMs,
        stagnation: stagnationResult,
        coldLeads: coldLeadsResult,
        success: overallSuccess,
      },
      'Ciclo unificado de scanners concluído.',
    );

    return {
      runId,
      startedAt: new Date(started).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      coldLeads: coldLeadsResult,
      stagnation: stagnationResult,
      success: overallSuccess,
    };
  }
}

export const unifiedScannerService = new UnifiedScannerService();
