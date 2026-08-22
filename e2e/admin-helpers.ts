import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin.e2e@example.com'
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'password123'

/**
 * Wait until React has hydrated the page. The server-rendered HTML is
 * interactive only after hydration; clicking before that silently no-ops.
 */
export async function waitForHydration(page: Page) {
  await page.waitForSelector('html[data-hydrated="true"]', { timeout: 10_000 })
}

// Signs in through the UI and waits for the dashboard.
export async function signInAsAdmin(page: Page) {
  await page.goto('/auth/signin')
  await waitForHydration(page)
  await page.getByLabel('Email', { exact: true }).fill(ADMIN_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /login/i }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible()
}
