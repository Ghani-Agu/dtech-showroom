You are executing a focused patch session for the Dtech Showroom 
project. This patch fixes 5 issues identified after Phase 8.5 dev 
testing. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 8.5 complete (latest commit: 4b4fed1)
- Phase 8 i18n shipped + Phase 8.5 wired page-body translations
- User added dtech.png to public/ folder
- v2 brand spec is source of truth — accent is oklch(0.74 0.14 215)
- This is a PATCH session, not a full phase

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Fix 5 issues: (1) MISSING_MESSAGE error for navigation.search 
translation key, (2) integrate the dtech.png logo into SiteHeader, 
SiteFooter, login page, and AdminHeader, (3) add a breathing 
conic-gradient border animation around the login form card using 
brand accent cyan, (4) rename middleware.ts to proxy.ts per 
Next 16 convention, (5) optionally suppress image 404 noise by 
ensuring SmartImage fallback paths work cleanly (don't remove 
the references — just ensure graceful behavior).

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Generating product/category/brand images (user does this manually 
  via Nano Banana)
- Phase 8.6 translation gap closure for flagged eyebrows/empty 
  states (separate session — only fix the BROKEN translation key 
  causing runtime error)
- Admin user seed (deferred until env vars are set)
- Resend / R2 production setup
- New customer features
- Modifying v2 brand spec or core tokens
- Modifying Phase 5 components (shader hero, scroll choreography)
- Modifying Phase 7 admin tool functionality
- Touching /motion or any (dev) routes
- Auth flow logic changes
- Database schema changes
- Adding new dependencies

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Verify dtech.png exists in public/
  2. Fix MISSING_MESSAGE: add navigation.search to en.json + fr.json
  3. Create Logo component (reusable across header/footer/login/admin)
  4. Integrate Logo into SiteHeader
  5. Integrate Logo into SiteFooter
  6. Integrate Logo into Login page + add breathing conic-gradient border
  7. Integrate Logo into AdminHeader
  8. Rename middleware.ts → proxy.ts
  9. Verification (lint, tsc, build, visual smoke test)
  10. Commit

tsc checkpoint after task 4 and task 7.

================================================================
TASK 1 — VERIFY ASSET
================================================================

Run:
  ls public/dtech.png

If the file doesn't exist, STOP and report. The user said they added 
it; if missing, something went wrong with the upload.

If it exists, check the dimensions:
  pnpm exec node -e "const sharp = require('sharp'); sharp('public/dtech.png').metadata().then(m => console.log(m.width, 'x', m.height, m.format))"

Report the dimensions in the final completion report. We need to 
know if it's square, wide, or what aspect for proper sizing in 
components.

================================================================
TASK 2 — FIX MISSING TRANSLATION KEY
================================================================

The error trace shows:
  Error: MISSING_MESSAGE: Could not resolve `navigation.search` in 
  messages for locale `en`.
  at SearchPage src/app/[locale]/search/page.tsx:37

The page calls `tNav('search')` but `navigation.search` doesn't 
exist in messages/en.json or messages/fr.json. The key exists at 
`common.search` but not in the navigation namespace.

Open messages/en.json. Find the "navigation" namespace block. Add 
the `search` key:

```json
"navigation": {
  "home": "Home",
  "catalog": "Catalog",
  "brands": "Brands",
  "categories": "Categories",
  "search": "Search",
  "about": "About",
  "contactDtech": "Contact Dtech",
  "viewSite": "View site"
}
```

Open messages/fr.json. Add the matching FR key to its navigation 
block:

```json
"navigation": {
  "home": "Accueil",
  "catalog": "Catalogue",
  "brands": "Marques",
  "categories": "Catégories",
  "search": "Rechercher",
  "about": "À propos",
  "contactDtech": "Contacter Dtech",
  "viewSite": "Voir le site"
}
```

The exact placement within the object doesn't matter — alphabetical 
or logical ordering both work.

================================================================
TASK 3 — CREATE LOGO COMPONENT
================================================================

Create src/components/brand/Logo.tsx:

