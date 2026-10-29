import { test, expect } from '@playwright/test'
import { login, hasE2E } from './helpers/login'
test.skip(!hasE2E, 'servono utenti di prova su Supabase')
test('nuova pratica con cliente nuovo, formula ed extra, poi persa con motivo', async ({ page }) => {
  await login(page, 'E2E_ADMIN')
  await page.goto('/pratiche/nuova')
  await page.getByLabel('Nome della pratica').fill('Matrimonio Rossi')
  await page.getByRole('button', { name: 'Nuovo' }).click(); await page.getByLabel('Nome e cognome').fill('Mario Rossi'); await page.getByRole('button', { name: 'Salva il cliente' }).click()
  await page.getByLabel('Data').fill('2027-06-12'); await page.getByLabel('Ospiti').fill('120'); await page.getByLabel('Stile di servizio').selectOption('cena_servita')
  await page.getByRole('button', { name: 'Crea l’evento' }).click(); await page.waitForURL(/\/menu$/)
  await page.getByLabel('Aggiungi una formula').selectOption({ label: 'Oyster & Bubbles' }); await page.getByRole('button', { name: 'Aggiungi' }).first().click()
  await expect(page.getByText('Champagne')).toBeVisible()
  await page.goto('/pratiche'); await expect(page.getByText('Matrimonio Rossi')).toBeVisible(); await expect(page.getByText('Richiesta').first()).toBeVisible()
  await page.getByText('Matrimonio Rossi').click(); await page.getByLabel('Stato della pratica').selectOption('perso')
  await page.getByRole('button', { name: 'Cambia stato' }).click(); await expect(page.getByRole('status')).toHaveText('Indica il motivo per cui la pratica è persa')
})
