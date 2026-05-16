You are executing Phase 4b — Gap Closure & Production Readiness for 
the Dtech Showroom project. Read this entire prompt before doing 
anything.

Plan internally with TodoWrite. Verify at checkpoints. Do not skip 
steps. This is a hardening pass, not a feature pass — every change 
must be defensible against the v2 brand spec and the existing code.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 2-4a complete: full route surface live, all 21 routes 
  returning 200 against real seed data (5 brands, 6 categories, 30 
  products)
- v2 brand spec is the source of truth for all design and structural 
  decisions
- Path D — cinematic 3D showroom catalog, inquiry-only commercial 
  layer
- Database is live on Neon, seeded with realistic catalog data

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Take the project from structurally complete to production-deployable. 
Add error boundaries and loading states for every route, generate 
sitemap.xml and robots.txt, scaffold OG image generation, add rate 
limiting and honeypot to the inquiry form, configure image 
optimization in next.config, scaffold Vercel Analytics and Speed 
Insights, run an accessibility audit pass on existing components, 
tighten cache and security headers, add 404 polish, and produce a 
deployment checklist for Vercel. After this lands, the site can ship 
to a real domain.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Real product imagery beyond what already exists in /public/images/
- 3D scene implementation (Phase 5+)
- Real motion choreography beyond fadeRise on Section
- Admin authentication (TODO comment is acceptable for Phase 1)
- Email notification on inquiry submission (DB write only, email is 
  Phase 5+)
- Internationalization (English only)
- Light mode (dark only)
- Real analytics dashboard integration (just scaffold the calls)
- Cloudflare R2 asset migration (Vercel-hosted assets fine for now)
- Database backup automation (Neon handles point-in-time recovery on 
  paid plans; document only)
- Real Turnstile / hCaptcha integration (use honeypot + rate limit 
  only; document Turnstile as Phase 2+ addition)

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Install required dependencies
  2. Error boundaries (error.tsx files)
  3. Loading states (loading.tsx files)
  4. 404 polish (already exists, refine)
  5. Sitemap generation
  6. Robots.txt
  7. OG image generation
  8. Inquiry form hardening (rate limit + honeypot)
  9. next.config.ts hardening (image optimization, headers)
  10. Vercel Analytics + Speed Insights
  11. Accessibility audit pass
  12. Deployment checklist documentation
  13. Verification (lint, tsc, build, smoke tests)
  14. Commit

Mark in_progress when working, completed when verified. Run tsc 
checkpoints after every 3 tasks.

================================================================
TASK 1 — INSTALL REQUIRED DEPENDENCIES
================================================================

Install the following. Justify each in commit message:

  pnpm add @vercel/analytics @vercel/speed-insights @upstash/ratelimit @upstash/redis

Rationale:
- @vercel/analytics — Vercel-native page analytics. Zero-config, free 
  tier covers Phase 1 traffic.
- @vercel/speed-insights — Vercel-native Core Web Vitals tracking. 
  Pairs with Analytics.
- @upstash/ratelimit + @upstash/redis — serverless rate limiting via 
  Upstash Redis HTTP. Free tier supports 10k requests/day, which 
  covers inquiry form rate limiting comfortably.

If any of these are already installed (check package.json first), 
skip that install.

================================================================
TASK 2 — ERROR BOUNDARIES (error.tsx FILES)
================================================================

Next.js App Router uses error.tsx files for route-segment-level error 
boundaries. Without these, an unhandled error renders the default 
Next.js error page, which is off-brand and unhelpful.

Create the following error.tsx files. Each is 'use client' (required 
by Next.js for error boundaries) and follows the brand spec voice.

  src/app/error.tsx — root error boundary (catches anything 
                      uncaught by segment-level boundaries)
  src/app/(marketing)/error.tsx — marketing route group (if route 
                                  group exists; if not, skip)
  src/app/products/[productSlug]/error.tsx — product detail error
  src/app/brands/[brandSlug]/error.tsx — brand landing error
  src/app/categories/[categorySlug]/error.tsx — category landing error
  src/app/search/error.tsx — search error
  src/app/inquiry/[productSlug]/error.tsx — inquiry form error

