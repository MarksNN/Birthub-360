// Resposta padrão das tools universais quando a credencial do TENANT existe mas está ilegível
// (falha de decifra — chave errada, rotação incompleta ou dado adulterado). Falha fechada: a tool
// NÃO usa fallback de plataforma (env) nem tenta a chamada externa; pede reconfiguração.
// A mensagem vem de IntegrationConfigUnreadableError e nunca contém valor de segredo.

export const RECONFIGURATION_REQUIRED_STATUS = 'reconfiguration_required' as const;

export function reconfigurationPayload(platform: string, message: string) {
  return {
    ok: false,
    configured: false,
    unreadable: true,
    status: RECONFIGURATION_REQUIRED_STATUS,
    platform,
    erro: message,
  };
}

/** JSON de erro de topo da tool (success:false) — para tools cujo único efeito seria o envio. */
export function reconfigurationRequired(platform: string, message: string): string {
  return JSON.stringify({ success: false, ...reconfigurationPayload(platform, message) }, null, 2);
}
