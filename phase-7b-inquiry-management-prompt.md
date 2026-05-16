You are executing Phase 7b — Inquiry Management for the Dtech 
Showroom project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 7a complete (latest commit: d5a5e1b): admin shell, sidebar, 
  header, breadcrumb, dashboard, UI primitives, toast system
- v2 brand spec is the source of truth for visual decisions
- Real client engagement with Dtech Algérie
- inquiries table schema (from Phase 2-4a):
  - id (uuid)
  - productId (uuid, FK to products)
  - fullName, email, phone, company (nullable), message (text)
  - productSlug, productName, productBrand (denormalized for resilience)
  - status (inquiry_status enum: 'new' | 'contacted' | 'closed' | 'spam')
  - notes (text, nullable)
  - submittedAt (timestamp)
- Phase 7a primitives ready to use: Card, Button, Input, Textarea, 
  Badge, Stat
- Sonner toast system wired in admin layout
- This is Phase 7b of 7 (7a done, 7c-7g still pending)

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Build the complete inquiry management interface that Dtech employees 
will use daily to respond to customer inquiries. Build the list view 
with status filter tabs, search across all text fields, and 
pagination. Build the detail view showing full inquiry context, 
product link, internal notes editor, and status update controls. Add 
an audit trail (assignedTo + status change history) via schema 
extension. Update the dashboard's recent-inquiries list to use the 
new admin row component for consistency. After this lands, the 
inquiry management workflow is production-complete and Dtech can 
process inquiries without involving the developer.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Email notifications to staff on new inquiry (Phase 9 — Resend 
  integration in production env)
- Inquiry assignment to specific staff users (deferred — Dtech can 
  use notes for this informally for now)
- Email-the-customer-back functionality from within admin (open mail 
  client via mailto: is fine; full email composition is Phase 9+)
- CSV export of inquiries (defer to later if Dtech requests)
- Inquiry analytics/charts (separate analytics phase)
- Spam detection beyond manual status='spam' marking
- Bulk operations (defer to 7g polish phase)
- Real-time updates via websockets (page refresh is fine for now)
- French translations of admin UI (Phase 8)
- Modifying customer-facing inquiry form
- Touching auth flow
- Modifying brand-tokens.ts, fonts.ts, animations.ts, globals.css
- Touching /motion or any (dev) routes

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Schema additions (status_history table, contactedAt timestamp)
  2. Migration (db push, additive only)
  3. Server actions (updateInquiryStatus, updateInquiryNotes)
  4. Inquiry list page with filter tabs, search, pagination
  5. Inquiry list row component
  6. Inquiry detail page
  7. Status update component (segmented control)
  8. Notes editor (autosave on blur)
  9. Dashboard update — use new InquiryListRow component
  10. Verification (lint, tsc, build, smoke tests)
  11. Commit

tsc checkpoint after task 3 and task 8.

================================================================
TASK 1 — SCHEMA ADDITIONS
================================================================

Open src/db/schema.ts. Add two things to the inquiries area:

Step 1.1: Add contactedAt timestamp to inquiries table

Modify the existing inquiries table to add a new column. Find the 
existing inquiries pgTable definition and add this column (do NOT 
remove or modify existing columns):

```typescript
// Add to the existing inquiries pgTable definition:
contactedAt: timestamp('contacted_at'),  // null until status changes to 'contacted'
```

Step 1.2: Create inquiry_status_history table

After the inquiries table definition, add:

```typescript
export const inquiryStatusHistory = pgTable('inquiry_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  inquiryId: uuid('inquiry_id')
    .notNull()
    .references(() => inquiries.id, { onDelete: 'cascade' }),
  fromStatus: inquiryStatusEnum('from_status'),  // null on initial creation
  toStatus: inquiryStatusEnum('to_status').notNull(),
  changedByUserId: text('changed_by_user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  changedByEmail: text('changed_by_email'),  // denormalized fallback if user deleted
  note: text('note'),  // optional comment on the status change
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  inquiryIdIdx: index('isq_inquiry_id_idx').on(table.inquiryId),
  createdAtIdx: index('isq_created_at_idx').on(table.createdAt.desc()),
}))
```

Note: every status change creates a row. The audit trail is 
append-only — never edit or delete history rows.

