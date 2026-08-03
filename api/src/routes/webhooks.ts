import { Hono } from 'hono'
import { Webhook } from 'svix'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'

export const webhooksRouter = new Hono()

type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: {
    id: string
    username: string | null
    image_url: string | null
    first_name: string | null
    last_name: string | null
  }
}

type ClerkUserUpdatedEvent = {
  type: 'user.updated'
  data: {
    id: string
    username: string | null
    image_url: string | null
    first_name: string | null
    last_name: string | null
  }
}

type ClerkUserDeletedEvent = {
  type: 'user.deleted'
  data: {
    id: string
    deleted: boolean
  }
}

type ClerkWebhookEvent =
  | ClerkUserCreatedEvent
  | ClerkUserUpdatedEvent
  | ClerkUserDeletedEvent

// POST /clerk — Clerk webhook handler
webhooksRouter.post('/clerk', async (c) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return c.json({ error: 'Webhook secret not configured' }, 500)
  }

  // Read raw body for signature verification
  const rawBody = await c.req.text()

  const svixId = c.req.header('svix-id')
  const svixTimestamp = c.req.header('svix-timestamp')
  const svixSignature = c.req.header('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: 'Missing Svix headers' }, 400)
  }

  // Verify the webhook signature
  const wh = new Webhook(webhookSecret)
  let event: ClerkWebhookEvent

  try {
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return c.json({ error: 'Invalid webhook signature' }, 400)
  }

  // Handle events
  switch (event.type) {
    case 'user.created': {
      const { id, username, image_url, first_name, last_name } = event.data

      // Derive a username from available data
      const derivedUsername =
        username ??
        [first_name, last_name].filter(Boolean).join('_').toLowerCase() ??
        `user_${id.slice(-8)}`

      await db
        .insert(users)
        .values({
          clerkId: id,
          username: derivedUsername,
          avatarUrl: image_url ?? undefined,
        })
        .onConflictDoNothing()

      break
    }

    case 'user.updated': {
      const { id, username, image_url, first_name, last_name } = event.data

      const derivedUsername =
        username ??
        [first_name, last_name].filter(Boolean).join('_').toLowerCase() ??
        undefined

      const updatePayload: Partial<typeof users.$inferInsert> = {
        avatarUrl: image_url ?? undefined,
      }

      if (derivedUsername) {
        updatePayload.username = derivedUsername
      }

      await db.update(users).set(updatePayload).where(eq(users.clerkId, id))

      break
    }

    case 'user.deleted': {
      const { id } = event.data
      // Hard delete — cascade constraints in schema handle related rows
      // TODO: consider soft-delete by adding a `deletedAt` column to users
      await db.delete(users).where(eq(users.clerkId, id))
      break
    }

    default: {
      // Unhandled event type — acknowledge receipt
      break
    }
  }

  return c.json({ received: true })
})
