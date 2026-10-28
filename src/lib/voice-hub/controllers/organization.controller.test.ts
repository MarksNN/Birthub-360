import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findTenantById } from '../repositories/tenantRepository.js';
import { listOrganizationsHandler } from './organization.controller.js';

vi.mock('../repositories/tenantRepository.js', () => ({
  findTenantById: vi.fn(),
}));

function fakeResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('organization.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listOrganizationsHandler', () => {
    it('returns the tenant organization when found', async () => {
      const mockCreatedAt = new Date('2026-01-01T00:00:00.000Z');
      vi.mocked(findTenantById).mockResolvedValue({
        id: 'tenant-123',
        name: 'Acme Corp',
        createdAt: mockCreatedAt,
      } as never);

      const req = { organizationId: 'tenant-123' } as unknown as Request;
      const res = fakeResponse();

      await listOrganizationsHandler(req, res);

      expect(findTenantById).toHaveBeenCalledWith('tenant-123');
      expect(res.json).toHaveBeenCalledWith({
        organizations: [
          {
            id: 'tenant-123',
            name: 'Acme Corp',
            createdAt: mockCreatedAt,
          },
        ],
      });
    });

    it('returns empty organizations array when tenant does not exist', async () => {
      vi.mocked(findTenantById).mockResolvedValue(null);

      const req = { organizationId: 'tenant-missing' } as unknown as Request;
      const res = fakeResponse();

      await listOrganizationsHandler(req, res);

      expect(findTenantById).toHaveBeenCalledWith('tenant-missing');
      expect(res.json).toHaveBeenCalledWith({ organizations: [] });
    });
  });
});
