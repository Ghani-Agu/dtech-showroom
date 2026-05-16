# Cloudflare R2 Setup Guide — Phase 7d Preamble

> Status: **Do this BEFORE running Phase 7d Claude Code prompt**
> Estimated time: 15-20 minutes
> Cost: Free tier covers Dtech's needs for years

---

## Why Cloudflare R2

| Why R2 | Why Not Alternatives |
|---|---|
| Zero egress fees (huge savings at scale) | Vercel Blob: $0.15/GB stored vs R2's $0.015/GB |
| S3-compatible API (works with standard SDKs) | AWS S3: egress fees add up fast |
| Free tier: 10GB storage, 1M Class A ops/month, 10M Class B ops/month | Self-hosted: ops burden, not worth it for image hosting |
| Independent of hosting provider | Vendor lock-in concerns minimized |
| Cloudflare's CDN edge network globally | — |

For Dtech's catalog (30 products → 329 SKUs eventually, ~5-10 images each at ~200KB optimized), this is **at most 2GB total** — comfortably within free tier for the foreseeable future.

---

## Step 1 — Create Cloudflare Account (3 min)

If you don't already have one:

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up with email + password (or use Google/Apple SSO)
3. Verify email
4. Skip the "Add a website" prompt — we don't need DNS management for R2

If you already have a Cloudflare account, sign in.

---

## Step 2 — Enable R2 (2 min)

R2 is opt-in. First time you use it, you're prompted to add a payment method (even for the free tier, this is required).

1. From the Cloudflare dashboard left sidebar, click **R2 Object Storage**
2. If prompted, click **Subscribe to R2 (Free Tier)**
3. Add a payment method (credit card)
   - **You will not be charged** as long as you stay within free tier limits
   - Cloudflare requires the card for fraud prevention only
4. Confirm subscription

You're now able to create R2 buckets.

---

## Step 3 — Create The Bucket (3 min)

1. In the R2 dashboard, click **Create bucket**
2. **Bucket name:** `dtech-showroom-images`
   - Lowercase, hyphens only, globally unique within your account
   - This name will be in env vars later
3. **Location hint:** Choose the region closest to Dtech's customer base
   - For Algeria: **Western Europe (Frankfurt or Madrid)** is closest
   - Or **Automatic** to let Cloudflare optimize globally
4. **Default storage class:** Standard (default, leave as-is)
5. Click **Create bucket**

You should now see your empty bucket in the R2 dashboard.

---

## Step 4 — Enable Public Access (2 min)

