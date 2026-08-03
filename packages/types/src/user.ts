import { z } from 'zod'

export const CreateUserSchema = z.object({
  clerkId: z.string(),
  username: z.string(),
  avatarUrl: z.string().optional(),
})

export const UserSchema = z.object({
  id: z.string().uuid(),
  clerkId: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.string(),
})

export type CreateUser = z.infer<typeof CreateUserSchema>
export type User = z.infer<typeof UserSchema>
