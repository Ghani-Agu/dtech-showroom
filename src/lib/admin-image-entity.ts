export type EntityType = 'product' | 'brand' | 'category'

export const ENTITY_PREFIX: Record<EntityType, string> = {
  product: 'products',
  brand: 'brands',
  category: 'categories',
}
