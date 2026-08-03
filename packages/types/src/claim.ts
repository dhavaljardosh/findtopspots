import { z } from 'zod'

export const ClaimStatusSchema = z.enum(['pending', 'basic', 'verified', 'rejected'])

export const CreateClaimSchema = z.object({
  role: z.enum(['owner', 'manager', 'marketing']),
  businessEmail: z.string().email(),
  verificationMethod: z.enum(['email', 'phone']),
})

export const VerifyClaimSchema = z.object({
  code: z.string().min(6).max(8),
})

export const ClaimSchema = z.object({
  id: z.string().uuid(),
  spotId: z.string().uuid(),
  userId: z.string().uuid(),
  status: ClaimStatusSchema,
  role: z.string(),
  businessEmail: z.string().email(),
  verifiedAt: z.string().nullable(),
  createdAt: z.string(),
})

export const OwnerResponseSchema = z.object({
  body: z.string().min(10).max(2000),
})

export type ClaimStatus = z.infer<typeof ClaimStatusSchema>
export type CreateClaim = z.infer<typeof CreateClaimSchema>
export type VerifyClaim = z.infer<typeof VerifyClaimSchema>
export type Claim = z.infer<typeof ClaimSchema>
export type OwnerResponse = z.infer<typeof OwnerResponseSchema>
