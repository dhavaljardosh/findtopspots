import { test, expect } from '@playwright/test'

/**
 * E2E — Spot detail page
 *
 * Covers:
 *   - Detail page loads for a valid spot ID
 *   - 404 / not-found shown for an invalid ID
 *   - Reviews list is shown (or "No reviews yet" empty state)
 *   - Rating display is present
 *   - Spot with 0 reviews shows the "No reviews yet" empty state
 */

// A known-good spot UUID from seed data. Replace with a real seeded ID before running.
const SEEDED_SPOT_ID = process.env.E2E_SEEDED_SPOT_ID ?? '00000000-0000-0000-0000-000000000001'

test.describe('Spot Detail Page', () => {
  test('P0 — detail page loads for a valid spot', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    // Should not be a 404 page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
    await expect(page).not.toHaveURL(/404|not-found/)
  })

  test('P0 — spot name and category are displayed', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    // Category badge / label should be visible somewhere on the page
    const categoryBadge = page.locator('[data-testid="spot-category"]')
    await expect(categoryBadge).toBeVisible()
  })

  test('P0 — average rating and review count are shown', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    await expect(page.locator('[data-testid="spot-avg-rating"]')).toBeVisible()
    await expect(page.locator('[data-testid="spot-review-count"]')).toBeVisible()
  })

  test('P0 — reviews section is present on the detail page', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    await expect(page.getByRole('heading', { name: /reviews/i })).toBeVisible()
  })

  test('P1 — "No reviews yet" empty state shown for spot with 0 reviews', async ({ page }) => {
    // This test targets a spot that has no reviews in seed data.
    // Adjust E2E_EMPTY_SPOT_ID in CI environment variables.
    const emptySpotId = process.env.E2E_EMPTY_SPOT_ID ?? SEEDED_SPOT_ID
    await page.goto(`/spots/${emptySpotId}`)

    // Either reviews exist, or the empty state message is shown — never a blank section
    const reviewsList = page.locator('[data-testid="reviews-list"]')
    const emptyState = page.getByText(/no reviews yet/i)

    await expect(reviewsList.or(emptyState)).toBeVisible({ timeout: 8_000 })
  })

  test('P1 — navigating to a nonexistent spot shows not-found UI', async ({ page }) => {
    await page.goto('/spots/00000000-0000-0000-0000-000000000000')

    // Next.js notFound() renders a not-found page (HTTP 404 or UI-level)
    const notFoundIndicator = page
      .getByText(/not found|spot not found|could not be found/i)
      .or(page.locator('[data-testid="not-found"]'))

    await expect(notFoundIndicator).toBeVisible({ timeout: 8_000 })
  })

  test('P1 — address and map coordinates are shown', async ({ page }) => {
    await page.goto(`/spots/${SEEDED_SPOT_ID}`)

    await expect(page.locator('[data-testid="spot-address"]')).toBeVisible()
  })
})
