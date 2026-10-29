import { test, expect } from '@playwright/test'
import { login, hasE2E } from './helpers/login'
test.skip(!hasE2E || !process.env.E2E_EVENT_ID, 'servono utenti di prova e una pratica con costi compilati (E2E_EVENT_ID)')
test('emetti, scarica, invia: il PDF inviato non cambia', async ({ page, request }) => {
  const id = process.env.E2E_EVENT_ID!
  await login(page, 'E2E_ADMIN'); await page.goto(`/pratiche/${id}/costi`)
  await page.getByLabel('Prezzo a persona (IVA esclusa)').fill('95,00'); await page.getByRole('button', { name: 'Salva il prezzo' }).click()
  await page.goto(`/pratiche/${id}/preventivi`); await page.getByRole('button', { name: /Emetti/ }).click()
  await expect(page.getByRole('status')).toHaveText('Preventivo emesso.')
  const href = await page.getByRole('link', { name: 'Scarica il PDF' }).first().getAttribute('href')
  const first = await (await page.request.get(href!)).body()
  expect(first.subarray(0, 5).toString()).toBe('%PDF-')
  await page.getByRole('button', { name: 'Segna come inviato' }).first().click()
  await page.goto(`/pratiche/${id}`); await page.getByLabel('Ospiti').fill('140'); await page.getByRole('button', { name: 'Salva la pratica' }).click()
  const again = await (await page.request.get(href!)).body()
  expect(Buffer.compare(first, again)).toBe(0)
  void request
})
