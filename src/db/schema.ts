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
} from 'drizzle-orm/pg-core'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

export const tierEnum = pgEnum('tier', ['hero', 'featured', 'longtail'])
export const inquiryStatusEnum = pgEnum('inquiry_status', [
  'new',
  'contacted',
  'closed',
  'spam',
])

export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  statement: text('statement').notNull(),
  description: text('description').notNull(),
  heroImagePath: text('hero_image_path'),
  logoPath: text('logo_path'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  heroImagePath: text('hero_image_path'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

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

export const users = pgTable('users', {
  id: text('id').primaryKey(), // better-auth uses string IDs
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name').notNull(),
  image: text('image'),
  role: userRoleEnum('role').notNull().default('staff'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

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
