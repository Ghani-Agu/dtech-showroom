# UI Remake — Proposal (Item 5)

**Status:** draft for review · no code changes yet · awaits your confirmation
before any of this is executed.

This is a short, opinionated direction — not an exhaustive list. The goal is to
give the admin and editor a fresher, calmer, more legible identity while
preserving everything the team already knows (sidebar layout, routes, keyboard
shortcuts, theme system, publish flow).

---

## 1. Snapshot of the current state

| Surface | Notes |
| --- | --- |
| **Admin shell** (`.admin-shell` in `globals.css`) | Heavy glass: dark mint surfaces, `backdrop-filter: blur(12px)`, mint-tinted borders. Sticky sidebar (268 px) + topbar with section title + accessory chips. |
| **Sidebar** (`AdminSidebar.tsx`) | Strong identity — pulsing dot, colored chips per section, gradient brand mark. Wordy in dense modes; the `desc` line under each item can be noise. |
| **Topbar** (`AdminTopbar.tsx`) | Carries section title + sub, plus a date chip, a Ctrl-K hint, a theme toggle, a user chip, a logout — that's a lot of small surfaces. |
| **Editor app bar** (`we-appbar`) | Mini-shell with brand wordmark + theme/guide buttons + "Voir le site". Now that those are sidebar entries (Item 1), this app bar duplicates them. |
| **Inline styles** | A large amount of `style={{ … }}` props throughout admin components, instead of utility classes or design tokens. Slows reading and inconsistent. |
| **Typography** | Geist + Display variant — sound choice, but in the admin you see mixed weights/sizes per surface; no clear hierarchy. |
| **Color identity** | One mint accent across everything (sidebar, editor, themes UI). Strong but can feel monotone. |

The bones are good. The pain points are *visual noise*, *inline-style verbosity*, and
*identity overlap* between admin chrome and editor chrome.

---

## 2. Direction (what I'd change and why)

### a) Calmer admin shell, sharper signal

- **Drop the heavy glass blur** as a default; reserve it for sheets/menus
  (where it earns its weight). Surfaces become flat panels with a single line
  border, giving more "design" room to the content.
- **Compress the topbar** to one row: title + sub on the left, search + user
  on the right. The date chip and the Ctrl-K hint move inside a small "?"
  menu next to the user avatar.
- **Sidebar density toggle** — a two-state width (collapsed icon-only / full).
  Collapsed becomes the default ≤ 1280 px viewport. Saves real estate without
  hiding the nav.

### b) One identity, two contexts (admin vs editor)

- Keep the **mint accent as the admin signature**, but introduce a **neutral
  graphite** for the editor's own chrome (we-appbar, palette/inspector
  borders). That visually separates "I'm managing data" from "I'm composing a
  page" without changing the brand.
- The page being edited keeps using **its theme tokens** — that part is
  already correct.

### c) Replace inline styles with semantic class composition

- Introduce a small set of admin tokens already present (`--admin-soft`,
  `--admin-glass-border`, etc.) and map them to Tailwind utility aliases via
  the existing v4 `@theme`. Roughly: `bg-admin-soft`, `border-admin-line`,
  `text-admin-secondary`, etc.
- Sweep `AdminSidebar.tsx` + `AdminTopbar.tsx` + admin shell to remove the
  bulk of `style={{}}` and use those utilities. Result: shorter files, easier
  to skim, easier to themify (e.g. a future "high-contrast" admin theme).

### d) Section-color discipline

- The sidebar currently colors **every** primary item (mint, blue, orange,
  violet, amber, rose…). Beautiful but loud. Proposal: **only the active
  item gets its section color**; idle items use neutral text + a single mint
  active-indicator stripe. Keeps the personality on hover/active, makes the
  full list scannable.

### e) Typography pass

- Lock one display scale for admin (28 / 22 / 18 / 16 / 14 / 12).
- Standardize body text to Geist 14 / line-height 1.55. Mono only for kickers,
  ticks, and keys.

### f) Editor chrome: simplify

- Now that `/editor`, `/editor/themes`, `/editor/guide` are real sidebar
  entries (Item 1), the editor's own `we-appbar` only needs: device toggle,
  undo/redo, preview, palette/inspector toggles, publish status, "Voir le
  site". Drop the in-editor "Thèmes" button → keep only the new quick-access
  drawer trigger (Item 2). Drop the "Guide" button — sidebar covers it.
- This frees ~150 px of horizontal space and reduces redundancy.

### g) Catalogue & Guide: pin the table of contents

- Add a small **"In this section"** rail above the sidebar list in the
  Guide page so users have a permanent index of the 9 categories. Steps 1
  and 4 already give us this content; the rail is just a presentation
  upgrade.

---

## 3. Scope (what I'd touch — and what I would NOT)

**In scope:**

- `src/components/admin/AdminSidebar.tsx`, `AdminTopbar.tsx`, `AmbientBackground.tsx`
- `src/components/admin/editor/WebEditor.tsx` (top app bar trim)
- `src/components/admin/editor/editor.css` (graphite-vs-mint split, sheet polish)
- `src/app/globals.css` (utility aliases for admin tokens)
- `src/app/admin/layout.tsx` (sidebar density toggle; no logic change)

**Out of scope (untouched on purpose):**

- Routing / URLs
- Editor block schema (`types.ts`, `registry.ts`)
- Theme registry (`themes.ts`) and per-theme CSS in `editor.css`
- Server actions, DB schema, auth
- Customer-facing storefront (separate concern)

---

## 4. Risk + how I'd land it

- **Risk:** sweeping inline-style → utility migration is the most error-prone
  part. Mitigation: do it surface-by-surface (sidebar, then topbar, then
  shell), commit each, eyeball-verify the section colors and active states.
- **Risk:** "drop the blur as a default" can look flat in light mode.
  Mitigation: keep a 1 px keyline + soft drop-shadow so panels remain
  legible without blur.
- **Risk:** sidebar density toggle hides the section descriptions; users may
  miss them. Mitigation: show them as tooltips on hover when collapsed.

I'd land in roughly five commits:

1. tokens: add Tailwind utility aliases for admin tokens (no visual change)
2. shell: lighten admin shell (drop ambient blur as default, panel keylines)
3. sidebar: discipline section colors + add density toggle
4. topbar: compress to one row + move date/Ctrl-K into "?" menu
5. editor: trim app bar duplicates, graphite chrome for editor surfaces

---

## 5. Questions for you before I start

1. **Density toggle default** — collapsed below 1280 px, or always expanded
   when the user has saved that preference? My instinct: collapsed.
2. **Section colors** — are you attached to the multicolor sidebar (current
   behavior), or do you agree with neutralizing idle items?
3. **Editor chrome split** — mint admin vs. graphite editor: yes/no? If no,
   I'll keep the editor on mint too and only trim the duplicate buttons.
4. **Light mode** — should the remake hold the current light/dark split as
   the source of truth, or is this a good time to make light mode the
   default for the admin (with a dark toggle)?

Once you confirm direction (a quick "ok" on these four points is enough),
I'll execute commit-by-commit and ping you between each so we can course-
correct early.
