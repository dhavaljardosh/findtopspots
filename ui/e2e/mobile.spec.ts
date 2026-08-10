import { test, expect } from '@playwright/test'

/**
 * E2E — Mobile-specific layout and navigation tests
 *
 * Prerequisites:
 *   - Next.js dev server running at http://localhost:3000
 *   - API server running at http://localhost:3001 with seed data
 *
 * Viewport: 390×844 (iPhone 14 / similar) — overrides project viewport.
 *
 * Covers:
 *   P0 — bottom mobile nav is visible at mobile width
 *   P0 — mobile nav has Home and Explore links
 *   P0 — mobile nav Home link navigates to /
 *   P0 — mobile nav Explore link navigates to /spots
 *   P0 — spot cards stack to single column on mobile
 *   P1 — home page hero search is usable on mobile
 *   P1 — category quick-links are horizontally scrollable on mobile
 *   P1 — spot detail page renders correctly on mobile
 *   P1 — autocomplete dropdown is usable on mobile
 *   P1 — "All Top Spots" heading is visible on mobile home page
 */

test.use({ viewport: { width: 390, height: 844 } })

test.describe('Mobile Layout & Navigation', () => {
  // P0 — bottom nav is visible on mobile at home
  test('P0 — mobile bottom nav is visible at mobile viewport', async ({ page }) => {
    await page.goto('/')
    const mobileNav = page.locator('[data-testid="mobile-nav"]')
    await expect(mobileNav).toBeVisible()
  })

  // P0 — mobile nav has Home and Explore links
  test('P0 — mobile nav contains Home and Explore links', async ({ page }) => {
    await page.goto('/')
    const mobileNav = page.locator('[data-testid="mobile-nav"]')
    await expect(mobileNav).toBeVisible()
    await expect(mobileNav.getByRole('link', { name: /home/i })).toBeVisible()
    await expect(mobileNav.getByRole('link', { name: /explore/i })).toBeVisible()
  })

  // P0 — tapping Home in mobile nav navigates to /
  test('P0 — tapping Home in mobile nav navigates to /', async ({ page }) => {
    await page.goto('/spots')
    const mobileNav = page.locator('[data-testid="mobile-nav"]')
    await expect(mobileNav).toBeVisible()
    await mobileNav.getByRole('link', { name: /home/i }).click()
    await expect(page).toHaveURL(/^\/$|^\/\?/, { timeout: 10_000 })
  })

  // P0 — tapping Explore in mobile nav navigates to /spots
  test('P0 — tapping Explore in mobile nav navigates to /spots', async ({ page }) => {
    await page.goto('/')
    const mobileNav = page.locator('[data-testid="mobile-nav"]')
    await expect(mobileNav).toBeVisible()
    await mobileNav.getByRole('link', { name: /explore/i }).click()
    await expect(page).toHaveURL(/\/spots/, { timeout: 10_000 })
  })

  // P0 — spot cards stack to 1 column on mobile (grid element has grid-cols-1)
  test('P0 — spot grid renders cards in single-column layout on mobile', async ({ page }) => {
    await page.goto('/spots')
    const firstCard = page.locator('[data-testid="spot-card"]').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })

    // On mobile the grid should show 1 column — cards span the full width
    const grid = page.locator('[data-testid="spot-grid"]')
    await expect(grid).toBeVisible()

    // Measure card width vs viewport width — on mobile they should be close to full width
    const cardBox = await firstCard.boundingBox()
    expect(cardBox).not.toBeNull()
    if (cardBox) {
      // On mobile (390px), a single-column card should be > 300px wide
      expect(cardBox.width).toBeGreaterThan(300)
    }
  })

  // P1 — hero search is accessible on mobile
  test('P1 — hero search input is visible and usable on mobile', async ({ page }) => {
    await page.goto('/')
    const heroSearch = page.locator('[data-testid="hero-search"]')
    await expect(heroSearch).toBeVisible()
    const searchInput = heroSearch.getByRole('combobox', { name: /search spots/i })
    await expect(searchInput).toBeVisible()
    await searchInput.fill('cafe')
    await searchInput.press('Enter')
    await expect(page).toHaveURL(/[?&]q=cafe/, { timeout: 10_000 })
  })

  // P1 — category quick-links container is visible on mobile
  test('P1 — category quick-links are visible on mobile', async ({ page }) => {
    await page.goto('/')
    const quickLinks = page.locator('[data-testid="category-quicklinks"]')
    await expect(quickLinks).toBeVisible()
    // At least one category link should be in view
    const restaurantsLink = quickLinks.getByRole('link', { name: /restaurants/i })
    await expect(restaurantsLink).toBeVisible()
  })

  // P1 — spot detail page renders correctly on mobile
  test('P1 — spot detail page hero and vote button render on mobile', async ({ page }) => {
    await page.goto('/spots')
    const firstCard = page.locator('[data-testid="spot-card"]').first()
    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    await firstCard.click()
    await expect(page).toHaveURL(/\/spots\/[0-9a-f-]{36}/, { timeout: 10_000 })

    // Spot name heading should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
    // Vote button wrapper should be visible
    await expect(page.locator('[data-testid="vote-button-wrapper"]')).toBeVisible({ timeout: 10_000 })
  })

  // P1 — autocomplete dropdown opens on mobile
  test('P1 — search autocomplete dropdown opens on mobile', async ({ page }) => {
    await page.goto('/spots')
    const searchInput = page.getByRole('combobox', { name: /search spots/i }).first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill('ca')
    const dropdown = page.getByRole('listbox')
    await expect(dropdown).toBeVisible({ timeout: 8_000 })
  })

  // P1 — "All Top Spots" heading visible on mobile home page
  test('P1 — All Top Spots heading is visible on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/all top spots/i)).toBeVisible({ timeout: 15_000 })
  })
})
