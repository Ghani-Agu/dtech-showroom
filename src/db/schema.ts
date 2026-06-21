import { sql, relations } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
  customType,
} from 'drizzle-orm/pg-core'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

export const tierEnum = pgEnum('tier', ['hero', 'featured', 'longtail'])

/** Raw bytes column (Postgres bytea) — used for DB-hosted images. */
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

/**
 * DB-hosted images — the zero-config alternative to R2. Uploaded admin
 * images land here and are served by /api/images/[...key] with immutable
 * caching. Keys mirror the R2 layout: products/<slug>/card-<hash>.webp
 */
export const imageBlobs = pgTable(
  'image_blobs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    key: text('key').notNull().unique(),
    contentType: text('content_type').notNull(),
    data: bytea('data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('image_blobs_key_idx').on(t.key)]
)

export const inquiryStatusEnum = pgEnum('inquiry_status', [
  'new',
  'contacted',
  'closed',
  'spam',
])

export const brands = pgTable(
  'brands',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    statement: text('statement').notNull(),
    description: text('description').notNull(),
    heroImagePath: text('hero_image_path'),
    logoPath: text('logo_path'),
    sortOrder: integer('sort_order').notNull().default(0),

    // Bilingual content (Phase 7e)
    nameFr: text('name_fr'),
    statementFr: text('statement_fr'),
    descriptionFr: text('description_fr'),
    searchKeywords: text('search_keywords'),
    searchKeywordsFr: text('search_keywords_fr'),

    // Soft delete (Phase 7e)
    archivedAt: timestamp('archived_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('brands_archived_at_idx').on(table.archivedAt)]
)

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    heroImagePath: text('hero_image_path'),
    sortOrder: integer('sort_order').notNull().default(0),

    // Bilingual content (Phase 7e)
    nameFr: text('name_fr'),
    descriptionFr: text('description_fr'),
    searchKeywords: text('search_keywords'),
    searchKeywordsFr: text('search_keywords_fr'),

    // Soft delete (Phase 7e)
    archivedAt: timestamp('archived_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('categories_archived_at_idx').on(table.archivedAt)]
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    tagline: text('tagline').notNull(),
    description: text('description').notNull(),

    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),

    tier: tierEnum('tier').notNull(),

    cardImagePath: text('card_image_path').notNull(),
    heroImagePath: text('hero_image_path'),
    glbModelPath: text('glb_model_path'),
    photoCarouselPaths: jsonb('photo_carousel_paths')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    specs: jsonb('specs')
      .$type<Record<string, string | number | string[]>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    cardSpec: text('card_spec').notNull(),

    searchKeywords: text('search_keywords').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    featured: boolean('featured').notNull().default(false),

    // Bilingual content (Phase 7c) — EN is canonical, FR is optional translation
    nameFr: text('name_fr'),
    taglineFr: text('tagline_fr'),
    descriptionFr: text('description_fr'),
    cardSpecFr: text('card_spec_fr'),
    searchKeywordsFr: text('search_keywords_fr'),

    // SEO overrides (Phase 7c) — null falls back to name/tagline
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),

    // Soft delete (Phase 7c) — null = active
    archivedAt: timestamp('archived_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('products_brand_id_idx').on(table.brandId),
    index('products_category_id_idx').on(table.categoryId),
    index('products_tier_idx').on(table.tier),
    index('products_featured_idx')
      .on(table.featured)
      .where(sql`${table.featured} = true`),
    index('products_archived_at_idx').on(table.archivedAt),
  ]
)

export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),

    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    company: text('company'),
    message: text('message').notNull(),

    productSlug: text('product_slug').notNull(),
    productName: text('product_name').notNull(),
    productBrand: text('product_brand').notNull(),

    status: inquiryStatusEnum('status').notNull().default('new'),
    notes: text('notes'),

    submittedAt: timestamp('submitted_at').notNull().defaultNow(),
    contactedAt: timestamp('contacted_at'),
  },
  (table) => [
    index('inquiries_status_idx').on(table.status),
    index('inquiries_submitted_at_idx').on(table.submittedAt.desc()),
    index('inquiries_product_id_idx').on(table.productId),
  ]
)

export const inquiryStatusHistory = pgTable(
  'inquiry_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inquiryId: uuid('inquiry_id')
      .notNull()
      .references(() => inquiries.id, { onDelete: 'cascade' }),
    fromStatus: inquiryStatusEnum('from_status'),
    toStatus: inquiryStatusEnum('to_status').notNull(),
    changedByUserId: text('changed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    changedByEmail: text('changed_by_email'),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('isq_inquiry_id_idx').on(table.inquiryId),
    index('isq_created_at_idx').on(table.createdAt.desc()),
  ]
)

// Relations

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  inquiries: many(inquiries),
}))

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  product: one(products, {
    fields: [inquiries.productId],
    references: [products.id],
  }),
}))

// Types

export type Brand = InferSelectModel<typeof brands>
export type NewBrand = InferInsertModel<typeof brands>

export type Category = InferSelectModel<typeof categories>
export type NewCategory = InferInsertModel<typeof categories>

export type Product = InferSelectModel<typeof products>
export type NewProduct = InferInsertModel<typeof products>

export type Inquiry = InferSelectModel<typeof inquiries>
export type NewInquiry = InferInsertModel<typeof inquiries>

export type ProductWithRelations = Product & {
  brand: Brand
  category: Category
}

