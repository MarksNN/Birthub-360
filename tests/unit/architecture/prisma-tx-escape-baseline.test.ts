import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Parecer 15 (#40), ressalvas L1 e L2.
//
// L1: a regra biome-plugins/no-prisma-tx-escape.grit é "error" para código novo. Os usos legados
// de prisma.$queryRaw/$executeRaw/$transaction no client global ficam suprimidos com
// `biome-ignore lint/plugin/no-prisma-tx-escape` e congelados no baseline
// biome-plugins/no-prisma-tx-escape.baseline.json. Este teste falha se a lista crescer (arquivo
// novo ou mais supressões num arquivo) e também se ela encolher sem o baseline ser atualizado,
// para o baseline nunca ficar folgado. Supressões genéricas (lint/plugin sem nome, ignore-all,
// ignore-start) não são aceitas, porque esconderiam a regra sem passar pelo baseline.
//
// L2: só src/lib/prisma.ts instancia PrismaClient (o client cru fica sem RLS/tenant, fora do tx do
// runInTransaction e sem o guard G1). A regra estática é biome-plugins/no-new-prisma-client.grit;
// este teste garante que ela está registrada e que não sobrou nenhum `new PrismaClient` em src.
//
// Parecer 15 (#75):
// - R1: src/lib/db/transactionContext.ts (segundo runInTransaction, sem ALS e que lavava a flag da
//   UoW da outbox) foi apagado e não pode voltar.
// - S1: as regex de supressão aceitam qualquer espaçamento e tratam como genérica toda supressão
//   que não nomeia a regra (`biome-ignore lint:`, `biome-ignore lint/plugin:`, ignore-all/start).
// - S3: um fixture roda o Biome de verdade (versão do lock) e exige diagnóstico de nível error,
//   porque uma regra GritQL quebrada degrada para info em silêncio e o grep do .grit não pegaria.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const BASELINE_PATH = path.join(ROOT, 'biome-plugins/no-prisma-tx-escape.baseline.json');
const TX_ESCAPE_GRIT = path.join(ROOT, 'biome-plugins/no-prisma-tx-escape.grit');
const NEW_CLIENT_GRIT = path.join(ROOT, 'biome-plugins/no-new-prisma-client.grit');
const PRISMA_SINGLETON = 'src/lib/prisma.ts';

const SUPPRESSION_RE = /biome-ignore(?:-all|-start)?\s+lint\/plugin\/no-prisma-tx-escape\b/g;
const GENERIC_SUPPRESSION_RE =
  /biome-ignore(?:-all|-start)?\s+lint(?:\/plugin)?\s*(?::|$)|biome-ignore-(?:all|start)\s+lint\/plugin\/no-prisma-tx-escape\b/m;
const BIOME_VERSION = '2.5.14'; // a do package-lock.json; o teste confere
const NEW_PRISMA_CLIENT_RE = /\bnew\s+PrismaClient\s*\(/;

type Baseline = { rule: string; total: number; files: Record<string, number> };

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(entry)) out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const files = listSourceFiles(SRC);
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;

describe('parecer 15 (#40 L1): baseline de usos legados de no-prisma-tx-escape', () => {
  const actual: Record<string, number> = {};
  for (const file of files) {
    const count = (readFileSync(file, 'utf8').match(SUPPRESSION_RE) ?? []).length;
    if (count > 0) actual[rel(file)] = count;
  }

  it('a regra é error para código novo', () => {
    expect(readFileSync(TX_ESCAPE_GRIT, 'utf8')).toMatch(/severity="error"/);
    expect(baseline.rule).toBe('lint/plugin/no-prisma-tx-escape');
  });

  it('nenhum arquivo fora do baseline suprime a regra e nenhum arquivo tem mais supressões', () => {
    const grown = Object.entries(actual)
      .filter(([file, count]) => count > (baseline.files[file] ?? 0))
      .map(([file, count]) => `${file}: ${count} (baseline ${baseline.files[file] ?? 0})`);
    expect(
      grown,
      'Uso novo de prisma.$queryRaw/$executeRaw/$transaction no client global: use runInTransaction e o tx recebido em vez de biome-ignore.',
    ).toEqual([]);
  });

  it('o baseline não está folgado (migrou um uso? baixe a contagem no baseline)', () => {
    const stale = Object.entries(baseline.files)
      .filter(([file, count]) => (actual[file] ?? 0) < count)
      .map(([file, count]) => `${file}: ${actual[file] ?? 0} (baseline ${count})`);
    expect(stale).toEqual([]);
    const total = Object.values(baseline.files).reduce((sum, n) => sum + n, 0);
    expect(baseline.total).toBe(total);
  });

  it('S1: as regex pegam espaçamento extra e supressões genéricas (casos negativos)', () => {
    const count = (s: string) => (s.match(SUPPRESSION_RE) ?? []).length;
    // contam no baseline, com qualquer espaçamento
    expect(count('// biome-ignore lint/plugin/no-prisma-tx-escape: x')).toBe(1);
    expect(count('// biome-ignore  lint/plugin/no-prisma-tx-escape: x')).toBe(1);
    expect(count('// biome-ignore\tlint/plugin/no-prisma-tx-escape: x')).toBe(1);
    // genéricas: escondem a regra sem nomeá-la (ou para o arquivo/bloco inteiro)
    for (const generic of [
      '// biome-ignore lint: x',
      '// biome-ignore  lint: x',
      '// biome-ignore lint : x',
      '// biome-ignore lint/plugin: x',
      '// biome-ignore  lint/plugin: x',
      '// biome-ignore-all lint: x',
      '// biome-ignore-start lint/plugin: x',
      '// biome-ignore-all lint/plugin/no-prisma-tx-escape: x',
      '// biome-ignore-start  lint/plugin/no-prisma-tx-escape: x',
      '// biome-ignore lint',
    ]) {
      expect(GENERIC_SUPPRESSION_RE.test(generic), generic).toBe(true);
    }
    // não genéricas: nomeiam a regra (vão para o baseline) ou outra regra
    for (const specific of [
      '// biome-ignore lint/plugin/no-prisma-tx-escape: x',
      '// biome-ignore  lint/plugin/no-prisma-tx-escape: x',
      '// biome-ignore lint/complexity/noUselessConstructor: x',
      '// biome-ignore lint/plugin/no-new-prisma-client: x',
    ]) {
      expect(GENERIC_SUPPRESSION_RE.test(specific), specific).toBe(false);
    }
  });

  it('não há supressão genérica de plugin que esconda a regra', () => {
    const generic = files
      .filter((file) => GENERIC_SUPPRESSION_RE.test(readFileSync(file, 'utf8')))
      .map(rel);
    expect(generic).toEqual([]);
  });
});

describe('parecer 15 (#75 R1): sem runInTransaction paralelo', () => {
  it('src/lib/db/transactionContext.ts não existe', () => {
    expect(existsSync(path.join(ROOT, 'src/lib/db/transactionContext.ts'))).toBe(false);
    expect(baseline.files['src/lib/db/transactionContext.ts']).toBeUndefined();
  });
});

describe('parecer 15 (#75 S3): o Biome aplica as regras de verdade', () => {
  it(
    'um fixture violador gera diagnósticos de nível error e o singleton/tx ficam limpos',
    () => {
      const lock = JSON.parse(readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8')) as {
        packages: Record<string, { version?: string }>;
      };
      expect(lock.packages['node_modules/@biomejs/biome']?.version).toBe(BIOME_VERSION);

      const biome = JSON.parse(readFileSync(path.join(ROOT, 'biome.json'), 'utf8')) as {
        plugins?: string[];
      };
      const plugins = (biome.plugins ?? []).map((p) => path.resolve(ROOT, p));
      expect(plugins).toContain(TX_ESCAPE_GRIT);
      expect(plugins).toContain(NEW_CLIENT_GRIT);

      const dir = mkdtempSync(path.join(os.tmpdir(), 'b360-biome-fixture-'));
      try {
        mkdirSync(path.join(dir, 'src/lib'), { recursive: true });
        mkdirSync(path.join(dir, 'src/feat'), { recursive: true });
        writeFileSync(
          path.join(dir, 'biome.json'),
          JSON.stringify({
            root: true,
            vcs: { enabled: false },
            files: { includes: ['**'] },
            linter: { enabled: true, rules: { recommended: false } },
            plugins,
          }),
        );
        writeFileSync(
          path.join(dir, 'src/feat/violator.ts'),
          [
            "import { PrismaClient } from '@prisma/client';",
            "import { prisma } from '@/lib/prisma.js';",
            'export const a = () => prisma.$queryRawUnsafe(process.argv[2] ?? "");',
            'export class R {',
            '  constructor(private readonly prisma: typeof import("@/lib/prisma.js").prisma) {}',
            '  q() { return this.prisma.$executeRaw`SELECT 1`; }',
            '}',
            'export const c = new PrismaClient();',
            '',
          ].join('\n'),
        );
        writeFileSync(
          path.join(dir, 'src/feat/clean.ts'),
          [
            "import { prisma } from '@/lib/prisma.js';",
            'export const ok = (tx: { $queryRaw: (s: TemplateStringsArray) => unknown }) => tx.$queryRaw`SELECT 1`;',
            'export const legacy = () =>',
            '  // biome-ignore lint/plugin/no-prisma-tx-escape: fixture de supressão nomeada',
            '  prisma.$transaction([]);',
            '',
          ].join('\n'),
        );
        writeFileSync(
          path.join(dir, 'src/lib/prisma.ts'),
          [
            "import { PrismaClient } from '@prisma/client';",
            'export const basePrisma = new PrismaClient();',
            'export const prisma = basePrisma;',
            'export const t = () => basePrisma.$transaction([]);',
            '',
          ].join('\n'),
        );

        const res = spawnSync(
          'npx',
          ['--yes', `@biomejs/biome@${BIOME_VERSION}`, 'lint', `--config-path=${dir}`, '--reporter=github', path.join(dir, 'src')],
          { cwd: ROOT, encoding: 'utf8', timeout: 90_000 },
        );
        const output = `${res.stdout}\n${res.stderr}`;
        const diags = output
          .split('\n')
          .filter((l) => l.startsWith('::'))
          .map((l) => {
            const m = /^::(\w+) title=([^,]+),file=([^,]+),line=(\d+)/.exec(l);
            return m ? { level: m[1], title: m[2], file: rel(m[3]).replace(/^.*?src\//, 'src/'), line: Number(m[4]), text: l } : null;
          })
          .filter((d): d is NonNullable<typeof d> => d !== null);

        expect(res.status, output).not.toBe(0);
        const plugin = diags.filter((d) => d.title === 'plugin');
        expect(plugin.every((d) => d.level === 'error'), output).toBe(true);
        expect(
          plugin.map((d) => `${d.file}:${d.line}`).sort(),
          output,
        ).toEqual(['src/feat/violator.ts:3', 'src/feat/violator.ts:6', 'src/feat/violator.ts:8']);
        expect(plugin.filter((d) => /SQL cru ou transaction/.test(d.text))).toHaveLength(2);
        expect(plugin.filter((d) => /new PrismaClient fora de src\/lib\/prisma\.ts/.test(d.text))).toHaveLength(1);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    120_000,
  );
});

describe('parecer 15 (#40 L2): PrismaClient só em src/lib/prisma.ts', () => {
  it('o client paralelo do voice-hub foi removido', () => {
    expect(existsSync(path.join(SRC, 'lib/voice-hub/lib/prisma.ts'))).toBe(false);
  });

  it('a regra no-new-prisma-client está registrada no biome.json como error', () => {
    const biome = JSON.parse(readFileSync(path.join(ROOT, 'biome.json'), 'utf8')) as {
      plugins?: string[];
    };
    expect(biome.plugins).toContain('./biome-plugins/no-new-prisma-client.grit');
    expect(readFileSync(NEW_CLIENT_GRIT, 'utf8')).toMatch(/severity="error"/);
  });

  it('nenhum arquivo de src além do singleton instancia PrismaClient', () => {
    const offenders = files
      .filter((file) => rel(file) !== PRISMA_SINGLETON)
      .filter((file) => NEW_PRISMA_CLIENT_RE.test(stripComments(readFileSync(file, 'utf8'))))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
