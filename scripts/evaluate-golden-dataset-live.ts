import {
  loadGoldenDataset,
  validateToolUseCases,
} from '../src/features/intelligence/evaluation/goldenDataset.service.js';
import { evaluateGoldenDataset } from '../src/features/intelligence/evaluation/goldenDataset.scoring.js';
import { GatewayGoldenSemanticJudge } from '../src/features/intelligence/evaluation/goldenDataset.llmJudge.js';
import { runGoldenCaseAgainstProduction } from '../src/features/intelligence/evaluation/goldenDataset.runner.js';

const dataset = loadGoldenDataset();
const toolSchemas = await validateToolUseCases();
const invalidToolFixture = toolSchemas.find((row) => !row.valid);
if (invalidToolFixture) {
  throw new Error(
    `Golden tool fixture inválido: ${invalidToolFixture.caseId}: ${invalidToolFixture.error}`,
  );
}

const observed: Record<string, unknown> = {};
for (const goldenCase of dataset.cases) {
  console.log(`▶ ${goldenCase.id}`);
  observed[goldenCase.id] = await runGoldenCaseAgainstProduction(goldenCase);
  // Intervalo entre chamadas reais para respeitar rate limits (TPM/RPM) dos provedores no CI
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

const useJudge = process.env.GOLDEN_EVAL_USE_LLM_JUDGE !== 'false';
const overallMinimum = Number(process.env.GOLDEN_OVERALL_MINIMUM ?? '0.70');
const categoryMinimum = Number(process.env.GOLDEN_CATEGORY_MINIMUM ?? '0.35');
const caseMinimum = Number(process.env.GOLDEN_CASE_MINIMUM ?? '0.25');
const maxHallucinationRisk = Number(process.env.GOLDEN_MAX_HALLUCINATION_RISK ?? '0.35');

const report = await evaluateGoldenDataset(observed, {
  judge: useJudge ? new GatewayGoldenSemanticJudge() : undefined,
  thresholds: {
    overallMinimum,
    categoryMinimum,
    caseMinimum,
    maxHallucinationRisk,
  },
});

console.table(
  report.cases.map((row) => ({
    case: row.caseId,
    category: row.category,
    score: row.finalScore.toFixed(3),
    passed: row.passed,
    reasons: row.reasons.join('; '),
  })),
);
console.log(
  'Category scores:',
  Object.fromEntries(
    Object.entries(report.categoryScores).map(([category, score]) => [category, score.toFixed(3)]),
  ),
);
console.log(
  `Overall: ${report.overallScore.toFixed(3)} | threshold ${report.thresholds.overallMinimum} | ${report.passed ? 'PASS' : 'FAIL'}`,
);

process.exit(report.passed ? 0 : 1);
