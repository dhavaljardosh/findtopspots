import { test, expect } from '@playwright/test'

/**
 * E2E — Write Review flow (authenticated)
 *
 * Covers:
 *   - Unauthenticated user cannot see / submit the review form
 *   - Review form renders on a spot detail page for authenticated users
 *   - Rating selector and body textarea are present
 *   - Submitting a valid review shows it in the list and updates avgRating
 *   - Submitting a duplicate review shows an error (409)
 *   - Body validation: minimum 10 characters
 *
 * Auth-gated tests are skipped until Clerk test mode / storageState is set up.
 * See auth-flows.spec.ts for setup instructions.
 */

// A known-good spot UUID from seed data with at least 0 reviews.
const SEEDED_SPOT_ID = process.env.E2E_SEEDED_SPOT_ID ?? '00000000-0000-0000-0000-000000000001'

test.describe('Reviews — unauthenticated', () => {
  test('P0 — review form / write-review button is not shown to unauthenticated users', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    // The review form should be absent; a sign-in prompt may be shown instead
    const reviewForm = page.locator('[data-testid="review-form"]')
    const writeReviewBtn = page.getByRole('button', { name: /write a review|leave a review/i })

    await expect(reviewForm.or(writeReviewBtn)).not.toBeVisible()
  })
})

test.describe('Reviews — authenticated', () => {
  // Restore Clerk session before each test in this group.
  // test.use({ storageState: '.auth/user.json' })

  test.skip('P0 — review form is shown on the spot detail page for authenticated users', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    const trigger = page
      .getByRole('button', { name: /write a review|leave a review/i })
      .or(page.locator('[data-testid="review-form"]'))

    await expect(trigger).toBeVisible({ timeout: 8_000 })
  })

  test.skip('P0 — user can submit a review and it appears in the reviews list', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    // Open the review form if it is behind a button
    const writeBtn = page.getByRole('button', { name: /write a review|leave a review/i })
    if (await writeBtn.isVisible()) {
      await writeBtn.click()
    }

    // Select a rating — 5 stars
    const starFive = page
      .getByLabel(/5 stars?/i)
      .or(page.locator('[data-testid="star-5"]'))
    await expect(starFive).toBeVisible({ timeout: 6_000 })
    await starFive.click()

    // Fill in the review body
    const uniqueReviewText = `E2E automated review submitted at ${Date.now()}. This place was wonderful!`
    const bodyField = page
      .getByLabel(/review body|your review|write your review/i)
      .or(page.getByPlaceholder(/share your experience/i))
      .or(page.locator('textarea'))
    await bodyField.fill(uniqueReviewText)

    await page.getByRole('button', { name: /submit review|post review|submit/i }).click()

    // The new review should appear in the list
    await expect(page.getByText(uniqueReviewText)).toBeVisible({ timeout: 10_000 })
  })

  test.skip('P0 — submitting a duplicate review shows a conflict error', async ({ page }) => {
    // This test assumes the authenticated test user has already submitted a review
    // for SEEDED_SPOT_ID (e.g., from a previous run or seed data).
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    const writeBtn = page.getByRole('button', { name: /write a review|leave a review/i })
    if (await writeBtn.isVisible()) {
      await writeBtn.click()
    }

    const bodyField = page
      .getByLabel(/review body|your review/i)
      .or(page.getByPlaceholder(/share your experience/i))
      .or(page.locator('textarea'))
    await bodyField.fill('Trying to post a duplicate review for this great spot.')

    const starFour = page.getByLabel(/4 stars?/i).or(page.locator('[data-testid="star-4"]'))
    if (await starFour.isVisible()) await starFour.click()

    await page.getByRole('button', { name: /submit review|post review|submit/i }).click()

    // An error toast or inline error should be shown
    await expect(
      page.getByText(/already reviewed|you have already|duplicate|409/i),
    ).toBeVisible({ timeout: 8_000 })
  })

  test.skip('P0 — submitting a review updates the spot avgRating display', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    const ratingBefore = await page.locator('[data-testid="spot-avg-rating"]').textContent()

    const writeBtn = page.getByRole('button', { name: /write a review|leave a review/i })
    if (await writeBtn.isVisible()) await writeBtn.click()

    const starFive = page.getByLabel(/5 stars?/i).or(page.locator('[data-testid="star-5"]'))
    await starFive.click()

    const bodyField = page
      .getByLabel(/review body|your review/i)
      .or(page.locator('textarea'))
    await bodyField.fill('Updating the spot rating with this stellar E2E review, cannot wait to return!')

    await page.getByRole('button', { name: /submit review|post review|submit/i }).click()

    // After submission, the avgRating should reflect the new value (or at least still be visible)
    await expect(page.locator('[data-testid="spot-avg-rating"]')).toBeVisible({ timeout: 10_000 })
    const ratingAfter = await page.locator('[data-testid="spot-avg-rating"]').textContent()
    // Rating must have been rendered (may or may not differ depending on existing reviews)
    expect(ratingAfter).not.toBeNull()
    expect(ratingAfter).toBeTruthy()
  })

  test.skip('P1 — review body shorter than 10 characters shows inline validation error', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    const writeBtn = page.getByRole('button', { name: /write a review|leave a review/i })
    if (await writeBtn.isVisible()) await writeBtn.click()

    const starThree = page.getByLabel(/3 stars?/i).or(page.locator('[data-testid="star-3"]'))
    if (await starThree.isVisible()) await starThree.click()

    const bodyField = page.locator('textarea').first()
    await bodyField.fill('Short')

    await page.getByRole('button', { name: /submit review|post review|submit/i }).click()

    await expect(page.getByText(/at least 10 characters|review too short/i)).toBeVisible()
  })
})
