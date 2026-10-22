import { test, expect } from '@playwright/test';
import { signUp, uniqueTestEmail } from './helpers';

test.describe('Onboarding de Módulos da Organização', () => {
  test('O administrador é obrigado a configurar a org no primeiro acesso e o acesso fica restrito', async ({ page }) => {
    const email = uniqueTestEmail('onboarding-modules');
    const name = `E2E Org Onboarding ${email}`;

    // Cadastro e login reais; mantém o wizard para testar sua configuração neste spec.
    await signUp(page, { email, name, completeOnboarding: false });

    // 2. Garante que estamos na tela do wizard
    await expect(page).toHaveURL(/\/setup/);
    await expect(page.locator('text=Bem-vindo(a) ao Birth Hub 360')).toBeVisible();

    // 3. Escolhe módulos
    // O módulo base CRM Comercial é obrigatório (alwaysActive) e já vem pré-selecionado.
    // Seleciona um módulo opcional (Social Selling)
    const socialSellingCard = page.getByRole('button', { name: /Social Selling/i });
    await socialSellingCard.click();

    // 4. Continua o fluxo
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.locator('text=Confirmar configuração')).toBeVisible();
    await page.getByRole('button', { name: /(Salvar e )?ir para o Dashboard/i }).click();

    // 5. Após setup, deve ir para /app
    await page.waitForURL('**/app');

    // 6. Verifica a Sidebar (Core COMMAND CENTER sempre visível)
    const commandCenter = page.locator('aside').getByText('COMMAND CENTER').first();
    await expect(commandCenter).toBeVisible();

    // 7. Se recarregar a página, não pode voltar pro setup
    await page.goto('/app');
    await page.waitForURL('**/app');
    await expect(page).not.toHaveURL(/\/setup/);
  });
});
