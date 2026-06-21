You are executing a focused multi-issue patch session for the Dtech 
Showroom project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres, better-auth
- Phase 8.6 patch landed (logo integration + login conic animation 
  + navigation.search fix + middleware->proxy rename)
- This patch fixes 6 issues identified by the user during real-world 
  dev testing
- v2 brand spec is source of truth — accent is oklch(0.74 0.14 215)
- dtech.png exists at public/dtech.png (transparent background)
- User confirmed: ghani123 password is acceptable for now (will be
  strengthened later)
- This is a PATCH session, not a full phase

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Six fixes in one coherent patch: (1) Add Google OAuth via better-auth 
with admin-whitelist mechanism, (2) Build CLI seed script for initial 
admin user with interactive prompts, (3) Remove all hardcoded image 
paths from seed data so SmartImage placeholder renders cleanly 
without 404 noise, (4) Remove DTECH text wordmark from SiteHeader 
and SiteFooter (logo-only branding), (5) Increase Logo component 
size variants so the logo is visible and prominent, (6) Replace the 
login page's rotating conic-gradient wrapper with a static card plus 
a breathing cyan bar element below the card.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Google Cloud Console setup (user does this manually, separate guide)
- Cloudflare R2 setup (Phase 9 work)
- Resend setup (Phase 9 work)
- Image generation or upload (deferred — Dtech uploads via admin
  once R2 is configured)
- Phase 8.6 translation gap closure for flagged eyebrow strings
- Customer-facing site changes beyond logo/header
- Modifying v2 brand spec
- Modifying Phase 5 components (shader hero, scroll choreography)
- Modifying Phase 7 admin tool functionality
- Touching /motion or any (dev) routes
- Adding new translation keys
- Database schema changes beyond what auth requires
- Strengthening password requirements (relaxed to 8 chars for now)

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Install required dependencies (better-auth Google plugin if needed)
  2. Add Google OAuth provider to better-auth config
  3. Implement ADMIN_EMAILS whitelist mechanism
  4. Build pnpm db:seed-admin CLI script
  5. Relax password minimum from 12 to 8 chars
  6. Remove hardcoded image paths from seed data
  7. Re-run seed with new clean data
  8. Update SiteHeader: remove DTECH text, logo-only
  9. Update SiteFooter: remove DTECH text, logo-only (larger)
  10. Update Logo component: larger size variants
  11. Refactor login page: static card + breathing cyan bar below
  12. Add Google sign-in button to login page
  13. Verification (lint, tsc, build, smoke tests)
  14. Commit

tsc checkpoint after task 5 and task 10.

================================================================
TASK 1 — VERIFY DEPENDENCIES
================================================================

better-auth supports social providers natively via its plugin system. 
Verify the current setup:

  grep -rn "betterAuth" src/lib/auth.ts | head -5
  pnpm list better-auth

If a separate Google plugin package is required for the installed 
version, install it. Most better-auth versions ship Google support 
out of the box via the socialProviders config option — verify before 
adding packages.

If no new dependencies are needed, proceed to Task 2.

================================================================
TASK 2 — GOOGLE OAUTH IN BETTER-AUTH CONFIG
================================================================

Open src/lib/auth.ts. Find the betterAuth() configuration. Add the 
socialProviders block:

```typescript
import { betterAuth } from 'better-auth'
// ... existing imports

export const auth = betterAuth({
  // ... existing config preserved
  
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,  // RELAXED from 12
    requireEmailVerification: false,  // keep existing value if different
  },
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  
  // ... rest of config
})
```

Add the env var requirement note to README or inline comment but do 
not require the env vars to start the app (use ?? '' fallback so dev 
works even before OAuth is set up).

================================================================
TASK 3 — ADMIN WHITELIST MECHANISM
================================================================

The admin whitelist promotes specific emails to admin role on first 
sign-in. Implementation: better-auth lifecycle hook.

Open src/lib/auth.ts. Add a databaseHooks config:

