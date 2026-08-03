# FindTopSpots — Product & Technical Blueprint

## Vision

Modern discovery platform. Users add spots, users find spots, users review spots. Think Yelp but stripped of bloat — fast, clean, review-first, and map-native. No city gates — global from day one.

---

## Core Concepts

| Entity | Description |
|--------|-------------|
| **Spot** | A place (restaurant, park, gym, anything) with location, photos, tags, and metadata |
| **Review** | Star rating + text from a verified user |
| **List** | User-curated collection of spots ("Best Coffee in Austin") |
| **User** | Creator, reviewer, or browser |

---

## Feature Set

### MVP (Phase 1)
- [ ] User auth (sign up / sign in / OAuth with Google)
- [ ] Add spot (name, location, category, photos, description)
- [ ] View spot detail (info, map pin, reviews, photos)
- [ ] Write review (1–5 stars + text)
- [ ] Search spots by keyword + location radius
- [ ] Home feed (trending / newest / top-rated)
- [ ] Mobile-responsive web

### Phase 2
- [ ] User profiles + activity feed
- [ ] Curated lists (user-created collections)
- [ ] Save / bookmark spots
- [ ] Follow users
- [ ] Photo upload with CDN
- [ ] Verified business owner claims
- [ ] Review helpful votes (upvote/downvote)
- [ ] Category browsing + tag filters

### Phase 3
- [ ] AI-powered "find me something like…" search
- [ ] Personalized recommendations
- [ ] Email digest (weekly top spots near you)
- [ ] Embed widget for spots
- [ ] Public API for third-party integrations
- [ ] Native mobile apps (React Native)

---

## Tech Stack (2026 — Maximum Modern, Minimum Cost)

### Principles
- **Bun over Node** — faster runtime, built-in bundler, test runner, package manager
- **Edge-ready** — everything deployable to edge runtimes if needed
- **Zod as contract** — single schema source shared API ↔ UI, no drift
- **Biome over ESLint+Prettier** — one tool, 10x faster, zero config fights
- **Language: TypeScript everywhere** — Claude handles all code, one language = simpler agent instructions

### API (`api/`)
| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | **Bun 1.x** | Fastest JS runtime; built-in test runner, bundler, .env |
| Framework | **Hono** | Ultra-fast, edge-native, first-class Bun support |
| Language | **TypeScript 5.x** | Strict mode, shared types with UI |
| Database | **PostgreSQL 16** via **Neon** | Serverless, free tier, PostGIS built-in |
| ORM | **Drizzle ORM** | SQL-first, zero overhead, best TS inference |
| Migrations | **Drizzle Kit** | Paired with Drizzle, no extra tooling |
| Cache | **Upstash Redis** | Serverless, free tier, HTTP-based (works on edge) |
| Auth | **Clerk** | Webhooks → sync user to DB; free 10k MAU |
| Search | **Postgres pg_trgm + tsvector** | Free, built-in; upgrade to Typesense Phase 2 |
| Storage | **Cloudflare R2** | 10 GB free, zero egress cost |
| Email | **Resend** | 3k/month free, best developer API |
| Validation | **Zod 3.x** | Shared schemas, OpenAPI generation |
| API Docs | **Zod-OpenAPI + Scalar** | Auto-generate docs from Zod schemas |
| Queue | **Upstash QStash** | Serverless job queue, free tier |

### UI (`ui/`)
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15** (App Router + PPR) | Partial prerendering, RSC, best DX |
| Language | **TypeScript 5.x** | Same as API |
| Styling | **Tailwind CSS v4** | CSS-native, no config file, fastest build |
| Components | **shadcn/ui** (latest) | Copy-paste, fully owned, Radix primitives |
| Data fetching | **TanStack Query v5** | Best server-state management |
| Forms | **React Hook Form v7** + Zod | Minimal re-renders, type-safe |
| Animations | **Motion (Framer Motion v12)** | Declarative, performant |
| Icons | **Lucide React** | Tree-shakeable, consistent |
| API client | **ofetch** | Universal fetch wrapper, auto-retry |

### Shared / Tooling
| Tool | Choice | Why |
|------|--------|-----|
| Monorepo | **Turborepo** + **pnpm workspaces** | Best caching, parallelism, incremental builds |
| Linting/Format | **Biome** | Replaces ESLint + Prettier; 50x faster |
| Testing (unit) | **Vitest** + **Bun test** | Fastest unit/integration test runners |
| Testing (E2E) | **Playwright** | Cross-browser, reliable |
| CI/CD | **GitHub Actions** | Free for private repos |
| Secrets | **Doppler** or `.env` files | Structured env management |

---

## Architecture

```
findtopspots/
├── api/          # Hono API server
│   ├── src/
│   │   ├── routes/
│   │   ├── db/         # Drizzle schema + migrations
│   │   ├── services/
│   │   ├── middleware/
│   │   └── lib/
│   └── package.json
├── ui/           # Next.js app
│   ├── app/
│   │   ├── (auth)/
│   │   ├── spots/
│   │   ├── users/
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   └── package.json
├── packages/
│   └── types/    # Shared TypeScript types + Zod schemas
├── pnpm-workspace.yaml
└── package.json
```

