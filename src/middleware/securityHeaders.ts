/**
 * Middleware de Cabeçalhos de Segurança HTTP (Passo 26 / Agente 15)
 * Aplica CSP, HSTS, X-Frame-Options, X-Content-Type-Options e Referrer-Policy.
 */

import type { IncomingMessage, ServerResponse } from 'http';

export function applySecurityHeaders(
  _req: IncomingMessage,
  res: ServerResponse,
  next?: () => void,
): void {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
  );

  if (next) {
    next();
  }
}