```typescript
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)
}

export const auth = betterAuth({
  // ... other config
  
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const adminEmails = getAdminEmails()
          const userEmail = (user.email ?? '').toLowerCase()
          
          if (adminEmails.includes(userEmail)) {
            // Promote to admin
            await db
              .update(users)
              .set({ role: 'admin' })
              .where(eq(users.id, user.id))
            
            console.log(`[auth] Auto-promoted ${user.email} to admin (whitelisted)`)
          }
        },
      },
    },
  },
})
```

Verify the users table schema has a `role` column with admin values 
allowed. If it's an enum, ensure 'admin' is a valid value (it should 
be from Phase 7e).

If better-auth's databaseHooks API differs from this snippet (version 
differences), use the equivalent hook. The intent: after a user is 
created (either via email/password OR Google OAuth), check if their 
email is in the whitelist and promote if so.

Document the env var requirement in src/lib/auth.ts header comment:

```typescript
/**
 * Auth configuration for Dtech Showroom.
 * 
 * Required env vars:
 * - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET — for Google OAuth (optional in dev)
 * - ADMIN_EMAILS — comma-separated list of emails auto-promoted to admin
 *   Example: ADMIN_EMAILS=abdelghani.ague@gmail.com,other@example.com
 */
```

================================================================
TASK 4 — CLI SEED ADMIN SCRIPT
================================================================

Create a CLI script that creates the initial admin user. Useful when:
- ADMIN_EMAILS is set but the user hasn't signed in via Google yet
- The user wants email/password admin (not Google OAuth)
- Production deploy where the admin needs to exist before first login

Create scripts/seed-admin.ts:

```typescript
#!/usr/bin/env tsx
/**
 * Seed the initial admin user. Run with:
 *   pnpm db:seed-admin
 * 
 * Reads INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, INITIAL_ADMIN_PASSWORD
 * from .env.local. If any are missing, prompts interactively.
 * 
 * Creates the user with admin role. Skips silently if a user with 
 * the same email already exists.
 */

import 'dotenv/config'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Reload .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') })

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({ input, output })
  const suffix = defaultValue ? ` [${defaultValue}]` : ''
  const answer = await rl.question(`${question}${suffix}: `)
  rl.close()
  return answer.trim() || (defaultValue ?? '')
}

async function main() {
  console.log('━'.repeat(60))
  console.log('Dtech Showroom — Admin User Seed')
  console.log('━'.repeat(60))
  console.log('')
  
  // Read from env first, prompt if missing
  let email = process.env.INITIAL_ADMIN_EMAIL ?? ''
  let name = process.env.INITIAL_ADMIN_NAME ?? ''
  let password = process.env.INITIAL_ADMIN_PASSWORD ?? ''
  
  if (!email) email = await prompt('Email')
  if (!name) name = await prompt('Name')
  if (!password) password = await prompt('Password')
  
  if (!email || !name || !password) {
    console.error('✗ Email, name, and password are all required')
    process.exit(1)
  }
  
  if (password.length < 8) {
    console.error('✗ Password must be at least 8 characters')
    process.exit(1)
  }
  
  if (password.length < 12) {
    console.warn('⚠ WARNING: Password is shorter than 12 characters.')
    console.warn('  Consider using a stronger password for production.')
    console.warn('')
  }
  
  // Check if user already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0])
  
  if (existing) {
    console.log(`✓ User ${email} already exists (id: ${existing.id})`)
    if (existing.role !== 'admin') {
      await db
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, existing.id))
      console.log(`✓ Promoted ${email} to admin role`)
    } else {
      console.log(`✓ User is already admin`)
    }
    process.exit(0)
  }
  
  // Create user via better-auth sign-up flow
  console.log(`→ Creating admin user ${email}...`)
  
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        name,
        password,
      },
    })
    
    if (!result.user) {
      console.error('✗ Failed to create user:', result)
      process.exit(1)
    }
    
    // Promote to admin
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, result.user.id))
    
    console.log('')
    console.log('━'.repeat(60))
    console.log('✓ Admin user created successfully')
    console.log(`  Email:  ${email}`)
    console.log(`  Name:   ${name}`)
    console.log(`  Role:   admin`)
    console.log(`  ID:     ${result.user.id}`)
    console.log('━'.repeat(60))
    console.log('')
    console.log('Sign in at /login with the credentials above.')
    
    process.exit(0)
  } catch (err) {
    console.error('✗ Error creating admin:', err)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('✗ Unhandled error:', err)
  process.exit(1)
})
```

