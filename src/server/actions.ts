'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { and, eq, isNull } from 'drizzle-orm'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { db } from '@/db/client'
import { inquiries, products } from '@/db/schema'
import { defaultLocale, isValidLocale, type Locale } from '@/i18n/config'

const inquirySchema = z.object({
  productSlug: z.string().min(1),
  fullName: z.string().min(2).max(120),
  email: z.email().max(255),
  phone: z.string().min(6).max(40),
  company: z.string().max(120).optional().or(z.literal('')),
  message: z.string().min(10).max(5000),
})

// The form posts its locale so redirects and error messages stay in the
// visitor's language (server actions don't run through the i18n proxy).
function formLocale(formData: FormData): Locale {
  const raw = formData.get('locale')
  return typeof raw === 'string' && isValidLocale(raw) ? raw : defaultLocale
}

export type InquiryActionResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string[] | undefined> }
  | null

// Upstash rate limiter — only enabled when credentials are present.
// 3 submissions per IP per rolling hour.
const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'dtech:inquiry',
    })
  : null

export async function submitInquiry(
  _prevState: InquiryActionResult,
  formData: FormData
): Promise<InquiryActionResult> {
  // Honeypot — bots that auto-fill all inputs will fill `website`.
  // Silently redirect to /inquiry/sent without writing to the DB.
  const honeypot = formData.get('website')
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    const slug = formData.get('productSlug')
    redirect(
      `/${formLocale(formData)}/inquiry/sent` +
        (typeof slug === 'string' && slug.length > 0
          ? `?from=${encodeURIComponent(slug)}`
          : '')
    )
  }

  // Rate limit per IP, sliding 1-hour window. Skipped in dev when Upstash
  // env vars aren't configured.
  if (ratelimit) {
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headersList.get('x-real-ip') ??
      'anonymous'

    const { success } = await ratelimit.limit(ip)
    if (!success) {
      const t = await getTranslations({
        locale: formLocale(formData),
        namespace: 'inquiry',
      })
      return {
        ok: false,
        errors: {
          _form: [t('rateLimited')],
        },
      }
    }
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = inquirySchema.safeParse(raw)

  if (!parsed.success) {
    return {
      ok: false,
      errors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const data = parsed.data

  const product = await db.query.products.findFirst({
    where: and(
      eq(products.slug, data.productSlug),
      isNull(products.archivedAt)
    ),
    with: { brand: true },
  })

  if (!product) {
    return { ok: false, errors: { productSlug: ['Product not found'] } }
  }

  await db.insert(inquiries).values({
    productId: product.id,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    company: data.company ? data.company : null,
    message: data.message,
    productSlug: product.slug,
    productName: product.name,
    productBrand: product.brand.name,
  })

  revalidatePath('/admin/inquiries')
  redirect(
    `/${formLocale(formData)}/inquiry/sent?from=` +
      encodeURIComponent(product.slug)
  )
}
