You are executing Phase 8.5 — Page-Body Translation Wiring (Patch) 
for the Dtech Showroom project. Read this entire prompt before doing 
anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 8 complete (latest commit: f472f5a): i18n infrastructure 
  shipped — next-intl installed, [locale] routing works, header/
  footer/nav/404/error translated, customer queries read _fr fields 
  with EN fallback, locale switcher in nav
- KNOWN GAP from Phase 8: page-body content in individual route 
  components left as hardcoded English. The translation catalog 
  (messages/en.json and messages/fr.json) already includes every 
  needed string; this patch wires t() calls into the page components.
- Real client engagement with Dtech Algérie
- This is a focused patch, NOT a full phase

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Wire t() translation calls into every page-body component under 
src/app/[locale]/. Replace hardcoded English strings with calls to 
useTranslations (client components) or getTranslations (server 
components) using the already-existing translation keys in 
messages/en.json and messages/fr.json. No new translation keys 
needed — the catalog is complete. After this lands, every customer 
URL renders fully in its locale: /fr/about shows French about copy, 
/fr (home) shows French headline and sections, /fr/inquiry/sent 
shows French confirmation, etc.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Adding new translation keys (the catalog is complete from Phase 8)
- Modifying messages/en.json or messages/fr.json contents (only 
  reading from them via t() calls)
