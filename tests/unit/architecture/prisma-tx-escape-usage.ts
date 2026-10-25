import { createHash } from 'node:crypto';
import ts from 'typescript';

// Parecer 24 (#75 P2): o baseline de no-prisma-tx-escape é amarrado a cada uso, não à contagem de
// comentários por arquivo. A supressão do Biome vale por LINHA (a linha seguinte ao comentário),
// então cada `biome-ignore lint/plugin/no-prisma-tx-escape` tem que cobrir exatamente 1 uso da
// regra nessa linha. Cada uso suprimido vira a chave estável `<método>:<hash>`, em que o hash é o
// sha256 (16 hex) do statement que contém o uso, normalizado (só tokens, sem comentários, com
// espaços colapsados). Reformatar não muda a chave, mas trocar o método, mudar o SQL ou o corpo do
// statement, ou acrescentar um segundo uso na linha suprimida, muda.
//
// O casamento de uso replica biome-plugins/no-prisma-tx-escape.grit: `$obj.$prop` com $prop em
// RULE_METHODS e $obj = `prisma`, `$_.prisma` ou um nome pontilhado terminado em prisma/Prisma,
// fora de src/lib/prisma.ts.

export const SUPPRESSION_RE = /biome-ignore(?:-all|-start)?\s+lint\/plugin\/no-prisma-tx-escape\b/g;
export const RULE_METHODS = new Set([
  '$queryRaw',
  '$executeRaw',
  '$queryRawUnsafe',
  '$executeRawUnsafe',
  '$queryRawTyped',
  '$transaction',
  '$runCommandRaw',
]);
export const PRISMA_SINGLETON = 'src/lib/prisma.ts';
const DOTTED_PRISMA_RE = /^(?:[\w$]+\.)*[\w$]*[pP]risma$/;

export type Use = { line: number; method: string; statement: string };
export type Suppression = { line: number; suppressedLine: number; uses: Use[] };
export type FileAnalysis = { uses: Use[]; suppressions: Suppression[] };

function scriptKind(file: string): ts.ScriptKind {
  if (/\.[cm]?tsx$/.test(file)) return ts.ScriptKind.TSX;
  if (/\.[cm]?ts$/.test(file)) return ts.ScriptKind.TS;
  if (/\.jsx$/.test(file)) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function isJsDoc(node: ts.Node): boolean {
  return node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode;
}

function leaves(node: ts.Node, sf: ts.SourceFile, out: ts.Node[] = []): ts.Node[] {
  const children = node.getChildren(sf).filter((c) => !isJsDoc(c));
  if (children.length === 0) out.push(node);
  else for (const c of children) leaves(c, sf, out);
  return out;
}

export function normalizeStatement(node: ts.Node, sf: ts.SourceFile): string {
  return leaves(node, sf)
    .map((t) => t.getText(sf))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function enclosingStatement(node: ts.Node): ts.Node {
  let cur: ts.Node = node;
  while (
    cur.parent &&
    !ts.isSourceFile(cur.parent) &&
    !ts.isBlock(cur.parent) &&
    !ts.isModuleBlock(cur.parent) &&
    !ts.isCaseClause(cur.parent) &&
    !ts.isDefaultClause(cur.parent) &&
    !ts.isClassLike(cur.parent)
  ) {
    cur = cur.parent;
  }
  return cur;
}

function isRuleReceiver(expr: ts.Expression, sf: ts.SourceFile): boolean {
  if (ts.isIdentifier(expr) && expr.text === 'prisma') return true;
  if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'prisma') return true;
  return DOTTED_PRISMA_RE.test(expr.getText(sf).replace(/\s+/g, ''));
}

export function analyzeSource(relPath: string, text: string): FileAnalysis {
  const sf = ts.createSourceFile(relPath, text, ts.ScriptTarget.Latest, true, scriptKind(relPath));
  const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const uses: Use[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      RULE_METHODS.has(node.name.text) &&
      isRuleReceiver(node.expression, sf)
    ) {
      const stmt = enclosingStatement(node);
      uses.push({
        line: lineOf(node.name.getStart(sf)),
        method: node.name.text,
        statement: normalizeStatement(stmt, sf),
      });
    }
    ts.forEachChild(node, visit);
  };
  if (relPath !== PRISMA_SINGLETON) visit(sf);

  // Comentários: trivia antes de cada token (inclui o EOF), sem duplicar.
  const seen = new Set<number>();
  const suppressions: Suppression[] = [];
  for (const tok of [...leaves(sf, sf), sf.endOfFileToken]) {
    for (const c of ts.getLeadingCommentRanges(text, tok.getFullStart()) ?? []) {
      if (seen.has(c.pos)) continue;
      seen.add(c.pos);
      const body = text.slice(c.pos, c.end);
      const n = (body.match(SUPPRESSION_RE) ?? []).length;
      for (let i = 0; i < n; i++) {
        const suppressedLine = lineOf(c.end) + 1;
        suppressions.push({
          line: lineOf(c.pos),
          suppressedLine,
          uses: uses.filter((u) => u.line === suppressedLine),
        });
      }
    }
  }
  return { uses, suppressions };
}

export function useKey(use: Use): string {
  return `${use.method}:${createHash('sha256').update(use.statement).digest('hex').slice(0, 16)}`;
}

/** Problemas por supressão: cada uma tem que cobrir exatamente 1 uso, e nenhum uso pode ter duas. */
export function suppressionProblems(relPath: string, analysis: FileAnalysis): string[] {
  const problems: string[] = [];
  const perLine = new Map<number, number>();
  for (const s of analysis.suppressions) {
    perLine.set(s.suppressedLine, (perLine.get(s.suppressedLine) ?? 0) + 1);
    if (s.uses.length !== 1) {
      problems.push(
        `${relPath}:${s.line}: a supressão cobre ${s.uses.length} usos da regra na linha ${s.suppressedLine} (exigido: exatamente 1)`,
      );
    }
  }
  for (const [line, n] of perLine) {
    if (n > 1) problems.push(`${relPath}:${line}: ${n} supressões para a mesma linha`);
  }
  return problems;
}

/** Chaves dos usos suprimidos (só das supressões válidas), ordenadas. */
export function suppressedUseKeys(analysis: FileAnalysis): string[] {
  return analysis.suppressions
    .filter((s) => s.uses.length === 1)
    .map((s) => useKey(s.uses[0] as Use))
    .sort();
}
