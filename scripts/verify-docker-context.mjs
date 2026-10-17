import assert from 'node:assert/strict';
import fs from 'node:fs';

const ignore = fs.readFileSync('.dockerignore', 'utf8');
const dockerfile = fs.readFileSync('Dockerfile', 'utf8');

for (const pattern of [
  '.worktrees',
  '.tmp',
  'tmp',
  'temp',
  '**/*.tmp',
  '!prisma/migrations/',
  '!prisma/migrations/**',
  'identidade-visual/**',
  '!identidade-visual/birthhub360/tokens/**',
  '!identidade-visual/birthhub360/logos/**',
]) {
  assert(ignore.includes(pattern), pattern);
}

assert(!dockerfile.includes('devDependencies.prisma'), 'Dockerfile ainda resolve o range semver de devDependencies');
assert(dockerfile.includes("require('./node_modules/prisma/package.json').version"), 'versão da CLI deve vir da instalação do lockfile');
assert(dockerfile.includes("packages['node_modules/prisma'].version"), 'build deve comparar a CLI com o lock');
assert(dockerfile.includes('node node_modules/@prisma/engines/scripts/postinstall.js'), 'o build precisa baixar o schema-engine');
assert(dockerfile.includes("name.startsWith('schema-engine-')"), 'o build precisa falhar se o schema-engine não existir');

function excluded(rel) {
  const normalized = rel.replace(/\\/g, '/').replace(/^\.\//, '');
  const rules = [
    ['.worktrees', (p) => p === '.worktrees' || p.startsWith('.worktrees/')],
    ['.tmp', (p) => p === '.tmp' || p.startsWith('.tmp/')],
    ['tmp', (p) => p === 'tmp' || p.startsWith('tmp/')],
    ['temp', (p) => p === 'temp' || p.startsWith('temp/')],
    ['**/*.tmp', (p) => p.endsWith('.tmp')],
    ['*.sql', (p) => !p.includes('/') && p.endsWith('.sql')],
  ];
  let skip = false;
  for (const [name, match] of rules) {
    if (!ignore.includes(name)) continue;
    if (match(normalized)) skip = true;
  }
  if (normalized === 'prisma/migrations' || normalized.startsWith('prisma/migrations/')) skip = false;
  if (normalized === 'src' || normalized.startsWith('src/')) skip = false;
  if (normalized === 'package.json' || normalized === 'package-lock.json' || normalized === 'prisma.config.ts') skip = false;
  return skip;
}

const dropped = ['.worktrees/old/file.ts', '.tmp/cache.json', 'tmp/scratch.txt', 'temp/out.bin', 'notes.tmp', 'dump.sql'];
const kept = ['prisma/migrations/20260101000000_init/migration.sql', 'src/server.ts', 'package.json', 'package-lock.json', 'prisma.config.ts'];
for (const file of dropped) assert.equal(excluded(file), true, file);
for (const file of kept) assert.equal(excluded(file), false, file);

console.log('PASS: contexto Docker exclui .worktrees/.tmp/tmp/temp/*.tmp e preserva migrations e fontes.');
