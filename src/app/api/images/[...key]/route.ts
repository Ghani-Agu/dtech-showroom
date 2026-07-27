import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { imageBlobs } from '@/db/schema'

export const dynamic = 'force-dynamic'

/**
 * In-process memo of recently served blobs. Image keys are content-hashed
 * (products/<slug>/card-<hash>.webp), so an entry never changes — safe to
 * hold. Caps keep a warm lambda under ~24 MB of image memory.
 */
const memo = new Map<string, { data: Uint8Array; contentType: string }>()
const MEMO_MAX_ITEM = 1_500_000 // don't memoize blobs > ~1.5 MB
const MEMO_MAX_ENTRIES = 48

/**
 * Serves DB-hosted images (admin uploads).
 *
 * `s-maxage` matters: the Vercel CDN only caches function responses when
 * a shared-cache directive is present. Without it, EVERY visitor's hero
 * slide / uploaded photo was a function invocation + a database read —
 * a big contributor to slow first paints. Now the first hit per region
 * primes the CDN and later visitors never reach the function.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
  const fullKey = key.join('/')

  let row = memo.get(fullKey)

  if (!row) {
    const dbRow = await db
      .select({ data: imageBlobs.data, contentType: imageBlobs.contentType })
      .from(imageBlobs)
      .where(eq(imageBlobs.key, fullKey))
      .limit(1)
      .then((rows) => rows[0])
      .catch(() => undefined)

    if (!dbRow) return new Response('Not found', { status: 404 })

    row = {
      data: new Uint8Array(dbRow.data),
      contentType: dbRow.contentType,
    }

    if (row.data.byteLength <= MEMO_MAX_ITEM) {
      if (memo.size >= MEMO_MAX_ENTRIES) {
        const oldest = memo.keys().next().value
        if (oldest !== undefined) memo.delete(oldest)
      }
      memo.set(fullKey, row)
    }
  }

  return new Response(row.data.slice(), {
    headers: {
      'content-type': row.contentType,
      'cache-control':
        'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  })
}
