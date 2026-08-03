# Home Page Spec

**Route:** `/` (Next.js App Router: `ui/src/app/page.tsx`)
**Render strategy:** Partial Prerendering (PPR) — hero + categories static, spot grid streamed
**Layout component:** `ui/src/components/layout/Navbar.tsx`

---

## Full Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ FindTopSpots                              Browse   + Add a Spot  │  ← Navbar (sticky)
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                     Discover Amazing Spots                       │  ← Hero heading
│             Find the best places, shared by people               │  ← Hero subheading
│                                                                  │
│        ┌──────────────────────────────────────────────┐         │
│        │ 🔍  Search spots, places, neighborhoods...   │ [Go]    │  ← Search bar
│        └──────────────────────────────────────────────┘         │
│                                                                  │
│   [🍽 Restaurant]  [☕ Cafe]  [🍺 Bar]  [🌳 Park]  [More ▼]   │  ← Category pills
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ Recent Spots                                        [View all →] │  ← Section header
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ SpotCard │  │ SpotCard │  │ SpotCard │  │ SpotCard │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ SpotCard │  │ SpotCard │  │ SpotCard │  │ SpotCard │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│                       [ Load More ]                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Section 1: Navbar

**Component:** `ui/src/components/layout/Navbar.tsx`

### Behavior
- `position: sticky; top: 0; z-index: var(--z-sticky)` (z-index 200)
- On scroll > 4px: add `box-shadow: var(--shadow-sm)` and `backdrop-filter: blur(12px)` with `background: rgb(255 255 255 / 0.85)` (glassmorphism)
- Transition: `box-shadow 200ms ease-out, background 200ms ease-out`
- Dark mode scroll: `background: rgb(2 6 23 / 0.85)` (neutral-950 at 85%)

### Layout
```
height: var(--navbar-height)     ← 64px
padding-inline: var(--spacing-6) ← 24px
display: flex
align-items: center
justify-content: space-between
border-bottom: 1px solid var(--color-border)
```

### Left: Logo
```tsx
<Link href="/">
  <span className="font-bold text-xl tracking-tight">
    <span style={{ color: 'var(--color-primary-600)' }}>Find</span>TopSpots
  </span>
</Link>
```
- Font size: `var(--font-size-xl)` (20px)
- "Find" is amber-colored, "TopSpots" is `--color-text-primary`

### Right: Nav Actions
```tsx
<nav>
  <Link href="/spots">Browse</Link>
  <Link href="/spots/new" className="btn btn-primary btn-sm btn-pill">
    <PlusIcon size={14} />
    Add a Spot
  </Link>
</nav>
```
- "Browse" link: `font-size: var(--font-size-sm); color: var(--color-text-secondary)` → hover: `--color-text-primary`
- "Add a Spot" button: amber pill, `btn btn-primary btn-sm btn-pill`
- Gap between links: `var(--spacing-6)` (24px)
- When signed in: show user avatar (32px circle) as dropdown trigger (Clerk `<UserButton />`)
- When signed out: show "Sign in" text link before "Add a Spot"

### Mobile (< 640px)
- Hide "Browse" text link
- "Add a Spot" becomes icon-only: `<PlusIcon>` in a 36px circle button
- Logo truncates to `FTS` or just the amber `F` monogram

---

## Section 2: Hero

**Container:** `max-width: var(--container-4xl)` (896px), centered, `padding-block: var(--spacing-20)` (80px)

### Heading
```
font-size: var(--font-size-5xl)       ← 48px (3rem)
font-weight: var(--font-weight-bold)
line-height: var(--line-height-tight)
letter-spacing: var(--letter-spacing-tight)
color: var(--color-text-primary)
text-align: center
```
Mobile (< 640px): `font-size: var(--font-size-4xl)` (36px)

