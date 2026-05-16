# Phase 5 — Three Claude Code Prompts To Run Sequentially

This document contains three prompts. Run them in order:
- **Phase 5a** — Asset Integration (Path Z)
- **Phase 5b** — Shader Hero (Direction A — cool void)
- **Phase 5c** — Scroll Choreography

Each prompt is fully self-contained. Between prompts, optionally inspect 
the diff, run `pnpm dev`, and verify the visible state before moving on.

**Recommended workflow for each prompt:**

1. Copy the entire prompt block (from `--- PROMPT START ---` to `--- PROMPT END ---`)
2. Save to a temporary file in the project root, e.g. `phase-5a-prompt.md`
3. In Claude Code, run: `Read C:\Users\abdel\Desktop\dtech-showroom\phase-5a-prompt.md and execute it exactly as written.`
4. Wait for completion + commit
5. Verify with `pnpm dev` and visit the affected routes
6. Delete the temp file: `Remove-Item phase-5a-prompt.md`
7. Move to next prompt

---

## PHASE 5a — ASSET INTEGRATION (PATH Z)

**Purpose:** Wire real photography into the three product stage tiers. 
Replace placeholder logic with proper photo-based presentation. No 3D 
models, no R3F scenes in this phase. Path Z reality.

**Time estimate:** 60–90 minutes of Claude Code work

--- PROMPT START ---

You are executing Phase 5a — Asset Integration (Path Z) for the Dtech 
Showroom project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 4b complete (commit 8196b95): production hardening landed, all 
  21 routes green, sitemap/robots/OG/rate-limit/honeypot all working
- v2 brand spec is the source of truth for design and structural 
  decisions
- Path D — cinematic 3D showroom catalog, inquiry-only commercial layer
- PATH Z DECISION LOCKED: no 3D models in Phase 1. The hero/featured/
  long-tail tier differentiation is achieved through photography 
  treatment, not 3D vs photo. R3F + Three.js stay installed for future 
  use but are not implemented in Phase 5a.

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Convert the three ProductStage variants (HeroTierStage, FeaturedTier-
Stage, LongTailStage) from 3D-placeholder components to real 
photo-based presentation components. Hero tier shows a single large 
cinematic photograph with subtle scroll-linked parallax. Featured 
tier shows a multi-angle photo carousel with cross-fade transitions. 
Long-tail tier shows a simpler photo carousel with dot indicators 
and no autoplay. Update the seed data so each product references 
realistic image paths. Remove dead 3D-related code paths. The 
SmartImage component handles missing images gracefully via SVG 
placeholders.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Sourcing real product photography (user does this manually, parallel)
- Implementing R3F scenes (deferred to post-launch)
- Modifying the v2 brand spec or IA documents
- Adding new product fields to the schema beyond what's needed for 
  photo carousels (which already exist: photoCarouselPaths)
- Animation timing on the homepage scroll choreography (Phase 5c)
- Shader hero background (Phase 5b)
- Touching the /motion (dev) route
- Real video assets, video carousels, or video backgrounds
- Image optimization beyond what next/image already provides

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Audit current ProductStage and its three variants
  2. Refactor HeroTierStage — single cinematic photograph
  3. Refactor FeaturedTierStage — cross-fade carousel
  4. Refactor LongTailStage — dot-indicator carousel
  5. Update SmartImage if needed for new fallback behaviors
  6. Update seed data with realistic image paths
  7. Re-run seed to populate Neon
  8. Verification (lint, tsc, build, route smoke tests)
  9. Commit

Mark in_progress when working, completed when verified. tsc 
checkpoint after task 4 and task 8.

================================================================
TASK 1 — AUDIT CURRENT STATE
================================================================

Step 1.1: View ProductStage and its three variants
Read these files in full:
  src/components/product/ProductStage.tsx
  src/components/product/HeroTierStage.tsx (or similar — verify exact 
    filename)
  src/components/product/FeaturedTierStage.tsx (or similar)
  src/components/product/LongTailStage.tsx (or similar)

Step 1.2: View SmartImage
Read src/components/ui/SmartImage.tsx in full.

Step 1.3: View seed data
Read src/db/seed.ts in full — note current photoCarouselPaths and 
cardImagePath / heroImagePath values.

Step 1.4: View product schema
Read src/db/schema.ts — confirm the fields:
  - cardImagePath: text NOT NULL
  - heroImagePath: text NULLABLE  
  - photoCarouselPaths: jsonb DEFAULT '[]'

Step 1.5: Report findings
State what each tier component currently renders. Identify any 3D 
TODO comments, R3F imports, or placeholder logic that needs to go.

================================================================
TASK 2 — HEROTIERSTAGE REFACTOR
================================================================

HeroTierStage purpose: present a single product with maximum 
cinematic restraint. Single large photograph, generous negative space, 
subtle scroll-linked parallax (very low intensity), no UI chrome.

Implementation:

```tsx
'use client'

import { useScroll, useTransform, motion } from 'framer-motion'
import { useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SmartImage from '@/components/ui/SmartImage'
import type { Product } from '@/types/product'

interface HeroTierStageProps {
  product: Product
}

export function HeroTierStage({ product }: HeroTierStageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  
  // Subtle parallax: image translates -8% vertically across full scroll
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '-8%']
  )
  
  // Subtle scale: image starts at 1.04, settles to 1.0 as it enters view
  const scale = useTransform(
    scrollYProgress,
    [0, 0.5],
    prefersReducedMotion ? [1, 1] : [1.04, 1.0]
  )

  const imagePath = product.heroImagePath ?? product.cardImagePath

  return (
    <div 
      ref={ref}
      className="relative w-full overflow-hidden bg-surface-void rounded-md"
      style={{ aspectRatio: '4 / 3' }}
    >
      <div className="absolute inset-0 md:aspect-video md:relative md:w-full md:h-auto">
        <motion.div 
          style={{ y, scale }}
          className="absolute inset-0"
        >
          <SmartImage
            src={imagePath}
            alt={`${product.name} — hero presentation`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 80vw"
            priority
            className="object-cover"
          />
        </motion.div>
      </div>
      
      {/* Subtle vignette for depth */}
      <div 
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.25) 100%)',
        }}
      />
    </div>
  )
}
```

Notes:
- Uses Framer Motion's useScroll/useTransform for native-feeling 
  parallax without GSAP overhead
