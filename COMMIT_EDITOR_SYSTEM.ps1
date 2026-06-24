<#
  COMMIT_EDITOR_SYSTEM.ps1
  -----------------------------------------------------------------------------
  Commits & pushes ONLY the visual web-editor system files.

  Safety model:
    1. `npm run build` is the GATE. It compiles the ENTIRE working tree
       (Next.js / TypeScript). If anything fails to compile, the script
       aborts and nothing is staged, committed, or pushed.
    2. Only the curated editor-system paths below are staged - the rest of
       your uncommitted work is left untouched.
    3. You are asked to confirm before the push actually happens.

  Run from anywhere:
      powershell -ExecutionPolicy Bypass -File .\COMMIT_EDITOR_SYSTEM.ps1
#>

$ErrorActionPreference = 'Stop'

# --- repo root = folder this script lives in --------------------------------
$Repo = $PSScriptRoot
Set-Location $Repo
Write-Host "Repo: $Repo" -ForegroundColor Cyan

# --- 1. BUILD GATE ----------------------------------------------------------
Write-Host "`n=== Gate: npm run build ===" -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nBuild FAILED (exit $LASTEXITCODE). Nothing staged or pushed." -ForegroundColor Red
    exit 1
}
Write-Host "Build OK." -ForegroundColor Green

# --- 2. STAGE editor-system files only --------------------------------------
# ':(literal)' stops git treating the [locale] brackets as a glob.
$paths = @(
    # New editor engine + server actions
    'src/components/site-edit',
    'src/server/content-actions.ts',
    'src/server/editor-page-data.ts',
    'src/server/editor-page-actions.ts',
    'src/server/hero-actions.ts',
    # Editor UI (admin) + routes
    'src/components/admin/editor',
    'src/components/admin/AdminSidebar.tsx',
    'src/app/admin/editor',
    'src/app/editor',
    # Hero slider + config consumed by the home page
    'src/components/home/hero-config.ts',
    'src/components/sections/Hero',
    # Site theming (themes apply to the real site)
    'src/components/site-theme.tsx',
    'src/components/home/site-themes.css',
    # Real-site styling polished in Phase 2
    'src/components/home/home-showcase.css',
    'src/components/showroom/SiteNav.tsx',
    # Pages wired into the live-edit engine
    'src/components/home/HomeShowcase.tsx',
    ':(literal)src/app/[locale]/page.tsx',
    ':(literal)src/app/[locale]/layout.tsx',
    ':(literal)src/app/[locale]/about/page.tsx',
    ':(literal)src/app/[locale]/legal/page.tsx',
    # Changelogs
    'docs/changelog-editor-expansion.md',
    'docs/changelog-editor-round.md'
)

Write-Host "`n=== Staging editor-system files ===" -ForegroundColor Yellow
foreach ($p in $paths) { git add -- $p }

Write-Host "`nStaged changes:" -ForegroundColor Cyan
git status --short -- (($paths | ForEach-Object { $_ -replace '^:\(literal\)','' }))

# --- 3. Confirm + commit + push ---------------------------------------------
$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "`nNothing staged - working tree already matches HEAD for these paths." -ForegroundColor Yellow
    exit 0
}

$answer = Read-Host "`nCommit and push the staged editor files above? (y/N)"
if ($answer -ne 'y') {
    Write-Host "Aborted. Files remain staged; run 'git reset' to unstage." -ForegroundColor Yellow
    exit 0
}

$msg = "feat(editor): visual web editor - inline text/image/link editing, section show-hide + drag reorder, add-section library, per-section backgrounds, style controls, undo/redo, multi-page editing, reset-to-defaults; draft -> publish -> live"
git commit -m $msg

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "`nPushing to origin/$branch ..." -ForegroundColor Yellow
git push origin $branch

Write-Host "`nDone." -ForegroundColor Green
