import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { MiddlewareHandler } from 'hono'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '60 s'),
  analytics: true,
  prefix: 'fts:ratelimit',
})

export const rateLimiter: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  const { success, limit, remaining, reset } = await ratelimit.limit(ip)

  c.header('X-RateLimit-Limit', String(limit))
  c.header('X-RateLimit-Remaining', String(remaining))
  c.header('X-RateLimit-Reset', String(reset))

  if (!success) {
    return c.json({ error: 'Too many requests' }, 429)
  }

  await next()
}
