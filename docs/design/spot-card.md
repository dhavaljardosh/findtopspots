# SpotCard Component Spec

**Component:** `SpotCard`
**Path:** `ui/src/components/spots/SpotCard.tsx`
**Skeleton:** `ui/src/components/spots/SpotCardSkeleton.tsx`
**Min width:** 320px | **Ideal grid column:** `minmax(280px, 1fr)`

---

## Visual Anatomy

```
┌─────────────────────────────────────┐
│                                     │  ← Photo area (16:9, object-cover)
│   [Restaurant]           ↑ badge   │  ← Category badge (absolute, top-right)
│                                     │
│█████████████████████████████████████│
│ Spot Name Here (2-line clamp)       │  ← 18px semibold
│ 📍 123 Main St, Austin TX           │  ← 14px muted, 1-line clamp
│ ★★★★☆  4.2  (128 reviews)           │  ← Rating row
│                                     │
│ [Tag]  [Tag]                        │  ← Optional tags (show max 3)
└─────────────────────────────────────┘
```

---

## States

### Default
- Background: `var(--color-surface-1)` (#ffffff light / neutral-900 dark)
- Border: `1px solid var(--color-border)`
- Border radius: `var(--radius-xl)` (16px)
- Shadow: `var(--shadow-sm)`
- Overflow: hidden (clips photo corners)

### Hover
- `transform: translateY(-2px)`
- `box-shadow: var(--shadow-md)`
- Transition: `var(--transition-card-hover)` — `transform 200ms ease-out, box-shadow 200ms ease-out`
- Photo overlay: subtle `brightness(1.03)` — `filter: brightness(1.03)` on `<img>`

### Focus (keyboard navigation)
- `outline: 2px solid var(--color-action-bg)`
- `outline-offset: 2px`
- Border radius preserved with `border-radius` on outline

### Active / Pressed
- `transform: translateY(0px)` (snaps back)
- `box-shadow: var(--shadow-xs)`
- Transition: `50ms ease-in` (snappier on press)

### Loading (SpotCardSkeleton)
See "Skeleton" section below.

### No Photo Available
- Replace photo area with gradient placeholder:
  ```css
  background: linear-gradient(
    135deg,
    var(--color-primary-100) 0%,
    var(--color-primary-200) 100%
  );
  ```
- Center-display the category icon (Lucide, 40px, `--color-primary-600`)
- Dark mode: use `--color-primary-900` → `--color-primary-800` gradient

---

## Layout Spec

### Photo Area
```
aspect-ratio: 16 / 9
width: 100%
object-fit: cover
object-position: center
border-radius: var(--radius-xl) var(--radius-xl) 0 0   ← top corners only
display: block
```
Photo transitions to loaded state with `opacity: 0 → 1` over `300ms ease-out` (add `loading="lazy"` on `<img>`).

### Category Badge
```
position: absolute
top: var(--spacing-3)       ← 12px from top of photo
right: var(--spacing-3)     ← 12px from right
background: var(--color-primary-600)
color: #ffffff
font-size: var(--font-size-xs)   ← 12px
font-weight: var(--font-weight-medium)
letter-spacing: var(--letter-spacing-wide)
text-transform: uppercase
padding: var(--spacing-0-5) var(--spacing-2)    ← 2px 8px
border-radius: var(--radius-full)
backdrop-filter: blur(4px)
background: rgb(217 119 6 / 0.90)   ← semi-transparent on photo
```

### Content Padding
```
padding: var(--spacing-4)    ← 16px all sides
display: flex
flex-direction: column
gap: var(--spacing-2)        ← 8px between rows
```

### Spot Name
```
font-size: var(--font-size-lg)        ← 18px
font-weight: var(--font-weight-semibold)
color: var(--color-text-primary)
line-height: var(--line-height-snug)
display: -webkit-box
-webkit-line-clamp: 2
-webkit-box-orient: vertical
overflow: hidden
```

### Address Row
```
display: flex
align-items: center
gap: var(--spacing-1)              ← 4px
font-size: var(--font-size-sm)     ← 14px
color: var(--color-text-muted)
overflow: hidden
```
- Icon: `MapPin` from Lucide, 14px, `flex-shrink: 0`, color `var(--color-text-muted)`
- Address text: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`

### Rating Row
```
display: flex
align-items: center
gap: var(--spacing-1-5)           ← 6px
font-size: var(--font-size-sm)    ← 14px
margin-top: var(--spacing-1)      ← slight visual separation
```
- **Stars:** 5 `Star` icons from Lucide, 14px each, filled (no stroke) for rated portion
  - Filled: `fill: var(--color-primary-500); stroke: none`
  - Empty: `fill: var(--color-neutral-200); stroke: none`
  - Partial star: use `fill: url(#half-star-gradient)` or round to nearest 0.5
- **Rating number:** `font-weight: var(--font-weight-semibold); color: var(--color-text-primary)`
- **Review count:** `color: var(--color-text-muted)` — format as `(1.2k)` when > 999

### Tags Row (optional, max 3 tags)
```
display: flex
flex-wrap: wrap
gap: var(--spacing-1)
margin-top: var(--spacing-1)
```
Each tag:
```
font-size: var(--font-size-xs)     ← 12px
color: var(--color-text-secondary)
background: var(--color-surface-3)
border: 1px solid var(--color-border)
border-radius: var(--radius-full)
padding: 2px 8px
```

---

## SpotCardSkeleton

Replaces `SpotCard` during loading. Uses the `.skeleton` class from globals.css.

```
┌─────────────────────────────────────┐
│█████████████████████████████████████│  ← skeleton, 16:9 aspect, no border-radius top
│█████████████████████████████████████│
├─────────────────────────────────────┤
│ ████████████████████                │  ← name, h:20px w:70%
│ █████████████                       │  ← name line 2, h:20px w:40%
│                                     │
│ ████████                            │  ← address, h:14px w:55%
│                                     │
│ ██████████████                      │  ← rating, h:14px w:45%
└─────────────────────────────────────┘
```

Props: `count?: number` — renders N skeleton cards in a grid. Default 8.

---

## Accessibility

### Semantic HTML
```tsx
<article>
  <a href={`/spots/${spot.id}`} aria-label={`View ${spot.name}`}>
    {/* full card is clickable */}
  </a>
</article>
```

Alternative: the entire card as `<a>` (block link pattern):
```tsx
<a
  href={`/spots/${spot.id}`}
  className="card block"
  aria-label={`${spot.name} — ${spot.category} — Rated ${spot.avgRating} out of 5 stars, ${spot.reviewCount} reviews`}
>
```

### Image Alt Text
```tsx
<img
  src={spot.photoUrl}
  alt={`${spot.name} — ${spot.category} in ${spot.city}`}
  loading="lazy"
  decoding="async"
/>
```
No-photo placeholder: `alt=""` (decorative) since category icon is aria-hidden.

### Rating ARIA
```tsx
<div
  role="img"
  aria-label={`Rated ${spot.avgRating.toFixed(1)} out of 5 stars, ${formatCount(spot.reviewCount)} reviews`}
>
  {/* star icons: aria-hidden="true" */}
  <span aria-hidden="true">{stars}</span>
  <span>{spot.avgRating.toFixed(1)}</span>
  <span className="text-muted">({formatCount(spot.reviewCount)})</span>
</div>
```

### Keyboard Navigation
- Card is a single focusable element (the `<a>` tag)
- No nested interactive elements that trap focus
- Exception: if a "Save" bookmark button is inside, use `e.stopPropagation()` on the button click

---

## Motion

### Hover Lift (default)
```css
.spot-card {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}
.spot-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .spot-card {
    transition: box-shadow 200ms ease-out;  /* keep shadow, drop transform */
  }
  .spot-card:hover {
    transform: none;
  }
}
```

### Enter Animation (grid load)
Using Motion (Framer Motion v12):
```tsx
<motion.article
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
>
```
Stagger delay: `index * 40ms`, max stagger 8 cards (cap delay at 320ms).

Disabled automatically when `prefers-reduced-motion: reduce` — Motion respects this.

---

## Props Interface

```ts
interface SpotCardProps {
  spot: Spot;                   // from @fts/types
  priority?: boolean;           // pass to Next.js <Image> for LCP candidates
  showTags?: boolean;           // default: false (keep card compact)
  className?: string;
}

interface SpotCardSkeletonProps {
  count?: number;               // default: 8
  className?: string;
}
```

---

## Implementation Notes

1. Use Next.js `<Image>` (not `<img>`) for automatic optimization + WebP conversion
2. `priority={true}` on the first 4 cards in the home grid (above the fold)
3. Photo URL fallback chain: `spot.photos[0]?.url ?? null` → no-photo state
4. Rating display: `(Math.round(avgRating * 2) / 2).toFixed(1)` — rounds to nearest 0.5
5. Review count format: `>= 1000 ? (count / 1000).toFixed(1) + 'k' : count.toString()`
6. Category label map (schema: `restaurant | cafe | bar | park | gym | shop | attraction | other`):
   ```ts
   const CATEGORY_LABELS: Record<SpotCategory, string> = {
     restaurant: 'Restaurant',
     cafe: 'Cafe',
     bar: 'Bar',
     park: 'Park',
     gym: 'Gym',
     shop: 'Shop',
     attraction: 'Attraction',
     other: 'Other',
   }
   ```
