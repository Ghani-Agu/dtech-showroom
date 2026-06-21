# D‑Tech Studio — Web Editor: Full Report & Guide

_Last updated: 2026‑06‑21 · scope: the visual web editor for the dtech‑showroom site._

> **How this report was produced.** It draws on (1) a direct read of the current
> source code (the authoritative list of sections, components, themes and
> behaviour) and (2) the live tests run earlier in this work session against
> `http://localhost:3000` while logged in. For this final pass the editor
> session was logged out (it redirected to `/login`), so I did not re‑click every
> control again here; items are marked **Verified live** (exercised in the
> browser this session) or **From code** (read from source, not re‑clicked this
> pass).

---

## 1. What the web editor is

The web editor is a **no‑code, Shopify‑theme‑style visual builder** for the
D‑Tech storefront. Its defining idea: the editing canvas **is the real website**
— the live site is loaded inside the editor in an iframe (`/fr?edit=1`), so what
you see while editing is exactly what visitors get (WYSIWYG). You edit by
clicking and dragging on the page itself, not by filling in abstract forms.

It has two layers that share one engine:

1. **Inline editing of the real, hand‑built pages** — every tagged text, link,
   image, and the six real homepage sections (Hero, Catégories, Catalogue,
   Marques, À propos, Contact) can be edited, restyled, reordered, hidden, or
   given a background — without touching code.
2. **A block builder for new content** — you can add brand‑new sections from a
   library (29 templates) and fill them with components (23 block types),
   arranging everything by drag‑and‑drop.

Everything flows **Brouillon → Publier → en ligne** (draft → publish → live) on
both locales: French `/fr` and Arabic `/ar` (right‑to‑left).

### What it is supposed to do (goals)
- Let a non‑developer change anything on the site visually.
- Show the real site, not an approximation.
- Provide rich, varied, good‑looking sections & components.
- Support full drag‑and‑drop (reorder, move between sections, insert from a library).
- Be theme‑able (8 visual themes) and keep light/dark + RTL working.
- Persist edits and publish them to the live site.

---

## 2. How to access it

- **URL:** `/editor` (full‑screen Studio workspace). It requires being **logged
  in** with the `editor` permission — otherwise it redirects to `/login`.
- Sibling pages: `/editor/themes` (theme library), `/editor/hero` (hero slider
  editor), `/editor/guide`.
- The public site (`/fr`, `/ar`) needs no login; it simply renders whatever has
  been published.

> ⚠️ During this report pass the editor redirected to `/login` (session expired).
> Log in first to use the editor.

---

## 3. Architecture (how it works under the hood)

- **Studio chrome** (`WebEditor.tsx` → `LiveEditor`): the dark Framer/Figma‑style
  shell — top bar, icon rail, Layers panel, pasteboard, Inspector, ⌘K palette.
- **The canvas is the real site in an iframe** at `/<locale>?edit=1`. Editing is
  direct‑manipulation on that page.
- **postMessage bridge** between the parent editor and the iframe
  (`source:'dtech-editor'` ↔ `'dtech-site'`): selections, edits, drag, snapshots.
- **On‑page engine** (`src/components/site-edit/edit-context.tsx`): `EditProvider`,
  `Editable`, `EditableLink`, `EditableImage`, `SectionList`, and the block
  renderer + builder chrome.
- **Content store:** a `site_pages` row keyed `content:<pageKey>` holding
  `EditData = { overrides, styles, sections{order,hidden}, sectionBg,
  sectionStyles, customSections[], theme }`, with separate **draft** and
  **published** copies. Server actions: `saveContentDraft`, `publishContent`,
  `resetContent`, `setContentTheme`.
- **Library/blocks** are defined in `src/components/site-edit/section-presets.ts`
  (shared by the engine and the editor UI).
- **Themes** are applied to the real site via `body[data-site-theme]` +
  `site-themes.css`, driven by the published content theme (global, all locales).

---

## 4. The Studio interface (tour)

**Top bar:** `D Studio.` logo · current page name · "Enregistré" status · device
toggles (desktop/tablet/mobile) · zoom −/＋ · **Commandes ⌘K** · undo/redo ·
**Aperçu** (opens the live route) · **Publier** (mint button).

**Icon rail (left):** Calques (Layers) · Insérer (Library) · Pages · Thème.

