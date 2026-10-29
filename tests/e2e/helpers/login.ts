import type { Page } from '@playwright/test'
export async function login(page: Page, envKey: 'E2E_ADMIN' | 'E2E_SUPER' | 'E2E_STAFF') {
  const [email, password] = (process.env[envKey] ?? ':').split(':')
  await page.goto('/login'); await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Accedi' }).click(); await page.waitForURL('/')
}
export const hasE2E = !!process.env.E2E_ADMIN
