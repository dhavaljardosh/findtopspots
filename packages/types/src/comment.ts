import { z } from 'zod'

export const CreateCommentSchema = z.object({
  body: z.string().min(2).max(2000),
  parentId: z.string().uuid().optional(),
  isAnonymous: z.boolean().default(false),
  anonEmail: z.string().email().optional(), // only required if isAnonymous = true
})

export const CommentSchema = z.object({
  id: z.string().uuid(),
  spotId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  parentId: z.string().uuid().nullable(),
  body: z.string(),
  isAnonymous: z.boolean(),
  helpfulCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  // userId shown as null when anonymous; display name derived client-side
  displayName: z.string().nullable(), // 'Anonymous' | username
  replies: z.array(z.lazy((): z.ZodTypeAny => CommentSchema)).optional(),
})

export type CreateComment = z.infer<typeof CreateCommentSchema>
export type Comment = z.infer<typeof CommentSchema>
