# Dtech Showroom — Real Engagement Roadmap & Architectural Decisions

> Status: **LOCKED**
> Framing: Active client engagement with Dtech Algérie (real catalog, real users, real launch)
> Created: Phase 5b completion checkpoint
> Replaces / extends: pitch-demo framing from earlier sessions

---

## Project Framing Update

This is no longer a speculative pitch piece. Dtech Algérie has engaged 
the developer to build their next-generation website. Implications:

- Real customers will use the public-facing catalog
- Dtech's employees will use the admin tool daily
- The site will replace or sit alongside d-techalgerie.com on their 
  own hosting and domain
- Quality bar is "production-real," not "demo-grade"
- All AI-generated brand imagery must be replaced with real 
  manufacturer or Dtech-provided imagery before launch
- Internationalization (FR + EN at launch) is mandatory, not deferred

---

## Locked Architectural Decisions

### Decision 1: Translation Storage — Column Strategy

**Chosen:** Option A — `_fr` columns on existing tables.

Affected tables: `products`, `brands`, `categories`.

Columns to add (Phase 8):
- `products.name_fr`, `products.tagline_fr`, `products.description_fr`, 
  `products.card_spec_fr`, `products.search_keywords_fr`
- `brands.name_fr` (likely same in both languages), `brands.statement_fr`, 
  `brands.description_fr`
- `categories.name_fr`, `categories.description_fr`

The `slug` column stays single-value (URL slugs are language-neutral 
or English-primary; FR URLs use the same slug under `/fr/...`).

**Migration path to Arabic later:** add `_ar` columns to the same 
tables. Simple Drizzle migration. No data restructuring.

**Trade-off accepted:** schema grows linearly with each language. 
At 2 languages this is acceptable. At 5+ we'd refactor to a 
translations table.

### Decision 2: Image Storage — Cloudflare R2

**Chosen:** Cloudflare R2 (S3-compatible object storage).

**Rationale:**
- Zero egress fees — significant savings at scale
- $0.015/GB stored vs Vercel Blob's $0.15/GB
- S3-compatible API works with standard SDKs
- Independent of Vercel — works on any host Dtech uses

**Setup tasks (Phase 7d):**
- Cloudflare account → R2 bucket creation
- API token with R2 read/write permissions
- Public bucket with CDN URL OR private bucket with signed URLs
  - Recommendation: **public bucket** for product imagery (no privacy 
    requirement), simpler URLs, browser-cacheable
- Configure CORS for direct browser uploads (if using presigned URL pattern)
- Add R2 environment variables to .env.example:
  ```
  R2_ACCOUNT_ID=
  R2_ACCESS_KEY_ID=
  R2_SECRET_ACCESS_KEY=
  R2_BUCKET_NAME=
  R2_PUBLIC_URL=https://[account].r2.dev or custom CDN domain
  ```

**Image processing pipeline (server-side on upload):**
1. Admin uploads original image
2. Server action receives the file
3. Uses `sharp` library to generate:
   - AVIF version (quality 60)
   - WebP version (quality 82)
   - Card variant (800×600 4:3)
   - Hero variant (2400×1350 16:9)
   - Carousel variants (1600×1200)
4. Upload all variants to R2
5. Database stores R2 public URLs (or path keys + base URL)

**Bundle impact:** `@aws-sdk/client-s3` is heavy (~80KB), but only 
runs server-side, so zero client bundle impact. `sharp` is native 
and Vercel-deployable.

### Decision 3: Authentication — Email + Password via Better Auth

**Chosen:** Email + password, with proper hashing and rate limiting.

**Components:**
- **Library:** `better-auth` (modern, type-safe, Next.js App Router-native)
- **Hashing:** bcrypt (Better Auth handles internally)
- **Email delivery:** Resend ($0/mo for 100 emails/day, scales to 
  $20/mo for 50k emails/month — sufficient for staff auth + 
  password resets + inquiry notifications)
- **Rate limiting:** Upstash Redis (already configured from Phase 4b) 
  — login attempts capped at 5 per IP per 15 minutes
- **Breach checking:** Optional — Better Auth supports HaveIBeenPwned 
  password check on signup
- **Session management:** Better Auth's built-in session table, 
  Drizzle adapter
- **Password reset flow:** Email magic link → reset page → new password

**User roles (database):**

```typescript
// New table to add in Phase 6
export const userRoleEnum = pgEnum('user_role', ['admin', 'staff'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('staff'),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
})

// Better Auth requires sessions table too — handled by its adapter
```

**Initial admin user:**
Created via seed script. Dtech provides their primary admin email + 
initial password (changeable on first login).