Add to package.json scripts:

```json
{
  "scripts": {
    "db:seed-admin": "tsx scripts/seed-admin.ts"
  }
}
```

Verify tsx is available; if not, install as dev dependency:
  pnpm add -D tsx

================================================================
TASK 5 — RELAX PASSWORD MINIMUM
================================================================

If password validation appears in multiple places, find them:
  grep -rn "minPasswordLength\|password.*length\|12.*character" src/ --include="*.ts" --include="*.tsx"

Update each to require 8 characters minimum (down from 12). Locations:
- src/lib/auth.ts — minPasswordLength: 8 (done in Task 2)
- src/lib/validations/auth.ts or similar Zod schema — z.string().min(8)
- Reset password / forgot password schemas if separate

The 12-char requirement may also live in user-facing error messages 
("Password must be at least 12 characters"). Update those too:
  grep -rn "12 character" src/ --include="*.tsx" --include="*.ts"

Same in messages/en.json and messages/fr.json if password rules are 
translated.

================================================================
TASK 6 — REMOVE HARDCODED IMAGE PATHS FROM SEED
================================================================

Open the seed script. Likely at db/seed.ts or scripts/seed.ts or 
db/seed/products.ts (find with):
  ls db/ scripts/
  grep -rn "cardImagePath\|heroImagePath" db/ scripts/ --include="*.ts"

For every product seed object, set:
- cardImagePath: ''
- heroImagePath: ''
(or null if the schema allows; check the column nullability)

Same for brands:
- heroImagePath: '' (or whatever the brand image field is called)
- logoImagePath: '' (if present)

Same for categories:
- heroImagePath: ''

The intent: SmartImage falls back to its placeholder when imagePath 
is empty/null. The 404 noise in the dev log stops. Dtech uploads 
real images via admin once R2 is configured.

After updating seed data, re-run seed:
  pnpm db:reset  (if this script exists, otherwise drop + push + seed manually)
  pnpm db:seed

Or if a more targeted approach is preferred (preserving non-image 
data), write a one-off script to NULL out the image paths:

```typescript
// scripts/clear-image-paths.ts
import { db } from '@/db/client'
import { products, brands, categories } from '@/db/schema'

async function main() {
  await db.update(products).set({ cardImagePath: '', heroImagePath: '' })
  await db.update(brands).set({ heroImagePath: '' })
  await db.update(categories).set({ heroImagePath: '' })
  console.log('Cleared all image paths')
}

main().catch(console.error).finally(() => process.exit(0))
```

Run once via `pnpm tsx scripts/clear-image-paths.ts`. Don't keep the 
script after running — delete it.

================================================================
TASK 7 — RE-RUN SEED OR PATCH DATA
================================================================

After Task 6, verify the data in DB:
  pnpm db:studio  (opens Drizzle Studio in browser)

Check 3-5 products, 2-3 brands, 2-3 categories: their image path 
columns should be empty strings or NULL. If still showing the old 
paths, the seed didn't re-run or the patch script wasn't executed.

================================================================
TASK 8 — SITEHEADER: REMOVE DTECH TEXT, LOGO ONLY
================================================================

Open src/components/layout/SiteHeader.tsx.

Find the wordmark area. After Phase 8.6 it should look like:

```tsx
<Link href="/" className="flex items-center gap-2">
  <Logo size="sm" priority />
  <span className="font-display text-xl ...">DTECH</span>
</Link>
```

Change to logo-only:

```tsx
<Link href="/" className="flex items-center" aria-label="Dtech home">
  <Logo size="md" priority />
</Link>
```

Note the size change from `sm` to `md` (Logo bigger now per Task 10).

Remove the DTECH text span entirely. Also remove the gap-2 (no gap 
needed without text). Add aria-label for screen readers since there's 
no visible text.

================================================================
TASK 9 — SITEFOOTER: REMOVE DTECH TEXT, LOGO ONLY (LARGER)
================================================================

Open src/components/layout/SiteFooter.tsx.

Find the brand area. Currently likely:

