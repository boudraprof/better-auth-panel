import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './e2e/admin-global-setup.ts',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'admin-panel-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8000',
      },
      timeout: 60_000,
      expect: { timeout: 15_000 },
    },
    {
      name: 'admin-panel-firefox',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:8000',
      },
      timeout: 60_000,
      expect: { timeout: 15_000 },
    },
    {
      name: 'admin-panel-webkit',
      use: {
        ...devices['Desktop Safari'],
        baseURL: 'http://localhost:8000',
      },
      timeout: 60_000,
      expect: { timeout: 15_000 },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 8000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    cwd: '.',
    // Run e2e against a writable panel so specs validate real behavior
    // rather than the demo's read-only guards.
    env: { ...process.env, DEMO_MODE: 'false' },
  },
})
