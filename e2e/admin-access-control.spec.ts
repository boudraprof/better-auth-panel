import { expect, test } from '@playwright/test'

import { waitForHydration } from './admin-helpers'

const NON_ADMIN_EMAIL = process.env.E2E_NON_ADMIN_EMAIL || 'regular.e2e@example.com'
const NON_ADMIN_PASSWORD = process.env.E2E_NON_ADMIN_PASSWORD || 'password123'

test.describe('Admin access control', () => {
  test('unauthenticated API calls are rejected with 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/stats')
    expect(res.status()).toBe(401)
  })

  test.describe('Non-admin user', () => {
    test.beforeAll(async ({ request }) => {
      // Provision a regular (non-admin) user through the sign-up API.
      const res = await request.post('/api/v1/auth/sign-up/email', {
        headers: { Origin: 'http://localhost:8000' },
        data: { email: NON_ADMIN_EMAIL, password: NON_ADMIN_PASSWORD, name: 'Regular User' },
      })
      // 422 = already exists from a previous run — fine.
      if (res.status() !== 200 && res.status() !== 422) {
        throw new Error(`Failed to provision non-admin (${res.status()}): ${await res.text()}`)
      }
    })

    test('is rejected at sign-in and bounced back to sign-in', async ({ page }) => {
      await page.goto('/auth/signin')
      await waitForHydration(page)
      await page.getByLabel('Email', { exact: true }).fill(NON_ADMIN_EMAIL)
      await page.getByLabel('Password', { exact: true }).fill(NON_ADMIN_PASSWORD)
      await page.getByRole('button', { name: /login/i }).click()

      // A plain user authenticates but must not reach the panel. The client
      // signs them back out and keeps them on the sign-in page with an error
      // instead of looping on the (admin-protected) dashboard.
      await expect(page).toHaveURL(/.*\/auth\/signin/, { timeout: 10_000 })
      await expect(page.getByText(/Admin access only/)).toBeVisible()
    })

    test('is denied by an admin API when logged in', async ({ page }) => {
      const signIn = await page.request.post('/api/v1/auth/sign-in/email', {
        headers: { Origin: 'http://localhost:8000' },
        data: { email: NON_ADMIN_EMAIL, password: NON_ADMIN_PASSWORD },
      })
      expect(signIn.status()).toBe(200)

      // Use the same context so the session cookie is sent with the request.
      const stats = await page.request.get('/api/v1/admin/stats')
      expect(stats.status()).toBe(403)
    })
  })
})
