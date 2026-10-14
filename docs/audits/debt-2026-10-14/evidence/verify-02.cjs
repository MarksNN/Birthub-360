// Forensic reproduction only. Reads sources; no database, network or product writes.
// Usage: node verify-02.cjs [source-root] (default: current working directory).
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const sourceRoot = path.resolve(process.argv[2] || process.cwd());
const files = {
  controller: 'src/features/analytics/presentation/AnalyticsController.ts',
  repository: 'src/features/companies/infra/PrismaCompanyRepository.ts',
};
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [
  key, fs.readFileSync(path.join(sourceRoot, file), 'utf8'),
]));

function between(text, start, end) {
  const first = text.indexOf(start);
  const last = text.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Source extraction markers missing: ${start}`);
  return text.slice(first, last);
}

const segment = between(source.controller, '  getOverview =', '  getDashboard =');
const bodyStart = segment.indexOf('=> {');
const bodyEnd = segment.lastIndexOf('\n  };');
assert.ok(bodyStart >= 0 && bodyEnd > bodyStart, 'getOverview body markers missing');
// Remove only TypeScript casts; keep the original production function body.
const overviewBody = segment.slice(bodyStart + 4, bodyEnd).replaceAll(' as AuthRequest', '');
const overview = new Function(`return async function(req,res){${overviewBody}}`)();

let repositoryBody = between(
  source.repository, '    const where: Prisma.CompanyWhereInput', '\n  async findById',
);
const repositoryEnd = repositoryBody.lastIndexOf('\n  }');
assert.ok(repositoryEnd > 0, 'Repository body closing marker missing');
repositoryBody = repositoryBody.slice(0, repositoryEnd)
  .replace('const where: Prisma.CompanyWhereInput', 'const where')
  .replace(' as Company[]', '');
const repositoryFactory = new Function(
  'env', 'searchCompanyIds', 'prisma', 'serializeCompanyStatus',
  `return async function(organizationId,query,page=1,limit=50){${repositoryBody}}`,
);

const results = [];
function record(name, detail) { results.push({ name, result: 'PASS', detail }); }
function responseRecorder() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

const records = Array.from({ length: 45 }, (_, index) => ({
  id: String(index), status: 'synthetic', organizationId: 'org-synthetic',
}));
// These mocks exercise source control flow, not SQL/Meilisearch implementation.
function listWith(searchIds) {
  function matching(where) {
    return records.filter(row => row.organizationId === where.organizationId &&
      (!where.id || where.id.in.includes(row.id)));
  }
  const prisma = {
    company: {
      findMany: async ({ where, skip, take }) => matching(where).slice(skip, skip + take),
      count: async ({ where }) => matching(where).length,
    },
    $transaction: async promises => Promise.all(promises),
  };
  return repositoryFactory({ ENABLE_SEARCH: true }, searchIds, prisma, row => row);
}

(async () => {
  const expected = { totalCompanies: 7 };
  let response = responseRecorder();
  await overview.call({ analyticsUseCases: { overview: async () => expected } },
    { user: { organizationId: 'org-synthetic' } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data, expected);
  record('Positive: analytics successful aggregation', { status: 200, totalCompanies: 7 });

  response = responseRecorder();
  await overview.call({ analyticsUseCases: { overview: async () => {
    throw new Error('synthetic-db-down');
  } } }, { user: { organizationId: 'org-synthetic' } }, response);
  // Assert current defect; PASS confirms its reproduction, never product correctness.
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.totalCompanies, 0);
  record('Negative: analytics error masked as success (DEBT-UX-003)', {
    status: response.statusCode, success: response.body.success,
    totalCompanies: response.body.data.totalCompanies,
  });

  const list = listWith(async (_org, _query, limit) => records.slice(0, limit).map(row => row.id));
  const first = await list('org-synthetic', 'query', 1, 20);
  const second = await list('org-synthetic', 'query', 2, 20);
  assert.equal(first.data.length, 20);
  assert.equal(second.data.length, 0);
  assert.equal(first.meta.total, 20);
  record('Negative: full-text pagination truncation (DEBT-UX-002)', {
    sourceHits: 45, limit: 20, page1: first.data.length,
    page2: second.data.length, reportedTotal: first.meta.total, expectedTotal: 45,
  });

  const withoutSearch = await list('org-synthetic', undefined, 2, 20);
  assert.equal(withoutSearch.data.length, 20);
  assert.equal(withoutSearch.meta.total, 45);
  record('Positive: unfiltered pagination control', { page2: 20, reportedTotal: 45 });

  const fallback = await listWith(async () => null)('org-synthetic', 'query', 2, 20);
  assert.equal(fallback.data.length, 20);
  assert.equal(fallback.meta.total, 45);
  record('Positive: unavailable full-text provider uses SQL fallback control', {
    page2: 20, reportedTotal: 45, limitation: 'Mock assumes all records match fallback OR; no SQL executed.',
  });

  const empty = await listWith(async () => [])('org-synthetic', 'query', 1, 20);
  assert.equal(empty.data.length, 0);
  assert.equal(empty.meta.total, 0);
  record('Positive: legitimate zero search hits remain empty', { count: 0, total: 0 });

  console.log(JSON.stringify({
    sourceRoot,
    sourceHashes: Object.fromEntries(Object.entries(source).map(([key, text]) => [
      files[key], crypto.createHash('sha256').update(text).digest('hex'),
    ])),
    results,
    limitations: [
      'Executes extracted current source bodies after removing TypeScript syntax only.',
      'Dependencies are synthetic mocks; no HTTP, database, browser or external provider.',
      'PASS for negative cases means confirmed current defect, not a passed release gate.',
      'SQL ordering, relevance, tenancy and actual Meilisearch behavior are not validated.',
    ],
  }, null, 2));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
