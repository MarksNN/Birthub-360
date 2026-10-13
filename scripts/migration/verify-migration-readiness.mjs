#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const runGates = args.has('--run-gates');

const results = {
  passed: [],
  warnings: [],
  failed: [],
};

function pass(section, msg) {
  results.passed.push({ section, msg });
  console.log(`  [PASS] ${msg}`);
}

function warn(section, msg) {
  results.warnings.push({ section, msg });
  console.log(`  [WARN] ${msg}`);
}

function fail(section, msg) {
  results.failed.push({ section, msg });
  console.error(`  [FAIL] ${msg}`);
}

function getCmdVersion(cmd, versionArgs = ['--version']) {
  try {
    const res = spawnSync(cmd, versionArgs, {
      encoding: 'utf-8',
      shell: process.platform === 'win32',
      timeout: 8000,
    });
    if (res.status === 0 && (res.stdout || res.stderr)) {
      return (res.stdout || res.stderr).trim().split(/\r?\n/)[0];
    }
    return null;
  } catch {
    return null;
  }
}

function parseEnvKeysOnly(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function checkTcpPort(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (open) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(open);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function main() {
  console.log('====================================================================');
  console.log('  BIRTH HUB 360 — VERIFICADOR DE PRONTIDÃO E PORTABILIDADE (FASE 6)');
  console.log('====================================================================');
  console.log(`Plataforma: ${os.platform()} ${os.release()} (${os.arch()}) | RAM Total: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB\n`);

  // 1. Pré-requisitos e Versões de Ferramentas
  console.log('1. Ferramentas e Runtimes');
  const nodeVersion = process.version;
  const nodeMajor = Number.parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (nodeMajor >= 20) {
    pass('tools', `Node.js ${nodeVersion} (atende >= 20.0.0)`);
  } else {
    fail('tools', `Node.js ${nodeVersion} abaixo do mínimo exigido (>= 20.0.0)`);
  }

  const requiredTools = [
    { cmd: 'git', label: 'Git' },
    { cmd: 'npm', label: 'npm' },
  ];
  const optionalTools = [
    { cmd: 'gh', label: 'GitHub CLI (gh)' },
    { cmd: 'pnpm', label: 'pnpm' },
    { cmd: 'python', label: 'Python' },
    { cmd: 'docker', label: 'Docker CLI' },
    { cmd: 'aws', label: 'AWS CLI' },
    { cmd: 'code', label: 'VS Code CLI' },
  ];

  for (const t of requiredTools) {
    const ver = getCmdVersion(t.cmd);
    if (ver) pass('tools', `${t.label}: ${ver}`);
    else fail('tools', `${t.label} não encontrado no PATH`);
  }

  for (const t of optionalTools) {
    const ver = getCmdVersion(t.cmd);
    if (ver) pass('tools', `${t.label}: ${ver}`);
    else warn('tools', `${t.label} não instalado ou ausente no PATH (opcional/recomendado)`);
  }

  // 2. Lockfiles e Subprojetos
  console.log('\n2. Integridade de Lockfiles');
  const lockfiles = [
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'landing/package.json',
    'landing/package-lock.json',
    'agente-codigo-local/package.json',
    'agente-codigo-local/package-lock.json',
  ];
  for (const lf of lockfiles) {
    const full = path.join(rootDir, lf);
    if (fs.existsSync(full) && fs.statSync(full).size > 100) {
      pass('lockfiles', `Lockfile/manifesto íntegro: ${lf} (${fs.statSync(full).size} bytes)`);
    } else {
      fail('lockfiles', `Lockfile/manifesto ausente ou vazio: ${lf}`);
    }
  }

  // 3. Variáveis de Ambiente (apenas nomes, ZERO valores expostos)
  console.log('\n3. Arquivos de Ambiente (Verificação Segura por Nome de Chave)');
  const envExampleKeys = parseEnvKeysOnly(path.join(rootDir, '.env.example'));
  const envKeys = parseEnvKeysOnly(path.join(rootDir, '.env'));
  const envTestKeys = parseEnvKeysOnly(path.join(rootDir, '.env.test'));

  if (envExampleKeys.size >= 140) {
    pass('env', `.env.example presente com ${envExampleKeys.size} chaves documentadas`);
  } else {
    fail('env', `.env.example incompleto (${envExampleKeys.size} chaves)`);
  }

  const criticalEnvKeys = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'BETTER_AUTH_URL',
    'BETTER_AUTH_SECRET',
    'CREDENTIALS_ENCRYPTION_KEY',
    'PII_BLIND_INDEX_KEY',
    'ALLOWED_ORIGINS',
  ];

  if (envKeys.size > 0) {
    const missingCritical = criticalEnvKeys.filter((k) => !envKeys.has(k));
    if (missingCritical.length === 0) {
      pass('env', `.env presente (${envKeys.size} chaves definidas; todas as ${criticalEnvKeys.length} chaves críticas presentes)`);
    } else {
      fail('env', `.env presente, porém faltam chaves críticas: ${missingCritical.join(', ')}`);
    }
  } else {
    warn('env', '.env não encontrado na raiz (copie do cofre de migração ou de .env.example na máquina nova)');
  }

  if (envTestKeys.size > 0) {
    pass('env', `.env.test presente (${envTestKeys.size} chaves definidas)`);
  } else {
    warn('env', '.env.test não encontrado na raiz (copie do cofre de migração ou de .env.test.example)');
  }

  // 4. Prisma e Migrations (Somente Leitura)
  console.log('\n4. Prisma Schema e Migrations');
  const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
  const migrationsDir = path.join(rootDir, 'prisma', 'migrations');
  if (fs.existsSync(schemaPath) && fs.existsSync(migrationsDir)) {
    const migrationEntries = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    if (migrationEntries.length >= 139) {
      pass('prisma', `prisma/schema.prisma e ${migrationEntries.length} migrations verificadas`);
    } else {
      fail('prisma', `Quantidade de migrations inesperada: ${migrationEntries.length} (esperado >= 139)`);
    }
  } else {
    fail('prisma', 'prisma/schema.prisma ou prisma/migrations ausente');
  }

  // 5. Arquitetura Multiagente (Fase 7)
  console.log('\n5. Governança e Arquitetura Multiagente');
  const agentsMd = path.join(rootDir, 'AGENTS.md');
  const promptsDir = path.join(rootDir, '.agents', 'prompts');
  const skillsDir = path.join(rootDir, '.agents', 'skills');
  const reviewsDir = path.join(rootDir, '.agents', 'reviews');
  const handoffsDir = path.join(rootDir, '.agents', 'handoffs');

  if (fs.existsSync(agentsMd)) {
    pass('agents', 'AGENTS.md global presente na raiz');
  } else {
    fail('agents', 'AGENTS.md global ausente na raiz');
  }

  if (fs.existsSync(promptsDir)) {
    const prompts = fs.readdirSync(promptsDir).filter((f) => f.endsWith('.md'));
    if (prompts.length >= 23) {
      pass('agents', `.agents/prompts/ íntegro (${prompts.length} prompts oficiais)`);
    } else {
      fail('agents', `.agents/prompts/ incompleto (${prompts.length} arquivos, esperado >= 23)`);
    }
  } else {
    fail('agents', '.agents/prompts/ ausente');
  }

  if (fs.existsSync(skillsDir)) {
    const skills = fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md')));
    if (skills.length >= 42) {
      pass('agents', `.agents/skills/ íntegro (${skills.length} skills com SKILL.md)`);
    } else {
      warn('agents', `.agents/skills/ possui ${skills.length} skills (esperado >= 42)`);
    }
  } else {
    fail('agents', '.agents/skills/ ausente');
  }

  if (fs.existsSync(reviewsDir) && fs.existsSync(handoffsDir)) {
    pass('agents', 'Diretórios de rastreabilidade (.agents/reviews/ e .agents/handoffs/) presentes');
  } else {
    fail('agents', 'Diretórios .agents/reviews/ ou .agents/handoffs/ ausentes');
  }

  // 6. Serviços Locais (Sondagem TCP Não Destrutiva)
  console.log('\n6. Sondagem de Portas de Serviços Locais (Local-First)');
  const localServices = [
    { name: 'PostgreSQL Local (birthhub_postgres)', port: 5434 },
    { name: 'Redis Local (birthhub_redis)', port: 6379 },
    { name: 'Meilisearch Local (birthhub_meilisearch)', port: 7700 },
    { name: 'MinIO S3 Local (birthhub_minio)', port: 9000 },
    { name: 'Ollama Local (birthhub_ollama)', port: 11434 },
  ];

  for (const svc of localServices) {
    const open = await checkTcpPort('127.0.0.1', svc.port);
    if (open) {
      pass('services', `${svc.name} respondendo em 127.0.0.1:${svc.port}`);
    } else {
      warn('services', `${svc.name} offline em 127.0.0.1:${svc.port} (inicie via docker compose quando aplicável)`);
    }
  }

  // 7. Execução Opcional dos Gates de Qualidade (--run-gates)
  if (runGates) {
    console.log('\n7. Execução dos Gates de Qualidade (--run-gates)');
    const gates = [
      { label: 'Typecheck (npm run typecheck)', cmd: 'npm run typecheck' },
      { label: 'Lint (npm run lint)', cmd: 'npm run lint' },
      { label: 'Arquitetura (npm run test:architecture)', cmd: 'npm run test:architecture' },
      { label: 'Build (npm run build)', cmd: 'npm run build' },
    ];
    for (const g of gates) {
      try {
        execSync(g.cmd, { cwd: rootDir, stdio: 'pipe' });
        pass('gates', `${g.label} -> PASS (exit 0)`);
      } catch (err) {
        fail('gates', `${g.label} -> FAIL (${err instanceof Error ? err.message.split('\n')[0] : 'erro'})`);
      }
    }
  }

  console.log('\n====================================================================');
  console.log(
    `  RESUMO: ${results.passed.length} PASS | ${results.warnings.length} WARN | ${results.failed.length} FAIL`,
  );
  console.log(
    `  STATUS GERAL: ${results.failed.length === 0 ? 'PRONTO / ÍNTEGRO ✅' : 'PENDÊNCIAS CRÍTICAS DETECTADAS ❌'}`,
  );
  console.log('====================================================================');

  process.exit(results.failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Erro inesperado na verificação de prontidão:', err);
  process.exit(1);
});
