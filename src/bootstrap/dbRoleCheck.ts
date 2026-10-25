/**
 * Check de boot do papel de banco (Agente 15, dívida C / PR #39).
 *
 * Em produção a aplicação ENCERRA se o usuário da conexão (`current_user`):
 *   - for superusuário (RLS nunca se aplica a superuser);
 *   - tiver `rolbypassrls`;
 *   - for dono do schema `public` ou de qualquer tabela/view/sequence de negócio em `public`
 *     (dono pode `DISABLE/NO FORCE ROW LEVEL SECURITY`, `DROP POLICY`...);
 *   - for (ou herdar) `prospector_migrator`.
 * Exceção opcional, por config: tabelas do LangGraph (`checkpoints`, `checkpoint_writes`,
 * `checkpoint_blobs`, `checkpoint_migrations`) quando `DB_ROLE_CHECK_ALLOW_CHECKPOINT_OWNERSHIP=1`
 * — só enquanto o PR #39 mantiver essa exceção. Lista fechada, sem LIKE.
 * Fora de produção: apenas avisa (logger.warn).
 */

export const MIGRATOR_ROLE = 'prospector_migrator';

export const LANGGRAPH_CHECKPOINT_TABLES: readonly string[] = Object.freeze([
  'checkpoints',
  'checkpoint_writes',
  'checkpoint_blobs',
  'checkpoint_migrations',
]);

export interface DbRoleQueryExecutor {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

export interface DbRoleFacts {
  currentUser: string;
  isSuperuser: boolean;
  bypassRls: boolean;
  memberOfMigrator: boolean;
  ownsPublicSchema: boolean;
  ownedRelations: string[];
}

export interface DbRoleCheckResult {
  ok: boolean;
  facts: DbRoleFacts;
  violations: string[];
}

export class DbRoleCheckError extends Error {
  constructor(readonly violations: string[]) {
    super(`DB role check falhou: ${violations.join('; ')}`);
    this.name = 'DbRoleCheckError';
  }
}

const ROLE_SQL = `
SELECT current_user::text AS "currentUser",
       r.rolsuper AS "isSuperuser",
       r.rolbypassrls AS "bypassRls",
       EXISTS (
         SELECT 1 FROM pg_catalog.pg_roles m
          WHERE m.rolname = $1 AND pg_catalog.pg_has_role(current_user, m.oid, 'MEMBER')
       ) AS "memberOfMigrator",
       EXISTS (
         SELECT 1 FROM pg_catalog.pg_namespace n
          WHERE n.nspname = 'public' AND n.nspowner = r.oid
       ) AS "ownsPublicSchema"
  FROM pg_catalog.pg_roles r
 WHERE r.rolname = current_user`;

const OWNED_SQL = `
SELECT c.relname::text AS relname
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
 WHERE c.relnamespace = 'public'::regnamespace
   AND c.relkind IN ('r','p','v','m','S','f')
   AND r.rolname = current_user
   AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d
                    WHERE d.classid = 'pg_catalog.pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
 ORDER BY 1`;

export async function collectDbRoleFacts(db: DbRoleQueryExecutor): Promise<DbRoleFacts> {
  const rows = await db.$queryRawUnsafe<Array<Omit<DbRoleFacts, 'ownedRelations'>>>(
    ROLE_SQL,
    MIGRATOR_ROLE,
  );
  const row = rows[0];
  if (!row) throw new DbRoleCheckError(['current_user não encontrado em pg_roles']);
  const owned = await db.$queryRawUnsafe<Array<{ relname: string }>>(OWNED_SQL);
  return {
    currentUser: String(row.currentUser),
    isSuperuser: row.isSuperuser === true,
    bypassRls: row.bypassRls === true,
    memberOfMigrator: row.memberOfMigrator === true,
    ownsPublicSchema: row.ownsPublicSchema === true,
    ownedRelations: owned.map((o) => String(o.relname)),
  };
}

export function evaluateDbRoleFacts(
  facts: DbRoleFacts,
  opts: { allowCheckpointOwnership: boolean; allowOwnership?: boolean },
): string[] {
  const v: string[] = [];
  if (facts.isSuperuser) v.push(`papel "${facts.currentUser}" é SUPERUSER`);
  if (facts.bypassRls) v.push(`papel "${facts.currentUser}" tem BYPASSRLS`);
  if (facts.memberOfMigrator) v.push(`papel "${facts.currentUser}" é/herda ${MIGRATOR_ROLE}`);
  if (!opts.allowOwnership) {
    if (facts.ownsPublicSchema) v.push(`papel "${facts.currentUser}" é dono do schema public`);
    const allowed = new Set(opts.allowCheckpointOwnership ? LANGGRAPH_CHECKPOINT_TABLES : []);
    const business = facts.ownedRelations.filter((r) => !allowed.has(r));
    if (business.length > 0) {
      const sample = business.slice(0, 10).join(', ');
      v.push(
        `papel "${facts.currentUser}" é dono de ${business.length} objeto(s) em public: ${sample}${business.length > 10 ? ', …' : ''}`,
      );
    }
  }
  return v;
}

export interface DbRoleCheckOptions {
  env?: NodeJS.ProcessEnv;
  logger?: { warn: (o: unknown, m?: string) => void; info: (o: unknown, m?: string) => void };
}

/**
 * Executa o check. Em produção lança `DbRoleCheckError` (o chamador encerra o processo);
 * fora dela só registra aviso. Falha ao consultar o catálogo em produção também é fatal.
 */
export async function assertDbRoleIsLeastPrivilege(
  db: DbRoleQueryExecutor,
  opts: DbRoleCheckOptions = {},
): Promise<DbRoleCheckResult | null> {
  const env = opts.env ?? process.env;
  const isProduction = env.NODE_ENV === 'production';
  const allowCheckpointOwnership = env.DB_ROLE_CHECK_ALLOW_CHECKPOINT_OWNERSHIP === '1';
  const allowOwnership =
    env.DB_ROLE_CHECK_ALLOW_OWNERSHIP === '1' || env.DB_ROLE_CHECK_STRICT === '0';
  let facts: DbRoleFacts;
  try {
    facts = await collectDbRoleFacts(db);
  } catch (err) {
    if (isProduction && env.DB_ROLE_CHECK_STRICT !== '0') {
      throw err instanceof DbRoleCheckError
        ? err
        : new DbRoleCheckError([
            `não foi possível verificar o papel do banco: ${(err as Error).message}`,
          ]);
    }
    opts.logger?.warn({ err }, '[db-role-check] não foi possível verificar o papel do banco');
    return null;
  }
  const violations = evaluateDbRoleFacts(facts, { allowCheckpointOwnership, allowOwnership });
  const result = { ok: violations.length === 0, facts, violations };
  if (!result.ok) {
    if (isProduction && env.DB_ROLE_CHECK_STRICT !== '0') throw new DbRoleCheckError(violations);
    opts.logger?.warn(
      { violations, currentUser: facts.currentUser },
      '[db-role-check] papel do banco com privilégio excessivo (aviso)',
    );
  } else {
    opts.logger?.info(
      { currentUser: facts.currentUser },
      '[db-role-check] papel do banco OK (sem superuser/BYPASSRLS/posse)',
    );
  }
  return result;
}
