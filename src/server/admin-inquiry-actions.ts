'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { inquiries, inquiryStatusHistory } from '@/db/schema'
import { auth } from '@/lib/auth'
import { requireSection } from '@/lib/auth-helpers'

const inquiryStatusSchema = z.enum(['new', 'contacted', 'closed', 'spam'])

async function getSessionUser() {
  await requireSection('inquiries')
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session.user
}

export async function updateInquiryStatus(
  inquiryId: string,
  newStatus: 'new' | 'contacted' | 'closed' | 'spam',
  optionalNote?: string
) {
  const user = await getSessionUser()
  const validated = inquiryStatusSchema.parse(newStatus)

  const current = await db
    .select({ status: inquiries.status })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1)
    .then((rows) => rows[0])

  if (!current) {
    return { ok: false as const, error: 'Inquiry not found' as const }
  }

  if (current.status === validated) {
    return { ok: true as const, unchanged: true as const }
  }

  await db
    .update(inquiries)
    .set({
      status: validated,
      ...(validated === 'contacted' && { contactedAt: new Date() }),
    })
    .where(eq(inquiries.id, inquiryId))

  await db.insert(inquiryStatusHistory).values({
    inquiryId,
    fromStatus: current.status,
    toStatus: validated,
    changedByUserId: user.id,
    changedByEmail: user.email,
    note: optionalNote ?? null,
  })

  revalidatePath('/admin/inquiries')
  revalidatePath(`/admin/inquiries/${inquiryId}`)
  revalidatePath('/admin')

  return { ok: true as const }
}

export async function updateInquiryNotes(inquiryId: string, notes: string) {
  await getSessionUser()

  const trimmed = notes.trim().slice(0, 5000)

  await db
    .update(inquiries)
    .set({ notes: trimmed || null })
    .where(eq(inquiries.id, inquiryId))

  revalidatePath(`/admin/inquiries/${inquiryId}`)

  return { ok: true as const }
}
