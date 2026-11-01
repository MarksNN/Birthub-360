import { defineConfig } from '@playwright/test';

const PORT = process.env.PORT ?? '3000';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?.trim() || undefined;

export default defineConfig({
  testDir: './visual-regression',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [
    ...(process.env.CI ? [['line'] as const] : []),
    ['html', { outputFolder: 'visual-regression-report', open: 'never' }],
  ],
  // Verification never blesses a missing baseline; the manual CI command explicitly overrides this.
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/baselines/{testFilePath}/{arg}-{projectName}-{platform}{ext}',
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { Origin: new URL(BASE_URL).origin },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 900 },
        ...(chromiumExecutablePath
          ? { launchOptions: { executablePath: chromiumExecutablePath } }
          : {}),
      },
    },
    {
      name: 'laptop',
      use: {
        viewport: { width: 1366, height: 768 },
        ...(chromiumExecutablePath
          ? { launchOptions: { executablePath: chromiumExecutablePath } }
          : {}),
      },
    },
    {
      name: 'tablet',
      use: {
        viewport: { width: 768, height: 1024 },
        ...(chromiumExecutablePath
          ? { launchOptions: { executablePath: chromiumExecutablePath } }
          : {}),
      },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        ...(chromiumExecutablePath
          ? { launchOptions: { executablePath: chromiumExecutablePath } }
          : {}),
      },
    },
  ],
  webServer: {
    // Garante migrations + re-bootstrap pós-migrate (inclusive no job manual visual-baselines do ci.yml)
    // antes de subir o servidor Express real para captura/comparação de snapshots.
    command:
      'npx dotenv-cli -e .env.test -- npx prisma migrate deploy && (PGPASSWORD=${PGPASSWORD:-prospector_test_pass} APP_DB_PASSWORD=${APP_DB_PASSWORD:-ci_app_test_pass} MIGRATOR_DB_PASSWORD=${MIGRATOR_DB_PASSWORD:-ci_migrator_test_pass} bash scripts/db/bootstrap-app-role.sh localhost 5434 prospector prospectordb_test || true) && npm run start:e2e',
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    env: {
      NODE_ENV: process.env.NODE_ENV ?? 'test',
      PORT,
      API_RATE_LIMIT_MAX: process.env.API_RATE_LIMIT_MAX ?? '5000',
      AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX ?? '500',
    },
  },
});
