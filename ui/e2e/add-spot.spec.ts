import { test, expect } from '@playwright/test'

/**
 * E2E — Add Spot flow (authenticated)
 *
 * Covers:
 *   - Auth-gated access: unauthenticated user cannot reach /spots/new
 *   - Form renders with all required fields
 *   - Inline validation errors on invalid submit
 *   - Successful submission creates the spot and navigates to its detail page
 *
 * Tests that require authentication are skipped until Clerk test mode is
 * configured. See auth-flows.spec.ts for setup instructions.
 */

test.describe('Add Spot — unauthenticated', () => {
  test('P0 — unauthenticated user is redirected away from /spots/new', async ({ page }) => {
    await page.goto('/spots/new')
    await expect(page).toHaveURL(/sign-in|auth\/login/i, { timeout: 8_000 })
  })
})

test.describe('Add Spot — authenticated', () => {
  // Restore auth state from a saved Clerk session.
  // Generate with: npx playwright codegen --save-storage=.auth/user.json
  // Then uncomment the storageState line below.
  //
  // test.use({ storageState: '.auth/user.json' })

  test.skip('P0 — /spots/new renders the add-spot form for authenticated users', async ({ page }) => {
    await page.goto('/spots/new')

    await expect(page.getByRole('heading', { name: /add.*spot|new spot|create spot/i })).toBeVisible()
    await expect(page.getByLabel(/name/i)).toBeVisible()
    await expect(page.getByLabel(/description/i)).toBeVisible()
    await expect(page.getByLabel(/category/i)).toBeVisible()
    await expect(page.getByLabel(/address/i)).toBeVisible()
  })

  test.skip('P0 — submitting the form with empty fields shows inline validation errors', async ({ page }) => {
    await page.goto('/spots/new')

    // Attempt to submit with no data
    await page.getByRole('button', { name: /submit|add spot|create/i }).click()

    // Each required field should have an associated error message
    await expect(page.getByText(/name.*required|enter a name/i)).toBeVisible()
    await expect(page.getByText(/description.*required|enter a description/i)).toBeVisible()
  })

  test.skip('P0 — submitting a valid form creates the spot and navigates to its detail page', async ({ page }) => {
    await page.goto('/spots/new')

    const uniqueName = `E2E Test Spot ${Date.now()}`

    await page.getByLabel(/name/i).fill(uniqueName)
    await page.getByLabel(/description/i).fill('This is an automated E2E test spot created by Playwright.')
    await page.getByLabel(/category/i).selectOption('cafe')
    await page.getByLabel(/address/i).fill('123 E 6th St, Austin, TX 78701')

    // Lat/lng might be auto-filled by a geocoder or require manual input
    const latInput = page.getByLabel(/latitude|lat/i)
    const lngInput = page.getByLabel(/longitude|lng/i)
    if (await latInput.isVisible()) {
      await latInput.fill('30.2672')
      await lngInput.fill('-97.7431')
    }

    await page.getByRole('button', { name: /submit|add spot|create/i }).click()

    // Should navigate to the new spot's detail page
    await expect(page).toHaveURL(/\/spots\/[a-f0-9-]{36}/, { timeout: 12_000 })
    await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible()
  })

  test.skip('P1 — name field enforces 2-character minimum', async ({ page }) => {
    await page.goto('/spots/new')

    await page.getByLabel(/name/i).fill('X')
    await page.getByRole('button', { name: /submit|add spot|create/i }).click()

    await expect(page.getByText(/at least 2 characters|name too short/i)).toBeVisible()
  })

  test.skip('P1 — description field enforces 10-character minimum', async ({ page }) => {
    await page.goto('/spots/new')

    await page.getByLabel(/description/i).fill('Too short')
    await page.getByRole('button', { name: /submit|add spot|create/i }).click()

    await expect(page.getByText(/at least 10 characters|description too short/i)).toBeVisible()
  })
})
