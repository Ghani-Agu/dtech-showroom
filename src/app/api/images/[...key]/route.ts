import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { imageBlobs } from '@/db/schema'

export const dynamic = 'force-dynamic'

/** Serves DB-hosted images (admin uploads) with immutable caching. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
  const fullKey = key.join('/')

  const row = await db
    .select({ data: imageBlobs.data, contentType: imageBlobs.contentType })
    .from(imageBlobs)
    .where(eq(imageBlobs.key, fullKey))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => undefined)

  if (!row) return new Response('Not found', { status: 404 })

  return new Response(new Uint8Array(row.data), {
    headers: {
      'content-type': row.contentType,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
