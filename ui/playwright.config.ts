import { defineConfig, devices } from '@playwright/test'

/**
 * FindTopSpots — Playwright E2E configuration.
 * Docs: https://playwright.dev/docs/test-configuration
 *
 * Run all tests:        pnpm --filter @fts/ui test
 * Run headed:           pnpm --filter @fts/ui test --headed
 * Run single file:      pnpm --filter @fts/ui test e2e/spots.spec.ts
 * Debug a test:         pnpm --filter @fts/ui test --debug
 * Generate report:      pnpm --filter @fts/ui test --reporter=html
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Limit parallel workers on CI to avoid resource contention */
  workers: process.env.CI ? 1 : 4,
  /* Reporter to use */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    /* Base URL for all page.goto('/...') calls */
    baseURL: BASE_URL,

    /* Collect trace on first retry to aid debugging */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Global timeout for each action (click, fill, etc.) */
    actionTimeout: 10_000,
  },

  projects: [
    /* Desktop browsers */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile viewports */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Spin up Next.js dev server before tests if not already running */
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
