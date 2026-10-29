import { test, expect } from '@playwright/test'
import { login, hasE2E } from './helpers/login'
test.skip(!hasE2E || !process.env.E2E_EVENT_ID, 'servono utenti di prova e una pratica (E2E_EVENT_ID) a cena servita da 120 ospiti')
test('fabbisogni, correzione manuale che resta, margine in rosso', async ({ page }) => {
  const id = process.env.E2E_EVENT_ID!
  await login(page, 'E2E_ADMIN'); await page.goto(`/pratiche/${id}/fabbisogni`)
  await expect(page.getByLabel('Quantità Cameriere')).toHaveAttribute('placeholder', '10')
  await page.getByLabel('Quantità Cameriere').fill('11'); await page.getByLabel('Quantità Cameriere').press('Enter')
  await page.goto(`/pratiche/${id}`); await page.getByLabel('Ospiti').fill('130'); await page.getByRole('button', { name: 'Salva la pratica' }).click()
  await page.goto(`/pratiche/${id}/fabbisogni`)
  await expect(page.getByLabel('Quantità Cameriere')).toHaveValue('11'); await expect(page.getByLabel('Quantità Sedia')).toHaveAttribute('placeholder', '137')
  await page.goto(`/pratiche/${id}/costi`); await page.getByLabel('Prezzo a persona (IVA esclusa)').fill('5,00'); await page.getByRole('button', { name: 'Salva il prezzo' }).click()
  await expect(page.getByText(/Margine sotto il/)).toBeVisible()
})
test('lo staff vede i fabbisogni della pratica confermata ma non i costi', async ({ page }) => {
  await login(page, 'E2E_STAFF'); await page.goto(`/pratiche/${process.env.E2E_EVENT_ID}`)
  await expect(page.getByRole('link', { name: 'Fabbisogni' })).toBeVisible(); await expect(page.getByRole('link', { name: 'Costi e prezzo' })).toHaveCount(0)
})
