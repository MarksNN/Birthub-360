/**
 * Guard estático (parecer 15, U1/U4): dentro de callbacks de UoW da outbox
 * (`runDomainTransaction(` / `.withTransaction(`) só pode haver o `tx` — nunca o client estendido.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const FORBIDDEN = [/\bprisma\s*\.\s*[a-zA-Z$]/, /\bAuditService\s*\./, /\blogInbound\s*\(/, /\bwithRlsContext\s*\(/, /\bexecuteWithRls\s*\(/];

/** Extrai o texto entre os parênteses da chamada que começa em `start` (casamento de parênteses). */
function callBody(src: string, start: number): string {
  let depth = 0;
  for (let i = src.indexOf('(', start); i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) return src.slice(start, i + 1);
  }
  return src.slice(start);
}

export function findViolations(src: string): string[] {
  const out: string[] = [];
  const re = /\b(runDomainTransaction|\.withTransaction)\s*\(/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const body = callBody(src, m.index).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const f of FORBIDDEN) if (f.test(body)) out.push(`${m[1]} @${m.index}: ${f}`);
  }
  return out;
}

describe('REMED-05: nenhum uso do client estendido dentro da UoW', () => {
  it('o detector pega prisma.* e helpers proibidos, e aceita só tx', () => {
    expect(findViolations('await runDomainTransaction(async ({ tx }) => { await prisma.lead.update({}) })')).toHaveLength(1);
    expect(findViolations('await mesh.withTransaction(uow, async () => { await logInbound({}) })')).toHaveLength(1);
    expect(findViolations('await runDomainTransaction(async ({ tx }) => { await tx.lead.update({}) })')).toHaveLength(0);
  });

  it('nenhum arquivo de src/ viola a regra', () => {
    const files = execSync("git ls-files 'src/**/*.ts' 'worker.ts'", { encoding: 'utf8' }).split('\n').filter(Boolean);
    const violations: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (!/runDomainTransaction\s*\(|\.withTransaction\s*\(/.test(src)) continue;
      for (const v of findViolations(src)) violations.push(`${f}: ${v}`);
    }
    expect(violations).toEqual([]);
  });
});
