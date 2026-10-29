import { test, expect } from '@playwright/test'
import { login, hasE2E } from './helpers/login'
test.skip(!hasE2E, 'servono utenti di prova su Supabase con costi compilati in catalogo')
test('dalla nuova pratica al preventivo inviato, con traccia nel registro', async ({ page }) => {
  await login(page, 'E2E_ADMIN')
  await page.goto('/pratiche/nuova'); await page.getByLabel('Nome della pratica').fill('Flusso completo')
  await page.getByLabel('Data').fill('2027-09-18'); await page.getByLabel('Ospiti').fill('80'); await page.getByLabel('Stile di servizio').selectOption('buffet')
  await page.getByRole('button', { name: 'Crea l’evento' }).click(); await page.waitForURL(/\/menu$/)
  await page.getByLabel('Aggiungi una formula').selectOption({ label: 'Aperitivo Radetzky' }); await page.getByRole('button', { name: 'Aggiungi' }).first().click()
  await page.getByRole('link', { name: 'Fabbisogni' }).click(); await expect(page.getByText('Personale')).toBeVisible()
  await page.getByRole('link', { name: 'Costi e prezzo' }).click(); await page.getByLabel('Prezzo a persona (IVA esclusa)').fill('45,00'); await page.getByRole('button', { name: 'Salva il prezzo' }).click()
  await page.getByRole('link', { name: 'Preventivi' }).click(); await page.getByRole('button', { name: 'Emetti il preventivo' }).click()
  const href = await page.getByRole('link', { name: 'Scarica il PDF' }).getAttribute('href')
  const res = await page.request.get(href!); expect(res.status()).toBe(200); expect(res.headers()['content-type']).toBe('application/pdf')
  await page.getByRole('button', { name: 'Segna come inviato' }).click()
  await page.reload(); await expect(page.getByText('Preventivo inviato').first()).toBeVisible()
  await page.goto('/registro'); await expect(page.getByText(/ha creato Preventivo/).first()).toBeVisible()
})
test('avviso su due eventi confermati nella stessa data', async ({ page }) => {
  test.skip(!process.env.E2E_CONFLICT_IDS, 'servono due pratiche confermate nello stesso giorno (E2E_CONFLICT_IDS=id1,id2)')
  await login(page, 'E2E_ADMIN')
  for (const id of process.env.E2E_CONFLICT_IDS!.split(',')) { await page.goto(`/pratiche/${id}`); await expect(page.getByRole('alert')).toContainText('Altro evento confermato in questa data') }
})
