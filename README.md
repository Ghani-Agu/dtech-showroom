# Dtech Showroom

Cinematic 3D showroom for Dtech Algérie's product catalog.

- **Path:** D — The Catalog as Cinematic Showroom
- **Phase:** 2–4a — Route surface, data model, component library, page implementations
- **Stack:** Next.js 16 · TypeScript strict · Tailwind v4 · React Three Fiber · Framer Motion · GSAP · Lenis · Drizzle · Postgres

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Database Setup

This project uses Postgres via Drizzle ORM. To run locally:

1. Create a Postgres database. Easiest options:
   - Neon (https://neon.tech) — free tier, copy connection string
   - Supabase (https://supabase.com) — free tier, copy connection string
   - Railway (https://railway.app) — free tier with $5 credit
   - Local Postgres if you prefer

2. Create `.env.local` in the project root:

   ```
   DATABASE_URL="postgresql://user:password@host:5432/database"
   ```

3. Push schema to your database:

   ```bash
   pnpm db:push
   ```

4. Seed with demo data:

   ```bash
   pnpm db:seed
   ```

5. Optionally open Drizzle Studio:

   ```bash
   pnpm db:studio
   ```

## Adding Real Assets

Asset folders are scaffolded under `public/images/` and `public/models/`. Drop real assets at the paths defined in seed data. Placeholders render automatically while assets are missing.

Expected asset paths (examples):

```
public/images/products/hp-omen-16-i9-rtx-4070/card.webp
public/images/products/hp-omen-16-i9-rtx-4070/hero.webp
public/images/brands/hp/hero.webp
public/images/brands/hp/logo.svg
public/images/categories/laptops/hero.webp
public/models/hp-omen-16-i9-rtx-4070.glb   (Phase 5+)
```

The catalog seed assumes:
- Every product has `card.webp` and `hero.webp` under `public/images/products/[slug]/`
- Hero and featured tiers reference a `.glb` model under `public/models/`
- Longtail products carry four photography stills as `photo-1.webp` … `photo-4.webp`

Generic SVG placeholders live in `public/images/placeholders/` and serve as the visual fallback for any missing path via `SmartImage`.

## Scripts

- `pnpm dev` — Dev server
- `pnpm build` — Production build
- `pnpm db:generate` — Generate Drizzle migrations from `src/db/schema.ts`
- `pnpm db:push` — Sync schema to DB
- `pnpm db:seed` — Seed demo data (30 products across 5 brands and 6 categories)
- `pnpm db:studio` — Open Drizzle Studio

## Status

Phase 2–4a complete. The 14-route site surface resolves, the data model is in place, the component library is built, every page is implemented, and the inquiry form writes records via a Drizzle-backed server action. Real product photography, brand imagery, and 3D scenes arrive in later phases.
