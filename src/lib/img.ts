/** Fallback used wherever a product/brand/category image may be missing —
 *  keeps next/image happy and the catalog presentable. */
export const PRODUCT_PLACEHOLDER = '/placeholder-product.png'

export function imgOr(path: string | null | undefined): string {
  return path && path.trim() !== '' ? path : PRODUCT_PLACEHOLDER
}
