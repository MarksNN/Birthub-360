
import { spawnSync } from 'child_process';
import { execSync } from 'child_process';
import { readFileSync } from 'node:fs';

const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts || {};

function run(cmd, name, optional = false) {
  try {
    const script = cmd.startsWith('npm run ') ? cmd.slice('npm run '.length) : null;
    if (script && !Object.hasOwn(scripts, script)) {
      console.error('Script obrigatório ausente: ' + script);
      return { name, status: 'FAIL', critical: true };
    }
    process.stdout.write('Executando ' + name + '... ');
    const [command, ...args] = cmd.split(' ');
    const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
    
    if (result.status === 0) {
      console.log('APROVADO');
      return { name, status: 'PASS', critical: !optional };
    } else {
      if (optional) {
        console.log('WARNING (Nao bloqueante)');
        return { name, status: 'WARN', critical: false };
      } else {
        console.log('FALHOU');
        return { name, status: 'FAIL', critical: true };
      }
    }
  } catch (e) {
    if (optional) {
      console.log('WARNING (Nao bloqueante)');
      return { name, status: 'WARN', critical: false };
    } else {
      console.log('FALHOU (Error: ' + e.message + ')');
      return { name, status: 'FAIL', critical: true };
    }
  }
}

const checks = [
  run('npm run lint', 'Lint', false),
  run('npm run typecheck', 'Typecheck', false),
  run('npm run test:architecture', 'Arquitetura', false),
  run('npm run test:unit', 'Testes Unitarios', false),
  run('npm run test:integration', 'Testes de Integracao', false),
  run('npm run test:e2e', 'Testes E2E', false),
  run('npm run build', 'Build da Aplicacao', false),
  run('npm run security:audit-waivers', 'Auditoria de Dependencias (Waiver-Aware)', false),
  run('npm run security:dependency-inventory', 'Security Inventory', true),
];

const hasBlockers = checks.some(c => c.status === 'FAIL' && c.critical);
const sha = execSync('git rev-parse HEAD').toString().trim();

console.log('\n=============================================');
console.log('SHA: ' + sha);
console.log('STATUS: ' + (hasBlockers ? 'NO-GO' : 'GO'));
console.log('CHECKS:');
checks.forEach(c => {
  console.log('- ' + c.name + ': ' + c.status);
});
console.log('=============================================');

if (hasBlockers) {
  process.exit(1);
}

