# CLAUDE.md — D-Tech Studio Web Editor

This file loads on every session. Read it before doing anything.

## What this project is
The **dtech-showroom** site (`/fr`, `/ar`, RTL) is a WhatsApp-order storefront.
The **web editor** at `/editor` is a Shopify-theme-style, no-code visual builder.
The editing canvas **is the real site**, loaded in an iframe at `/<locale>?edit=1`.
Edits flow **Brouillon → Publier → en ligne** on both locales. The single product
goal: a non-developer can build a perfect site by clicking and dragging, and what
they save **appears on the real website**.

## THE PRIME DIRECTIVE — read this twice
> An editor change is **not "done" until it has been verified live on the real
> route in a fresh page load, with a screenshot.** "The code looks right" is not
> done. "The build passed" is not done. **Seen live = done.** Nothing else counts.

This single rule is why past attempts looped for weeks. Do not break it.

## Environment truth (the cause of the loops)
- The Linux/sandbox mount **serves stale or truncated copies of large files** and
  produces **false typecheck errors**. DO NOT trust sandbox typecheck on big files.
- **`npm run build` on the real (Windows) environment is the only authoritative
  gate.** The dev server compiles the real files; trust that, not the sandbox.
- Before editing any file, **re-read the fresh file first**. Never edit from a
  remembered/stale version.

## The link guarantee (editor ↔ live)
"100% linked" is not a code property you can eyeball — it is a **verified**
property. The only proof the link works is: make an edit in `/<locale>?edit=1`,
**Publier**, then open `/<locale>` (NOT the edit iframe) in a fresh tab and see
the change. The `verify-live` skill is how you prove this every single time.

## Standing rules (never violate)
1. **Verify live before claiming done.** (Prime Directive.)
2. **One atomic change per loop.** Never batch fixes. See `no-loop-protocol`.
3. **Git checkpoint before every change.** If a change doesn't verify, `revert` —
   never pile a second fix on top of an unverified first.
4. **Two-strike rule:** if the same fix fails verification twice, STOP. Do not
   loop a third time. Hand the human a precise diagnosis and ask. Looping is the
   failure mode we are eliminating.
5. **Never generate Algerian Darija.** Leave `{{DARIJA: intent in English}}`
   placeholders only. Ghani writes all Darija himself.
6. **Never relitigate a settled decision.** Once Ghani decides, execute.
7. **Theme-adaptive + RTL-safe always** (logical CSS properties, `currentColor` /
   accent / `color-mix`). A component that breaks in `/ar` is broken.

## Roles
- `agents/lead-orchestrator.md` — the conductor (this main session). Plans, gates,
  decides, holds the plan, enforces the loop.
- `agents/explorer-analyst.md` — read-only. Reproduces the bug, maps code BEFORE edits.
- `agents/builder.md` — implements one atomic change.
- `agents/verifier.md` — builds + loads logged-in live site + screenshots + confirms.
- `agents/design-reviewer.md` — read-only. Visual critique vs reference; owns polish.

## Skills (the "how")
- `skills/verify-live` — the mandatory verification gate (load this constantly).
- `skills/no-loop-protocol` — atomic changes, checkpoints, two-strike rule.
- `skills/editor-architecture` — how the editor/live link works under the hood.
- `skills/section-component-design` — the "so good, so simple" bar + hover help-cards.
- `skills/theme-system` — the 8 themes and how theming reaches the live site.

## Key files
- `src/components/admin/editor/WebEditor.tsx` — Studio shell + Inspector + drag-insert.
- `src/components/site-edit/edit-context.tsx` — on-page engine, block renderer.
- `src/components/site-edit/section-presets.ts` — 29 sections + 23 components + defaults.
- `src/server/content-actions.ts` — save/publish/reset/setContentTheme + sanitize.
- `src/server/editor-page-data.ts` — read draft/published + `getSiteTheme`.
- `src/components/home/site-themes.css` + `site-theme.tsx` — theme palettes + applier.
- `src/components/admin/editor/themes.ts` — the 8 theme definitions.

## >>> FILL IN before first run <<<
- Repo path: `__FILL__` (e.g. `C:\Users\abdel\Desktop\dtech-showroom`)
- Dev server command: `__FILL__` (e.g. `npm run dev`) → URL `http://localhost:3000`
- Build command: `__FILL__` (e.g. `npm run build`)
- Editor login: how does the agent log in to `/editor`? `__FILL__`
  (test account email/password, or a magic-link/session step). Without this the
  agent cannot verify and WILL loop. This is the single most important field.
- Design reference sites for benchmarking: `__FILL__` (2–3 URLs you admire).