- Translating product/brand/category content (already handled by 
  Phase 8's localizeBrand/Category/Product query helpers)
- Translating admin tool (admin stays English)
- Modifying brand-tokens.ts, fonts.ts, animations.ts, globals.css
- Modifying v2 brand spec
- Auth flow changes
- Adding new dependencies
- Modifying Phase 5 components (shader hero, scroll choreography) 
  beyond translation calls
- Refactoring beyond translation extraction
- Adding French translations for dynamic content not in the catalog 
  (if a hardcoded string doesn't have a matching key, FLAG it but 
  don't invent a key)

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Audit hardcoded English strings across [locale] routes
  2. Wire home page (src/app/[locale]/page.tsx)
  3. Wire about page (src/app/[locale]/about/page.tsx)
  4. Wire brands index (src/app/[locale]/brands/page.tsx)
  5. Wire brands detail (src/app/[locale]/brands/[brandSlug]/page.tsx)
  6. Wire categories index (src/app/[locale]/categories/page.tsx)
  7. Wire categories detail (src/app/[locale]/categories/[categorySlug]/page.tsx)
  8. Wire products detail (src/app/[locale]/products/[productSlug]/page.tsx)
  9. Wire search page (src/app/[locale]/search/page.tsx)
  10. Wire inquiry pages (src/app/[locale]/inquiry/[productSlug]/page.tsx + 
      src/app/[locale]/inquiry/sent/page.tsx)
  11. Verification (lint, tsc, build, smoke tests in both locales)
  12. Commit

tsc checkpoint after task 5 and task 10.

================================================================
TASK 1 — AUDIT
================================================================

Find all hardcoded English strings in customer-facing route 
components by grepping. The grep is best-effort — final audit is 
per-file inspection.

Search for these patterns:
  grep -rn "Dtech Algérie" src/app/[locale]/ --include="*.tsx"
  grep -rn "Hardware" src/app/[locale]/ --include="*.tsx"
  grep -rn "Browse the catalog" src/app/[locale]/ --include="*.tsx"
  grep -rn "About" src/app/[locale]/ --include="*.tsx"
  grep -rn "Specifications" src/app/[locale]/ --include="*.tsx"
  grep -rn "Inquire" src/app/[locale]/ --include="*.tsx"
  grep -rn "Related products" src/app/[locale]/ --include="*.tsx"
  grep -rn "Search" src/app/[locale]/ --include="*.tsx"
  grep -rn "No results" src/app/[locale]/ --include="*.tsx"
  grep -rn "Sent" src/app/[locale]/ --include="*.tsx"

Build a mental inventory of every hardcoded string. Don't fix yet — 
just audit. The translation catalog at messages/en.json has every 
needed key.

For each hardcoded string found, identify the matching key in 
messages/en.json. If a string has no matching key, flag it in the 
final report (don't invent keys — those are scope creep).

================================================================
PATTERN — SERVER COMPONENTS
================================================================

Server components (the default) use getTranslations:

```tsx
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('namespace')
  return <h1>{t('key')}</h1>
}
```

For pages with dynamic metadata, use getTranslations in 
generateMetadata too:

```tsx
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('namespace')
  return {
    title: t('pageTitle'),
    description: t('subtitle'),
  }
}
```

================================================================
PATTERN — CLIENT COMPONENTS
================================================================

Client components use useTranslations:

```tsx
'use client'
import { useTranslations } from 'next-intl'

export function ClientThing() {
  const t = useTranslations('namespace')
  return <button>{t('submit')}</button>
}
```

For values interpolated with placeholders (like {year}), use 
the second arg:

```tsx
t('copyright', { year: new Date().getFullYear() })
```

================================================================
TASK 2 — HOME PAGE
================================================================

Open src/app/[locale]/page.tsx (the home page).

The translation namespace is 'home' (already defined in messages/en.json 
and messages/fr.json). Strings to wire:

- "DTECH ALGÉRIE · EST. 2006" → t('eyebrow') from 'home'
- "Hardware," (line 1 of headline) → t('headline')
- "presented" (line 2) → t('headlineLine2')
- "properly" (line 3) → t('headlineLine3')
- The full description paragraph → t('description')
- "Browse the catalog" CTA → t('browseCatalog')
- "The current selection" → t('featuredTitle')
- "Five products we think are worth your time." → t('featuredSubtitle')
- "Five lines, considered" → t('brandsTitle')
- "We carry brands that match the showroom standard." → t('brandsSubtitle')
- "Sorted by intent" → t('categoriesTitle')
- "Find by what you need it for, not what we call it." → t('categoriesSubtitle')

The accent period at end of headline ("properly.") stays — that's a 
visual treatment in JSX, not part of the translated string. Keep:

```tsx
<h1>
  <span data-hero-reveal>{t('headline')}</span>
  <span data-hero-reveal>{t('headlineLine2')}</span>
  <span data-hero-reveal>
    {t('headlineLine3')}<span className="text-accent">.</span>
  </span>
</h1>
```

If the page is a Server Component, use getTranslations. If it's a 
Client Component (for the HeroReveal/HomepageChoreography to work), 
use useTranslations.

Check the existing page to confirm which it is and use the matching 
API.

================================================================
TASK 3 — ABOUT PAGE
================================================================

Open src/app/[locale]/about/page.tsx.

Namespace: 'about'

Strings:
- Page title in metadata → t('pageTitle')
- "About Dtech" heading → t('heading')
- "Established 2006" → t('establishedSince')
- Introduction paragraph → t('introduction')
- "Our approach" heading → t('approach')
- Approach body paragraph → t('approachBody')
- "Contact" heading → t('contact')
- Contact body paragraph → t('contactBody')

================================================================
TASK 4 — BRANDS INDEX
================================================================

Open src/app/[locale]/brands/page.tsx.

Namespace: 'brands'

Strings:
- Page title metadata → t('pageTitle')
- "Brands we carry" heading → t('indexHeading')
- "Five lines selected..." subtitle → t('indexSubtitle')
- "View products" link on each brand card → t('viewProducts')

The brand cards iterate over brand data — the brand name + statement 
come from the database (already localized via Phase 8 helpers), but 
the "View products" label is a static string that needs translation.

================================================================
TASK 5 — BRAND DETAIL
================================================================

Open src/app/[locale]/brands/[brandSlug]/page.tsx.

Namespace: 'brands' (for static strings) + dynamic brand data

Brand-specific data (name, statement, description) is already 
localized by the localizeBrand helper from Phase 8. The page just 
needs to translate any static labels.

Likely strings to wire:
- generateMetadata: page title pattern (e.g., `${brand.name} — Dtech`)
- Any "View all products" or "Products" section heading
- Empty state if brand has no products

Audit the file. Apply t() calls only where hardcoded English exists.

================================================================
TASK 6 — CATEGORIES INDEX
================================================================

Open src/app/[locale]/categories/page.tsx.

Namespace: 'categories'

Strings:
- Page title metadata → t('pageTitle')
- "Sorted by intent" heading → t('indexHeading')
- "Browse the catalog..." subtitle → t('indexSubtitle')
- "View category" link → t('viewCategory')

================================================================
TASK 7 — CATEGORY DETAIL
================================================================

Open src/app/[locale]/categories/[categorySlug]/page.tsx.

Same pattern as brand detail. Category data is already localized. 
Wire static labels.

================================================================
TASK 8 — PRODUCT DETAIL
================================================================

Open src/app/[locale]/products/[productSlug]/page.tsx.

Namespace: 'products'

Strings to wire:
- "Specifications" heading → t('specifications')
- "Inquire about this product" button → t('inquireButton')
- "Related products" section → t('relatedProducts')
- "View product" on related product cards → t('viewProduct')
- "Not available" fallback if applicable → t('notAvailable')

Product data (name, tagline, description, cardSpec) is already 
localized via localizeProduct helper.

If the page has a "Back to brand" or breadcrumb-style nav, those 
strings come from the 'common' namespace ('back') or 'navigation' 
namespace.

================================================================
TASK 9 — SEARCH PAGE
================================================================

Open src/app/[locale]/search/page.tsx.

Namespace: 'search'

Strings:
- Page title → t('pageTitle')
- "Search results" heading → t('heading')
- Search input placeholder → t('placeholder')
- "Results for 'X'" → t('resultsFor', { query: searchQuery }) — but 
  the catalog uses static "resultsFor": "Results for" not 
  interpolated. If it's a label preceding a quoted query, render as 
  `<p>{t('resultsFor')} "{query}"</p>`
- "No results found" → t('noResults')
- Hint text when no results → t('noResultsHint')
- "Search must be at least 2 characters" → t('tooShort')

================================================================
TASK 10 — INQUIRY PAGES
================================================================

Open src/app/[locale]/inquiry/[productSlug]/page.tsx and 
src/app/[locale]/inquiry/sent/page.tsx.

Inquiry detail page (namespace: 'inquiry'):
- Page title → t('pageTitle')
- "Inquire about" heading → t('heading') — usually followed by product name
- Subheading "Send us a message..." → t('subheading')
- Form labels (if rendered in this page, not the InquiryForm component):
  - "Full name" → t('fullName')
  - "Email" → t('email')
  - "Phone" → t('phone')
  - "Company (optional)" → t('company')
  - "Message" → t('message')
  - "Send inquiry" submit button → t('submit')
  - Placeholders use the matching t() keys

Inquiry sent page (namespace: 'inquiry'):
- "Inquiry sent" heading → t('sentTitle')
- Success message → t('sentMessage')
- "Browse the catalog" link → t('sentAction')

If InquiryForm is a separate client component, wire useTranslations 
there too. Check src/components/forms/InquiryForm.tsx if it exists.

Inquiry form ERROR strings come from 'inquiry.errors' namespace:
- "This field is required" → t('errors.required')
- "Please enter a valid email address" → t('errors.invalidEmail')
- "Message must be at least 10 characters" → t('errors.messageTooShort')
- "Could not send inquiry..." → t('errors.submitFailed')

================================================================
TASK 11 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Test both locales return 200:

  $en = @(
    '/en',
    '/en/about',
    '/en/brands',
    '/en/brands/hp',
    '/en/categories',
    '/en/categories/laptops',
    '/en/products/hp-omen-16-i9-rtx-4070',
    '/en/search?q=laptop',
    '/en/inquiry/sent'
  )
  
  $fr = @(
    '/fr',
    '/fr/about',
    '/fr/brands',
    '/fr/brands/hp',
    '/fr/categories',
    '/fr/categories/laptops',
    '/fr/products/hp-omen-16-i9-rtx-4070',
    '/fr/search?q=laptop',
    '/fr/inquiry/sent'
  )
  
  foreach ($r in $en + $fr) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch { Write-Host "ERROR $r" }
  }

For content verification, spot-check FR pages by fetching and 
inspecting:

  $res = Invoke-WebRequest -Uri "http://localhost:3000/fr/about" -UseBasicParsing
  $content = $res.Content
  
  # Should contain French text from messages/fr.json:
  if ($content -match "À propos de Dtech") { Write-Host "✓ /fr/about has FR heading" }
  if ($content -match "Le matériel") { Write-Host "✓ FR tagline present" }
  
  # Should NOT contain hardcoded English equivalents:
  if ($content -notmatch "About Dtech</") { Write-Host "✓ EN heading absent" }

Apply same check pattern to /fr (home), /fr/inquiry/sent, etc.

Admin routes unchanged regression:
  $admin = @('/admin', '/admin/products', '/admin/inquiries')
  foreach ($r in $admin) {
    try {
      Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    } catch { Write-Host "Redirect 307 $r (admin preserved)" }
  }

Stop:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 12 — COMMIT
================================================================

git add .
git commit -m "feat: phase 8.5 — wire page-body translations (patch)

PATCH COMPLETING PHASE 8:
Phase 8 shipped i18n infrastructure + translated chrome (header, 
footer, nav, 404, error, locale switcher) but left individual page 
components with hardcoded English strings. This patch wires t() 
calls into every page-body component using the existing translation 
catalog.

PAGES UPDATED:
- src/app/[locale]/page.tsx — home (hero, sections, CTAs)
- src/app/[locale]/about/page.tsx — about content
- src/app/[locale]/brands/page.tsx — index labels
- src/app/[locale]/brands/[brandSlug]/page.tsx — brand detail labels
- src/app/[locale]/categories/page.tsx — index labels
- src/app/[locale]/categories/[categorySlug]/page.tsx — detail labels
- src/app/[locale]/products/[productSlug]/page.tsx — specs/inquire/related labels
- src/app/[locale]/search/page.tsx — search heading, placeholder, no-results, hints
- src/app/[locale]/inquiry/[productSlug]/page.tsx — heading, form labels
- src/app/[locale]/inquiry/sent/page.tsx — success message

NO NEW TRANSLATION KEYS:
The catalog from Phase 8 was already complete. This patch only 
wires the existing keys. messages/en.json and messages/fr.json 
unchanged.

VERIFICATION:
- All 9 EN routes return 200 with English content
- All 9 FR routes return 200 with French content (verified by content match)
- Admin routes unchanged (auth preserved, no localization)
- Build, lint, tsc all clean

DEFERRED FOR DTECH UAT:
- FR translation tone review (Phase 8 noted; still applies)
- Headline split awkwardness check ('Le matériel, / présenté / avec soin')"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes (both checkpoints)
- [ ] pnpm build succeeds
- [ ] All 9 EN routes return 200 with English content
- [ ] All 9 FR routes return 200 with French content (verified)
- [ ] /fr/about contains "À propos" not "About Dtech"
- [ ] /fr (home) contains "Le matériel" not "Hardware"
- [ ] /fr/inquiry/sent contains "Demande envoyée" not "Inquiry sent"
- [ ] Admin routes still return 307
- [ ] Auth routes still return 200
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files modified (count + per-page summary of strings extracted)
2. Build verification outputs
3. Smoke test results (EN + FR + admin regression)
4. FR content verification (a few key strings confirmed present)
5. Any hardcoded strings found WITHOUT matching translation keys 
   (flag — don't invent keys)
6. Any deviations from spec
7. Final commit hash

================================================================
DO NOT
================================================================

- Add new translation keys
- Modify messages/en.json or messages/fr.json
- Refactor page components beyond translation extraction
- Translate admin tool
- Modify Phase 5 components (shader hero etc.) beyond t() calls 
  if they have hardcoded text
- Modify auth flow
- Modify v2 brand spec
- Add new dependencies
- Touch /motion or any (dev) routes

================================================================
FAILURE MODES TO WATCH
================================================================

- If a server component imports useTranslations: that's wrong — 
  useTranslations is for client components. Server components use 
  getTranslations from 'next-intl/server'. Watch for this 
  confusion.

- If 'use client' is added unnecessarily: don't add 'use client' 
  just to use useTranslations. If a page is a Server Component, 
  keep it as one and use getTranslations.

- If t('key') returns the key as-is (e.g., "home.headline"): the 
  namespace is wrong. Check that t was called with the right 
  namespace and the key exists in messages/en.json.

- If a string doesn't have a matching translation key: flag it in 
  the report. DO NOT invent keys. The Phase 8 catalog should cover 
  everything; if it doesn't, the gap is for Dtech UAT to surface 
  via a Phase 8.6 patch.

- If interpolation breaks (e.g., t('copyright') doesn't show year): 
  use the second arg pattern: t('copyright', { year: new Date().getFullYear() }). 
  The key in messages must use {year} as placeholder.

- If a Server Component error appears like "headers() can only be 
  called inside Server Components": getTranslations is async; 
  await it correctly. const t = await getTranslations('namespace').

- If product/brand/category names appear in English on /fr: that's 
  NOT this patch's scope — that's the localizeProduct/Brand/Category 
  helpers from Phase 8 doing fallback because the admin hasn't 
  entered FR fields yet. Confirm by checking the DB.

- If headline doesn't render with 3-line typographic split anymore: 
  verify that t('headline'), t('headlineLine2'), t('headlineLine3') 
  are 3 separate calls preserving the visual structure. They should 
  be 3 separate span elements.

- If JSX nesting breaks because t() returns ReactNode but expected 
  string: t() returns string by default. For rich text with HTML, 
  use t.rich() or break into multiple t() calls. Phase 8.5 should 
  not need rich text.

- If TS complains about getTranslations type signature: check that 
  the function is async and returns Promise<...>. The await is 
  required.

- If running across React 19's set-state-in-effect rule: shouldn't 
  apply to this patch (no useEffect with state setters). If it 
  does, the established workaround from prior phases is to move the 
  effect's logic elsewhere.

- If middleware breaks because of changes: middleware should not 
  be touched by this patch. If it errors, you've gone outside scope.

================================================================
WHAT HAPPENS AFTER THIS LANDS
================================================================

Phase 8 is fully complete after this patch. The customer site is 
genuinely bilingual: every URL renders fully in its locale, every 
visible string available in EN and FR.

Next: Phase 9 — Production Infrastructure. Mostly coordination work 
(Dtech hosting, DNS, env vars in production, Resend domain 
verification, R2 production bucket). Not a Claude Code phase 
primarily.

Then Phase 10 — Launch prep + cutover. Testing, redirects, UAT.

After launch: Phase 11 — Arabic support (deferred decision).