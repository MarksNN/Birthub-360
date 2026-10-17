import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/features/analytics/presentation/AnalyticsController.ts', 'utf8');
const catches = source.match(/catch \([^)]*\) \{[\s\S]*?\n  \}/g) || [];
assert(catches.length >= 3, 'catches de analytics ausentes');
for (const block of catches) {
  assert(block.includes('next(error)'), block);
  assert(!block.includes('success: true'), block);
}
assert(source.includes('res.status(200).json') || source.includes('res.json({ success: true'));
console.log('PASS: falha de analytics propaga next(error); resposta 200 permanece no caminho de sucesso.');
