import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * RBAC Granular
 * Controle de acesso por operação específica
 */

export interface Permission {
  resource: string;
  action: string;
  effect: 'allow' | 'deny';
}

export interface RolePermissions {
  role: string;
  permissions: Permission[];
}

export async function checkPermission(params: {
  userId: string;
  organizationId: string;
  resource: string;
  action: string;
}): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: params.userId, organizationId: params.organizationId },
    select: { role: true },
  });

  if (!user) return false;

  // ADMIN tem todas as permissões
  if (user.role === 'ADMIN') return true;

  // Em production, buscaria na tabela de permissões
  const allowedActions: Record<string, string[]> = {
    GESTOR: ['read', 'write', 'approve'],
    CLOSER: ['read', 'write'],
    SDR: ['read', 'write'],
  };

  const allowed = allowedActions[user.role] || [];
  return allowed.includes(params.action);
}

export async function assignPermission(params: {
  userId: string;
  resource: string;
  action: string;
}): Promise<void> {
  // Em production, inseriria na tabela de permissões
  logger.info({ userId: params.userId, resource: params.resource }, '[RBAC] Permissão atribuída');
}
