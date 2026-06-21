# Changelog — Newsletter (Round)

## What landed

### Data model (`src/db/schema.ts` + `src/db/ensure-schema.ts`)
- `subscriber_status` enum: `pending` / `subscribed` / `unsubscribed` / `bounced`
- `campaign_status` enum: `draft` / `scheduled` / `sending` / `sent` / `failed`
- `subscribers` table (email unique, double-opt-in tokens, source, ip_hash)
- `campaigns` table (subject, preheader, html, text, audience, stats, timestamps)
- `campaign_sends` table (per-recipient row with `opened_at` / `clicked_at`)
- All three tables + indexes mirrored in `ensure-schema.ts` so a cold boot self-heals.

### Mailer + templates
- `src/lib/mailer.ts` — thin Resend wrapper with **dev/no-key stub mode**: writes the rendered HTML to `.next/dev-mail/*.html` so you can preview without an API key.
- `src/lib/email-templates/index.ts` — branded shell + `confirmationTemplate()` (i18n FR/EN/AR) + `campaignEnvelope()` (preheader, unsubscribe footer, tracking pixel).

### Customer-facing
- `src/components/forms/NewsletterSignup.tsx` — drop-in form (variants: `footer`, `inline`), honeypot, FR/AR/EN strings, RTL via native `dir`, mobile-first, success / error states.
- `src/components/layout/SiteFooter.tsx` — full-width newsletter strip above the link columns.
- `src/server/newsletter-actions.ts` — `subscribeAction` (server action), `confirmSubscriptionByToken`, `unsubscribeByToken`. Honeypot + Upstash rate-limit + sha-256 IP hash + email regex.
- `src/app/[locale]/newsletter/confirm/page.tsx` — runs `confirmSubscriptionByToken` and renders a friendly outcome.
- `src/app/[locale]/newsletter/unsubscribe/page.tsx` — one-click unsubscribe page (token IS the auth).

### Admin
- `src/app/admin/subscribers/page.tsx` — list with status filter chips + counts, search by email/source, pagination.
- `src/components/admin/subscribers/SubscribersToolbar.tsx` + `SubscriberRow.tsx`.
- `src/app/api/admin/subscribers/export/route.ts` — gated CSV export honouring the current filters (UTF-8 BOM so Excel opens it correctly).
- `src/app/admin/campaigns/page.tsx` — list with status badge + summary stats.
- `src/components/admin/campaigns/{CreateCampaignButton,CampaignStatusBadge,CampaignEditor}.tsx`.
- `src/app/admin/campaigns/[id]/page.tsx` — editor (subject / preheader / HTML body) + live preview pane + test-send + send-to-all + delete.
- `src/server/campaign-actions.ts` — `createCampaign`, `updateCampaign`, `deleteCampaign`, `sendCampaign` (synchronous in-process loop with per-recipient `campaign_sends` row + link rewriting + tracking pixel), `sendTestCampaign`.

### Tracking endpoints
- `src/app/api/email/track/open/route.ts` — 1×1 transparent PNG, marks `opened_at` once + increments `campaigns.open_count`.
- `src/app/api/email/track/click/route.ts` — base64url-decodes `u=`, marks `clicked_at` once + increments `click_count`, 302s.

### Sidebar / topbar / i18n
- `AdminSidebar.tsx` — new "Abonnés" (`Mail`, mint) and "Campagnes" (`Megaphone`, amber) entries in the Administration group; `NAV_SECTION` maps them to a `'newsletter'` permission key.
- `AdminTopbar.tsx` — `SECTIONS.subscribers` and `SECTIONS.campaigns` headers.
- `messages/{fr,en,ar}.json` — added a `newsletter` block (16 keys) for headline, lede, placeholder, submit, consent, success/error states.

## Routes to view (live verification checklist)

| Route | Behaviour |
| --- | --- |
| `/` (or any storefront page) | Footer now shows newsletter capture strip |
| `POST` from the form | Creates `pending` subscriber + dev-stub HTML in `.next/dev-mail/` |
| `/{fr,en,ar}/newsletter/confirm?token=…` | Flips `pending` → `subscribed` |
| `/{fr,en,ar}/newsletter/unsubscribe?token=…` | One-click off the list |
| `/admin/subscribers` | List + filter chips + search + CSV export |
| `/admin/campaigns` | List + status badges |
| `/admin/campaigns/[id]` | Editor + preview + send |
| `/api/email/track/open?s=<send_id>` | 1×1 PNG + open log |
| `/api/email/track/click?s=<send_id>&u=<base64url>` | 302 redirect + click log |

## Migration steps

The schema additions are idempotent in `ensure-schema.ts` (runs on every boot), so the first time you start the app after pulling these changes the tables will be created automatically. For a stricter / faster path:

```bash
pnpm db:push     # apply the Drizzle schema
# or, if you prefer migrations:
pnpm db:generate # only generates SQL — review and apply manually
```

I did NOT run any DB command from here — that's intentional. The runtime `ensureSchema` will heal a fresh DB on the next `pnpm dev`.

## Provider keys Ghani must supply

All optional in dev (dev-stub kicks in when missing) but required for real delivery:

| Key | Used by | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | mailer | Existing var — same one better-auth uses |
| `RESEND_FROM_EMAIL` | mailer | Existing; default `noreply@d-techalgerie.com` |
| `RESEND_FROM_NAME` | mailer | Existing; default `Dtech Algérie` |
| `NEXT_PUBLIC_SITE_URL` | confirm / unsubscribe / tracking | Required for absolute URLs in emails |
| `NEWSLETTER_REPLY_TO` | campaign mailer | Optional reply-to (e.g. `contact@dtech.dz`) |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | rate-limit | Existing; subscribe endpoint reuses them (5/h/IP) |

## What I could not verify here

- A real `pnpm tsc --noEmit` / `next build` (no node_modules resolution in the VM).
- Live DB writes (no Postgres reachable).
- Real Resend send + open/click tracking from a real inbox.

Static checks I did run:
- All TSX files balance `{}` / `()` (one regex false-positive on a `//i` regex literal — confirmed clean by hand).
- All three locale JSONs parse cleanly with `json.load`.
- Every imported symbol has a matching `export` in its source file.
- Drizzle types/enums referenced by the actions match those declared in `schema.ts`.

## Status of earlier rounds (confirmed)

- ✅ Item 1 — Web Editor / Themes / Catalogue & guide are sidebar entries; Administration / Éditeur split header present.
- ✅ Item 2 — `ThemeQuickPanel` drawer in both `/editor` toolbar and `/editor/themes`.
- ✅ Item 3 — `.we-canvas.we-theme-<id>` token contract verified; cards adapt live.
- ✅ Item 4 — `GuideBook` rewritten to 34 topics / 9 categories with search + prev/next.
- ✅ White-mode restyle (Linear/Vercel minimal) — kept as the latest direction.

## Suggested commit list

1. `feat(db): subscribers / campaigns / campaign_sends schema + ensure-schema`
2. `feat(lib): mailer wrapper with dev stub + email templates`
3. `feat(www): newsletter signup in footer + confirm/unsubscribe pages + FR/AR/EN strings`
4. `feat(admin): subscribers list + CSV export`
5. `feat(admin): campaigns editor + send + test-send + tracking endpoints`
6. `feat(admin-shell): sidebar + topbar entries for newsletter`
