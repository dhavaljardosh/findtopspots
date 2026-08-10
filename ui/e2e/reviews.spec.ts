import { test, expect } from '@playwright/test'

/**
 * E2E — Review section flows
 *
 * Prerequisites:
 *   - Next.js dev server running at http://localhost:3000
 *   - API server running at http://localhost:3001 with seed data
 *
 * Auth strategy: no Clerk mocking. We only test unauthenticated states
 * (sign-in prompt visible, review form absent) and structural presence of the
 * reviews section. Authenticated-only submission tests are scaffolded but
 * skipped until Clerk test mode is configured.
 */

/** Navigate to /spots, click first card and return to the detail page. */
async function goToFirstSpotDetail(page: import('@playwright/test').Page) {
  await page.goto('/spots')
  const firstCard = page.locator('[data-testid="spot-card"]').first()
  await expect(firstCard).toBeVisible({ timeout: 15_000 })
  await firstCard.click()
  await expect(page).toHaveURL(/\/spots\/[0-9a-f-]{36}/, { timeout: 10_000 })
}

// ─── Unauthenticated ──────────────────────────────────────────────────────────

test.describe('Reviews — unauthenticated', () => {
  // P0 — review form is NOT shown; a sign-in link appears instead
  test('P0 — write-review form is absent; sign-in prompt shown instead', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const reviewsSection = page.locator('[data-testid="reviews-section"]')
    await expect(reviewsSection).toBeVisible({ timeout: 10_000 })

    // The AddReviewForm wrapper ("Write a Review" heading inside a card) should be absent
    await expect(reviewsSection.getByText(/write a review/i)).not.toBeVisible()

    // A sign-in link should be present instead
    await expect(reviewsSection.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  // P0 — reviews section heading is always present
  test('P0 — reviews section heading is always rendered', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const reviewsSection = page.locator('[data-testid="reviews-section"]')
    await expect(reviewsSection.getByRole('heading', { name: /reviews/i })).toBeVisible({ timeout: 10_000 })
  })

  // P1 — reviews list OR empty-state message is shown (never a blank section)
  test('P1 — reviews list or empty-state message is shown', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const reviewsSection = page.locator('[data-testid="reviews-section"]')
    await expect(reviewsSection).toBeVisible({ timeout: 10_000 })

    const existingReview = reviewsSection.locator('article, [data-testid="review-card"]').first()
    const emptyMsg = reviewsSection.getByText(/no reviews yet/i)

    // One of these should be present after the Suspense resolves
    await expect(existingReview.or(emptyMsg)).toBeVisible({ timeout: 12_000 })
  })

  // P1 — clicking sign-in link in review section goes to /sign-in
  test('P1 — sign-in link in reviews section navigates to sign-in page', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const reviewsSection = page.locator('[data-testid="reviews-section"]')
    const signInLink = reviewsSection.getByRole('link', { name: /sign in/i })
    await expect(signInLink).toBeVisible({ timeout: 10_000 })
    const href = await signInLink.getAttribute('href')
    expect(href).toMatch(/sign-in/)
  })
})

// ─── Authenticated (skipped until Clerk test mode is configured) ───────────────

test.describe('Reviews — authenticated (Clerk test mode required)', () => {
  /**
   * To enable these tests:
   * 1. Set CLERK_TEST_MODE=true in the Clerk dashboard.
   * 2. Generate a saved auth state: npx playwright codegen --save-storage=.auth/user.json
   * 3. Uncomment: test.use({ storageState: '.auth/user.json' })
   * 4. Remove test.skip() calls.
   */

  // test.use({ storageState: '.auth/user.json' })

  test.skip('P0 — review form is shown for authenticated user', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const reviewsSection = page.locator('[data-testid="reviews-section"]')
    await expect(reviewsSection.getByText(/write a review/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('textarea')).toBeVisible()
  })

  test.skip('P0 — authenticated user can submit a review and it appears in the list', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const reviewsSection = page.locator('[data-testid="reviews-section"]')

    const uniqueText = `E2E automated review at ${Date.now()}. This place is excellent!`
    await reviewsSection.locator('textarea').fill(uniqueText)

    // Select 5-star rating
    const starFive = reviewsSection.getByLabel(/5 stars?/i).or(reviewsSection.locator('[data-testid="star-5"]'))
    await starFive.click()

    await reviewsSection.getByRole('button', { name: /submit/i }).click()
    await expect(page.getByText(uniqueText)).toBeVisible({ timeout: 12_000 })
  })

  test.skip('P1 — review body shorter than 10 characters shows validation error', async ({ page }) => {
    await goToFirstSpotDetail(page)
    const textarea = page.locator('textarea').first()
    await textarea.fill('Short')
    await page.getByRole('button', { name: /submit/i }).click()
    await expect(page.getByText(/at least 10 characters|too short/i)).toBeVisible()
  })
})