**Layers panel:** a "Fixe · Haut" entry (En‑tête / header), the draggable list of
**Sections** (each row: drag grip, icon, name, type; on hover/selection: 👁 hide,
⧉ duplicate, 🗑 delete), a "Fixe · Bas" entry (Pied de page / footer), and a
"＋ Ajouter une section" button.

**Pasteboard (centre):** the real site in a device frame on a dark dotted canvas,
scaled by the zoom level, with a floating zoom bar at the bottom.

**Inspector (right):** context settings for whatever is selected — a text/link/
image element, or a whole section.

**⌘K command palette:** fuzzy search to add any of the 29 sections or run
commands (Publier, Réinitialiser, switch device). _Verified live: opened with 15+
commands._

---

## 5. Sections — the library (29 templates, 7 groups)

Adding a section creates a "custom section" — a themed block container laid out by
one of the layouts (Pile / Centré / 2‑3‑4 colonnes / Ligne). All content is
inline‑editable; everything is theme‑adaptive and RTL‑safe.

**Hero**
- **Hero centré** — badge + grand titre + texte + bouton, centré.
- **Hero image** — bloc hero (sur‑titre + très grand titre + texte + bouton) à
  gauche, image à droite (2 colonnes).
- **Bannière** — sur‑titre + titre + texte + bouton, centré.

**Contenu**
- **Titre + texte** — sur‑titre + titre + paragraphe, centré.
- **Texte riche** — titre + paragraphe.
- **Image + texte** / **Texte + image** — image et bloc (titre+texte+bouton) en 2 colonnes.
- **Texte + liste** — bloc texte + liste à puces cochées.

**Preuve sociale**
- **3 atouts** / **2 atouts** — cartes "atout" (icône + titre + texte) en 3 ou 2 colonnes.
- **Chiffres clés** — 4 statistiques (grand chiffre + libellé) en 4 colonnes.
- **Bande de logos** — rangée de 5 logos (gris, discrets).
- **Témoignages** — 3 cartes d'avis (texte + avatar rond + nom + rôle).
- **Témoignage** — un seul témoignage, centré.
- **Équipe** — 3 cartes membre (photo ronde + nom + rôle).

**Offres**
- **Tarifs** — 3 cartes de prix (offre + grand prix + période + 3 avantages cochés + bouton).
- **Étapes** — 3 cartes numérotées (numéro + titre + texte).
- **FAQ** — 4 questions/réponses empilées avec séparateurs.
- **Citation** — une grande citation + auteur.

**Média**
- **Galerie** — 6 images en 3 colonnes.
- **Vidéo** — titre + bloc vidéo (image 16:9 + bouton lecture).

**Action**
- **Appel à l'action** — titre + texte + bouton.
- **Newsletter** — sur‑titre + titre + texte + bouton.
- **Contact** — bloc texte + liste (2 colonnes).
- **Réseaux sociaux** — titre + rangée de liens sociaux.
- **Boutons** — un bouton centré.

**Mise en page**
- **2 colonnes** — deux blocs texte côte à côte.
- **Séparateur** — un trait.
- **Espace** — un espace vertical.

_Verified live this session: added and rendered Tarifs (3 price cards),
Témoignages (3 cards + avatars), Chiffres clés (4 stats), Équipe (3 members),
Étapes (3 steps), Galerie/feature variants — all rendered correctly on the
canvas._

---

## 6. Components — the palette (23 block types) and how each looks

Add components into any custom section via "＋ Ajouter un composant" (in‑canvas)
or by dragging from the **Insérer** panel. Styling is theme‑driven
(`currentColor`, the site accent `--cyan`, and `color-mix`), so blocks recolour
automatically per theme and per light/dark; spacing uses logical properties so
they mirror correctly in Arabic RTL.