export type Tier = (typeof tierEnum.enumValues)[number]
export type InquiryStatus = (typeof inquiryStatusEnum.enumValues)[number]

// =========================================================================
// USERS + SESSIONS (Phase 6 — authentication)
// =========================================================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'staff'])

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(), // better-auth uses string IDs
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    name: text('name').notNull(),
    image: text('image'),
    role: userRoleEnum('role').notNull().default('staff'),

    /** Admin sections a staff member can manage (null = staff defaults).
     *  Admins always have full access. Keys: products, categories, brands,
     *  inquiries, users, settings. */
    permissions: jsonb('permissions').$type<string[]>(),

    // Phase 7e — admin user management
    deactivatedAt: timestamp('deactivated_at'),
    lastLoginAt: timestamp('last_login_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('users_deactivated_at_idx').on(table.deactivatedAt),
  ]
)

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  password: text('password'), // hashed by better-auth
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
export type Session = InferSelectModel<typeof sessions>
export type Account = InferSelectModel<typeof accounts>
export type UserRole = (typeof userRoleEnum.enumValues)[number]

export type InquiryStatusHistory = InferSelectModel<typeof inquiryStatusHistory>
export type InsertInquiryStatusHistory = InferInsertModel<
  typeof inquiryStatusHistory
>

/**
 * Visual editor pages. `key` is a logical page id ('home' = the public
 * homepage). `draft` is the admin's autosaved work-in-progress; `published`
 * is what visitors see. Created idempotently in ensure-schema.ts.
 */
export const sitePages = pgTable('site_pages', {
  key: text('key').primaryKey(),
  draft: jsonb('draft'),
  published: jsonb('published'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
})

export type SitePageRow = InferSelectModel<typeof sitePages>

/* ─────────────────────────────────────────────────────────────────
 * NEWSLETTER — subscribers, campaigns, per-recipient sends
 *
 * Subscribers go through a double-opt-in: a row is inserted with
 * status='pending' and a confirm_token; a click on the confirm link
 * flips it to 'subscribed'. Each row also gets a permanent
 * unsubscribe_token, used by the one-click unsubscribe link embedded
 * in every campaign mail. Tokens are random 32-byte URL-safe strings.
 * ─────────────────────────────────────────────────────────────── */

export const subscriberStatusEnum = pgEnum('subscriber_status', [
  'pending',
  'subscribed',
  'unsubscribed',
  'bounced',
])

export const subscribers = pgTable(
  'subscribers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: text('email').notNull().unique(),
    locale: text('locale').notNull().default('fr'),
    status: subscriberStatusEnum('status').notNull().default('pending'),
    /** Single-use confirmation token (cleared once consumed). */
    confirmToken: text('confirm_token'),
    /** Permanent token for the unsubscribe link in every email. */
    unsubscribeToken: text('unsubscribe_token').notNull(),
    /** Free-form provenance label — 'footer', 'inline-cta', 'admin-import'… */
    source: text('source'),
    /** SHA-256 of the submitter IP — cheap abuse signal without storing PII. */
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  },
  (table) => [
    index('subscribers_status_idx').on(table.status),
    index('subscribers_created_at_idx').on(table.createdAt.desc()),
    index('subscribers_unsubscribe_token_idx').on(table.unsubscribeToken),
  ]
)

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'failed',
])

export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    subject: text('subject').notNull(),
    /** Short summary shown after the subject in most mail clients. */
    preheader: text('preheader'),
    bodyHtml: text('body_html').notNull().default(''),
    bodyText: text('body_text').notNull().default(''),
    /** Audience selector — for now: 'all'. Future: category id, language… */
    audience: text('audience').notNull().default('all'),
    status: campaignStatusEnum('status').notNull().default('draft'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    sentCount: integer('sent_count').notNull().default(0),
    openCount: integer('open_count').notNull().default(0),
    clickCount: integer('click_count').notNull().default(0),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('campaigns_status_idx').on(table.status),
    index('campaigns_created_at_idx').on(table.createdAt.desc()),
  ]
)

/**
 * One row per (campaign × subscriber). Lets the open/click endpoints
 * mark a single recipient without writing a counter on the campaign row
 * directly, and gives us per-send tracking for future segmentation.
 */
export const campaignSends = pgTable(
  'campaign_sends',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    subscriberId: uuid('subscriber_id')
      .notNull()
      .references(() => subscribers.id, { onDelete: 'cascade' }),
    sentAt: timestamp('sent_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    error: text('error'),
  },
  (table) => [
    index('campaign_sends_campaign_id_idx').on(table.campaignId),
    index('campaign_sends_subscriber_id_idx').on(table.subscriberId),
  ]
)

export const campaignSendsRelations = relations(campaignSends, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSends.campaignId],
    references: [campaigns.id],
  }),
  subscriber: one(subscribers, {
    fields: [campaignSends.subscriberId],
    references: [subscribers.id],
  }),
}))

export type Subscriber = InferSelectModel<typeof subscribers>
export type NewSubscriber = InferInsertModel<typeof subscribers>
export type SubscriberStatus =
  (typeof subscriberStatusEnum.enumValues)[number]

export type Campaign = InferSelectModel<typeof campaigns>
export type NewCampaign = InferInsertModel<typeof campaigns>
export type CampaignStatus =
  (typeof campaignStatusEnum.enumValues)[number]

export type CampaignSend = InferSelectModel<typeof campaignSends>
export type NewCampaignSend = InferInsertModel<typeof campaignSends>