Step 1.3: Update type exports

Add type exports at the bottom of the file:

```typescript
export type InquiryStatusHistory = typeof inquiryStatusHistory.$inferSelect
export type InsertInquiryStatusHistory = typeof inquiryStatusHistory.$inferInsert
```

================================================================
TASK 2 — APPLY MIGRATION
================================================================

Run:
  pnpm db:push --force

Use --force because the shell isn't a TTY (same as Phase 6). Changes 
are additive (one new column on inquiries, one new table) so --force 
is safe.

Verify:
  pnpm db:studio

Confirm:
- inquiries table now has contacted_at column
- inquiry_status_history table exists with correct columns

================================================================
TASK 3 — SERVER ACTIONS
================================================================

Create src/server/admin-inquiry-actions.ts:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { inquiries, inquiryStatusHistory } from '@/db/schema'
import { auth } from '@/lib/auth'

const inquiryStatusSchema = z.enum(['new', 'contacted', 'closed', 'spam'])

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  }).catch(() => null)
  
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
  
  // Fetch current status
  const current = await db
    .select({ status: inquiries.status })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1)
    .then((rows) => rows[0])
  
  if (!current) {
    return { ok: false, error: 'Inquiry not found' as const }
  }
  
  if (current.status === validated) {
    return { ok: true, unchanged: true } as const
  }
  
  // Update inquiry status (and contactedAt if moving to 'contacted')
  await db
    .update(inquiries)
    .set({
      status: validated,
      ...(validated === 'contacted' && { contactedAt: new Date() }),
    })
    .where(eq(inquiries.id, inquiryId))
  
  // Append to status history
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
  revalidatePath('/admin')  // dashboard recent inquiries
  
  return { ok: true } as const
}