**Access control:**
- `admin` role: full access to all admin features
- `staff` role: can manage products, inquiries, but NOT user 
  management or destructive operations (no delete, no role changes)
- Middleware protects `/admin/*` routes — redirects to `/login` 
  if no session
- Server actions verify session + role before mutations

---

## Revised End-State Roadmap

### Phase 5 — Customer-Facing Site Finalization

| Sub-phase | What | Status |
|---|---|---|
| 5a | Asset integration | ✅ Done |
| 5b | Shader hero | ✅ Done |
| 5c | Scroll choreography | ⏳ Next (prompt ready) |
| 5d | Real manufacturer photography sourcing | ⏳ Your manual work |
| 5e | Replace AI-generated brand heroes | ⏳ When Dtech provides real imagery |

**Calendar time:** 1 week (5c is 60 min, photography 10-15 hrs, brand 
heroes 2 hrs once you have real source material from Dtech).

### Phase 6 — Authentication

| What | Notes |
|---|---|
| Install `better-auth`, `bcrypt` types | Better Auth includes everything else |
| Drizzle migration: add `users` + `sessions` tables | New columns, no breaking changes |
| Better Auth Next.js handler routes | `/api/auth/[...slug]` |
| Login page (`/login`) | Email + password form, error states, "forgot password" link |
| Password reset flow | Email-based, time-limited token |
| Middleware protecting `/admin/*` | Redirect to `/login` if no session |
| Sign-out flow | Button in admin header |
| Resend setup | API key, sender domain verification |
| Initial admin seed | Create first admin user from env vars |

**Time:** 1 Claude Code session, ~90 min.

### Phase 7 — Admin Tool

Major work. Multiple sessions.

**7a — Admin Shell & Navigation**
- Admin layout (`/admin/layout.tsx`)
- Sidebar nav: Dashboard, Inquiries, Products, Brands, Categories, Users (admin only)
- Header with user menu (logout, profile)
- Dark theme matching brand spec but optimized for long-session work
- Breadcrumb nav
- Toast notification system (sonner library, ~5KB)

**7b — Inquiry Management**
- List view: filter by status, search, sort by date
- Detail view: full inquiry text, product context, customer info
- Status update: new → contacted → closed (with audit trail)
- Notes field for internal communication
- Assign-to-staff feature
- Email customer button (opens default mail client with pre-filled subject)

**7c — Product Management**
- List view: filter by brand/category/tier, search, bulk select
- Create/edit form: 
  - Basic info (name, slug, tagline, description, specs)
  - **Bilingual fields** (FR + EN side-by-side)
  - Tier assignment (hero/featured/longtail)
  - Brand + category selection
  - Featured toggle
  - Sort order
  - SEO fields
- Delete (soft delete with restore)
- Reorder via drag-and-drop within brand or category

**7d — Image Upload**
- R2 integration (server action)
- Drag-drop multi-file upload
- Progress states per file
- Server-side AVIF/WebP conversion via sharp
- Automatic variant generation (card, hero, carousel)
- Reorder uploaded images
- Delete with confirmation
- Preview gallery

**7e — Brand & Category Management**
- Same CRUD pattern as products
- Simpler forms (fewer fields)
- Brand logo upload
- Bilingual fields

**7f — CSV Import (Bulk Operations)**
- Upload CSV of products (manufacturer specs in standard format)
- Preview parsed data before commit
- Map columns to schema fields
- Validation errors surfaced inline
- Bulk insert with transaction rollback on partial failure

**7g — Admin Polish**
- Keyboard shortcuts (cmd+K for search, etc.)
- Optimistic updates (UI changes before server confirms)
- Real-time validation
- Empty states with helpful CTAs
- Error recovery (retry buttons)
- Auto-save drafts on long forms

**Total Phase 7 time:** ~10-15 hours of code work spread over 1-2 weeks.

### Phase 8 — Internationalization (English + French)

| What | Notes |
|---|---|
| Install `next-intl` | Industry standard for Next.js App Router |
| Restructure routes to `[locale]` | `src/app/[locale]/...` |
| Locale-aware layouts | Different fonts may apply per language |
| Translation files | `messages/en.json`, `messages/fr.json` |
| Translate all visible strings | You + Dtech provide FR translations |
| Database migrations | Add `_fr` columns per Decision 1 |
| Admin UI: bilingual editor | Side-by-side EN/FR field pairs |
| Locale switcher in nav | EN | FR toggle, preserves current path |
| hreflang tags in metadata | `<link rel="alternate" hreflang="fr">` |
| Per-locale OG images | Update OG image generators |
| Per-locale sitemaps | Two sitemaps, properly hreflanged |
| `robots.txt` updates | Allow both locales |

