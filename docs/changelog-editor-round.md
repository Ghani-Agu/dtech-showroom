# Changelog — Editor / Theme / Guide round

**Scope:** Items 1–5 from the round. Item 6 (mobile shopping UX) was pulled
out of scope mid-round (belongs to the wbp project).

## Item 1 — Sidebar wiring

**Files**
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminTopbar.tsx`

**Changes**
- Removed `newTab: true` from the **Éditeur web** sidebar entry → it now
  navigates same-tab like Products / Categories.
- Removed the `ExternalLink` chevron from that row (no more "this opens
  outside" affordance).
- Added two new sidebar entries with the same nav treatment:
  - **Thèmes** → `/editor/themes` (lucide `Palette` icon, mint accent)
  - **Catalogue & guide** → `/editor/guide` (lucide `BookOpen` icon, blue
    accent)
- `isActive('/editor')` now matches strictly (so `/editor/themes` doesn't
  light up the **Éditeur web** row).
- Extended `NAV_SECTION` so the permission filter treats the three editor
  entries as one bucket (`'editor'`); when an `allowed` list is passed but
  doesn't mention `'editor'`, those rows still show — same idea as the old
  fall-through.
- `AdminTopbar` `SECTIONS` map extended with `editor`, `themes`, `guide` so
  the title row is correct if these routes ever move into the admin shell.

**Routes to view**
- `/admin` → sidebar shows the new entries
- `/editor`, `/editor/themes`, `/editor/guide` → all reachable directly
  from the sidebar

**Live verification needed**
- Click each new sidebar entry from `/admin`, confirm the active highlight
  swaps and the page loads.
- With a restricted-permission user (no `'editor'` in `allowedSections`),
  the three editor rows should still appear — confirm in your auth setup
  whether you want that or whether `'editor'` should be a real permission
  key. (Documented choice: today it's permissive; flip the filter if you
  want it gated.)

## Item 2 — Quick-access theme drawer

**Files**
- `src/components/admin/editor/ThemeQuickPanel.tsx` *(new)*
- `src/components/admin/editor/WebEditor.tsx` *(wired in)*
- `src/components/admin/editor/ThemeLibrary.tsx` *(added "Aperçu rapide"
  button)*
- `src/components/admin/editor/editor.css` *(drawer styles)*

**Changes**
- New slide-over `ThemeQuickPanel` component: right-side drawer, backdrop
  dim, Escape / outside-click / X to close, body-scroll lock while open,
  reduced-motion friendly.
- Drawer content: header (kicker, title, sub), radio list of the 5 themes
  with mini-swatches, live preview area at `0.27×` scale wrapped in
  `.we-canvas.we-theme-<id>` (so it really renders cards in that theme),
  footer with **Réinitialiser** / **Voir la bibliothèque** / **Appliquer**.
- Apply path calls the existing `setDocTheme` server action, then notifies
  the parent via `onApplied` so the editor canvas re-themes immediately
  without a page navigation.
- Replaced the static `/editor/themes` Link in the WebEditor app bar with
  the drawer trigger; clicking **Thèmes** in the toolbar now opens the
  drawer.
- Added an **Aperçu rapide** button on the `/editor/themes` gallery page so
  users can test-drive themes without scrolling the whole gallery.

**Documented choice**
- The full theme gallery at `/editor/themes` is *kept* as the "browse and
  compare" page (it's the right shape for the side-by-side comparison).
  The drawer is the "tweak and apply fast" path. Both call the same
  `setDocTheme`.

**Routes / behaviors to view**
- `/editor` → click **Thèmes** in the toolbar → drawer opens, click any
  theme → preview re-renders → click **Appliquer** → toast + canvas swaps.
- `/editor/themes` → click **Aperçu rapide** → drawer opens with same
  behavior.

**Live verification needed**
- Verify the toast appears and the canvas behind the drawer adopts the new
  theme tokens without a hard reload.
- Drawer over the editor with a saved page; drawer over the editor with
  *no* saved page yet (Apply should be disabled and show the
  "Open the editor first" hint).

## Item 3 — Theme-adaptive preview cards

**Files**
- No production code changes — already wired via the existing token
  contract.

**Verification**
- `.we-card` (and every other block-rendered surface) uses CSS variables:
  `var(--we-radius)`, `var(--we-surface)`, `var(--we-line)`, etc.
- Each theme defines those vars on `.we-canvas.we-theme-<id>` in
  `editor.css` (verified for `nightline`, `mediterranean`, `onyx`, `solar`,
  `noir`).
- The drawer's preview wraps blocks in `.we-canvas.we-theme-${selected}`
  so the preview cards re-render the instant the user picks a swatch.
- On apply, the editor updates `doc.theme` locally; the main `Canvas`
  re-derives `theme` and the canvas tree re-renders in the new theme.

No "fix" needed — the system was correct; this round adds the live preview
surfaces (drawer + gallery) that make the adaptiveness visible.

## Item 4 — Catalogue & guide

**Files**
- `src/components/admin/editor/GuideBook.tsx` *(full rewrite)*
- `src/components/admin/editor/editor.css` *(search, tips, kbd, prev/next
  styles)*

**Changes**
- Expanded the topic catalogue from **11 topics in 4 categories** to **34
  topics in 9 categories** covering every editor surface:
  - **Démarrer** — Tour, Goal, First page
  - **L'interface** — Toolbar, Palette, Canvas, Inspector, Layers
  - **Manipuler les blocs** — Add, Reorder, Duplicate, Nest
  - **Éditer le contenu** — Text, Links, Images
  - **Personnaliser le style** — Colors, Sizing, Fonts, Layout, Devices,
    Custom CSS
  - **Thèmes** — Apply, Quick switcher, Harmony
  - **Blocs spécialisés** — Navbar, Hero, Stats band, Product grid,
    Brands, Testimonials, CTA, Footer
  - **Aperçu & publication** — Preview, Publish, Unpublish
  - **Sauvegarde & raccourcis** — Autosave, History, Export/Import,
    Shortcuts
- Each topic now has: `lead`, `steps[]`, optional `tips[]`, optional
  `keys[]`.
- Added an **in-page search** (sticky at the top of the sidebar) that
  filters topic titles/summaries/leads/category — empty-state message
  included.
- Added **Prev / Next** navigation between topics at the bottom of the
  detail pane (forms a guided tour).
- Added a **breadcrumb** (`Category · Fiche N / N`) above each topic.
- Added new demo stages: palette grid, layers tree, autosave pill, CSS
  snippet, link inputs, image dropzone, shortcut keys.
- Detail pane auto-scrolls to top when the topic changes.

**Routes to view**
- `/editor/guide` — opens the new comprehensive guide.

**Live verification needed**
- Click through each category and confirm the topic count looks right.
- Try the search field (e.g., "hero", "ctrl", "publier") and the empty
  state.
- Prev/Next at start and end of the list (one button should be empty).

## Item 5 — UI remake proposal

**File**
- `docs/ui-remake-proposal.md` *(new)*

**Status**
- Direction proposal only — no code changes.
- Awaiting your confirmation on four questions (density toggle default,
  section-color discipline, editor chrome split mint vs graphite, light
  mode as admin default).

## Item 6 — Mobile shopping UX

Out of scope per your follow-up — belongs to the wbp project, not this one.
Nothing touched on the customer-facing storefront.

## Static verification I ran

- Brace / paren / quote balance on every TSX file I touched — all clean
  (positive imbalances come from JSX expression braces the regex doesn't
  strip; no missing close-braces).
- All new imports resolve to existing exports (`THEMES`, `getTheme`,
  `ThemeDef`, `setDocTheme`, `getDef`, `createBlock`, `renderBlock`).
- All `.tsx` files end with a proper closing `}` (verified via Read).
- No null bytes / encoding glitches in any saved file.
- I-couldn't-run: `pnpm tsc --noEmit`, `next build`, or the dev server
  (no DB / no shell with `node_modules` resolution in this environment).
  Items below are the live-verify checklist for you.

## Live verification checklist (recap)

1. `pnpm dev` boots cleanly with no TS errors on these surfaces:
   - `/admin` (sidebar)
   - `/editor` (toolbar + drawer)
   - `/editor/themes` (gallery + drawer)
   - `/editor/guide` (catalogue)
2. Click each new sidebar entry — active highlight + section header
   correct.
3. Open the **Thèmes** drawer from the editor and from the gallery.
4. Apply a theme; confirm the canvas behind the drawer updates without
   a navigation.
5. Search "publier" in the guide — only one topic should remain visible.
6. Walk the Prev / Next guide nav end-to-end; topic 34 should hide the
   Next button, topic 1 should hide Prev.

## Commits I'd cut (suggested grouping)

If you want git history that mirrors the items, this is how I'd split:

1. `feat(admin): wire web editor + theme + guide into sidebar`
2. `feat(editor): quick-access theme drawer with live preview`
3. `docs(editor): expand catalogue into a section-by-section guide`
4. `docs: propose UI remake direction`

(Item 3 = "theme-adaptive cards" piggybacks on commit 2 — no separate
production code was needed.)
