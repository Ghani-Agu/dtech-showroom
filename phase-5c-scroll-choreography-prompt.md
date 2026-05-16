You are executing Phase 5c — Scroll Choreography for the Dtech 
Showroom project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 5a complete (commit b9e34e1): three product tier stages 
  render real photo-based presentation with SmartImage fallbacks
- Phase 5b complete (commit df220c4): shader hero with cool-void 
  background, particles, breathing motion, reduced-motion fallback
- v2 brand spec is the source of truth for design and structural 
  decisions
- v2 §7.2 loud moment budget for homepage: 4 maximum (hero headline, 
  featured row entry, brand strip stagger, footer wordmark)
- Motion tokens live in src/lib/animations.ts (easing.out, 
  duration.base, duration.cinematic, etc.)
- gsap is already installed (Phase 1.0)
- This is a real client engagement with Dtech, not a pitch demo. 
  Code quality bar is production-real, not demo-grade.

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Add GSAP ScrollTrigger-driven choreography to the homepage. As the 
user scrolls, each section's content reveals in a deliberate sequence 
matching v2 spec's 4 loud-moment budget. Hero text stagger-reveals on 
page load. Featured products row stagger-reveals from below when it 
enters viewport. Brand strip stagger-reveals left-to-right. Category 
grid reveals in 2×3 pattern with hairline accent draw-in. Footer 
wordmark scales in. All respects prefers-reduced-motion (instant 
fade fallback). All easings reference src/lib/animations.ts tokens. 
Performance budget: < 2ms/frame at peak during scroll, < 15KB bundle 
delta for ScrollTrigger plugin.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Animation on routes other than homepage (product detail, brand 
  landing, category landing, etc. stay as they are)
- Modifying the v2 brand spec
- Adding new motion libraries (use already-installed gsap)
- Heavy scroll-jacking (Lenis already provides smooth scroll; we 
  just trigger animations on scroll events)