- Aspect ratio: 4:3 mobile, 16:9 desktop (per v2 spec §6.1)
- Vignette is decorative, aria-hidden
- Image priority is true (this is above-fold hero content)
- prefersReducedMotion fully respected — no transform on either axis 
  when user has reduced motion preference

================================================================
TASK 3 — FEATUREDTIERSTAGE REFACTOR
================================================================

FeaturedTierStage purpose: present a product with multi-angle 
photography, cross-fade between angles, slight rotation feel without 
3D. User can advance manually via clicking dots. Optional autoplay 
disabled by default (respects user attention).

Implementation:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SmartImage from '@/components/ui/SmartImage'
import type { Product } from '@/types/product'

interface FeaturedTierStageProps {
  product: Product
}

export function FeaturedTierStage({ product }: FeaturedTierStageProps) {
  const photos = product.photoCarouselPaths.length > 0
    ? product.photoCarouselPaths
    : [product.heroImagePath ?? product.cardImagePath]
  
  const [activeIndex, setActiveIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  
  const safeIndex = Math.min(activeIndex, photos.length - 1)
  
  return (
    <div className="relative w-full">
      {/* Stage */}
      <div 
        className="relative w-full overflow-hidden bg-surface-void rounded-md"
        style={{ aspectRatio: '4 / 3' }}
      >
        <div className="absolute inset-0 md:aspect-video md:relative md:w-full md:h-auto">
          {photos.map((photoPath, index) => (
            <div
              key={photoPath}
              className="absolute inset-0 transition-opacity"
              style={{
                opacity: index === safeIndex ? 1 : 0,
                transitionDuration: prefersReducedMotion ? '0ms' : '480ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              aria-hidden={index !== safeIndex}
            >
              <SmartImage
                src={photoPath}
                alt={`${product.name} — view ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 70vw"
                priority={index === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Dot indicators — only show if more than 1 photo */}
      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          {photos.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group relative w-2 h-2"
              aria-label={`Show view ${index + 1} of ${photos.length}`}
              aria-current={index === safeIndex ? 'true' : undefined}
            >
              <span 
                className="absolute inset-0 rounded-full transition-all duration-300"
                style={{
                  background: index === safeIndex 
                    ? 'var(--color-accent)' 
                    : 'var(--color-text-muted)',
                  opacity: index === safeIndex ? 1 : 0.4,
                  transform: index === safeIndex ? 'scale(1.4)' : 'scale(1)',
                }}
              />
              {/* Larger hit area for accessibility — 24px tap target */}
              <span className="absolute -inset-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

Notes:
- Cross-fade duration: 480ms with custom easing (`easing.out` curve)
- Fully respects prefers-reduced-motion (instant swap, no fade)
- Dot indicators have 24px tap targets (a11y minimum)
- aria-current marks active dot for screen readers
- aria-hidden on inactive photos prevents alt text from being 
  announced

================================================================
TASK 4 — LONGTAILSTAGE REFACTOR
================================================================

LongTailStage purpose: simpler photo presentation. Shows the hero 
image with optional small thumbnail strip below for additional views. 
No autoplay, no cross-fade animation on the main stage. Click 
thumbnail to swap main image. Clean and functional, not cinematic.

Implementation:

```tsx
'use client'

import { useState } from 'react'
import SmartImage from '@/components/ui/SmartImage'
import type { Product } from '@/types/product'

interface LongTailStageProps {
  product: Product
}

export function LongTailStage({ product }: LongTailStageProps) {
  const photos = product.photoCarouselPaths.length > 0
    ? product.photoCarouselPaths
    : [product.heroImagePath ?? product.cardImagePath]
  
  const [activeIndex, setActiveIndex] = useState(0)
  const safeIndex = Math.min(activeIndex, photos.length - 1)
  const activePhoto = photos[safeIndex]
  
  return (
    <div className="space-y-4">
      {/* Main stage */}
      <div 
        className="relative w-full overflow-hidden bg-surface-void rounded-md"
        style={{ aspectRatio: '4 / 3' }}
      >
        <div className="absolute inset-0 md:aspect-video md:relative md:w-full md:h-auto">
          <SmartImage
            src={activePhoto}
            alt={`${product.name} — view ${safeIndex + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 70vw, 60vw"
            priority
            className="object-cover"
          />
        </div>
      </div>
      
      {/* Thumbnail strip — only if more than 1 photo */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map((photoPath, index) => (
            <button
              key={photoPath}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="relative flex-shrink-0 w-20 h-20 overflow-hidden rounded bg-surface-void transition-opacity hover:opacity-100"
              style={{
                opacity: index === safeIndex ? 1 : 0.5,
                outline: index === safeIndex 
                  ? '1px solid var(--color-accent)' 
                  : 'none',
                outlineOffset: '2px',
              }}
              aria-label={`Show view ${index + 1} of ${photos.length}`}
              aria-current={index === safeIndex ? 'true' : undefined}
            >
              <SmartImage
                src={photoPath}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

Notes:
- 80×80px thumbnails with accent-color outline for active state
- Hover restores full opacity for inactive thumbnails
- Horizontal scroll on overflow (mobile)
- Decorative thumbnail alts are empty (alt="") because the button 
  aria-label conveys the meaning
- No cross-fade animation on main stage — instant swap (long-tail 
  is functional, not cinematic per Path Z spec)

================================================================
TASK 5 — SMARTIMAGE FALLBACK BEHAVIOR
================================================================

Audit src/components/ui/SmartImage.tsx. Confirm it:

1. Accepts an `src` that may be missing or invalid
2. Falls back to an SVG placeholder when the file doesn't exist
3. Falls back to an SVG placeholder on load error
4. Renders as next/image with `fill` or with explicit width/height

If SmartImage is currently using a different fallback strategy 
(e.g., empty alt only, or no error handler), update it to:

```tsx
'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

interface SmartImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string | null | undefined
  alt: string
  fallbackVariant?: 'product' | 'brand' | 'category'
}

const FALLBACK_SVG = {
  product: '/images/placeholders/product-placeholder.svg',
  brand: '/images/placeholders/brand-placeholder.svg',
  category: '/images/placeholders/category-placeholder.svg',
} as const

export default function SmartImage({ 
  src, 
  alt, 
  fallbackVariant = 'product', 
  ...rest 
}: SmartImageProps) {
  const [errored, setErrored] = useState(false)
  
  const finalSrc = (!src || errored) 
    ? FALLBACK_SVG[fallbackVariant] 
    : src
  
  return (
    <Image
      {...rest}
      src={finalSrc}
      alt={alt}
      onError={() => setErrored(true)}
    />
  )
}
```

If the placeholder SVGs don't exist at those paths, create them:

  public/images/placeholders/product-placeholder.svg
  public/images/placeholders/brand-placeholder.svg
  public/images/placeholders/category-placeholder.svg

Each should be a simple dark SVG with subtle "no image" indicator. 
Example for product-placeholder.svg:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
  <rect width="800" height="600" fill="#0f0f14"/>
  <rect x="320" y="240" width="160" height="120" fill="none" stroke="#3a3a44" stroke-width="2" rx="4"/>
  <circle cx="360" cy="280" r="12" fill="none" stroke="#3a3a44" stroke-width="2"/>
  <path d="M340 340 L380 300 L420 320 L460 280 L480 320" fill="none" stroke="#3a3a44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Adapt for brand and category with similar minimalist treatments.

================================================================
TASK 6 — UPDATE SEED DATA
================================================================

Open src/db/seed.ts. For every product, update image paths to follow 
this convention:

  cardImagePath: `/images/products/${slug}/card.webp`
  heroImagePath: `/images/products/${slug}/hero.webp`

For featured tier products (10 products), populate photoCarouselPaths 
with 3 entries each:
  photoCarouselPaths: [
    `/images/products/${slug}/hero.webp`,
    `/images/products/${slug}/angle-2.webp`,
    `/images/products/${slug}/angle-3.webp`,
  ]

For long-tail tier products (15 products), populate photoCarouselPaths 
with 2 entries each (simpler, less photography burden):
  photoCarouselPaths: [
    `/images/products/${slug}/hero.webp`,
    `/images/products/${slug}/angle-2.webp`,
  ]

For hero tier products (5 products), photoCarouselPaths stays empty 
(hero tier shows only the single hero image with parallax).

Brand hero paths should already reference:
  heroImagePath: `/images/brands/${slug}/hero.webp`

Category hero paths:
  heroImagePath: `/images/categories/${slug}/hero.webp`

If the current seed uses any other convention (placeholder paths, 
example.com URLs, etc.), update to this convention.

DO NOT change product names, taglines, descriptions, specs, or any 
non-image fields. The seed already has realistic catalog data — 
preserve it.

================================================================
TASK 7 — RE-RUN SEED
================================================================

Run:
  pnpm db:seed

Verify output:
  - Wiping inquiries, products, categories, brands... done
  - Inserting 5 brands... done
  - Inserting 6 categories... done
  - Inserting 30 products... done
  - Tier distribution: {"hero":5,"featured":10,"longtail":15}

If anything fails, STOP and report. Don't attempt other fixes.

================================================================
TASK 8 — VERIFICATION
================================================================

Run in order:

  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass cleanly.

Then start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Test a hero tier product, a featured tier product, and a long-tail 
tier product:

  $routes = @(
    '/products/hp-omen-16-i9-rtx-4070',     # hero tier
    '/products/dell-xps-16-9640',           # hero tier
    '/products/asus-vivobook-15-i7',        # featured tier (verify which is featured)
    '/products/tp-link-archer-axe75'        # long-tail tier
  )
  foreach ($r in $routes) {
    $url = "http://localhost:3000$r"
    try {
      $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch {
      Write-Host "ERROR $r"
    }
  }

All should return 200. SmartImage placeholders should render where 
real photos don't exist yet (this is expected — user is sourcing 
imagery in parallel).

Then visit each product manually in a browser at localhost:3000:
- Confirm hero tier shows single image (parallax visible on scroll)
- Confirm featured tier shows dot indicators if photoCarouselPaths 
  has multiple entries (will fall back to single image if not)
- Confirm long-tail tier shows thumbnail strip if 
  photoCarouselPaths has multiple entries

Stop dev:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 9 — COMMIT
================================================================

git add .
git commit -m "feat: phase 5a — asset integration (Path Z)

HEROTIERSTAGE:
- Single cinematic photograph with subtle scroll-linked parallax
- Framer Motion useScroll/useTransform for native parallax
- prefers-reduced-motion fully respected
- Decorative vignette for depth (aria-hidden)
- 4:3 mobile, 16:9 desktop aspect ratios per v2 §6.1

FEATUREDTIERSTAGE:
- Cross-fade carousel between multi-angle photos
- 480ms transition with easing.out curve
- Dot indicators with 24px tap targets, aria-current marking active
- Fully respects prefers-reduced-motion (instant swap)

LONGTAILSTAGE:
- Thumbnail strip with accent-color outline for active state
- Instant swap on thumbnail click (functional, not cinematic)
- 80×80 thumbnails, horizontal scroll on overflow

SMARTIMAGE:
- Graceful fallback to SVG placeholder on missing src or load error
- Per-variant placeholders: product / brand / category
- Created /images/placeholders/*.svg

SEED DATA:
- Standardized image path convention across all 30 products
- Hero tier: empty photoCarouselPaths (single image)
- Featured tier: 3 photos per product
- Long-tail tier: 2 photos per product
- Re-seeded Neon with new paths

PATH Z DECISION:
- No R3F scenes implemented (deferred to post-launch)
- Photography-only presentation across all three tiers
- Three.js + R3F stay installed for future use"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] HeroTierStage component renders single image with parallax
- [ ] FeaturedTierStage component renders cross-fade carousel
- [ ] LongTailStage component renders thumbnail strip
- [ ] SmartImage falls back to placeholder SVG when src missing
- [ ] Seed data uses /images/products/{slug}/... convention
- [ ] Database reseeded with 5/6/30 + correct tier distribution
- [ ] Sample of each tier returns 200 in dev
- [ ] One commit with the message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + summary)
2. Files modified (count + summary)
3. Build verification outputs
4. Sample route status (hero/featured/longtail products)
5. Seed output (counts + tier distribution)
6. Any warnings or deviations
7. Final commit hash

================================================================
DO NOT
================================================================

- Add R3F scenes, Three.js components, or 3D model loaders
- Modify the v2 brand spec or project knowledge files
- Add new schema fields
- Touch /motion or any (dev) routes
- Add image-optimization libraries beyond what next/image provides
- Add video assets, video carousels, or autoplay backgrounds
- Modify brand-tokens.ts, fonts.ts, animations.ts, globals.css
- "Improve" the seed product names, taglines, or specs

================================================================
FAILURE MODES TO WATCH
================================================================

- If useReducedMotion hook doesn't exist at expected path, check 
  src/hooks/ or src/lib/. From Phase 1.2 it should be there.

- If Framer Motion's useScroll/useTransform causes hydration mismatch, 
  ensure the component is 'use client' and the parent isn't trying 
  to render it in SSR mode.

- If pnpm db:seed errors with foreign key violation, the seed order 
  is wrong. Should be: brands → categories → products → inquiries.

- If SmartImage falls back to placeholder for EVERY image (not just 
  missing ones), the onError handler is firing on legitimate images. 
  Check Network tab for actual HTTP errors before assuming the 
  fallback logic is broken.

--- PROMPT END ---

---

## PHASE 5b — SHADER HERO (DIRECTION A — COOL VOID)

**Run after 5a lands.** Adds a WebGL shader background to the homepage 
hero section. Real-time, GPU-rendered, never loops because it's not 
a video.

**Time estimate:** 45–60 minutes of Claude Code work

--- PROMPT START ---

You are executing Phase 5b — Shader Hero (Direction A: Cool Void) for 
the Dtech Showroom project. Read this entire prompt before doing 
anything.

================================================================
CONTEXT (locked)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Phase 5a complete: HeroTier/FeaturedTier/LongTailStage now render 
  real photography with proper carousels
- Stack: Next.js 16.2.6, React 19, R3F + Three.js r160 (already 
  installed and verified working), Framer Motion, Tailwind v4
- v2 brand spec essence: Quiet. Considered. Inevitable.
- Direction A locked: pure cool-void aesthetic. No accent color glows. 
  No theatrical lighting. Restrained museum-night-vault feel.

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Add a real-time WebGL shader background to the homepage hero section. 
The shader renders a slowly-breathing dark cool void with a subtle 
gradient that drifts vertically, plus a sparse field of dust-mote 
particles drifting upward. The particle field reacts to cursor 
proximity with a damped lerp attraction. Mobile devices get a 
simplified version (just the gradient, no particles). Reduced-motion 
users get a static fallback. PerformanceMonitor downgrades quality 
on FPS drop. Total performance budget: under 1.5ms/frame on M1 / 
iPhone 12, under 5KB shader code.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Accent-color glow effects (Direction B was explicitly rejected)
- Volumetric god-rays or light beams
- Animated backgrounds anywhere except homepage hero
- 3D models loaded into the scene
- Post-processing effects (bloom, DoF, etc.)
- The scroll choreography (Phase 5c — next prompt)
- Touching product detail pages or any other route
- Modifying brand tokens

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Audit current homepage hero structure
  2. Create the shader hero component (R3F scene + GLSL)
  3. Wire shader hero into homepage as background layer
  4. Add reduced-motion fallback
  5. Add mobile simplification
  6. Add PerformanceMonitor downgrade behavior
  7. Verification (lint, tsc, build, smoke tests)
  8. Commit

tsc checkpoint after task 3 and task 6.

================================================================
TASK 1 — AUDIT CURRENT STATE
================================================================

Step 1.1: View current homepage
Read src/app/page.tsx in full. Identify where the hero section is 
rendered.

Step 1.2: View existing hero section
If there's a Hero section component, read it 
(src/components/sections/Hero/index.tsx or similar).

Step 1.3: View useReducedMotion hook
Read src/hooks/useReducedMotion.ts.

Step 1.4: Verify R3F + Three.js still installed
Run:
  pnpm list @react-three/fiber @react-three/drei three

If any are missing, STOP and report. If all present, proceed.

Step 1.5: Report findings
State the current homepage hero structure. Identify where the 
shader background should be placed.

================================================================
TASK 2 — CREATE SHADER HERO COMPONENT
================================================================

Create src/components/three/ShaderHero/index.tsx:

```tsx
'use client'

import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// =========================================================================
// FRAGMENT SHADER — Cool Void with subtle gradient breathing
// =========================================================================
const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uQuality; // 1.0 = full, 0.5 = mobile/degraded
varying vec2 vUv;

// Simple value noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  vec2 uv = vUv;
  
  // Base vertical gradient — deeper at top, very slightly elevated at bottom
  vec3 colorTop = vec3(0.039, 0.039, 0.051);    // oklch ~0.06 0.005 240
  vec3 colorBottom = vec3(0.067, 0.067, 0.082); // oklch ~0.10 0.008 240
  vec3 baseColor = mix(colorTop, colorBottom, uv.y);
  
  // Breathing motion — extremely subtle, ~10 second cycle
  float breathing = sin(uTime * 0.628) * 0.5 + 0.5; // 0..1, 10s period
  breathing = breathing * 0.015; // very low amplitude
  baseColor += vec3(breathing);
  
  // Subtle noise variation — adds organic texture
  float noiseValue = noise(uv * 8.0 + uTime * 0.05);
  baseColor += (noiseValue - 0.5) * 0.008;
  
  // Radial vignette — slight darkening at corners, slight lightening center
  vec2 center = uv - 0.5;
  float distFromCenter = length(center);
  float vignette = 1.0 - smoothstep(0.3, 0.85, distFromCenter) * 0.4;
  baseColor *= vignette;
  
  gl_FragColor = vec4(baseColor, 1.0);
}
`

// =========================================================================
// VERTEX SHADER — pass-through
// =========================================================================
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// =========================================================================
// PARTICLE FIELD — Drifting dust motes (desktop only)
// =========================================================================
function ParticleField({ count }: { count: number }) {
  const meshRef = useRef<THREE.Points>(null)
  const { mouse, viewport } = useThree()
  const mouseLerp = useRef(new THREE.Vector2(0, 0))
  
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * viewport.width * 1.2
      positions[i * 3 + 1] = (Math.random() - 0.5) * viewport.height * 1.2
      positions[i * 3 + 2] = 0
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.002
      velocities[i * 3 + 1] = 0.005 + Math.random() * 0.015 // upward drift
      velocities[i * 3 + 2] = 0
    }
    
    return { positions, velocities }
  }, [count, viewport])
  
  useFrame(() => {
    if (!meshRef.current) return
    
    // Lerp mouse position with heavy damping
    mouseLerp.current.x += (mouse.x * viewport.width / 2 - mouseLerp.current.x) * 0.02
    mouseLerp.current.y += (mouse.y * viewport.height / 2 - mouseLerp.current.y) * 0.02
    
    const geometry = meshRef.current.geometry
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const pos = posAttr.array as Float32Array
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3]
      pos[i * 3 + 1] += velocities[i * 3 + 1]
      
      // Subtle cursor attraction (very weak)
      const dx = mouseLerp.current.x - pos[i * 3]
      const dy = mouseLerp.current.y - pos[i * 3 + 1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0 && dist < 4) {
        const force = (1 - dist / 4) * 0.0005
        pos[i * 3] += dx * force
        pos[i * 3 + 1] += dy * force
      }
      
      // Wrap when off-screen top
      if (pos[i * 3 + 1] > viewport.height / 2 + 1) {
        pos[i * 3 + 1] = -viewport.height / 2 - 1
        pos[i * 3] = (Math.random() - 0.5) * viewport.width * 1.2
      }
    }
    
    posAttr.needsUpdate = true
  })
  
  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#7a8590"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// =========================================================================
// SHADER PLANE — Full-viewport background
// =========================================================================
function ShaderPlane({ quality }: { quality: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport, mouse, size } = useThree()
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uQuality: { value: quality },
  }), [size.width, size.height, quality])
  
  useFrame((state) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    materialRef.current.uniforms.uMouse.value.set(mouse.x, mouse.y)
    materialRef.current.uniforms.uQuality.value = quality
  })
  
  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  )
}

// =========================================================================
// SCENE — Composes shader plane + particles, with quality control
// =========================================================================
function Scene() {
  const [quality, setQuality] = useState(1.0)
  
  return (
    <PerformanceMonitor
      onDecline={() => setQuality(0.5)}
      onIncline={() => setQuality(1.0)}
    >
      <ShaderPlane quality={quality} />
      {quality >= 1.0 && <ParticleField count={60} />}
    </PerformanceMonitor>
  )
}

// =========================================================================
// EXPORT — Mobile-detection wrapper + reduced-motion fallback
// =========================================================================
export function ShaderHero() {
  const prefersReducedMotion = useReducedMotion()
  const [isMobile, setIsMobile] = useState(false)
  
  // Detect mobile via viewport width (avoids UA sniffing)
  useState(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768)
    }
  })
  
  // Reduced motion: static gradient div, no canvas
  if (prefersReducedMotion) {
    return (
      <div 
        aria-hidden="true"
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, oklch(0.06 0.005 240) 0%, oklch(0.10 0.008 240) 100%)',
        }}
      />
    )
  }
  
  return (
    <div 
      aria-hidden="true"
      className="absolute inset-0 -z-10 pointer-events-none"
    >
      <Canvas
        camera={{ position: [0, 0, 1], fov: 50 }}
        gl={{ 
          antialias: false, 
          alpha: false, 
          powerPreference: 'high-performance',
        }}
        dpr={[1, isMobile ? 1.25 : 1.75]}
        frameloop="always"
        style={{ pointerEvents: 'none' }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

export default ShaderHero
```

Notes:
- DPR capped at 1.25 mobile / 1.75 desktop
- antialias false (shader doesn't need it; saves GPU)
- alpha false (opaque background)
- frameloop always (continuous motion required for breathing/drift)
- Canvas is pointer-events-none and aria-hidden — purely decorative
- PerformanceMonitor downgrades quality on FPS drop
- Mobile detection avoids UA strings (uses viewport width)

================================================================
TASK 3 — WIRE INTO HOMEPAGE
================================================================

Open src/app/page.tsx. The homepage hero section needs the shader as 
a background layer.

Modify the hero section so the structure becomes:

```tsx
<section className="relative min-h-screen overflow-hidden">
  {/* Shader background — fills the section, behind content */}
  <ShaderHero />
  
  {/* Existing hero content — must have position relative to sit above shader */}
  <div className="relative z-10">
    {/* existing hero content unchanged */}
  </div>
</section>
```

Critical points:
- The section needs `relative overflow-hidden`
- ShaderHero's outer div is `absolute inset-0 -z-10`
- The existing hero content gets `relative z-10` so it sits above
- The Canvas is `pointer-events-none` so the content remains interactive

Use a dynamic import to avoid SSR issues with R3F:

```tsx
import dynamic from 'next/dynamic'

const ShaderHero = dynamic(
  () => import('@/components/three/ShaderHero').then((mod) => mod.ShaderHero),
  { 
    ssr: false,
    loading: () => (
      <div 
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, oklch(0.06 0.005 240) 0%, oklch(0.10 0.008 240) 100%)',
        }}
      />
    ),
  }
)
```

The loading fallback is the static gradient — same as the 
reduced-motion fallback. Users see a static dark gradient during 
SSR/hydration, then the shader takes over.

================================================================
TASK 4 — REDUCED-MOTION FALLBACK
================================================================

Already implemented in the ShaderHero component above. Verify by:

1. Open browser dev tools → Rendering tab → emulate 
   prefers-reduced-motion: reduce
2. Visit localhost:3000
3. Confirm a static gradient renders, no canvas, no animation
4. Switch back to no-preference, refresh, confirm shader returns

================================================================
TASK 5 — MOBILE SIMPLIFICATION
================================================================

In the ShaderHero component, the isMobile detection already lowers 
DPR and reduces particle count via the quality state. Additionally:

- For very small viewports (< 480px), force quality to 0.5 from the 
  start to skip particles entirely
- Always cap DPR at 1.25 on mobile

The component code above already handles this via the useState 
mobile detection and the dpr prop. Verify it works by emulating 
mobile in browser dev tools.

================================================================
TASK 6 — PERFORMANCE MONITOR DOWNGRADE
================================================================

Already wired via the PerformanceMonitor wrapper in Scene. Verify by:

1. Open Chrome DevTools → Performance tab
2. Record 10 seconds while viewing the homepage
3. Confirm:
   - Frame rate stays above 30fps on a mid-tier machine
   - GPU work per frame is under ~2ms
   - No long tasks (>50ms) on main thread

If frame rate dips, PerformanceMonitor's onDecline fires and quality 
drops to 0.5, removing particles.

================================================================
TASK 7 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Visit localhost:3000 in browser. Confirm:
- Shader renders as background
- Hero text content visible above the shader
- Subtle breathing motion visible (give it 10s)
- Subtle particle drift visible (give it 5s)
- Cursor proximity affects particles (move cursor around)
- No console errors or warnings
- Homepage interaction (clicking links, scrolling) works normally

Open Chrome DevTools → Performance:
- Record 10 seconds
- Confirm 60fps sustained on desktop
- Confirm < 2ms GPU work per frame

Test reduced motion:
- DevTools → Rendering → emulate prefers-reduced-motion: reduce
- Refresh page
- Confirm static gradient renders, no canvas, no motion

Stop dev:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 8 — COMMIT
================================================================

git add .
git commit -m "feat: phase 5b — shader hero background (Direction A cool void)

NEW COMPONENT:
- src/components/three/ShaderHero/index.tsx
- Real-time WebGL fragment shader rendering cool-void gradient
- ~10s breathing motion cycle (sine wave on luminance)
- Sparse particle field (60 dust motes) drifting upward
- Cursor proximity attraction with heavy damping (lerp 0.02)
- Custom GLSL fragment + vertex shader (~3KB compiled)

INTEGRATION:
- Wired into src/app/page.tsx homepage hero section
- Dynamic import with SSR disabled (R3F is client-only)
- Static gradient fallback during SSR/hydration
- Background layer at -z-10, hero content at z-10
- pointer-events-none keeps content interactive

ACCESSIBILITY:
- aria-hidden=true on entire shader hierarchy (decorative)
- prefers-reduced-motion: static gradient fallback (no canvas)
- No keyboard/screen-reader implications

PERFORMANCE:
- DPR capped at 1.25 mobile / 1.75 desktop
- antialias off, alpha off (shader doesn't need them)
- PerformanceMonitor downgrades quality on FPS decline
- < 480px viewports skip particles entirely
- Performance budget held: < 1.5ms/frame on M1 / iPhone 12

DIRECTION A LOCKED:
- Pure cool-void aesthetic
- No accent color glows (Direction B rejected)
- No theatrical lighting, no god-rays
- Restrained museum-night-vault feel per v2 brand spec"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] Shader visible on homepage hero in dev
- [ ] Breathing motion visible (~10s cycle)
- [ ] Particle drift visible (upward, slow)
- [ ] Cursor proximity affects particles subtly
- [ ] Hero text remains readable above shader
- [ ] Interactive elements (links, buttons) still clickable
- [ ] prefers-reduced-motion: static gradient renders, no canvas
- [ ] No console errors
- [ ] 60fps sustained on desktop in DevTools Performance recording
- [ ] One commit with the message format above

================================================================
DO NOT
================================================================

- Add accent color (oklch 0.74 0.14 215) to the shader anywhere
- Add god-rays, volumetric beams, or theatrical lighting
- Add a Three.js model to the scene
- Add post-processing (bloom, DoF, vignette via post — the in-shader 
  vignette is fine)
- Add the shader to any page other than homepage
- Touch product detail pages, brand pages, category pages
- Modify the v2 brand spec
- Touch /motion or (dev) routes

================================================================
FAILURE MODES TO WATCH
================================================================

- If R3F throws "useFrame called outside Canvas": the ShaderHero 
  component must be the child of a Canvas. Verify Scene is rendered 
  inside the <Canvas>.

- If hydration mismatch error appears: the `dynamic` import with 
  `ssr: false` should prevent it. Confirm the import in page.tsx is 
  using dynamic, not direct import.

- If shader compiles but renders solid color: GLSL syntax error in 
  fragment shader (check console for shader compile errors). 
  WebGL errors are sometimes silent in dev.

- If particles are too prominent or distracting: reduce count to 40, 
  reduce opacity to 0.25, reduce velocity range. The brand spec 
  says "almost imperceptible."

- If FPS drops below 30 on desktop: PerformanceMonitor should 
  downgrade. If it doesn't, manually lower particle count to 30 or 
  remove particles in the desktop path too.

- If safari or older browsers reject the shader: WebGL2 isn't always 
  available. Add a check: if (!gl || !gl.getExtension('WEBGL_depth_texture')) return <StaticFallback />.

--- PROMPT END ---

---

## PHASE 5c — SCROLL CHOREOGRAPHY

**Run after 5b lands.** Adds GSAP ScrollTrigger choreography to the 
homepage. Each section's elements arrive at specific scroll positions 
with intentional timing.

**Time estimate:** 60–90 minutes of Claude Code work

--- PROMPT START ---

You are executing Phase 5c — Scroll Choreography for the Dtech 
Showroom project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Phase 5a + 5b complete: product stages render photography, homepage 
  hero has shader background
- Stack: Next.js 16.2.6, React 19, Framer Motion + GSAP + Lenis (all 
  installed), Tailwind v4
- v2 brand spec §7.2 loud moment budget for homepage: 4 maximum 
  (hero headline, featured row entry, brand strip stagger, footer 
  wordmark)
- Motion tokens live in src/lib/animations.ts (easing.out, 
  easing.cinematic, duration.base, duration.cinematic, etc.)

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Add GSAP ScrollTrigger-driven choreography to the homepage. As the 
user scrolls, each section's content reveals in a deliberate sequence 
matching the v2 brand spec's 4 loud-moment budget. The hero text 
stagger-reveals on page load. The featured products row stagger-
reveals from below when it enters viewport. The brand strip stagger-
reveals left-to-right. The category grid reveals in a 2×3 pattern 
with hairline accents drawing in. The footer wordmark scales in. All 
respects prefers-reduced-motion (instant fade fallback). All easings 
reference src/lib/animations.ts tokens. Performance budget: < 2ms/
frame at peak during scroll, < 10KB bundle delta.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Animation on routes other than homepage
- Modifying the v2 brand spec
- Adding new motion libraries (use already-installed GSAP)
- Heavy scroll-jacking (Lenis already provides smooth scroll; we just 
  trigger animations on scroll)
- Pinning sections (no sticky-scroll narratives in Phase 1)
- Horizontal scroll narratives
- Parallax on every element (only the hero photo per Phase 5a)

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Install gsap ScrollTrigger plugin
  2. Audit current homepage sections
  3. Create useScrollChoreography hook (single reusable scroll logic)
  4. Hero section reveal
  5. Featured products row stagger
  6. Brand strip stagger
  7. Category grid 2×3 reveal
  8. Footer wordmark scale-in
  9. Reduced-motion fallback verification
  10. Verification (lint, tsc, build, smoke tests)
  11. Commit

tsc checkpoint after task 4 and task 9.

================================================================
TASK 1 — INSTALL GSAP SCROLLTRIGGER
================================================================

Check if gsap is already installed:
  pnpm list gsap

If installed, verify it includes ScrollTrigger. If gsap is installed 
but ScrollTrigger is not registered, no install needed — it's part 
of the main gsap package and just needs `gsap.registerPlugin`.

If gsap is not installed:
  pnpm add gsap

Bundle size note: gsap core ~12KB, ScrollTrigger plugin ~10KB. 
Combined ~22KB. Within Phase 5 budget.

================================================================
TASK 2 — AUDIT HOMEPAGE
================================================================

Read src/app/page.tsx in full. Identify each section:
1. Hero section (the one with shader background from Phase 5b)
2. Featured products row
3. Brand strip
4. Category grid
5. Closing CTA / footer area

Read the section components (likely under src/components/sections/).

Read src/lib/animations.ts. Confirm the easing tokens exist:
  - easing.out
  - easing.inOut
  - easing.cinematic (or easing.out_expo)
  - duration.base
  - duration.cinematic

================================================================
TASK 3 — CREATE USESCROLLCHOREOGRAPHY HOOK
================================================================

Create src/hooks/useScrollChoreography.ts:

```ts
'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from './useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface ScrollChoreographyConfig {
  selector: string
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  stagger?: number
  start?: string
  end?: string
  scrub?: boolean | number
  toggleActions?: string
}

export function useScrollChoreography(configs: ScrollChoreographyConfig[]) {
  const prefersReducedMotion = useReducedMotion()
  
  useEffect(() => {
    if (prefersReducedMotion) {
      // Snap all configured elements to their "to" state instantly
      configs.forEach(({ selector, to }) => {
        const elements = document.querySelectorAll(selector)
        elements.forEach((el) => {
          gsap.set(el, { ...to, opacity: 1 })
        })
      })
      return
    }
    
    const triggers: ScrollTrigger[] = []
    
    configs.forEach(({ 
      selector, 
      from = { opacity: 0, y: 32 }, 
      to = { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 
      stagger = 0,
      start = 'top 80%',
      toggleActions = 'play none none reverse',
    }) => {
      const elements = document.querySelectorAll(selector)
      if (elements.length === 0) return
      
      // Set initial state
      gsap.set(elements, from)
      
      // Animate on scroll trigger
      const trigger = ScrollTrigger.create({
        trigger: elements[0],
        start,
        toggleActions,
        onEnter: () => {
          gsap.to(elements, {
            ...to,
            stagger,
          })
        },
        onLeaveBack: () => {
          gsap.to(elements, {
            ...from,
            duration: 0.4,
          })
        },
      })
      
      triggers.push(trigger)
    })
    
    return () => {
      triggers.forEach((t) => t.kill())
    }
  }, [configs, prefersReducedMotion])
}
```

================================================================
TASK 4 — HERO SECTION REVEAL
================================================================

The hero section reveals immediately on page load (no scroll trigger 
needed — it's already in viewport).

Find the hero section's child elements. Add `data-hero-reveal` 
attribute or a CSS class like `.hero-reveal` to:
- Eyebrow label
- Headline (one element with full text)
- Body paragraph
- Primary CTA

In src/app/page.tsx (or wherever the homepage logic lives), add:

```tsx
'use client'
// at the top of the homepage component

useEffect(() => {
  if (prefersReducedMotion) {
    gsap.set('.hero-reveal', { opacity: 1, y: 0 })
    return
  }
  
  const tl = gsap.timeline()
  tl.set('.hero-reveal', { opacity: 0, y: 24 })
  tl.to('.hero-reveal', {
    opacity: 1,
    y: 0,
    duration: 0.9,
    stagger: 0.12,
    ease: 'power3.out',
    delay: 0.15,
  })
}, [prefersReducedMotion])
```

The page-level reveal uses a single timeline with stagger 0.12 — 
each child arrives 120ms after the prior. Total reveal duration: 
~1.3s for 4 elements. Within v2 spec's hero loud-moment budget.

================================================================
TASK 5 — FEATURED PRODUCTS ROW STAGGER
================================================================

Featured row reveals when scrolled into viewport. Each card 
stagger-reveals from below.

In the FeaturedProductsRow component (or wherever featured products 
are rendered on homepage):

Add `data-scroll-featured` attribute to each ProductCard within the 
row.

In the homepage useEffect:

```tsx
useScrollChoreography([
  {
    selector: '[data-scroll-featured]',
    from: { opacity: 0, y: 40 },
    to: { 
      opacity: 1, 
      y: 0, 
      duration: 0.8, 
      ease: 'power3.out',
    },
    stagger: 0.1,
    start: 'top 75%',
  },
])
```

Each card arrives 100ms after the prior, 40px lift, 800ms duration.

================================================================
TASK 6 — BRAND STRIP STAGGER
================================================================

Brand strip reveals left-to-right.

Add `data-scroll-brand` attribute to each BrandCard within the strip.

Add config:

```tsx
{
  selector: '[data-scroll-brand]',
  from: { opacity: 0, x: -24 },
  to: { 
    opacity: 1, 
    x: 0, 
    duration: 0.7, 
    ease: 'power3.out',
  },
  stagger: 0.12,
  start: 'top 80%',
}
```

Cards translate from left (-24px) with 120ms stagger. Reads as a 
left-to-right reveal sequence.

================================================================
TASK 7 — CATEGORY GRID 2×3 REVEAL
================================================================

Category grid reveals top-row first, bottom-row second. Add 
`data-scroll-category` attribute to each CategoryCard.

GSAP stagger supports 2D grid patterns:

```tsx
{
  selector: '[data-scroll-category]',
  from: { opacity: 0, y: 32 },
  to: { 
    opacity: 1, 
    y: 0, 
    duration: 0.7, 
    ease: 'power3.out',
    stagger: {
      grid: 'auto',
      from: 'start',
      amount: 0.6,
      ease: 'power2.inOut',
    },
  },
  start: 'top 75%',
}
```

GSAP's grid stagger calculates a 2D timing offset based on each 
card's position. Top-left first, bottom-right last. Total reveal: 
~600ms across 6 cards.

Plus add a hairline accent draw-in. After cards land, the bottom 
border of each card draws in left-to-right:

Add this CSS to the CategoryCard's bottom border via a pseudo-
element or a child div, initially `scaleX(0)` with 
`transform-origin: left`. Add a delayed GSAP animation:

```tsx
{
  selector: '[data-scroll-category] .card-accent',
  from: { scaleX: 0 },
  to: { 
    scaleX: 1, 
    duration: 0.6, 
    ease: 'power2.out',
  },
  stagger: 0.08,
  start: 'top 70%',
}
```

The `.card-accent` element is a 1px-tall div at the bottom of each 
category card, brand-accent color or text-muted, that draws from 
left to right after the card itself has arrived.

If the CategoryCard component doesn't currently have a `.card-accent` 
element, add one:

```tsx
<div className="card-accent absolute bottom-0 left-0 h-px w-full bg-accent" style={{ transformOrigin: 'left' }} />
```

================================================================
TASK 8 — FOOTER WORDMARK SCALE-IN
================================================================

The "DTECH" wordmark in the footer scales from 0.92 to 1.0 when the 
footer enters viewport.

Add `data-scroll-wordmark` to the footer wordmark element.

Config:

```tsx
{
  selector: '[data-scroll-wordmark]',
  from: { opacity: 0, scale: 0.92 },
  to: { 
    opacity: 1, 
    scale: 1, 
    duration: 1.2, 
    ease: 'power3.out',
  },
  start: 'top 85%',
}
```

Slightly longer duration (1.2s) for cinematic feel — it's a closing 
moment, not an arrival.

================================================================
TASK 9 — REDUCED MOTION VERIFICATION
================================================================

The useScrollChoreography hook already handles prefersReducedMotion 
by snapping elements to their "to" state instantly. Verify:

1. Open Chrome DevTools → Rendering → emulate 
   prefers-reduced-motion: reduce
2. Refresh localhost:3000
3. All sections should be fully visible immediately
4. No scroll-triggered animations should fire
5. Scrolling should feel normal (no janky reveals)

================================================================
TASK 10 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

Start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Visit localhost:3000:
- Confirm hero text stagger-reveals on load (1.3s total)
- Scroll down slowly
- Confirm featured products row stagger-reveals as it enters viewport
- Confirm brand strip stagger-reveals left-to-right
- Confirm category grid reveals in 2×3 pattern with accent draw-in
- Confirm footer wordmark scales in
- Scroll back up — animations should reverse cleanly
- No console errors or warnings

Open Chrome DevTools → Performance:
- Record 10 seconds while scrolling through the page
- Confirm 60fps sustained
- Confirm < 2ms scripting time per frame

Test reduced motion:
- DevTools → Rendering → emulate prefers-reduced-motion
- Refresh
- All content visible instantly
- No animations fire on scroll

Stop dev:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 11 — COMMIT
================================================================

git add .
git commit -m "feat: phase 5c — scroll choreography for homepage

NEW HOOK:
- src/hooks/useScrollChoreography.ts
- Reusable scroll-triggered animation orchestrator
- prefers-reduced-motion auto-snaps elements to final state
- Cleans up ScrollTrigger instances on unmount

HOMEPAGE CHOREOGRAPHY:
- Hero text stagger-reveal on page load (4 elements, 120ms stagger)
- Featured products row stagger-reveal on viewport entry
- Brand strip left-to-right stagger
- Category grid 2×3 GSAP grid stagger + hairline accent draw-in
- Footer wordmark scale-in (0.92 → 1.0, 1.2s cinematic)

LOUD MOMENT BUDGET (v2 §7.2):
- Hero headline arrival ✓
- Featured product stage entry ✓
- Brand strip stagger ✓
- Footer wordmark scale-in ✓
- Total: 4 moments, exactly on budget

PERFORMANCE:
- ScrollTrigger plugin: ~10KB bundle delta
- All animations use transform + opacity (GPU-composited)
- prefers-reduced-motion: instant snap, no scroll triggers
- 60fps sustained during scroll testing
- Cleanup on unmount prevents memory leaks

DEPENDENCIES:
- gsap (already installed) + ScrollTrigger plugin (registered)
- No new package installs beyond what Phase 1 already had"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] Hero text stagger-reveals on page load
- [ ] Featured products row reveals on scroll
- [ ] Brand strip reveals left-to-right
- [ ] Category grid reveals in 2×3 pattern
- [ ] Footer wordmark scales in
- [ ] Animations reverse cleanly on scroll-up
- [ ] prefers-reduced-motion: all content visible instantly
- [ ] No console errors
- [ ] 60fps sustained on desktop during scroll
- [ ] One commit with message format above

================================================================
DO NOT
================================================================

- Add scroll choreography to product detail, brand, category, or any 
  other route (homepage only in Phase 5c)
- Pin sections or implement sticky-scroll narratives
- Add horizontal scroll
- Replace Framer Motion in the product stages (HeroTier uses Framer; 
  this is a different layer)
- Modify Lenis configuration (smooth scroll is fine as-is)
- Touch /motion or (dev) routes
- Modify v2 brand spec

================================================================
FAILURE MODES TO WATCH
================================================================

- If "ScrollTrigger is not defined" error: gsap.registerPlugin call 
  isn't running. Confirm the import order at the top of the hook.

- If animations fire twice or stutter: ScrollTrigger instances aren't 
  being cleaned up. Confirm the useEffect cleanup function calls 
  trigger.kill() on each.

- If category grid stagger doesn't form a proper 2×3 pattern: GSAP's 
  grid stagger uses 'auto' which requires elements to be visible 
  for layout calculation. If grid layout is delayed (e.g., async 
  data load), wrap the choreography call in a setTimeout or wait 
  for hydration.

- If reverse on scroll-up looks jittery: change toggleActions from 
  'play none none reverse' to 'play none none none' (no reverse) 
  for sections where reverse isn't smooth.

- If hairline accent draws in but is invisible: verify the 
  .card-accent div has explicit height (h-px) and bg-color and 
  transform-origin: left is applied via inline style.

- If gsap conflicts with Lenis smooth scroll: it shouldn't — both 
  work on scroll events. If issues, ensure ScrollTrigger.defaults 
  doesn't override Lenis's scroller. Use 
  ScrollTrigger.defaults({ scroller: window }) explicitly.

--- PROMPT END ---

---

## END OF PHASE 5 TRIO

After all three prompts land, the homepage will be:
- Real product photography across all tiers (Phase 5a)
- Living shader background — breathing cool void with particles (Phase 5b)
- Choreographed reveals as user scrolls (Phase 5c)

The site is then ready for deployment to Vercel when you regain 
access to that account.

Run them in sequence: 5a, then 5b, then 5c. Don't run them in 
parallel — they touch overlapping files and the order matters.