### API Design
- REST with `/api/v1/` prefix
- JWT via Clerk — API validates token on every protected route
- Cursor-based pagination (not offset)
- Rate limiting via Redis
- OpenAPI spec generated from Zod schemas

### Key API Routes (v1)
```
POST   /auth/...           → Clerk webhooks
GET    /spots              → search/browse
POST   /spots              → create spot
GET    /spots/:id          → spot detail
PUT    /spots/:id          → update (owner only)
POST   /spots/:id/reviews  → add review
GET    /spots/:id/reviews  → list reviews
POST   /spots/:id/photos   → upload photo
GET    /users/:id          → public profile
GET    /users/:id/spots    → user's spots
GET    /users/:id/reviews  → user's reviews
GET    /lists              → browse lists
POST   /lists              → create list
POST   /lists/:id/spots    → add spot to list
```

---

## Database Schema (key tables)

```sql
users         (id, clerk_id, username, avatar_url, bio, created_at)
spots         (id, name, description, category, lat, lng, address, created_by, avg_rating, review_count, created_at)
spot_photos   (id, spot_id, url, uploaded_by, created_at)
spot_tags     (spot_id, tag)
reviews       (id, spot_id, user_id, rating, body, helpful_count, created_at)
review_votes  (review_id, user_id, vote)  -- helpful / not helpful
lists         (id, user_id, title, description, is_public, created_at)
list_spots    (list_id, spot_id, added_at)
bookmarks     (user_id, spot_id, created_at)
follows       (follower_id, following_id, created_at)
```

PostGIS extension enables:
```sql
SELECT *, ST_Distance(location, ST_Point($lng, $lat)) AS distance
FROM spots
WHERE ST_DWithin(location, ST_Point($lng, $lat), $radius_meters)
ORDER BY distance;
```

---

## Hosting Plan

| Service | What | Provider | Cost |
|---------|------|----------|------|
| UI | Next.js app | **Vercel** | Free |
| API | Hono server | **Railway** | ~$5/month (hobby) |
| Database | PostgreSQL + PostGIS | **Neon** | Free (0.5 GB) → $19/month |
| Cache | Redis | **Upstash** | Free (10k cmds/day) |
| Storage | Photos/assets | **Cloudflare R2** | Free (10 GB) |
| CDN | Static + images | **Cloudflare** | Free |
| Auth | User management | **Clerk** | Free (10k MAU) |
| Search | Full-text | **Postgres pg_trgm** | Included in Neon |
| Monitoring | Errors | **Sentry** | Free (5k errors/month) |
| Analytics | Usage | **PostHog** | Free (1M events/month) |
| Email | Transactional | **Resend** | Free (3k/month) |

**Estimated MVP cost: ~$0–$5/month** (Railway hobby plan only paid cost at start)

---

## Roadmap

### Phase 0 — Foundation (Week 1–2)
- [ ] Monorepo setup (pnpm workspaces)
- [ ] API: Hono + Drizzle + Neon Postgres scaffold
- [ ] UI: Next.js 15 + Tailwind + shadcn scaffold
- [ ] Auth wired end-to-end (Clerk)
- [ ] CI pipeline (GitHub Actions — lint, typecheck, test)
- [ ] Environments: local + staging + prod

### Phase 1 — MVP (Week 3–6)
- [ ] Spot CRUD (create, view, edit)
- [ ] Map integration (Mapbox)
- [ ] Photo upload → R2
- [ ] Review system (create, list, average rating)
- [ ] Search (keyword + geo radius)
- [ ] Home feed (trending / newest)
- [ ] Responsive UI (mobile-first)
- [ ] Deploy to Vercel + Railway

### Phase 2 — Growth (Week 7–12)
- [ ] User profiles
- [ ] Lists / collections
- [ ] Bookmarks
- [ ] Follow system
- [ ] Review helpful votes
- [ ] Email (Resend) — welcome + digests
- [ ] SEO (spot pages server-rendered, OG images)
- [ ] Analytics (PostHog)

### Phase 3 — Scale (Month 4+)
- [ ] AI search ("find me a cozy coffee shop with fast wifi")
- [ ] Personalization
- [ ] Business owner claims
- [ ] Public API / embed widget
- [ ] Performance audit + caching layer
- [ ] Mobile apps (React Native / Expo)

---

## Non-Functional Requirements

- **Performance**: spot page < 1s LCP (SSR + image optimization)
- **SEO**: all spot pages server-rendered with proper meta + structured data
- **Security**: auth on all write routes, rate limiting, input validation via Zod, file type validation on uploads
- **Accessibility**: WCAG 2.1 AA minimum (shadcn/ui handles baseline)
- **Scalability**: stateless API (horizontal scale on Railway), connection pooling via Neon

---

## Open Questions (decide before Phase 1 code)

1. **Domain name** — findtopspots.com / topspots.app / etc.
2. **Moderation** — auto-flag or manual review for new spots?
3. **Categories** — predefined taxonomy or user-defined tags?
4. **Map** — add later (Phase 2); static lat/lng stored now, map UI deferred
5. **Search upgrade** — Typesense when Postgres FTS hits limits (Phase 2+)
