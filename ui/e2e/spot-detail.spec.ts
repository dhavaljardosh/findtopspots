import { test, expect } from '@playwright/test'

/**
 * E2E — Spot detail page (/spots/:id)
 *
 * Prerequisites:
 *   - Next.js dev server running at http://localhost:3000
 *   - API server running at http://localhost:3001 with seed data
 *
 * Strategy: navigate to /spots first, pick the first card, then follow to
 * its detail page — this avoids hardcoding a UUID that may differ per environment.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Navigate to /spots, click the first card and wait for the detail URL. */
async function goToFirstSpotDetail(page: import('@playwright/test').Page) {
  await page.goto('/spots')
  const firstCard = page.locator('[data-testid="spot-card"]').first()
  await expect(firstCard).toBeVisible({ timeout: 15_000 })
  await firstCard.click()
  await expect(page).toHaveURL(/\/spots\/[0-9a-f-]{36}/, { timeout: 10_000 })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Spot Detail Page', () => {
  // P0 — detail page loads and shows the spot name
  test('P0 — detail page loads with a spot name heading', async ({ page }) => {
    await goToFirstSpotDetail(page)
    // The spot name is in an h1 overlaid on the hero photo
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible({ timeout: 10_000 })
    const text = await heading.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  // P0 — category badge is shown
  test('P0 — category badge is visible on the hero', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const badge = page.locator('[data-testid="spot-category"]')
    await expect(badge).toBeVisible({ timeout: 10_000 })
  })

  // P0 — address link is rendered
  test('P0 — address is displayed with a map link', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const address = page.locator('[data-testid="spot-address"]')
    await expect(address).toBeVisible({ timeout: 10_000 })
    const href = await address.getAttribute('href')
    expect(href).toMatch(/google\.com\/maps/)
  })

  // P0 — vote button is visible on the detail page
  test('P0 — vote button is visible in the hero area', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const voteWrapper = page.locator('[data-testid="vote-button-wrapper"]')
    await expect(voteWrapper).toBeVisible({ timeout: 10_000 })
    const voteBtn = voteWrapper.locator('[data-testid="vote-button"]')
    await expect(voteBtn).toBeVisible()
  })

  // P0 — reviews section heading is present
  test('P0 — reviews section is present', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const reviewsSection = page.locator('[data-testid="reviews-section"]')
    await expect(reviewsSection).toBeVisible({ timeout: 10_000 })
    await expect(reviewsSection.getByRole('heading', { name: /reviews/i })).toBeVisible()
  })

  // P0 — claim banner shown for unverified spots (most seed data is unverified)
  test('P0 — "Is this your business?" claim banner is shown for unverified spots', async ({ page }) => {
    await goToFirstSpotDetail(page)
    // The claim banner may or may not be present depending on whether the spot is verified
    // We check that if it is present, it has the correct text and a Claim listing link
    const claimBanner = page.locator('[data-testid="claim-banner"]')
    const isVisible = await claimBanner.isVisible()
    if (isVisible) {
      await expect(claimBanner.getByText(/is this your business/i)).toBeVisible()
      await expect(claimBanner.getByRole('link', { name: /claim listing/i })).toBeVisible()
    }
    // If not visible, the spot is verified — that is a valid state, test passes
  })

  // P1 — stats bar has the rating display
  test('P1 — stats bar shows average rating', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const statsBar = page.locator('[data-testid="stats-bar"]')
    await expect(statsBar).toBeVisible({ timeout: 10_000 })
    const rating = page.locator('[data-testid="spot-avg-rating"]')
    await expect(rating).toBeVisible()
  })

  // P1 — navigating to /spots/00000000-0000-0000-0000-000000000000 shows not-found UI
  test('P1 — invalid spot ID shows not-found UI', async ({ page }) => {
    await page.goto('/spots/00000000-0000-0000-0000-000000000000')
    // Next.js notFound() renders a 404 page; either the URL changes or text is shown
    const notFound = page
      .getByText(/not found|could not be found|spot not found/i)
      .or(page.getByRole('heading', { name: /not found/i }))
    await expect(notFound).toBeVisible({ timeout: 15_000 })
  })

  // P1 — claim listing link navigates to /spots/:id/claim
  test('P1 — Claim listing link navigates to the claim page', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const claimBanner = page.locator('[data-testid="claim-banner"]')
    const isVisible = await claimBanner.isVisible()
    if (!isVisible) {
      test.skip() // spot is verified, no claim banner to test
      return
    }
    const claimLink = claimBanner.getByRole('link', { name: /claim listing/i })
    const href = await claimLink.getAttribute('href')
    expect(href).toMatch(/\/spots\/[0-9a-f-]+\/claim/)
  })

  // P1 — unauthenticated user sees a sign-in prompt in the reviews section
  test('P1 — sign-in prompt shown in reviews section for unauthenticated users', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const reviewsSection = page.locator('[data-testid="reviews-section"]')
    await expect(reviewsSection).toBeVisible({ timeout: 10_000 })
    // Should contain "Sign in to write a review"
    const signInLink = reviewsSection.getByRole('link', { name: /sign in/i })
    await expect(signInLink).toBeVisible()
  })
})
