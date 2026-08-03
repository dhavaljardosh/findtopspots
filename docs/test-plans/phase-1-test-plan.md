# Phase 1 Test Plan

## Scope
All MVP API endpoints and user-facing flows for the FindTopSpots platform.
Covers unit/service layer (Vitest), route/integration layer (Vitest + Hono test client),
and full-browser E2E flows (Playwright).

---

## API Tests (Vitest)

### Spots

| Test | Type | Priority |
|------|------|----------|
| GET /api/v1/spots returns 200 + `{ spots: [] }` shape | Integration | P0 |
| GET /api/v1/spots?q=cafe filters by name/description | Integration | P1 |
| GET /api/v1/spots?category=restaurant filters by category | Integration | P1 |
| GET /api/v1/spots?limit=5 respects pagination limit | Integration | P1 |
| GET /api/v1/spots?cursor=<iso> returns next page | Integration | P1 |
| POST /api/v1/spots with valid body + auth creates spot (201) | Integration | P0 |
| POST /api/v1/spots without Authorization header returns 401 | Integration | P0 |
| POST /api/v1/spots with invalid body (missing name) returns 400 | Integration | P0 |
| GET /api/v1/spots/:id returns spot with tags + photos | Integration | P0 |
| GET /api/v1/spots/:id for nonexistent id returns 404 | Integration | P1 |
| PUT /api/v1/spots/:id updates spot when called by owner (200) | Integration | P1 |
| PUT /api/v1/spots/:id by non-owner returns 403 | Integration | P0 |
| PUT /api/v1/spots/:id for nonexistent spot returns 404 | Integration | P1 |
| DELETE /api/v1/spots/:id by owner deletes spot (200) | Integration | P1 |
| DELETE /api/v1/spots/:id by non-owner returns 403 | Integration | P0 |

### Reviews

| Test | Type | Priority |
|------|------|----------|
| POST /api/v1/spots/:id/reviews creates review (201) | Integration | P0 |
| POST /api/v1/spots/:id/reviews without auth returns 401 | Integration | P0 |
| POST duplicate review (same user + spot) returns 409 | Integration | P0 |
| POST review on own spot returns 403 | Integration | P0 |
| POST review on nonexistent spot returns 404 | Integration | P1 |
| POST review with rating outside 1-5 returns 400 | Integration | P0 |
| POST review with body < 10 chars returns 400 | Integration | P0 |
| GET /api/v1/spots/:id/reviews returns `{ reviews: [] }` | Integration | P0 |
| GET reviews respects `?limit=` parameter | Integration | P1 |
| Creating a review updates parent spot avgRating | Integration | P0 |
| Creating a review updates parent spot reviewCount | Integration | P0 |

### Users

| Test | Type | Priority |
|------|------|----------|
| GET /api/v1/users/me returns current user profile | Integration | P0 |
| GET /api/v1/users/me without auth returns 401 | Integration | P0 |
| POST /api/v1/webhooks/clerk upserts user on user.created event | Integration | P1 |

---

## Service Unit Tests (Vitest — src/services/)

### spots.test.ts (see api/src/services/__tests__/spots.test.ts)

| Test | Priority |
|------|----------|
| getSpots() returns all spots with no filters | P0 |
| getSpots() filters by category | P1 |
| getSpots() filters by search query | P1 |
| getSpots() paginates with cursor + limit | P1 |
| getSpots() returns no nextCursor on last page | P1 |
| getSpotById() returns spot for valid ID | P0 |
| getSpotById() returns null for unknown ID | P0 |
| createSpot() inserts spot and returns record | P0 |
| createSpot() inserts tags when provided | P1 |
| createSpot() skips tag insert when no tags | P1 |
| updateSpot() updates and returns spot for owner | P0 |
| updateSpot() returns null for nonexistent spot | P0 |
| updateSpot() throws/errors for non-owner | P0 |
| deleteSpot() removes spot for owner | P1 |
| deleteSpot() returns false for nonexistent spot | P1 |
| deleteSpot() throws/errors for non-owner | P0 |

### reviews.test.ts (see api/src/services/__tests__/reviews.test.ts)

| Test | Priority |
|------|----------|
| createReview() inserts review and returns record | P0 |
| createReview() recalculates parent spot avgRating | P0 |
| createReview() recalculates parent spot reviewCount | P0 |
| createReview() throws when user reviews own spot | P0 |
| createReview() throws on duplicate (same user + spot) | P0 |
| createReview() throws when spot not found | P0 |
| createReview() rejects rating outside 1-5 | P0 |
| createReview() rejects body < 10 chars | P0 |
| getReviewsBySpotId() returns reviews newest-first | P0 |
| getReviewsBySpotId() returns empty array for spotless reviews | P0 |
| getReviewsBySpotId() respects limit parameter | P1 |
| getReviewsBySpotId() defaults to limit 20 | P1 |
| getReviewsBySpotId() caps limit at 100 | P1 |
| avgRating recalc uses precise average across all reviews | P0 |
| avgRating recalc handles null stats gracefully (0 fallback) | P1 |

---

## E2E Tests (Playwright — ui/e2e/)

### Browse Spots (spots.spec.ts)

| Flow | Steps | Priority |
|------|-------|----------|
| Spots page load | Navigate to /spots → heading visible → spot cards rendered | P0 |
| Click through to detail | Click first card → URL becomes /spots/:id → spot name visible | P0 |
| Empty search results | Search for "xyzzy-no-match-99999" → empty state shown | P0 |
| Loading skeleton | Delay API → skeleton grid visible before data arrives | P1 |

### Search (spots.spec.ts)

