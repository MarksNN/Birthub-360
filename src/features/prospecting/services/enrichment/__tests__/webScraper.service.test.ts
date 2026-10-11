import { describe, expect, it } from 'vitest';
import { WebScraperService } from '../webScraper.service.js';

describe('WebScraperService', () => {
  const service = WebScraperService.getInstance();

  it('bloqueia endereços inseguros via validação SSRF', () => {
    expect(service.isSafeUrl('http://localhost:3000')).toBe(false);
    expect(service.isSafeUrl('http://127.0.0.1:8080')).toBe(false);
    expect(service.isSafeUrl('http://192.168.1.1')).toBe(false);
    expect(service.isSafeUrl('http://10.0.0.1')).toBe(false);
    expect(service.isSafeUrl('file:///etc/passwd')).toBe(false);
    expect(service.isSafeUrl('ftp://example.com')).toBe(false);
    expect(service.isSafeUrl('https://empresa.com.br')).toBe(true);
  });

  it('sanitiza e trunca HTML removendo scripts e tags perigosas', () => {
    const rawHtml = `
      <html>
        <head><title>Teste</title><script>alert('injection')</script></head>
        <body>
          <h1>Logística Moderna</h1>
          <p>Oferecemos serviços de transporte de carga em todo o Brasil.</p>
          <style>.hide { display: none; }</style>
        </body>
      </html>
    `;
    const sanitized = service.sanitizeAndTruncateHtml(rawHtml);
    expect(sanitized).not.toContain('alert');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Logística Moderna');
  });
});
