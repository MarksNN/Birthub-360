import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LEGACY_PATTERNS = [
  /atlas[-_ ]?prospector/i,
  /prospector[-_ ]?atlas/i,
  /^prospector$/i,
  /^atlas$/i,
];

const PLACEHOLDER_PATTERNS = [
  /^<.*>$/,
  /^\[.*\]$/,
  /placeholder/i,
  /changeme/i,
  /todo/i,
  /your[-_ ]?org/i,
  /your[-_ ]?project/i,
  /example/i,
];

const VALID_ORGANIZATION_KEYS = ['marks', 'marksnn'];
const VALID_PROJECT_KEY_REGEX = /^(birthub[-_]?360|marksnn[-_]birthub[-_]?360)$/i;

/**
 * Parses key=value pairs from a Java/Sonar properties file content.
 */
export function parseProperties(content) {
  const result = {};
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) {
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      result[key] = val;
    }
  }
  return result;
}

/**
 * Validates SonarQube / SonarCloud configuration for Birthub 360.
 *
 * @param {object} options
 * @param {string} [options.organization] - vars.SONAR_ORGANIZATION
 * @param {string} [options.projectKey] - vars.SONAR_PROJECT_KEY
 * @param {string} [options.token] - secrets.SONAR_TOKEN
 * @param {string} [options.eventName] - github.event_name (push, pull_request, workflow_dispatch)
 * @param {boolean} [options.isForkPr] - whether this run comes from a fork pull request
 * @param {string} [options.propertiesPath] - path to sonar-project.properties
 * @param {string} [options.propertiesContent] - optional raw properties string (for testing)
 * @returns {{ ok: boolean, errors: string[], warnings: string[], details: object }}
 */
