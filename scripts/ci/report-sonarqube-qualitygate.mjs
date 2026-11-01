import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const METRIC_LABELS = {
  new_coverage: 'Cobertura de testes em código novo',
  coverage: 'Cobertura de testes global',
  new_duplicated_lines_density: 'Densidade de duplicação em código novo',
  duplicated_lines_density: 'Densidade de duplicação global',
  new_reliability_rating: 'Confiabilidade em código novo (Bugs)',
  reliability_rating: 'Confiabilidade global (Bugs)',
  new_security_rating: 'Segurança em código novo (Vulnerabilidades)',
  security_rating: 'Segurança global (Vulnerabilidades)',
  new_maintainability_rating: 'Manutenibilidade em código novo (Code Smells)',
  maintainability_rating: 'Manutenibilidade global (Code Smells)',
  new_security_hotspots_reviewed: 'Security Hotspots revisados em código novo',
  security_hotspots_reviewed: 'Security Hotspots revisados global',
  new_violations: 'Novas violações',
  new_blocker_violations: 'Novas violações Bloqueadoras',
  new_critical_violations: 'Novas violações Críticas',
  new_major_violations: 'Novas violações Maiores',
};

const RATING_MAP = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'D',
  5: 'E',
};

const COMPARATOR_SYMBOLS = {
  LT: '<',
  GT: '>',
  EQ: '=',
  NE: '!=',
};

/**
 * Parses key=value pairs from .scannerwork/report-task.txt
 */
export function parseReportTask(content) {
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

function formatValue(metricKey, rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return 'N/A';
  }
  if (metricKey.endsWith('_rating')) {
    const letter = RATING_MAP[String(rawValue)] ?? rawValue;
    return `${rawValue} (${letter})`;
  }
  if (
    metricKey.includes('coverage') ||
    metricKey.includes('density') ||
    metricKey.includes('reviewed')
  ) {
    const num = Number.parseFloat(rawValue);
    return Number.isFinite(num) ? `${num.toFixed(1)}%` : rawValue;
  }
  return String(rawValue);
}

function formatComparator(comparator) {
  return COMPARATOR_SYMBOLS[comparator] ?? comparator ?? '';
}

/**
 * Queries the Sonar API with retry/backoff if task is still running.
 */
async function fetchWithAuth(url, token) {
  const headers = {
    Accept: 'application/json',
  };
  if (token) {
    const basicAuth = Buffer.from(`${token}:`).toString('base64');
    headers.Authorization = `Basic ${basicAuth}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText} from ${url}: ${text}`);
  }
  return response.json();
}

/**
 * Main quality gate status reporter
 */
