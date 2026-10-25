import { Prisma, type PrismaClient } from '@prisma/client';
import type { DncRepository } from '../../../application/ports/DncRepository.js';

/**
 * A tabela legada do discador `dnc_list` (phone PK, reason, sem organização)
 * diverge do model Prisma `DncList` (id, organizationId, sem reason). Por isso
 * as queries usam `$queryRaw`/`$executeRaw` com tagged templates
 * (parametrizados), não o Client CRUD. Alinhamento do schema: handoff 17 → 01
 * (onda-enxuta).
 */
export class PgDncRepository implements DncRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async isBlocked(phoneE164: string): Promise<boolean> {
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    const rows = await this.prisma.$queryRaw<{ exists: number }[]>(Prisma.sql`
      SELECT 1 AS exists FROM dnc_list WHERE phone = ${phoneE164} LIMIT 1`);
    return rows.length > 0;
  }

  async add(phoneE164: string, reason: string): Promise<void> {
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO dnc_list (phone, reason)
      VALUES (${phoneE164}, ${reason})
      ON CONFLICT (phone) DO UPDATE SET reason = EXCLUDED.reason`);
  }
}
