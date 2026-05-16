# Dtech Showroom — Asset Sourcing Checklist

## Purpose

This document lists every product image required for the 30 seed 
products in the Dtech catalog. Source from manufacturer press sites, 
official product pages, or — if absolutely necessary — the existing 
d-techalgerie.com site.

**Total images to source:** ~75 product photos + 5 brand heroes 
(if not done) + 6 category heroes (if not done) = ~86 images.

**Estimated time:** 6–10 focused hours, breakable into 2–3 sessions.

---

## Manufacturer Source URLs

Bookmark these. Most product photos are accessible from here without 
authentication.

### HP
- Press image gallery: https://press.hp.com/us/en/image-gallery.html
- Product imagery: navigate to specific product page on https://www.hp.com/us-en/shop/
- Asset library (developer/partner — may require account): https://h41201.www4.hp.com/wmcf.web/

### Dell
- Press resources: https://www.dell.com/learn/us/en/uscorp1/press-releases/dell-media-resources
- Product imagery: navigate to specific product page on https://www.dell.com/
- Right-click any high-res product image → "Save image as"

### ASUS
- Press center: https://press.asus.com/
- Product imagery: navigate to specific product on https://www.asus.com/laptops/
- Image gallery on each product page → click images for full-res

### TP-Link
- Press center: https://www.tp-link.com/us/press/
- Product imagery: https://www.tp-link.com/us/home-networking/
- Each product page has a downloadable image gallery

### Apple
- Newsroom image gallery: https://www.apple.com/newsroom/
- Product page imagery: https://www.apple.com/shop/buy-iphone/
- High-res available via right-click on product hero images

---

## Image Specification (Final Format)

Every image goes through this pipeline:

