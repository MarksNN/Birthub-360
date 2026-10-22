import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PgBouncer Configuration & Connection Pooling (Passo 027)', () => {
  const iniPath = resolve(__dirname, '../../../docker/pgbouncer/pgbouncer.ini');

  it('arquivo docker/pgbouncer/pgbouncer.ini deve existir', () => {
    expect(existsSync(iniPath)).toBe(true);
  });

  it('deve configurar pool_mode = transaction para isolamento seguro', () => {
    const content = readFileSync(iniPath, 'utf-8');
    expect(content).toMatch(/pool_mode\s*=\s*transaction/i);
  });

  it('deve conter server_reset_query = DISCARD ALL para evitar vazamento de variáveis de sessão entre tenants', () => {
    const content = readFileSync(iniPath, 'utf-8');
    expect(content).toMatch(/server_reset_query\s*=\s*DISCARD ALL/i);
  });

  it('deve suportar concorrência mínima de 100 clientes (max_client_conn >= 100)', () => {
    const content = readFileSync(iniPath, 'utf-8');
    const match = content.match(/max_client_conn\s*=\s*(\d+)/i);
    expect(match).not.toBeNull();
    const maxClientConn = Number.parseInt(match![1], 10);
    expect(maxClientConn).toBeGreaterThanOrEqual(100);
  });

  it('deve usar autenticação segura scram-sha-256', () => {
    const content = readFileSync(iniPath, 'utf-8');
    expect(content).toMatch(/auth_type\s*=\s*scram-sha-256/i);
  });

  it('deve definir tamanho padrão de pool proporcional (default_pool_size)', () => {
    const content = readFileSync(iniPath, 'utf-8');
    const match = content.match(/default_pool_size\s*=\s*(\d+)/i);
    expect(match).not.toBeNull();
    const defaultPoolSize = Number.parseInt(match![1], 10);
    expect(defaultPoolSize).toBeGreaterThanOrEqual(10);
  });
});
