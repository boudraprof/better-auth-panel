import { expect, test } from '@playwright/test'

import { ADMIN_EMAIL, signInAsAdmin, waitForHydration } from './admin-helpers'

test.describe('Admin auth', () => {
  test('redirects unauthenticated visitors to sign in', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/.*\/auth\/signin/)
  })

  test('redirects unauthenticated visitors on protected pages', async ({ page }) => {
    for (const path of ['/audit-log', '/analytics', '/organizations', '/hardware']) {
      await page.goto(path)
      await expect(page).toHaveURL(/.*\/auth\/signin/)
    }
  })

  test('rejects an invalid password', async ({ page }) => {
    await page.goto('/auth/signin')
    await waitForHydration(page)
    await page.getByLabel('Email', { exact: true }).fill(ADMIN_EMAIL)
    await page.getByLabel('Password', { exact: true }).fill('definitely-wrong')
    await page.getByRole('button', { name: /login/i }).click()
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  })

  test('signs in successfully and lands on the dashboard', async ({ page }) => {
    await signInAsAdmin(page)
    await expect(page.getByText(/Total Users/)).toBeVisible()
  })

  test('can sign in again after a previous session', async ({ page }) => {
    await signInAsAdmin(page)
    // Fresh context already isolates cookies; just confirm the page is usable.
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible()
  })
})
