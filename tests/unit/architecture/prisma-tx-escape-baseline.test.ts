import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  analyzeSource,
  PRISMA_SINGLETON,
  SUPPRESSION_RE,
  suppressedUseKeys,
  suppressionProblems,
} from './prisma-tx-escape-usage.js';

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
//
// Parecer 24 (#75):
// - P2: o baseline é por uso (`<método>:<hash do statement>`, ver prisma-tx-escape-usage.ts), e
//   cada supressão tem que cobrir exatamente 1 uso na linha suprimida. Um segundo uso na mesma
//   linha, ou a troca de um uso por outro, falha mesmo com o lint verde.
// - P3: o fixture usa node_modules/.bin/biome (sem npx/rede) e confere a versão 2.5.14.
// Parecer 15 (#75 v2) S1b: a varredura cobre .mts/.cts/.jsx e pastas com ponto, como o biome.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const BASELINE_PATH = path.join(ROOT, 'biome-plugins/no-prisma-tx-escape.baseline.json');
const TX_ESCAPE_GRIT = path.join(ROOT, 'biome-plugins/no-prisma-tx-escape.grit');
const NEW_CLIENT_GRIT = path.join(ROOT, 'biome-plugins/no-new-prisma-client.grit');

const GENERIC_SUPPRESSION_RE =
  /biome-ignore(?:-all|-start)?\s+lint(?:\/plugin)?\s*(?::|$)|biome-ignore-(?:all|start)\s+lint\/plugin\/no-prisma-tx-escape\b/m;
