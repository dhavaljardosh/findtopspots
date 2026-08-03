# Add Spot Form Spec

**Route:** `/spots/new` (Next.js App Router: `ui/src/app/spots/new/page.tsx`)
**Form component:** `ui/src/components/spots/AddSpotForm.tsx`
**Auth:** Requires signed-in user. Redirect to `/sign-in?redirect=/spots/new` if unauthenticated (Clerk middleware handles this).

---

## Overall Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back to spots                                                  │  ← back nav
│                                                                  │
│                      Add a New Spot                              │  ← page heading
│                                                                  │
│  ●────────────────●────────────────○                             │  ← Stepper
│  1. Basic Info        2. Location       3. Preview               │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                      [ Step content ]                            │
├──────────────────────────────────────────────────────────────────┤
│                                   [Back]  [Continue →]           │  ← Footer nav
└──────────────────────────────────────────────────────────────────┘
```

**Container:** `max-width: var(--container-3xl)` (768px), centered, `padding-block: var(--spacing-12)`

---

## Stepper Component

**Component:** `ui/src/components/spots/AddSpotStepper.tsx`

### Layout
```
display: flex
align-items: center
gap: 0
margin-bottom: var(--spacing-10)
```

### Step indicator
Each step = circle + label, connected by a line:
```
○ — [Step label]
```

```
                  Step 1              Step 2              Step 3
                ┌────────┐         ┌────────┐          ┌────────┐
                │   ①    │─────────│   ②    │──────────│   ③    │
                └────────┘         └────────┘          └────────┘
               Basic Info           Location         Preview & Submit
```

### Step Circle Variants

**Completed (past step):**
```
width: 32px; height: 32px
border-radius: var(--radius-full)
background: var(--color-primary-600)
color: #ffffff
display: flex; align-items: center; justify-content: center
```
Icon: `Check` from Lucide, 14px

**Active (current step):**
```
background: var(--color-primary-600)
color: #ffffff
box-shadow: 0 0 0 4px var(--color-primary-100)
```
Dark mode ring: `box-shadow: 0 0 0 4px var(--color-primary-900)`

**Upcoming (not yet reached):**
```
background: var(--color-surface-3)
color: var(--color-text-muted)
border: 2px solid var(--color-border)
```

### Connector Line
```
flex: 1
height: 2px
background: var(--color-border)
```
Completed connector: `background: var(--color-primary-600)` (transition left-to-right)

### Step Labels
```
font-size: var(--font-size-xs)
font-weight: var(--font-weight-medium)
color: var(--color-text-muted)
margin-top: var(--spacing-2)
text-align: center
white-space: nowrap
```
Active label: `color: var(--color-primary-600); font-weight: var(--font-weight-semibold)`
Completed label: `color: var(--color-text-secondary)`

### Mobile (< 640px)
Show step labels only for the active step. Others show circle only.

---

## Step 1: Basic Info

### Fields

#### Spot Name (required)
```
<label>Spot Name *</label>
<input
  type="text"
  placeholder="e.g. Blue Bottle Coffee, Barton Springs Pool"
  maxLength={100}
  className="input"
