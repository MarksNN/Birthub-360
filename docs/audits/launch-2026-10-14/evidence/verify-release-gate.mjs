import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
function evaluate(source, failCommand, missingScript) {
  const calls = [];
  const logs = [];
  let exitCode = 0;
  const packageScripts = { ...scripts };
  if (missingScript) delete packageScripts[missingScript];
  const context = {
    spawnSync(command, args) {
      const called = [command, ...args].join(' ');
      calls.push(called);
      return { status: called === failCommand ? 1 : 0 };
    },
    execSync() { return Buffer.from('9373fb224a8aba30a39f7d10d1a2be639c35af78'); },
    readFileSync() { return JSON.stringify({ scripts: packageScripts }); },
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
    process: { stdout: { write() {} }, exit(code) { exitCode = code; } },
  };
  vm.runInNewContext(source.replace(/^import .*;\r?\n/gm, ''), context);
  return { exitCode, calls, logs };
}
const original = execFileSync('git', ['show', 'HEAD:scripts/release-gate.js'], { encoding: 'utf8' });
const before = evaluate(original, 'npm run typecheck');
assert.equal(before.exitCode, 0);
assert(before.logs.includes('STATUS: GO'));
console.log('REPRODUZIDO: baseline emite GO com typecheck falhando.');
const source = fs.readFileSync('scripts/release-gate.js', 'utf8');
const mandatory = ['lint', 'typecheck', 'test:architecture', 'test:unit', 'test:integration', 'test:e2e', 'build'].map(s => 'npm run ' + s).concat('npm audit');
for (const command of mandatory) {
  const result = evaluate(source, command);
  assert.equal(result.exitCode, 1, command);
  assert(result.logs.includes('STATUS: NO-GO'), command);
}
const healthy = evaluate(source);
assert.equal(healthy.exitCode, 0);
assert(healthy.logs.includes('STATUS: GO'));
for (const command of mandatory) assert(healthy.calls.includes(command), command);
const missing = evaluate(source, undefined, 'test:integration');
assert.equal(missing.exitCode, 1);
assert(!missing.calls.includes('npm run test:integration'));
const docs = fs.readFileSync('docs/development/LOCAL_FIRST.md', 'utf8');
assert(docs.includes('docker compose -f docker-compose.yml -f docker-compose.postgres-local.yml up -d'));
console.log('PASS: 11 casos isolados (baseline, 8 falhas obrigatórias, sucesso, script ausente) + comando Postgres documental.');
console.log('Nenhum npm, banco, Docker, rede ou gate global foi executado neste teste.');