```tsx
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  /** Visual size variant. 'sm' for header/footer, 'md' for login, 'lg' for hero contexts */
  size?: 'sm' | 'md' | 'lg'
  /** Optional className for additional styling */
  className?: string
  /** Whether to include the alt text. Always true for screen readers; false to hide visually-redundant alt when wrapping */
  alt?: string
  /** Priority loading (true for above-fold like header/login) */
  priority?: boolean
}

const SIZE_MAP = {
  sm: { width: 28, height: 28, className: 'h-7 w-7' },
  md: { width: 48, height: 48, className: 'h-12 w-12' },
  lg: { width: 80, height: 80, className: 'h-20 w-20' },
} as const

export function Logo({ 
  size = 'sm', 
  className,
  alt = 'Dtech',
  priority = false,
}: LogoProps) {
  const { width, height, className: sizeClass } = SIZE_MAP[size]
  
  return (
    <Image
      src="/dtech.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn(sizeClass, 'object-contain', className)}
    />
  )
}
```

This component:
- Uses Next.js Image for proper optimization
- Supports 3 sizes mapped to the contexts where the logo appears
- Defaults to priority=false; priority=true for header/login (above-fold)

If dtech.png is not square (e.g. wide wordmark instead of square mark), 
adjust the SIZE_MAP width/height values to preserve aspect ratio. 
After running Task 1 you'll know the actual dimensions — use them 
to compute proper width:height ratios. For example, if dtech.png is 
500x150 (3.33:1 ratio):

```typescript
const SIZE_MAP = {
  sm: { width: 100, height: 30, className: 'h-7' },     // height fixed, width auto via aspect-ratio
  md: { width: 160, height: 48, className: 'h-12' },
  lg: { width: 267, height: 80, className: 'h-20' },
}
```

Use Image with width + height props matching the actual aspect ratio. 
The Tailwind class controls visible height; auto-width preserves ratio.

================================================================
TASK 4 — SITEHEADER LOGO INTEGRATION
================================================================

Open src/components/layout/SiteHeader.tsx.

Find the wordmark area. Currently it's likely text "DTECH" rendered 
as a styled span/heading. Replace with the Logo component.

Typical pattern:

Before:
```tsx
<Link href="/" className="flex items-center">
  <span className="font-display text-xl font-medium tracking-tight">
    DTECH
  </span>
</Link>
```

After:
```tsx
import { Logo } from '@/components/brand/Logo'

<Link href="/" className="flex items-center gap-2 group">
  <Logo size="sm" priority />
  <span className="font-display text-xl font-medium tracking-tight text-text-primary">
    DTECH
  </span>
</Link>
```

The Logo + text combination keeps the wordmark for legibility while 
adding the brand mark. The `group` class enables hover state propagation 
if needed.

If the SiteHeader currently has NO wordmark text and you want logo-only:
```tsx
<Link href="/" className="flex items-center" aria-label="Dtech home">
  <Logo size="sm" priority />
</Link>
```

Use your judgment based on the existing design. If the header was 
text-only DTECH, keep the text and add logo before it. If the design 
calls for logo-only, use that.

================================================================
TASK 5 — SITEFOOTER LOGO INTEGRATION
================================================================

Open src/components/layout/SiteFooter.tsx.

Same pattern as the header. The footer likely has a large "DTECH" 
wordmark. Add the Logo alongside it (or replace it, depending on 
design intent).

