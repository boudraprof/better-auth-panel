import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin.e2e@example.com'
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'password123'
export const SUPPORT_EMAIL = process.env.E2E_SUPPORT_EMAIL || 'support.e2e@example.com'
export const SUPPORT_PASSWORD = process.env.E2E_SUPPORT_PASSWORD || 'password123'

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

// Signs in as a support (read-only) staff member and waits for the Support Desk.
export async function signInAsSupport(page: Page) {
  await page.goto('/auth/signin')
  await waitForHydration(page)
  await page.getByLabel('Email', { exact: true }).fill(SUPPORT_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(SUPPORT_PASSWORD)
  await page.getByRole('button', { name: /login/i }).click()
  await expect(page).toHaveURL('/support-center')
  await expect(page.getByRole('heading', { name: /support desk/i })).toBeVisible()
}
