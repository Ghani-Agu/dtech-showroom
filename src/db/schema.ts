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
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    cardSpec: text('card_spec').notNull(),

    searchKeywords: text('search_keywords').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    featured: boolean('featured').notNull().default(false),

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
  },
  (table) => [
    index('inquiries_status_idx').on(table.status),
    index('inquiries_submitted_at_idx').on(table.submittedAt.desc()),
    index('inquiries_product_id_idx').on(table.productId),
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
