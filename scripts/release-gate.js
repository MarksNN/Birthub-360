import { execSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';

function loadPackageScripts() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  return pkg.scripts || {};
}

function run(cmd, name) {
  try {
    process.stdout.write('Executando ' + name + '... ');
    const [command, ...args] = cmd.split(' ');
    const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
    const spawnFailed = !result || result.error || result.status === null || result.status === undefined;
    if (!spawnFailed && result.status === 0) {
      console.log('APROVADO');
      return { name, status: 'PASS', critical: true };
    }
    console.log('FALHOU');
    return { name, status: 'FAIL', critical: true };
  } catch (e) {
    console.log('FALHOU (Error: ' + e.message + ')');
    return { name, status: 'FAIL', critical: true };
  }
}

const packageScripts = loadPackageScripts();
const plan = [
  { cmd: 'npm run lint', name: 'Lint', script: 'lint' },
  { cmd: 'npm run typecheck', name: 'Typecheck', script: 'typecheck' },
  { cmd: 'npm run test:architecture', name: 'Testes de Arquitetura', script: 'test:architecture' },
  { cmd: 'npm run test:unit', name: 'Testes Unitarios', script: 'test:unit' },
  { cmd: 'npm run test:integration', name: 'Testes de Integracao', script: 'test:integration' },
  { cmd: 'npm run test:e2e', name: 'Testes E2E', script: 'test:e2e' },
  { cmd: 'npm run build', name: 'Build da Aplicacao', script: 'build' },
  { cmd: 'npm audit', name: 'npm audit', script: null },
];

const checks = [];
for (const item of plan) {
  if (item.script && !packageScripts[item.script]) {
    console.log('Executando ' + item.name + '... FALHOU (script ausente: ' + item.script + ')');
    checks.push({ name: item.name, status: 'FAIL', critical: true });
    continue;
  }
  checks.push(run(item.cmd, item.name));
}

const hasBlockers = checks.some((c) => c.status === 'FAIL' && c.critical);
const sha = execSync('git rev-parse HEAD').toString().trim();

console.log('\n=============================================');
console.log('SHA: ' + sha);
console.log('STATUS: ' + (hasBlockers ? 'NO-GO' : 'GO'));
console.log('CHECKS:');
checks.forEach((c) => {
  console.log('- ' + c.name + ': ' + c.status);
});
console.log('=============================================');

if (hasBlockers) {
  process.exit(1);
}
