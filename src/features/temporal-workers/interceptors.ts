import type { Context as ActivityContext } from '@temporalio/activity';
import type {
  ActivityExecuteInput,
  ActivityInboundCallsInterceptor,
  Next,
} from '@temporalio/worker';
import {
  getTenantId,
  TenantContextMissingError,
  withTenantContext,
} from '../../lib/async-context.js';

export { getTenantId, TenantContextMissingError, withTenantContext };

/**
 * Extracts and validates tenantId or organizationId from an unknown input payload or header.
 */
export function extractTenantId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const obj = payload as Record<string, unknown>;
  const rawId = obj.tenantId ?? obj.organizationId;

  if (typeof rawId === 'string' && rawId.trim().length > 0) {
    return rawId.trim();
  }

  return null;
}

/**
 * Temporal Activity Inbound Calls Interceptor that guarantees strict multi-tenant context.
 * Enforces B-10 and Section 26 multi-tenancy rules: any activity executed without a valid
 * tenantId / organizationId throws TenantContextMissingError immediately.
 */
export class TenantActivityInboundInterceptor implements ActivityInboundCallsInterceptor {
  constructor(protected readonly ctx?: ActivityContext) {}

  async execute(
    input: ActivityExecuteInput,
    next: Next<ActivityInboundCallsInterceptor, 'execute'>,
  ): Promise<unknown> {
    // 1. Check headers first
    let tenantId: string | null = null;
    if (input.headers) {
      const headers = input.headers as unknown as Record<string, unknown>;
      const headerVal =
        typeof (input.headers as any).get === 'function'
          ? (input.headers as any).get('tenant-id') || (input.headers as any).get('organization-id')
          : headers['tenant-id'] ||
            headers['organization-id'] ||
            headers.tenantId ||
            headers.organizationId;

      if (typeof headerVal === 'string' && headerVal.trim().length > 0) {
        tenantId = headerVal.trim();
      }
    }

    // 2. Check input arguments (payload)
    if (!tenantId && input.args && input.args.length > 0) {
      tenantId = extractTenantId(input.args[0]);
    }

    if (!tenantId) {
      throw new TenantContextMissingError(
        'Tenant context missing: organizationId/tenantId is required for Temporal Activity execution',
      );
    }

    return await withTenantContext(tenantId, async () => {
      return await next(input);
    });
  }
}

/**
 * Factory for Temporal Activity Inbound Interceptor.
 */
export function createTenantActivityInboundInterceptor(
  ctx?: ActivityContext,
): ActivityInboundCallsInterceptor {
  return new TenantActivityInboundInterceptor(ctx);
}

/**
 * Higher-order function to wrap any activity function with explicit tenant validation and context.
 */
export function withTenantActivity<TParams extends Record<string, unknown>, TResult>(
  fn: (params: TParams) => Promise<TResult> | TResult,
): (params: TParams) => Promise<TResult> {
  return async (params: TParams): Promise<TResult> => {
    const tenantId = extractTenantId(params);
    if (!tenantId) {
      throw new TenantContextMissingError(
        'Tenant context missing: organizationId/tenantId is required for Temporal Activity execution',
      );
    }
    return await withTenantContext(tenantId, async () => {
      return await fn(params);
    });
  };
}
