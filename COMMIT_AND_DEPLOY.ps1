# =====================================================================
# D-Tech Showroom — clean commit + deploy bootstrap
#
# Run this from PowerShell in the project root:
#   cd C:\Users\abdel\Desktop\dtech-showroom
#   .\COMMIT_AND_DEPLOY.ps1
#
# It does, in order:
#   1. Verify git is clean and not locked.
#   2. Reset the index from HEAD (safety — the sandbox left this in a
#      sometimes-corrupt state on Windows-virtiofs interaction).
#   3. Stage the source/code/docs/messages/i18n work in groups, so any
#      single bad add is easy to spot.
#   4. Commit with a descriptive message covering this multi-round work.
#   5. Tell you what's next for hosting (Vercel) and remote (GitHub).
#
# It does NOT push, set up a remote, or change Vercel — those are
# decisions you should make explicitly.
# =====================================================================

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== 1. Pre-flight ===" -ForegroundColor Cyan

# Remove any stale lock from a crashed earlier git
if (Test-Path .git\index.lock) {
    Remove-Item .git\index.lock -Force
    Write-Host "  removed stale .git\index.lock"
}

# Set user identity if missing (uses your address)
$gitEmail = git config user.email 2>$null
if (-not $gitEmail) {
    git config user.email "abdelghani.ague@gmail.com"
    git config user.name  "Ghani"
    Write-Host "  set git user.email + user.name"
}

git status --short | Out-Null
Write-Host "  git OK"

Write-Host ""
Write-Host "=== 2. Reset the index from HEAD (safety) ===" -ForegroundColor Cyan
# This rebuilds the index from the last commit. It does NOT touch your
# working tree — your edits stay intact. It only clears any half-staged
# state the sandbox round may have left.
git read-tree HEAD
Write-Host "  index rebuilt from HEAD"

Write-Host ""
Write-Host "=== 3. Stage in groups ===" -ForegroundColor Cyan

Write-Host "  (a) modified + deleted tracked files..."
git add -u
Write-Host "      staged: $((git diff --cached --name-only | Measure-Object).Count)"

Write-Host "  (b) .gitignore (now ignores .build-sandbox/, .build-fresh/, etc.)..."
git add .gitignore

Write-Host "  (c) messages/  (i18n: fr / en / ar with newsletter strings)..."
git add messages/

Write-Host "  (d) docs/  (changelogs for editor expansion, newsletter, UI remake)..."
git add docs/

Write-Host "  (e) src/  (editor, themes, catalogue/guide, newsletter, UI restyle, fixes)..."
git add src/

Write-Host "  (f) root planning docs..."
git add PROJECT_STATE.md `
        d-tech-catalogue-produits.md `
        admin-remake-A1.md `
        admin-remake-monolithic.md `
        multi-issue-fix-patch.md

Write-Host "  (g) small public assets (no images — see note at end)..."
git add public/dtech.png
if (Test-Path public/fonts/helvetiker_bold.typeface.json) {
    git add public/fonts/helvetiker_bold.typeface.json
}

$staged = (git diff --cached --name-only | Measure-Object).Count
Write-Host "  total staged: $staged"

Write-Host ""
Write-Host "=== 4. Commit ===" -ForegroundColor Cyan

$msg = @"
feat: editor expansion + themes + catalogue guide + newsletter system + UI restyle

EDITOR
  - 20 new block types (heroImage, heroVideo, heroSplit, sectionHeader,
    team, tabs, steps, timeline, carousel, banner, contactForm,
    socialLinks, buttonGroup, accordion, counter, badge, progress,
    callout, code, embed)
  - per-block responsive show/hide flag (Bureau / Tablette / Mobile)
  - browser-chrome wrapper on the canvas (URL bar + traffic lights +
    device label) so the editor reads as the live site
  - drawer + guide CSS restored
  - Inspector "Visible sur" group

