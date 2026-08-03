# FindTopSpots — Service Signups & Billing Calendar

Sign up in this order. Everything free to start.

---

## Sign Up Now (Phase 0 blockers)

| # | Service | Sign Up URL | What it does | Free Tier |
|---|---------|-------------|--------------|-----------|
| 1 | **Neon** | neon.tech | Postgres database | 0.5 GB storage, 1 project, unlimited connections |
| 2 | **Clerk** | clerk.com | Auth (sign in/up, OAuth) | 10,000 Monthly Active Users |
| 3 | **Upstash** | upstash.com | Redis cache + rate limiting | 10,000 commands/day, 256 MB |
| 4 | **Cloudflare** | cloudflare.com | R2 photo storage + CDN | 10 GB storage, 1M requests/month |
| 5 | **Vercel** | vercel.com | Host Next.js UI | Unlimited hobby projects |
| 6 | **Fly.io** | fly.io | Host Hono API | 3 shared VMs free (enough for API) |
| 7 | **Resend** | resend.com | Transactional email | 3,000 emails/month, 100/day |
| 8 | **Sentry** | sentry.io | Error monitoring | 5,000 errors/month |
| 9 | **GitHub** | github.com | Private repo + CI/CD | Free for private repos |

---

## Billing Calendar

### Month 1–3 (Launch → Early Users)
**Expected cost: $0/month**

All services stay within free tiers at low traffic.

| Date | Event |
|------|-------|
| Aug 2026 | Sign up all services above |
| Aug 2026 | Deploy to Vercel + Fly.io |
| Sep 2026 | Launch v1 (MVP) |
| Oct 2026 | Monitor usage dashboards |

---

### Month 4–6 (Growth — watch these limits)

| Service | Watch For | Free Limit | Action When Hit |
|---------|-----------|------------|-----------------|
| **Neon** | DB size approaching 0.5 GB | 0.5 GB | Upgrade → Launch plan $19/month |
| **Clerk** | MAU approaching 10,000 | 10,000 MAU | Upgrade → Pro $25/month |
| **Upstash Redis** | Commands/day near 10k | 10k/day | Upgrade → Pay-as-you-go ~$0.20/100k cmds |
| **Cloudflare R2** | Photos exceeding 10 GB | 10 GB | $0.015/GB after — very cheap |
| **Fly.io** | API needing more memory/CPU | 3 shared VMs | Upgrade → ~$5–10/month |
| **Resend** | Emails near 3k/month | 3k/month | Upgrade → $20/month (50k emails) |

**Realistic charge date: Feb–Mar 2027** (if you get 500+ active users)

---

### Month 6–12 (Scale — expected paid services)

| Service | Est. Cost/month | Trigger |
|---------|----------------|---------|
| Neon Launch | $19 | >0.5 GB data |
| Clerk Pro | $25 | >10k MAU |
| Fly.io | $10 | More API traffic |
| Upstash | ~$5 | High Redis usage |
| Resend | $20 | Email features |
| **Total** | **~$79/month** | At real scale |

---

## Setup Order (do these in sequence)

```
Day 1:  GitHub (create private repo "findtopspots")
Day 1:  Neon (create project "findtopspots", copy DATABASE_URL)
Day 1:  Clerk (create app, copy publishable key + secret key + webhook secret)
Day 1:  Upstash (create Redis DB, copy REST URL + token)
Day 2:  Cloudflare (create R2 bucket "findtopspots-media", create API token)
Day 2:  Vercel (connect GitHub repo, add env vars, deploy UI)
Day 2:  Fly.io (fly launch in api/ folder, add env vars, deploy API)
Day 2:  Resend (verify domain or use sandbox for dev)
Day 3:  Sentry (create project, add DSN to both api/ and ui/)
```

---

## Env Vars Checklist

Once signed up, fill these in `api/.env` and `ui/.env.local`:

```bash
# Neon (from neon.tech dashboard)
DATABASE_URL=

# Clerk (from clerk.com dashboard → API Keys)
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Upstash (from upstash.com → Redis → REST API)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudflare R2 (from cloudflare.com → R2 → API Tokens)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=findtopspots-media

# Resend (from resend.com → API Keys)
RESEND_API_KEY=

# URLs
NEXT_PUBLIC_API_URL=https://api.findtopspots.com
UI_URL=https://findtopspots.com
```