Suggestion: keep the large wordmark (it's a typographic anchor) but 
add the Logo above or beside it at smaller scale:

```tsx
import { Logo } from '@/components/brand/Logo'

<div className="flex items-center gap-3">
  <Logo size="sm" />
  <span className="font-display text-4xl md:text-6xl font-medium tracking-tight">
    DTECH
  </span>
</div>
```

================================================================
TASK 6 — LOGIN PAGE: LOGO + BREATHING CONIC-GRADIENT BORDER
================================================================

This is the most involved task. Two changes:
1. Add the Logo to the top of the login form card
2. Add a breathing conic-gradient border animation around the card

Open src/app/login/page.tsx (or src/app/login/LoginForm.tsx if 
the form is split into a client component).

The login form is currently a card with `border border-surface-overlay` 
or similar. We're upgrading it to have an animated conic-gradient 
border that breathes.

The technique uses a wrapper element with the conic gradient as its 
background, and a slightly inset inner element with the actual card 
content. The animation rotates the conic gradient + animates opacity 
for the "breathing" effect.

### Step 1: Define the animation keyframes

Open src/app/globals.css. Add (near other custom keyframes):

```css
@keyframes conic-rotate {
  0% {
    --gradient-angle: 0deg;
  }
  100% {
    --gradient-angle: 360deg;
  }
}

@keyframes conic-breathe {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.85;
  }
}

@property --gradient-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
```

The `@property` declaration is what enables the angle to animate 
smoothly (without it, conic-gradient angles snap rather than 
transition).

### Step 2: Update the login form structure

Find the login card. Wrap it in a new container with the breathing 
border:

```tsx
{/* Outer wrapper with the animated conic gradient border */}
<div 
  className="relative rounded-lg p-px conic-border-wrapper"
  style={{
    background: 'conic-gradient(from var(--gradient-angle), oklch(0.74 0.14 215) 0deg, oklch(0.45 0.10 215) 90deg, oklch(0.28 0.06 215) 180deg, oklch(0.45 0.10 215) 270deg, oklch(0.74 0.14 215) 360deg)',
    animation: 'conic-rotate 8s linear infinite, conic-breathe 4s ease-in-out infinite',
  }}
>
  {/* Inner card content (the actual form) */}
  <div className="relative rounded-lg bg-surface-elevated px-8 py-10">
    {/* Logo at top */}
    <div className="flex justify-center mb-8">
      <Logo size="md" priority />
    </div>
    
    {/* existing form content here */}
    <h1 className="...">Sign in</h1>
    <form>
      {/* existing fields */}
    </form>
  </div>
</div>
```

Key points:
- The outer wrapper has `p-px` (1px padding) which gives the gradient 
  its visible "border" thickness
- The inner card has full padding (`px-8 py-10`) for content space
- Both share the same `rounded-lg` so the gradient appears as a 
  proper rounded border, not a rectangle behind a rounded card
- The conic gradient uses 5 stops cycling through brand cyan and 
  darker variations: full cyan → muted cyan → deep cyan → muted cyan 
  → full cyan (smooth rotation effect)
- Two animations compound: `conic-rotate` spins the gradient 360° 
  every 8s, `conic-breathe` pulses opacity 0.4↔0.85 every 4s

### Step 3: Verify it works in dev

After saving, in `pnpm dev`, navigate to `/login`. You should see:
- The Dtech logo centered above the "Sign in" heading
- A breathing, slowly rotating cyan border around the entire form 
  card
- The animation feels alive but not distracting

If the animation feels too aggressive, tune:
- Slower rotation: change `8s` to `12s` or `16s`
- Subtler breathing: change opacity range to `0.3` and `0.7`
- Less saturation: dim the cyan values (e.g., `oklch(0.65 0.10 215)`)

If the inner card edges show the gradient bleeding through, increase 
inner padding or check that `rounded-lg` matches between layers.

### Step 4: Handle reduced motion accessibility

Some users have `prefers-reduced-motion`. Respect it:

In globals.css, after the keyframes:

```css
@media (prefers-reduced-motion: reduce) {
  .conic-border-wrapper {
    animation: none !important;
    background: linear-gradient(135deg, oklch(0.45 0.10 215), oklch(0.28 0.06 215)) !important;
  }
}
```

This replaces the animation with a static gradient for users who 
prefer reduced motion. The border is still visible (it's a brand 
element), but it doesn't move.

================================================================
TASK 7 — ADMINHEADER LOGO INTEGRATION
================================================================

Open src/components/admin/AdminHeader.tsx.

Find the wordmark / brand area. Currently likely "DTECH · ADMIN" 
or similar. Add the Logo:

```tsx
import { Logo } from '@/components/brand/Logo'

<div className="flex items-center gap-2">
  <Logo size="sm" />
  <span className="font-display text-lg font-medium tracking-tight">
    DTECH
    <span className="text-text-muted font-mono text-xs uppercase ml-2 tracking-wider">
      Admin
    </span>
  </span>
</div>
```

Adjust to match existing AdminHeader structure.

================================================================
TASK 8 — RENAME MIDDLEWARE → PROXY
================================================================

Next 16 renamed `middleware.ts` to `proxy.ts`. The dev log shows:
  ⚠ The "middleware" file convention is deprecated. Please use 
  "proxy" instead.

Currently Next.js auto-detects the old name and uses it, but the 
warning is noise. Rename:

```bash
git mv src/middleware.ts src/proxy.ts
```

Verify no imports reference `middleware` by name (the file is detected 
by filename convention, not import). Search:
```bash
grep -rn "middleware" src/ --include="*.ts" --include="*.tsx"
```

The grep should only return comments or string literals (e.g., 
"intlMiddleware" variable name). The file-system filename change 
is the only fix needed.

After rename, restart `pnpm dev` to verify the warning is gone.

================================================================
TASK 9 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Smoke tests:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Translation key fix:
  $res = Invoke-WebRequest -Uri "http://localhost:3000/en/search?q=laptop" -UseBasicParsing -TimeoutSec 10
  Write-Host "EN search: $($res.StatusCode)"
  if ($res.Content -notmatch "MISSING_MESSAGE") { Write-Host "✓ no missing message error" }
  
  $res = Invoke-WebRequest -Uri "http://localhost:3000/fr/search?q=laptop" -UseBasicParsing -TimeoutSec 10
  Write-Host "FR search: $($res.StatusCode)"
  if ($res.Content -match "Rechercher") { Write-Host "✓ FR navigation.search rendered" }

Logo presence:
  $res = Invoke-WebRequest -Uri "http://localhost:3000/en" -UseBasicParsing -TimeoutSec 10
  if ($res.Content -match "/dtech\.png") { Write-Host "✓ Logo referenced in home" }
  
  $res = Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 10
  if ($res.Content -match "/dtech\.png") { Write-Host "✓ Logo referenced in login" }
  if ($res.Content -match "conic-gradient") { Write-Host "✓ conic-gradient style present in login" }

Proxy rename:
  if (Test-Path src/proxy.ts) { Write-Host "✓ proxy.ts exists" }
  if (-not (Test-Path src/middleware.ts)) { Write-Host "✓ middleware.ts removed" }

Public regression:
  $routes = @('/', '/en', '/en/about', '/en/brands', '/en/products/hp-omen-16-i9-rtx-4070', '/fr', '/fr/about', '/fr/search?q=laptop', '/login')
  foreach ($r in $routes) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10 -MaximumRedirection 1
      Write-Host "$($res.StatusCode) $r"
    } catch { Write-Host "ERROR $r" }
  }