/>
<span className="char-count">0 / 100</span>  ← right-aligned, appears on focus
```
Validation:
- Required: "Spot name is required"
- Min 2 chars: "Name must be at least 2 characters"
- Max 100 chars: enforced by `maxLength` + Zod

#### Category (required)
Label: "Category"

Grid of icon + label buttons (not a `<select>` — custom UI):
```
display: grid
grid-template-columns: repeat(4, 1fr)   ← desktop
grid-template-columns: repeat(2, 1fr)   ← mobile (< 640px)
gap: var(--spacing-2-5)
```

Each category card:
```
display: flex
flex-direction: column
align-items: center
gap: var(--spacing-2)
padding: var(--spacing-3) var(--spacing-2)
border: 2px solid var(--color-border)
border-radius: var(--radius-lg)
cursor: pointer
transition: var(--transition-colors), var(--transition-shadow)
background: var(--color-surface-1)
color: var(--color-text-secondary)
```

**Unselected hover:**
```
border-color: var(--color-primary-300)
background: var(--color-primary-50)
color: var(--color-text-primary)
```

**Selected:**
```
border-color: var(--color-primary-600)
background: var(--color-primary-50)
color: var(--color-primary-700)
box-shadow: 0 0 0 3px var(--color-primary-100)
```
Dark mode selected: `background: var(--color-primary-950); color: var(--color-primary-300); box-shadow: 0 0 0 3px var(--color-primary-900)`

Icon: 24px Lucide icon, `color: currentColor`
Label: `font-size: var(--font-size-xs); font-weight: var(--font-weight-medium)`

| Category     | Lucide Icon     |
|--------------|-----------------|
| Restaurant   | `Utensils`      |
| Cafe         | `Coffee`        |
| Bar          | `Beer`          |
| Park         | `Trees`         |
| Gym          | `Dumbbell`      |
| Shop         | `ShoppingBag`   |
| Attraction   | `Landmark`      |
| Other        | `MapPin`        |

Validation: "Please select a category"

#### Description (required)
```
<label>Description *</label>
<textarea
  placeholder="What makes this spot special? Share what to expect, best times to visit, must-try items..."
  rows={4}
  maxLength={2000}
  className="input"
  style={{ resize: 'vertical', minHeight: '120px' }}
/>
<div className="char-count-row">
  <span className="error-text" />   ← left: error if any
  <span>143 / 2000</span>           ← right: char count always visible
</div>
```
Validation:
- Required: "Description is required"
- Min 10 chars: "Description must be at least 10 characters"

#### Tags (optional)
```
<label>Tags <span className="optional">(optional)</span></label>
<input
  type="text"
  placeholder="Type a tag and press Enter (e.g. outdoor, wifi, dog-friendly)"
/>
```
Tag chip input behavior:
- Press `Enter` or `,` to add a tag
- Each tag rendered as a removable chip (`badge` style with `×` button)
- Max 10 tags; adding an 11th shows "Maximum 10 tags reached"
- Tags stored as lowercase, trimmed strings
- Schema: `z.array(z.string()).max(10).optional()`

---

## Step 2: Location

### Fields

#### Address (required)
```
<label>Address *</label>
<input
  type="text"
  placeholder="123 Main St, Austin, TX 78701"
  className="input"
/>
```
Validation:
- Required: "Address is required"
- Min 5 chars: "Please enter a full address"

Future enhancement note (for Frontend Dev): Wire to a geocoding API (e.g., Mapbox Geocoding API) to auto-populate lat/lng from address. Stub below handles manual entry until that is implemented.

#### Latitude (required, auto-populated — manual fallback)
```
<label>Latitude *</label>
<input
  type="number"
  step="any"
  placeholder="30.2672"
  className="input"
/>
<p className="field-hint">
  Auto-filled when maps are enabled. Enter manually for now.
</p>
```

#### Longitude (required, auto-populated — manual fallback)
```
<label>Longitude *</label>
<input
  type="number"
  step="any"
  placeholder="-97.7431"
  className="input"
/>
<p className="field-hint">
  Auto-filled when maps are enabled. Enter manually for now.
</p>
```

Validation:
- Lat required: "Latitude is required"
- Lat range: `min(-90).max(90)` → "Latitude must be between -90 and 90"
- Lng required: "Longitude is required"
- Lng range: `min(-180).max(180)` → "Longitude must be between -180 and 180"

#### Map Placeholder (Phase 2)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                🗺  Map integration coming soon              │
│         For now, enter coordinates manually above.          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
Styling:
```
background: var(--color-surface-3)
border: 2px dashed var(--color-border)
border-radius: var(--radius-xl)
padding: var(--spacing-10) var(--spacing-6)
text-align: center
color: var(--color-text-muted)
font-size: var(--font-size-sm)
```

---

## Step 3: Preview & Submit

### Preview Card
Renders a live `<SpotCard>` with the data collected in steps 1–2:
```tsx
<SpotCard
  spot={{
    id: 'preview',
    name: formData.name,
    category: formData.category,
    description: formData.description,
    address: formData.address,
    lat: formData.lat,
    lng: formData.lng,
    avgRating: 0,
    reviewCount: 0,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  }}
  priority={false}