THEMES
  - 5 themes with truly distinct visual languages, not just color tokens:
      * Nightline   (glass dark)
      * Mediterranee (paper + Fraunces serif)
      * Onyx & Or   (luxe dark + gold edges + sharp 8px corners)
      * Studio Solaire (warm cream + 26px rounded + gradient pills)
      * Noir Editorial (monochrome + 0px corners + 4px hard shadow)
  - per-theme overrides for cards, buttons, headings, icons, forms

SIDEBAR + PERMISSIONS
  - Web Editor + Themes + Catalogue/Guide visible in admin sidebar
  - section keys: editor + newsletter added to SECTIONS + DEFAULT_STAFF_PERMISSIONS
  - permissions schema widened to accept editor + newsletter

NEWSLETTER / EMAIL MARKETING
  - DB: subscribers + campaigns + campaign_sends (idempotent ensure-schema)
  - mailer wrapper around Resend with dev-stub mode
  - confirmation + campaign envelope email templates (fr / en / ar)
  - public signup form with honeypot + rate-limit (5/h/IP) + RTL
  - confirm + unsubscribe token-driven pages
  - admin: subscribers list with filter chips + search + CSV export
  - admin: campaigns CRUD with editor + preview + send + test-send
  - tracking pixel + click-tracking endpoints

UI RESTYLE
  - warm cream canvas + dark teal sidebar (WBP-hazel style)
  - vibrant per-section accent chips
  - light-mode rewrite (off the previous glass) for admin

TS / BUILD FIXES (this round)
  - SectionTitle is a label, not a hero — campaigns + subscribers pages
    now use inline header blocks
  - render-context.ts: null guard on path.split('.')[0]
  - NewsletterSignup useActionState generic widened to | null
  - validations/user.ts permissions enum widened (newsletter, editor)
  - email-templates LOCALE_STRINGS now has a guaranteed default record
  - typecheck: 0 errors. next build: success.

NOT INCLUDED (intentional)
  - public/images/{brands,categories,products}/  (hundreds of new
    directories — too big to commit safely in one go from the sandbox
    side; commit separately when ready)
  - Photos/ , Dtech*.zip , .build-sandbox/ , .design-handoff/ ,
    .build-fresh/   (now in .gitignore)
"@

git commit -m $msg
$hash = git rev-parse --short HEAD
Write-Host ""
Write-Host "  COMMITTED: $hash" -ForegroundColor Green

Write-Host ""
Write-Host "=== 5. Next steps for deploy ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  REMOTE  — no remote is configured. Once you create a GitHub repo:"
Write-Host '    git remote add origin git@github.com:<you>/dtech-showroom.git'
Write-Host '    git push -u origin master'
Write-Host ""
Write-Host "  VERCEL  — no vercel.json / .vercel found. To deploy:"
Write-Host '    1. push to GitHub'
Write-Host '    2. import the repo at https://vercel.com/new'
Write-Host '    3. set framework: Next.js (auto-detected)'
Write-Host '    4. add env vars (copy from .env.local):'
Write-Host '         DATABASE_URL'
Write-Host '         BETTER_AUTH_SECRET'
Write-Host '         BETTER_AUTH_URL          (https://<your-domain>)'
Write-Host '         NEXT_PUBLIC_SITE_URL     (https://<your-domain>)'
Write-Host '         RESEND_API_KEY'
Write-Host '         UPSTASH_REDIS_REST_URL   (optional, for newsletter rate-limit)'
Write-Host '         UPSTASH_REDIS_REST_TOKEN'
Write-Host '         R2_*                     (if using Cloudflare R2 for images)'
Write-Host '    5. attach domain  d-techalgerie.com  in Vercel project settings'
Write-Host ""
Write-Host "  IMAGES  — to commit the new product/brand/category images later:"
Write-Host '    git add public/images/'
Write-Host '    git commit -m "assets: brand + category + product images"'
Write-Host ""
Write-Host "Done." -ForegroundColor Green
