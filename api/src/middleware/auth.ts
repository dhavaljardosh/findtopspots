import { verifyToken } from '@clerk/backend'
import type { Context, MiddlewareHandler } from 'hono'

type AuthEnv = {
  Variables: {
    userId: string
  }
}

export const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    c.set('userId', payload.sub)
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

export function getAuth(c: Context<AuthEnv>): string {
  return c.get('userId')
}