1. Download original (PNG, JPG, or high-res from source)
2. Open Squoosh (https://squoosh.app)
3. Convert to WebP at quality 82
4. For hero images (heroes, homepage, brand heroes), also export AVIF 
   at quality 60
5. Save to specified path

**Final specs by image type:**

| Image Type | Format | Dimensions | Max Size |
|---|---|---|---|
| Product card | WebP | 800×600 (4:3) | < 80 KB |
| Product hero | AVIF + WebP | 2400×1350 (16:9) | < 250 KB (WebP), < 180 KB (AVIF) |
| Product carousel angle | WebP | 1600×1200 (4:3) | < 120 KB |
| Brand hero | AVIF + WebP | 1920×1080 (16:9) | < 300 KB (WebP), < 200 KB (AVIF) |
| Category hero | AVIF + WebP | 1920×1080 (16:9) | < 300 KB (WebP), < 200 KB (AVIF) |
| Homepage hero | AVIF + WebP | 2400×1350 (16:9) | < 400 KB (WebP), < 250 KB (AVIF) |

---

## File Path Convention

All paths relative to project root (`C:\Users\abdel\Desktop\dtech-showroom\`).

```
public/
  images/
    homepage-hero.webp              [already exists, done]
    brands/
      hp/
        hero.webp                   [already exists, replace with real]
      dell/
        hero.webp                   [already exists, replace with real]
      asus/
        hero.webp                   [already exists, replace with real]
      tp-link/
        hero.webp                   [already exists, replace with real]
      dtech/
        hero.webp                   [already exists, keep AI-generated]
    categories/
      laptops/hero.webp             [generate via Nano Banana or photography]
      networking/hero.webp
      storage/hero.webp
      mobile/hero.webp
      tablets/hero.webp
      accessories/hero.webp
    products/
      [product-slug]/
        card.webp                   [800x600, 4:3]
        hero.webp                   [2400x1350, 16:9]
        angle-2.webp                [only for featured/longtail]
        angle-3.webp                [only for featured tier]
```

---

## The 30 Products

The seed data assigns each product to one of three tiers. Tier 
determines how many images each product needs.

| Tier | # Products | Images per Product |
|---|---|---|
| Hero | 5 | card + hero (2 total) |
| Featured | 10 | card + hero + angle-2 + angle-3 (4 total) |
| Long-tail | 15 | card + hero + angle-2 (3 total) |

Total images across 30 products: 5×2 + 10×4 + 15×3 = **95 images**

---

## Hero Tier (5 products × 2 images = 10 images)

These are the flagship products. Cinematic single-image presentation 
(Phase 5a HeroTierStage with parallax). Sourcing priority: **highest 
quality available, real manufacturer imagery only.**

### 1. HP OMEN 16 (slug: `hp-omen-16-i9-rtx-4070`)
- **Source:** https://www.hp.com/us-en/shop/cat/laptops/gaming-laptops
- **Or search:** "HP OMEN 16 i9 RTX 4070 product image high res"
- **Files needed:**
  - [ ] `public/images/products/hp-omen-16-i9-rtx-4070/card.webp` (800×600)
  - [ ] `public/images/products/hp-omen-16-i9-rtx-4070/hero.webp` (2400×1350)

### 2. Dell XPS 16 (slug: `dell-xps-16-9640`)
- **Source:** https://www.dell.com/en-us/shop/dell-laptops/xps-16-laptop/
- **Files needed:**
  - [ ] `public/images/products/dell-xps-16-9640/card.webp`
  - [ ] `public/images/products/dell-xps-16-9640/hero.webp`

### 3. ASUS Zenbook Duo 2024 (slug: `asus-zenbook-duo-2024`)
- **Source:** https://www.asus.com/laptops/for-home/zenbook/zenbook-duo-ux8406/
- **Files needed:**
  - [ ] `public/images/products/asus-zenbook-duo-2024/card.webp`
  - [ ] `public/images/products/asus-zenbook-duo-2024/hero.webp`

### 4. TP-Link Deco BE95 (slug: `tp-link-deco-be95`)
- **Source:** https://www.tp-link.com/us/home-networking/deco/deco-be95/
- **Files needed:**
  - [ ] `public/images/products/tp-link-deco-be95/card.webp`
  - [ ] `public/images/products/tp-link-deco-be95/hero.webp`

### 5. Apple iPhone 15 Pro (slug: `apple-iphone-15-pro`)
- **Source:** https://www.apple.com/iphone-15-pro/
- **Files needed:**
  - [ ] `public/images/products/apple-iphone-15-pro/card.webp`
  - [ ] `public/images/products/apple-iphone-15-pro/hero.webp`

---

## Featured Tier (10 products × 4 images = 40 images)

Cross-fade carousel with 3 angles per product. **Verify the exact 
slugs by running `pnpm db:studio` and viewing the products table.** 
The list below is a best estimate based on Phase 2-4a seed; adjust 
slugs if the seed used different ones.

### 6. HP EliteBook 1040 G11 (estimated slug: `hp-elitebook-1040-g11`)
- **Source:** https://www.hp.com/us-en/shop/tech-takes/elitebook-1040-overview
- **Files needed:**
  - [ ] `public/images/products/[slug]/card.webp`
  - [ ] `public/images/products/[slug]/hero.webp`
  - [ ] `public/images/products/[slug]/angle-2.webp`
  - [ ] `public/images/products/[slug]/angle-3.webp`

### 7. HP LaserJet Pro M404 (estimated slug: `hp-laserjet-pro-m404`)
- **Source:** https://www.hp.com/us-en/shop/pdp/hp-laserjet-pro-m404n
- **Files needed:**
  - [ ] 4 image paths as above

### 8. Dell Latitude 7450 (estimated slug: `dell-latitude-7450`)
- **Source:** https://www.dell.com/en-us/shop/dell-laptops/latitude-7450-laptop/
- **Files needed:**
  - [ ] 4 image paths as above

### 9. Dell UltraSharp U2724DE Monitor (estimated slug: `dell-ultrasharp-u2724de`)
- **Source:** https://www.dell.com/en-us/shop/dell-ultrasharp-27-monitor-u2724de/
- **Files needed:**
  - [ ] 4 image paths as above

### 10. ASUS ROG Strix Scar 18 (estimated slug: `asus-rog-strix-scar-18`)
- **Source:** https://www.asus.com/laptops/for-gaming/rog-strix/rog-strix-scar-18/
- **Files needed:**
  - [ ] 4 image paths as above

### 11. ASUS Vivobook 15 OLED (estimated slug: `asus-vivobook-15-oled-i7`)
- **Source:** https://www.asus.com/laptops/for-home/vivobook/vivobook-15-oled/
- **Files needed:**
  - [ ] 4 image paths as above

### 12. TP-Link Archer AXE75 (estimated slug: `tp-link-archer-axe75`)
- **Source:** https://www.tp-link.com/us/home-networking/wifi-router/archer-axe75/
- **Files needed:**
  - [ ] 4 image paths as above

### 13. TP-Link Tapo C520WS (estimated slug: `tp-link-tapo-c520ws`)
- **Source:** https://www.tp-link.com/us/home-network-community/tapo-c520ws/
- **Files needed:**
  - [ ] 4 image paths as above

### 14. Apple iPad Pro M4 (estimated slug: `apple-ipad-pro-m4-13`)
- **Source:** https://www.apple.com/ipad-pro/
- **Files needed:**
  - [ ] 4 image paths as above

### 15. Apple MacBook Air M3 (estimated slug: `apple-macbook-air-m3-15`)
- **Source:** https://www.apple.com/macbook-air/
- **Files needed:**
  - [ ] 4 image paths as above

---

## Long-Tail Tier (15 products × 3 images = 45 images)

Simpler thumbnail strip with 2 angles per product. **Verify slugs 
via `pnpm db:studio`.**

For each, you need:
- `card.webp` (800×600)
- `hero.webp` (2400×1350 — used as first carousel image)
- `angle-2.webp` (1600×1200)

### Long-tail product list (estimated slugs)

Note: actual slugs depend on Phase 2-4a seed implementation. Run 
`pnpm db:studio` → products table → filter by tier='longtail' to 
get the real list.

| # | Product (estimated) | Estimated Slug | Source |
|---|---|---|---|
| 16 | HP Pavilion Aero 13 | `hp-pavilion-aero-13` | hp.com |
| 17 | HP ProBook 450 G10 | `hp-probook-450-g10` | hp.com |
| 18 | HP Color LaserJet Pro M283fdw | `hp-color-laserjet-pro-m283fdw` | hp.com |
| 19 | Dell Inspiron 14 5430 | `dell-inspiron-14-5430` | dell.com |
| 20 | Dell Latitude 5450 | `dell-latitude-5450` | dell.com |
| 21 | Dell P2422HE Monitor | `dell-p2422he-monitor` | dell.com |
| 22 | ASUS Zenbook 14 OLED | `asus-zenbook-14-oled` | asus.com |
| 23 | ASUS ExpertBook B5 | `asus-expertbook-b5` | asus.com |
| 24 | ASUS ROG Ally | `asus-rog-ally` | asus.com |
| 25 | TP-Link Deco X50 | `tp-link-deco-x50` | tp-link.com |
| 26 | TP-Link TL-SG108E Switch | `tp-link-tl-sg108e` | tp-link.com |
| 27 | TP-Link Kasa Smart Plug | `tp-link-kasa-smart-plug` | tp-link.com |
| 28 | Dtech USB-C Cable 1m | `dtech-usb-c-cable-1m` | use AI / generic |
| 29 | Dtech HDMI Cable 2m | `dtech-hdmi-cable-2m` | use AI / generic |
| 30 | Dtech USB-C Hub 7-in-1 | `dtech-usb-c-hub-7-in-1` | use AI / generic |

**For Dtech in-house accessories (28-30):** these don't have 
manufacturer sources because they're Dtech's own brand. Two options:

1. **Generate via Nano Banana 2** — generic-looking accessory photos 
   in the brand color palette. Acceptable since these are 
   first-party Dtech products.

2. **Use stock-photo of similar accessories** — many free stock 
   sites have generic USB-C cable photography.

The pitch framing: "These are placeholders. In production, Dtech 
would photograph their actual SKUs."

---

## Conversion Workflow (Per Image)

This is the per-image loop. Do it once, get rhythm, then batch.

### Step 1: Download original

- Right-click manufacturer image → "Save image as"
- Save to a temp folder like `Downloads/dtech-assets/[slug]/`
- Keep the original filename for now

### Step 2: Open Squoosh

- Browser → https://squoosh.app
- Drag the downloaded image in

### Step 3: Resize if needed

- For card images: resize to 800×600
- For hero images: resize to 2400×1350
- For carousel angles: resize to 1600×1200
- Squoosh has a "Resize" panel on the right

### Step 4: Convert to WebP

- Right panel: choose **WebP**
- Quality slider: **82**
- Click "Download" button

### Step 5: Save with the correct filename and path

- Save as `card.webp`, `hero.webp`, `angle-2.webp`, or `angle-3.webp`
- To the correct project path:  
  `C:\Users\abdel\Desktop\dtech-showroom\public\images\products\[slug]\`
- Create the slug folder if it doesn't exist

### Step 6: (For hero images only) Also export AVIF

- Same Squoosh window: change format to **AVIF**
- Quality: **60**
- Download
- Save as `hero.avif` alongside the `hero.webp`
- Next.js will automatically serve AVIF to compatible browsers

### Step 7: Verify

- Open the project folder in File Explorer
- Confirm the file is at the right path with the right filename
- Confirm the file size is under budget (see specifications above)

---

## Time-Box Each Session

Realistic time estimates per product:

| Tier | Time per product | Why |
|---|---|---|
| Hero (5) | 30 min each = 2.5 hrs | Highest quality, multiple iterations |
| Featured (10) | 15 min each = 2.5 hrs | 4 images each, but lower polish bar |
| Long-tail (15) | 10 min each = 2.5 hrs | 3 images each, simplest treatment |

**Total: ~7.5 hours of focused work.**

Recommended split:
- **Session 1 (2 hrs):** 5 hero products
- **Session 2 (2.5 hrs):** 10 featured products
- **Session 3 (2.5 hrs):** 15 long-tail products
- **Session 4 (30 min):** category heroes + any missing brand heroes

---

## Quality Bar — When To Accept, When To Iterate

Use this rubric:

**Accept the first download if:**
- Image is high-resolution (at least 1600px wide before downsizing)
- Background is clean (white or neutral, not cluttered)
- Product is the focus (not held by a hand, not in lifestyle context)
- Color is accurate to the real product

**Re-download if:**
- Image is low-res or blurry
- Background is cluttered or unprofessional
- Product is small in frame
- Image shows a person prominently

**Use AI generation if:**
- Manufacturer doesn't publish anything usable
- Image only exists in marketing context (lifestyle shots, models 
  holding products) and isolation is impractical
- It's a Dtech in-house product (no manufacturer source)

---

## Commit Strategy

Don't commit one image at a time. Batch commit after completing a 
tier or session:

```powershell
git add public/images/
git commit -m "feat: phase 5 wave 1 — hero tier product photography (5 products, 10 images)"
```

For long-tail:
```powershell
git add public/images/
git commit -m "feat: phase 5 wave 3 — long-tail tier product photography (15 products, 45 images)"
```

---

## After All Assets Are Sourced

1. Re-run `pnpm dev` and walk through every route
2. Confirm placeholders are replaced with real imagery
3. Run `pnpm build` to confirm no path errors
4. Optionally run Lighthouse on the homepage — should improve LCP 
   significantly with real assets
5. Commit the final batch
6. Proceed to Vercel deployment (separate session)

---

## Anti-Patterns To Avoid

- ❌ Don't use AI 3D outputs as 2D photography — the rendered look 
  contradicts the v2 brand spec's photography-led aesthetic
- ❌ Don't use stock photos of "a gaming laptop" for HP OMEN — use 
  the actual product
- ❌ Don't commit uncompressed PNGs — always WebP/AVIF
- ❌ Don't skip the AVIF export for hero images — the file-size 
  savings matter for LCP
- ❌ Don't manually edit filenames after saving (Windows hides 
  extensions — check "File name extensions" in View tab of explorer)
- ❌ Don't replace the homepage hero — the AI-generated one you 
  already have is brand-establishing, not product-claiming, and works

---

## Manufacturer Outreach (Optional, Higher-Quality Path)

If you want highest-grade press-kit imagery, you can email each 
manufacturer's partner/distributor team:

### Template email

```
Subject: Authorized distributor request — product imagery access for 
[brand]

Hello,

I am [your name], working with Dtech Algérie (https://d-techalgerie.com), 
an authorized distributor of [brand] products in Algeria since 2006.

We are building a new product showcase website for our catalog and 
would like to use official press-kit imagery for [brand] products.

Could you provide access to your distributor asset library, or share 
a download link for high-resolution product imagery for the following 
SKUs:

- [Product 1]
- [Product 2]
- [Product 3]

Thank you,
[Your name]
[Your role]
Dtech Algérie
```

Response timeline: typically 3–10 business days. If you commit to 
this path, send these emails before starting manual sourcing — by 
the time you finish manual work, the partner team may have responded 
with better assets.

**This is optional.** Manual sourcing from public press sites is 
sufficient for a pitch demo.

---

## Done When

- [ ] All 5 hero tier products have card.webp + hero.webp
- [ ] All 10 featured tier products have card + hero + 2 angles
- [ ] All 15 long-tail products have card + hero + 1 angle
- [ ] 6 category heroes exist
- [ ] Homepage hero exists (already done)
- [ ] 5 brand heroes exist (4 may need real-imagery upgrade)
- [ ] All files are properly compressed (sizes within budget)
- [ ] Files committed to git in batched commits
- [ ] `pnpm dev` shows real imagery across the site

Then proceed to Vercel deployment.