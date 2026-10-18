const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const routesToTest = [
  '/app',
  '/app/crm',
  '/app/crm/board',
  '/app/commercial_intelligence',
  '/app/prospecting',
  '/app/integrations',
  '/app/intelligence',
  '/app/team',
  '/app/settings',
  '/app/cadence',
  '/app/reports',
  '/app/billing',
  '/app/automations',
  '/app/daily-plan',
  '/app/analytics'
];

(async () => {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  await context.addInitScript(() => {
    localStorage.setItem('token', 'fake-jwt-token-for-visual-audit');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('atlas_theme', 'dark');
    localStorage.setItem('@prospector:has_seen_tour', 'true');
    localStorage.setItem('hasSeenTour', 'true');
    localStorage.setItem('onboarding_completed', 'true');
  });

  const results = [];

  for (const routePath of routesToTest) {
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (!url.includes('/api/')) return route.continue();
      
      if (url.includes('/api/auth/get-session')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            session: {
              id: 'sess_audit',
              userId: 'usr_admin_audit',
              expiresAt: new Date(Date.now() + 86400000).toISOString()
            },
            user: {
              id: 'usr_admin_audit',
              name: 'Auditor do Sistema',
              email: 'auditor@birthhub360.com.br',
              role: 'ADMIN',
              companyId: 'comp_audit_1'
            }
          })
        });
      }

      if (url.includes('/api/bitrix/daily-plan/closing/pending')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { pending: false } })
        });
      }

      if (url.includes('/api/commercial-intelligence/filter-options')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              owners: ['Vendedor A', 'Vendedor B'],
              products: ['Produto X', 'Produto Y'],
              sources: ['Inbound', 'Outbound'],
              icps: ['Mid-Market', 'Enterprise'],
              companies: ['Empresa Alpha', 'Empresa Beta']
            }
          })
        });
      }

      if (url.includes('/api/commercial-intelligence/overview')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              period: '2026-10',
              dataAsOf: new Date().toISOString(),
              closedWonAmount: 150000,
              closedWonCount: 12,
              targetAmount: 200000,
              pctOfGoal: 75,
              commitAmount: 50000,
              commitCount: 5,
              bestCaseAmount: 70000,
              bestCaseCount: 8,
              forecastAmount: 180000,
              gapForecast: 20000,
              gapCommit: 0,
              pipelineTotal: 450000,
              pipelineTotalCount: 30,
              pipelineEligible: 300000,
              pipelineEligibleCount: 20,
              coverageMonth: { coverage: 2.5, coverageRecommended: 3.0 },
              coverage90: { coverage: 3.2, coverageRecommended: 3.0 },
              forecastConfidence: { score: 88, classification: 'saudavel', sampleSize: 25, sampleSizePenaltyApplied: false },
              coverageProtection: [
                { period: '2026-10', label: 'Outubro', goalAmount: 200000, pipelineEligible: 300000, remainingGoal: 50000, coverage: 6.0, coverageRecommended: 3.0, status: 'saudavel' },
                { period: '2026-11', label: 'Novembro', goalAmount: 220000, pipelineEligible: 280000, remainingGoal: 220000, coverage: 1.27, coverageRecommended: 3.0, status: 'atencao' },
                { period: '2026-12', label: 'Dezembro', goalAmount: 250000, pipelineEligible: 150000, remainingGoal: 250000, coverage: 0.6, coverageRecommended: 3.0, status: 'critico' }
              ]
            }
          })
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    try {
      await page.goto(`http://localhost:4173${routePath}`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1000);
      const finalUrl = page.url();
      const filename = `route-${routePath.replace(/\//g, '_')}.png`;
      await page.screenshot({ path: path.join(__dirname, '..', 'audit-screenshots', filename) });
      
      results.push({
        route: routePath,
        finalUrl,
        pageErrors,
        consoleErrorsCount: consoleErrors.length,
        status: pageErrors.length === 0 && finalUrl.includes('/app') ? 'OK' : 'FAIL'
      });
    } catch (err) {
      results.push({
        route: routePath,
        error: err.message,
        status: 'ERROR'
      });
    } finally {
      await page.close();
    }
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