```tsx
<div className="flex items-center gap-3">
  <Logo size="sm" />
  <span className="font-display text-4xl md:text-6xl ...">DTECH</span>
</div>
```

Change to logo-only at larger size:

```tsx
<div className="flex items-center">
  <Logo size="lg" />
</div>
```

If the footer has the wordmark as the main visual anchor and removing 
it leaves the layout awkward, the larger logo (size lg, much bigger 
per Task 10) should fill the same visual weight.

================================================================
TASK 10 — INCREASE LOGO SIZE VARIANTS
================================================================

Open src/components/brand/Logo.tsx.

Current SIZE_MAP likely has small dimensions like w/h: 28/48/80. 
Increase these substantially:

```typescript
const SIZE_MAP = {
  sm: { width: 40, height: 40, className: 'h-10 w-10' },    // was 28
  md: { width: 64, height: 64, className: 'h-16 w-16' },    // was 48
  lg: { width: 120, height: 120, className: 'h-30 w-30' },  // was 80, footer-size
} as const
```

Note: Tailwind doesn't have h-30 native; use `h-[120px]` or define 
in tailwind.config. Easier: 

```typescript
const SIZE_MAP = {
  sm: { width: 40, height: 40, className: 'h-10' },
  md: { width: 64, height: 64, className: 'h-16' },
  lg: { width: 120, height: 120, className: 'h-[120px]' },
} as const
```

If the dtech.png is non-square (verify with sharp metadata as before), 
adjust width to maintain aspect ratio. For example, if dtech.png is 
800x300 (8:3 ratio):

```typescript
const SIZE_MAP = {
  sm: { width: 107, height: 40, className: 'h-10' },
  md: { width: 171, height: 64, className: 'h-16' },
  lg: { width: 320, height: 120, className: 'h-[120px]' },
} as const
```

After making the change, view the dev server and verify the logo is 
clearly visible. If too small still, bump sizes up. If too large, 
back off. The user wants "bigger and more visible" — err on the side 
of larger.

================================================================
TASK 11 — LOGIN PAGE REFACTOR
================================================================

Open the login page. Likely at src/app/login/page.tsx or 
src/app/login/LoginForm.tsx (the client component).

Current state from Phase 8.6:
- Card wrapped in conic-gradient rotating border
- @property --gradient-angle for smooth rotation
- 8s rotate + 4s breathe compound animations

Target state:
- Card is STATIC (no rotation, no border animation)
- Card has clean static border: 1px solid surface-overlay
- Below the card: a horizontal cyan bar that breathes
- Logo at top of card is larger (size="lg" now)

### Step 1: Remove conic-gradient wrapper

Find the wrapper element with the conic-gradient inline style. Remove 
the wrapper entirely. The card becomes its own root element:

```tsx
{/* Before */}
<div className="conic-border-wrapper" style={{ background: 'conic-gradient(...)', animation: 'conic-rotate ..., conic-breathe ...' }}>
  <div className="bg-surface-elevated px-8 py-10 rounded-lg">
    {/* card content */}
  </div>
</div>

{/* After */}
<div className="login-card-container">
  <div className="bg-surface-elevated border border-surface-overlay px-8 py-10 rounded-lg">
    {/* card content */}
  </div>
  <div className="breathing-bar" />
</div>
```

### Step 2: Update globals.css

Remove the conic-rotate and conic-breathe keyframes (if no longer 
used elsewhere). Remove the @property --gradient-angle if no longer 
used.

Add new keyframes for the breathing bar:

```css
@keyframes breathing-bar {
  0%, 100% {
    opacity: 0.35;
    box-shadow: 0 0 12px 2px oklch(0.74 0.14 215 / 0.4);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 32px 4px oklch(0.74 0.14 215 / 0.85);
  }
}

.breathing-bar {
  display: block;
  margin: 1.5rem auto 0;
  width: 60%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    oklch(0.74 0.14 215) 30%,
    oklch(0.74 0.14 215) 70%,
    transparent 100%
  );
  border-radius: 1px;
  animation: breathing-bar 3.5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .breathing-bar {
    animation: none;
    opacity: 0.6;
  }
}
```

