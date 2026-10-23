import { config } from 'dotenv';
import path from 'path';
import { Client } from 'pg';

// Load test environment variables before Prisma initializes
config({ path: path.resolve(process.cwd(), '.env.test') });

// Seatbelt: se .env.test não existir (ou estiver desatualizado) — por exemplo, alguém rodando
// `vitest run -c vitest.integration.config.ts` direto, sem passar pelo `pretest:integration` que
// prepara o arquivo — DATABASE_URL cai de volta pro que já estiver no processo, que numa máquina
// de dev normalmente aponta pro banco de desenvolvimento de verdade ("prospectordb"). O afterAll()
// abaixo faz `prisma.organization.deleteMany()` SEM where; rodar isso contra o banco de dev real
// apaga todas as organizações e, por causa do ON DELETE CASCADE em BitrixConnection/BitrixSyncRule
// (diferente do ON DELETE SET NULL em Company/Contact/Lead), destrói silenciosamente toda conexão
// Bitrix24 salva. Recusar rodar fora de um banco cujo nome sinalize claramente "teste" é mais
// seguro do que confiar que .env.test sempre vai existir e estar correto.
const databaseUrl = process.env.DATABASE_URL ?? '';
if (!/\/[\w-]*test[\w-]*(\?|$)/i.test(databaseUrl)) {
  throw new Error(
    `Testes de integração recusaram rodar: DATABASE_URL não aponta para um banco de teste isolado ` +
      `(esperado um nome de banco contendo "test", ex: "prospectordb_test"; recebido "${databaseUrl || '(vazio)'}"). ` +
      `Rode via "npm run test:integration" (que prepara .env.test automaticamente) em vez de invocar o vitest direto.`,
  );
}

import { vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';

// Mock meilisearch completely so Prisma triggers won't fail
vi.mock('../../src/lib/search/index.js', () => ({
  meili: {
    index: () => ({
      addDocuments: vi.fn().mockResolvedValue({}),
      updateDocuments: vi.fn().mockResolvedValue({}),
      deleteDocuments: vi.fn().mockResolvedValue({}),
    }),
  },
}));

import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';

// REMED-06 v5: prospector_app não tem DELETE em Organization. Os testes limpam org por
// id fixo antes de recriar; sem o DELETE a suíte quebra no primeiro deleteMany. O fallback
// usa o owner do cluster de teste (o mesmo papel do bootstrap), só quando o app recebe 42501.
// Testes que provam o REVOKE usam SQL cru, não este método.
const originalOrgDeleteMany = prisma.organization.deleteMany.bind(prisma.organization);
const originalOrgDelete = prisma.organization.delete.bind(prisma.organization);

function testOwnerDatabaseUrl(appUrl: string): string | null {
  if (process.env.MIGRATOR_DATABASE_URL) return process.env.MIGRATOR_DATABASE_URL;
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  const replacements: Array<[string, string]> = [
    ['prospector_app:ci_app_test_pass', 'prospector_migrator:ci_migrator_test_pass'],
    ['prospector_app:ci_app_test_pass', 'prospector:prospector_test_pass'],
    ['prospector_app:prospector_app_pass', 'prospector_migrator:prospector_migrator_pass'],
    ['prospector_app:prospector_app_pass', 'prospector:prospector_test_pass'],
  ];
  for (const [from, to] of replacements) {
    if (appUrl.includes(from)) return appUrl.replace(from, to);
  }
  return null;
}

function isOrgDeleteDenied(error: unknown): boolean {
  return /permission denied for table "?Organization"?|42501/.test(String((error as Error)?.message ?? error));
}

async function deleteOrganizationsAsOwner(args?: {
  where?: { id?: string | { in?: string[] } };
}): Promise<{ count: number }> {
  const url = testOwnerDatabaseUrl(databaseUrl);
  if (!url) {
    throw new Error('prospector_app sem DELETE em Organization e sem URL de owner para limpar o banco de teste');
  }
  const where = args?.where;
  let targetIds: string[] = [];
  if (typeof where?.id === 'string') {
    targetIds = [where.id];
  } else if (where?.id && Array.isArray(where.id.in)) {
    targetIds = where.id.in;
  } else if (where && Object.keys(where).length > 0) {
    throw new Error('organization.deleteMany: filtro não suportado no fallback de owner');
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    // Permite bypass de RLS na conexão do owner para operações administrativas de teste
    await client.query(`SELECT set_config('app.bypass_rls', 'on', false)`).catch(() => {});

    // Se nenhum filtro foi fornecido, descobre todos os IDs de Organization existentes
    if (targetIds.length === 0) {
      const res = await client.query<{ id: string }>('SELECT id FROM "Organization"');
      targetIds = res.rows.map((r) => r.id);
    }

    if (targetIds.length === 0) return { count: 0 };

    // Para cada organização, limpa as tabelas com FK RESTRICT ou triggers de retenção
    for (const orgId of targetIds) {
      // Seta a flag LGPD oficial (ADR-006 / migration 20261021000000) para permitir DELETE na cadeia desta org
      await client.query(`SELECT set_config('app.lgpd_chain_retention_org', $1, false)`, [orgId]);
      await client.query(`DELETE FROM "ConsentAuditRecord" WHERE "organizationId" = $1`, [orgId]).catch(() => {});
      await client.query(`DELETE FROM "ConsentAuditChainHead" WHERE "organizationId" = $1`, [orgId]).catch(() => {});
      await client.query(`DELETE FROM "user" WHERE "organizationId" = $1`, [orgId]).catch(() => {});
    }

    const deleted = await client.query('DELETE FROM "Organization" WHERE id = ANY($1::text[])', [targetIds]);
    return { count: deleted.rowCount ?? 0 };
  } finally {
    await client.end();
  }
}

prisma.organization.deleteMany = (async (args?: { where?: { id?: string | { in?: string[] } } }) => {
  try {
    return await originalOrgDeleteMany(args as never);
  } catch (error) {
    if (!isOrgDeleteDenied(error)) throw error;
    return deleteOrganizationsAsOwner(args);
  }
}) as typeof prisma.organization.deleteMany;

prisma.organization.delete = (async (args: { where: { id?: string; [key: string]: unknown } }) => {
  try {
    return await originalOrgDelete(args as never);
  } catch (error) {
    if (!isOrgDeleteDenied(error)) throw error;
    if (typeof args?.where?.id === 'string') {
      await deleteOrganizationsAsOwner({ where: { id: args.where.id } });
      return { id: args.where.id } as never;
    }
    throw error;
  }
}) as typeof prisma.organization.delete;

// Roda fora de qualquer request HTTP, então não há tenantId nem sessão do Better Auth por trás
// dessas queries — sem bypassRls elas seriam bloqueadas pelas mesmas policies de FORCE ROW LEVEL
// SECURITY que protegem Organization/User em produção (ver src/lib/async-context.ts).
const withRlsBypass = <T>(fn: () => Promise<T>): Promise<T> =>
  requestContext.run({ bypassRls: true }, fn);

// Real database cleanup for integration tests.
//
// ITEM-02 (remediação de dívida técnica P0): Company/Contact/Activity/Note/TimelineEvent NÃO estão
// no allowlist de bypass (BYPASS_RLS_ALLOWED_MODELS, src/lib/prisma.ts) — a RLS real dessas tabelas
// fechou pra bypass, tanto leitura quanto escrita (migration
// 20260825120000_scope_rls_bypass_to_bootstrap_allowlist). Um `deleteMany()` sob bypass, sem
// `where`, agora afeta 0 linhas silenciosamente nessas tabelas (RLS nega por falta de tenant), o
// que quebraria a limpeza global entre testes de toda a suíte. `Lead` continua no allowlist, mas
// roda no mesmo laço por tenant por consistência (evita depender de dois caminhos diferentes).
// `Organization` continua no allowlist — usada aqui só para descobrir QUAIS tenants existem no
// banco de teste no momento (a mesma descoberta cross-tenant já legítima em outros bootstraps,
// ver src/lib/prisma.ts), nunca para ler/escrever dado de negócio de um tenant.
const cleanDatabase = async () => {
  const orgs = await withRlsBypass(() => prisma.organization.findMany({ select: { id: true } }));
  for (const { id: tenantId } of orgs) {
    await requestContext.run({ tenantId }, async () => {
      await prisma.timelineEvent.deleteMany();
      await prisma.activity.deleteMany();
      await prisma.note.deleteMany();
      await prisma.lead.deleteMany();
      await prisma.contact.deleteMany();
      await prisma.company.deleteMany();
    });
  }
};

const seedDatabase = async () =>
  withRlsBypass(async () => {
    // Add default test organization to resolve foreign key constraints
    const exists = await prisma.organization.findUnique({ where: { id: 'test-org-id' } });
    if (!exists) {
      await prisma.organization.create({
        data: { id: 'test-org-id', name: 'Test Org' },
      });
    }
  });

beforeAll(async () => {
  await seedDatabase();
  await cleanDatabase();
});

// A maioria dos testes de integração chama use-cases/repositórios direto (sem passar pelo
// Express), então não há authenticateToken pra popular o requestContext com o tenant, como
// acontece numa requisição real. enterWith (ao contrário de run) não precisa de um callback
// envolvendo o teste inteiro — aplica o tenant padrão pro resto da execução do teste atual, o
// suficiente pra RLS deixar passar as queries tenant-scoped que esses testes exercitam. Testes que
// precisam de outro tenant ou de bypass (ex.: tests/integration/tenant-isolation-db001.test.ts)
// sobrescrevem isso explicitamente com requestContext.run(...).
beforeEach(() => {
  requestContext.enterWith({ tenantId: 'test-org-id' });
});

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await withRlsBypass(async () => {
    try {
      await prisma.user.deleteMany();
    } catch (error) {
      void error;
    }
    // REMED-06 v5 (#35): prospector_app não tem mais DELETE em Organization (offboarding só como
    // migrator — ADR-006). As orgs de teste ficam no banco descartável de teste; o cleanDatabase()
    // acima já limpou os dados de negócio por tenant. Qualquer outro erro continua quebrando.
    try {
      await prisma.organization.deleteMany();
    } catch (error) {
      if (!/permission denied for table Organization|42501/.test(String((error as Error)?.message ?? error))) throw error;
    }
  });
  await prisma.$disconnect();
});
