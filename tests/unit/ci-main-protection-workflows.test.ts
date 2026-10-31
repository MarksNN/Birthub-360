// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

type Step = {
  name?: string;
  run?: string;
  uses?: string;
  if?: string;
  with?: Record<string, unknown>;
  ['continue-on-error']?: boolean;
};
type Workflow = {
  on: Record<string, unknown>;
  jobs: Record<string, { if?: string; needs?: string[]; steps: Step[]; services?: unknown }>;
};

const workflow = (name: string): Workflow =>
  YAML.parse(readFileSync(`.github/workflows/${name}.yml`, 'utf8'));
const findStep = (steps: Step[], name: string): Step => {
  const step = steps.find((candidate) => candidate.name === name);
  expect(step, `missing required step: ${name}`).toBeDefined();
  return step!;
};
const temporaryDirectories: string[] = [];
const temporaryDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'birthub-ci-policy-'));
  temporaryDirectories.push(directory);
  return directory;
};
const bash = (script: string, env: Record<string, string>, cwd = process.cwd()) => {
  const result = spawnSync(
    'bash',
    ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', script],
    {
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf8',
    },
  );
  expect(result.error, 'the CI shell must actually execute').toBeUndefined();
  return result;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true });
});

describe('required CI checks propagate failures', () => {
  const ci = workflow('ci');
  const aggregate = findStep(ci.jobs.build.steps, 'Consolidar veredito do repositório').run!;
  const passingResults = {
    CI_EVENT_NAME: 'pull_request',
    SECRET_SCAN_RESULT: 'success',
    DEPENDENCY_REVIEW_RESULT: 'success',
    TRIVY_SCAN_RESULT: 'success',
    APPLICATION_GATE_RESULT: 'success',
  };

  it('accepts a PR only when all consolidated gates passed', () => {
    expect(bash(aggregate, passingResults).status).toBe(0);
    expect(ci.jobs.build.needs).toEqual(
      expect.arrayContaining(['secret-scan', 'dependency-review', 'trivy-scan', 'build-and-test']),
    );
    expect(ci.jobs.build.if).toContain('always()');
  });

  for (const result of ['failure', 'cancelled', 'skipped', '']) {
    for (const gate of [
      'SECRET_SCAN_RESULT',
      'DEPENDENCY_REVIEW_RESULT',
      'TRIVY_SCAN_RESULT',
      'APPLICATION_GATE_RESULT',
    ]) {
      it(`rejects PR result ${gate}=${result || 'missing'}`, () => {
        expect(bash(aggregate, { ...passingResults, [gate]: result }).status).not.toBe(0);
      });
    }
  }

  it('allows the PR-only dependency review to be skipped on push', () => {
    expect(
      bash(aggregate, {
        ...passingResults,
        CI_EVENT_NAME: 'push',
        DEPENDENCY_REVIEW_RESULT: 'skipped',
      }).status,
    ).toBe(0);
  });

  it.each(['ci', 'dependency-review'])('%s keeps dependency review blocking', (name) => {
    const step = findStep(workflow(name).jobs['dependency-review'].steps, 'Dependency Review');
    expect(step['continue-on-error']).not.toBe(true);
    expect(step.with?.['fail-on-severity']).toBe('high');
  });

  it('keeps visual assertions blocking and reports available after failure', () => {
    const steps = workflow('visual-regression').jobs['visual-regression'].steps;
    const tests = findStep(steps, 'Run Visual Tests');
    expect(tests.run).toBe('npm run test:visual');
    expect(tests['continue-on-error']).not.toBe(true);
    expect(findStep(steps, 'Upload Visual Diff Report').if).toBe('always()');
  });

  it('preserves manual/weekly jobs without requiring them for PR aggregation', () => {
    expect(ci.jobs['visual-baselines'].if).toBe("github.event_name == 'workflow_dispatch'");
    expect(ci.jobs.build.needs).not.toContain('visual-baselines');
    const weekly = workflow('security-trivy').jobs['trivy-fs-scan'];
    expect(weekly.if).toBe("github.event_name != 'pull_request'");
    expect(
      findStep(weekly.steps, 'Rodar Trivy (fs scan, HIGH/CRITICAL)')['continue-on-error'],
    ).toBe(true);
  });

  it('uploads the actual visual snapshot names and uses matching CI services', () => {
    const generator = ci.jobs['visual-baselines'];
    expect(findStep(generator.steps, 'Upload baselines geradas').with).toMatchObject({
      path: 'visual-regression/baselines/**/*.png',
      'if-no-files-found': 'error',
    });
    expect(workflow('visual-regression').jobs['visual-regression'].services).toEqual(
      generator.services,
    );
  });
});

describe('SonarQube cannot succeed without scanner and quality gate', () => {
  const steps = workflow('sonarqube').jobs.sonarcloud.steps;
  const preflight = findStep(steps, 'Validate SonarQube configuration').run!;

  it('fails without a credential instead of skipping the scanner', () => {
    const result = bash(preflight, { SONAR_TOKEN: '', SONAR_HOST_URL: 'https://sonarcloud.io' });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('SONAR_TOKEN is required');
  });

  it('fails when the SonarCloud organization has not been verified/configured', () => {
    const result = bash(preflight, {
      SONAR_TOKEN: 'synthetic-test-placeholder',
      SONAR_HOST_URL: 'https://sonarcloud.io',
      SONAR_ORGANIZATION: '',
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('SONAR_ORGANIZATION');
    expect(result.stdout).not.toContain('synthetic-test-placeholder');
  });

  it('allows a configured scan while keeping credentials out of output', () => {
    const result = bash(preflight, {
      SONAR_TOKEN: 'synthetic-test-placeholder',
      SONAR_HOST_URL: 'https://sonarcloud.io',
      SONAR_ORGANIZATION: 'synthetic-organization',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('synthetic-test-placeholder');
    const scan = findStep(steps, 'SonarQube Scan');
    expect(scan.if).toBeUndefined();
    expect(scan['continue-on-error']).not.toBe(true);
    expect(scan.with?.args).toContain('-Dsonar.qualitygate.wait=true');
    expect(readFileSync('sonar-project.properties', 'utf8')).toContain(
      'sonar.projectKey=MarksNN_Birthub-360',
    );
  });
});

describe('CodeQL requires analysis evidence before checking findings', () => {
  const steps = workflow('codeql').jobs.analyze.steps;
  const gate = findStep(steps, 'Gate: falhar em achado CodeQL error-level');
  // Run the actual evidence guard, without launching the external TS scanner command.
  const guard = gate.run!.split('npx --yes tsx scripts/security/check-codeql-sarif.ts')[0];

  it('rejects missing/empty reports and accepts an actual nonempty report', () => {
    const directory = temporaryDirectory();
    expect(bash(guard, {}, directory).status).not.toBe(0);
    mkdirSync(join(directory, 'results'));
    writeFileSync(join(directory, 'results', 'python.sarif'), '');
    expect(bash(guard, {}, directory).status).not.toBe(0);
    writeFileSync(join(directory, 'results', 'python.sarif'), JSON.stringify({ runs: [] }));
    expect(bash(guard, {}, directory).status).toBe(0);
    expect(gate['continue-on-error']).not.toBe(true);
    expect(findStep(steps, 'Upload SARIF como artefato (auditoria/retenção)').with).toMatchObject({
      'if-no-files-found': 'error',
    });
  });
});