Pattern for each (vary the copy per context):

  'use client'
  
  import { useEffect } from 'react'
  import Link from 'next/link'
  
  export default function Error({
    error,
    reset,
  }: {
    error: Error & { digest?: string }
    reset: () => void
  }) {
    useEffect(() => {
      // In production this would go to error tracking (Sentry, etc.)
      console.error(error)
    }, [error])
  
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-surface-base px-8 py-16">
        <div className="max-w-xl space-y-6 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Something went wrong
          </p>
          <h1 className="font-display text-5xl tracking-tight text-text-primary">
            We hit a wall<span className="text-accent">.</span>
          </h1>
          <p className="font-body text-lg text-text-secondary">
            [Context-specific copy — see per-route variants below]
          </p>
          <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 transition-colors hover:decoration-accent"
            >
              Try again
            </button>
            <Link
              href="/"
              className="font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 transition-colors hover:decoration-accent"
            >
              Return to the catalog <span className="text-accent">→</span>
            </Link>
          </div>
        </div>
      </main>
    )
  }

Per-route copy variants:

  - Root error.tsx: "Something went wrong loading this page. The catalog is still here — try again or return home."
  - Product detail error: "This product page didn't load correctly. The product still exists in the catalog — try again."
  - Brand landing error: "This brand page didn't load correctly. Try again or browse all brands."
  - Category landing error: "This category page didn't load correctly. Try again or browse all categories."
  - Search error: "The search didn't run correctly. Try a different query or browse the catalog directly."
  - Inquiry form error: "The inquiry page didn't load correctly. You can also email contact@d-techalgerie.com directly."

For each error variant, adjust the "Return to" link target appropriately 
(e.g., the brand error returns to /brands, not /).

================================================================
TASK 3 — LOADING STATES (loading.tsx FILES)
================================================================

App Router uses loading.tsx for streaming Suspense boundaries while 
server data fetches. Without these, the page blanks until ready.

Create loading.tsx for routes with database queries:

  src/app/products/[productSlug]/loading.tsx
  src/app/brands/[brandSlug]/loading.tsx
  src/app/categories/[categorySlug]/loading.tsx
  src/app/search/loading.tsx
  src/app/admin/inquiries/loading.tsx

Per v2 brand spec §9.8: loading is silent and minimal. NO spinners, 
NO shimmer effects, NO "Loading..." copy. Use static skeleton 
placeholders in surface-elevated, OR a single hairline progress bar.

Pattern — minimal skeleton for product detail:

  export default function Loading() {
    return (
      <main className="min-h-screen bg-surface-base">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 lg:px-16">
          {/* Breadcrumb placeholder */}
          <div className="h-4 w-64 rounded bg-surface-elevated" />
          
          {/* Stage placeholder */}
          <div className="mt-8 aspect-[4/3] w-full rounded-md bg-surface-elevated md:aspect-video" />
          
          {/* Title placeholder */}
          <div className="mt-12 space-y-3">
            <div className="h-12 w-3/4 rounded bg-surface-elevated" />
            <div className="h-6 w-1/2 rounded bg-surface-elevated" />
          </div>
          
          {/* Body placeholder */}
          <div className="mt-8 space-y-2">
            <div className="h-4 w-full rounded bg-surface-elevated" />
            <div className="h-4 w-full rounded bg-surface-elevated" />
            <div className="h-4 w-2/3 rounded bg-surface-elevated" />
          </div>
        </div>
      </main>
    )
  }

For grid pages (brand landing, category landing, search):

  - Breadcrumb placeholder bar
  - Hero placeholder block
  - 8 card-shaped placeholders in a responsive grid matching ProductGrid layout
  - All in surface-elevated, NO animation

For admin/inquiries/loading.tsx: simple table-row skeletons.

NO shimmer. NO pulse. NO animation. Per spec, static is correct.

================================================================
TASK 4 — 404 POLISH
================================================================

The src/app/not-found.tsx file exists from Phase 2-4a. Verify it 
matches v2 spec §9.10 exactly:

  - Background: bg-surface-base
  - Centered vertically and horizontally
  - Display text-7xl "404" with accent period span
  - text-xl text-secondary "This page isn't in the catalog."
  - InquiryButton-styled link "Return to the floor →" → /

