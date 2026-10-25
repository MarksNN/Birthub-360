/**
 * Validador SSRF para Webhooks e URLs de integração de saída.
 */
export async function validateWebhookUrl(targetUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(
        `Protocolo inválido: ${parsed.protocol}. Apenas http e https são permitidos.`,
      );
    }

    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return true;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      throw new Error(
        `URL bloqueada por política de segurança SSRF: destino interno proibido (${hostname})`,
      );
    }

    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      throw new Error(
        `URL bloqueada por política de segurança SSRF: destino em faixa privada (${hostname})`,
      );
    }

    return true;
  } catch (err: unknown) {
    if (err instanceof Error) throw err;
    throw new Error('URL inválida fornecida para o webhook');
  }
}
