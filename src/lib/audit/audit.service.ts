import { logger } from '../logger.js';
import { isInActiveTransaction, prisma } from '../prisma.js';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'IMPORT'
  | 'EXPORT'
  | 'PERMISSION_CHANGE'
  | 'ROLE_CHANGE'
  | 'API_KEY_CREATED'
  | 'WORKFLOW_EXECUTED'
  | 'AGENT_EXECUTED'
  | 'INTEGRATION_CONNECTED'
  | 'INTEGRATION_EVENT_DISCARDED';

export interface AuditLogParams {
  action: AuditAction;
  entity: string;
  entityId?: string;
  actorId?: string;
  tenantId?: string;
  organizationId?: string;
  ipAddress?: string;
  device?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}

export const AuditService = {
  async log(params: AuditLogParams): Promise<void> {
    try {
      const details = JSON.stringify({
        device: params.device,
        beforeState: params.beforeState,
        afterState: params.afterState,
      });

      await prisma.auditLog.create({
        data: {
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          actorId: params.actorId,
          tenantId: params.tenantId || params.organizationId || '',
          ipAddress: params.ipAddress,
          details: details,
        },
      });
    } catch (error: any) {
      logger.error({ err: error, auditParams: params }, 'Failed to save audit log');
      // X1 (parecer 15 #40): dentro de runInTransaction a falha já abortou o tx no Postgres.
      // Engolir esconderia a causa (25P02 depois) ou viraria COMMIT→ROLLBACK silencioso. Relança:
      // não existe escrita sem trilha. Fora do tx mantém o comportamento best-effort.
      if (isInActiveTransaction()) throw error;
    }
  },
};
