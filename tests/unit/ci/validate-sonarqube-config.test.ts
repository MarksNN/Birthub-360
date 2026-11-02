import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseProperties,
  validateSonarConfig,
} from '../../../scripts/ci/validate-sonarqube-config.mjs';

describe('SonarQube Cloud Configuration & Validation Gate for Birthub 360', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const realPropertiesPath = path.join(rootDir, 'sonar-project.properties');
  const sonarqubeWorkflowPath = path.join(rootDir, '.github/workflows/sonarqube.yml');

  const validProps = `sonar.organization=marcelinmark26359876123123
sonar.projectKey=MarksNN_Birthub-360
sonar.projectName=Birthub 360
sonar.projectVersion=1.0
sonar.sources=src
sonar.tests=tests
sonar.exclusions=**/node_modules/**,**/dist/**,**/*.test.ts,**/*.test.tsx,**/__tests__/**
sonar.javascript.lcov.reportPaths=coverage/unit/lcov.info
sonar.sourceEncoding=UTF-8
`;

  it('1. O projeto usa a identidade Birthub 360 em sonar-project.properties', () => {
    expect(fs.existsSync(realPropertiesPath)).toBe(true);
    const content = fs.readFileSync(realPropertiesPath, 'utf8');
    const parsed = parseProperties(content);

    expect(parsed['sonar.projectName']).toBe('Birthub 360');
    expect(parsed['sonar.projectKey']).toBe('MarksNN_Birthub-360');
    expect(parsed['sonar.organization']).toBe('marcelinmark26359876123123');
  });

  it('2. Não existem configurações ativas com identificadores legados no arquivo de propriedades', () => {
    const content = fs.readFileSync(realPropertiesPath, 'utf8');
    const legacyNames = [
      'prospector-atlas',
      'atlas-prospector',
      'Prospector Atlas API',
      'AtlasProspector',
      'prospector_atlas',
      'atlas_prospector',
    ];

    for (const legacy of legacyNames) {
      expect(content).not.toContain(legacy);
    }
  });

  it('3. A organização SonarQube é validada corretamente (aceita "marks" e rejeita legados/placeholders)', () => {
    // Aceita chave técnica oficial marks
    const validMarks = validateSonarConfig({
      organization: 'marcelinmark26359876123123',
      projectKey: 'MarksNN_Birthub-360',
      token: 'fake-token-12345',
      propertiesContent: validProps,
    });
    expect(validMarks.ok).toBe(true);
    expect(validMarks.errors).toHaveLength(0);

    // Rejeita vazia
    const emptyOrg = validateSonarConfig({
      organization: '',
      projectKey: 'MarksNN_Birthub-360',
      token: 'fake-token-12345',
      propertiesContent: validProps,
    });
    expect(emptyOrg.ok).toBe(false);
    expect(emptyOrg.errors.some((e) => e.includes('SONAR_ORGANIZATION is missing'))).toBe(true);

    // Rejeita legado prospector-atlas
    const legacyOrg = validateSonarConfig({
      organization: 'prospector-atlas',
      projectKey: 'MarksNN_Birthub-360',
      token: 'fake-token-12345',
      propertiesContent: validProps,
    });
    expect(legacyOrg.ok).toBe(false);
    expect(legacyOrg.errors.some((e) => e.includes('legacy identifier'))).toBe(true);

    // Rejeita placeholder
    const placeholderOrg = validateSonarConfig({
      organization: '<YOUR_ORG>',
      projectKey: 'MarksNN_Birthub-360',
      token: 'fake-token-12345',
      propertiesContent: validProps,
    });
    expect(placeholderOrg.ok).toBe(false);
    expect(placeholderOrg.errors.some((e) => e.includes('placeholder'))).toBe(true);
  });

  it('4. A project key é validada e consistente com sonar-project.properties', () => {
    // Rejeita chave legada
    const legacyKey = validateSonarConfig({
      organization: 'marcelinmark26359876123123',
      projectKey: 'prospector-atlas',
      token: 'fake-token-12345',
      propertiesContent: validProps,
    });
    expect(legacyKey.ok).toBe(false);
    expect(legacyKey.errors.some((e) => e.includes('legacy identifier'))).toBe(true);

    // Rejeita conflito entre variável e arquivo
    const conflictingKey = validateSonarConfig({
      organization: 'marcelinmark26359876123123',
      projectKey: 'birthub-360',
      token: 'fake-token-12345',
      propertiesContent: validProps, // tem sonar.projectKey=MarksNN_Birthub-360
    });
    expect(conflictingKey.ok).toBe(false);
    expect(conflictingKey.errors.some((e) => e.includes('Configuration conflict'))).toBe(true);
  });

  it('5. O token é exigido nos contextos adequados e protegido contra vazamento', () => {
    // Falha sem token em push normal
    const missingToken = validateSonarConfig({
      organization: 'marcelinmark26359876123123',
      projectKey: 'MarksNN_Birthub-360',
      token: '',
      isForkPr: false,
      propertiesContent: validProps,
    });
    expect(missingToken.ok).toBe(false);
    expect(missingToken.errors.some((e) => e.includes('SONAR_TOKEN'))).toBe(true);

    // Bloqueia em fork PR sem transformar indisponibilidade em aprovação fictícia
    const forkPr = validateSonarConfig({
      organization: 'marcelinmark26359876123123',
      projectKey: 'MarksNN_Birthub-360',
      token: '',
      isForkPr: true,
      propertiesContent: validProps,
    });
    expect(forkPr.ok).toBe(false);
    expect(forkPr.errors.some((e) => e.includes('fork Pull Request'))).toBe(true);

    // Garante que o valor do token não vaze nos detalhes
    const validWithSecret = validateSonarConfig({
      organization: 'marcelinmark26359876123123',
      projectKey: 'MarksNN_Birthub-360',
      token: 'super-sensitive-secret-token-do-not-leak',
      propertiesContent: validProps,
    });
    expect(validWithSecret.ok).toBe(true);
    expect(JSON.stringify(validWithSecret)).not.toContain('super-sensitive-secret-token');
    expect(validWithSecret.details.tokenStatus).toBe('[AVAILABLE (REDACTED)]');
  });

  it('6. O scanner não executa com configuração inválida no arquivo de propriedades', () => {
    const invalidFileProps = `sonar.projectKey=prospector-atlas
sonar.projectName=Prospector Atlas API
sonar.javascript.lcov.reportPaths=coverage/unit/lcov.info
`;
    const res = validateSonarConfig({
      organization: 'marcelinmark26359876123123',
      projectKey: 'MarksNN_Birthub-360',
      token: 'token-xyz',
      propertiesContent: invalidFileProps,
    });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('legacy project/organization references'))).toBe(true);
    expect(res.errors.some((e) => e.includes('expected official identity \'Birthub 360\''))).toBe(true);
  });

  it('7. O workflow sonarqube.yml possui etapa "Validate SonarQube Configuration" antes do scan', () => {
    expect(fs.existsSync(sonarqubeWorkflowPath)).toBe(true);
    const yaml = fs.readFileSync(sonarqubeWorkflowPath, 'utf8');

    expect(yaml).toContain('name: Validate SonarQube Configuration');
    expect(yaml).toContain('node scripts/ci/validate-sonarqube-config.mjs');

    const validationIdx = yaml.indexOf('name: Validate SonarQube Configuration');
    const scanIdx = yaml.indexOf('uses: SonarSource/sonarqube-scan-action');

    expect(validationIdx).toBeGreaterThan(-1);
    expect(scanIdx).toBeGreaterThan(-1);
    expect(validationIdx).toBeLessThan(scanIdx);
  });

  it('8. Os erros retornam mensagens acionáveis que identificam o nome da variável', () => {
    const missingAll = validateSonarConfig({
      organization: '',
      projectKey: '',
      token: '',
      propertiesContent: validProps,
    });
    expect(missingAll.ok).toBe(false);

    const joinedErrors = missingAll.errors.join(' ');
    expect(joinedErrors).toContain('SONAR_ORGANIZATION');
    expect(joinedErrors).toContain('SONAR_PROJECT_KEY');
    expect(joinedErrors).toContain('SONAR_TOKEN');
  });

  it('9. O workflow funciona perfeitamente com configurações oficiais válidas', () => {
    const res = validateSonarConfig({
      organization: 'marcelinmark26359876123123',
      projectKey: 'MarksNN_Birthub-360',
      token: 'valid-token-360',
      propertiesPath: realPropertiesPath,
    });
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('10. O Quality Gate e cobertura continuam apontando para o relatório unitário correto', () => {
    const content = fs.readFileSync(realPropertiesPath, 'utf8');
    const parsed = parseProperties(content);

    expect(parsed['sonar.javascript.lcov.reportPaths']).toBe('coverage/unit/lcov.info');
    expect(parsed['sonar.python.coverage.reportPaths']).toBe('coverage/python/coverage.xml');
    expect(parsed['sonar.sources']).toBe('src');
    expect(parsed['sonar.tests']).toBe('tests');
  });
});