| Component | How it looks |
|---|---|
| **Titre** (heading) | Large bold heading, ~26–42px, tight tracking |
| **Paragraphe** (text) | 17px body, relaxed line‑height, slightly muted |
| **Sur‑titre** (eyebrow) | Small mono, uppercase, wide letter‑spacing, muted |
| **Badge** | Pill, accent background, dark text |
| **Bouton** (button) | The site's primary button (mint/accent), large |
| **Image** | Full‑width, rounded 16px, 4:3, cover |
| **Logo** | Small (≤140px), grayscale, low opacity — for logo strips |
| **Vidéo** | 16:9 poster image with a centered round play button overlay (visual, not a real player) |
| **Bloc hero** (heroText) | Eyebrow + very large title (34–64px) + text + primary button |
| **Texte + bouton** (richtext) | Title + paragraph + ghost button |
| **Atout** (feature) | Card: accent‑tinted icon chip + title + text |
| **Icône + texte** (iconText) | Inline icon chip + one line of text |
| **Statistique** (stat) | Centered big accent number (32–52px) + muted label |
| **Étape** (step) | Card: numbered accent chip + title + text |
| **Citation** (quote) | Large 20–30px quote + author cite |
| **Témoignage** (testimonial) | Card: quote + footer with round avatar, bold name, muted role |
| **Membre équipe** (team) | Centered card: 96px round photo + name + role |
| **Carte tarif** (priceCard) | Card: plan + big price + period + ✓ feature list + button |
| **Liste à puces** (checklist) | Title + items each with an accent ✓ chip |
| **Question** (faqItem) | Bold question + answer, bottom divider |
| **Réseaux** (socialRow) | Row of bordered pill links (Facebook/Instagram/LinkedIn) |
| **Espace** (spacer) | 56px vertical space |
| **Séparateur** (divider) | Thin horizontal rule |

_Verified live: composite blocks (feature, testimonial+avatar, price card, stat,
team, step) render with correct structure; a feature card's border/colours
resolved through `color-mix` to the active theme (e.g. white‑tinted on the dark
theme), confirming theme‑adaptivity._

**Layouts** a section can use: **Pile** (stack), **Centré** (centered, max ~760px),
**2 / 3 / 4 colonnes**, **Ligne** (horizontal wrap). Columns collapse responsively
(to 2 then 1 on narrow screens).

---

## 7. Inline editing & section settings

**Click‑to‑edit on the canvas:**
- **Text** — click any heading/paragraph/label → edit in the Inspector; live
  style controls: colour, size, weight, alignment, background, padding Y/X,
  letter‑spacing, uppercase. _Verified live._
- **Links/Buttons** — edit label + URL. _Verified live._
- **Images** — replace by URL or upload (reuses the hero image pipeline).
  _Verified live._

**Section settings** (select a section → Inspector "Réglages"):
- Disposition (layout) for custom sections.
- Background colour, text colour, padding top/bottom, max‑width, alignment,
  background image. _Verified live (e.g. set a section background colour and it
  applied on canvas + published)._

---

## 8. Drag‑and‑drop (all verified live this session)

- **Reorder sections** — in the Layers panel and on the canvas (drag handle), with
  a green insertion line. ✅
- **Move a component between sections** (cross‑section drag) — ✅ (moved a block
  from one section to another; counts updated correctly).
- **Reorder components within a section** — ✅.
- **Drag‑insert from the library:**
  - onto the **Layers panel** at an exact position — ✅ (landed between the chosen rows);
  - onto the **canvas** (a drop‑catch overlay shows an insertion line) — ✅ (new
    section added; component drops highlight the target section and append the block).
- Affordances: grab handles, drop‑target highlights, insertion lines, reduced‑motion guard.

---

## 9. Themes (8) — and the recent fix

Themes change the whole site's palette while keeping the same content. Available:
**Nightline** (default, dark mint), **Méditerranée éditoriale** (light ivoire/
cobalt), **Onyx & Or** (dark charbon/or), **Studio Solaire** (light papier/corail),
**Noir Éditorial** (light blanc/encre/rouge), **Botanique** (light crème/vert/
terracotta), **Aurore** (light blush/prune/pervenche), **Cyber Néon** (dark
indigo/cyan/magenta).

Apply on **/editor/themes** ("Appliquer"). It persists to the page content store
and goes live immediately on `/fr` and `/ar`.

> **Recent bug fix (verified live):** previously "Appliquer" only restyled the
> theme preview and did not change the real site, because the theme was saved to
> a store the live site never read and the real pages had no theme variants. Now
> the theme is stored on the page content, emitted as `body[data-site-theme]`, and
> backed by real per‑theme palettes (`site-themes.css`). Verified: applying **Onyx**
> turned `/fr` from `rgb(10,10,12)` to charbon `rgb(21,18,14)` with gold accents,
> `/ar` themed in RTL, and switching back to **Nightline** restored the dark mint
> look. The site is currently left on **Nightline** (default, clean).