This creates:
- A 2px high cyan bar 60% the width of the card
- Positioned below the card with 1.5rem margin
- Center-fades to transparent at edges (soft, not a hard line)
- Pulses opacity 0.35 ↔ 1.0 over 3.5 seconds
- Pulses box-shadow blur 12px ↔ 32px (the "glow" expansion)
- Respects prefers-reduced-motion

### Step 3: Verify the visual

After saving, navigate to /login in dev:
- Card should be static (no rotation, no border animation)
- Cyan bar should be visible below the sign-in button
- Bar should breathe slowly with cyan glow
- Logo at top of card should be visibly larger (size lg)
- Overall feel: calm, professional, "system heartbeat" indicator

================================================================
TASK 12 — GOOGLE SIGN-IN BUTTON
================================================================

Add a Google sign-in button to the login form. Position: above the 
email/password fields, with a divider showing "or continue with email" 
below it.

In the LoginForm component (likely client component):

```tsx
'use client'

import { authClient } from '@/lib/auth-client'

// In the component:
async function handleGoogleSignIn() {
  try {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/admin',
    })
  } catch (err) {
    toast.error('Google sign-in failed')
  }
}

// In JSX, before the email/password fields:
<div className="space-y-4">
  <button
    type="button"
    onClick={handleGoogleSignIn}
    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md border border-surface-overlay bg-surface-elevated hover:bg-surface-overlay/50 transition-colors font-body text-sm font-medium text-text-primary"
  >
    <GoogleIcon />
    Continue with Google
  </button>
  
  <div className="flex items-center gap-3">
    <div className="flex-1 h-px bg-surface-overlay" />
    <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
      or
    </span>
    <div className="flex-1 h-px bg-surface-overlay" />
  </div>
  
  {/* existing email/password form */}
</div>
```