export async function reportQualityGate(options = {}) {
  const token = (options.token ?? process.env.SONAR_TOKEN ?? '').trim();
  const hostUrl = (
    options.hostUrl ??
    process.env.SONAR_HOST_URL ??
    'https://sonarcloud.io'
  ).replace(/\/+$/, '');
  const defaultProjectKey = (
    options.projectKey ??
    process.env.SONAR_PROJECT_KEY ??
    'MarksNN_Birthub-360'
  ).trim();
  const prNumber = (options.prNumber ?? process.env.PR_NUMBER ?? '').trim();
  const branch = (options.branch ?? process.env.GITHUB_BRANCH ?? '').trim();

  const reportTaskPath =
    options.reportTaskPath ?? path.resolve(process.cwd(), '.scannerwork/report-task.txt');

  let serverUrl = hostUrl;
  let projectKey = defaultProjectKey;
  let dashboardUrl = null;
  let ceTaskId = null;
  let analysisId = null;

  if (fs.existsSync(reportTaskPath)) {
    try {
      const content = fs.readFileSync(reportTaskPath, 'utf8');
      const report = parseReportTask(content);
      if (report.serverUrl) serverUrl = report.serverUrl.replace(/\/+$/, '');
      if (report.projectKey) projectKey = report.projectKey;
      if (report.dashboardUrl) dashboardUrl = report.dashboardUrl;
      if (report.ceTaskId) ceTaskId = report.ceTaskId;
    } catch (err) {
      console.warn(`[AVISO] Falha ao ler .scannerwork/report-task.txt: ${err.message}`);
    }
  }

  if (!token) {
    console.warn(
      '[AVISO] SONAR_TOKEN não disponível. O detalhamento do Quality Gate requer token de autenticação.',
    );
    return { ok: false, error: 'SONAR_TOKEN_MISSING' };
  }

  // 1. Resolve analysisId from ceTaskId if available
  if (ceTaskId) {
    try {
      const taskUrl = `${serverUrl}/api/ce/task?id=${encodeURIComponent(ceTaskId)}`;
      const taskData = await fetchWithAuth(taskUrl, token);
      if (taskData?.task?.analysisId) {
        analysisId = taskData.task.analysisId;
      }
    } catch (err) {
      console.warn(
        `[AVISO] Não foi possível obter análise a partir da task ${ceTaskId}: ${err.message}`,
      );
    }
  }

  // 2. Fetch quality gate status
  let qgUrl;
  if (analysisId) {
    qgUrl = `${serverUrl}/api/qualitygates/project_status?analysisId=${encodeURIComponent(analysisId)}`;
  } else {
    qgUrl = `${serverUrl}/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}`;
    if (prNumber) {
      qgUrl += `&pullRequest=${encodeURIComponent(prNumber)}`;
    } else if (branch && branch !== 'main' && branch !== 'master') {
      qgUrl += `&branch=${encodeURIComponent(branch)}`;
    }
  }

  let statusData;
  try {
    statusData = await fetchWithAuth(qgUrl, token);
  } catch (err) {
    console.error(`[ERRO] Falha ao consultar status do Quality Gate no Sonar: ${err.message}`);
    return { ok: false, error: err.message };
  }

  const projectStatus = statusData?.projectStatus;
  if (!projectStatus) {
    console.error('[ERRO] Resposta inesperada do SonarQube (ausência de projectStatus).');
    return { ok: false, error: 'INVALID_RESPONSE' };
  }

  const overallStatus = projectStatus.status; // 'OK', 'WARN', 'ERROR'
  const conditions = projectStatus.conditions || [];

  console.log('====================================================');
  console.log(' BIRTHUB 360 — DIAGNÓSTICO DO QUALITY GATE SONAR   ');
  console.log('====================================================');
  console.log(`Projeto:        ${projectKey}`);
  console.log(
    `Status Global:  ${overallStatus === 'OK' ? 'APROVADO (PASSED)' : 'REPROVADO (FAILED)'}`,
  );
  if (dashboardUrl) {
    console.log(`Dashboard:      ${dashboardUrl}`);
  }
  console.log('----------------------------------------------------');

  const failedConditions = [];
  const passedConditions = [];

  for (const c of conditions) {
    const isError = c.status === 'ERROR';
    const isWarn = c.status === 'WARN';
    const label = METRIC_LABELS[c.metricKey] || c.metricKey;
    const actual = formatValue(c.metricKey, c.actualValue);
    const comparator = formatComparator(c.comparator);
    const threshold = formatValue(c.metricKey, c.errorThreshold ?? c.warningThreshold);

    const conditionItem = {
      metricKey: c.metricKey,
      label,
      status: c.status,
      actual,
      comparator,
      threshold,
      isError,
      isWarn,
    };

    if (isError || isWarn) {
      failedConditions.push(conditionItem);
    } else {
      passedConditions.push(conditionItem);
    }
  }

  if (failedConditions.length > 0) {
    console.log('\n❌ CONDIÇÕES REPROVADAS DO QUALITY GATE:');
    for (const c of failedConditions) {
      console.log(
        `  ✖ [${c.status}] ${c.label} (${c.metricKey})\n` +
          `      Atual:     ${c.actual}\n` +
          `      Exigido:   ${c.comparator} ${c.threshold}`,
      );
      // Emite anotação nativa de erro no GitHub Actions
      console.log(
        `::error title=SonarQube Quality Gate [${c.metricKey}]::${c.label} está em ${c.actual}, mas o Quality Gate exige ${c.comparator} ${c.threshold}`,
      );
    }
  }

  if (passedConditions.length > 0) {
    console.log('\n✅ CONDIÇÕES APROVADAS:');
    for (const c of passedConditions) {
      console.log(`  ✔ [OK] ${c.label}: ${c.actual} (limite ${c.comparator} ${c.threshold})`);
    }
  }

  // Gera GitHub Actions Step Summary se GITHUB_STEP_SUMMARY estiver disponível
  const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummaryPath) {
    try {
      let md = `## 📊 Diagnóstico do SonarQube Quality Gate\n\n`;
      md += `**Status Global:** ${overallStatus === 'OK' ? '✅ **APROVADO**' : '❌ **REPROVADO**'}\n\n`;
      if (dashboardUrl) {
        md += `🔗 [Ver painel completo no SonarCloud](${dashboardUrl})\n\n`;
      }
      md += `| Métrica | Status | Valor Atual | Limite do Quality Gate |\n`;
      md += `| :--- | :---: | :---: | :---: |\n`;

      for (const c of [...failedConditions, ...passedConditions]) {
        const icon = c.isError ? '❌ ERROR' : c.isWarn ? '⚠️ WARN' : '✅ OK';
        md += `| **${c.label}**<br>(\`${c.metricKey}\`) | ${icon} | **${c.actual}** | ${c.comparator} ${c.threshold} |\n`;
      }
      md += `\n`;
      fs.appendFileSync(stepSummaryPath, md, 'utf8');
    } catch (err) {
      console.warn(`[AVISO] Falha ao escrever GITHUB_STEP_SUMMARY: ${err.message}`);
    }
  }

  console.log('====================================================\n');
  return {
    ok: overallStatus === 'OK',
    status: overallStatus,
    failedConditions,
    passedConditions,
  };
}

// CLI runner
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  reportQualityGate()
    .then((_result) => {
      // O objetivo do reporter é dar visibilidade clara às métricas.
      // O step anterior do SonarQube Scan já falha com código 1 quando QG reprova.
      // Aqui saímos com 0 para que o relatório sempre seja exibido no log e no summary.
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[ERRO INESPERADO] ${err.message}`);
      process.exit(0);
    });
}