---

## 10. Publish / draft / reset / multi‑page

- **Publier** pushes the current draft live (revalidates `/fr` and `/ar`).
- **Réinitialiser** (in the ⌘K palette) resets the page to its original content
  (clears draft + published). _Verified live — returns the site to defaults._
- **Pages:** the rail's Pages tab switches between home, À propos, Mentions
  légales, and custom pages (create/delete exist).

---

## 11. What works (verified live this session)

- Studio workspace loads; layers list, inspector, ⌘K, zoom, device toggles. ✅
- Inline editing of text, links, and images (incl. upload). ✅
- Section settings: colours, padding, width, alignment, background image, layout. ✅
- Section show/hide, reorder (layers + canvas), delete, duplicate. ✅
- 29‑section library; add by click, by drag to the Layers panel, and by drag to the canvas. ✅
- 23 components; add via in‑canvas menu and the palette; cross‑section drag;
  intra‑section reorder; component drag onto the canvas. ✅
- Composite blocks render correctly; theme‑adaptive + RTL‑safe. ✅
- Draft → Publier → live on `/fr` and `/ar`; Réinitialiser cleans up. ✅
- Themes apply to the live site and revert. ✅

---

## 12. What doesn't work / limitations / things to watch

- **Editor needs an active login.** This pass it redirected to `/login`; you must
  be signed in (editor permission) to use `/editor`.
- **Bulk‑add performance.** Adding many sections in rapid succession can briefly
  freeze the canvas, because each change re‑renders the whole homepage in the
  iframe. Adding one at a time is smooth.
- **Top navigation labels are not inline‑editable.** The shared site nav is global
  chrome rendered outside the per‑page editing scope; editing its links is a
  deliberate follow‑up, not done.
- **Light/dark toggle vs theme.** For non‑Nightline themes the theme owns the
  mode (it sets light/dark on load), so the manual toggle is overridden on reload
  when a custom theme is active.
- **Video block is visual only** — a poster image with a play‑button overlay, not
  an embedded video player.
- **Duplicate copies structure, not edited content** — a duplicated section comes
  back with default text (you re‑edit it).
- **Spacer height is fixed** (~56px); no per‑block numeric spacing control yet.
- **Theme is global** (driven by the home page's published content), not per page.
- **Pre‑existing dev console warning:** the root layout's theme bootstrap
  `<script>` triggers a non‑fatal React dev warning; it does not break rendering.
- **The legacy block‑editor / PageDoc path still exists** for custom pages and the
  old `setDocTheme` is now unused — harmless, but two systems coexist.
- **Sandbox typecheck is unreliable here** (the Linux mount serves stale/truncated
  copies of large files, producing false errors); `npm run build` on Windows is
  the authoritative gate, and the dev server compiles the real files.

---

## 13. Recommendations / next steps

1. **Sign in, then re‑run a full visual pass** — I can re‑screenshot every
   section/component once the editor session is active again.
2. Make the **top nav labels** editable (a small global content scope).
3. Add **per‑block spacing** (spacer height, block margins) and a real **video
   embed** block.
4. Make **Duplicate** copy the edited content, not just the structure.
5. Optimise **bulk add** (avoid full‑page re‑render per change).
6. Consider **per‑page themes** if needed (currently one site‑wide theme).
7. Restart the dev server occasionally — long HMR sessions can go stale.

---

## 14. Key files (for reference)

- `src/components/admin/editor/WebEditor.tsx` — the Studio editor shell + Inspector + drag‑insert.
- `src/components/site-edit/edit-context.tsx` — on‑page engine, block renderer, builder chrome.
- `src/components/site-edit/section-presets.ts` — the 29 sections + 23 components + defaults.
- `src/server/content-actions.ts` — save/publish/reset/setContentTheme + sanitize.
- `src/server/editor-page-data.ts` — read draft/published content + `getSiteTheme`.
- `src/components/home/site-themes.css` + `src/components/site-theme.tsx` — theme palettes + applier.
- `src/components/admin/editor/themes.ts` — the 8 theme definitions.
- `COMMIT_EDITOR_SYSTEM.ps1` — build‑gated commit/push script for the editor system.
