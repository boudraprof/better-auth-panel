import { expect, test } from '@playwright/test'
import { signInAsAdmin } from './admin-helpers'

const PAGES: Array<{ path: string; heading: RegExp; nav: RegExp }> = [
  { path: '/audit-log', heading: /Audit Log/, nav: /^Audit Log$/ },
  { path: '/analytics', heading: /Analytics/, nav: /^Analytics$/ },
  { path: '/organizations', heading: /Organizations/, nav: /^Organizations$/ },
  { path: '/hardware', heading: /Hardware Status/, nav: /^Hardware$/ },
  { path: '/email-config', heading: /Email Configuration/, nav: /^Email$/ },
  { path: '/rate-limits', heading: /Rate Limits/, nav: /^Rate Limits$/ },

]

test.describe('Admin pages', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  for (const { path, heading } of PAGES) {
    test(`renders ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    })
  }

  test('sidebar navigation reaches every section', async ({ page }) => {
    const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' })
    for (const { path, heading, nav } of PAGES) {
      await sidebar.getByRole('link', { name: nav }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }
  })
})

test.describe('Admin sidebar (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  test('opens via hamburger and lists every section', async ({ page }) => {
    const hamburger = page.getByRole('button', { name: 'Toggle Sidebar' })
    await expect(hamburger).toBeVisible()
    await hamburger.click()

    const drawer = page.getByRole('navigation', { name: 'Sidebar navigation' })
    await expect(drawer).toBeVisible()
    for (const { nav } of PAGES) {
      await expect(drawer.getByRole('link', { name: nav })).toBeVisible()
    }
  })

  test('navigates to a section and closes the drawer', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click()

    const drawer = page.getByRole('navigation', { name: 'Sidebar navigation' })
    await drawer.getByRole('link', { name: /^Analytics$/ }).click()

    await expect(page).toHaveURL(/.*\/analytics$/)
    await expect(page.getByRole('heading', { name: /Analytics/ })).toBeVisible()
    await expect(drawer).toBeHidden()
  })
})
