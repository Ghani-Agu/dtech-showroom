# Dtech Showroom — Deployment Guide

## Prerequisites

- Vercel account (free tier sufficient for pitch demo)
- Neon Postgres database (production tier recommended for real launch; free tier acceptable for pitch)
- Upstash Redis (free tier; required for rate limiting)
- Domain name (optional; Vercel provides a `.vercel.app` subdomain)

## Environment Variables (Vercel Project Settings → Environment Variables)

Required:

```
DATABASE_URL=postgresql://...?sslmode=require
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Deployment Steps

1. Push code to GitHub
2. Import the repo to Vercel
3. Set environment variables as above
4. Deploy
5. Run database migrations:
   `pnpm db:push` (run from local pointing at production DATABASE_URL)
6. Optionally seed:
   `pnpm db:seed` (only for demo; never seed real production data)
7. Verify deployment URL

## Post-Deployment Verification

1. Visit `https://your-domain.com/sitemap.xml` — confirms sitemap works
2. Visit `https://your-domain.com/robots.txt` — confirms robots works
3. Submit a test inquiry, then visit `/admin/inquiries` — confirms end-to-end DB write
4. Submit 4 inquiries quickly — confirms rate limit triggers
5. Run Lighthouse on homepage — should score 90+ across all metrics
6. Test on mobile device — confirm responsive layout

## Pre-Pitch Cleanup

Before sharing the URL with Dtech, remove:

- `/motion` route — delete `src/app/(dev)/motion` directory
- `/admin` and `/admin/inquiries` — comment out or password-protect (TODO: add Better Auth gate before real client engagement)

## Custom Domain Setup

If using a custom domain:

1. Vercel Project → Settings → Domains → Add
2. Add DNS records as instructed
3. Update `NEXT_PUBLIC_SITE_URL` to match
4. Wait for SSL cert provisioning (~1 min)

## Database Migrations in Production

- Never run `pnpm db:push --force` in production
- Generate migrations: `pnpm db:generate` (commits to repo)
- Apply: `pnpm exec drizzle-kit migrate`
- For zero-downtime migrations on Neon, use branching:
  1. Create a Neon branch from main
  2. Apply migration on branch
  3. Smoke-test against branch
  4. Promote branch to main

## Rollback

- Vercel: instant rollback via Deployments tab
- Database: Neon point-in-time recovery (paid tier required for >24h history)