/>
```
Label above card: "Here's how your spot will look"
```
font-size: var(--font-size-sm)
font-weight: var(--font-weight-medium)
color: var(--color-text-secondary)
margin-bottom: var(--spacing-4)
```

Card is wrapped in `max-width: 320px; margin-inline: auto` to show it at natural SpotCard width.

### Info Summary (below preview card)
```
┌─────────────────────────────────────────────────────────────┐
│ Name          Barton Springs Pool                           │
│ Category      Park                                          │
│ Address       2201 Barton Springs Rd, Austin, TX 78746      │
│ Coordinates   30.2638, -97.7720                             │
│ Tags          outdoor · swimming · iconic                   │
└─────────────────────────────────────────────────────────────┘
```
Styling:
```
background: var(--color-surface-2)
border: 1px solid var(--color-border)
border-radius: var(--radius-xl)
padding: var(--spacing-5)
margin-top: var(--spacing-6)
display: grid
grid-template-columns: auto 1fr
gap: var(--spacing-2) var(--spacing-4)
```
Label (left col): `font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-secondary); white-space: nowrap`
Value (right col): `font-size: var(--font-size-sm); color: var(--color-text-primary)`

### Submit Button
```tsx
<button
  type="submit"
  className="btn btn-primary btn-lg"
  disabled={isSubmitting}
  style={{ width: '100%', marginTop: 'var(--spacing-8)' }}
>
  {isSubmitting ? <Spinner size={18} /> : <CheckIcon size={18} />}
  {isSubmitting ? 'Publishing...' : 'Publish Spot'}
</button>
```
Terms micro-copy below button:
```
<p className="text-center text-muted text-xs mt-3">
  By publishing, you agree to our{' '}
  <Link href="/terms">Terms of Service</Link>{' '}
  and{' '}
  <Link href="/guidelines">Community Guidelines</Link>.
</p>
```

---

## Form Footer Navigation

Persistent across all 3 steps:
```
display: flex
justify-content: space-between
align-items: center
padding-top: var(--spacing-6)
margin-top: var(--spacing-8)
border-top: 1px solid var(--color-border)
```

### Back Button (steps 2 and 3 only)
```tsx
<button type="button" className="btn btn-ghost" onClick={prevStep}>
  <ArrowLeftIcon size={16} />
  Back
</button>
```

### Step 1–2: Continue Button
```tsx
<button type="button" className="btn btn-primary btn-pill" onClick={nextStep}>
  Continue
  <ArrowRightIcon size={16} />
