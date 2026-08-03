import { test, expect } from '@playwright/test'

/**
 * E2E — Authentication flows (Clerk)
 *
 * Covers:
 *   - Sign-up flow: redirected home after completing Clerk form
 *   - Sign-in flow: authenticated user sees their name / avatar
 *   - Protected routes redirect to sign-in when unauthenticated
 *   - "Add Spot" page is behind auth guard
 *
 * NOTE: Full Clerk sign-up/sign-in automation requires either:
 *   (a) Clerk's test mode with magic codes, or
 *   (b) a pre-created test user whose session token is injected via storageState.
 *
 * See: https://clerk.com/docs/testing/playwright
 *
 * Until Clerk test mode is configured, the auth action tests are scaffolded
 * with placeholders. The redirect / guard tests run without credentials.
 */

test.describe('Unauthenticated guards', () => {
  test('P0 — /spots/new redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/spots/new')

    // Clerk redirects to the sign-in page
    await expect(page).toHaveURL(/sign-in|auth\/login/i, { timeout: 8_000 })
  })

  test('P0 — sign-in page loads and shows the Clerk sign-in widget', async ({ page }) => {
    await page.goto('/sign-in')

    // Clerk's component renders an email/phone input
    const emailInput = page
      .getByRole('textbox', { name: /email/i })
      .or(page.getByPlaceholder(/email/i))

    await expect(emailInput).toBeVisible({ timeout: 10_000 })
  })

  test('P1 — sign-up page loads and shows the Clerk sign-up widget', async ({ page }) => {
    await page.goto('/sign-up')

    const emailInput = page
      .getByRole('textbox', { name: /email/i })
      .or(page.getByPlaceholder(/email/i))

    await expect(emailInput).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Sign-up flow (Clerk test mode required)', () => {
  /**
   * To enable these tests:
   * 1. Set CLERK_TEST_MODE=true in the Clerk dashboard.
   * 2. Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars in CI.
   * 3. Remove the test.skip() calls below.
   */

  test.skip('P1 — new user can complete sign-up and is redirected home', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL ?? 'test+clerk_test@example.com'

    await page.goto('/sign-up')

    // Fill in the Clerk sign-up form
    await page.getByPlaceholder(/email/i).fill(testEmail)
    await page.getByRole('button', { name: /continue|next|sign up/i }).click()

    // Clerk test mode accepts code "424242"
    const codeInput = page.getByPlaceholder(/code/i).or(page.getByLabel(/verification code/i))
    await expect(codeInput).toBeVisible({ timeout: 8_000 })
    await codeInput.fill('424242')
    await page.getByRole('button', { name: /verify|continue/i }).click()

    // Should land on home or spots after sign-up
    await expect(page).toHaveURL(/\/$|\/spots/, { timeout: 10_000 })
  })
})

test.describe('Sign-in flow (Clerk test mode required)', () => {
  test.skip('P1 — existing user can sign in and is redirected home', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL ?? 'test+clerk_test@example.com'
    const testPassword = process.env.E2E_TEST_PASSWORD ?? ''

    await page.goto('/sign-in')

    await page.getByPlaceholder(/email/i).fill(testEmail)
    await page.getByRole('button', { name: /continue|next/i }).click()

    await page.getByPlaceholder(/password/i).fill(testPassword)
    await page.getByRole('button', { name: /sign in|continue/i }).click()

    await expect(page).toHaveURL(/\/$|\/spots/, { timeout: 10_000 })
  })
})