Admin routes unchanged:
  $admin = @('/admin', '/admin/products')
  foreach ($r in $admin) {
    try {
      Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    } catch { Write-Host "Redirect 307 $r (admin preserved)" }
  }

Stop:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 10 — COMMIT
================================================================

git add .
git commit -m "fix: navigation.search key + logo integration + login animation

ISSUES RESOLVED:

1. MISSING_MESSAGE error at /en/search:
   - Added 'navigation.search' to messages/en.json (\"Search\")
   - Added 'navigation.search' to messages/fr.json (\"Rechercher\")
   - Phase 8.5 wired tNav('search') but the key was missing from
     both message catalogs

2. Dtech logo integration:
   - New Logo component at src/components/brand/Logo.tsx
   - Three size variants (sm/md/lg) with proper aspect-ratio
   - Integrated into SiteHeader (sm, priority)
   - Integrated into SiteFooter (sm, alongside wordmark)
   - Integrated into login page (md, centered above heading)
   - Integrated into AdminHeader (sm)

3. Login page breathing conic-gradient border:
   - Outer wrapper with conic-gradient background cycling brand
     cyan oklch(0.74 0.14 215) through darker variations
   - @property --gradient-angle enables smooth conic rotation
   - Two compound animations: rotate 8s linear + breathe 4s ease
   - prefers-reduced-motion fallback: static gradient, no animation
   - 1px padding on wrapper creates the visible border thickness

4. middleware.ts → proxy.ts rename:
   - Next 16 deprecated 'middleware' file convention in favor of
     'proxy'. Renamed via git mv. Functionality identical.

VERIFICATION:
- pnpm lint passes
- pnpm exec tsc --noEmit passes
- pnpm build passes
- /en/search no longer throws MISSING_MESSAGE
- /fr/search renders 'Rechercher' from navigation.search
- /login renders Dtech logo + conic-gradient border
- All customer routes return 200
- Admin routes still redirect 307 (auth preserved)

OUT OF SCOPE (separate sessions):
- Real product/category/brand imagery (user generating via Nano Banana)
- Phase 8.6 translation gap closure (flagged eyebrows/empty states)
- Admin user seed (deferred until env vars set in Phase 9)"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] dtech.png exists in public/ (verified)
- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes (both checkpoints)
- [ ] pnpm build succeeds
- [ ] navigation.search added to en.json + fr.json
- [ ] Logo component created with size variants
- [ ] Logo integrated into 4 locations
- [ ] Login page renders Logo
- [ ] Login page has conic-gradient breathing border
- [ ] @property --gradient-angle in globals.css
- [ ] prefers-reduced-motion fallback works
- [ ] middleware.ts renamed to proxy.ts
- [ ] No MISSING_MESSAGE errors in dev log
- [ ] No middleware deprecation warning in dev log
- [ ] All routes return correct status codes
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. dtech.png dimensions and aspect ratio
2. Files created (Logo component)
3. Files modified (en.json, fr.json, SiteHeader, SiteFooter, login 
   page, AdminHeader, globals.css)
4. Files renamed (middleware.ts → proxy.ts)
5. Build verification outputs
6. Smoke test results
7. Any deviations from spec
8. Final commit hash
9. Visual confirmation: did the login page look right when manually 
   inspected via the dev server? (You can curl the page and inspect 
   the rendered HTML for the conic-gradient style attribute.)

================================================================
DO NOT
================================================================

- Generate product/category/brand images (user's manual work)
- Address Phase 8.6 translation gaps beyond navigation.search
- Seed admin user (needs env vars)
- Add new dependencies
- Modify v2 brand spec or accent color value
- Modify Phase 5 shader/scroll components
- Modify Phase 7 admin tool functionality beyond AdminHeader logo
- Touch /motion or (dev) routes
- Refactor auth flow
- Add new translation keys beyond the missing one

================================================================
FAILURE MODES TO WATCH
================================================================

- If dtech.png is missing: STOP and report. User said they added 
  it; investigate.

- If dtech.png is very tall or very wide: SIZE_MAP needs adjustment 
  to preserve aspect ratio. Don't squish the logo.

- If Logo component breaks Next.js Image optimization: ensure the 
  file is in public/, not src/. Path should be '/dtech.png' 
  (leading slash) not 'dtech.png' or '/public/dtech.png'.

- If conic-gradient doesn't animate: @property declaration must be 
  outside any selector in globals.css. It's a top-level CSS 
  declaration, not nested.

- If @property doesn't work in some browsers: it's supported in 
  Chrome/Edge/Safari 16.4+, Firefox 128+. For older Firefox, the 
  fallback is a static gradient (acceptable degradation).

- If the breathing animation feels too aggressive: tune the keyframe 
  percentages or the animation durations. The spec values (8s rotate, 
  4s breathe) are starting points.

- If the inner card edges show gradient bleed: this happens when 
  rounded-lg values mismatch between outer wrapper and inner card. 
  Both must be rounded-lg (or matching values).

- If middleware/proxy rename breaks routing: Next.js detects the 
  file by name. Confirm src/proxy.ts exists and src/middleware.ts 
  is gone. No imports reference the filename — Next.js uses 
  convention-based detection.

- If admin header Logo looks oversized: try size='sm' or adjust 
  SIZE_MAP. Admin context typically wants subtle branding, not 
  prominent.

- If 'Search' looks wrong in nav for fr: 'Rechercher' is correct 
  French. If you see 'Recherche' (without 'r'), that's the noun 
  ('search' as a thing); 'Rechercher' is the verb ('to search'). 
  Either works in a nav context but 'Rechercher' matches search 
  button conventions.

- If the dev server proxy.ts log entry doesn't appear: restart 
  pnpm dev fully (Ctrl+C, pnpm dev again). Next.js caches the 
  middleware detection.

- If the logo PNG has a white background that clashes with dark 
  theme: this is a Phase 8.7+ asset concern. Note it in the report. 
  For now, ship as-is; user may want to swap for a transparent-bg 
  version of the logo later.

================================================================
WHAT HAPPENS AFTER THIS LANDS
================================================================

After this patch commits, the user can:
- Run pnpm dev cleanly with no MISSING_MESSAGE errors
- See the Dtech logo on every page
- See the breathing login animation
- Continue generating images via Nano Banana

Remaining work tracks:
- Image generation (manual, parallel)
- Phase 8.6 (translation gap closure for flagged strings)
- Phase 9 (production infrastructure)
- Phase 10 (launch)