</button>
```
On `nextStep`: validate current step fields with `trigger()` from React Hook Form. Only advance if no errors.

### Step 3: Submit is in the step body (not footer). Footer shows only Back + nothing on right.

### Progress indicator (mobile)
Below footer:
```
Step 1 of 3
```
`font-size: var(--font-size-xs); color: var(--color-text-muted); text-align: center; margin-top: var(--spacing-3)`

---

## Validation System

### Library
React Hook Form v7 + Zod via `@hookform/resolvers/zod`

### Schema per step

**Step 1 schema:**
```ts
import { z } from 'zod'
const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category: z.enum(['restaurant','cafe','bar','park','gym','shop','attraction','other'], {
    required_error: 'Please select a category',
  }),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  tags: z.array(z.string()).max(10).optional(),
})
```

**Step 2 schema:**
```ts
const step2Schema = z.object({
  address: z.string().min(5, 'Please enter a full address').max(300),
  lat: z.number({ required_error: 'Latitude is required', invalid_type_error: 'Enter a valid number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z.number({ required_error: 'Longitude is required', invalid_type_error: 'Enter a valid number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
})
```

Full schema = `step1Schema.merge(step2Schema)` (matches `CreateSpotSchema` from `@fts/types`).

### Inline Error Display
Below each invalid field:
```tsx
{errors.name && (
  <p className="field-error" role="alert">
    <AlertCircleIcon size={12} />
    {errors.name.message}
  </p>
)}
```
```css
.field-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  color: var(--color-error);
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-1);
}
```

Invalid input border:
```css
.input.has-error,
.input[aria-invalid="true"] {
  border-color: var(--color-error);
  background-color: var(--color-error-light);
}
.input.has-error:focus {
  box-shadow: 0 0 0 3px rgb(239 68 68 / 0.2);
}
```

Field hint (helper text):
```css
.field-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: var(--spacing-1);
}
```

### ARIA
- Each `<input>` / `<textarea>` gets `aria-describedby={errorId}` pointing to the error `<p>`
- Error `<p>` gets `id={errorId}` and `role="alert"` so screen readers announce on validation
- Category grid buttons: `role="radio"` inside `role="radiogroup"` (or `aria-pressed`)

---

## Success Flow

### API Call
```ts
const { mutate: createSpot, isPending } = useMutation({
  mutationFn: (data: CreateSpot) => api.spots.create(data),
  onSuccess: (spot) => {
    toast.success('Spot published!', {
      description: `${spot.name} is now live.`,
    })
    router.push(`/spots/${spot.id}`)
  },
  onError: (error) => {
    toast.error('Failed to publish spot', {
      description: error.message ?? 'Please try again.',
    })
  },
})
```

### Toast Notification
Position: bottom-right, `z-index: var(--z-toast)` (500)

**Success toast:**
```
┌──────────────────────────────────────┐
│ ✓  Spot published!                   │
│    Barton Springs Pool is now live.  │ [×]
└──────────────────────────────────────┘
```
Border-left: `3px solid var(--color-success)` (#22c55e)

**Error toast:**
```
┌──────────────────────────────────────┐
│ ✗  Failed to publish spot            │
│    Please try again.                 │ [×]
└──────────────────────────────────────┘
```
Border-left: `3px solid var(--color-error)`

Toast auto-dismisses after 5 seconds. Manual close via `×` button.

### Redirect
After success toast appears, `router.push(`/spots/${spot.id}`)` navigates to the new spot's detail page.

---

## State Management

```ts
// Form state lives in React Hook Form across all steps
const form = useForm<CreateSpot>({
  resolver: zodResolver(createSpotSchema),
  defaultValues: {
    name: '',
    category: undefined,
    description: '',
    tags: [],
    address: '',
    lat: undefined,
    lng: undefined,
  },
  mode: 'onTouched',  // validate on blur, then live on change
})

// Step state is local React state
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

const nextStep = async () => {
  const fieldsToValidate = currentStep === 1
    ? ['name', 'category', 'description'] as const
    : ['address', 'lat', 'lng'] as const
  const valid = await form.trigger(fieldsToValidate)
  if (valid) setCurrentStep(s => (s + 1) as 2 | 3)
}

const prevStep = () => setCurrentStep(s => (s - 1) as 1 | 2)
```

---

## Responsive Behavior

| Breakpoint | Stepper | Category grid | Form layout |
|------------|---------|---------------|-------------|
| < 640px | Labels hidden (circles only except active) | 2 columns | Single column, full-width inputs |
| 640–767px | Short labels | 4 columns | Single column |
| 768px+ | Full labels | 4 columns | Single column, max-w-3xl |

---

## Accessibility Checklist

- [ ] All form fields have visible `<label>` linked via `htmlFor` / `id`
- [ ] Error messages use `role="alert"` and `aria-describedby`
- [ ] Category grid uses `role="radiogroup"` + `role="radio"` with `aria-checked`
- [ ] Stepper communicates progress: `aria-label="Step 1 of 3: Basic Info"`
- [ ] Submit button shows loading state: `aria-busy="true"` when submitting
- [ ] Focus moves to first invalid field on failed step validation
- [ ] Toast is announced by `aria-live="polite"` region
- [ ] Back/Continue buttons have descriptive labels (not just "Next")

---

## File Structure

```
ui/src/
├── app/
│   └── spots/
│       └── new/
│           └── page.tsx              ← Page wrapper, auth guard
├── components/
│   └── spots/
│       ├── AddSpotForm.tsx           ← Main form orchestrator
│       ├── AddSpotStepper.tsx        ← Step indicator UI
│       ├── steps/
│       │   ├── Step1BasicInfo.tsx
│       │   ├── Step2Location.tsx
│       │   └── Step3Preview.tsx
│       └── CategoryGrid.tsx          ← Category picker component
└── lib/
    └── hooks/
        └── useCreateSpot.ts          ← TanStack mutation hook
```
