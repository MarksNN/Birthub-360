const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3024';
const OUTPUT_DIR = path.join(__dirname, '..', 'visual-audit-authenticated');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const ROUTES = [
  { path: '/app', name: 'Dashboard', public: false },
  { path: '/app/dashboard', name: 'Dashboard (alias)', public: false },
  { path: '/app/workspace', name: 'Workspace Home', public: false },
  { path: '/app/prospect', name: 'Prospecting Hub', public: false },
  { path: '/app/crm', name: 'CRM Board', public: false },
  { path: '/app/crm360', name: 'CRM360 Overview', public: false },
  { path: '/app/mesa-tratamento', name: 'Mesa de Tratamento', public: false },
  { path: '/app/intelligence', name: 'Intelligence Hub', public: false },
  { path: '/app/companies', name: 'Companies List', public: false },
  { path: '/app/contacts', name: 'Contacts List', public: false },
  { path: '/app/activities', name: 'Activities List', public: false },
  { path: '/app/voice-hub', name: 'Voice Studio', public: false },
  { path: '/app/cadence', name: 'Cadence Hub', public: false },
  { path: '/app/playbooks', name: 'Playbooks Hub', public: false },
  { path: '/app/jornadas', name: 'Jornadas Comerciais', public: false },
  { path: '/app/processos', name: 'Processos de Vendas', public: false },
  { path: '/app/roteiros', name: 'Roteiros Hub', public: false },
  { path: '/app/chatbook', name: 'Chatbook Hub', public: false },
  { path: '/app/roleplay', name: 'Roleplay Hub', public: false },
  { path: '/app/qualification_matrix', name: 'Qualification Matrix', public: false },
  { path: '/app/objections_matrix', name: 'Objections Matrix', public: false },
  { path: '/app/topic_training', name: 'Topic Training Academy', public: false },
  { path: '/app/bitrix', name: 'Bitrix Guide Hub', public: false },
  { path: '/app/reports', name: 'Reports Hub', public: false },
  { path: '/app/integrations', name: 'Integrations', public: false },
  { path: '/app/knowledge', name: 'Knowledge Base', public: false },
  { path: '/app/analytics', name: 'Analytics', public: false },
  { path: '/app/winloss', name: 'Win/Loss Analysis', public: false },
  { path: '/app/market-intelligence', name: 'Market Intelligence', public: false },
  { path: '/app/market-intelligence/hub', name: 'Inteligência de Mercado Hub', public: false },
  { path: '/app/prospect/inteligente', name: 'Prospecção Inteligente', public: false },
  { path: '/app/commercial_intelligence', name: 'Commercial Intelligence', public: false },
  { path: '/app/daily-plan', name: 'Daily Plan', public: false },
  { path: '/app/sdr-diagnostic', name: 'SDR Diagnostic', public: false },
  { path: '/app/calendar', name: 'Calendar', public: false },
  { path: '/app/notifications', name: 'Notifications', public: false },
  { path: '/app/automations', name: 'Automations', public: false },
  { path: '/app/usage', name: 'Usage (Admin)', public: false },
  { path: '/app/editor', name: 'Document Editor', public: false },
  { path: '/app/team', name: 'Team (Admin)', public: false },
  { path: '/app/module-access', name: 'Module Access (Admin)', public: false },
  { path: '/app/settings', name: 'Settings', public: false },
  { path: '/app/forecast', name: 'Forecast Hub', public: false },
  { path: '/app/metas', name: 'Metas Hub', public: false },
  { path: '/app/pipeline_ponderado', name: 'Pipeline Ponderado', public: false },
];

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  const results = [];

  try {
    // Usar credenciais do usuário já existente
    const email = 'marcelinmark@gmail.com';
    const password = process.env.ADMIN_INITIAL_PASSWORD || '00000000';

    console.log('Attempting to login with temp user...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verificar se já está logado ou precisa fazer login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('On login page, attempting to login...');

      // Fazer login com credenciais existentes
      try {
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);

        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);

        console.log('Login attempted');
      } catch (e) {
        console.log('Login failed:', e.message);
      }
    }

    // Verificar se login foi bem-sucedido
    await page.waitForTimeout(3000);
    const loginUrl = page.url();

    if (loginUrl.includes('/login')) {
      console.log('Still on login page - database may not be available');
      console.log('Will capture screens that redirect to login (previous approach)');
    } else {
      console.log('Login successful! Capturing authenticated screens...');
    }

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      const safeName = route.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const screenshotPath = path.join(OUTPUT_DIR, `${safeName}.png`);
      const metadataPath = path.join(OUTPUT_DIR, `${safeName}.json`);

      console.log(`Capturing: ${route.name} (${route.path})`);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);

        // Capture screenshot
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });

        // Capture page info
        const title = await page.title();
        const currentUrl = page.url();

        const metadata = {
          route: route.path,
          name: route.name,
          title,
          url: currentUrl,
          public: route.public,
          timestamp: new Date().toISOString(),
          screenshot: screenshotPath,
          status: 'success',
        };

        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        results.push(metadata);

        console.log(`✓ Success: ${route.name}`);
      } catch (error) {
        console.error(`✗ Failed: ${route.name}`, error.message);

        const errorMetadata = {
          route: route.path,
          name: route.name,
          error: error.message,
          timestamp: new Date().toISOString(),
          status: 'error',
        };

        fs.writeFileSync(metadataPath, JSON.stringify(errorMetadata, null, 2));
        results.push(errorMetadata);
      }
    }
  } catch (error) {
    console.error('Error during capture:', error);
  } finally {
    await browser.close();
  }

  // Save summary
  const summaryPath = path.join(OUTPUT_DIR, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalRoutes: ROUTES.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    results,
  }, null, 2));

  console.log('\nCapture complete!');
  console.log(`Total: ${ROUTES.length}`);
  console.log(`Success: ${results.filter(r => r.status === 'success').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'error').length}`);
}

captureScreenshots().catch(console.error);
