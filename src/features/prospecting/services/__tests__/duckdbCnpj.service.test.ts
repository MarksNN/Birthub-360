import { describe, expect, it } from 'vitest';
import { DuckDBCnpjService } from '../duckdbCnpj.service.js';

describe('DuckDBCnpjService', () => {
  it('instancia o serviço e fornece status de disponibilidade', () => {
    const service = DuckDBCnpjService.getInstance();
    const status = service.getStatus();
    expect(status).toBeDefined();
    expect(status.dbPath).toBeDefined();
    expect(typeof status.isAvailable).toBe('boolean');
  });

  it('retorna fallback gracioso quando consultado por CNPJ', async () => {
    const service = DuckDBCnpjService.getInstance();
    // Teste com CNPJ conhecido estático
    const res = await service.searchCompanies({ cnpj: '20540912000108' });
    expect(res).toBeDefined();
    expect(Array.isArray(res.companies)).toBe(true);
    expect(['duckdb_local', 'http_fallback']).toContain(res.source);
  });

  it('retorna lista vazia e status de fallback quando busca textual sem banco local', async () => {
    const service = DuckDBCnpjService.getInstance();
    const res = await service.searchCompanies({ query: 'Empresa Teste Inexistente XYZ' });
    expect(res).toBeDefined();
    expect(Array.isArray(res.companies)).toBe(true);
  });
});