If the current not-found.tsx deviates from this, refactor it to match. 
Use the InquiryButton component (already exists) rather than rolling 
the link inline.

Also create src/app/global-error.tsx for catastrophic root-layout 
errors (which error.tsx files can't catch). Per Next.js docs, this 
file must render its own <html> and <body> tags:

  'use client'
  
  export default function GlobalError({
    error,
    reset,
  }: {
    error: Error & { digest?: string }
    reset: () => void
  }) {
    return (
      <html lang="en">
        <body style={{ 
          margin: 0, 
          padding: '4rem 2rem', 
          fontFamily: 'system-ui, sans-serif', 
          background: '#0a0a0d',
          color: '#f5f5f3',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ maxWidth: '36rem', textAlign: 'center' }}>
            <p style={{ 
              fontFamily: 'ui-monospace, monospace', 
              fontSize: '0.75rem', 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em',
              opacity: 0.6,
              marginBottom: '0.5rem',
            }}>
              Critical error
            </p>
            <h1 style={{ 
              fontSize: '3rem', 
              fontWeight: 500, 
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
            }}>
              The site couldn't load<span style={{ color: '#3ec5e0' }}>.</span>
            </h1>
            <p style={{ 
              fontSize: '1.125rem', 
              opacity: 0.78,
              marginBottom: '2rem',
            }}>
              Something fundamental went wrong. Try reloading; if it persists, 
              email contact@d-techalgerie.com.
            </p>
            <button onClick={reset} style={{
              background: 'transparent',
              border: '1px solid rgba(245, 245, 243, 0.4)',
              color: '#f5f5f3',
              padding: '0.75rem 1.5rem',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}>
              Try again
            </button>
          </div>
        </body>
      </html>
    )
  }

This uses inline styles because Tailwind classes won't apply at the 
global-error level (it renders outside the layout that loads CSS). 
Inline styles are the documented pattern for this file.

================================================================
TASK 5 — SITEMAP GENERATION
================================================================

Create src/app/sitemap.ts. This is Next.js's File-Based Metadata 
convention — Next auto-generates /sitemap.xml from this file.

  import type { MetadataRoute } from 'next'
  import { db } from '@/db/client'
  import { brands, categories, products } from '@/db/schema'
  
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dtech-showroom.vercel.app'
  
  export const revalidate = 3600 // regenerate hourly
  
  export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [allBrands, allCategories, allProducts] = await Promise.all([
      db.select().from(brands),
      db.select().from(categories),
      db.select().from(products),
    ])
  
    const now = new Date()
  
    const staticRoutes: MetadataRoute.Sitemap = [
      { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
      { url: `${BASE_URL}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
      { url: `${BASE_URL}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
      { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
      { url: `${BASE_URL}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    ]
  
    const brandRoutes: MetadataRoute.Sitemap = allBrands.map((brand) => ({
      url: `${BASE_URL}/brands/${brand.slug}`,
      lastModified: brand.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
  
    const categoryRoutes: MetadataRoute.Sitemap = allCategories.map((cat) => ({
      url: `${BASE_URL}/categories/${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
  
    const productRoutes: MetadataRoute.Sitemap = allProducts.map((product) => ({
      url: `${BASE_URL}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))
  
    return [
      ...staticRoutes,
      ...brandRoutes,
      ...categoryRoutes,
      ...productRoutes,
    ]
  }

Add NEXT_PUBLIC_SITE_URL to .env.example with a placeholder.

Exclude from sitemap (do NOT add):
  - /admin, /admin/inquiries (not for search engines)
  - /inquiry/[productSlug] (dynamic per-product, not crawlable)
  - /inquiry/sent (terminal page)
  - /motion (dev page, will be removed before pitch)
  - /not-found (handled by 404 logic)

================================================================
TASK 6 — ROBOTS.TXT
================================================================

Create src/app/robots.ts:

  import type { MetadataRoute } from 'next'
  
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dtech-showroom.vercel.app'
  
  export default function robots(): MetadataRoute.Robots {
    return {
      rules: [
        {
          userAgent: '*',
          allow: '/',
          disallow: [
            '/admin',
            '/admin/*',
            '/inquiry/*',
            '/motion',
            '/api/*',
          ],
        },
      ],
      sitemap: `${BASE_URL}/sitemap.xml`,
    }
  }

================================================================
TASK 7 — OG IMAGE GENERATION
================================================================

Use Next.js's `next/og` ImageResponse API to dynamically generate 
Open Graph images for routes that need them.

Create src/app/opengraph-image.tsx (default OG for homepage and 
fallback):

  import { ImageResponse } from 'next/og'
  
  export const runtime = 'edge'
  export const alt = 'Dtech Showroom — Hardware presented properly'
  export const size = { width: 1200, height: 630 }
  export const contentType = 'image/png'
  
  export default async function Image() {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #0a0a0d 0%, #14141a 100%)',
            padding: '80px',
            fontFamily: 'system-ui, sans-serif',
            color: '#f5f5f3',
          }}
        >
          <div style={{ 
            fontSize: 24, 
            fontFamily: 'monospace', 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase', 
            opacity: 0.6 
          }}>
            DTECH · CINEMATIC SHOWROOM
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 96, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              Hardware, presented properly<span style={{ color: '#3ec5e0' }}>.</span>
            </div>
            <div style={{ fontSize: 28, opacity: 0.78, marginTop: 24 }}>
              The Dtech Algérie catalog.
            </div>
          </div>
          <div style={{ 
            fontSize: 18, 
            fontFamily: 'monospace', 
            letterSpacing: '0.04em', 
            textTransform: 'uppercase', 
            opacity: 0.5,
          }}>
            d-techalgerie.com
          </div>
        </div>
      ),
      { ...size }
    )
  }

Create per-route OG images for high-traffic dynamic routes:

  src/app/products/[productSlug]/opengraph-image.tsx
  src/app/brands/[brandSlug]/opengraph-image.tsx
  src/app/categories/[categorySlug]/opengraph-image.tsx

Each takes the dynamic param, fetches the relevant entity, and 
renders an OG image with that entity's name and tagline/description. 
Pattern for product OG:

  import { ImageResponse } from 'next/og'
  import { db } from '@/db/client'
  import { products } from '@/db/schema'
  import { eq } from 'drizzle-orm'
  
  export const runtime = 'edge'
  export const alt = 'Dtech product'
  export const size = { width: 1200, height: 630 }
  export const contentType = 'image/png'
  
  export default async function Image({ 
    params,
  }: { 
    params: { productSlug: string }
  }) {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, params.productSlug),
      with: { brand: true },
    })
    
    if (!product) {
      return new ImageResponse(
        (<div style={{ /* fallback OG */ }} />),
        { ...size }
      )
    }
    
    return new ImageResponse(
      (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0d 0%, #14141a 100%)',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
          color: '#f5f5f3',
        }}>
          <div style={{ 
            fontSize: 24, 
            fontFamily: 'monospace', 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase',
            opacity: 0.6,
          }}>
            {product.brand.name.toUpperCase()} · DTECH
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 80, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              {product.name}<span style={{ color: '#3ec5e0' }}>.</span>
            </div>
            <div style={{ fontSize: 28, opacity: 0.78, marginTop: 24 }}>
              {product.tagline}
            </div>
          </div>
          <div style={{ 
            fontSize: 18, 
            fontFamily: 'monospace', 
            letterSpacing: '0.04em', 
            textTransform: 'uppercase',
            opacity: 0.5,
          }}>
            d-techalgerie.com
          </div>
        </div>
      ),
      { ...size }
    )
  }

NOTE on Next 16 edge runtime + Drizzle: ImageResponse runs on edge 
runtime by default. The postgres.js client may not work on edge. If 
the build fails because of this:
  Option A: Remove `export const runtime = 'edge'` so it runs on 
    Node.js runtime (slower cold-start, works everywhere)
  Option B: Use a fetch to an internal API route that does the DB 
    query on Node runtime
  Prefer Option A — Node runtime is fine for OG generation, the small 
  cold-start cost is acceptable for crawler traffic.

================================================================
TASK 8 — INQUIRY FORM HARDENING (rate limit + honeypot)
================================================================

Step 8.1: Add honeypot field to InquiryForm
Modify src/components/forms/InquiryForm.tsx. Add a hidden field that 
real users can't see but bots will fill:

  <div 
    aria-hidden="true" 
    style={{ 
      position: 'absolute', 
      left: '-9999px', 
      width: '1px', 
      height: '1px', 
      overflow: 'hidden',
    }}
  >
    <label htmlFor="website">Website (leave empty)</label>
    <input
      type="text"
      id="website"
      name="website"
      tabIndex={-1}
      autoComplete="off"
    />
  </div>

The field is named "website" (a common bot target). Real users see 
nothing. Bots that auto-fill all form fields will fill this, and we 
reject the submission server-side.

Step 8.2: Add rate limiting to submitInquiry server action
Modify src/server/actions.ts. Add Upstash rate limit:

  import { Ratelimit } from '@upstash/ratelimit'
  import { Redis } from '@upstash/redis'
  import { headers } from 'next/headers'
  
  const ratelimit = process.env.UPSTASH_REDIS_REST_URL
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        analytics: true,
        prefix: 'dtech:inquiry',
      })
    : null
  
  export async function submitInquiry(formData: FormData) {
    // Honeypot check — silent reject if filled
    const honeypot = formData.get('website')
    if (honeypot && typeof honeypot === 'string' && honeypot.length > 0) {
      // Silent success — don't tell the bot it failed
      // Redirect to /inquiry/sent as if successful, but skip DB write
      return { ok: true, silent: true } as const
    }
    
    // Rate limit check (only if Upstash configured)
    if (ratelimit) {
      const headersList = await headers()
      const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
          ?? headersList.get('x-real-ip') 
          ?? 'anonymous'
      
      const { success } = await ratelimit.limit(ip)
      if (!success) {
        return { 
          ok: false, 
          errors: { 
            _form: ['Too many inquiries from this address. Please try again in an hour, or email contact@d-techalgerie.com directly.'] 
          } 
        } as const
      }
    }
    
    // ... existing Zod validation + DB insert + redirect
  }

Step 8.3: Handle honeypot silent-success in the form
On honeypot trigger, the form should redirect to /inquiry/sent as if 
submission succeeded. Bot doesn't know it failed. No DB row created.

Step 8.4: Update .env.example to document Upstash variables
Add to .env.example:

  # Upstash Redis for rate limiting (optional in dev; required in prod)
  # Get free credentials at https://upstash.com/console
  UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
  UPSTASH_REDIS_REST_TOKEN="your-token-here"
  
  # Public site URL — used for sitemap, robots, OG images
  NEXT_PUBLIC_SITE_URL="https://dtech-showroom.vercel.app"

Step 8.5: Add note to README about Upstash setup
In the Database Setup section of README.md, add a subsection:

  ### Rate Limiting Setup (Production)
  
  Inquiry form submission is rate-limited via Upstash Redis (3 
  submissions per IP per hour). For development this is optional. 
  For production:
  
  1. Sign up at https://upstash.com (free tier covers ~10k/day)
  2. Create a Redis database (any region)
  3. Copy REST URL and REST TOKEN
  4. Add to .env.local:
     UPSTASH_REDIS_REST_URL="..."
     UPSTASH_REDIS_REST_TOKEN="..."

================================================================
TASK 9 — NEXT.CONFIG.TS HARDENING
================================================================

Open next.config.ts. Add:

  import type { NextConfig } from 'next'
  
  const nextConfig: NextConfig = {
    // Image optimization
    images: {
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
      remotePatterns: [
        // Add real CDN here later (Cloudflare R2 etc.); empty for Phase 1
      ],
    },
    
    // Security headers
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-DNS-Prefetch-Control', value: 'on' },
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ],
        },
        {
          source: '/images/(.*)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
        {
          source: '/fonts/(.*)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
      ]
    },
    
    // Compression (default true, explicit for clarity)
    compress: true,
    
    // Strict mode
    reactStrictMode: true,
    
    // Powered-by header off (light security improvement)
    poweredByHeader: false,
  }
  
  export default nextConfig

If a next.config.ts file already exists from Phase 2-4a, MERGE these 
additions without overwriting existing config keys.

CSP note: No Content-Security-Policy header is set in Phase 4b 
because R3F + Framer Motion + dev tooling need wide permissions and 
a proper CSP requires per-asset auditing that's out of scope for this 
session. Document this as a Phase 5+ enhancement.

================================================================
TASK 10 — VERCEL ANALYTICS + SPEED INSIGHTS
================================================================

Modify src/app/layout.tsx. Import and render Analytics + SpeedInsights 
inside the body:

  import { Analytics } from '@vercel/analytics/next'
  import { SpeedInsights } from '@vercel/speed-insights/next'
  
  // Inside the body, after children, before closing body:
  <Analytics />
  <SpeedInsights />

These components are no-ops outside Vercel (they don't fail or 
double-log). On Vercel they auto-track without further config.

================================================================
TASK 11 — ACCESSIBILITY AUDIT PASS
================================================================

Go through every component in src/components/ and verify:

Step 11.1: Semantic HTML
  - Every page has exactly one <h1> (the page heading)
  - Heading order is logical (h1 → h2 → h3, no skips)
  - <button> for buttons, <a>/<Link> for links — NEVER <div onClick>
  - <nav>, <main>, <footer>, <article>, <section> used semantically
  - Lists use <ul>/<ol>, not <div> stacks

Step 11.2: ARIA and labels
  - Icon-only buttons have aria-label
  - Form inputs all have <label> with matching htmlFor
  - Decorative images have alt=""
  - Meaningful images have descriptive alt
  - Breadcrumbs use <nav aria-label="Breadcrumb">

Step 11.3: Focus management
  - All interactive elements are keyboard-reachable (Tab through 
    them — the focus ring from globals.css should appear)
  - Tab order is logical (no positive tabindex values)
  - Skip-to-content link exists in layout: 
    <a href="#main-content" className="sr-only focus:not-sr-only fixed top-4 left-4 z-50 bg-surface-elevated px-4 py-2 rounded-md text-text-primary">
      Skip to content
    </a>
  - <main> has id="main-content"
  - Mobile menu can be closed with Escape key

Step 11.4: Color contrast
  - text-muted on surface-elevated may fail body-text 4.5:1 (per v2 
    spec §3.3); use only for non-essential UI or large text on that 
    surface
  - text-disabled is never used for information (only for disabled 
    affordances)

Step 11.5: Keyboard handlers
  - Mobile menu toggle: button with onClick, can be activated by 
    Space or Enter
  - Inquiry form submit: native form submission (Enter key works)
  - Search input: native form submission

For each component touched, list the file in the commit message under 
"Accessibility improvements:" with one-line summaries.

================================================================
TASK 12 — DEPLOYMENT CHECKLIST DOCUMENTATION
================================================================

Create docs/DEPLOYMENT.md with this content:

  # Dtech Showroom — Deployment Guide
  
  ## Prerequisites
  
  - Vercel account (free tier sufficient for pitch demo)
  - Neon Postgres database (production tier recommended for real 
    launch; free tier acceptable for pitch)
  - Upstash Redis (free tier; required for rate limiting)
  - Domain name (optional; Vercel provides a .vercel.app subdomain)
  
  ## Environment Variables (Vercel Project Settings → Environment Variables)
  
  Required:
  
  ```
  DATABASE_URL=postgresql://...?sslmode=require
  UPSTASH_REDIS_REST_URL=https://...
  UPSTASH_REDIS_REST_TOKEN=...
  NEXT_PUBLIC_SITE_URL=https://your-domain.com
  ```
  
  ## Deployment Steps
  
  1. Push code to GitHub
  2. Import the repo to Vercel
  3. Set environment variables as above
  4. Deploy
  5. Run database migrations: 
     `pnpm db:push` (run from local pointing at production DATABASE_URL)
  6. Optionally seed: 
     `pnpm db:seed` (only for demo; never seed real production data)
  7. Verify deployment URL
  
  ## Post-Deployment Verification
  
  1. Visit https://your-domain.com/sitemap.xml — confirms sitemap works
  2. Visit https://your-domain.com/robots.txt — confirms robots works
  3. Submit a test inquiry, then visit /admin/inquiries — confirms 
     end-to-end DB write
  4. Submit 4 inquiries quickly — confirms rate limit triggers
  5. Run Lighthouse on homepage — should score 90+ across all metrics
  6. Test on mobile device — confirm responsive layout
  
  ## Pre-Pitch Cleanup
  
  Before sharing the URL with Dtech, remove:
  
  - /motion route — delete src/app/(dev)/motion directory
  - /admin and /admin/inquiries — comment out or password-protect 
    (TODO: add Better Auth gate before real client engagement)
  
  ## Custom Domain Setup
  
  If using a custom domain:
  
  1. Vercel Project → Settings → Domains → Add
  2. Add DNS records as instructed
  3. Update NEXT_PUBLIC_SITE_URL to match
  4. Wait for SSL cert provisioning (~1 min)
  
  ## Database Migrations in Production
  
  - Never run `pnpm db:push --force` in production
  - Generate migrations: `pnpm db:generate` (commits to repo)
  - Apply: `pnpm exec drizzle-kit migrate`
  - For zero-downtime migrations on Neon, use branching:
    1. Create a Neon branch from main
    2. Apply migration on branch
    3. Smoke-test against branch
    4. Promote branch to main
  
  ## Rollback
  
  - Vercel: instant rollback via Deployments tab
  - Database: Neon point-in-time recovery (paid tier required for 
    >24h history)

================================================================
TASK 13 — VERIFICATION
================================================================

Run in this order:

  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass cleanly. If pnpm build complains about edge runtime + 
postgres.js for OG images, fall back to Node runtime as described in 
Task 7.

Then start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Test these new routes:

  $newRoutes = @(
    '/sitemap.xml',
    '/robots.txt',
    '/opengraph-image'
  )
  foreach ($r in $newRoutes) {
    $url = "http://localhost:3000$r"
    try {
      $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
      Write-Host "$($res.StatusCode) $r — Content-Type: $($res.Headers['Content-Type'])"
    } catch {
      Write-Host "ERROR $r — $($_.Exception.Message)"
    }
  }

Expected:
  - /sitemap.xml → 200, Content-Type: application/xml
  - /robots.txt → 200, Content-Type: text/plain
  - /opengraph-image → 200, Content-Type: image/png

Also re-verify the previously-working routes still return 200:

  $existing = @('/', '/brands', '/brands/hp', '/categories', '/products/hp-omen-16-i9-rtx-4070', '/admin/inquiries')
  foreach ($r in $existing) {
    $url = "http://localhost:3000$r"
    try {
      $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch {
      Write-Host "ERROR $r"
    }
  }

Then test the error boundary by deliberately triggering an error. 
Visit a URL that should throw, e.g., /products/nonexistent-slug. 
Should return 404 (via notFound()), not 500.

Test the rate limit (only if Upstash configured locally; otherwise 
note that prod will enforce):
Submit the inquiry form 4 times in rapid succession from the same 
browser. The 4th should fail with rate-limit message.

Stop dev:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 14 — COMMIT
================================================================

git add .
git commit -m "feat: phase 4b — production readiness gap closure

ERROR HANDLING:
- error.tsx boundaries on root, products, brands, categories, search, 
  inquiry route segments
- global-error.tsx for catastrophic root-layout failures
- All error UIs follow v2 brand spec voice

LOADING STATES:
- loading.tsx skeletons on all dynamic routes (products, brands, 
  categories, search, admin/inquiries)
- Static skeletons per v2 §9.8 — no shimmer, no animation

SEO INFRASTRUCTURE:
- sitemap.ts generates /sitemap.xml from live DB (hourly revalidate)
- robots.ts generates /robots.txt with proper allow/disallow
- Default opengraph-image.tsx for homepage and fallback
- Per-route OG images for products, brands, categories
- 404 polish — verified matches v2 §9.10

SECURITY + ABUSE PROTECTION:
- Honeypot field on inquiry form (hidden 'website' input)
- Rate limiting on submitInquiry: 3 submissions per IP per hour via 
  Upstash Redis
- Graceful fallback when Upstash not configured (dev mode)
- Security headers in next.config (X-Frame-Options, X-Content-Type-
  Options, Referrer-Policy, Permissions-Policy)
- poweredByHeader disabled

PERFORMANCE:
- next/image optimization config (AVIF + WebP, 30-day cache)
- Immutable cache headers on /images and /fonts
- Vercel Analytics integration
- Vercel Speed Insights integration

ACCESSIBILITY:
- Skip-to-content link in layout
- Semantic HTML audit complete (single h1, proper landmarks)
- ARIA labels on icon-only controls
- aria-label='Breadcrumb' on breadcrumb nav
- Tab order verified
- prefers-reduced-motion already handled (Phase 1.2)

DEPLOYMENT:
- docs/DEPLOYMENT.md with full deployment guide
- .env.example updated with all required production vars

NEW DEPENDENCIES:
- @vercel/analytics — page analytics (free tier)
- @vercel/speed-insights — Core Web Vitals tracking (free tier)
- @upstash/ratelimit + @upstash/redis — serverless rate limiting"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] /sitemap.xml returns 200 with valid XML
- [ ] /robots.txt returns 200 with Disallow rules
- [ ] /opengraph-image returns 200 PNG
- [ ] All previously-working routes still return 200 (regression)
- [ ] error.tsx files exist for root, products/[slug], brands/[slug], 
      categories/[slug], search, inquiry/[slug]
- [ ] loading.tsx files exist for products/[slug], brands/[slug], 
      categories/[slug], search, admin/inquiries
- [ ] global-error.tsx exists
- [ ] Honeypot field present in inquiry form (verify by viewing 
      source on /inquiry/[slug])
- [ ] Rate limit logic present in src/server/actions.ts
- [ ] next.config.ts has image config + security headers
- [ ] Vercel Analytics + SpeedInsights imported in layout.tsx
- [ ] Skip-to-content link in layout.tsx
- [ ] docs/DEPLOYMENT.md exists
- [ ] .env.example updated
- [ ] One commit with the message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + summary)
2. Files modified (count + summary)
3. Build verification: lint, tsc, build outputs
4. New route smoke tests: sitemap.xml, robots.txt, opengraph-image
5. Regression smoke tests on existing routes
6. Bundle size delta from pre-Phase-4b to post (if surfacable)
7. Accessibility improvements made (per-file summary)
8. Any warnings or deviations from spec
9. Final commit hash

================================================================
DO NOT
================================================================

- Modify brand-tokens.ts, fonts.ts, animations.ts, globals.css beyond 
  what's strictly required
- Modify the seed data
- Add new tables to the schema
- Modify /motion or any (dev) routes
- "Improve" components beyond accessibility fixes
- Install packages beyond the four listed in Task 1
- Switch out postgres.js for a different DB client
- Add Sentry, LogRocket, or other paid services (defer to real 
  engagement)
- Add Turnstile / hCaptcha (rate limit + honeypot are sufficient for 
  Phase 1)
- Modify the v2 brand spec or any project knowledge files
- Add OAuth or Better Auth implementation (Task 12 documents this 
  as a future requirement, but Phase 4b is not the time)

================================================================
FAILURE MODES TO WATCH
================================================================

- If pnpm build fails on edge runtime + Drizzle for OG images: 
  remove `export const runtime = 'edge'` from opengraph-image.tsx 
  files; use Node runtime instead.

- If next.config.ts headers function causes type errors in Next 16: 
  check that the return type is `Promise<HeaderRules>`. If Next 16 
  changed the signature, adapt.

- If Upstash imports fail because the package isn't installed yet: 
  re-run Task 1 install first.

- If a 'use client' file imports from 'next/headers' (which is server-
  only): refactor so the server-side header reading happens in the 
  server action, not in a client component. headers() is called 
  inside submitInquiry which is 'use server'.

- If skip-to-content link breaks layout because it's not properly 
  sr-only: use Tailwind's `sr-only focus:not-sr-only` pattern. Test 
  by tabbing into the page — the link should become visible.

- If pnpm db:push or pnpm db:seed regress after the changes: the env 
  loading in drizzle.config.ts may have been affected. Verify 
  process.env.DATABASE_URL is still being read correctly.