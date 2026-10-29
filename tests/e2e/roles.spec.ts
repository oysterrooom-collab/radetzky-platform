import { test, expect } from '@playwright/test'
import { login, hasE2E } from './helpers/login'

test.skip(!hasE2E, 'servono utenti di prova su Supabase')
test('lo staff vede solo Home, Prenotazioni ed Eventi', async ({ page }) => {
  await login(page, 'E2E_STAFF')
  for (const l of ['Clienti', 'Catalogo', 'Regole', 'Impostazioni']) await expect(page.getByRole('link', { name: l })).toHaveCount(0)
})
test('il supervisor vede il catalogo senza pulsanti di salvataggio', async ({ page }) => {
  await login(page, 'E2E_SUPER'); await page.goto('/catalogo/prodotti')
  await expect(page.getByRole('button', { name: /Salva/ })).toHaveCount(0)
})
test("l'admin con due locali vede il selettore", async ({ page }) => {
  await login(page, 'E2E_ADMIN')
  await expect(page.getByLabel('Locale')).toContainText('Tutti i locali')
})
