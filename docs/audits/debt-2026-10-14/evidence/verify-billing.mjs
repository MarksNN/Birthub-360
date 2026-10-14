// Reprodução forense de função pura. Não importa o app nem conecta rede/banco.
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] || process.cwd();
const source = fs.readFileSync(path.join(root, 'src/lib/voice-hub/services/billingService.ts'), 'utf8');
const match = source.match(/function computePeriodEnd\([\s\S]*?\n\}/);
if (!match) throw new Error('Função original não localizada');
const functionText = match[0].replace(': string','').replace(': Date =','= ').replace(': Date | null','');
const compute = new Function(functionText + '; return computePeriodEnd;')();
for (const input of ['2026-01-31T12:00:00Z','2026-03-31T12:00:00Z','2024-02-29T12:00:00Z']) {
 console.log(JSON.stringify({input,monthly:compute('monthly',new Date(input)).toISOString(),yearly:compute('yearly',new Date(input)).toISOString()}));
}
console.log('Escopo: dívida em função legada; bootstrap atual marca voice-hub indisponível.');
