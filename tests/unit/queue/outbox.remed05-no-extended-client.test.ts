/**
 * Guard estático (parecer 15, U1/U4 + G2): dentro de callbacks de UoW da outbox só pode haver o `tx`.
 * Cobre: `prisma.*`, aliases (`this.prisma`, `deps.prisma`, `const db = prisma`, imports renomeados,
 * `basePrisma`), helpers do client estendido e `uow.run(` direto fora do mesh/outbox.
 * Limite conhecido: não segue chamadas indiretas para outros arquivos (service/repository que use
 * `prisma.*`). A barreira de runtime é o G1 do 01/15 — sem ele, o modo prisma não pode ser ligado.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Remove comentários e o CONTEÚDO de strings/template literals (mantém as aspas), para o casamento de parênteses. */
export function stripLiterals(src: string): string {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      out += c;
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++;
        i++;
      }
      out += c;
      continue;
    }
    out += c;
  }
  return out;
}

function aliasesOf(src: string): string[] {
  const names = new Set(['prisma', 'basePrisma']);
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*\/prisma(?:\.js)?['"]/g)) {
    for (const part of m[1].split(',')) {
      const mm = part.trim().match(/^(?:type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
      if (mm && /prisma/i.test(mm[1])) names.add(mm[2] ?? mm[1]);
    }
  }
  for (const m of src.matchAll(/\b(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?=\s*(?:prisma|basePrisma)\b/g)) names.add(m[1]);
  return [...names];
}

function callBody(src: string, start: number): string {
  let depth = 0;
  for (let i = src.indexOf('(', start); i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) return src.slice(start, i + 1);
  }
  return src.slice(start);
}

const UOW_CALL = /\b(runDomainTransaction|\.withTransaction|\b\w*(?:uow|Uow|unitOfWork|UnitOfWork)\w*\s*\.\s*run)\s*\(/g;
const HELPERS = [/\bAuditService\s*\./, /\blogInbound\s*\(/, /\bwithRlsContext\s*\(/, /\bexecuteWithRls\s*\(/];

export function findViolations(raw: string): string[] {
  const src = stripLiterals(raw);
  const aliases = aliasesOf(raw);
  const forbidden = [
    new RegExp(`(?<![\\w.])(?:${aliases.join('|')})\\s*\\.\\s*[\\w$]`),
    /\.\s*prisma\s*\.\s*[\w$]/, // this.prisma / deps.prisma / ctx.prisma
    ...HELPERS,
  ];
  const out: string[] = [];
  for (const m of src.matchAll(UOW_CALL)) {
    const body = callBody(src, m.index ?? 0);
    for (const f of forbidden) if (f.test(body)) out.push(`${m[1]} @${m.index}: ${f}`);
  }
  return out;
}

/** `uow.run(` / `container.resolve('DomainEventOutboxUnitOfWork').run(` fora do mesh/outbox. */
export function findDirectUowRun(raw: string): string[] {
  const src = stripLiterals(raw);
  const out: string[] = [];
  for (const m of src.matchAll(/\b\w*(?:uow|Uow|unitOfWork|UnitOfWork)\w*\s*\.\s*run\s*\(/g)) out.push(m[0]);
  if (/DomainEventOutboxUnitOfWork['"]?\s*\)\s*(?:as\s+[^.;]+)?\)?\s*\.\s*run\s*\(/.test(raw.replace(/\s+/g, ' ')))
    out.push('resolve(DomainEventOutboxUnitOfWork).run(');
  return out;
}

const ALLOWED_RUN_FILES = [/^src\/lib\/queue\/outbox\//, /^src\/lib\/queue\/domainEventMesh\.service\.ts$/];

describe('REMED-05: nenhum uso do client estendido dentro da UoW (G2)', () => {
  it('detector: prisma.*, aliases, this/deps.prisma, imports renomeados e helpers', () => {
    const v = (s: string) => findViolations(s).length;
    expect(v('await runDomainTransaction(async ({ tx }) => { await prisma.lead.update({}) })')).toBe(1);
    expect(v('await mesh.withTransaction(uow, async () => { await this.prisma.lead.update({}) })')).toBe(1);
    expect(v('await mesh.withTransaction(uow, async () => { await deps.prisma.contact.create({}) })')).toBe(1);
    expect(v("import { prisma as db } from '../../lib/prisma.js';\nawait runDomainTransaction(async () => { await db.lead.update({}) })")).toBe(1);
    expect(v("const client = prisma;\nawait runDomainTransaction(async () => { await client.lead.findMany() })")).toBe(1);
    expect(v('await runDomainTransaction(async () => { await basePrisma.lead.update({}) })')).toBe(1);
    expect(v('await mesh.withTransaction(uow, async () => { await logInbound({}) })')).toBe(1);
    expect(v('await unitOfWork.run(async ({ tx }) => { await prisma.lead.update({}) })')).toBe(1);
    // strings/template com ")" não quebram o casamento de parênteses
    expect(v('await runDomainTransaction(async ({ tx }) => { const s = ")"; await prisma.lead.update({}) })')).toBe(1);
    expect(v('await runDomainTransaction(async ({ tx }) => { logger.info(`fim )`); await tx.lead.update({}) })')).toBe(0);
    expect(v('await runDomainTransaction(async ({ tx }) => { await tx.lead.update({}) })')).toBe(0);
    expect(v('await runDomainTransaction(async ({ tx }) => { await tx.auditLog.create({ data: { entity: "prisma.lead" } }) })')).toBe(0);
  });

  it('detector: uow.run direto e resolve(DomainEventOutboxUnitOfWork).run', () => {
    expect(findDirectUowRun('await uow.run(async () => {})')).toHaveLength(1);
    expect(findDirectUowRun("await container.resolve('DomainEventOutboxUnitOfWork').run(async () => {})")).toHaveLength(1);
    expect(findDirectUowRun('await mesh.withTransaction(uow, fn)')).toHaveLength(0);
  });

  it('nenhum arquivo de src/ (e worker.ts) viola a regra', () => {
    const files = execSync("git ls-files 'src/**/*.ts' 'worker.ts' 'server.ts'", { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    const violations: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const v of findViolations(src)) violations.push(`${f}: ${v}`);
      if (!ALLOWED_RUN_FILES.some((r) => r.test(f))) for (const v of findDirectUowRun(src)) violations.push(`${f}: uow.run direto: ${v}`);
    }
    expect(violations).toEqual([]);
  });
});
