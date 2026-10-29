import { test, expect } from '@playwright/test'
import { login, hasE2E } from './helpers/login'
test.skip(!hasE2E, 'servono utenti di prova su Supabase')
test('admin crea un prodotto, lo mette in formula e cambia una regola', async ({ page }) => {
  await login(page, 'E2E_ADMIN')
  await page.goto('/catalogo/prodotti'); await page.getByRole('button', { name: 'Aggiungi un prodotto' }).click()
  await page.getByLabel('Nome').first().fill('Ostrica Gillardeau'); await page.getByLabel('Marchio').first().selectOption('oysteroom')
  await page.getByLabel('Costo unitario').fill('2,80'); await page.getByRole('button', { name: 'Salva il prodotto' }).click()
  await expect(page.getByRole('row', { name: /Ostrica Gillardeau/ })).toContainText('2,80 €')
  await page.goto('/regole'); await page.getByLabel('Camerieri Cena servita').fill('10'); await page.getByRole('button', { name: 'Salva le regole' }).click()
  await expect(page.getByRole('status')).toHaveText('Regole salvate.')
  await page.reload(); await expect(page.getByLabel('Camerieri Cena servita')).toHaveValue('10')
  await page.getByRole('button', { name: 'Ripristina i valori di partenza' }).click()
  await expect(page.getByLabel('Camerieri Cena servita')).toHaveValue('12')
})
