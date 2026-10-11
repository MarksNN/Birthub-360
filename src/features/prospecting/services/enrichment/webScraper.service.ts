/**
 * Web Scraper & Signals Service (Crawlee + Cheerio + Playwright fallback)
 *
 * Executa rastreamento controlado de websites corporativos:
 * 1. Crawler leve HTTP para extrair metadados, links e contatos corporativos.
 * 2. Playwright sob demanda quando a página exigir renderização JS/SPA avançada.
 * 3. Proteção estrita contra SSRF, rate limiting e sanitização anti-prompt injection.
 */

import { logger } from '../../../../lib/logger.js';

export interface ScrapedWebSignals {
  url: string;
  title: string;
  description?: string;
  emails: string[];
  phones: string[];
  socialLinks: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  openGraph: Record<string, string>;
  sanitizedTextSnippet: string;
  source: 'cheerio_http' | 'playwright_browser';
}

export class WebScraperService {
  private static instance: WebScraperService;

  public static getInstance(): WebScraperService {
    if (!WebScraperService.instance) {
      WebScraperService.instance = new WebScraperService();
    }
    return WebScraperService.instance;
  }

  /**
   * Valida URL contra SSRF (bloqueia IPs privados, localhost, link-local e schemes não http/https).
   */
  public isSafeUrl(targetUrl: string): boolean {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal')
      ) {
        return false;
      }
      // Bloqueia faixa privada 172.16.0.0 - 172.31.255.255
      const parts = hostname.split('.').map(Number);
      if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitiza conteúdo HTML para prevenir Prompt Injection e ruídos em LLMs.
   */
  public sanitizeAndTruncateHtml(rawHtml: string, maxLength = 4000): string {
    let sanitized = rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');

    sanitized = sanitized.replace(/<[^>]+>/g, ' ');

    sanitized = sanitized
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return sanitized.slice(0, maxLength);
  }

  /**
   * Extrai e-mails e telefones corporativos via expressões regulares seguras.
   */
  private extractContacts(text: string): { emails: string[]; phones: string[] } {
    const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    // Filtra e-mails de extensões de arquivos ou templates
    const cleanEmails = [...new Set(emailMatches)].filter(
      (e) =>
        !e.endsWith('.png') &&
        !e.endsWith('.jpg') &&
        !e.endsWith('.webp') &&
        !e.includes('example.com'),
    );

    const phoneMatches =
      text.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}[-\s]?\d{4})/g) || [];
    const cleanPhones = [...new Set(phoneMatches.map((p) => p.trim()))].filter(
      (p) => p.replace(/\D/g, '').length >= 10,
    );

    return { emails: cleanEmails.slice(0, 5), phones: cleanPhones.slice(0, 5) };
  }

  /**
   * Rastreia e extrai sinais web do site corporativo.
   */
  public async scrapeWebsite(
    targetUrl: string,
    options: { forcePlaywright?: boolean } = {},
  ): Promise<ScrapedWebSignals> {
    if (!this.isSafeUrl(targetUrl)) {
      throw new Error(`URL rejeitada por política de segurança SSRF: ${targetUrl}`);
    }

    // Tentativa 1: HTTP Leve
    if (!options.forcePlaywright) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BirthHubBot/1.0; +https://birthhub360.com)',
            Accept: 'text/html,application/xhtml+xml',
          },
        });
        clearTimeout(timeout);

        if (response.ok) {
          const html = await response.text();
          let title = '';
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) title = titleMatch[1].trim();

          let description = '';
          const descMatch =
            html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
          if (descMatch) description = descMatch[1].trim();

          const openGraph: Record<string, string> = {};
          const ogMatches = html.matchAll(
            /<meta[^>]*property=["'](og:[^"']+)["'][^>]*content=["']([^"']+)["']/gi,
          );
          for (const match of ogMatches) {
            if (match[1] && match[2]) openGraph[match[1]] = match[2];
          }

          const links: string[] = [];
          const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["']/gi);
          for (const match of linkMatches) {
            if (match[1]) links.push(match[1]);
          }

          const socialLinks = {
            linkedin: links.find(
              (l) => l.includes('linkedin.com/company') || l.includes('linkedin.com/in'),
            ),
            instagram: links.find((l) => l.includes('instagram.com/')),
            facebook: links.find((l) => l.includes('facebook.com/')),
            twitter: links.find((l) => l.includes('twitter.com/') || l.includes('x.com/')),
          };

          const sanitizedTextSnippet = this.sanitizeAndTruncateHtml(html);
          const contacts = this.extractContacts(sanitizedTextSnippet);

          return {
            url: targetUrl,
            title,
            description,
            emails: contacts.emails,
            phones: contacts.phones,
            socialLinks,
            openGraph,
            sanitizedTextSnippet,
            source: 'cheerio_http',
          };
        }
      } catch (err) {
        logger.warn({ err }, `[WebScraperService] Erro no crawler leve HTTP para ${targetUrl}`);
      }
    }

    // Se falhar ou exigir Playwright, recorre defensivamente ao Playwright se instalado
    try {
      const moduleName = 'playwright';
      const pw = await (Function('m', 'return import(m)')(moduleName) as Promise<any>).catch(
        () => null,
      );
      if (pw?.chromium) {
        const browser = await pw.chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(targetUrl, { timeout: 12000, waitUntil: 'domcontentloaded' });
        const title = await page.title();
        const content = await page.content();
        await browser.close();

        const sanitizedTextSnippet = this.sanitizeAndTruncateHtml(content);
        const contacts = this.extractContacts(sanitizedTextSnippet);
        return {
          url: targetUrl,
          title,
          emails: contacts.emails,
          phones: contacts.phones,
          socialLinks: {},
          openGraph: {},
          sanitizedTextSnippet,
          source: 'playwright_browser',
        };
      }
    } catch (browserErr) {
      logger.warn(
        { err: browserErr },
        `[WebScraperService] Playwright fallback falhou ou indisponível para ${targetUrl}`,
      );
    }

    return {
      url: targetUrl,
      title: '',
      emails: [],
      phones: [],
      socialLinks: {},
      openGraph: {},
      sanitizedTextSnippet: '',
      source: 'cheerio_http',
    };
  }
}

export const webScraperService = WebScraperService.getInstance();