- Pinning sections (no sticky-scroll narratives in Phase 1)
- Horizontal scroll narratives
- Parallax on every element (HeroTierStage already has parallax 
  from Phase 5a; we don't add more)
- Replacing Framer Motion in the product stages (Phase 5a uses 
  Framer for parallax; this is a different layer)

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Verify gsap installation, register ScrollTrigger
  2. Audit current homepage sections + section components
  3. Create useScrollChoreography hook
  4. Hero section reveal (page load, no scroll trigger)
  5. Featured products row stagger (scroll trigger)
  6. Brand strip left-to-right stagger (scroll trigger)
  7. Category grid 2×3 reveal + hairline accent draw-in (scroll trigger)
  8. Footer wordmark scale-in (scroll trigger)
  9. Reduced-motion fallback verification
  10. Verification (lint, tsc, build, smoke tests)
  11. Commit

tsc checkpoint after task 4 and task 9.

================================================================
TASK 1 — VERIFY GSAP INSTALLATION
================================================================

Run:
  pnpm list gsap

Expected: gsap is installed. ScrollTrigger is part of the main gsap 
package — no separate install required, only `gsap.registerPlugin` 
at runtime.

If gsap is NOT installed (unexpected):
  pnpm add gsap

Bundle size confirmation: gsap core ~12KB, ScrollTrigger plugin 
~10KB. Combined ~22KB. Within budget.

================================================================
TASK 2 — AUDIT HOMEPAGE
================================================================

Step 2.1: Read src/app/page.tsx in full
Identify each section in order:
  1. Hero section (already has ShaderHero background from Phase 5b)
  2. Featured products row
  3. Brand strip
  4. Category grid
  5. Closing CTA / footer area

Step 2.2: Read the section components
Look under src/components/sections/ — read each relevant component 
in full to identify the elements that need data-attribute hooks for 
choreography.

Step 2.3: Read src/lib/animations.ts
Confirm the easing tokens exist:
  - easing.out (or whatever it's named)
  - duration.base, duration.cinematic, etc.

If the GSAP-compatible easing strings need translation (Framer uses 
cubic-bezier arrays, GSAP uses string names like 'power3.out'), 
note the mapping. Standard mapping:
  [0.16, 1, 0.3, 1]  → 'power3.out'
  [0.65, 0, 0.35, 1] → 'power2.inOut'
  [0.19, 1, 0.22, 1] → 'expo.out'

Step 2.4: Read src/hooks/useReducedMotion.ts
Confirm it returns a boolean.

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

export interface ScrollChoreographyConfig {
  selector: string
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  stagger?: number | gsap.StaggerVars
  start?: string
  end?: string
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
      
      // Set initial state immediately (prevents flash)
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
    
    // Refresh on layout changes
    ScrollTrigger.refresh()
    
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
— it's already in viewport).

Step 4.1: Identify the hero section's child elements
In the homepage hero (src/app/page.tsx or its hero section component), 
add `data-hero-reveal` attribute to:
- Eyebrow label ("DTECH ALGÉRIE · EST. 2006")
- Headline ("Hardware, presented properly.")
- Body paragraph (the "A curated catalog..." text)
- Primary CTA ("Browse the catalog →")

Step 4.2: Add the page-load timeline
The homepage component needs to be a 'use client' boundary for this 
to work. If it currently isn't (i.e., it's a Server Component), 
extract just the hero reveal logic into a small client component, 
e.g., src/components/sections/Hero/HeroReveal.tsx, that wraps the 
reveal-tagged elements or runs the useEffect:

```tsx
'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function HeroRevealOrchestrator() {
  const prefersReducedMotion = useReducedMotion()
  
  useEffect(() => {
    if (prefersReducedMotion) {
      gsap.set('[data-hero-reveal]', { opacity: 1, y: 0 })
      return
    }
    
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.set('[data-hero-reveal]', { opacity: 0, y: 24 })
      tl.to('[data-hero-reveal]', {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.15,
      })
    })
    
    return () => ctx.revert()
  }, [prefersReducedMotion])
  
  return null // No DOM output; this is pure orchestration
}
```

Render `<HeroRevealOrchestrator />` once at the top of the homepage. 
It selects elements by data-attribute, so it doesn't need to wrap 
them.

The page-level reveal uses a single timeline with stagger 0.12 — 
each child arrives 120ms after the prior. Total reveal duration: 
~1.3s for 4 elements. Within v2 spec's hero loud-moment budget.

gsap.context() ensures all created animations are tracked and 
properly cleaned up when the component unmounts (prevents 
animation leaks across navigations).

================================================================
TASK 5 — FEATURED PRODUCTS ROW STAGGER
================================================================

Featured row reveals when scrolled into viewport. Each card 
stagger-reveals from below.

Step 5.1: Add data attribute to featured product cards
Find the featured products row component (likely 
src/components/sections/FeaturedProducts/index.tsx or similar). 
Add `data-scroll-featured` attribute to each ProductCard within 
the row.

Step 5.2: Wire up the choreography
Create a client component that runs the choreography. Since 
multiple sections need it, the cleanest pattern is one 
HomepageChoreography client component:

Create src/components/sections/HomepageChoreography.tsx:

```tsx
'use client'

import { useScrollChoreography } from '@/hooks/useScrollChoreography'

export function HomepageChoreography() {
  useScrollChoreography([
    // Featured products
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
    // Brand strip cards
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
    },
    // Category cards (2×3 grid)
    {
      selector: '[data-scroll-category]',
      from: { opacity: 0, y: 32 },
      to: { 
        opacity: 1, 
        y: 0, 
        duration: 0.7, 
        ease: 'power3.out',
      },
      stagger: {
        grid: 'auto',
        from: 'start',
        amount: 0.6,
        ease: 'power2.inOut',
      },
      start: 'top 75%',
    },
    // Category card accents (hairline draw-in)
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
    },
    // Footer wordmark
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
    },
  ])
  
  return null
}
```

Render `<HomepageChoreography />` once at the top of the homepage 
alongside HeroRevealOrchestrator. Both are pure orchestrators with 
no DOM output.

================================================================
TASK 6 — BRAND STRIP STAGGER
================================================================

Already covered in Task 5's HomepageChoreography config. Now just 
need to ensure the data attribute is on the right elements.

Find the brand strip component (likely 
src/components/sections/BrandStrip/index.tsx or BrandsRow). Add 
`data-scroll-brand` attribute to each BrandCard within the strip.

If brand cards are rendered via map, the attribute goes on the 
mapped element:

```tsx
{brands.map((brand) => (
  <BrandCard key={brand.id} brand={brand} data-scroll-brand />
))}
```

If BrandCard's outer element doesn't accept extra attributes, 
wrap or update the component to spread additional props onto 
its root element.

================================================================
TASK 7 — CATEGORY GRID + HAIRLINE ACCENT
================================================================

Step 7.1: Add data-scroll-category to each CategoryCard
Find the category grid component. Same pattern as brand strip.

Step 7.2: Add card-accent element to CategoryCard
The CategoryCard component needs a thin accent line at the bottom 
that draws in left-to-right after the card itself arrives.

In src/components/cards/CategoryCard/index.tsx (or wherever it 
lives), add a child element at the bottom of the card:

```tsx
<article className="... relative ...">
  {/* existing card content */}
  
  <div 
    className="card-accent absolute bottom-0 left-0 h-px w-full bg-accent" 
    style={{ transformOrigin: 'left' }}
    aria-hidden="true"
  />
</article>
```

Key requirements:
- `position: absolute` at bottom of card
- 1px height (`h-px`)
- Full width
- `bg-accent` color from brand tokens
- `transform-origin: left` so the scaleX draws from left edge
- aria-hidden (decorative)

The GSAP config in Task 5 animates `scaleX` from 0 to 1 with 60ms 
stagger across the cards.

================================================================
TASK 8 — FOOTER WORDMARK SCALE-IN
================================================================

Step 8.1: Add data-scroll-wordmark to the footer wordmark
Find src/components/layout/SiteFooter.tsx (or similar). The "DTECH" 
wordmark in the footer needs the attribute:

```tsx
<span 
  className="font-mono text-2xl tracking-wider"
  data-scroll-wordmark
>
  DTECH
</span>
```

Already covered in Task 5's HomepageChoreography config. 1.2s 
cinematic duration, scale 0.92 → 1.0.

Caveat: this animation only fires on the homepage (because 
HomepageChoreography only renders there). The footer wordmark will 
appear instantly on other pages. This is correct — the cinematic 
scale-in is a "closing moment" reserved for the homepage scroll 
narrative.

================================================================
TASK 9 — REDUCED MOTION VERIFICATION
================================================================

The useScrollChoreography hook already handles prefers-reduced-motion 
by snapping elements to their "to" state instantly. The 
HeroRevealOrchestrator does the same.

Verify by:

1. Open Chrome DevTools → Rendering → emulate 
   prefers-reduced-motion: reduce
2. Refresh localhost:3000
3. All hero content should be fully visible immediately on page load
4. Scrolling down: all sections should already be in their final 
   state (no scroll-triggered animations)
5. Scrolling should feel normal (no janky reveals)

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

Test homepage:
  $res = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 10
  Write-Host "$($res.StatusCode) /"

Should return 200. Then manually verify in browser at 
http://localhost:3000:

- Page loads → hero text stagger-reveals over ~1.3s
- Scroll down slowly → featured products row stagger-reveals as 
  cards enter viewport
- Continue scrolling → brand strip stagger-reveals left-to-right
- Continue scrolling → category grid reveals in 2×3 pattern, 
  hairline accents draw in after each card
- Continue scrolling → footer wordmark scales in
- Scroll back to top → animations reverse cleanly
- No console errors or warnings
- No layout shift during animations

Open Chrome DevTools → Performance:
- Record 10 seconds while scrolling
- Confirm 60fps sustained
- Confirm < 2ms scripting time per frame

Test reduced motion:
- DevTools → Rendering → emulate prefers-reduced-motion
- Refresh
- All content visible instantly
- No animations fire on scroll

Stop dev:
  Stop-Job $job; Remove-Job $job

Also verify regression — check that previously-working routes still 
return 200:
  $existing = @('/', '/brands', '/brands/hp', '/categories', '/products/hp-omen-16-i9-rtx-4070')
  foreach ($r in $existing) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch {
      Write-Host "ERROR $r"
    }
  }

================================================================
TASK 11 — COMMIT
================================================================

git add .
git commit -m "feat: phase 5c — scroll choreography for homepage

NEW HOOK:
- src/hooks/useScrollChoreography.ts
- Reusable scroll-triggered animation orchestrator
- prefers-reduced-motion auto-snaps elements to final state
- Cleans up ScrollTrigger instances on unmount via gsap.context()

NEW COMPONENTS:
- src/components/sections/HeroRevealOrchestrator.tsx — page-load 
  hero text stagger
- src/components/sections/HomepageChoreography.tsx — scroll-triggered 
  reveals for featured/brand/category/footer

HOMEPAGE CHOREOGRAPHY:
- Hero text stagger-reveal on page load (4 elements, 120ms stagger, 
  900ms each)
- Featured products row stagger-reveal on viewport entry
- Brand strip left-to-right stagger
- Category grid 2×3 GSAP grid stagger + hairline accent draw-in
- Footer wordmark scale-in (0.92 → 1.0, 1200ms cinematic)

CATEGORY CARD ACCENT:
- Added card-accent div to CategoryCard (1px bottom border)
- transform-origin: left for left-to-right scaleX animation

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
- Cleanup on unmount prevents memory leaks (gsap.context)

DEPENDENCIES:
- gsap (already installed from Phase 1.0) + ScrollTrigger plugin
- No new package installs"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] Hero text stagger-reveals on page load
- [ ] Featured products row reveals on scroll
- [ ] Brand strip reveals left-to-right
- [ ] Category grid reveals in 2×3 pattern with hairline accents
- [ ] Footer wordmark scales in
- [ ] Animations reverse cleanly on scroll-up
- [ ] prefers-reduced-motion: all content visible instantly
- [ ] No console errors
- [ ] 60fps sustained on desktop during scroll
- [ ] No regression on existing routes
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + summary)
2. Files modified (count + summary, including which sections got 
   data-scroll-* attributes)
