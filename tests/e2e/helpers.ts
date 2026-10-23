import { randomBytes } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';

// Sempre @birthhub360.com.br: só domínios autorizados (ver src/config/access-policy.ts) passam pela
// checagem client-side E pelo databaseHooks.user.create.before do better-auth (src/lib/auth.ts).
export function uniqueTestEmail(prefix: string): string {
  // randomBytes (não Math.random): o e-mail vira credencial de uma conta real de teste, e o CodeQL
  // trata Math.random() nesse fluxo como aleatoriedade insegura (js/insecure-randomness).
  const unique = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  return `e2e-${prefix}-${unique}@birthhub360.com.br`;
}

export const E2E_PASSWORD = 'E2eTestPassword123!';

interface SignUpOptions {
  email: string;
  password?: string;
  name?: string;
  completeOnboarding?: boolean;
}

// Cria a conta pelo cadastro visível de NewLoginScreen e depois força um login pela UI.
// Não depende do antigo ?signup=1 nem presume que cadastro abre uma sessão.
export async function signUp(
  page: Page,
  { email, password = E2E_PASSWORD, name, completeOnboarding = true }: SignUpOptions,
) {
  // Organization.name é única e deriva do nome do primeiro usuário.
  const resolvedName = name ?? `E2E Test User ${email}`;
  await page.addInitScript(() => {
    window.localStorage.setItem('@prospector:has_seen_tour', 'true');
  });
  await page.goto('/login');
  await page.getByRole('button', { name: /^Criar conta$/ }).click();
  await page.getByPlaceholder('Seu nome', { exact: true }).fill(resolvedName);
  await page.getByPlaceholder('nome@empresa.com.br', { exact: true }).fill(email);
  await page.getByPlaceholder('••••••••', { exact: true }).fill(password);
  const signupResponsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/auth/sign-up/email'
      && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /^Solicitar Acesso$/ }).click();
  const signupResponse = await signupResponsePromise;
  expect(signupResponse.ok(), 'Cadastro real deve ser confirmado pelo servidor').toBe(true);
  const signupData = await signupResponse.json();
  expect(signupData.user?.email).toBe(email);
  expect(signupData.token === null || (typeof signupData.token === 'string' && signupData.token.length > 0),
    'Cadastro deve informar token válido ou null explícito').toBe(true);

  if (signupData.token === null) {
    // Sem bypass de teste, confirma posse do e-mail no banco como o helper anterior;
    // não cria usuário/sessão por seed nem altera a política de autenticação do produto.
    await expect(page.getByText('Conta criada com sucesso! Verifique seu e-mail.', { exact: true }))
      .toBeVisible();
    requestContext.enterWith({ bypassRls: true });
    await prisma.user.update({ where: { email }, data: { emailVerified: true } });
  }

  if (completeOnboarding) {
    requestContext.enterWith({ bypassRls: true });
    const user = await prisma.user.findUnique({
      where: { email },
      select: { organizationId: true },
    });
    if (user?.organizationId) {
      await prisma.setting.updateMany({
        where: { organizationId: user.organizationId, key: 'organization.modules' },
        data: {
          value: {
            enabledModules: [
              'crm-comercial',
              'prospect-inteligente',
              'inteligencia-mercado',
              'hub',
              'automacoes',
              'performance',
            ],
            onboardingCompletedAt: new Date().toISOString(),
            updatedByUserId: null,
          },
        },
      });
    }
  }

  // Remove eventual sessão criada pelo cadastro para provar um login novo com a senha.
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByPlaceholder('nome@empresa.com.br', { exact: true }).fill(email);
  await page.getByPlaceholder('••••••••', { exact: true }).fill(password);
  const signinResponsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/auth/sign-in/email'
      && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /^Entrar na Plataforma$/ }).click();
  const signinResponse = await signinResponsePromise;
  expect(signinResponse.ok(), 'Login com senha real deve ser confirmado pelo servidor').toBe(true);
  const signinData = await signinResponse.json().catch(() => null);
  if (signinData) {
    expect(signinData.user?.email).toBe(email);
    expect(signinData.token).toBeTruthy();
  }

  // O cadastro de uma nova organização deve provisionar seu fundador como ADMIN.
  // Verifica o papel persistido, não apenas um campo eventualmente presente no token.
  requestContext.enterWith({ bypassRls: true });
  const persistedUser = await prisma.user.findUnique({
    where: { email },
    select: { role: true, organizationId: true },
  });
  expect(persistedUser?.organizationId, 'fundador deve pertencer a uma organização').toBeTruthy();
  expect(persistedUser?.role, 'fundador de organização nova deve ser ADMIN').toBe('ADMIN');

  await page.waitForURL(/\/(app|setup)(?:[/?#]|$)/, { timeout: 45_000 });
  if (completeOnboarding) {
    // O updateMany anterior pode não ver a linha (RLS) e o clique do wizard navega para /app
    // antes do POST terminar. O OnboardingGate então devolve o usuário para /setup no meio
    // do teste. Fecha o onboarding pela API autenticada e só segue quando /app permanece.
    const complete = await page.request.post('/api/organization-modules/onboarding/complete', {
      headers: { Origin: new URL(page.url()).origin },
    });
    // Exibe status e mensagem de erro sem registrar cookies, tokens ou cabeçalhos.
    const responseBody = await complete.json().catch(() => null);
    const safeError =
      responseBody && typeof responseBody === 'object' && 'error' in responseBody
        ? String(responseBody.error).slice(0, 200)
        : 'resposta sem campo error';
    expect(
      complete.ok(),
      `conclusão de onboarding via API: HTTP ${complete.status()} (${safeError})`,
    ).toBe(true);
    if (new URL(page.url()).pathname !== '/app') {
      try {
        await page.goto('/app', { waitUntil: 'domcontentloaded' });
      } catch (err: unknown) {
        if (
          !(err instanceof Error) ||
          (!err.message.includes('interrupted by another navigation') &&
            !err.message.includes('Not attached to an active page'))
        ) {
          throw err;
        }
      }
    } else {
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
      } catch (err: unknown) {
        if (
          !(err instanceof Error) ||
          (!err.message.includes('interrupted by another navigation') &&
            !err.message.includes('Not attached to an active page'))
        ) {
          throw err;
        }
      }
    }
    await expect(page).toHaveURL(/\/app(?:[/?#]|$)/, { timeout: 20_000 });
    await expect.poll(async () => new URL(page.url()).pathname, { timeout: 5_000 }).not.toBe('/setup');
  } else {
    await expect(page).toHaveURL(/\/setup(?:[/?#]|$)/, { timeout: 15_000 });
  }

  // URL sozinha não comprova sessão: consulta o backend com os cookies do navegador.
  const sessionResponse = await page.request.get('/api/auth/get-session');
  expect(sessionResponse.ok(), 'Sessão autenticada deve existir no backend').toBe(true);
  const sessionData = await sessionResponse.json();
  expect(sessionData?.user?.email).toBe(email);
  expect(sessionData?.user?.id).toBeTruthy();
  expect(sessionData?.session?.userId).toBeTruthy();
  expect(sessionData?.session?.userId).toBe(sessionData?.user?.id);
  expect(sessionData?.session?.id).toBeTruthy();
}
/**
 * Rebaixa/eleva o papel de um usuário já cadastrado, direto no banco de teste — usado só por
 * specs de RBAC que precisam de um papel diferente de ADMIN (o público `signUp()` sempre cria um
 * ADMIN, porque é sempre o primeiro usuário de uma Organization nova; não existe fluxo de
 * signup público para GESTOR/CLOSER/SDR/VISUALIZADOR, esses papéis só existem via convite de um
 * ADMIN — ver `src/features/team`). Mesmo padrão de bypass de RLS usado em
 * `tests/helpers/rbac-e2e-helpers.ts` para os testes de integração equivalentes.
 */
export async function setUserRole(
  email: string,
  role: 'ADMIN' | 'GESTOR' | 'CLOSER' | 'SDR' | 'VISUALIZADOR',
): Promise<void> {
  // `enterWith` (não `.run()`) de propósito — mesmo racional de `tests/helpers/rbac-e2e-helpers.ts`:
  // `prisma.user.update(...)` devolve um `PrismaPromise` preguiçoso (só dispara a query real ao
  // ser `await`ado), e o hook `$allOperations` da extensão (src/lib/prisma.ts) que lê
  // `requestContext.getStore()` roda nesse momento posterior — depois que um `.run(store, cb)`
  // síncrono já teria retornado. `enterWith` muta o contexto ambiente do resto da execução em vez
  // de escopar a um callback, e por isso sobrevive até a query de fato disparar.
  requestContext.enterWith({ bypassRls: true });
  await prisma.user.update({ where: { email }, data: { role } });
}

/**
 * Espera a tela do módulo lazy terminar de renderizar.
 *
 * Substitui `page.waitForLoadState('networkidle')`, que era usado em 11 pontos dos specs e não
 * podia funcionar neste app: `src/components/CrmBoard.tsx` abre um `EventSource`
 * (`/api/notifications/stream`) ao montar, e uma conexão SSE fica aberta de propósito enquanto a
 * tela existir — a rede nunca fica ociosa em `/app/crm`, então `networkidle` só podia estourar o
 * timeout. Nas demais telas ele até resolvia, mas tarde o bastante para consumir quase todo o
 * orçamento de 45s do teste. A própria documentação do Playwright desaconselha `networkidle`
 * justamente por isso.
 *
 * O sinal usado aqui é determinístico: o fallback de `<Suspense>` (`data-testid="page-fallback"`
 * em `src/App.tsx`) some exatamente quando o chunk do módulo terminou de carregar e a tela real
 * montou.
 */
export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByTestId('page-fallback')).toHaveCount(0, { timeout: 30_000 });
}