Create the GoogleIcon as an inline SVG (don't add a new icon library):

```tsx
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
```

The Google icon is the official multi-color G logo per Google's brand 
guidelines for "Sign in with Google" buttons.

================================================================
TASK 13 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Critical verifications:

1. No more 404 noise from image paths:
  $res = Invoke-WebRequest -Uri "http://localhost:3000/en" -UseBasicParsing -TimeoutSec 10
  # Check the dev log output — should see NO "/images/products/.../card.webp 404" lines
  # If still appearing, the seed data wasn't reset; re-run the clear-image-paths script

2. Login page renders correctly:
  $res = Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 10
  Write-Host "Login: $($res.StatusCode)"
  if ($res.Content -match "dtech\.png") { Write-Host "✓ Logo present" }
  if ($res.Content -match "breathing-bar") { Write-Host "✓ Breathing bar present" }
  if ($res.Content -match "Continue with Google") { Write-Host "✓ Google button present" }
  if ($res.Content -notmatch "conic-rotate") { Write-Host "✓ Old conic animation removed" }

3. Header is logo-only (no DTECH text):
  $res = Invoke-WebRequest -Uri "http://localhost:3000/en" -UseBasicParsing -TimeoutSec 10
  # Inspect the rendered HTML manually for the header section
  # Should see Logo component, NOT the literal "DTECH" text as a wordmark

4. Database state — image paths cleared:
  pnpm exec drizzle-kit ... or use psql to query:
  SELECT slug, card_image_path, hero_image_path FROM products LIMIT 5;
  # All image path columns should be empty strings or NULL

5. Admin seed works:
  $env:INITIAL_ADMIN_EMAIL="abdelghani.ague@gmail.com"
  $env:INITIAL_ADMIN_NAME="Ghani"
  $env:INITIAL_ADMIN_PASSWORD="ghani123"
  pnpm db:seed-admin
  # Should print: "Admin user created successfully" with email/name/role

6. Sign in works:
  Navigate to /login in browser
  Enter abdelghani.ague@gmail.com / ghani123
  Should redirect to /admin successfully

Stop server:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 14 — COMMIT
================================================================

git add .
git commit -m "fix: google oauth + admin whitelist + logo-only header + breathing cyan bar

AUTH ENHANCEMENTS:

1. Google OAuth via better-auth socialProviders config
   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET env vars (optional in dev)
   - Sign-in button on login page above email/password fields
   - Official Google brand-compliant button styling

2. Admin whitelist mechanism via databaseHooks.user.create.after
   - ADMIN_EMAILS env var (comma-separated list)
   - Auto-promotes whitelisted emails to admin role on first sign-in
   - Works for both Google OAuth and email/password sign-ups

3. CLI seed admin script: pnpm db:seed-admin
   - Reads INITIAL_ADMIN_EMAIL, NAME, PASSWORD from .env.local
   - Prompts interactively if env vars missing
   - Idempotent: promotes existing users to admin, doesn't recreate
   - Warns on weak passwords (< 12 chars) but allows them

4. Password minimum relaxed from 12 to 8 characters
   - User explicitly accepted weaker password for current dev
   - Will be strengthened post-launch
   - Validation updated in auth config + Zod schemas + error messages

SEED DATA CLEANUP:

5. Removed hardcoded image paths from all seed entries:
   - 30 products: cardImagePath='', heroImagePath=''
   - 5 brands: heroImagePath=''
   - 6 categories: heroImagePath=''
   - Eliminates 404 image errors in dev log
   - SmartImage placeholder renders cleanly
   - Dtech uploads real images via admin once R2 is configured (Phase 9)

UI REFINEMENTS:

6. SiteHeader: logo-only (removed DTECH text wordmark)
   - aria-label preserves accessibility
   - Logo upgraded from size sm to size md for visibility

7. SiteFooter: logo-only (removed DTECH text wordmark)
   - Logo upgraded to size lg for visual anchor weight

8. Logo component: increased SIZE_MAP dimensions
   - sm: 28 → 40px
   - md: 48 → 64px
   - lg: 80 → 120px
   - More visible per user feedback

9. Login page: replaced rotating conic-gradient border with breathing cyan bar
   - Card returns to static appearance (no rotation, no animated border)
   - Static 1px border: surface-overlay color
   - New element below card: 2px horizontal cyan bar
   - Bar breathes opacity 0.35 ↔ 1.0 over 3.5s with box-shadow glow pulse
   - 60% width with edge fade for soft appearance
   - prefers-reduced-motion fallback: static at 0.6 opacity
   - Removed @property --gradient-angle (no longer used)
   - Removed conic-rotate and conic-breathe keyframes

VERIFICATION:
- pnpm lint, tsc, build all pass
- No 404 image errors in dev log
- Login page renders Google button, static card, breathing bar
- Header shows logo only, no text wordmark
- pnpm db:seed-admin creates admin successfully
- Sign-in flow works end-to-end

DEFERRED:
- Google Cloud Console setup (user does manually, separate guide)
- R2 bucket and image upload to production (Phase 9)
- Stronger admin password (post-launch security pass)"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes (both checkpoints)
- [ ] pnpm build succeeds
- [ ] Google OAuth provider configured in better-auth
- [ ] ADMIN_EMAILS whitelist mechanism works (verified by signing up 
      with a whitelisted email and confirming admin role assigned)
- [ ] pnpm db:seed-admin creates ghani admin successfully
- [ ] Password minimum is 8 characters everywhere
- [ ] All hardcoded image paths cleared from seed data
- [ ] DB state confirms image paths are empty/NULL
- [ ] SiteHeader shows logo only (no DTECH text)
- [ ] SiteFooter shows logo only (no DTECH text)
- [ ] Logo sizes increased per SIZE_MAP changes
- [ ] Login page: static card, breathing cyan bar below
- [ ] Google sign-in button present on login page
- [ ] No more 404 image errors in dev log
- [ ] Sign-in works end-to-end with ghani admin credentials
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (CLI seed script, possibly GoogleIcon component)
2. Files modified (auth config, seed data, header, footer, logo, 
   login page, globals.css, package.json)
3. Database operations performed (re-seed or clear-image-paths script)
4. Build verification outputs
5. Dev log snippet showing NO 404 image errors after changes
6. Confirmation that pnpm db:seed-admin successfully created the 
   admin user (paste the output)
7. Any deviations from spec
8. Final commit hash
9. Note any remaining manual steps the user needs to take (Google 
   Cloud Console setup will be mentioned in your final report)

================================================================
DO NOT
================================================================

- Modify v2 brand spec or accent color
- Add new dependencies beyond tsx (if needed for the seed script)
- Set up Google Cloud Console (user does this)
- Configure R2 (Phase 9)
- Generate or upload images
- Touch Phase 5 components (shader hero, scroll choreography)
- Touch Phase 7 admin tool beyond what's required for auth role hook
- Modify customer routes beyond header/footer changes
- Touch /motion or (dev) routes
- Strengthen password requirements (user explicitly accepted current state)
- Add or modify translation keys

================================================================
FAILURE MODES TO WATCH
================================================================

- If better-auth's socialProviders config differs in your version: 
  check pnpm list better-auth and consult docs. The pattern shown 
  matches better-auth >= 1.x. If you have an older version, the API 
  is different (Auth.js style).

- If databaseHooks API differs: the intent is "after user creation, 
  check whitelist and promote." Use whatever lifecycle hook the 
  installed better-auth version provides. If no such hook exists, 
  fall back to a wrapper around the sign-up flow.

- If the seed script can't import @/lib/auth: tsx + path aliases need 
  config. Check tsconfig.json paths; you may need to install 
  tsconfig-paths and use `tsx --tsconfig-paths` or similar.

- If clearing image paths via SQL UPDATE doesn't take effect: check 
  that you're connected to the right database (NEON_DATABASE_URL vs 
  local). Verify with `SELECT count(*) FROM products WHERE 
  card_image_path != '';` — should return 0 after clearing.