3. Build verification outputs
4. Homepage smoke test result
5. Regression smoke tests on existing routes
6. Any warnings or deviations from spec
7. Final commit hash

================================================================
DO NOT
================================================================

- Add scroll choreography to product detail, brand landing, 
  category landing, or any other route (homepage only)
- Pin sections or implement sticky-scroll narratives
- Add horizontal scroll
- Replace Framer Motion in HeroTierStage (Phase 5a's parallax is 
  separate from this layer)
- Modify Lenis configuration (smooth scroll is fine as-is)
- Touch /motion or (dev) routes
- Modify v2 brand spec
- Add new packages beyond using gsap which is already installed
- Modify brand-tokens.ts, fonts.ts, animations.ts, globals.css

================================================================
FAILURE MODES TO WATCH
================================================================

- If "ScrollTrigger is not defined" error: gsap.registerPlugin call 
  isn't running. Confirm the import + registerPlugin at top of the 
  hook file.

- If animations fire twice or stutter: ScrollTrigger instances 
  aren't being cleaned up. Confirm useEffect cleanup function calls 
  trigger.kill() on each, AND that gsap.context() is being used in 
  HeroRevealOrchestrator.

- If category grid stagger doesn't form a proper 2×3 pattern: GSAP's 
  grid stagger uses 'auto' which requires elements to be visible 
  for layout calculation. If grid layout is delayed (e.g., async 
  data load), wrap the choreography call in a setTimeout or call 
  ScrollTrigger.refresh() after layout settles.

- If reverse on scroll-up looks jittery: change toggleActions from 
  'play none none reverse' to 'play none none none' (no reverse) 
  for sections where reverse isn't smooth.

- If hairline accent draws in but is invisible: verify the 
  .card-accent div has explicit `h-px` AND `bg-accent` AND 
  `transform-origin: left` (this must be inline style, not Tailwind, 
  because Tailwind's transform-origin utilities don't cover 'left' 
  by default in all versions).

- If gsap conflicts with Lenis smooth scroll: it shouldn't — both 
  work on scroll events. If issues, ensure ScrollTrigger.defaults 
  doesn't override Lenis's scroller. May need 
  ScrollTrigger.defaults({ scroller: window }) explicitly.

- If page becomes Server Component / Client Component boundary issue: 
  the HomepageChoreography and HeroRevealOrchestrator are both 
  'use client', so the parent page.tsx can stay Server Component 
  and just render these as children.

- If Vercel Analytics or SpeedInsights conflict with ScrollTrigger 
  (unlikely): no known issue, but if seen, check console for 
  hydration warnings.

- If existing data attributes conflict (e.g., `data-scroll-featured` 
  already used elsewhere): use unique prefix like `data-dt-scroll-
  featured` instead. Audit before adding.