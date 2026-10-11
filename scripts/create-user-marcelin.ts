import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

async function main() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.bypass_rls', 'on', true)");

    const email = 'marcelinmark@gmail.com';
    const name = 'Marcelin Mark';
    const rawPassword = process.env.ADMIN_INITIAL_PASSWORD || '00000000';
    const passwordHash = await hashPassword(rawPassword);

    const existingUserRes = await client.query('SELECT id, "organizationId" FROM "user" WHERE email = $1', [email]);
    let userId: string;
    let orgId: string;

    if (existingUserRes.rows.length > 0) {
      userId = existingUserRes.rows[0].id;
      orgId = existingUserRes.rows[0].organizationId;
      console.log('Usuário já existe, atualizando status e senha...');
      await client.query(
        'UPDATE "user" SET "mustChangePassword" = TRUE, "emailVerified" = TRUE, "updatedAt" = NOW() WHERE id = $1',
        [userId],
      );
    } else {
      userId = randomUUID();
      orgId = randomUUID();
      console.log('Criando organização e usuário...');
      await client.query(
        'INSERT INTO "Organization" (id, name, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW())',
        [orgId, 'Birth Hub 360'],
      );

      await client.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", role, "organizationId", "mustChangePassword", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, TRUE, 'ADMIN', $4, TRUE, NOW(), NOW())`,
        [userId, name, email, orgId],
      );
    }

    const accountRes = await client.query(
      'SELECT id FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
      [userId, 'credential'],
    );

    if (accountRes.rows.length === 0) {
      await client.query(
        `INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())`,
        [randomUUID(), userId, userId, passwordHash],
      );
    } else {
      await client.query(
        'UPDATE "account" SET password = $1, "updatedAt" = NOW() WHERE id = $2',
        [passwordHash, accountRes.rows[0].id],
      );
    }

    await client.query('DELETE FROM "session" WHERE "userId" = $1', [userId]);

    await client.query('COMMIT');
    console.log('Usuário marcelinmark@gmail.com configurado com sucesso! (mustChangePassword = TRUE)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao configurar usuário:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