For the Dtech catalog, images need to be publicly accessible (no auth required to view them — they're product photos for customers). R2's "Public Development URL" works for this.

1. Click into your `dtech-showroom-images` bucket
2. Click the **Settings** tab
3. Scroll to **Public access**
4. Under **Public Development URL**, click **Allow Access**
5. Confirm — you'll get a URL like:
   ```
   https://pub-abc123def456.r2.dev
   ```
6. **Copy this URL.** You'll need it for the `R2_PUBLIC_URL` env var.

**Optional but recommended for production:** Connect a custom domain (e.g., `images.d-techalgerie.com`). This requires the domain to be on Cloudflare DNS. Defer this to Phase 9 (Production Infrastructure) — the `pub-*.r2.dev` URL works perfectly for development.

---

## Step 5 — Generate API Token (5 min)

The Phase 7d code needs an R2-scoped API token with read+write permissions to your bucket.

1. In the R2 dashboard, click **Manage R2 API Tokens** (top right area, or under the bucket detail page)
2. Click **Create API Token**
3. **Token name:** `dtech-showroom-images-rw`
4. **Permissions:** Select **Object Read & Write**
5. **Specify bucket(s):** Apply to specific buckets only → select `dtech-showroom-images`
6. **TTL:** Forever (or set a date if you want to rotate annually — best practice)
7. Click **Create API Token**

You'll see a screen with three critical values:

| Field | What | Save As |
|---|---|---|
| Access Key ID | Public identifier | `R2_ACCESS_KEY_ID` |
| Secret Access Key | Private key — **shown once** | `R2_SECRET_ACCESS_KEY` |
| Endpoint URL | S3-compatible endpoint | Extract account ID (see below) |

**The Secret Access Key is shown only ONCE.** Copy it immediately to a secure place. If you lose it, you'll need to regenerate the token.

The endpoint URL looks like:
```
https://abc123def456.r2.cloudflarestorage.com
```

The portion before `.r2.cloudflarestorage.com` is your **account ID** — save it as `R2_ACCOUNT_ID`.

---

## Step 6 — Save Credentials Locally (1 min)

Open `C:\Users\abdel\Desktop\dtech-showroom\.env.local` and add these lines at the bottom:

```
# Cloudflare R2 (Phase 7d)
R2_ACCOUNT_ID=<your account ID from step 5>
R2_ACCESS_KEY_ID=<your access key ID from step 5>
R2_SECRET_ACCESS_KEY=<your secret key from step 5>
R2_BUCKET_NAME=dtech-showroom-images
R2_PUBLIC_URL=<your pub-*.r2.dev URL from step 4>
```

**Important formatting notes:**
- No quotes around values
- No trailing spaces
- The `R2_PUBLIC_URL` should NOT end with a slash (e.g., `https://pub-abc.r2.dev`, not `https://pub-abc.r2.dev/`)
- The `R2_ACCOUNT_ID` is the subdomain portion only, not the full URL

Save the file.

---

## Step 7 — Test Connectivity (2 min)

Before running Phase 7d, verify the credentials work by running a quick test.

Create a temporary test file at `C:\Users\abdel\Desktop\dtech-showroom\scripts\test-r2.ts`:

```typescript
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

async function main() {
  console.log('Testing R2 connectivity...')
  console.log('Bucket:', process.env.R2_BUCKET_NAME)
  console.log('Endpoint:', `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`)
  
  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      MaxKeys: 10,
    })
  )
  
  console.log('✓ Connected successfully')
  console.log(`Bucket has ${result.KeyCount ?? 0} objects`)
  if (result.Contents) {
    result.Contents.forEach((obj) => console.log(`  - ${obj.Key}`))
  }
}

main().catch((err) => {
  console.error('✗ R2 connection failed:')
  console.error(err)
  process.exit(1)
})
```

Then install the SDK temporarily and run the test:

```bash
pnpm add @aws-sdk/client-s3
pnpm exec tsx --env-file=.env.local scripts/test-r2.ts
```

**Expected output:**
```
Testing R2 connectivity...
Bucket: dtech-showroom-images
Endpoint: https://abc123def456.r2.cloudflarestorage.com
✓ Connected successfully
Bucket has 0 objects
```

If you see `✓ Connected successfully`, you're ready for Phase 7d.

**If you see an error:**
- `Access Denied` → API token permissions are wrong; regenerate with Object Read & Write
- `NoSuchBucket` → bucket name in env var doesn't match the actual bucket name
- `InvalidAccessKeyId` → access key ID copied incorrectly
- `SignatureDoesNotMatch` → secret access key copied incorrectly (often a trailing space or newline)

You can delete `scripts/test-r2.ts` after the test passes. Phase 7d will install `@aws-sdk/client-s3` properly and build the real integration.

---

## Step 8 — Configure CORS On The Bucket (Optional, For Phase 7d+)

CORS is needed if we ever do direct browser uploads (presigned URLs). Phase 7d uses server-side uploads (file goes from browser → Next.js server action → R2), so CORS isn't strictly required.

If you want to be future-proof:

1. In your bucket's **Settings** tab, scroll to **CORS Policy**
2. Click **Add CORS policy**
3. Paste this minimal policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://d-techalgerie.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Update `https://d-techalgerie.com` to whatever the production domain will be. Skip this step entirely if you'd rather defer to Phase 7d's actual requirements.

---

## Step 9 — Confirm Free Tier Limits

Just so you know what to monitor:

| Resource | Free Tier | Dtech's Likely Usage |
|---|---|---|
| Storage | 10 GB | < 2 GB even at 329 SKUs with 10 images each |
| Class A operations (PUT, POST, DELETE) | 1M / month | < 1000/month at full pace |
| Class B operations (GET, HEAD, LIST) | 10M / month | Depends on traffic; serving images doesn't count against B ops because Cloudflare CDN caches them |
| Egress | UNLIMITED | This is R2's killer feature |

You will never see a bill from Cloudflare R2 for the Dtech use case unless something goes very wrong (e.g., a misconfigured loop uploading millions of images).

---

## Summary — What You Should Have After This Setup

- ✅ Cloudflare account with R2 enabled
- ✅ A bucket named `dtech-showroom-images`
- ✅ Public Development URL for the bucket (`https://pub-*.r2.dev`)
- ✅ API token with Object Read & Write permissions
- ✅ Five env vars in `.env.local`:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME=dtech-showroom-images`
  - `R2_PUBLIC_URL=https://pub-*.r2.dev`
- ✅ Confirmation that the SDK connects successfully via the test script

---

## Once Setup Is Complete

Reply with one of:

- **"R2 ready, run Phase 7d"** — proceed with the Claude Code prompt
- **"Hit an error at step N"** — paste the error, we debug together
- **"Almost done, need a minute"** — fine, take your time

I'll have the Phase 7d Claude Code prompt waiting once you confirm R2 is set up.