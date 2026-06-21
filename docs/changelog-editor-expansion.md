# Changelog — Web Editor expansion

## Inventory I started from

The editor already supported **32 block types** across six categories
(Sections, Texte, Médias, Commerce, Layout, Avancé), a 3-tab inspector
(Contenu / Style / Avancé), drag-to-reorder, duplicate/move/delete,
undo/redo, device toggle (desktop/tablet/mobile), preview vs edit, the
publish flow, and the theme quick-access drawer. Style support: typography,
colors, spacing, border, layout (max-width, opacity, custom CSS).

## What I added

### 18 new blocks

| # | Type | Category | What it is |
| --- | --- | --- | --- |
| 1 | `heroImage` | Sections | Hero with full-bleed background image + adjustable dark veil |
| 2 | `heroVideo` | Sections | Hero with looping background video (YouTube / Vimeo / MP4) + veil |
| 3 | `heroSplit` | Sections | Two-column hero — copy + image (side swappable) |
| 4 | `sectionHeader` | Sections | Combined kicker + title + subtitle (left or center) |
| 5 | `team` | Sections | Team grid: photo (or initial), name, role, short bio |
| 6 | `tabs` | Sections | Labelled tab bar with body per tab |
| 7 | `steps` | Sections | Numbered steps, horizontal or vertical orientation |
| 8 | `timeline` | Sections | Vertical dated timeline (year + title + description) |
| 9 | `carousel` | Médias | Native scroll-snap slider with optional pagination dots |
| 10 | `banner` | Sections | Slim announcement band, tone: info / success / promo / warn |
| 11 | `contactForm` | Sections | Real form (name / email / phone / subject / message + consent) |
| 12 | `socialLinks` | Sections | Chip row of social handles (FB / IG / WhatsApp / LinkedIn / X / YT / TikTok / mail / phone) |
| 13 | `buttonGroup` | Texte | 1–4 buttons inline (primary / ghost / link, alignment selectable) |
| 14 | `accordion` | Sections | Generic collapsible panels (separate from FAQ) |
| 15 | `counter` | Texte | Single big animated counter with prefix / target / suffix / label |
| 16 | `badge` | Texte | Small coloured chip — tone: mint / amber / blue / rose / neutral |
| 17 | `progress` | Texte | Labelled progress bar with percentage |
| 18 | `callout` | Texte | Notice box — info / success / warn / error |
| (bonus) | `code` | Avancé | Formatted monospace code block with language label |
| (bonus) | `embed` | Avancé | Generic `iframe` for external widgets |

That's **20 new types** total (18 from the headline list + 2 bonus Avancé blocks for completeness). New total in the registry: **52 blocks**.

Every new block:
- registers a default content + style in `registry.ts`
- has a `case` in `BlockRender.tsx`
- consumes the theme tokens (`var(--we-accent)`, `--we-ink`, `--we-line`, `--we-surface`, `--we-radius`, `--we-font`, etc.) — so theme changes re-render them automatically
- exposes inspector fields (content + style + custom CSS via the existing tabs)
- has a `HOWTO` entry shown in the palette hover card + GuideBook
- collapses sensibly on `data-device='mobile'` (see editor.css end)

### 1 new editor-wide feature: responsive show/hide

- Added `hideOnDesktop`, `hideOnTablet`, `hideOnMobile` to `BlockStyle`.
- New helper `deviceVisibilityAttrs()` in `style.ts`.
- `Canvas.tsx` (`.we-bv` wrapper) and `PublishedPage.tsx` (`.we-vis`
  wrapper) surface the flags as `data-hide-*` attrs.
- `editor.css` CSS rule:
  `.we-canvas[data-device='X'] [data-hide-X='1'] { display: none }`
  → device-aware hiding works in both editor preview and the published site.
- In the editor (not in `we-public`), hidden blocks aren't fully removed —
  they get a dashed outline + a small "masqué sur ce format" pill at the
  top-right so the author still sees them.
- Inspector exposes a "Visible sur" group with three chips
  (🖥 Bureau / 🟦 Tablette / 📱 Mobile) — uncheck a chip to hide on that
  format.

## Files touched

| File | Change |
| --- | --- |
| `src/components/admin/editor/types.ts` | `BlockStyle` extended with `hideOnDesktop/Tablet/Mobile` |
| `src/components/admin/editor/style.ts` | New `deviceVisibilityAttrs()` helper |
| `src/components/admin/editor/registry.ts` | 20 new `BlockDef`s + matching `HOWTO` entries |
| `src/components/admin/editor/BlockRender.tsx` | 20 new switch cases + extra lucide imports |
| `src/components/admin/editor/Inspector.tsx` | New "Visible sur" Group in `StyleControls` |
| `src/components/admin/editor/Canvas.tsx` | Editor-side `data-hide-*` attrs on `.we-bv` |
| `src/components/admin/editor/PublishedPage.tsx` | Live-site `.we-vis` wrapper for hide flags |
| `src/components/admin/editor/editor.css` | ~330 lines of CSS for the new blocks + responsive utility |

## How to view it locally

Boot the dev server, sign in, then open `/editor`:

- The **palette** on the left will list all the new types under their
  categories. Try Sections → "Hero · image en fond", "Hero · vidéo en
  fond", "Hero · split (texte + visuel)", "En-tête de section", "Équipe",
  "Onglets", "Étapes", "Chronologie", "Bannière (info)", "Formulaire de
  contact", "Réseaux sociaux", "Accordéon"; Médias → "Carrousel"; Texte →
  "Groupe de boutons", "Compteur", "Pastille (badge)", "Barre de
  progression", "Encadré (callout)"; Avancé → "Bloc de code", "Iframe / embed".
- Drag any of them onto the canvas; the inspector on the right shows
  content + style controls + the new **"Visible sur"** group at the bottom.
- Toggle the device buttons in the top bar — blocks with the corresponding
  hide flag get a dashed veil with a "masqué sur ce format" pill.
- Open `/editor/themes` and apply a different theme (Mediterranean / Onyx /
  Solar / Noir); all new blocks pick up the new tokens automatically.
- Open `/editor/guide` — the existing topics still apply; the howto strings
  for the new blocks are picked up by the palette's hover card.

## Verification I ran (static)

- Brace / paren balance on every touched TS/TSX file → no negative
  deltas (positive deltas are normal in TSX because JSX `{}` aren't fully
  stripped by the regex; we confirmed no missing closers by reading the
  file tails).
- `registry.ts` ↔ `BlockRender.tsx` coverage: every registered `type`
  has a matching `case` (and vice-versa, ignoring the legacy `html` /
  `map` cases that already existed before this round).
- HOWTO entries: one per new type — confirmed via Read.

## Couldn't verify here

- `pnpm tsc --noEmit` / `next build`: same sandbox limit as before (no
  working `node_modules` in the mount, no internet to the chrome CDNs).
- Visual render of any individual block: same story — needs the dev
  server + a browser.

## Suggested commit groupings

1. `feat(editor): per-device hide flags + inspector toggle`
2. `feat(editor): hero v2 — image / video / split variants`
3. `feat(editor): section header, team grid, tabs, steps, timeline`
4. `feat(editor): banner, carousel, contact form, socials, button group, accordion`
5. `feat(editor): micro blocks — counter, badge, progress, callout, code, embed`
6. `style(editor): CSS for new blocks + responsive helpers`