| Flow | Steps | Priority |
|------|-------|----------|
| Text search | Fill search bar → submit → URL has ?q= → "Search results for" label | P0 |
| Query preserved | Load /spots?q=park → input value is "park" | P0 |
| Clear search | Clear input → submit → URL has no ?q= | P1 |

### Category Filter (spots.spec.ts)

| Flow | Steps | Priority |
|------|-------|----------|
| Filter by category | Click "Cafe" chip → URL has ?category=cafe → chip has active style | P0 |
| Reset with "All" chip | Start on /spots?category=cafe → click All → URL has no category | P1 |
| Combine search + category | Select category → fill search → both params in URL | P1 |

### Spot Detail (spot-detail.spec.ts)

| Flow | Steps | Priority |
|------|-------|----------|
| Detail page loads | Navigate to /spots/:id → H1 heading visible → no 404 | P0 |
| Name and category shown | Spot name in heading + category badge visible | P0 |
| Rating shown | avgRating and reviewCount elements visible | P0 |
| Reviews section present | "Reviews" heading visible | P0 |
| 0-review empty state | Spot with no reviews → "No reviews yet" or reviews list visible | P1 |
| Nonexistent spot | /spots/00000…000 → not-found UI shown | P1 |
| Address shown | spot-address element visible | P1 |

### Add Spot (add-spot.spec.ts)

| Flow | Steps | Priority |
|------|-------|----------|
| Auth guard — unauthenticated | /spots/new → redirect to sign-in | P0 |
| Form renders (auth) | /spots/new authenticated → heading + name + description + category fields | P0 |
| Inline validation on empty submit | Click submit with empty form → error messages for required fields | P0 |
| Successful submission | Fill valid form → submit → redirect to /spots/:id → spot name in heading | P0 |
| Name min-length validation | Fill name "X" → submit → "at least 2 characters" error | P1 |
| Description min-length validation | Fill 9-char description → submit → validation error | P1 |

### Write Review (reviews.spec.ts)

| Flow | Steps | Priority |
|------|-------|----------|
| Review form hidden when unauthenticated | Spot detail page → review form not visible | P0 |
| Review form visible when authenticated | Spot detail (auth) → write-review button / form visible | P0 |
| Submit valid review | Select rating + fill body → submit → review appears in list | P0 |
| Duplicate review shows error | Second review attempt on same spot → conflict error shown | P0 |
| avgRating updates after review | Before/after submit → avgRating element still present | P0 |
| Body min-length validation | Fill 5-char body → submit → validation error | P1 |

### Auth Flows (auth-flows.spec.ts)

| Flow | Steps | Priority |
|------|-------|----------|
| Sign-in page renders Clerk widget | /sign-in → email input visible | P0 |
| Sign-up page renders Clerk widget | /sign-up → email input visible | P1 |
| Unauthenticated /spots/new redirect | /spots/new → redirected to sign-in | P0 |
| Sign-up with test mode (Clerk) | Fill email → "424242" code → redirect home | P1 |
| Sign-in with test mode (Clerk) | Fill email + password → redirect home | P1 |

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| Empty search results | "No spots found. Try adjusting your search." text visible |
| Network error fetching spots | Error state shown, not a blank page |
| Form submit with invalid data | Inline field-level errors, no page reload |
| Spot with 0 reviews | "No reviews yet" message (not empty/blank) |
| Very long spot name (100 chars) | Truncated with CSS ellipsis on card |
| Spot with 0 avgRating (no reviews) | Displays "0" or "–", not NaN/null |
| Rating exactly 1 (lowest) | Accepted and stored; shown correctly |
| Rating exactly 5 (highest) | Accepted and stored; shown correctly |
| Search with special characters | Does not crash (XSS / SQL-injection guard) |
| Simultaneous review inserts (race) | DB unique constraint prevents duplicate; one 409 returned |
| Clerk token expiry during session | 401 returned; UI prompts re-login gracefully |

---

## Performance Baselines (check before Phase 1 ship)

| Metric | Target | Tool |
|--------|--------|------|
| Home/spots page LCP | < 1.2s | Lighthouse CI |
| Spots API p99 latency (100 concurrent) | < 200ms | autocannon |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse CI |
| Time to First Byte (TTFB) on /spots | < 300ms | WebPageTest / Vercel Analytics |
| Bundle size (initial JS) | < 150 kB gzipped | next build output |
| Spots API throughput | > 500 req/s | autocannon |

---

## Running the Tests

### API unit tests (Vitest)
```bash
# from monorepo root
pnpm --filter @fts/api test          # run once
pnpm --filter @fts/api test:watch    # watch mode
pnpm --filter @fts/api test:coverage # coverage report
```

### E2E tests (Playwright)
```bash
# from monorepo root
pnpm --filter @fts/ui test               # headless, all browsers
pnpm --filter @fts/ui test --headed      # headed Chromium
pnpm --filter @fts/ui test --project=chromium  # single browser
pnpm --filter @fts/ui test e2e/spots.spec.ts   # single file
pnpm --filter @fts/ui test --debug       # Playwright Inspector
```

### CI
Both test suites run via Turbo:
```bash
pnpm turbo test
```

---

## Environment Variables for E2E

| Variable | Purpose | Default |
|----------|---------|---------|
| `PLAYWRIGHT_BASE_URL` | Override the app URL tested against | `http://localhost:3000` |
| `E2E_SEEDED_SPOT_ID` | UUID of a spot with seed data for detail/review tests | `00000000-0000-0000-0000-000000000001` |
| `E2E_EMPTY_SPOT_ID` | UUID of a spot with 0 reviews (empty-state test) | same as above |
| `E2E_TEST_EMAIL` | Clerk test-mode email for auth flows | `test+clerk_test@example.com` |
| `E2E_TEST_PASSWORD` | Clerk test-mode password | — |
