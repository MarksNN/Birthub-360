import { test, expect } from '@playwright/test';
import { signUp, uniqueTestEmail, E2E_PASSWORD } from './helpers';

// Cobre o critério de aceite do item 3 do backlog de dívida técnica (09-BACKLOG-EXECUTAVEL.md):
// "login só sucede com senha correta validada pelo servidor" — e o pedido explícito do plano de
// testes (07-PLANO-DE-TESTES.md) de tratar a correção de SEC-001/002/003 como test-first: estes
// specs batem contra o servidor Express real (auth.ts / better-auth), nunca contra um mock.
//
// Removido daqui: "e-mail fora dos domínios autorizados é rejeitado antes de chamar o servidor"
// (usava alguem@gmail.com). A allowlist de domínio corporativo (@birthhub360.com.br/@birthhub360.com.br)
// foi removida de propósito no rebranding para Birth Hub 360º — ver o docstring de
// `isAuthorizedLoginEmail` em src/config/access-policy.ts e o teste unitário correspondente
// (tests/unit/config/access-policy.test.ts), que hoje afirma explicitamente que
// `usuario@gmail.com` deve AUTORIZAR. Manter este e2e testando o comportamento antigo o deixava
// falhando permanentemente contra a política atual — achado real de CI (2026-09-11), não
// flakiness. Um substituto testando "formato de e-mail inválido rejeitado no cliente" não é
// exercitável via UI real: qualquer e-mail que passe a validação nativa do `<input type="email">`
// do navegador (que intercepta o submit antes do nosso handler rodar) também passa no regex de
// formato do próprio `isAuthorizedLoginEmail` — a checagem client-side já é coberta a fundo pelo
// teste unitário de access-policy.ts.
test.describe('Autenticação', () => {
  test('cadastro com e-mail corporativo autorizado cria a conta e entra no Command Center', async ({
    page,
  }) => {
    // O destino pós-login é o Command Center (/app); /hub só redireciona para lá.
    await signUp(page, { email: uniqueTestEmail('signup') });
    await expect(page).toHaveURL(/\/app/);
  });

  test('login com senha correta autentica de verdade contra o servidor', async ({
    page,
    context,
  }) => {
    const email = uniqueTestEmail('login-ok');
    await signUp(page, { email });

    // Sessão nova, sem os cookies do signup, pra forçar um login real do zero.
    await context.clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder('nome@empresa.com.br', { exact: true }).fill(email);
    await page.getByPlaceholder('••••••••').fill(E2E_PASSWORD);
    const signinResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/auth/sign-in/email'
        && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /^Entrar na Plataforma$/ }).click();
    expect((await signinResponsePromise).ok()).toBe(true);
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 });
    const sessionResponse = await page.request.get('/api/auth/get-session');
    expect(sessionResponse.ok()).toBe(true);
    expect((await sessionResponse.json())?.user?.email).toBe(email);
  });

  test('login com senha incorreta é rejeitado pelo servidor e não navega pro app', async ({
    page,
    context,
  }) => {
    const email = uniqueTestEmail('login-fail');
    await signUp(page, { email });

    await context.clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder('nome@empresa.com.br', { exact: true }).fill(email);
    await page.getByPlaceholder('••••••••').fill('SenhaErradaDeProposito!');
    const signinResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/auth/sign-in/email'
        && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /^Entrar na Plataforma$/ }).click();
    const signinResponse = await signinResponsePromise;
    expect(signinResponse.status()).toBe(401);
    const signinError = await signinResponse.json();
    expect(typeof signinError.message).toBe('string');
    await expect(page.getByText(signinError.message, { exact: true })).toBeVisible();

    // A API deve rejeitar a senha; uma mensagem visível sozinha não prova rejeição.
    const sessionResponse = await page.request.get('/api/auth/get-session');
    expect(sessionResponse.ok()).toBe(true);
    expect(await sessionResponse.json()).toBeNull();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: /^Entrar na Plataforma$/ })).toBeVisible();
  });

  test('acessar /app sem sessão válida redireciona para /login (ProtectedRoute)', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login/);
  });
});
