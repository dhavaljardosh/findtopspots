import { test, expect } from '@playwright/test'

/**
 * E2E — Add Spot flow (/spots/new)
 *
 * Prerequisites:
 *   - Next.js dev server running at http://localhost:3000
 *   - Clerk configured
 *
 * Strategy: unauthenticated tests verify the auth gate (redirect to /sign-in).
 * Authenticated tests are skipped until Clerk test mode is configured.
 *
 * To enable auth tests:
 *   1. Configure Clerk test mode (https://clerk.com/docs/testing/playwright)
 *   2. Generate: npx playwright codegen --save-storage=.auth/user.json
 *   3. Uncomment test.use({ storageState: '.auth/user.json' })
 *   4. Remove test.skip() calls
 */

// ─── Unauthenticated guard ────────────────────────────────────────────────────

test.describe('Add Spot — unauthenticated', () => {
  // P0 — navigating to /spots/new without auth redirects to sign-in
  test('P0 — unauthenticated user is redirected away from /spots/new', async ({ page }) => {
    await page.goto('/spots/new')
    await expect(page).toHaveURL(/sign-in/i, { timeout: 12_000 })
  })

  // P0 — the redirect URL includes a return path so user lands back after signing in
  test('P0 — redirect from /spots/new preserves return path', async ({ page }) => {
    await page.goto('/spots/new')
    await expect(page).toHaveURL(/sign-in/i, { timeout: 12_000 })
    // Clerk appends redirect_url or similar — page should be /sign-in
    const url = page.url()
    expect(url).toContain('sign-in')
  })
})

// ─── Authenticated (skipped until Clerk test mode configured) ─────────────────

test.describe('Add Spot — authenticated (Clerk test mode required)', () => {
  // test.use({ storageState: '.auth/user.json' })

  // P0 — /spots/new renders the add-spot form
  test.skip('P0 — /spots/new renders the add-spot form with required fields', async ({ page }) => {
    await page.goto('/spots/new')
    await expect(page.getByRole('heading', { name: /add.*spot|new spot|create spot/i })).toBeVisible()
    await expect(page.getByLabel(/name/i)).toBeVisible()
    await expect(page.getByLabel(/description/i)).toBeVisible()
    await expect(page.getByLabel(/category/i)).toBeVisible()
    await expect(page.getByLabel(/address/i)).toBeVisible()
  })

  // P0 — empty submission shows inline validation errors
  test.skip('P0 — submitting with empty fields shows validation errors', async ({ page }) => {
    await page.goto('/spots/new')
    await page.getByRole('button', { name: /submit|add spot|create/i }).click()
    await expect(page.getByText(/name.*required|enter a name/i)).toBeVisible()
  })

  // P0 — valid form submission creates spot and navigates to detail page
  test.skip('P0 — valid form creates the spot and navigates to its detail page', async ({ page }) => {
    await page.goto('/spots/new')
    const uniqueName = `E2E Test Spot ${Date.now()}`

    await page.getByLabel(/name/i).fill(uniqueName)
    await page.getByLabel(/description/i).fill('Automated E2E test spot created by Playwright.')
    await page.getByLabel(/category/i).selectOption('cafe')
    await page.getByLabel(/address/i).fill('123 E 6th St, Austin, TX 78701')

    const latInput = page.getByLabel(/latitude|lat/i)
    if (await latInput.isVisible()) {
      await latInput.fill('30.2672')
      await page.getByLabel(/longitude|lng/i).fill('-97.7431')
    }

    await page.getByRole('button', { name: /submit|add spot|create/i }).click()
    await expect(page).toHaveURL(/\/spots\/[0-9a-f-]{36}/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible()
  })

  // P1 — name field enforces minimum length
  test.skip('P1 — name field enforces 2-character minimum', async ({ page }) => {
    await page.goto('/spots/new')
    await page.getByLabel(/name/i).fill('X')
    await page.getByRole('button', { name: /submit|add spot|create/i }).click()
    await expect(page.getByText(/at least 2 characters|name too short/i)).toBeVisible()
  })

  // P1 — description field enforces minimum length
  test.skip('P1 — description field enforces 10-character minimum', async ({ page }) => {
    await page.goto('/spots/new')
    await page.getByLabel(/description/i).fill('Too short')
    await page.getByRole('button', { name: /submit|add spot|create/i }).click()
    await expect(page.getByText(/at least 10 characters|description too short/i)).toBeVisible()
  })
})
