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
    // Por padrão CRM Comercial está ativo (graças ao useState default). Vamos clicar nele para desativar.
    const crmCard = page.getByText('CRM Comercial', { exact: true });
    await crmCard.click(); // desativa CRM

    const prospectCard = page.getByText('Prospecção Inteligente', { exact: true });
    await prospectCard.click(); // ativa Prospecção

    // 4. Continua o fluxo
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.locator('text=Confirmar configuração')).toBeVisible();
    await page.getByRole('button', { name: /(Salvar e )?ir para o Dashboard/i }).click();

    // 5. Após setup, deve ir para /app
    await page.waitForURL('**/app');

    // 6. Verifica a Sidebar (garante que CRM não está visível e Prospecção está)
    // Core (Painel Central / COMMAND CENTER) sempre está visível.
    const commandCenter = page.locator('text=COMMAND CENTER');
    await expect(commandCenter).toBeVisible();

    // O CRM Comercial não deve estar visível
    const crmSidebar = page.locator('text=CRM COMERCIAL');
    await expect(crmSidebar).toBeHidden();

    // A Prospecção Inteligente deve estar visível
    const prospectSidebar = page.locator('text=PROSPECÇÃO INTELIGENTE');
    await expect(prospectSidebar).toBeVisible();

    // 7. Se recarregar a página, não pode voltar pro setup
    await page.goto('/app');
    await page.waitForURL('**/app');
    await expect(page).not.toHaveURL(/\/setup/);
  });
});
