# FindTopSpots — Task Board

Owned by: **MANAGER**
Last updated: 2026-07-31

---

## 🔴 Blocked
_Nothing blocked yet._

---

## 🔄 In Progress
_Nothing in progress yet. Awaiting Phase 0 kickoff._

---

## 📋 Backlog — Phase 0: Foundation

| ID | Task | Owner | Depends On |
|----|------|-------|------------|
| P0-01 | Monorepo scaffold (Turborepo + pnpm workspaces) | Backend Dev | — |
| P0-02 | API scaffold: Bun + Hono + env setup | Backend Dev | P0-01 |
| P0-03 | UI scaffold: Next.js 15 + Tailwind v4 + shadcn init | Frontend Dev | P0-01 |
| P0-04 | Shared types package scaffold (`packages/types/`) | Architect | P0-01 |
| P0-05 | Drizzle schema — initial tables (users, spots, reviews) | Backend Dev | P0-04 |
| P0-06 | Neon DB provisioning + migration run | Backend Dev | P0-05 |
| P0-07 | Clerk auth wired: API middleware + UI sign-in/up | Backend Dev + Frontend Dev | P0-02, P0-03 |
| P0-08 | Biome config (lint + format) | Backend Dev | P0-01 |
| P0-09 | GitHub Actions CI (typecheck + lint + test) | Backend Dev | P0-08 |
| P0-10 | Staging deploy: Vercel (UI) + Fly.io (API) | Backend Dev | P0-09 |
| P0-11 | Design tokens + base theme | Designer | P0-03 |
| P0-12 | QA: test scaffolding (Vitest config + Playwright config) | QA | P0-01 |

---

## 📋 Backlog — Phase 1: MVP

| ID | Task | Owner | Depends On |
|----|------|-------|------------|
| P1-01 | API: POST /spots (create spot) | Backend Dev | P0-06 |
| P1-02 | API: GET /spots (browse + search) | Backend Dev | P0-06 |
| P1-03 | API: GET /spots/:id (spot detail) | Backend Dev | P0-06 |
| P1-04 | API: PUT /spots/:id (edit spot, owner only) | Backend Dev | P1-01 |
| P1-05 | API: POST /spots/:id/reviews | Backend Dev | P0-06 |
| P1-06 | API: GET /spots/:id/reviews | Backend Dev | P0-06 |
| P1-07 | API: Photo upload → R2 | Backend Dev | P0-06 |
| P1-08 | UI: Home feed page (trending / newest) | Frontend Dev | P1-02 |
| P1-09 | UI: Spot detail page | Frontend Dev | P1-03, P1-06 |
| P1-10 | UI: Add spot form | Frontend Dev | P1-01 |
| P1-11 | UI: Search bar + results page | Frontend Dev | P1-02 |
| P1-12 | UI: Write review flow | Frontend Dev | P1-05 |
| P1-13 | Designer: Spot card spec | Designer | P0-11 |
| P1-14 | Designer: Spot detail page spec | Designer | P0-11 |
| P1-15 | Designer: Add spot form spec | Designer | P0-11 |
| P1-16 | QA: API route tests (all P1 routes) | QA | P1-07 |
| P1-17 | QA: E2E — add spot + review flow | QA | P1-12 |
| P1-18 | QA: E2E — search flow | QA | P1-11 |

---

## ✅ Done
_Nothing shipped yet._

---

## Notes
- Architect must write ADR before any P0 task begins
- Manager to update this file after every agent session
- P0 tasks can run in parallel: Backend Dev (P0-02, P0-05) + Frontend Dev (P0-03) + Designer (P0-11)
