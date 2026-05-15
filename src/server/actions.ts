'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { inquiries, products } from '@/db/schema'

const inquirySchema = z.object({
  productSlug: z.string().min(1),
  fullName: z.string().min(2).max(120),
  email: z.email().max(255),
  phone: z.string().min(6).max(40),
  company: z.string().max(120).optional().or(z.literal('')),
  message: z.string().min(10).max(5000),
})

export type InquiryActionResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string[] | undefined> }
  | null

export async function submitInquiry(
  _prevState: InquiryActionResult,
  formData: FormData
): Promise<InquiryActionResult> {
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
    where: eq(products.slug, data.productSlug),
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
  redirect('/inquiry/sent?from=' + encodeURIComponent(product.slug))
}
