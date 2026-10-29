import { test, expect } from '@playwright/test'
test('login page shows email, password and submit', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible()
})
test('protected routes redirect to login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})