export async function updateInquiryNotes(
  inquiryId: string,
  notes: string
) {
  await getSessionUser()
  
  const trimmed = notes.trim().slice(0, 5000)  // hard cap
  
  await db
    .update(inquiries)
    .set({ notes: trimmed || null })
    .where(eq(inquiries.id, inquiryId))
  
  revalidatePath(`/admin/inquiries/${inquiryId}`)
  
  return { ok: true } as const
}
```

================================================================
TASK 4 — INQUIRY LIST PAGE
================================================================

Replace src/app/admin/inquiries/page.tsx with the full list view:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/db/client'
import { inquiries } from '@/db/schema'
import { eq, ilike, or, desc, sql, count } from 'drizzle-orm'
import { Input } from '@/components/admin/ui/Input'
import { Card, CardContent } from '@/components/admin/ui/Card'
import { InquiryListRow } from '@/components/admin/inquiries/InquiryListRow'
import { CircleDashed } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Inquiries — Dtech Admin',
  robots: { index: false, follow: false },
}

type StatusFilter = 'all' | 'new' | 'contacted' | 'closed' | 'spam'

interface PageProps {
  searchParams: Promise<{
    status?: StatusFilter
    q?: string
    page?: string
  }>
}

const PAGE_SIZE = 25

async function getInquiries(status: StatusFilter, query: string, page: number) {
  const offset = (page - 1) * PAGE_SIZE
  
  const conditions = []
  
  if (status !== 'all') {
    conditions.push(eq(inquiries.status, status))
  }
  
  if (query && query.length >= 2) {
    const pattern = `%${query}%`
    conditions.push(
      or(
        ilike(inquiries.fullName, pattern),
        ilike(inquiries.email, pattern),
        ilike(inquiries.company, pattern),
        ilike(inquiries.productName, pattern),
        ilike(inquiries.productBrand, pattern),
        ilike(inquiries.message, pattern)
      )!
    )
  }
  
  const whereClause = conditions.length > 0 
    ? conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)
    : undefined
  
  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(inquiries)
      .where(whereClause)
      .orderBy(desc(inquiries.submittedAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: count() })
      .from(inquiries)
      .where(whereClause),
  ])
  
  return {
    rows,
    total: totalRow[0]?.count ?? 0,
  }
}

async function getStatusCounts() {
  const result = await db
    .select({
      status: inquiries.status,
      count: count(),
    })
    .from(inquiries)
    .groupBy(inquiries.status)
  
  const counts: Record<StatusFilter, number> = {
    all: 0,
    new: 0,
    contacted: 0,
    closed: 0,
    spam: 0,
  }
  
  for (const row of result) {
    counts[row.status] = Number(row.count)
    counts.all += Number(row.count)
  }
  
  return counts
}

export default async function InquiriesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = (params.status ?? 'all') as StatusFilter
  const query = params.q ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  
  const [{ rows, total }, statusCounts] = await Promise.all([
    getInquiries(status, query, page),
    getStatusCounts(),
  ])
  
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  
  const statusTabs: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'closed', label: 'Closed' },
    { value: 'spam', label: 'Spam' },
  ]
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
          Inquiries
        </p>
        <h1 className="font-display text-3xl text-text-primary tracking-tight">
          Customer inquiries<span className="text-accent">.</span>
        </h1>
      </div>
      
      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        {/* Status tabs */}
        <nav className="flex items-center gap-1 bg-surface-elevated rounded-md p-1">
          {statusTabs.map((tab) => {
            const isActive = status === tab.value
            const queryStr = new URLSearchParams()
            if (tab.value !== 'all') queryStr.set('status', tab.value)
            if (query) queryStr.set('q', query)
            const href = '/admin/inquiries' + (queryStr.toString() ? `?${queryStr}` : '')
            
            return (
              <Link
                key={tab.value}
                href={href}
                className={
                  isActive
                    ? 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-body text-sm font-medium text-text-primary bg-surface-overlay'
                    : 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-body text-sm text-text-secondary hover:text-text-primary transition-colors'
                }
              >
                {tab.label}
                <span className="font-mono text-xs text-text-muted">
                  {statusCounts[tab.value]}
                </span>
              </Link>
            )
          })}
        </nav>
        
        {/* Search */}
        <form action="/admin/inquiries" method="GET" className="flex items-center gap-2">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <Input
            type="search"
            name="q"
            placeholder="Search name, email, product..."
            defaultValue={query}
            className="w-64"
          />
        </form>
      </div>
      
      {/* List */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <CircleDashed size={40} className="mx-auto text-text-muted mb-4" />
            <p className="font-body text-base text-text-secondary">
              {query
                ? `No inquiries match "${query}".`
                : status !== 'all'
                ? `No ${status} inquiries.`
                : 'No inquiries yet.'}
            </p>
            <p className="font-body text-sm text-text-muted mt-1">
              {query || status !== 'all'
                ? 'Try a different filter or search.'
                : 'Customer inquiries from the contact form will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-surface-overlay">
            {rows.map((inquiry) => (
              <InquiryListRow key={inquiry.id} inquiry={inquiry} />
            ))}
          </ul>
        </Card>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <nav 
          aria-label="Pagination"
          className="flex items-center justify-between"
        >
          <p className="font-body text-sm text-text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`/admin/inquiries?${new URLSearchParams({
                  ...(status !== 'all' && { status }),
                  ...(query && { q: query }),
                  page: String(page - 1),
                }).toString()}`}
                className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Previous
              </Link>
            )}
            <span className="font-mono text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/admin/inquiries?${new URLSearchParams({
                  ...(status !== 'all' && { status }),
                  ...(query && { q: query }),
                  page: String(page + 1),
                }).toString()}`}
                className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
```

================================================================
TASK 5 — INQUIRY LIST ROW COMPONENT
================================================================

Create src/components/admin/inquiries/InquiryListRow.tsx:

```tsx
import Link from 'next/link'
import type { Inquiry } from '@/db/schema'
import { Badge } from '@/components/admin/ui/Badge'

interface InquiryListRowProps {
  inquiry: Inquiry
}

const statusVariant = {
  new: 'accent' as const,
  contacted: 'success' as const,
  closed: 'neutral' as const,
  spam: 'error' as const,
}

const statusLabel = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
  spam: 'Spam',
}

