import { expect, test } from '@playwright/test'
import { signInAsAdmin } from './admin-helpers'

test.describe('Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  test('renders stats cards', async ({ page }) => {
    await expect(page.getByTestId('stat-total-users')).toBeVisible()
    await expect(page.getByTestId('stat-admins')).toBeVisible()
    await expect(page.getByTestId('stat-verified')).toBeVisible()
    await expect(page.getByTestId('stat-banned')).toBeVisible()
  })

  test('renders the user list with the e2e admin present', async ({ page }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin.e2e@example.com'
    await expect(page.getByText(adminEmail).first()).toBeVisible({ timeout: 10_000 })
  })

  test('search filters the user list', async ({ page }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin.e2e@example.com'
    const searchInput = page.getByPlaceholder('Search by email...')
    await searchInput.fill(adminEmail)
    await page.getByRole('button', { name: 'Search' }).click()

    // The e2e admin should still appear after filtering by its own email...
    await expect(page.getByText(adminEmail).first()).toBeVisible({ timeout: 10_000 })
    // ...and a bogus query yields no users.
    await searchInput.fill('no-such-user@example.com')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByText('No users found')).toBeVisible({ timeout: 10_000 })
  })

  test('shows the audit log and analytics links', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Sidebar navigation' })
    await expect(nav.getByRole('link', { name: /audit log/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /analytics/i })).toBeVisible()
    await nav.getByRole('link', { name: /audit log/i }).click()
    await expect(page).toHaveURL(/.*\/audit-log/)
  })

  test('exports users as CSV', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /export/i }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/users-export.*\.csv/)
  })
})