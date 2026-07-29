'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { db } from '@/db/client'
import { inquiries } from '@/db/schema'
import { defaultLocale, isValidLocale, type Locale } from '@/i18n/config'

/**
 * ROUND 19 — the general contact request behind /contact.
 *
 * It writes into the SAME `inquiries` table as the product quote form rather
 * than a parallel one: the sales team already lives in /admin/inquiries, and
 * a second inbox is a second inbox nobody reads. `product_id` is null (round
 * 19 made it nullable) and the denormalised product_* columns carry the
 * subject, so every existing admin query, filter and list row keeps working
 * with no change at all.
 */

const SUBJECTS = ['quote', 'availability', 'support', 'partnership', 'other'] as const
export type ContactSubject = (typeof SUBJECTS)[number]

/** Shown in the admin list where a product name would normally appear. */
const SUBJECT_LABEL: Record<ContactSubject, string> = {
  quote: 'Contact — Demande de devis',
  availability: 'Contact — Disponibilité produit',
  support: 'Contact — SAV / support',
  partnership: 'Contact — Partenariat / revente',
  other: 'Contact — Autre demande',
}

const contactSchema = z.object({
  subject: z.enum(SUBJECTS),
  fullName: z.string().min(2).max(120),
  email: z.email().max(255),
  phone: z.string().min(6).max(40),
  company: z.string().max(120).optional().or(z.literal('')),
  message: z.string().min(10).max(5000),
})

function formLocale(formData: FormData): Locale {
  const raw = formData.get('locale')
  return typeof raw === 'string' && isValidLocale(raw) ? raw : defaultLocale
}

export type ContactActionResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string[] | undefined> }
  | null

const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
      prefix: 'dtech:contact',
    })
  : null

export async function submitContact(
  _prevState: ContactActionResult,
  formData: FormData
): Promise<ContactActionResult> {
  // Honeypot — same trick as the product inquiry form. Bots fill every input,
  // humans never see this one. Silent success, no write.
  const honeypot = formData.get('website')
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    redirect(`/${formLocale(formData)}/inquiry/sent`)
  }

  if (ratelimit) {
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headersList.get('x-real-ip') ??
      'anonymous'
    const { success } = await ratelimit.limit(ip)
    if (!success) {
      // Distinct code, not a generic error: the form's single fallback
      // message reads "check the fields", which would send a rate-limited
      // visitor into an endless loop of editing perfectly valid input.
      return { ok: false, errors: { _rate: ['rate-limited'] } }
    }
  }

  const parsed = contactSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors }
  }
  const data = parsed.data

  await db.insert(inquiries).values({
    productId: null,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    company: data.company ? data.company : null,
    message: data.message,
    productSlug: `contact-${data.subject}`,
    productName: SUBJECT_LABEL[data.subject],
    productBrand: 'D-tech',
  })

  revalidatePath('/admin/inquiries')
  // No `?from=` — that param is a PRODUCT SLUG on the confirmation page, which
  // would fire getProductBySlug('contact') on every submission: a guaranteed
  // miss, and `cachedData` is called there without `cacheEmpty`, so the miss
  // is never cached either. One wasted round trip per contact request.
  redirect(`/${formLocale(formData)}/inquiry/sent`)
}