Optional gradient text on "Amazing":
```css
background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-700) 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

### Subheading
```
font-size: var(--font-size-lg)         ← 18px
color: var(--color-text-secondary)
text-align: center
margin-top: var(--spacing-4)
max-width: var(--container-2xl)        ← 672px
margin-inline: auto
```

---

## Section 3: Search Bar

**Container:** `max-width: var(--container-xl)` (576px), centered, `margin-top: var(--spacing-8)`

### Layout
```
display: flex
align-items: center
background: var(--color-surface-1)
border: 1.5px solid var(--color-border-strong)
border-radius: var(--radius-full)
padding: var(--spacing-2) var(--spacing-2) var(--spacing-2) var(--spacing-5)
box-shadow: var(--shadow-md)
transition: border-color 200ms ease-out, box-shadow 200ms ease-out
```

Focus-within state:
```css
border-color: var(--color-primary-500);
box-shadow: var(--shadow-focus), var(--shadow-md);
```

### Search Icon
- `Search` from Lucide, 18px, `color: var(--color-text-muted)`, `flex-shrink: 0`
- Gap to input: `var(--spacing-3)` (12px)

### Input
```
flex: 1
border: none
outline: none
background: transparent
font-size: var(--font-size-base)
color: var(--color-text-primary)
min-width: 0
```
Placeholder: `"Search spots, places, neighborhoods..."` — `color: var(--color-text-muted)`

### Go Button
```
background: var(--color-primary-600)
color: #ffffff
border-radius: var(--radius-full)
padding: var(--spacing-2-5) var(--spacing-5)
font-size: var(--font-size-sm)
font-weight: var(--font-weight-medium)
flex-shrink: 0
transition: background-color 150ms ease-out
```
Hover: `background: var(--color-primary-700)`

### Behavior
- On submit: navigate to `/spots?q={query}`
- Keyboard: pressing `Enter` in input triggers submit
- The search form wraps both in `<form>` with `action="/spots"` for progressive enhancement

---

## Section 4: Category Pills

**Container:** `margin-top: var(--spacing-6)`, horizontally scrollable on mobile

### Layout
```
display: flex
align-items: center
gap: var(--spacing-2)            ← 8px between pills
overflow-x: auto
scrollbar-width: none            ← hide scrollbar (Webkit: ::-webkit-scrollbar { display: none })
padding-bottom: var(--spacing-1) ← prevent clipping on scroll
justify-content: center          ← desktop only; on mobile: flex-start
```

### Individual Pill
**Default state:**
```
display: inline-flex
align-items: center
gap: var(--spacing-1-5)
padding: var(--spacing-2) var(--spacing-4)
border-radius: var(--radius-full)
background: var(--color-surface-1)
border: 1px solid var(--color-border-strong)
color: var(--color-text-secondary)
font-size: var(--font-size-sm)
font-weight: var(--font-weight-medium)
white-space: nowrap
cursor: pointer
transition: var(--transition-colors), var(--transition-shadow)
```

**Hover:**
```
background: var(--color-surface-2)
border-color: var(--color-primary-300)
color: var(--color-text-primary)
```

**Active / Selected:**
```
background: var(--color-primary-600)
border-color: var(--color-primary-600)
color: #ffffff
```

### Categories (in order)
| Icon (Lucide)  | Label        | Category value |
|----------------|--------------|----------------|
| `Utensils`     | Restaurant   | `restaurant`   |
| `Coffee`       | Cafe         | `cafe`         |
| `Beer`         | Bar          | `bar`          |
| `Trees`        | Park         | `park`         |
| `Dumbbell`     | Gym          | `gym`          |
| `ShoppingBag`  | Shop         | `shop`         |
| `Landmark`     | Attraction   | `attraction`   |
| `ChevronDown`  | More         | — (opens dropdown) |

Show first 5 pills by default. "More" pill reveals remaining as a dropdown on desktop or a bottom sheet on mobile.

---

## Section 5: Spot Grid

**Container:** `padding-top: var(--spacing-12)` (48px), full-width with `container-page`

### Section Header Row
```
display: flex
align-items: baseline
justify-content: space-between
margin-bottom: var(--spacing-6)
```
- Left: `<h2>` "Recent Spots" — `font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold)`
- Right: "View all →" link — `font-size: var(--font-size-sm); color: var(--color-text-link)`

### Grid
```css
display: grid;
grid-template-columns: repeat(2, 1fr);       /* mobile */
gap: var(--spacing-4);                        /* 16px */

@media (min-width: 768px) {                   /* tablet */
  grid-template-columns: repeat(3, 1fr);
}

@media (min-width: 1024px) {                  /* desktop */
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-5);                      /* 20px */
}
```

### Loading State
- On initial load: render 8× `<SpotCardSkeleton>` in the same grid
- Use React Suspense boundary wrapping the grid, fallback = skeleton grid

```tsx
<Suspense fallback={<SpotCardSkeleton count={8} />}>
  <SpotGrid />
</Suspense>
```

### Empty State
When no spots exist yet:
```
padding-block: var(--spacing-20)
text-align: center
color: var(--color-text-muted)
```
- Illustration: `MapPin` Lucide icon at 64px, `--color-neutral-200`
- Heading: "No spots yet" — `var(--font-size-xl)` semibold, `--color-text-secondary`
- Body: "Be the first to add one!"
- CTA: `<Link href="/spots/new" className="btn btn-primary btn-pill">Add the first spot</Link>`

### Load More
```
margin-top: var(--spacing-10)
display: flex
justify-content: center
```
Button: `<button className="btn btn-secondary btn-pill">Load More</button>`
- On click: fetch next page via cursor pagination (`?cursor={lastId}`)
- Loading state: spinner icon replaces text, button disabled
- End of list: hide button, show "You've seen all spots" muted text

---

## Responsive Breakpoints Summary

| Breakpoint | Grid cols | Navbar | Hero heading | Search bar |
|------------|-----------|--------|--------------|------------|
| < 640px (mobile) | 2 | Logo + icon btn | 36px | full width, no Go label |
| 640–767px (sm) | 2 | Logo + text links | 42px | max-w-full |
| 768–1023px (md) | 3 | Full | 48px | max-w-xl |
| 1024px+ (lg) | 4 | Full | 48px | max-w-xl |

---

## Data Fetching

```ts
// app/page.tsx
const spots = await fetch(`${process.env.API_URL}/spots?limit=8`, {
  next: { revalidate: 60 },  // ISR: revalidate every 60 seconds
})
```

TanStack Query for client-side "Load More":
```ts
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  useInfiniteQuery({
    queryKey: ['spots'],
    queryFn: ({ pageParam }) => api.spots.list({ cursor: pageParam, limit: 8 }),
    getNextPageParam: (last) => last.nextCursor,
  })
```

---

## SEO

```tsx
// app/page.tsx
export const metadata: Metadata = {
  title: 'FindTopSpots — Discover Amazing Places',
  description: 'Find the best restaurants, cafes, parks, and hidden gems near you. Reviewed by real people.',
  openGraph: {
    title: 'FindTopSpots',
    description: 'Discover amazing spots near you.',
    type: 'website',
  },
}
```
