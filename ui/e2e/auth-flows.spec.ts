import { test, expect } from '@playwright/test'

/**
 * E2E — Authentication flows (Clerk)
 *
 * Prerequisites:
 *   - Next.js dev server running at http://localhost:3000
 *   - Clerk configured (publishable key set in .env.local)
 *
 * Strategy: No real Clerk sign-in. Tests verify:
 *   - Auth-gated routes redirect unauthenticated users to /sign-in
 *   - Sign-in / sign-up pages load and show the Clerk widget
 *   - /dashboard redirects to sign-in when unauthenticated
 *
 * Full sign-in automation requires Clerk test mode. See:
 * https://clerk.com/docs/testing/playwright
 */

// ─── Unauthenticated guards ───────────────────────────────────────────────────

test.describe('Unauthenticated guards', () => {
  // P0 — /spots/new redirects to sign-in
  test('P0 — /spots/new redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/spots/new')
    await expect(page).toHaveURL(/sign-in/i, { timeout: 12_000 })
  })

  // P0 — /dashboard redirects to sign-in
  test('P0 — /dashboard redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/sign-in/i, { timeout: 12_000 })
  })

  // P0 — sign-in page loads with the Clerk email input
  test('P0 — /sign-in loads and shows an email input', async ({ page }) => {
    await page.goto('/sign-in')
    const emailInput = page
      .getByRole('textbox', { name: /email/i })
      .or(page.getByPlaceholder(/email/i))
    await expect(emailInput).toBeVisible({ timeout: 15_000 })
  })

  // P0 — sign-up page loads with the Clerk email input
  test('P0 — /sign-up loads and shows an email input', async ({ page }) => {
    await page.goto('/sign-up')
    const emailInput = page
      .getByRole('textbox', { name: /email/i })
      .or(page.getByPlaceholder(/email/i))
    await expect(emailInput).toBeVisible({ timeout: 15_000 })
  })

  // P1 — sign-in page has a link to sign-up and vice-versa
  test('P1 — sign-in page has a link to /sign-up', async ({ page }) => {
    await page.goto('/sign-in')
    // Clerk widget includes a "Sign up" link
    const signUpLink = page.getByRole('link', { name: /sign up/i })
    await expect(signUpLink).toBeVisible({ timeout: 12_000 })
  })

  // P1 — the navbar on public pages shows Sign in / Sign up buttons
  test('P1 — navbar shows Sign in and Sign up links when unauthenticated', async ({ page }) => {
    await page.goto('/')
    const navbar = page.locator('[data-testid="navbar"]')
    await expect(navbar).toBeVisible()
    await expect(navbar.getByRole('link', { name: /sign in/i })).toBeVisible()
    await expect(navbar.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  // P1 — voting without auth redirects to sign-in
  test('P1 — clicking vote without auth redirects to sign-in', async ({ page }) => {
    await page.goto('/spots')
    const firstCard = page.locator('[data-testid="spot-card"]').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    await firstCard.click()
    await expect(page).toHaveURL(/\/spots\/[0-9a-f-]{36}/, { timeout: 10_000 })

    const voteBtn = page.locator('[data-testid="vote-button"]').first()
    await expect(voteBtn).toBeVisible({ timeout: 10_000 })
    await voteBtn.click()
    // VoteButton redirects via window.location.href = '/sign-in'
    await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 })
  })
})

// ─── Sign-up / sign-in flows (Clerk test mode required) ──────────────────────

test.describe('Sign-up flow (Clerk test mode required)', () => {
  /**
   * Enable by:
   * 1. Setting CLERK_TEST_MODE=true in Clerk dashboard
   * 2. Setting E2E_TEST_EMAIL env var
   * 3. Removing test.skip()
   */

  test.skip('P1 — new user can complete sign-up and is redirected home', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL ?? 'test+clerk_test@example.com'
    await page.goto('/sign-up')
    await page.getByPlaceholder(/email/i).fill(testEmail)
    await page.getByRole('button', { name: /continue|next|sign up/i }).click()
    // Clerk test mode accepts code "424242"
    const codeInput = page.getByPlaceholder(/code/i).or(page.getByLabel(/verification code/i))
    await expect(codeInput).toBeVisible({ timeout: 8_000 })
    await codeInput.fill('424242')
    await page.getByRole('button', { name: /verify|continue/i }).click()
    await expect(page).toHaveURL(/\/$|\/spots/, { timeout: 12_000 })
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
    await expect(page).toHaveURL(/\/$|\/spots/, { timeout: 12_000 })
  })
})
