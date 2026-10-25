import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const BASELINE_PATH = path.join(ROOT, 'biome-plugins/no-prisma-tx-escape.baseline.json');
const TX_ESCAPE_GRIT = path.join(ROOT, 'biome-plugins/no-prisma-tx-escape.grit');
const NEW_CLIENT_GRIT = path.join(ROOT, 'biome-plugins/no-new-prisma-client.grit');
const PRISMA_SINGLETON = 'src/lib/prisma.ts';

const SUPPRESSION_RE = /biome-ignore lint\/plugin\/no-prisma-tx-escape\b/g;
const GENERIC_SUPPRESSION_RE =
  /biome-ignore(?:-all|-start)?\s+lint\/plugin(?!\/)|biome-ignore-(?:all|start)\s+lint\/plugin\/no-prisma-tx-escape\b/;
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

  it('não há supressão genérica de plugin que esconda a regra', () => {
    const generic = files
      .filter((file) => GENERIC_SUPPRESSION_RE.test(readFileSync(file, 'utf8')))
      .map(rel);
    expect(generic).toEqual([]);
  });
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
