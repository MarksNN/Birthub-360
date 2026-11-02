import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatAcceptance,
  formatFailureRule,
  formatValue,
  parseReportTask,
  reportQualityGate,
} from '../../../scripts/ci/report-sonarqube-qualitygate.mjs';

describe('relatório do Quality Gate Sonar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('traduz comparadores de falha para o limite aceitável', () => {
    expect(formatAcceptance('GT', 'new_reliability_rating', '1')).toBe('≤ 1 (A)');
    expect(formatAcceptance('GT', 'new_security_rating', '1')).toBe('≤ 1 (A)');
    expect(formatAcceptance('LT', 'new_coverage', '80')).toBe('≥ 80.0%');
    expect(formatAcceptance('GT', 'new_duplicated_lines_density', '3')).toBe('≤ 3.0%');
    expect(formatAcceptance('LT', 'new_security_hotspots_reviewed', '100')).toBe('≥ 100.0%');
    expect(formatAcceptance('EQ', 'new_violations', '0')).toBe('= 0');
    expect(formatAcceptance('NE', 'new_violations', '2')).toBe('≠ 2');
  });

  it('formata classificação, percentual e a regra bruta de falha', () => {
    expect(formatValue('new_reliability_rating', '4')).toBe('4 (D)');
    expect(formatValue('new_security_rating', '3')).toBe('3 (C)');
    expect(formatValue('new_maintainability_rating', '1')).toBe('1 (A)');
    expect(formatValue('new_coverage', '39.6')).toBe('39.6%');
    expect(formatValue('new_blocker_violations', '2')).toBe('2');
    expect(formatValue('new_coverage', '')).toBe('N/A');
    expect(formatFailureRule('GT', 'new_reliability_rating', '1')).toBe('> 1 (A)');
    expect(formatFailureRule('LT', 'new_coverage', '80')).toBe('< 80.0%');
  });

  it('lê o report-task do scanner', () => {
    const parsed = parseReportTask(`
# comentario
serverUrl=https://sonarcloud.io/
projectKey=MarksNN_Birthub-360
ceTaskId=AYx
`);
    expect(parsed.serverUrl).toBe('https://sonarcloud.io/');
    expect(parsed.projectKey).toBe('MarksNN_Birthub-360');
    expect(parsed.ceTaskId).toBe('AYx');
  });

  it('recusa detalhar o gate sem token', async () => {
    const result = await reportQualityGate({ token: '  ', reportTaskPath: 'ausente.txt' });
    expect(result).toEqual({ ok: false, error: 'SONAR_TOKEN_MISSING' });
  });

  it('mostra o aceitável e preserva o status real da API', async () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line?: unknown) => {
      logs.push(String(line));
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          projectStatus: {
            status: 'ERROR',
            conditions: [
              {
                status: 'ERROR',
                metricKey: 'new_reliability_rating',
                comparator: 'GT',
                errorThreshold: '1',
                actualValue: '4',
              },
              {
                status: 'ERROR',
                metricKey: 'new_coverage',
                comparator: 'LT',
                errorThreshold: '80',
                actualValue: '39.6',
              },
              {
                status: 'OK',
                metricKey: 'new_duplicated_lines_density',
                comparator: 'GT',
                errorThreshold: '3',
                actualValue: '0.4',
              },
            ],
          },
        }),
      })),
    );

    const result = await reportQualityGate({
      token: 'token-de-teste',
      projectKey: 'MarksNN_Birthub-360',
      reportTaskPath: 'ausente.txt',
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('ERROR');
    expect(result.failedConditions[0].acceptance).toBe('≤ 1 (A)');
    expect(result.failedConditions[1].acceptance).toBe('≥ 80.0%');
    expect(result.passedConditions[0].acceptance).toBe('≤ 3.0%');
    const joined = logs.join('\n');
    expect(joined).toContain('Aceitável: ≤ 1 (A)');
    expect(joined).toContain('Aceitável: ≥ 80.0%');
    expect(joined).toContain('Falha quando: > 1 (A)');
    expect(joined).not.toContain('exige > 1');
    expect(joined).not.toContain('exige < 80');
  });
});
