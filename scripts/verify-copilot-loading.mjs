import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  'src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx',
  'utf8',
);
const spinner = source.indexOf('if (loading) {');
const failure = source.indexOf('if (error || !overview) {');
assert(spinner > 0, 'guarda de loading ausente');
assert(failure > spinner, 'erro inicial continua atrás do spinner');
assert(!source.includes('if (loading || !overview)'));
console.log('PASS: falha na carga inicial alcança o estado de erro e o retry.');
