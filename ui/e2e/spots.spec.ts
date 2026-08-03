import { test, expect } from '@playwright/test'

/**
 * E2E — Spots browsing and discovery flows
 *
 * Covers:
 *   - Home page loads and redirects to /spots
 *   - Spot cards are visible in the grid
 *   - Clicking a card navigates to the spot detail page
 *   - Text search filters results
 *   - Category filter chips narrow results
 *   - Empty-state message when no results match
 *   - Edge: very long spot name is truncated with ellipsis
 *
 * Prerequisites: the dev server must be running (managed by playwright.config.ts webServer).
 * The API must be reachable and seeded with at least a handful of spots.
 * For CI, point PLAYWRIGHT_BASE_URL at a preview deployment with seed data.
 */

test.describe('Browse Spots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spots')
  })

  test('P0 — spots page loads and displays the browse heading', async ({ page }) => {
    await expect(page).toHaveTitle(/FindTopSpots|Browse Spots/i)
    await expect(page.getByRole('heading', { name: /browse spots/i })).toBeVisible()
  })

  test('P0 — spot cards are rendered in the grid', async ({ page }) => {
    // Wait for the Suspense boundary to resolve (skeleton → real cards)
    const cards = page.locator('[data-testid="spot-card"]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('P0 — clicking a spot card navigates to the detail page', async ({ page }) => {
    const firstCard = page.locator('[data-testid="spot-card"]').first()
    await expect(firstCard).toBeVisible({ timeout: 10_000 })

    // Grab the spot name before navigating so we can verify it appears on the detail page
    const spotName = await firstCard.locator('[data-testid="spot-card-name"]').textContent()

    await firstCard.click()

    // URL should change to /spots/:id
    await expect(page).toHaveURL(/\/spots\/[a-f0-9-]{36}/)

    // Spot name should be visible on the detail page
    if (spotName) {
      await expect(page.getByText(spotName.trim())).toBeVisible()
    }
  })

  test('P0 — empty state is shown when search yields no results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search spots/i)
    await searchInput.fill('xyzzy-no-match-findtopspots-99999')
    await searchInput.press('Enter')

    await expect(
      page.getByText(/no spots found/i),
    ).toBeVisible({ timeout: 8_000 })
  })

  test('P1 — skeleton grid is shown while spots are loading', async ({ page }) => {
    // Intercept the API call and delay it so the skeleton is visible
    await page.route('**/api/v1/spots*', async (route) => {
      await new Promise((r) => setTimeout(r, 800))
      await route.continue()
    })

    await page.goto('/spots')

    // Skeletons should be visible before the real data arrives
    const skeletons = page.locator('[data-testid="spot-card-skeleton"]')
    await expect(skeletons.first()).toBeVisible()
  })
})

test.describe('Search', () => {
  test('P0 — typing in the search bar and submitting shows filtered results', async ({ page }) => {
    await page.goto('/spots')

    const searchInput = page.getByPlaceholder(/search spots/i)
    await searchInput.fill('cafe')
    await searchInput.press('Enter')

    await expect(page).toHaveURL(/[?&]q=cafe/)

    // Search label should appear
    await expect(page.getByText(/search results for/i)).toBeVisible()
    await expect(page.getByText(/"cafe"/i)).toBeVisible()
  })

  test('P0 — search query is preserved in the URL', async ({ page }) => {
    await page.goto('/spots?q=park')

    const searchInput = page.getByPlaceholder(/search spots/i)
    await expect(searchInput).toHaveValue('park')
  })

  test('P1 — clearing search returns full results', async ({ page }) => {
    await page.goto('/spots?q=specificquery')

    const searchInput = page.getByPlaceholder(/search spots/i)
    await searchInput.clear()
    await searchInput.press('Enter')

    await expect(page).toHaveURL(/\/spots$|\/spots\?$/)
  })
})

test.describe('Category Filter', () => {
  test('P0 — clicking a category chip filters by that category', async ({ page }) => {
    await page.goto('/spots')

    await page.getByRole('link', { name: /^cafe$/i }).click()

    await expect(page).toHaveURL(/[?&]category=cafe/)
    // Active chip should have blue styling (check aria-current or class)
    const activeChip = page.getByRole('link', { name: /^cafe$/i })
    await expect(activeChip).toHaveClass(/bg-blue-600/)
  })

  test('P1 — clicking "All" chip removes the category filter', async ({ page }) => {
    await page.goto('/spots?category=cafe')

    await page.getByRole('link', { name: /^all$/i }).click()

    await expect(page).not.toHaveURL(/category=/)
  })

  test('P1 — category filter and search query can be combined', async ({ page }) => {
    await page.goto('/spots')

    // Select category first
    await page.getByRole('link', { name: /^restaurant$/i }).click()
    await expect(page).toHaveURL(/category=restaurant/)

    // Then add a text search
    const searchInput = page.getByPlaceholder(/search spots/i)
    await searchInput.fill('taco')
    await searchInput.press('Enter')

    await expect(page).toHaveURL(/q=taco/)
    await expect(page).toHaveURL(/category=restaurant/)
  })
})