export function InquiryListRow({ inquiry }: InquiryListRowProps) {
  return (
    <li>
      <Link 
        href={`/admin/inquiries/${inquiry.id}`}
        className="block px-6 py-4 hover:bg-surface-overlay/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <p className="font-body text-base font-medium text-text-primary truncate">
                {inquiry.fullName}
              </p>
              <Badge variant={statusVariant[inquiry.status]}>
                {statusLabel[inquiry.status]}
              </Badge>
            </div>
            <p className="font-body text-sm text-text-secondary truncate">
              {inquiry.email}
              {inquiry.company && (
                <span className="text-text-muted"> · {inquiry.company}</span>
              )}
            </p>
            <p className="font-body text-sm text-text-muted mt-1 truncate">
              About <span className="text-text-secondary">{inquiry.productName}</span>
            </p>
          </div>
          <time 
            dateTime={inquiry.submittedAt.toISOString()}
            className="font-mono text-xs text-text-muted whitespace-nowrap mt-1"
          >
            {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }).format(new Date(inquiry.submittedAt))}
          </time>
        </div>
      </Link>
    </li>
  )
}
```

================================================================
TASK 6 — INQUIRY DETAIL PAGE
================================================================

Create src/app/admin/inquiries/[inquiryId]/page.tsx:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db/client'
import { inquiries, inquiryStatusHistory, products } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/Card'
import { Badge } from '@/components/admin/ui/Badge'
import { InquiryStatusControl } from '@/components/admin/inquiries/InquiryStatusControl'
import { InquiryNotesEditor } from '@/components/admin/inquiries/InquiryNotesEditor'
import { ArrowLeft, ExternalLink, Mail, Phone, Building2, Clock } from 'lucide-react'

interface PageProps {
  params: Promise<{ inquiryId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { inquiryId } = await params
  const inquiry = await db
    .select({ fullName: inquiries.fullName, productName: inquiries.productName })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1)
    .then((rows) => rows[0])
  
  if (!inquiry) {
    return { title: 'Inquiry not found' }
  }
  
  return {
    title: `${inquiry.fullName} — Inquiries — Dtech Admin`,
    robots: { index: false, follow: false },
  }
}

const statusVariant = {
  new: 'accent' as const,
  contacted: 'success' as const,
  closed: 'neutral' as const,
  spam: 'error' as const,
}

export default async function InquiryDetailPage({ params }: PageProps) {
  const { inquiryId } = await params
  
  const inquiry = await db
    .select()
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1)
    .then((rows) => rows[0])
  
  if (!inquiry) notFound()
  
  // Fetch related product for the link to its public page
  const product = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, inquiry.productId))
    .limit(1)
    .then((rows) => rows[0])
  
  // Fetch status history
  const history = await db
    .select()
    .from(inquiryStatusHistory)
    .where(eq(inquiryStatusHistory.inquiryId, inquiryId))
    .orderBy(desc(inquiryStatusHistory.createdAt))
  
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link 
        href="/admin/inquiries"
        className="inline-flex items-center gap-2 font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        All inquiries
      </Link>
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Inquiry · {new Intl.DateTimeFormat('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(inquiry.submittedAt))}
          </p>
          <h1 className="font-display text-3xl text-text-primary tracking-tight">
            {inquiry.fullName}
          </h1>
        </div>
        <Badge variant={statusVariant[inquiry.status]}>
          {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
        </Badge>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content (left/middle, 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-text-muted" />
                <a 
                  href={`mailto:${inquiry.email}?subject=Re: Inquiry about ${inquiry.productName}`}
                  className="font-body text-sm text-text-primary hover:text-accent transition-colors"
                >
                  {inquiry.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-text-muted" />
                <a 
                  href={`tel:${inquiry.phone}`}
                  className="font-body text-sm text-text-primary hover:text-accent transition-colors"
                >
                  {inquiry.phone}
                </a>
              </div>
              {inquiry.company && (
                <div className="flex items-center gap-3">
                  <Building2 size={16} className="text-text-muted" />
                  <span className="font-body text-sm text-text-primary">
                    {inquiry.company}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Product context */}
          <Card>
            <CardHeader>
              <CardTitle>Product</CardTitle>
              <CardDescription>
                The product this inquiry is about.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-base text-text-primary">
                    {inquiry.productName}
                  </p>
                  <p className="font-body text-sm text-text-secondary mt-1">
                    {inquiry.productBrand}
                  </p>
                </div>
                {product && (
                  <Link
                    href={`/products/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    View product
                    <ExternalLink size={14} />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Message */}
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-base text-text-primary whitespace-pre-wrap leading-relaxed">
                {inquiry.message}
              </p>
            </CardContent>
          </Card>
          
          {/* Internal notes */}
          <Card>
            <CardHeader>
              <CardTitle>Internal notes</CardTitle>
              <CardDescription>
                Notes for the team. Not visible to the customer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InquiryNotesEditor 
                inquiryId={inquiry.id} 
                initialNotes={inquiry.notes ?? ''} 
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar (right, 1 col) */}
        <div className="space-y-6">
          {/* Status control */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <InquiryStatusControl 
                inquiryId={inquiry.id} 
                currentStatus={inquiry.status} 
              />
            </CardContent>
          </Card>
          
          {/* Activity history */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {history.length === 0 ? (
                <p className="px-6 py-4 font-body text-sm text-text-muted">
                  No activity yet.
                </p>
              ) : (
                <ul className="divide-y divide-surface-overlay">
                  {history.map((h) => (
                    <li key={h.id} className="px-6 py-3">
                      <div className="flex items-start gap-2">
                        <Clock size={12} className="text-text-muted mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-text-primary">
                            {h.fromStatus 
                              ? `${h.fromStatus} → ${h.toStatus}` 
                              : `Created as ${h.toStatus}`}
                          </p>
                          <p className="font-mono text-xs text-text-muted mt-0.5">
                            {h.changedByEmail ?? 'system'} · {new Intl.DateTimeFormat('en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }).format(new Date(h.createdAt))}
                          </p>
                          {h.note && (
                            <p className="font-body text-sm text-text-secondary mt-1">
                              {h.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

================================================================
TASK 7 — STATUS CONTROL (SEGMENTED)
================================================================

Create src/components/admin/inquiries/InquiryStatusControl.tsx:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateInquiryStatus } from '@/server/admin-inquiry-actions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface InquiryStatusControlProps {
  inquiryId: string
  currentStatus: 'new' | 'contacted' | 'closed' | 'spam'
}

const statuses = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
] as const

export function InquiryStatusControl({ 
  inquiryId, 
  currentStatus,
}: InquiryStatusControlProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isPending, startTransition] = useTransition()
  
  function handleChange(newStatus: typeof status) {
    if (newStatus === status) return
    
    const previous = status
    setStatus(newStatus)  // optimistic
    
    startTransition(async () => {
      const result = await updateInquiryStatus(inquiryId, newStatus)
      
      if (!result.ok) {
        setStatus(previous)  // revert
        toast.error('error' in result ? result.error : 'Failed to update status')
        return
      }
      
      toast.success(`Marked as ${newStatus}`)
    })
  }
  
  return (
    <div role="radiogroup" aria-label="Inquiry status" className="space-y-2">
      {statuses.map((s) => (
        <button
          key={s.value}
          type="button"
          role="radio"
          aria-checked={status === s.value}
          disabled={isPending}
          onClick={() => handleChange(s.value)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2.5 rounded-md font-body text-sm transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            status === s.value
              ? 'bg-surface-overlay text-text-primary ring-1 ring-accent'
              : 'bg-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
          )}
        >
          <span>{s.label}</span>
          {status === s.value && (
            <span className="font-mono text-xs text-accent uppercase tracking-wider">
              Current
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
```

================================================================
TASK 8 — NOTES EDITOR (AUTOSAVE)
================================================================

Create src/components/admin/inquiries/InquiryNotesEditor.tsx:

```tsx
'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { Textarea } from '@/components/admin/ui/Textarea'
import { updateInquiryNotes } from '@/server/admin-inquiry-actions'
import { toast } from '@/lib/toast'

interface InquiryNotesEditorProps {
  inquiryId: string
  initialNotes: string
}

export function InquiryNotesEditor({ 
  inquiryId, 
  initialNotes,
}: InquiryNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [isPending, startTransition] = useTransition()
  const [lastSaved, setLastSaved] = useState<string>(initialNotes)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Debounced save (2.5s after last keystroke)
  useEffect(() => {
    if (notes === lastSaved) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await updateInquiryNotes(inquiryId, notes)
        if (result.ok) {
          setLastSaved(notes)
        } else {
          toast.error('Failed to save notes')
        }
      })
    }, 2500)
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [notes, lastSaved, inquiryId])
  
  // Save immediately on blur
  function handleBlur() {
    if (notes === lastSaved) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    startTransition(async () => {
      const result = await updateInquiryNotes(inquiryId, notes)
      if (result.ok) {
        setLastSaved(notes)
        toast.success('Notes saved')
      } else {
        toast.error('Failed to save notes')
      }
    })
  }
  
  const isDirty = notes !== lastSaved
  
  return (
    <div className="space-y-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        rows={6}
        placeholder="Add internal notes — visible only to the team..."
        maxLength={5000}
      />
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-text-muted">
          {notes.length} / 5000
        </p>
        <p className="font-mono text-xs text-text-muted">
          {isPending 
            ? 'Saving...' 
            : isDirty 
            ? 'Unsaved changes' 
            : initialNotes || lastSaved 
            ? 'Saved' 
            : ''}
        </p>
      </div>
    </div>
  )
}
```

================================================================
TASK 9 — UPDATE DASHBOARD RECENT INQUIRIES
================================================================

Open src/app/admin/page.tsx (the dashboard). Find the recent 
inquiries list. Replace its inline rendering with the new 
InquiryListRow component for consistency:

Find this section in the existing dashboard:

```tsx
<ul className="divide-y divide-surface-overlay">
  {data.recentInquiries.map((inquiry) => (
    <li key={inquiry.id} className="px-6 py-4 ...">
      {/* inline rendering of inquiry */}
    </li>
  ))}
</ul>
```

Replace with:

```tsx
<ul className="divide-y divide-surface-overlay">
  {data.recentInquiries.map((inquiry) => (
    <InquiryListRow key={inquiry.id} inquiry={inquiry} />
  ))}
</ul>
```

Add the import at the top:

```tsx
import { InquiryListRow } from '@/components/admin/inquiries/InquiryListRow'
```

This ensures dashboard and full list view show identical inquiry 
representations.

================================================================
TASK 10 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Test admin inquiry routes (these all redirect to /login without 
session — that's expected):

  $adminRoutes = @(
    '/admin',
    '/admin/inquiries',
    '/admin/inquiries?status=new',
    '/admin/inquiries?q=test',
    '/admin/inquiries?status=contacted&page=2'
  )
  foreach ($r in $adminRoutes) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
      Write-Host "Status: $($res.StatusCode) $r"
    } catch {
      Write-Host "Redirect 307 $r"
    }
  }

Regression check on customer-facing routes:

  $existing = @('/', '/brands', '/categories', '/products/hp-omen-16-i9-rtx-4070', '/inquiry/sent')
  foreach ($r in $existing) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch {
      Write-Host "ERROR $r"
    }
  }

All should return 200.

Database verification — confirm new column and table:

Use db:studio briefly or check via psql equivalent. Look for:
- inquiries.contacted_at column
- inquiry_status_history table with all expected columns

Stop dev:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 11 — COMMIT
================================================================

git add .
git commit -m "feat: phase 7b — inquiry management

SCHEMA:
- inquiries.contacted_at — timestamp, set when status moves to 
  'contacted'
- inquiry_status_history table — append-only audit trail of every 
  status change with actor, timestamp, optional note
- Indexes: isq_inquiry_id_idx, isq_created_at_idx for efficient 
  history queries

SERVER ACTIONS (src/server/admin-inquiry-actions.ts):
- updateInquiryStatus — atomic status change + history insert + 
  optimistic contactedAt set
- updateInquiryNotes — debounced text update, 5000-char cap
- Both verify session before mutating; throw if unauthorized
- revalidatePath calls to refresh affected views

INQUIRY LIST (/admin/inquiries):
- Status filter tabs with live counts (all / new / contacted / 
  closed / spam)
- Search across name, email, company, product name, brand, message
- Pagination (25 per page)
- Empty state with context-aware messaging
- Sortable by submittedAt desc

INQUIRY DETAIL (/admin/inquiries/[inquiryId]):
- 3-column layout: customer + product + message + notes (main), 
  status + activity log (sidebar)
- Customer info with mailto/tel links
- Product link to public page (opens new tab)
- Internal notes editor with debounced autosave (2.5s) + save on 
  blur + character counter
- Status control (segmented radio group) with optimistic UI, 
  toast feedback, revert on failure
- Activity feed showing all status changes with actor + timestamp 
  + optional notes

COMPONENTS:
- InquiryListRow — shared between dashboard and full list view
- InquiryStatusControl — segmented radio with optimistic updates
- InquiryNotesEditor — debounced autosave with dirty-state indicator

DASHBOARD UPDATE:
- Recent inquiries section now uses InquiryListRow for consistency

OUT OF SCOPE (Phase 7c+):
- Email notifications to staff on new inquiry (Phase 9)
- Bulk operations (Phase 7g)
- CSV export (defer)
- Real-time updates (defer)
- Staff assignment (defer; use notes informally)"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] inquiries.contacted_at column exists
- [ ] inquiry_status_history table exists with indexes
- [ ] /admin/inquiries renders list view (when authenticated)
- [ ] Filter tabs work (status query param)
- [ ] Search works (q query param, min 2 chars)
- [ ] Pagination works (page query param)
- [ ] /admin/inquiries/[id] renders detail view
- [ ] Status changes persist + log to history
- [ ] Notes autosave (verify by editing then refreshing)
- [ ] Toast notifications fire on status/notes updates
- [ ] Dashboard recent inquiries use InquiryListRow
- [ ] Existing routes still return 200 (regression)
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + summary)
2. Files modified (count + summary)
3. Build verification outputs
4. Smoke test results (admin routes + regression)
5. Database state confirmation
6. Any deviations from spec
7. Final commit hash

================================================================
DO NOT
================================================================

- Build product CRUD (Phase 7c)
- Build brand/category/user management (Phase 7e)
- Add email notifications (Phase 9)
- Add real-time updates / websockets
- Add bulk operations
- Add CSV export/import (Phase 7f)
- Modify the inquiry form on the customer side
- Modify customer-facing routes
- Modify auth flow
- Modify v2 brand spec
- Touch /motion or (dev) routes
- Install new dependencies

================================================================
FAILURE MODES TO WATCH
================================================================

- If Drizzle's ilike isn't recognized: confirm the import path is 
  'drizzle-orm' (not 'drizzle-orm/expressions' or other subpath). 
  ilike is exported from the main package.

- If the combined where clause produces wrong SQL: use 'and' from 
  drizzle-orm to compose conditions explicitly rather than reducing 
  with sql template. Pattern:
    `and(...conditions)` from drizzle-orm.
  Replace the `conditions.reduce(...)` with `and(...conditions)`.

- If `revalidatePath('/admin/inquiries/[inquiryId]')` doesn't work: 
  Next 16 may require the literal route segment, not the dynamic 
  bracket form. Use `revalidatePath(\`/admin/inquiries/${inquiryId}\`)` 
  with the actual ID instead.

- If autosave fires too aggressively (every keystroke): the 
  setTimeout debounce should prevent this. Confirm timeoutRef is 
  cleared before setting a new timeout. Verify in dev tools network 
  tab — only one save should fire 2.5s after typing stops.

- If toast doesn't appear: confirm Toaster from sonner is mounted 
  in admin layout (Phase 7a did this). If using toast outside admin 
  layout, mount a Toaster elsewhere.

- If status changes are slow (>1s): the .catch in getSessionUser 
  may be silently re-fetching. Confirm one db round trip per action.

- If history rows don't appear: confirm the .insert() in 
  updateInquiryStatus runs successfully. Wrap in transaction if 
  atomicity becomes a concern (single insert + single update is 
  fine without).

- If optimistic UI flickers: use useTransition correctly. The state 
  setter (setStatus) runs synchronously; the server call runs inside 
  startTransition. Don't await inside startTransition's callback at 
  top level — it's already async-aware.

- If filter tab counts show stale data: revalidatePath('/admin/inquiries') 
  should refresh them. If still stale, check that getStatusCounts 
  runs on every render (it should — it's in the page Server 
  Component, not cached).

- If query param URLSearchParams encoding is wrong: use new URLSearchParams() 
  consistently. Build query string before constructing href, don't 
  concat manually.

- If Date objects fail to serialize: inquiry.submittedAt is a Date 
  from Drizzle. When passing from Server Component to Client 
  Component, it must be serializable. Convert to ISO string at the 
  boundary if needed: pass inquiry.submittedAt.toISOString() and 
  parse on client side. (Not needed for InquiryListRow since it's 
  rendered server-side.)