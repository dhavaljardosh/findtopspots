import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export function isAllowedFileType(contentType: string): boolean {
  return ALLOWED_TYPES.includes(contentType)
}

export function buildObjectKey(folder: 'spots' | 'avatars', userId: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `${folder}/${userId}/${timestamp}-${random}.${ext}`
}

export function getPublicUrl(key: string): string {
  return `${process.env.R2_ENDPOINT}/${BUCKET}/${key}`
}

// Generate a presigned PUT URL — UI uploads directly to R2, not through our API
// Avoids doubling bandwidth through the server
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300, // 5 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: MAX_FILE_SIZE,
  })
  return getSignedUrl(r2, command, { expiresIn })
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export { MAX_FILE_SIZE }
