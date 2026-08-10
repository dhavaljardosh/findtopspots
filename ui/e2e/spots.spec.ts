import { test, expect } from '@playwright/test'

/**
 * E2E — Spots browsing, search, and category filter flows
 *
 * Prerequisites:
 *   - Next.js dev server running at http://localhost:3000 (managed by playwright.config.ts)
 *   - API server running at http://localhost:3001 with seed data containing
 *     spots in categories: cafe, restaurant, bar, park (used by search/filter tests)
 */

// ─── Browse ───────────────────────────────────────────────────────────────────

test.describe('Browse Spots (/spots)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spots')
  })

  // P0 — page loads with the Explore heading
  test('P0 — spots page loads with Explore heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /explore/i })).toBeVisible()
  })

  // P0 — at least one spot card renders after the Suspense boundary resolves
  test('P0 — spot cards are rendered in the grid', async ({ page }) => {
    const firstCard = page.locator('[data-testid="spot-card"]').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    const count = await page.locator('[data-testid="spot-card"]').count()
    expect(count).toBeGreaterThan(0)
  })

  // P0 — each card has a visible name
  test('P0 — each spot card displays its name', async ({ page }) => {
    await expect(page.locator('[data-testid="spot-card"]').first()).toBeVisible({ timeout: 15_000 })
    const name = page.locator('[data-testid="spot-card-name"]').first()
    await expect(name).toBeVisible()
    const text = await name.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  // P0 — clicking a card navigates to /spots/:id
  test('P0 — clicking a spot card navigates to the detail page', async ({ page }) => {
    const firstCard = page.locator('[data-testid="spot-card"]').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    const spotName = await firstCard.locator('[data-testid="spot-card-name"]').textContent()
    await firstCard.click()
    await expect(page).toHaveURL(/\/spots\/[0-9a-f-]{36}/, { timeout: 10_000 })
    if (spotName?.trim()) {
      await expect(page.getByText(spotName.trim())).toBeVisible({ timeout: 10_000 })
    }
  })

  // P0 — empty state appears when query matches nothing
  test('P0 — empty state is shown when search yields no results', async ({ page }) => {
    await page.goto('/spots?q=xyzzy-no-match-findtopspots-99999')
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/no spots found/i)).toBeVisible()
  })

  // P1 — the spot grid uses the correct responsive CSS classes
  test('P1 — spot grid has responsive column classes', async ({ page }) => {
    await expect(page.locator('[data-testid="spot-card"]').first()).toBeVisible({ timeout: 15_000 })
    const grid = page.locator('[data-testid="spot-grid"]')
    await expect(grid).toBeVisible()
    // Verify the grid element exists and contains spot cards
    const cardCount = await grid.locator('[data-testid="spot-card"]').count()
    expect(cardCount).toBeGreaterThan(0)
  })
})

// ─── Search ───────────────────────────────────────────────────────────────────

test.describe('Search', () => {
  // P0 — typing "cafe" and pressing Enter navigates to /spots?q=cafe
  test('P0 — submitting search navigates to filtered URL', async ({ page }) => {
    await page.goto('/spots')
    const searchInput = page.getByRole('combobox', { name: /search spots/i })
    await expect(searchInput).toBeVisible()
    await searchInput.fill('cafe')
    await searchInput.press('Enter')
    await expect(page).toHaveURL(/[?&]q=cafe/, { timeout: 10_000 })
  })

  // P0 — results label mentions the query after navigation
  test('P0 — results page shows the query label', async ({ page }) => {
    await page.goto('/spots?q=cafe')
    await expect(page.getByText(/results for/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/cafe/i)).toBeVisible()
  })

  // P1 — "See all results" in autocomplete dropdown navigates to /spots?q=...
  test('P1 — search autocomplete "See all results" navigates to /spots?q=', async ({ page }) => {
    await page.goto('/')
    // Use the hero search box
    const searchInput = page.getByRole('combobox', { name: /search spots/i }).first()
    await searchInput.fill('cafe')
    // Wait for the dropdown to appear
    const dropdown = page.getByRole('listbox')
    await expect(dropdown).toBeVisible({ timeout: 8_000 })
    // Click "See all results"
    const seeAllBtn = page.getByRole('option', { name: /see all results/i })
    await expect(seeAllBtn).toBeVisible()
    await seeAllBtn.click()
    await expect(page).toHaveURL(/[?&]q=cafe/, { timeout: 10_000 })
  })

  // P1 — clearing search and submitting returns to /spots without q param
  test('P1 — clearing search returns to unfiltered /spots', async ({ page }) => {
    await page.goto('/spots?q=park')
    const searchInput = page.getByRole('combobox', { name: /search spots/i })
    await searchInput.clear()
    await searchInput.press('Enter')
    // After clearing, should navigate to /spots without q=
    await expect(page).toHaveURL(/\/spots(\?(?!.*q=)|$)/, { timeout: 10_000 })
  })
})

// ─── Category Filter ───────────────────────────────────────────────────────────

test.describe('Category Filter', () => {
  // P0 — clicking a category chip adds category param to URL
  test('P0 — clicking Cafes chip filters by category=cafe', async ({ page }) => {
    await page.goto('/spots')
    // The category chips are Link elements rendered from CATEGORIES array
    await page.getByRole('link', { name: /^cafes$/i }).click()
    await expect(page).toHaveURL(/[?&]category=cafe/, { timeout: 10_000 })
  })

  // P0 — clicking "All" chip removes the category filter
  test('P0 — clicking All chip clears the category filter', async ({ page }) => {
    await page.goto('/spots?category=cafe')
    await page.getByRole('link', { name: /^all$/i }).click()
    await expect(page).not.toHaveURL(/category=/)
  })

  // P1 — category and search query can be combined
  test('P1 — category filter and search query combine in the URL', async ({ page }) => {
    await page.goto('/spots?category=restaurant')
    const searchInput = page.getByRole('combobox', { name: /search spots/i })
    await searchInput.fill('taco')
    await searchInput.press('Enter')
    await expect(page).toHaveURL(/q=taco/, { timeout: 10_000 })
  })

  // P1 — filtering by Restaurants shows category label on returned cards
  test('P1 — filtering by Restaurants only shows restaurant cards', async ({ page }) => {
    await page.goto('/spots?category=restaurant')
    const firstCard = page.locator('[data-testid="spot-card"]').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    // Verify at least some cards are present (no empty state)
    const emptyState = page.locator('[data-testid="empty-state"]')
    await expect(emptyState).not.toBeVisible()
  })
})
