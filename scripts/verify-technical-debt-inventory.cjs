'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SNAP = path.join(ROOT, '.agents/audits/technical-debt/2026-10-14');
const AUDIT_COMMIT = 'c7e33a911b734ddb3131a3ad08d421efbc823fd4';
const FAILURES = [];
const NOTES = [];

function fail(message) {
  FAILURES.push(message);
}

function readJson(rel) {
  const full = path.join(SNAP, rel);
  if (!fs.existsSync(full)) {
    fail(`arquivo ausente: ${rel}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    fail(`JSON inválido em ${rel}: ${error.message}`);
    return null;
  }
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function lf(buf) {
  return Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf8');
}

function mapRemediation(correctionState) {
  const s = String(correctionState || '');
  if (/patch candidato|patch parcial/i.test(s)) return 'PATCH_PROPOSED';
  if (/bloqueado para merge/i.test(s)) return 'BLOCKED';
  return 'OPEN';
}

const REQUIRED_IDS = [
  'DEBT-SEC-001',
  'DEBT-LGPD-001',
  'DEBT-LGPD-002',
  'DEBT-DB-001',
  'DEBT-DB-002',
  'DEBT-UX-001',
  'DEBT-API-001',
  'DEBT-GATE-001',
  'DEBT-QUEUE-001',
  'DEBT-AI-001',
  'DEBT-AI-002',
  'DEBT-AI-003',
  'DEBT-AI-004',
  'DEBT-GOV-004',
];

const SECRET_PATTERNS = [
  { name: 'chave privada', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'chave AWS', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'token GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'chave OpenAI', re: /\bsk-[A-Za-z0-9]{20,}/ },
  { name: 'token Slack', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'URL de banco com senha', re: /postgres(?:ql)?:\/\/[^\s'"]+:[^\s'"]+@/i },
  { name: 'segredo atribuído', re: /\b(api[_-]?key|client[_-]?secret|password|passwd|secret)\s*[:=]\s*['"][^'"]{12,}['"]/i },
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const manifest = readJson('manifest.json');
const findingsDoc = readJson('data/findings.json');
const checksDoc = readJson('data/checks.json');
const categoriesDoc = readJson('data/categories.json');
const wavesDoc = readJson('data/waves.json');
const statusDoc = readJson('progress/remediation-status.json');
const source = readJson('source/birthub360-auditoria-dividas.json');
const evidenceDoc = readJson('evidence/evidence-index.json');

const findings = findingsDoc && Array.isArray(findingsDoc.findings) ? findingsDoc.findings : [];
const checks = checksDoc && Array.isArray(checksDoc.checks) ? checksDoc.checks : [];
const categories = categoriesDoc && Array.isArray(categoriesDoc.categories) ? categoriesDoc.categories : [];
const waves = wavesDoc && Array.isArray(wavesDoc.waves) ? wavesDoc.waves : [];
const records = statusDoc && Array.isArray(statusDoc.records) ? statusDoc.records : [];
const sourceFindings = source && Array.isArray(source.findings) ? source.findings : [];
const sourceChecks = source && Array.isArray(source.checks) ? source.checks : [];

if (findings.length !== 40) fail(`achados: esperado 40, observado ${findings.length}`);
if (checks.length !== 216) fail(`verificações: esperado 216, observado ${checks.length}`);
if (categories.length !== 40) fail(`categorias: esperado 40, observado ${categories.length}`);
if (sourceFindings.length !== 40) fail(`fonte forense sem 40 achados (${sourceFindings.length})`);
if (sourceChecks.length !== 216) fail(`fonte forense sem 216 verificações (${sourceChecks.length})`);

const findingIds = findings.map((f) => f.id);
const checkIds = checks.map((c) => c.id);
if (new Set(findingIds).size !== findingIds.length) fail('IDs de achados duplicados');
if (new Set(checkIds).size !== checkIds.length) fail('IDs de verificações duplicados');

const sourceFindingIds = new Set(sourceFindings.map((f) => f.id));
const projectedFindingIds = new Set(findingIds);
for (const id of sourceFindingIds) {
  if (!projectedFindingIds.has(id)) fail(`achado da fonte ausente na projeção: ${id}`);
}
for (const id of projectedFindingIds) {
  if (!sourceFindingIds.has(id)) fail(`achado fictício, ausente da fonte: ${id}`);
}
const sourceCheckIds = new Set(sourceChecks.map((c) => c.id));
for (const id of checkIds) {
  if (!sourceCheckIds.has(id)) fail(`verificação fictícia: ${id}`);
}
if (sourceCheckIds.size !== checkIds.length) fail('conjunto de verificações difere da fonte');

for (const id of REQUIRED_IDS) {
  if (!projectedFindingIds.has(id)) fail(`ID canônico obrigatório ausente: ${id}`);
}

const categoryIds = new Set(categories.map((c) => c.id));
const perCategory = {};
for (const check of checks) {
  perCategory[check.category] = (perCategory[check.category] || 0) + 1;
  if (!categoryIds.has(check.category)) fail(`verificação ${check.id} em categoria desconhecida ${check.category}`);
}
if (Object.keys(perCategory).length !== 40) fail(`categorias com verificações: ${Object.keys(perCategory).length}`);
for (const [category, count] of Object.entries(perCategory)) {
  if (count < 5) fail(`categoria ${category} tem ${count} verificações`);
}

const priorities = { P0: 0, P1: 0, P2: 0, P3: 0 };
for (const finding of findings) {
  if (!Object.prototype.hasOwnProperty.call(priorities, finding.priority)) fail(`prioridade inválida em ${finding.id}: ${finding.priority}`);
  else priorities[finding.priority] += 1;
  if (finding.remediationStatus === 'RESOLVED' || finding.remediationStatus === 'VERIFIED') {
    fail(`${finding.id} marcado ${finding.remediationStatus} na projeção congelada`);
  }
}
if (priorities.P0 !== 0 || priorities.P1 !== 17 || priorities.P2 !== 20 || priorities.P3 !== 3) {
  fail(`prioridades ${JSON.stringify(priorities)}`);
}

const results = { Conforme: 0, 'Não conforme': 0, 'Parcialmente conforme': 0, 'Não verificado': 0 };
for (const check of checks) {
  if (!Object.prototype.hasOwnProperty.call(results, check.result)) fail(`resultado inválido em ${check.id}: ${check.result}`);
  else results[check.result] += 1;
  if (check.result === 'Não conforme' && !projectedFindingIds.has(check.findingId)) {
    fail(`não conforme ${check.id} sem achado válido (${check.findingId})`);
  }
  if (check.result === 'Conforme' && check.findingId) fail(`conforme ${check.id} vinculado a achado`);
  if (check.findingId && !projectedFindingIds.has(check.findingId)) fail(`vínculo inválido em ${check.id}: ${check.findingId}`);
  if (check.result === 'Não verificado' && check.validationStatus !== 'NOT_VERIFIED') {
    fail(`${check.id} não verificado foi reclassificado na validação`);
  }
  const sourceCheck = sourceChecks.find((c) => c.id === check.id);
  if (sourceCheck && sourceCheck.result !== check.result) fail(`${check.id} mudou o resultado da auditoria`);
}
if (results.Conforme !== 125 || results['Não conforme'] !== 41 || results['Parcialmente conforme'] !== 4 || results['Não verificado'] !== 46) {
  fail(`resultados ${JSON.stringify(results)}`);
}

const seenInWaves = [];
for (const wave of waves) {
  if (wave.status === 'DONE' || wave.status === 'COMPLETED' || wave.status === 'CONCLUIDA') {
    fail(`onda ${wave.id} marcada concluída sem evidência`);
  }
  if (!Array.isArray(wave.findings)) {
    fail(`onda ${wave.id} sem lista de achados`);
    continue;
  }
  for (const id of wave.findings) {
    if (!projectedFindingIds.has(id)) fail(`onda ${wave.id} cita achado inexistente ${id}`);
    seenInWaves.push(id);
  }
}
if (seenInWaves.length !== 40 || new Set(seenInWaves).size !== 40) {
  fail(`ondas não cobrem os 40 achados sem duplicar (${seenInWaves.length} ocorrências, ${new Set(seenInWaves).size} únicos)`);
}
const expectedWaveCounts = { 'Onda 00': 4, 'Onda 01': 6, 'Onda 02': 1, 'Onda 03': 10, 'Onda 04': 5, 'Onda 05': 3, 'Onda 06': 4, 'Onda 07': 1, 'Onda 08': 2, 'Onda 09': 4 };
for (const wave of waves) {
  const expected = expectedWaveCounts[wave.id];
  if (expected == null) fail(`onda inesperada ${wave.id}`);
  else if (wave.findings.length !== expected) fail(`${wave.id} tem ${wave.findings.length} achados, esperado ${expected}`);
}

for (const finding of findings) {
  const expected = mapRemediation(finding.correctionState);
  if (finding.remediationStatus !== expected) fail(`${finding.id} remediationStatus ${finding.remediationStatus} não corresponde a ${expected}`);
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) fail(`${finding.id} sem evidência`);
}

const allowed = new Set(['OPEN', 'IN_PROGRESS', 'PATCH_PROPOSED', 'IN_REVIEW', 'TESTING', 'BLOCKED', 'RESOLVED', 'VERIFIED', 'REOPENED', 'ACCEPTED_RISK']);
if (records.length !== 40) fail(`status vivo: esperado 40, observado ${records.length}`);
const recordIds = new Set();
for (const record of records) {
  if (recordIds.has(record.id)) fail(`status duplicado ${record.id}`);
  recordIds.add(record.id);
  if (!projectedFindingIds.has(record.id)) fail(`status de achado fictício ${record.id}`);
  if (!allowed.has(record.remediationStatus)) fail(`status inválido em ${record.id}`);
  const needsClosure = record.remediationStatus === 'RESOLVED' || record.remediationStatus === 'VERIFIED' || record.remediationStatus === 'ACCEPTED_RISK';
  if (needsClosure && !record.closureEvidence) fail(`${record.id} ${record.remediationStatus} sem closureEvidence`);
  if ((record.remediationStatus === 'RESOLVED' || record.remediationStatus === 'VERIFIED') && !record.fixCommit) {
    fail(`${record.id} ${record.remediationStatus} sem fixCommit`);
  }
  if (record.remediationStatus === 'VERIFIED' && (!Array.isArray(record.testsExecuted) || record.testsExecuted.length === 0 || !record.validationResult)) {
    fail(`${record.id} VERIFIED sem testes e validationResult`);
  }
}
for (const id of projectedFindingIds) {
  if (!recordIds.has(id)) fail(`achado sem status vivo: ${id}`);
}

if (manifest) {
  if (manifest.auditedCommit !== AUDIT_COMMIT) fail('manifesto aponta outro commit auditado');
  for (const rel of manifest.files || []) {
    if (!fs.existsSync(path.join(SNAP, rel))) fail(`arquivo exigido pelo manifesto ausente: ${rel}`);
  }
  for (const entry of manifest.sourceFiles || []) {
    const full = path.join(SNAP, entry.file);
    if (!fs.existsSync(full)) {
      fail(`arquivo de origem ausente: ${entry.file}`);
      continue;
    }
    const buf = fs.readFileSync(full);
    const raw = sha256(buf);
    const normalized = sha256(lf(buf));
    const accepted = new Set([entry.sha256, entry.sha256Lf].filter(Boolean));
    if (!accepted.has(raw) && !accepted.has(normalized)) fail(`hash divergente em ${entry.file}`);
  }
  if (manifest.importCommit) {
    NOTES.push(`importCommit registrado: ${manifest.importCommit}`);
  } else {
    NOTES.push('importCommit ainda nulo; esperado até o commit de registro existir');
  }
}

const dashboardPath = path.join(SNAP, 'dashboard/index.html');
if (!fs.existsSync(dashboardPath)) {
  fail('dashboard ausente');
} else {
  const html = fs.readFileSync(dashboardPath, 'utf8');
  const marker = 'const AUDIT_DATA = ';
  const start = html.indexOf(marker);
  if (start < 0) fail('dashboard sem AUDIT_DATA');
  else {
    const jsonStart = start + marker.length;
    const endLf = html.indexOf(';\n', jsonStart);
    const endCr = html.indexOf(';\r\n', jsonStart);
    const jsonEnd = endLf < 0 ? endCr : (endCr < 0 ? endLf : Math.min(endLf, endCr));
    if (jsonEnd < 0) fail('AUDIT_DATA sem término');
    else {
      try {
        const embedded = JSON.parse(html.slice(jsonStart, jsonEnd));
        if (!embedded.findings || embedded.findings.length !== 40) fail('dashboard sem 40 achados');
        if (!embedded.checks || embedded.checks.length !== 216) fail('dashboard sem 216 verificações');
        const embeddedIds = new Set((embedded.findings || []).map((f) => f.id));
        for (const id of projectedFindingIds) {
          if (!embeddedIds.has(id)) fail(`dashboard omite ${id}`);
        }
        const embeddedChecks = new Map((embedded.checks || []).map((c) => [c.id, c.result]));
        for (const check of checks) {
          if (embeddedChecks.get(check.id) !== check.result) fail(`dashboard diverge na verificação ${check.id}`);
        }
        const embeddedPriority = new Map((embedded.findings || []).map((f) => [f.id, f.priority]));
        for (const finding of findings) {
          if (embeddedPriority.get(finding.id) !== finding.priority) fail(`dashboard diverge na prioridade de ${finding.id}`);
        }
        if (!html.includes('file://')) fail('dashboard não documenta abertura por file://');
      } catch (error) {
        fail(`AUDIT_DATA ilegível: ${error.message}`);
      }
    }
  }
}

if (!evidenceDoc || !Array.isArray(evidenceDoc.items) || evidenceDoc.items.length === 0) {
  fail('índice de evidências vazio');
} else if (evidenceDoc.auditedCommit !== AUDIT_COMMIT) {
  fail('índice de evidências sem o commit auditado');
}

const secretHits = [];
for (const file of walk(SNAP)) {
  if (file.endsWith('.png') || file.endsWith('.zip')) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.re.test(text)) secretHits.push(`${path.relative(SNAP, file)}: ${pattern.name}`);
  }
}
if (secretHits.length) fail(`possíveis segredos: ${secretHits.slice(0, 10).join(' | ')}`);

const readme = path.join(ROOT, '.agents/audits/technical-debt/README.md');
const current = path.join(ROOT, '.agents/audits/technical-debt/CURRENT.md');
if (!fs.existsSync(readme) || !fs.existsSync(current)) fail('README canônico ou CURRENT.md ausente');

if (FAILURES.length) {
  console.error(`FALHA (${FAILURES.length})`);
  for (const message of FAILURES) console.error(`- ${message}`);
  process.exit(1);
}

console.log('OK inventário canônico 2026-10-14');
console.log(`achados ${findings.length}; verificações ${checks.length}; categorias ${categories.length}; ondas ${waves.length}`);
console.log(`prioridades P0=${priorities.P0} P1=${priorities.P1} P2=${priorities.P2} P3=${priorities.P3}`);
console.log(`resultados conforme=${results.Conforme} naoConforme=${results['Não conforme']} parcial=${results['Parcialmente conforme']} naoVerificado=${results['Não verificado']}`);
for (const note of NOTES) console.log(note);