**Time:** 2-3 Claude Code sessions + translation work. Translation 
can run in parallel — if Dtech translates, code goes faster.

### Phase 9 — Production Infrastructure

| What | Notes |
|---|---|
| Coordinate with Dtech's host | Confirm Node.js support, database options, env var management |
| Domain configuration | DNS pointed to chosen host, SSL provisioning |
| Email service (Resend) | Sender domain verification, DKIM/SPF/DMARC |
| `NEXT_PUBLIC_SITE_URL` finalized | Real domain |
| Google Analytics 4 setup | If Dtech wants it |
| Cloudflare R2 bucket | Production credentials |
| Database migration pipeline | Drizzle migrations (not push) in production |
| Backup verification | Confirm host's backup policy is acceptable |
| Inquiry email notifications | Resend sends inquiry submissions to Dtech's real address |

**Time:** 1-2 sessions + coordination with Dtech's hosting provider.

### Phase 10 — Launch Preparation & Cutover

| What | Notes |
|---|---|
| 301 redirects from old URLs | Preserve SEO from d-techalgerie.com |
| Final Lighthouse audit | Target 90+ on every metric |
| Cross-browser testing | Chrome, Safari, Firefox, Edge |
| Mobile device testing | Real iPhone, real Android |
| User acceptance testing | Dtech employees use admin tool, find issues |
| Final asset audit | Every SKU has proper imagery |
| Documentation | User guide for Dtech employees, technical handover docs |
| Pre-launch cleanup | Remove `/motion` (dev route), audit security |
| Soft launch | Real domain live with limited promotion |
| Full launch | Promote to Dtech's customer base |

**Time:** 1-2 weeks of testing, iteration, coordination.

---

## Total Calendar Time Estimate

| Phase | Estimated Calendar Time |
|---|---|
| 5c | Same day |
| 5d photography | 1-2 days of focused manual work |
| 5e brand heroes | 1 day once assets available |
| 6 auth | 1-2 days |
| 7 admin tool | 2-3 weeks |
| 8 i18n | 1-2 weeks |
| 9 infrastructure | 1 week (mostly coordination) |
| 10 launch | 1-2 weeks |

**Total: ~6-10 weeks** of calendar time at a sustainable pace.

Could be compressed to 4-6 weeks at intense pace, or stretched to 
3-4 months at a comfortable pace. No firm deadline gives us 
flexibility.

---

## Updated Project Knowledge Set

After locking these decisions, the following project knowledge files 
are now in effect:

1. **00-project-index.md** (existing) — skill system navigation
2. **00-prompt-templates.md** (existing) — reusable prompts
3. **01-prompt-architect.md** through **08-claude-code-conductor.md** 
   (existing) — skill definitions
4. **01-information-architecture.md** (existing) — route surface 
   and page taxonomy
5. **brand-spec-v2** (existing, in conversation history) — visual + 
   motion language
6. **This document** — real-engagement roadmap and architectural 
   decisions

Optionally, save the prompt files as project knowledge too:
- **phase-4b-prompt.md** — production hardening (already executed)
- **phase-5a-prompt.md** — asset integration (already executed)
- **phase-5b-prompt.md** — shader hero (already executed)
- **phase-5c-scroll-choreography-prompt.md** — next session
- **phase-6-auth-prompt.md** — future session (to be generated)
- **phase-7a-admin-shell-prompt.md** — future session
- (etc.)

Each phase prompt becomes a downloadable, archival record of what 
was built and how.

---

## What Stays Locked

Don't relitigate these going forward:

- v2 brand spec essence: Quiet. Considered. Inevitable.
- Stack: Next.js 16.2.6, React 19, TypeScript strict, Tailwind v4, 
  Drizzle + postgres.js, Neon Postgres
- Route surface from IA document (with `[locale]` prefix added in Phase 8)
- Folder structure
- Performance budgets (Core Web Vitals targets)
- Path Z (no 3D in launch scope; potential post-launch enhancement)
- Path D (cinematic showroom catalog, inquiry-only commercial)
- Translation strategy (columns on existing tables)
- Storage (Cloudflare R2)
- Auth (email + password via Better Auth)

---

## What's Open

Pending decisions, to be made when each phase begins:

- Specific design language for admin tool (still v2 brand-aligned, 
  but optimized for long-session work)
- Exact Dtech employee user list (created at Phase 6 seed)
- CSV import format (will define based on manufacturer's typical 
  export formats in Phase 7f)
- Specific Dtech hosting provider details (coordinate during Phase 9)
- Launch date (TBD with Dtech)

---

**This roadmap is LOCKED. Phase 5c next. Execute.**
