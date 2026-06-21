import 'server-only'
import { createHash } from 'crypto'
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME
const publicUrl = process.env.R2_PUBLIC_URL

if (
  !accountId ||
  !accessKeyId ||
  !secretAccessKey ||
  !bucketName ||
  !publicUrl
) {
  // R2 is optional: when unset, admin uploads are stored in Postgres
  // (image_blobs) and served via /api/images. No warning needed.
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : 'https://placeholder.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: accessKeyId ?? 'placeholder',
    secretAccessKey: secretAccessKey ?? 'placeholder',
  },
})

export const R2_CONFIGURED = Boolean(
  accountId && accessKeyId && secretAccessKey && bucketName && publicUrl
)
export const R2_BUCKET = bucketName ?? ''
export const R2_PUBLIC_BASE = publicUrl ?? ''

export function buildPublicUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key}`
}

export function extractKeyFromUrl(url: string): string | null {
  if (!R2_PUBLIC_BASE) return null
  if (!url.startsWith(R2_PUBLIC_BASE)) return null
  return url.slice(R2_PUBLIC_BASE.length + 1)
}

export function generateHash(input: string): string {
  return createHash('sha256')
    .update(input + Date.now() + Math.random())
    .digest('hex')
    .slice(0, 8)
}

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ key: string; url: string }> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  return {
    key,
    url: buildPublicUrl(key),
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  )
}