const BIOME_VERSION = '2.5.14'; // a do package-lock.json; o teste confere
const BIOME_BIN = path.join(
  ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'biome.cmd' : 'biome',
);
const NEW_PRISMA_CLIENT_RE = /\bnew\s+PrismaClient\s*\(/;

type Baseline = { rule: string; total: number; files: Record<string, string[]> };

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry)) out.push(full);
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
  // P2 (parecer 24): chaves por uso, `<método>:<hash do statement normalizado>`.
  const actual: Record<string, string[]> = {};
  const problems: string[] = [];
  const unsuppressed: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const analysis = analyzeSource(rel(file), text);
    problems.push(...suppressionProblems(rel(file), analysis));
    // Toda supressão no texto tem que ter sido vista como comentário pelo analisador.
    const raw = (text.match(SUPPRESSION_RE) ?? []).length;
    if (raw !== analysis.suppressions.length) {
      problems.push(
        `${rel(file)}: ${raw} supressões no texto, ${analysis.suppressions.length} em comentários`,
      );
    }
    const covered = new Set(analysis.suppressions.map((s) => s.suppressedLine));
    for (const use of analysis.uses) {
      if (!covered.has(use.line)) unsuppressed.push(`${rel(file)}:${use.line} ${use.method}`);
    }
    const keys = suppressedUseKeys(analysis);
    if (keys.length > 0) actual[rel(file)] = keys;
  }

  /** Multiconjunto a − b, por arquivo. */
  const minus = (a: Record<string, string[]>, b: Record<string, string[]>) => {
    const out: string[] = [];
    for (const [file, keys] of Object.entries(a)) {
      const rest = [...(b[file] ?? [])];
      for (const key of keys) {
        const i = rest.indexOf(key);
        if (i >= 0) rest.splice(i, 1);
        else out.push(`${file}: ${key}`);
      }
    }
    return out;
  };

  it('a regra é error para código novo', () => {
    expect(readFileSync(TX_ESCAPE_GRIT, 'utf8')).toMatch(/severity="error"/);
    expect(baseline.rule).toBe('lint/plugin/no-prisma-tx-escape');
  });

  it('P2: cada supressão cobre exatamente 1 uso da regra na linha suprimida', () => {
    expect(problems).toEqual([]);
  });

  it('paridade com o .grit: todo uso da regra em src está numa linha suprimida (o lint também exige)', () => {
    expect(unsuppressed).toEqual([]);
  });

  it('nenhum uso suprimido fora do baseline (arquivo novo, uso a mais ou statement trocado)', () => {
    expect(
      minus(actual, baseline.files),
      `Uso novo ou alterado de $queryRaw/$executeRaw/$transaction no client global: use runInTransaction e o tx recebido em vez de biome-ignore. Chaves atuais: ${JSON.stringify(actual)}`,
    ).toEqual([]);
  });

  it('o baseline não está folgado (migrou um uso? remova a entrada do baseline)', () => {
    expect(minus(baseline.files, actual)).toEqual([]);
    const total = Object.values(baseline.files).reduce((sum, keys) => sum + keys.length, 0);
    expect(baseline.total).toBe(total);
  });

  it('P2 (caso D do parecer 24): um uso extra na linha suprimida do PgLeadRepository falha', () => {
    const file = 'src/features/cadence/dialer/infrastructure/db/repositories/PgLeadRepository.ts';
    const original = readFileSync(path.join(ROOT, file), 'utf8');
    const lines = original.split('\n');
    // A supressão de findById (perto da linha 83) e a linha que ela cobre.
    const target = lines.findIndex(
      (l, i) =>
        i >= 75 && i <= 90 && l.includes('const rows = await this.prisma.$queryRaw<LeadRow[]>'),
    );
    expect(target, 'linha suprimida de findById não encontrada').toBeGreaterThan(0);
    expect(lines[target - 1]).toMatch(SUPPRESSION_RE);
    const base = analyzeSource(file, original);
    expect(suppressionProblems(file, base)).toEqual([]);

    const mutate = (fn: (line: string) => string) => {
      const copy = [...lines];
      copy[target] = fn(copy[target] as string);
      const analysis = analyzeSource(file, copy.join('\n'));
      return {
        problems: suppressionProblems(file, analysis),
        added: minus({ [file]: suppressedUseKeys(analysis) }, baseline.files),
        removed: minus(
          { [file]: baseline.files[file] ?? [] },
          { [file]: suppressedUseKeys(analysis) },
        ),
      };
    };

    // (1) statement extra antes do legado, na mesma linha
    const sameLine = mutate((l) =>
      l.replace(
        'const rows',
        'void this.prisma.$executeRawUnsafe(String(process.env.X)); const rows',
      ),
    );
    expect(sameLine.problems.join('\n')).toMatch(/cobre 2 usos/);
    // (2) segundo uso dentro do mesmo statement
    const sameStatement = mutate((l) =>
      l.replace(
        'await this.prisma.$queryRaw',
        'this.prisma.$executeRawUnsafe(String(process.env.X)) && await this.prisma.$queryRaw',
      ),
    );
    expect(sameStatement.problems.join('\n')).toMatch(/cobre 2 usos/);
    // a supressão inválida não gera chave: o uso legado some do conjunto e o baseline acusa folga
    expect(sameStatement.removed).toHaveLength(1);
    expect(sameLine.removed).toHaveLength(1);
    // (3) troca do uso legado por um Unsafe (1 uso, mas a chave muda)
    const swapped = mutate((l) => l.replace('$queryRaw<LeadRow[]>', '$queryRawUnsafe<LeadRow[]>'));
    expect(swapped.problems).toEqual([]);
    expect(swapped.added).toEqual([
      expect.stringMatching(/^src\/.*PgLeadRepository\.ts: \$queryRawUnsafe:/),
    ]);
    // (4) mudar o SQL do statement suprimido também muda a chave
    const sqlChanged = (() => {
      const copy = [...lines];
      copy[target + 3] = (copy[target + 3] as string).replace('WHERE id', 'WHERE id = id OR id');
      return minus(
        { [file]: suppressedUseKeys(analyzeSource(file, copy.join('\n'))) },
        baseline.files,
      );
    })();
    expect(sqlChanged).toHaveLength(1);
    // reformatar não muda a chave
    const reformatted = original.replace(
      'const rows = await this.prisma.$queryRaw<LeadRow[]>(',
      'const rows =  await  this.prisma.$queryRaw< LeadRow[] >(',
    );
    expect(
      minus({ [file]: suppressedUseKeys(analyzeSource(file, reformatted)) }, baseline.files),
    ).toEqual([]);
  });

  it('S1b: a varredura cobre .mts/.cts/.jsx e pastas com ponto, como o biome', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'b360-scan-'));
    try {
      for (const f of [
        'a.mts',
        'b.cts',
        'c.jsx',
        '.zz/d.ts',
        'e.tsx',
        'f.mjs',
        'node_modules/g.ts',
        'h.d.ts',
        'i.json',
      ]) {
        mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
        writeFileSync(path.join(dir, f), '');
      }
      const found = listSourceFiles(dir)
        .map((f) => path.relative(dir, f).split(path.sep).join('/'))
        .sort();
      expect(found).toEqual(['.zz/d.ts', 'a.mts', 'b.cts', 'c.jsx', 'e.tsx', 'f.mjs', 'h.d.ts']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
  it('um fixture violador gera diagnósticos de nível error e o singleton/tx ficam limpos', () => {
    const lock = JSON.parse(readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { version?: string }>;
    };
    expect(lock.packages['node_modules/@biomejs/biome']?.version).toBe(BIOME_VERSION);
    // P3 (parecer 24): binário local do lock, sem npx (que poderia ir à rede).
    expect(existsSync(BIOME_BIN), `${BIOME_BIN} ausente: rode npm ci`).toBe(true);
    const version = spawnSync(BIOME_BIN, ['--version'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
    expect(version.stdout.trim()).toBe(`Version: ${BIOME_VERSION}`);

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
        BIOME_BIN,
        ['lint', `--config-path=${dir}`, '--reporter=github', path.join(dir, 'src')],
        { cwd: ROOT, encoding: 'utf8', timeout: 90_000, shell: process.platform === 'win32' },
      );
      const output = `${res.stdout}\n${res.stderr}`;
      const diags = output
        .split('\n')
        .filter((l) => l.startsWith('::'))
        .map((l) => {
          const m = /^::(\w+) title=([^,]+),file=([^,]+),line=(\d+)/.exec(l);
          return m
            ? {
                level: m[1],
                title: m[2],
                file: decodeURIComponent(m[3]).replace(/\\/g, '/').replace(/^.*?src\//, 'src/'),
                line: Number(m[4]),
                text: l,
              }
            : null;
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      expect(res.status, output).not.toBe(0);
      const plugin = diags.filter((d) => d.title === 'plugin');
      expect(
        plugin.every((d) => d.level === 'error'),
        output,
      ).toBe(true);
      expect(plugin.map((d) => `${d.file}:${d.line}`).sort(), output).toEqual([
        'src/feat/violator.ts:3',
        'src/feat/violator.ts:6',
        'src/feat/violator.ts:8',
      ]);
      expect(plugin.filter((d) => /SQL cru ou transaction/.test(d.text))).toHaveLength(2);
      expect(
        plugin.filter((d) => /new PrismaClient fora de src\/lib\/prisma\.ts/.test(d.text)),
      ).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
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
