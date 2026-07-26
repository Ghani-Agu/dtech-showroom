/**
 * Shared catalogue view types.
 *
 * These used to live in `ProductExplorer.tsx` — a `'use client'` component —
 * which meant every server module that needed the shape (the filter engine,
 * the data mappers, route files) imported from a client component. That worked
 * only because they were type-only imports; one accidental value import would
 * have pulled a client module into the server graph.
 */

import type { ShowroomProduct } from '@/components/showroom/ShowroomCard'

export interface ExplorerProduct extends ShowroomProduct {
  brandSlug: string
  categorySlug: string
  featured: boolean
  /** Epoch ms — powers the "newest first" sort on /products. */
  createdAt?: number
}

export interface FacetOption {
  slug: string
  name: string
  count: number
}