- If SmartImage still shows 404 errors: it's possible SmartImage has 
  a fallback path hardcoded somewhere. Check src/components/.../SmartImage.tsx 
  — the fallback should render a placeholder when no image is provided, 
  not attempt to load a default URL.

- If the breathing bar doesn't animate: confirm globals.css imports 
  and that the .breathing-bar class is applied correctly. Test with 
  browser DevTools — inspect the element, check computed styles for 
  the animation property.

- If the Google sign-in button shows but clicking it errors: this is 
  expected if Google Cloud Console isn't set up yet. The button works 
  visually; the OAuth flow itself requires the manual Cloud Console 
  step. Document this in the final report.

- If logo is now TOO big: tune SIZE_MAP values down slightly. The 
  spec is "bigger and more visible" — err larger but don't make it 
  comical.

- If the dev log STILL shows 404s after clearing seed: there may be 
  cached page data. Restart the dev server fully (Ctrl+C, pnpm dev 
  again) to bypass Next.js's RSC cache.

- If the seed admin script can't connect to the DB: check that .env.local 
  has DATABASE_URL set. The script uses dotenv config but the working 
  directory must be the project root when running `pnpm db:seed-admin`.

- If existing users in DB break the whitelist logic: the databaseHook 
  only fires on user CREATE. Users who already exist won't be auto-
  promoted. They need to be manually promoted via the seed script OR 
  via the admin UI by another admin.

================================================================
SEPARATE GUIDE: GOOGLE CLOUD CONSOLE SETUP
================================================================

In the final completion report, include this note for the user:

"Google OAuth requires Google Cloud Console setup that you do manually:

1. Visit https://console.cloud.google.com
2. Create a new project named 'Dtech Showroom'
3. In the project, navigate to APIs & Services > OAuth consent screen
4. Configure consent screen (External user type, fill in app name 
   'Dtech Showroom', user support email, developer contact email)
5. Navigate to APIs & Services > Credentials
6. Click 'Create Credentials' > 'OAuth client ID'
7. Application type: Web application
8. Name: 'Dtech Showroom Local Dev'
9. Authorized redirect URIs: http://localhost:3000/api/auth/callback/google
10. Click Create
11. Copy the Client ID and Client Secret
12. Add to .env.local:
    GOOGLE_CLIENT_ID=<paste>
    GOOGLE_CLIENT_SECRET=<paste>
    ADMIN_EMAILS=abdelghani.ague@gmail.com
13. Restart pnpm dev
14. Test by clicking 'Continue with Google' on /login

For production, add a second OAuth client with the production redirect 
URI (https://your-domain.com/api/auth/callback/google) and use 
separate env vars in the production environment."