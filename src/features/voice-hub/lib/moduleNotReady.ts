/** Shared parser for the fail-closed legacy module gate (`unavailableLegacyModule`). */

export type LegacyVoiceModule = 'voice-hub' | 'outbound' | 'dialer-3cx';

export type ModuleNotReadyPayload = {
  success: false;
  code: 'MODULE_NOT_READY';
  module: LegacyVoiceModule | string;
  error: string;
};

export function isModuleNotReadyPayload(body: unknown): body is ModuleNotReadyPayload {
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  return (
    record.success === false &&
    record.code === 'MODULE_NOT_READY' &&
    typeof record.module === 'string' &&
    typeof record.error === 'string'
  );
}

/**
 * Interprets a fetch Response against the gated Voice Hub / Outbound / Dialer prefixes.
 * Returns a human-readable reason when the module is intentionally unavailable or the
 * response is otherwise unusable. Returns null when the body looks like a successful payload.
 */
export async function readModuleAvailabilityError(
  res: Response,
  body: unknown,
): Promise<string | null> {
  if (isModuleNotReadyPayload(body)) {
    return body.error;
  }
  if (res.status === 503) {
    return 'Serviço de voz temporariamente indisponível (HTTP 503). Nenhuma métrica foi inventada.';
  }
  if (!res.ok) {
    return `Não foi possível carregar os dados de voz (HTTP ${res.status}).`;
  }
  return null;
}