export function validateSonarConfig(options = {}) {
  const errors = [];
  const warnings = [];

  const organization = (options.organization ?? process.env.SONAR_ORGANIZATION ?? '').trim();
  const projectKey = (options.projectKey ?? process.env.SONAR_PROJECT_KEY ?? '').trim();
  const token = (options.token ?? process.env.SONAR_TOKEN ?? '').trim();
  const isForkPr = Boolean(
    options.isForkPr ??
    (process.env.IS_FORK_PR === 'true' || process.env.IS_FORK_PR === '1')
  );
  const eventName = options.eventName ?? process.env.GITHUB_EVENT_NAME ?? 'push';

  // 1. Validate Organization (SONAR_ORGANIZATION)
  if (!organization) {
    errors.push(
      "SONAR_ORGANIZATION is missing or empty. Configure repository variable 'SONAR_ORGANIZATION' with official key 'marks'."
    );
  } else {
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(organization)) {
        errors.push(`SONAR_ORGANIZATION contains placeholder/invalid value: '${organization}'.`);
        break;
      }
    }
    for (const pattern of LEGACY_PATTERNS) {
      if (pattern.test(organization)) {
        errors.push(`SONAR_ORGANIZATION points to legacy identifier: '${organization}'.`);
        break;
      }
    }
    if (!VALID_ORGANIZATION_KEYS.includes(organization.toLowerCase())) {
      errors.push(
        `SONAR_ORGANIZATION '${organization}' is not recognized as the official organization for Marks. Expected one of: ${VALID_ORGANIZATION_KEYS.join(', ')}.`
      );
    }
  }

  // 2. Validate Project Key (SONAR_PROJECT_KEY)
  if (!projectKey) {
    errors.push(
      "SONAR_PROJECT_KEY is missing or empty. Configure repository variable 'SONAR_PROJECT_KEY' with official project key 'birthub-360'."
    );
  } else {
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(projectKey)) {
        errors.push(`SONAR_PROJECT_KEY contains placeholder/invalid value: '${projectKey}'.`);
        break;
      }
    }
    for (const pattern of LEGACY_PATTERNS) {
      if (pattern.test(projectKey)) {
        errors.push(`SONAR_PROJECT_KEY points to legacy identifier: '${projectKey}'.`);
        break;
      }
    }
    if (!VALID_PROJECT_KEY_REGEX.test(projectKey)) {
      errors.push(
        `SONAR_PROJECT_KEY '${projectKey}' does not match official Birthub 360 naming standard (expected 'birthub-360' or 'MarksNN_Birthub-360').`
      );
    }
  }

  // 3. Validate Token Availability & Context (SONAR_TOKEN)
  if (isForkPr) {
    errors.push(
      'Execution on a fork Pull Request detected. GitHub Actions secrets (SONAR_TOKEN) are withheld on forks for security. Scanner execution must be blocked without false approval.'
    );
  } else if (!token) {
    errors.push(
      "SONAR_TOKEN secret is missing or empty. Configure repository secret 'SONAR_TOKEN' in GitHub Actions (Settings -> Secrets and variables -> Actions -> Secrets)."
    );
  }

  // 4. Validate sonar-project.properties
  let props = null;
  let rawContent = options.propertiesContent;

  if (rawContent === undefined) {
    const propsPath = options.propertiesPath ?? path.resolve(process.cwd(), 'sonar-project.properties');
    if (!fs.existsSync(propsPath)) {
      errors.push(`Configuration file not found: '${propsPath}'.`);
    } else {
      try {
        rawContent = fs.readFileSync(propsPath, 'utf8');
      } catch (err) {
        errors.push(`Failed to read '${propsPath}': ${err.message}`);
      }
    }
  }

  if (rawContent !== undefined) {
    // Check for legacy references anywhere in the raw properties file
    for (const pattern of LEGACY_PATTERNS) {
      if (pattern.test(rawContent)) {
        errors.push('sonar-project.properties contains legacy project/organization references.');
        break;
      }
    }

    props = parseProperties(rawContent);

    // Verify projectName
    const projectName = props['sonar.projectName'];
    if (!projectName) {
      errors.push("sonar-project.properties is missing 'sonar.projectName'.");
    } else if (!/^birth\s*h?ub\s*360$/i.test(projectName)) {
      errors.push(
        `sonar-project.properties 'sonar.projectName' is '${projectName}', expected official identity 'Birthub 360'.`
      );
    }

    // Verify projectKey consistency
    const fileProjectKey = props['sonar.projectKey'];
    if (!fileProjectKey) {
      errors.push("sonar-project.properties is missing 'sonar.projectKey'.");
    } else {
      for (const pattern of LEGACY_PATTERNS) {
        if (pattern.test(fileProjectKey)) {
          errors.push(
            `sonar-project.properties 'sonar.projectKey' uses legacy identifier: '${fileProjectKey}'.`
          );
          break;
        }
      }
      if (projectKey && fileProjectKey.toLowerCase() !== projectKey.toLowerCase()) {
        errors.push(
          `Configuration conflict: 'sonar.projectKey' in sonar-project.properties ('${fileProjectKey}') differs from SONAR_PROJECT_KEY variable ('${projectKey}').`
        );
      }
    }

    // Verify organization consistency if present in file
    const fileOrg = props['sonar.organization'];
    if (fileOrg) {
      for (const pattern of LEGACY_PATTERNS) {
        if (pattern.test(fileOrg)) {
          errors.push(
            `sonar-project.properties 'sonar.organization' uses legacy identifier: '${fileOrg}'.`
          );
          break;
        }
      }
      if (organization && fileOrg.toLowerCase() !== organization.toLowerCase()) {
        errors.push(
          `Configuration conflict: 'sonar.organization' in sonar-project.properties ('${fileOrg}') differs from SONAR_ORGANIZATION variable ('${organization}').`
        );
      }
    }

    // Verify coverage report path
    const reportPaths = props['sonar.javascript.lcov.reportPaths'];
    if (!reportPaths || !reportPaths.includes('coverage/unit/lcov.info')) {
      errors.push(
        `sonar-project.properties 'sonar.javascript.lcov.reportPaths' must point to 'coverage/unit/lcov.info' (found: '${reportPaths || 'none'}').`
      );
    }
  }

  const details = {
    organization: organization ? '[CONFIGURED]' : '[MISSING]',
    projectKey: projectKey ? '[CONFIGURED]' : '[MISSING]',
    tokenStatus: token ? '[AVAILABLE (REDACTED)]' : '[MISSING]',
    isForkPr,
    eventName,
    propertiesParsed: Boolean(props),
  };

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    details,
  };
}

// CLI runner
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log('====================================================');
  console.log(' BIRTHUB 360 — SONARQUBE CLOUD CONFIGURATION GATE   ');
  console.log('====================================================');

  const result = validateSonarConfig();

  console.log(`Context Event:   ${result.details.eventName}`);
  console.log(`Fork PR:         ${result.details.isForkPr ? 'YES' : 'NO'}`);
  console.log(`Organization:    ${result.details.organization}`);
  console.log(`Project Key:     ${result.details.projectKey}`);
  console.log(`Token Status:    ${result.details.tokenStatus}`);
  console.log('----------------------------------------------------');

  if (result.warnings.length > 0) {
    console.warn('[WARNINGS]');
    for (const w of result.warnings) {
      console.warn(`  - ${w}`);
    }
  }

  if (!result.ok) {
    console.error('\n[VALIDATION FAILED] The following errors block scanner execution:');
    for (const err of result.errors) {
      console.error(`  ✖ ${err}`);
    }
    console.error('\nSonarQube Cloud scanner execution is BLOCKED to prevent false success.');
    console.error('Please configure the required variables/secrets in GitHub Actions before running.');
    console.log('====================================================');
    process.exit(1);
  }

  console.log('\n[VALIDATION PASSED] SonarQube Cloud configuration is verified for Birthub 360.');
  console.log('Proceeding to scanner execution...');
  console.log('====================================================');
  process.exit(0);
}
