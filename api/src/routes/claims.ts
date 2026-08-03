import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and } from 'drizzle-orm'
import { CreateClaimSchema, VerifyClaimSchema, OwnerResponseSchema } from '@fts/types'
import { db } from '../db'
import { spots, users, businessClaims, ownerResponses, reviews } from '../db/schema'
import { requireAuth, getAuth } from '../middleware/auth'
import {
  generateVerificationCode,
  sendClaimVerificationEmail,
  sha256Hex,
} from '../services/verification'

type AuthEnv = {
  Variables: {
    userId: string
  }
}

export const claimsRouter = new Hono<AuthEnv>()

// POST /:spotId/claim — initiate a business claim
claimsRouter.post(
  '/:spotId/claim',
  requireAuth,
  zValidator('json', CreateClaimSchema),
  async (c) => {
    const clerkId = getAuth(c)
    const spotId = c.req.param('spotId')
    const body = c.req.valid('json')

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const spot = await db.query.spots.findFirst({ where: eq(spots.id, spotId) })
    if (!spot) {
      return c.json({ error: 'Spot not found' }, 404)
    }

    // Check for an existing verified claim on this spot (any user)
    const existingClaim = await db.query.businessClaims.findFirst({
      where: and(
        eq(businessClaims.spotId, spotId),
        // status = 'basic' or 'verified' means already claimed
      ),
    })

    if (
      existingClaim &&
      (existingClaim.status === 'basic' || existingClaim.status === 'verified')
    ) {
      return c.json({ error: 'Already claimed' }, 409)
    }

    const plainCode = generateVerificationCode()
    const codeHash = await sha256Hex(plainCode)

    const [claim] = await db
      .insert(businessClaims)
      .values({
        spotId,
        userId: user.id,
        status: 'pending',
        role: body.role,
        businessEmail: body.businessEmail,
        verificationCode: codeHash,
        verificationMethod: body.verificationMethod,
      })
      .returning()

    if (!claim) {
      return c.json({ error: 'Failed to create claim' }, 500)
    }

    await sendClaimVerificationEmail(body.businessEmail, spot.name, plainCode)

    return c.json({ message: 'Verification code sent to your email', claimId: claim.id }, 201)
  },
)

// POST /:spotId/claim/verify — verify the submitted code
claimsRouter.post(
  '/:spotId/claim/verify',
  requireAuth,
  zValidator('json', VerifyClaimSchema),
  async (c) => {
    const clerkId = getAuth(c)
    const spotId = c.req.param('spotId')
    const { code } = c.req.valid('json')

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const claim = await db.query.businessClaims.findFirst({
      where: and(
        eq(businessClaims.spotId, spotId),
        eq(businessClaims.userId, user.id),
        eq(businessClaims.status, 'pending'),
      ),
    })

    if (!claim) {
      return c.json({ error: 'Invalid or expired code' }, 400)
    }

    // Check the claim is less than 30 minutes old
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    if (!claim.createdAt || claim.createdAt < thirtyMinutesAgo) {
      return c.json({ error: 'Invalid or expired code' }, 400)
    }

    const submittedHash = await sha256Hex(code)

    if (submittedHash !== claim.verificationCode) {
      return c.json({ error: 'Invalid or expired code' }, 400)
    }

    const now = new Date()

    const [updatedClaim] = await db
      .update(businessClaims)
      .set({
        status: 'basic',
        verificationCode: null,
        verifiedAt: now,
      })
      .where(eq(businessClaims.id, claim.id))
      .returning()

    await db
      .update(spots)
      .set({ isVerifiedBusiness: true })
      .where(eq(spots.id, spotId))

    return c.json({ message: 'Business verified', claim: updatedClaim })
  },
)

// GET /:spotId/claim — get current claim status for the authenticated user + spot
claimsRouter.get('/:spotId/claim', requireAuth, async (c) => {
  const clerkId = getAuth(c)
  const spotId = c.req.param('spotId')

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const claim = await db.query.businessClaims.findFirst({
    where: and(eq(businessClaims.spotId, spotId), eq(businessClaims.userId, user.id)),
  })

  if (!claim) {
    return c.json({ error: 'No claim found' }, 404)
  }

  // Never expose the stored code hash in responses
  const { verificationCode: _vc, ...safeClaim } = claim
  return c.json({ claim: safeClaim })
})

// POST /reviews/:reviewId/respond — owner response to a review
// Note: this router is mounted at /reviews in index.ts so the param is :reviewId directly
claimsRouter.post(
  '/:reviewId/respond',
  requireAuth,
  zValidator('json', OwnerResponseSchema),
  async (c) => {
    const clerkId = getAuth(c)
    const reviewId = c.req.param('reviewId')
    const body = c.req.valid('json')

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const review = await db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) })
    if (!review) {
      return c.json({ error: 'Review not found' }, 404)
    }

    // Verify the user has a verified (basic or verified) claim on the spot the review belongs to
    const claim = await db.query.businessClaims.findFirst({
      where: and(
        eq(businessClaims.spotId, review.spotId),
        eq(businessClaims.userId, user.id),
      ),
    })

    if (!claim || (claim.status !== 'basic' && claim.status !== 'verified')) {
      return c.json({ error: 'Forbidden: no verified claim on this spot' }, 403)
    }

    // Check for an existing response
    const existingResponse = await db.query.ownerResponses.findFirst({
      where: eq(ownerResponses.reviewId, reviewId),
    })

    if (existingResponse) {
      return c.json({ error: 'A response already exists for this review' }, 409)
    }

    const [response] = await db
      .insert(ownerResponses)
      .values({
        reviewId,
        userId: user.id,
        body: body.body,
      })
      .returning()

    if (!response) {
      return c.json({ error: 'Failed to create response' }, 500)
    }

    return c.json(response, 201)
  },
)
