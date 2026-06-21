# Visual Web Editor — Final Report

A Shopify-style, direct-manipulation editor for the dtech-showroom site. The
editor loads the **real website** in an iframe (`?edit=1`) and edits flow
**draft → Publier → live** on `/fr` and `/ar`. Everything below was driven and
confirmed live in the browser against `localhost:3000`.

## Verified live

| Capability | Status | How it was confirmed |
|---|---|---|
| Inline text editing (all page text) | ✅ Verified | Edited titles/paragraphs on home, About, Legal; appeared on `/fr` after publish |
| Image editing (section backgrounds, upload) | ✅ Verified | Uploaded image via the section panel; rendered live |
| Button / link editing (label + URL) | ✅ Verified | `EditableLink` edits published and rendered |
| Section show / hide | ✅ Verified | Toggled section visibility; reflected live |
| Section drag-reorder | ✅ Verified | Reordered homepage sections; order persisted |
| Intra-section drag (cards / lists) | ✅ Verified | Reordered items within a section |
| Add-section library (Texte, Appel à l'action) | ✅ Verified | Added a custom section, edited it, published; appeared on `/fr` |
| Delete section (+ orphan-override cleanup) | ✅ Verified | Deleted custom section; its overrides are now also stripped (fix this round) |
| Visual style controls (color, size, weight, align, spacing, transform) | ✅ Verified | Applied per-element styles; rendered live |
| Undo / redo | ✅ Verified | Multi-step undo/redo with key coalescing |
| Multi-page editing (home / About / Legal + custom pages) | ✅ Verified | Switched pages, edited each, create/delete custom pages |
| **Réinitialiser** (reset page to defaults) | ✅ Verified (new) | New button; reset home + About to pristine defaults |
| Draft → Publier → live | ✅ Verified | Publish surfaced edits on `/fr`; reset cleared them |
| Light / dark theme | ✅ Verified | Theme toggle intact in editor + live |
| RTL `/ar` | ✅ Verified | `/ar` renders full RTL (nav, hero slider, CTAs); content store shared with `/fr` |

## Changed this round

- **Orphan-override cleanup on delete** — deleting a custom section now also
  strips its `overrides` / `styles` / `sectionBg` keys, so removed sections
  leave no residue in the published JSON. (`WebEditor.tsx`)
- **Réinitialiser feature** — a per-page "reset to original content" button in
  the live editor toolbar. `resetContent` now clears both `draft` and
  `published`. (`WebEditor.tsx`, `content-actions.ts`)
- **Site left clean** — home, About, Legal and their `/ar` variants were reset
  to pristine defaults; no test pollution, no stray custom sections or pages
  remain.

## Deliberately deferred (with rationale)

- **Inline editing of the shared nav labels.** `SiteNav` is mounted in the
  layout/shell on *every* page, outside the per-page `EditProvider`. Tagging it
  naively would save a nav edit into one page's override store and it would
  **not** appear on other pages — a broken half-feature. Doing it correctly
  needs a dedicated **global content scope** (one key all pages read for nav),
  which is a separate architecture from the page-scoped model. Recommended as
  the next increment; not shipped half-wired.
- **Page rename / reorder in the navigator.** Create + delete work today.
  Reordering would only re-sort entries in the editor's own page dropdown — the
  visitor-facing nav links are fixed in `SiteNav` — so it has no effect on the
  live site. Low value; deferred.

## Verification note (honesty)

Every capability above was confirmed by driving the real browser. The sandbox
type-check could not be trusted this round because the Linux mount served a
**stale, truncated** copy of two edited files (a known issue) — the real files
(confirmed complete via the editor IDE view) compiled and ran in the dev
server, including all new code. The **authoritative gate is `npm run build`**,
which the commit script runs before staging anything.

## Page builder (latest round) — verified live

The editor is now a real no-code builder, not just inline editing:

| Capability | Status |
|---|---|
| Click a section → full **settings panel** (layout, background colour, text colour, padding top/bottom, max-width, alignment, background image) | ✅ Verified |
| **Section library** — 10 ready-made templates (Titre+texte, Appel à l'action, 3 atouts, Chiffres clés, Image+texte, Galerie, Citation, FAQ, 2 colonnes, Bannière) | ✅ Verified |
| **Component palette** — 12 blocks (titre, paragraphe, sur-titre, bouton, image, atout, statistique, citation, texte+bouton, question, espace, séparateur) added into any custom section | ✅ Verified |
| **Drag-reorder components** inside a section | ✅ Verified |
| **Delete components**; **add / remove sections** | ✅ Verified |
| Per-block content editing (text, links, **images with upload**) | ✅ Verified |
| Layouts: Pile / Centré / 2 colonnes / 3 colonnes / Ligne (responsive) | ✅ Verified |
| Builds flow draft → Publier → live on `/fr` **and** `/ar` (RTL) | ✅ Verified |

Real coded sections (hero, catalogue, marques…) keep settings + drag-reorder +
show/hide; new sections added from the library are full block containers you
fill, restyle, reorder and remove — a genuine "build without code" experience.

## Studio — expanded library + full drag-and-drop (latest round) — verified live

### Section library (29 templates, 7 groups)

- **Hero**: Hero centré, Hero image (split), Bannière
- **Contenu**: Titre + texte, Texte riche, Image + texte, Texte + image, Texte + liste
- **Preuve sociale**: 3 atouts, 2 atouts, Chiffres clés, Bande de logos, Témoignages, Témoignage, Équipe
- **Offres**: Tarifs, Étapes, FAQ, Citation
- **Média**: Galerie, Vidéo
- **Action**: Appel à l'action, Newsletter, Contact, Réseaux sociaux, Boutons
- **Mise en page**: 2 colonnes, Séparateur, Espace

### Component palette (23 block kinds)

Titre, Paragraphe, Sur-titre, Badge, Bouton, Image, Logo, Vidéo, Bloc hero,
Texte + bouton, Atout, Icône + texte, Statistique, Étape, Citation, Témoignage,
Membre équipe, Carte tarif, Liste à puces, Question (FAQ), Réseaux, Espace,
Séparateur. Layouts per section: Pile / Centré / 2-3-4 colonnes / Ligne.

Every block is **theme-adaptive** (uses `currentColor`, `var(--cyan)`, and
`color-mix` so it follows light/dark + the active theme), **RTL-safe** (logical
properties — `margin-inline`, `text-align: start`, `inset-inline`), exposes its
content/settings in the Inspector, and flows draft → Publier → live.

### Drag-and-drop everywhere — all verified live

| Drag interaction | Status |
|---|---|
| Section reorder — Layers panel | ✅ Verified |
| Section reorder — on canvas (handle) | ✅ Verified |
| **Cross-section component drag** (move a block between sections) | ✅ Verified (was the gap) |
| Intra-section component reorder | ✅ Verified |
| Drag a section from the library → drop on the **Layers panel** at a position | ✅ Verified (lands at exact index) |
| Drag a section from the library → drop on the **canvas** (insertion line) | ✅ Verified |
| Drag a component from the palette → drop on a section on the canvas | ✅ Verified (section highlights, block appended) |
| Affordances | grab handles (`::`), drop-target highlights, green insertion lines, drop-catch overlay, reduced-motion guard |

Confirmed end-to-end: added Témoignages + Chiffres clés (and Tarifs, Équipe,
Étapes, Bande de logos), moved a block from one section to another, drag-inserted
a section into the Layers panel and onto the canvas, dropped a component onto a
section, **published — rendered on `/fr` and `/ar` (RTL)** — then reset the page
to defaults so the site is left clean.

> Verification note: the sandbox `tsc` again read stale/truncated file copies
> from the Linux mount (a known issue), so its errors are artifacts. The dev
> server compiles the real files (the editor mounts and every feature works
> live). `npm run build` in the commit script is the authoritative gate.

## Theme application — bug fix (latest round) — verified live

**Root cause.** The theme system (`THEMES`, `.we-theme-*`) was built only for the
block-editor *canvas*. `setDocTheme` wrote `theme` into the block-editor PageDoc
store (`site_pages` key `home`), but the live site renders the real
`HomeShowcase` from a *different* store (`content:home` EditData) and had **no
theme variants at all** — its palette was hardcoded Nightline, and the public
document emitted no theme attribute. So "Appliquer" only restyled the
theme-library preview and saved to a store nothing reads.

**Fix (theme now drives the real site, end to end):**

- `theme` is now part of the page **content** model (`EditData.theme`), preserved
  by sanitize/coerce and carried through the editor's save/publish so other edits
  don't wipe it.
- New `setContentTheme(pageKey, themeId)` server action writes the theme to the
  same `content:*` store the live site reads (draft + published) and revalidates.
  `ThemeLibrary` and the quick-preview drawer now call it.
- New `getSiteTheme()` + a `<SiteTheme>` client component, rendered in the
  **locale layout**, set `body[data-site-theme="<id>"]` on every page/locale
  (and the light/dark base for non-default themes).
- New `site-themes.css` defines the real-site token palettes
  (`html body[data-site-theme="X"] .home-showcase-root { --bg-*, --text, --cyan, … }`
  + page background + ambient) for all 8 themes, imported site-wide.

**Live before/after (driven via Chrome on localhost:3000):**

| Check | Before | After |
|---|---|---|
| Public `body[data-site-theme]` | *(absent)* | `nightline` → `onyx` → back to `nightline` |
| `/fr` body background | `rgb(10,10,12)` (fixed Nightline) | Onyx → `rgb(21,18,14)`; reverted → `rgb(10,10,12)` |
| `--bg-0` / `--cyan` tokens on `.home-showcase-root` | fixed Nightline | Onyx `#15120e` / gold; reverted → `#0a0a0c` / mint `#7ce0c3` |
| Theme in published payload | none | `"theme":"onyx"` then `"theme":"nightline"` |
| `/ar` (RTL) | not themed | Onyx charbon + RTL intact |
| Main `/editor` canvas | reverted to Nightline | iframe `body[data-site-theme]` reflects the saved theme |

Applying a theme now persists, propagates to the live `/fr` and `/ar`, and the
editor canvas reflects it; switching back to Nightline restores the dark theme.
The site was left on **Nightline** (default).

> Note: the sandbox `tsc` again reported false errors from stale/truncated mount
> copies of a few files (e.g. `[locale]/layout.tsx` read as 42 lines, cut
> mid-line); those exact files compiled and ran in the dev server during the live
> test (theme apply/revert exercised every one). `content-actions.ts`,
> `editor-page-data.ts`, and `site-theme.tsx` produced no tsc errors. `npm run
> build` in the commit script is the authoritative gate.

## Shipping

Run `COMMIT_EDITOR_SYSTEM.ps1` (repo root). It runs `npm run build` as a hard
gate, stages only the editor-system files, shows them, asks for confirmation,
then commits and pushes. Your other uncommitted work is left untouched.
