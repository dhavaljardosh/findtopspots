import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { rateLimiter } from './middleware/rate-limit'
import { spotsRouter } from './routes/spots'
import { reviewsRouter } from './routes/reviews'
import { usersRouter } from './routes/users'
import { webhooksRouter } from './routes/webhooks'

const app = new Hono().basePath('/api/v1')

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: [process.env.UI_URL ?? 'http://localhost:3000'],
    credentials: true,
  }),
)
app.use('/api/v1/*', rateLimiter)

app.route('/spots', spotsRouter)
app.route('/spots', reviewsRouter) // nested reviews under spots
app.route('/users', usersRouter)
app.route('/webhooks', webhooksRouter)

app.get('/health', (c) => c.json({ ok: true }))

export default {
  port: Number(process.env.PORT ?? 3001),
  fetch: app.fetch,
}
