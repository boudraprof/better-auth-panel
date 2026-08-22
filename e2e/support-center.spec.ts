import { expect, test } from '@playwright/test'

import { signInAsSupport, SUPPORT_EMAIL, SUPPORT_PASSWORD } from './admin-helpers'

test.describe('Support Desk', () => {
  test.beforeAll(async ({ request }) => {
    // Provision a support (read-only) staff member through the sign-up API,
    // then promote to the support role via the admin API.
    const signUp = await request.post('/api/v1/auth/sign-up/email', {
      headers: { Origin: 'http://localhost:8000' },
      data: { email: SUPPORT_EMAIL, password: SUPPORT_PASSWORD, name: 'E2E Support' },
    })
    // 422 = already exists from a previous run — fine.
    if (signUp.status() !== 200 && signUp.status() !== 422) {
      throw new Error(`Failed to provision support user (${signUp.status()}): ${await signUp.text()}`)
    }

    // Sign in as admin to promote the support user (only admins can set roles).
    const adminSignIn = await request.post('/api/v1/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:8000' },
      data: {
        email: process.env.E2E_ADMIN_EMAIL || 'admin.e2e@example.com',
        password: process.env.E2E_ADMIN_PASSWORD || 'password123',
      },
    })
    expect(adminSignIn.status()).toBe(200)
    const adminCookies = adminSignIn.headers()['set-cookie']

    // Look up the support user's id, then set their role to 'support'.
    const listRes = await request.get('/api/v1/admin/support-users?search=support.e2e@example.com', {
      headers: { Cookie: adminCookies },
    })
    expect(listRes.status()).toBe(200)
    const list = await listRes.json()
    const supportUser = (list.users ?? []).find(
      (u: { email: string }) => u.email === SUPPORT_EMAIL,
    )
    expect(supportUser, 'support user should exist').toBeTruthy()

    const setRole = await request.post('/api/v1/auth/admin/set-role', {
      headers: { Origin: 'http://localhost:8000', Cookie: adminCookies },
      data: { userId: supportUser.id, role: 'support' },
    })
    expect(setRole.status()).toBe(200)
  })

  test('support user lands on the Support Desk after sign-in', async ({ page }) => {
    await signInAsSupport(page)
    await expect(page).toHaveURL('/support-center')
    await expect(page.getByRole('heading', { name: /support desk/i })).toBeVisible()
  })

  test('shows a read-only banner and no mutating controls', async ({ page }) => {
    await signInAsSupport(page)
    await expect(
      page.getByText(/Read-only view/i),
    ).toBeVisible()
  })

  test('lists users without ban/role controls', async ({ page }) => {
    await signInAsSupport(page)
    // The user list should render rows; opening details must not expose
    // mutating actions like Ban / Delete / Impersonate.
    const firstRow = page.locator('div.rounded-lg.border').first()
    await expect(firstRow).toBeVisible()
    await firstRow.getByRole('button', { name: /view details/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // Mutating controls must be absent in read-only mode.
    await expect(page.getByRole('button', { name: /ban/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /delete user/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /impersonate/i })).toHaveCount(0)
  })

  test('support API rejects mutating admin endpoints', async ({ page }) => {
    const signIn = await page.request.post('/api/v1/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:8000' },
      data: { email: SUPPORT_EMAIL, password: SUPPORT_PASSWORD },
    })
    expect(signIn.status()).toBe(200)
    const cookie = signIn.headers()['set-cookie']

    // Read-only endpoint is allowed.
    const users = await page.request.get('/api/v1/admin/support-users', {
      headers: { Cookie: cookie },
    })
    expect(users.status()).toBe(200)

    // Mutating endpoint stays admin-only (403).
    const ban = await page.request.post('/api/v1/admin/bulk-actions', {
      headers: { Origin: 'http://localhost:8000', Cookie: cookie },
      data: { userIds: [], action: 'ban' },
    })
    expect(ban.status()).toBe(403)
  })
})
